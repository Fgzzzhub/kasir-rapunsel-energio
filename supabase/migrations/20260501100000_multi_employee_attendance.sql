-- Multi-employee service commissions and attendance records.

alter table public.transaction_services
  add column if not exists total_commission_amount numeric(12,2);

alter table public.transaction_services
  alter column employee_id drop not null,
  alter column employee_name_snapshot drop not null,
  alter column commission_amount drop not null;

update public.transaction_services
set total_commission_amount = coalesce(total_commission_amount, commission_amount, 0)
where total_commission_amount is null;

alter table public.transaction_services
  alter column total_commission_amount set default 0,
  alter column total_commission_amount set not null;

create table if not exists public.transaction_service_employees (
  id uuid primary key default gen_random_uuid(),
  transaction_service_id uuid not null references public.transaction_services (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  employee_name_snapshot text not null,
  split_type text not null default 'equal' check (split_type in ('equal', 'custom')),
  split_percentage numeric(8,4),
  split_base_amount numeric(12,2) not null check (split_base_amount >= 0),
  commission_rate_snapshot numeric(5,2) not null check (commission_rate_snapshot >= 0 and commission_rate_snapshot <= 100),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (transaction_service_id, employee_id)
);

insert into public.transaction_service_employees (
  transaction_service_id,
  employee_id,
  employee_name_snapshot,
  split_type,
  split_percentage,
  split_base_amount,
  commission_rate_snapshot,
  commission_amount,
  created_at
)
select
  id,
  employee_id,
  employee_name_snapshot,
  'equal',
  100,
  price_snapshot,
  commission_rate_snapshot,
  commission_amount,
  created_at
from public.transaction_services
where employee_id is not null
  and not exists (
    select 1
    from public.transaction_service_employees tse
    where tse.transaction_service_id = transaction_services.id
      and tse.employee_id = transaction_services.employee_id
  );

create index if not exists transaction_service_employees_service_id_idx
  on public.transaction_service_employees (transaction_service_id);

create index if not exists transaction_service_employees_employee_id_idx
  on public.transaction_service_employees (employee_id);

alter table public.transaction_service_employees enable row level security;

drop policy if exists "authenticated can read transaction service employees" on public.transaction_service_employees;
create policy "authenticated can read transaction service employees"
on public.transaction_service_employees
for select
to authenticated
using (true);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  employee_id uuid not null references public.employees (id) on delete restrict,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'sick', 'leave')),
  check_in_time time,
  check_out_time time,
  meal_allowance_eligible boolean not null default false,
  meal_allowance_amount numeric(12,2) not null default 0 check (meal_allowance_amount >= 0),
  deduction_amount numeric(12,2) not null default 0 check (deduction_amount >= 0),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, employee_id, attendance_date)
);

create index if not exists attendance_records_business_date_idx
  on public.attendance_records (business_id, attendance_date desc);

create index if not exists attendance_records_employee_date_idx
  on public.attendance_records (employee_id, attendance_date desc);

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row
execute function public.set_updated_at();

alter table public.attendance_records enable row level security;

drop policy if exists "authenticated can read attendance" on public.attendance_records;
create policy "authenticated can read attendance"
on public.attendance_records
for select
to authenticated
using (true);

drop policy if exists "owner and admin can insert attendance" on public.attendance_records;
create policy "owner and admin can insert attendance"
on public.attendance_records
for insert
to authenticated
with check (public.current_user_role() in ('owner', 'admin'));

drop policy if exists "owner and admin can update attendance" on public.attendance_records;
create policy "owner and admin can update attendance"
on public.attendance_records
for update
to authenticated
using (public.current_user_role() in ('owner', 'admin'))
with check (public.current_user_role() in ('owner', 'admin'));

drop policy if exists "owners can delete attendance" on public.attendance_records;
create policy "owners can delete attendance"
on public.attendance_records
for delete
to authenticated
using (public.is_owner());

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

  select * into v_business
  from public.businesses
  where id = p_business_id and is_active = true;

  if not found then
    raise exception 'Bisnis tidak ditemukan.';
  end if;

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
    business_id, customer_id, customer_name, customer_phone, payment_method, total_amount, notes, created_by
  )
  values (
    p_business_id, v_customer_id, btrim(p_customer_name), nullif(btrim(p_customer_phone), ''),
    p_payment_method, 0, nullif(btrim(p_notes), ''), p_created_by
  )
  returning id, created_at into v_transaction_id, v_created_at;

  if jsonb_typeof(p_services) = 'array' then
    for v_service_item in select value from jsonb_array_elements(p_services) loop
      if nullif(v_service_item ->> 'serviceId', '') is null then
        raise exception 'Setiap item layanan wajib memiliki ID layanan.';
      end if;

      select * into v_service from public.services
      where id = (v_service_item ->> 'serviceId')::uuid and business_id = p_business_id and is_active = true;

      if not found then
        raise exception 'Layanan tidak valid atau sudah nonaktif.';
      end if;

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

      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;

        if not found then
          raise exception 'Karyawan tidak valid atau sudah nonaktif.';
        end if;

        if v_first_employee.id is null then
          v_first_employee := v_employee;
        end if;

        v_employee_commission := round((v_split_base_amount * v_employee.commission_rate) / 100.0, 2);
        v_service_commission_total := v_service_commission_total + v_employee_commission;
      end loop;

      insert into public.transaction_services (
        transaction_id,
        service_id,
        service_name_snapshot,
        employee_id,
        employee_name_snapshot,
        original_price_snapshot,
        price_snapshot,
        price_adjustment_amount,
        price_adjustment_reason,
        commission_rate_snapshot,
        commission_amount,
        total_commission_amount
      )
      values (
        v_transaction_id,
        v_service.id,
        v_service.name,
        v_first_employee.id,
        v_first_employee.name,
        v_service.price,
        v_service_final_price,
        abs(v_service.price - v_service_final_price),
        nullif(btrim(v_service_item ->> 'priceAdjustmentReason'), ''),
        v_first_employee.commission_rate,
        v_service_commission_total,
        v_service_commission_total
      )
      returning id into v_transaction_service_id;

      foreach v_employee_id in array v_service_employee_ids loop
        select * into v_employee from public.employees
        where id = v_employee_id and business_id = p_business_id and is_active = true;

        v_employee_commission := round((v_split_base_amount * v_employee.commission_rate) / 100.0, 2);

        insert into public.transaction_service_employees (
          transaction_service_id,
          employee_id,
          employee_name_snapshot,
          split_type,
          split_percentage,
          split_base_amount,
          commission_rate_snapshot,
          commission_amount
        )
        values (
          v_transaction_service_id,
          v_employee.id,
          v_employee.name,
          'equal',
          v_split_percentage,
          v_split_base_amount,
          v_employee.commission_rate,
          v_employee_commission
        );
      end loop;

      v_total_amount := v_total_amount + v_service_final_price;
      v_total_commission := v_total_commission + v_service_commission_total;
    end loop;
  end if;

  if jsonb_typeof(p_products) = 'array' then
    for v_product_item in select value from jsonb_array_elements(p_products) loop
      if nullif(v_product_item ->> 'productId', '') is null then
        raise exception 'Setiap item produk wajib memiliki ID produk.';
      end if;

      if (v_product_item ->> 'qty')::integer <= 0 then
        raise exception 'Kuantitas produk harus lebih dari 0.';
      end if;

      select * into v_product from public.products
      where id = (v_product_item ->> 'productId')::uuid and business_id = p_business_id and is_active = true;

      if not found then
        raise exception 'Produk tidak valid atau sudah nonaktif.';
      end if;

      v_product_subtotal := v_product.price * (v_product_item ->> 'qty')::integer;
      v_total_amount := v_total_amount + v_product_subtotal;

      insert into public.transaction_products (
        transaction_id, product_id, product_name_snapshot, qty, price_snapshot, subtotal
      )
      values (
        v_transaction_id, v_product.id, v_product.name, (v_product_item ->> 'qty')::integer,
        v_product.price, v_product_subtotal
      );
    end loop;
  end if;

  update public.transactions set total_amount = v_total_amount where id = v_transaction_id;

  insert into public.sync_logs (business_id, type, reference_id, status)
  values (p_business_id, 'transaction', v_transaction_id, 'pending');

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
