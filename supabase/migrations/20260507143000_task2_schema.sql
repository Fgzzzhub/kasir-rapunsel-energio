-- Migration: 20260507143000_task2_schema.sql

-- 1. Suppliers Table
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  contact_info text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

create index if not exists suppliers_business_id_idx on public.suppliers (business_id);
drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row
execute function public.set_updated_at();

alter table public.suppliers enable row level security;
drop policy if exists "authenticated can read suppliers" on public.suppliers;
create policy "authenticated can read suppliers" on public.suppliers for select to authenticated using (true);
drop policy if exists "owners manage suppliers" on public.suppliers;
create policy "owners manage suppliers" on public.suppliers for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- 2. Inventory / Stock Management
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'track_stock') then
    alter table public.products add column track_stock boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'current_stock') then
    alter table public.products add column current_stock integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'minimum_stock') then
    alter table public.products add column minimum_stock integer not null default 5;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'cost_price') then
    alter table public.products add column cost_price numeric(12,2) not null default 0;
  end if;
end $$;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment', 'void_return')),
  quantity integer not null, -- Can be negative for out/adjustment
  previous_stock integer not null default 0,
  new_stock integer not null default 0,
  notes text,
  reference_id uuid, -- e.g., transaction_id or purchase_order_id
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stock_movements' and column_name = 'previous_stock') then
    alter table public.stock_movements add column previous_stock integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stock_movements' and column_name = 'new_stock') then
    alter table public.stock_movements add column new_stock integer not null default 0;
  end if;
end $$;

create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);
create index if not exists stock_movements_business_id_idx on public.stock_movements (business_id);

alter table public.stock_movements enable row level security;
drop policy if exists "authenticated can read stock movements" on public.stock_movements;
create policy "authenticated can read stock movements" on public.stock_movements for select to authenticated using (true);
drop policy if exists "authenticated can insert stock movements" on public.stock_movements;
create policy "authenticated can insert stock movements" on public.stock_movements for insert to authenticated with check (true);


-- 3. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  entity_type text not null, -- e.g., 'transaction', 'product', 'employee'
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete', 'void', 'refund')),
  old_data jsonb,
  new_data jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_business_id_idx on public.audit_logs (business_id);
create index if not exists audit_logs_entity_type_entity_id_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;
drop policy if exists "owners read audit logs" on public.audit_logs;
create policy "owners read audit logs" on public.audit_logs for select to authenticated using (public.is_owner());
drop policy if exists "authenticated can insert audit logs" on public.audit_logs;
create policy "authenticated can insert audit logs" on public.audit_logs for insert to authenticated with check (true);


-- 4. Transactions Update (Void/Refund)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transactions' and column_name = 'status') then
    alter table public.transactions add column status text not null default 'valid' check (status in ('valid', 'voided', 'refunded'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transactions' and column_name = 'voided_at') then
    alter table public.transactions add column voided_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transactions' and column_name = 'voided_by') then
    alter table public.transactions add column voided_by uuid references auth.users (id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transactions' and column_name = 'void_reason') then
    alter table public.transactions add column void_reason text;
  end if;
end $$;


-- 5. Payroll Lock Periods
create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, start_date, end_date)
);

create index if not exists payroll_periods_business_id_idx on public.payroll_periods (business_id);

alter table public.payroll_periods enable row level security;
drop policy if exists "authenticated can read payroll periods" on public.payroll_periods;
create policy "authenticated can read payroll periods" on public.payroll_periods for select to authenticated using (true);
drop policy if exists "owners manage payroll periods" on public.payroll_periods;
create policy "owners manage payroll periods" on public.payroll_periods for all to authenticated using (public.is_owner()) with check (public.is_owner());


-- 6. Cash Drawer Sessions
create table if not exists public.cash_drawer_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  opened_by uuid references auth.users (id) on delete restrict,
  opened_at timestamptz not null default timezone('utc', now()),
  starting_cash numeric(12,2) not null check (starting_cash >= 0),
  closed_by uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  ending_cash_expected numeric(12,2),
  ending_cash_actual numeric(12,2),
  notes text,
  status text not null default 'open' check (status in ('open', 'closed'))
);

create index if not exists cash_drawer_sessions_business_id_idx on public.cash_drawer_sessions (business_id);

alter table public.cash_drawer_sessions enable row level security;
drop policy if exists "authenticated can read cash drawer sessions" on public.cash_drawer_sessions;
create policy "authenticated can read cash drawer sessions" on public.cash_drawer_sessions for select to authenticated using (true);
drop policy if exists "authenticated manage cash drawer sessions" on public.cash_drawer_sessions;
create policy "authenticated manage cash drawer sessions" on public.cash_drawer_sessions for all to authenticated using (true) with check (true);


-- 7. Update Transaction RPC to decrement stock
create or replace function public.create_transaction(
  p_business_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_notes text,
  p_created_by uuid,
  p_services jsonb,
  p_products jsonb
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
  v_service public.services%rowtype;
  v_service_employee_ids uuid[];
  v_raw_employee_count integer;
  v_employee_id uuid;
  v_employee public.employees%rowtype;
  v_service_final_price numeric(12,2);
  v_split_count integer;
  v_split_base_amount numeric(12,2);
  v_split_percentage numeric(8,4);
  v_employee_commission numeric(12,2);
  v_service_commission_total numeric(12,2);
  v_transaction_service_id uuid;
  v_first_employee public.employees%rowtype;

  v_product_item jsonb;
  v_product public.products%rowtype;
  v_product_qty integer;
  v_product_subtotal numeric(12,2);

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

  if (jsonb_typeof(p_services) <> 'array' or jsonb_array_length(p_services) = 0) and
     (jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) = 0) then
    raise exception 'Minimal satu layanan atau produk harus dipilih.';
  end if;

  select * into v_business from public.businesses where id = p_business_id and is_active = true;
  if not found then raise exception 'Bisnis tidak ditemukan.'; end if;

  -- Customer logic
  if p_customer_phone is not null and btrim(p_customer_phone) <> '' then
    select id into v_customer_id from public.customers where phone = btrim(p_customer_phone);
    if not found then
      insert into public.customers (phone, name) values (btrim(p_customer_phone), btrim(p_customer_name)) returning id into v_customer_id;
    end if;
  else
    insert into public.customers (name) values (btrim(p_customer_name)) returning id into v_customer_id;
  end if;

  insert into public.transactions (
    business_id, customer_id, customer_name, customer_phone,
    payment_method, total_amount, notes, created_by
  ) values (
    p_business_id, v_customer_id, btrim(p_customer_name), nullif(btrim(p_customer_phone), ''),
    p_payment_method, 0, nullif(btrim(p_notes), ''), p_created_by
  ) returning id, created_at into v_transaction_id, v_created_at;

  -- Services: ONE transaction_services row per service, MULTIPLE transaction_service_employees rows
  if jsonb_typeof(p_services) = 'array' then
    for v_service_item in select value from jsonb_array_elements(p_services) loop
      if nullif(v_service_item ->> 'serviceId', '') is null then
        raise exception 'Setiap item layanan wajib memiliki ID layanan.';
      end if;

      select * into v_service from public.services
      where id = (v_service_item ->> 'serviceId')::uuid and business_id = p_business_id and is_active = true;
      if not found then raise exception 'Layanan tidak valid atau sudah nonaktif.'; end if;

      -- Support both employeeIds (array) and employeeId (singular) formats
      if v_service_item ? 'employeeIds' then
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

      -- Determine final price (custom or default). Price is counted ONCE regardless of employee count.
      if v_service_item ? 'finalPrice' and (v_service_item ->> 'finalPrice') is not null then
        v_service_final_price := (v_service_item ->> 'finalPrice')::numeric;
      else
        v_service_final_price := v_service.price;
      end if;

      if v_service_final_price <= 0 then
        raise exception 'Harga layanan harus lebih dari 0.';
      end if;

      -- Commission split: each employee gets (finalPrice / N employees) as their base, then their rate is applied
      v_split_base_amount := round(v_service_final_price / v_split_count, 2);
      v_split_percentage := round(100.0 / v_split_count, 4);
      v_service_commission_total := 0;
      v_first_employee := null;

      -- First pass: validate all employees and calculate total commission
      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;
        if not found then raise exception 'Karyawan tidak valid atau sudah nonaktif.'; end if;

        if v_first_employee.id is null then
          v_first_employee := v_employee;
        end if;

        v_employee_commission := round((v_split_base_amount * v_employee.commission_rate) / 100.0, 2);
        v_service_commission_total := v_service_commission_total + v_employee_commission;
      end loop;

      -- Insert ONE transaction_services row (full price, not split)
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
        v_first_employee.commission_rate, v_service_commission_total, v_service_commission_total
      ) returning id into v_transaction_service_id;

      -- Insert N transaction_service_employees rows (commission splits)
      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;

        v_employee_commission := round((v_split_base_amount * v_employee.commission_rate) / 100.0, 2);

        insert into public.transaction_service_employees (
          transaction_service_id, employee_id, employee_name_snapshot,
          split_type, split_percentage, split_base_amount,
          commission_rate_snapshot, commission_amount
        ) values (
          v_transaction_service_id, v_employee.id, v_employee.name,
          'equal', v_split_percentage, v_split_base_amount,
          v_employee.commission_rate, v_employee_commission
        );
      end loop;

      -- Price counted ONCE per service, not per employee
      v_total_amount := v_total_amount + v_service_final_price;
      v_total_commission := v_total_commission + v_service_commission_total;
    end loop;
  end if;

  -- Products & Stock Movement
  if jsonb_typeof(p_products) = 'array' then
    for v_product_item in select value from jsonb_array_elements(p_products) loop
      v_product_qty := (v_product_item ->> 'qty')::integer;
      if v_product_qty <= 0 then raise exception 'Kuantitas produk harus lebih dari 0.'; end if;

      select * into v_product from public.products where id = (v_product_item ->> 'productId')::uuid and business_id = p_business_id and is_active = true;
      if not found then raise exception 'Produk tidak valid atau sudah nonaktif.'; end if;

      v_product_subtotal := v_product.price * v_product_qty;
      v_total_amount := v_total_amount + v_product_subtotal;

      insert into public.transaction_products (
        transaction_id, product_id, product_name_snapshot, qty, price_snapshot, subtotal
      ) values (
        v_transaction_id, v_product.id, v_product.name, v_product_qty, v_product.price, v_product_subtotal
      );

      -- Deduct stock if tracked
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
          v_product.id, p_business_id, 'out', -v_product_qty, v_product.current_stock, v_product.current_stock - v_product_qty, 'Sale transaction', v_transaction_id, p_created_by
        );
      end if;
    end loop;
  end if;

  update public.transactions set total_amount = v_total_amount where id = v_transaction_id;

  insert into public.sync_logs (business_id, type, reference_id, status)
  values (p_business_id, 'transaction', v_transaction_id, 'pending');

  -- Create audit log
  insert into public.audit_logs (business_id, entity_type, entity_id, action, new_data, created_by)
  values (p_business_id, 'transaction', v_transaction_id, 'create', 
    jsonb_build_object('total_amount', v_total_amount, 'payment_method', p_payment_method), 
    p_created_by);

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

revoke all on function public.create_transaction(uuid, text, text, text, text, uuid, jsonb, jsonb) from public;
grant execute on function public.create_transaction(uuid, text, text, text, text, uuid, jsonb, jsonb) to authenticated;

-- 8. RPC for manual stock adjustments
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_business_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_notes text,
  p_supplier_id uuid,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  select * into v_product from public.products where id = p_product_id and business_id = p_business_id;
  if not found then raise exception 'Produk tidak ditemukan.'; end if;

  insert into public.stock_movements (
    product_id, business_id, movement_type, quantity, previous_stock, new_stock, notes, supplier_id, created_by
  ) values (
    p_product_id, p_business_id, p_movement_type, p_quantity, v_product.current_stock, v_product.current_stock + p_quantity, nullif(btrim(p_notes), ''), p_supplier_id, p_created_by
  ) returning id into v_movement_id;

  update public.products
  set current_stock = current_stock + p_quantity
  where id = p_product_id;

  return jsonb_build_object(
    'movement_id', v_movement_id,
    'product_id', p_product_id,
    'new_stock', v_product.current_stock + p_quantity
  );
end;
$$;

revoke all on function public.record_stock_movement(uuid, uuid, text, integer, text, uuid, uuid) from public;
grant execute on function public.record_stock_movement(uuid, uuid, text, integer, text, uuid, uuid) to authenticated;
