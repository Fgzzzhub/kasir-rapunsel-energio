alter table public.transactions
  add column if not exists tax_amount numeric(12,2) not null default 0,
  add column if not exists service_charge_amount numeric(12,2) not null default 0;

alter table public.transaction_products
  add column if not exists employee_id uuid references public.employees (id) on delete set null,
  add column if not exists employee_name_snapshot text,
  add column if not exists commission_rate_snapshot numeric(5,2) not null default 0 check (commission_rate_snapshot >= 0 and commission_rate_snapshot <= 100),
  add column if not exists commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0);

create index if not exists transaction_products_employee_id_idx
  on public.transaction_products (employee_id);

drop function if exists public.create_transaction(uuid, text, text, text, text, uuid, jsonb, jsonb);
drop function if exists public.create_transaction(uuid, text, text, text, text, uuid, jsonb, jsonb, numeric, numeric);

create or replace function public.create_transaction(
  p_business_id uuid,
  p_created_by uuid,
  p_customer_name text,
  p_customer_phone text,
  p_services jsonb,
  p_products jsonb,
  p_notes text,
  p_payment_method text,
  p_tax_amount numeric default 0,
  p_service_charge_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_customer_id uuid;
  v_created_at timestamptz;
  v_transaction_id uuid;

  v_service_item jsonb;
  v_assignment jsonb;
  v_service public.services%rowtype;
  v_service_employee_ids uuid[];
  v_raw_employee_count integer;
  v_employee_id uuid;
  v_employee public.employees%rowtype;
  v_service_final_price numeric(12,2);
  v_split_count integer;
  v_split_base_amount numeric(12,2);
  v_split_percentage numeric(8,4);
  v_employee_commission_rate numeric(5,2);
  v_employee_commission numeric(12,2);
  v_service_commission_total numeric(12,2);
  v_transaction_service_id uuid;
  v_first_employee public.employees%rowtype;
  v_first_employee_commission_rate numeric(5,2);

  v_product_item jsonb;
  v_product public.products%rowtype;
  v_product_employee public.employees%rowtype;
  v_product_qty integer;
  v_product_subtotal numeric(12,2);
  v_product_commission numeric(12,2);

  v_subtotal_amount numeric(12,2) := 0;
  v_total_amount numeric(12,2) := 0;
  v_total_commission numeric(12,2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  if auth.uid() <> p_created_by and not public.is_owner() then
    raise exception 'Pengguna tidak valid untuk transaksi ini.';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Nama pelanggan wajib diisi.';
  end if;

  if p_payment_method not in ('cash', 'transfer', 'qris', 'other') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  if (jsonb_typeof(coalesce(p_services, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_services, '[]'::jsonb)) = 0) and
     (jsonb_typeof(coalesce(p_products, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_products, '[]'::jsonb)) = 0) then
    raise exception 'Minimal satu layanan atau produk harus dipilih.';
  end if;

  select * into v_business from public.businesses where id = p_business_id and is_active = true;
  if not found then raise exception 'Bisnis tidak ditemukan.'; end if;

  if p_customer_phone is not null and btrim(p_customer_phone) <> '' then
    select id into v_customer_id from public.customers where phone = btrim(p_customer_phone);
    if not found then
      insert into public.customers (phone, name)
      values (btrim(p_customer_phone), btrim(p_customer_name))
      returning id into v_customer_id;
    end if;
  else
    insert into public.customers (name) values (btrim(p_customer_name)) returning id into v_customer_id;
  end if;

  insert into public.transactions (
    business_id, customer_id, customer_name, customer_phone,
    payment_method, total_amount, tax_amount, service_charge_amount, notes, created_by
  ) values (
    p_business_id, v_customer_id, btrim(p_customer_name), nullif(btrim(p_customer_phone), ''),
    p_payment_method, 0, coalesce(p_tax_amount, 0), coalesce(p_service_charge_amount, 0),
    nullif(btrim(p_notes), ''), p_created_by
  ) returning id, created_at into v_transaction_id, v_created_at;

  if jsonb_typeof(coalesce(p_services, '[]'::jsonb)) = 'array' then
    for v_service_item in select value from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
      if nullif(v_service_item ->> 'serviceId', '') is null then
        raise exception 'Setiap item layanan wajib memiliki ID layanan.';
      end if;

      select * into v_service from public.services
      where id = (v_service_item ->> 'serviceId')::uuid and business_id = p_business_id and is_active = true;
      if not found then raise exception 'Layanan tidak valid atau sudah nonaktif.'; end if;

      if v_service_item ? 'employeeAssignments' then
        v_raw_employee_count := jsonb_array_length(v_service_item -> 'employeeAssignments');
        select array_agg(distinct (value ->> 'id')::uuid)
        into v_service_employee_ids
        from jsonb_array_elements(v_service_item -> 'employeeAssignments')
        where nullif(value ->> 'id', '') is not null;
      elsif v_service_item ? 'employeeIds' then
        v_raw_employee_count := jsonb_array_length(v_service_item -> 'employeeIds');
        select array_agg(distinct value::uuid)
        into v_service_employee_ids
        from jsonb_array_elements_text(v_service_item -> 'employeeIds');
      elsif nullif(v_service_item ->> 'employeeId', '') is not null then
        v_raw_employee_count := 1;
        v_service_employee_ids := array[(v_service_item ->> 'employeeId')::uuid];
      else
        v_raw_employee_count := 0;
        v_service_employee_ids := array[]::uuid[];
      end if;

      v_split_count := coalesce(array_length(v_service_employee_ids, 1), 0);

      if v_split_count = 0 then
        raise exception 'Pilih minimal satu karyawan untuk layanan ini.';
      end if;

      if v_raw_employee_count <> v_split_count then
        raise exception 'Karyawan tidak boleh duplikat.';
      end if;

      if v_service_item ? 'finalPrice' and (v_service_item ->> 'finalPrice') is not null then
        v_service_final_price := (v_service_item ->> 'finalPrice')::numeric;
      else
        v_service_final_price := v_service.price;
      end if;

      if v_service_final_price <= 0 then
        raise exception 'Harga layanan harus lebih dari 0.';
      end if;

      v_split_base_amount := round(v_service_final_price / v_split_count, 2);
      v_split_percentage := round(100.0 / v_split_count, 4);
      v_service_commission_total := 0;
      v_first_employee := null;
      v_first_employee_commission_rate := 0;

      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;
        if not found then raise exception 'Karyawan tidak valid atau sudah nonaktif.'; end if;

        v_assignment := null;
        if v_service_item ? 'employeeAssignments' then
          select value into v_assignment
          from jsonb_array_elements(v_service_item -> 'employeeAssignments')
          where value ->> 'id' = v_employee_id::text
          limit 1;
        end if;

        if v_assignment ? 'customCommissionRate' and (v_assignment ->> 'customCommissionRate') is not null then
          v_employee_commission_rate := (v_assignment ->> 'customCommissionRate')::numeric;
        else
          v_employee_commission_rate := v_employee.commission_rate;
        end if;

        if v_employee_commission_rate < 0 or v_employee_commission_rate > 100 then
          raise exception 'Komisi harus berada di antara 0%% dan 100%%.';
        end if;

        if v_first_employee.id is null then
          v_first_employee := v_employee;
          v_first_employee_commission_rate := v_employee_commission_rate;
        end if;

        v_employee_commission := round((v_split_base_amount * v_employee_commission_rate) / 100.0, 2);
        v_service_commission_total := v_service_commission_total + v_employee_commission;
      end loop;

      insert into public.transaction_services (
        transaction_id, service_id, service_name_snapshot,
        employee_id, employee_name_snapshot,
        original_price_snapshot, price_snapshot,
        price_adjustment_amount, price_adjustment_reason,
        commission_rate_snapshot, commission_amount, total_commission_amount
      ) values (
        v_transaction_id, v_service.id, v_service.name,
        v_first_employee.id, v_first_employee.name,
        v_service.price, v_service_final_price,
        abs(v_service.price - v_service_final_price),
        nullif(btrim(v_service_item ->> 'priceAdjustmentReason'), ''),
        v_first_employee_commission_rate, v_service_commission_total, v_service_commission_total
      ) returning id into v_transaction_service_id;

      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;

        v_assignment := null;
        if v_service_item ? 'employeeAssignments' then
          select value into v_assignment
          from jsonb_array_elements(v_service_item -> 'employeeAssignments')
          where value ->> 'id' = v_employee_id::text
          limit 1;
        end if;

        if v_assignment ? 'customCommissionRate' and (v_assignment ->> 'customCommissionRate') is not null then
          v_employee_commission_rate := (v_assignment ->> 'customCommissionRate')::numeric;
        else
          v_employee_commission_rate := v_employee.commission_rate;
        end if;

        v_employee_commission := round((v_split_base_amount * v_employee_commission_rate) / 100.0, 2);

        insert into public.transaction_service_employees (
          transaction_service_id, employee_id, employee_name_snapshot,
          split_type, split_percentage, split_base_amount,
          commission_rate_snapshot, commission_amount
        ) values (
          v_transaction_service_id, v_employee.id, v_employee.name,
          'equal', v_split_percentage, v_split_base_amount,
          v_employee_commission_rate, v_employee_commission
        );
      end loop;

      v_subtotal_amount := v_subtotal_amount + v_service_final_price;
      v_total_commission := v_total_commission + v_service_commission_total;
    end loop;
  end if;

  if jsonb_typeof(coalesce(p_products, '[]'::jsonb)) = 'array' then
    for v_product_item in select value from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
      if nullif(v_product_item ->> 'productId', '') is null then
        raise exception 'Setiap item produk wajib memiliki ID produk.';
      end if;

      if nullif(v_product_item ->> 'employeeId', '') is null then
        raise exception 'Pilih penjual untuk setiap produk.';
      end if;

      v_product_qty := (v_product_item ->> 'qty')::integer;
      if v_product_qty <= 0 then raise exception 'Kuantitas produk harus lebih dari 0.'; end if;

      select * into v_product from public.products
      where id = (v_product_item ->> 'productId')::uuid and business_id = p_business_id and is_active = true;
      if not found then raise exception 'Produk tidak valid atau sudah nonaktif.'; end if;

      select * into v_product_employee from public.employees
      where id = (v_product_item ->> 'employeeId')::uuid and business_id = p_business_id and is_active = true;
      if not found then raise exception 'Penjual produk tidak valid atau sudah nonaktif.'; end if;

      v_product_subtotal := v_product.price * v_product_qty;
      v_product_commission := round((v_product_subtotal * v_product_employee.commission_rate) / 100.0, 2);

      if v_product_item ? 'customCommissionAmount'
         and (v_product_item ->> 'customCommissionAmount') is not null then
        v_product_commission := (v_product_item ->> 'customCommissionAmount')::numeric;
      end if;

      if v_product_commission < 0 then
        raise exception 'Komisi produk tidak boleh negatif.';
      end if;

      v_subtotal_amount := v_subtotal_amount + v_product_subtotal;
      v_total_commission := v_total_commission + v_product_commission;

      insert into public.transaction_products (
        transaction_id, product_id, product_name_snapshot, qty, price_snapshot, subtotal,
        employee_id, employee_name_snapshot, commission_rate_snapshot, commission_amount
      ) values (
        v_transaction_id, v_product.id, v_product.name, v_product_qty, v_product.price, v_product_subtotal,
        v_product_employee.id, v_product_employee.name, v_product_employee.commission_rate, v_product_commission
      );

      if v_product.track_stock = true then
        if v_product.current_stock < v_product_qty then
          raise exception 'Stok produk % tidak mencukupi (Sisa: %, Diminta: %)', v_product.name, v_product.current_stock, v_product_qty;
        end if;

        update public.products
        set current_stock = current_stock - v_product_qty
        where id = v_product.id;

        insert into public.stock_movements (
          product_id, business_id, movement_type, quantity, previous_stock, new_stock, notes, reference_id, created_by
        ) values (
          v_product.id, p_business_id, 'out', -v_product_qty, v_product.current_stock,
          v_product.current_stock - v_product_qty, 'Sale transaction', v_transaction_id, p_created_by
        );
      end if;
    end loop;
  end if;

  v_total_amount := v_subtotal_amount + coalesce(p_tax_amount, 0) + coalesce(p_service_charge_amount, 0);

  update public.transactions
  set total_amount = v_total_amount,
      tax_amount = coalesce(p_tax_amount, 0),
      service_charge_amount = coalesce(p_service_charge_amount, 0)
  where id = v_transaction_id;

  insert into public.sync_logs (business_id, type, reference_id, status)
  values (p_business_id, 'transaction', v_transaction_id, 'pending');

  insert into public.audit_logs (business_id, entity_type, entity_id, action, new_data, created_by)
  values (
    p_business_id,
    'transaction',
    v_transaction_id,
    'create',
    jsonb_build_object('total_amount', v_total_amount, 'payment_method', p_payment_method),
    p_created_by
  );

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'business_id', v_business.id,
    'business_name', v_business.name,
    'customer_id', v_customer_id,
    'customer_name', btrim(p_customer_name),
    'customer_phone', nullif(btrim(p_customer_phone), ''),
    'payment_method', p_payment_method,
    'total_amount', v_total_amount,
    'total_commission', v_total_commission,
    'created_at', v_created_at
  );
end;
$$;

grant execute on function public.create_transaction(uuid, uuid, text, text, jsonb, jsonb, text, text, numeric, numeric) to authenticated;
