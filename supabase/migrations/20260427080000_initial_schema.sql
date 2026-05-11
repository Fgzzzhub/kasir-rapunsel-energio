create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'admin')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  theme text not null check (theme in ('soft', 'green')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null check (price > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  position text,
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  commission_rate numeric(5,2) not null default 10 check (commission_rate >= 0 and commission_rate <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  payment_method text not null check (payment_method in ('cash', 'transfer', 'qris', 'other')),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transaction_services (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  service_name_snapshot text not null,
  employee_id uuid not null references public.employees (id) on delete restrict,
  employee_name_snapshot text not null,
  price_snapshot numeric(12,2) not null check (price_snapshot > 0),
  commission_rate_snapshot numeric(5,2) not null check (commission_rate_snapshot >= 0 and commission_rate_snapshot <= 100),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category text not null check (category in ('rent', 'electricity', 'water', 'salary', 'supplies', 'maintenance', 'operational', 'other')),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.salary_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  type text not null check (type in ('bonus', 'deduction')),
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  adjustment_date date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null check (type in ('transaction', 'commission', 'expense', 'payroll')),
  reference_id uuid,
  status text not null default 'pending' check (status in ('pending', 'synced', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  synced_at timestamptz
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  key text not null,
  value text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key)
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'admin');
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner';
$$;

create index if not exists businesses_slug_idx on public.businesses (slug);
create index if not exists services_business_id_idx on public.services (business_id);
create index if not exists employees_business_id_idx on public.employees (business_id);
create index if not exists transactions_business_id_created_at_idx on public.transactions (business_id, created_at desc);
create index if not exists transactions_created_by_idx on public.transactions (created_by);
create index if not exists transaction_services_transaction_id_idx on public.transaction_services (transaction_id);
create index if not exists transaction_services_employee_id_idx on public.transaction_services (employee_id);
create index if not exists expenses_business_id_expense_date_idx on public.expenses (business_id, expense_date desc);
create index if not exists salary_adjustments_business_id_adjustment_date_idx on public.salary_adjustments (business_id, adjustment_date desc);
create index if not exists sync_logs_business_id_created_at_idx on public.sync_logs (business_id, created_at desc);

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
before update on public.businesses
for each row
execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.employees enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_services enable row level security;
alter table public.expenses enable row level security;
alter table public.salary_adjustments enable row level security;
alter table public.sync_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists "authenticated can read businesses" on public.businesses;
create policy "authenticated can read businesses"
on public.businesses
for select
to authenticated
using (true);

drop policy if exists "owners manage businesses" on public.businesses;
create policy "owners manage businesses"
on public.businesses
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "users read own profile or owner reads all" on public.profiles;
create policy "users read own profile or owner reads all"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_owner());

drop policy if exists "users update own profile or owner updates all" on public.profiles;
create policy "users update own profile or owner updates all"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_owner())
with check (id = auth.uid() or public.is_owner());

drop policy if exists "authenticated can read services" on public.services;
create policy "authenticated can read services"
on public.services
for select
to authenticated
using (true);

drop policy if exists "owners manage services" on public.services;
create policy "owners manage services"
on public.services
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "authenticated can read employees" on public.employees;
create policy "authenticated can read employees"
on public.employees
for select
to authenticated
using (true);

drop policy if exists "owners manage employees" on public.employees;
create policy "owners manage employees"
on public.employees
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "authenticated can read transactions" on public.transactions;
create policy "authenticated can read transactions"
on public.transactions
for select
to authenticated
using (true);

drop policy if exists "authenticated can read transaction services" on public.transaction_services;
create policy "authenticated can read transaction services"
on public.transaction_services
for select
to authenticated
using (true);

drop policy if exists "owners manage expenses" on public.expenses;
create policy "owners manage expenses"
on public.expenses
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "owners manage salary adjustments" on public.salary_adjustments;
create policy "owners manage salary adjustments"
on public.salary_adjustments
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "owners read sync logs" on public.sync_logs;
create policy "owners read sync logs"
on public.sync_logs
for select
to authenticated
using (public.is_owner());

drop policy if exists "owners manage settings" on public.settings;
create policy "owners manage settings"
on public.settings
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

create or replace function public.create_service_transaction(
  p_business_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_commission_amount numeric(12,2);
  v_created_at timestamptz;
  v_employee public.employees%rowtype;
  v_item jsonb;
  v_service public.services%rowtype;
  v_total_amount numeric(12,2) := 0;
  v_total_commission numeric(12,2) := 0;
  v_transaction_id uuid;
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

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal satu layanan harus dipilih.';
  end if;

  select *
  into v_business
  from public.businesses
  where id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Bisnis tidak ditemukan.';
  end if;

  insert into public.transactions (
    business_id,
    customer_name,
    customer_phone,
    payment_method,
    total_amount,
    notes,
    created_by
  )
  values (
    p_business_id,
    btrim(p_customer_name),
    nullif(btrim(p_customer_phone), ''),
    p_payment_method,
    0,
    nullif(btrim(p_notes), ''),
    p_created_by
  )
  returning id, created_at
  into v_transaction_id, v_created_at;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    if nullif(v_item ->> 'serviceId', '') is null then
      raise exception 'Setiap item transaksi wajib memiliki layanan.';
    end if;

    if nullif(v_item ->> 'employeeId', '') is null then
      raise exception 'Setiap item transaksi wajib memiliki karyawan.';
    end if;

    select *
    into v_service
    from public.services
    where id = (v_item ->> 'serviceId')::uuid
      and business_id = p_business_id
      and is_active = true;

    if not found then
      raise exception 'Layanan tidak valid atau sudah nonaktif.';
    end if;

    select *
    into v_employee
    from public.employees
    where id = (v_item ->> 'employeeId')::uuid
      and business_id = p_business_id
      and is_active = true;

    if not found then
      raise exception 'Karyawan tidak valid atau sudah nonaktif.';
    end if;

    v_commission_amount := round((v_service.price * v_employee.commission_rate) / 100.0, 2);
    v_total_amount := v_total_amount + v_service.price;
    v_total_commission := v_total_commission + v_commission_amount;

    insert into public.transaction_services (
      transaction_id,
      service_id,
      service_name_snapshot,
      employee_id,
      employee_name_snapshot,
      price_snapshot,
      commission_rate_snapshot,
      commission_amount
    )
    values (
      v_transaction_id,
      v_service.id,
      v_service.name,
      v_employee.id,
      v_employee.name,
      v_service.price,
      v_employee.commission_rate,
      v_commission_amount
    );
  end loop;

  update public.transactions
  set total_amount = v_total_amount
  where id = v_transaction_id;

  insert into public.sync_logs (business_id, type, reference_id, status)
  values (p_business_id, 'transaction', v_transaction_id, 'pending');

  return jsonb_build_object(
    'transaction_id', v_transaction_id,
    'business_id', v_business.id,
    'business_name', v_business.name,
    'customer_name', btrim(p_customer_name),
    'customer_phone', nullif(btrim(p_customer_phone), ''),
    'payment_method', p_payment_method,
    'total_amount', v_total_amount,
    'total_commission', v_total_commission,
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.create_service_transaction(uuid, text, text, text, text, uuid, jsonb) from public;
grant execute on function public.create_service_transaction(uuid, text, text, text, text, uuid, jsonb) to authenticated;
