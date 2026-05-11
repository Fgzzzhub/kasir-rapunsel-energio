-- Migration: 20260427083000_phase3_features.sql

-- 1. Customers Table (Global)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  name text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;

drop policy if exists "authenticated can read customers" on public.customers;
create policy "authenticated can read customers"
on public.customers for select to authenticated using (true);

drop policy if exists "authenticated can insert customers" on public.customers;
create policy "authenticated can insert customers"
on public.customers for insert to authenticated with check (true);

drop policy if exists "authenticated can update customers" on public.customers;
create policy "authenticated can update customers"
on public.customers for update to authenticated using (true) with check (true);


-- 2. Products Table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  category text,
  sku text,
  description text,
  price numeric(12,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, name)
);

create index if not exists products_business_id_idx on public.products (business_id);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "authenticated can read products" on public.products;
create policy "authenticated can read products"
on public.products for select to authenticated using (true);

drop policy if exists "owners manage products" on public.products;
create policy "owners manage products"
on public.products for all to authenticated using (public.is_owner()) with check (public.is_owner());


-- 3. Transaction Products Table
create table if not exists public.transaction_products (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name_snapshot text not null,
  qty integer not null check (qty > 0),
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transaction_products_transaction_id_idx on public.transaction_products (transaction_id);

alter table public.transaction_products enable row level security;

drop policy if exists "authenticated can read transaction products" on public.transaction_products;
create policy "authenticated can read transaction products"
on public.transaction_products for select to authenticated using (true);


-- 4. Alter Transactions Table
alter table public.transactions add column customer_id uuid references public.customers(id) on delete set null;


-- 5. Alter Transaction Services Table
alter table public.transaction_services add column original_price_snapshot numeric(12,2);
alter table public.transaction_services add column price_adjustment_amount numeric(12,2) default 0;
alter table public.transaction_services add column price_adjustment_reason text;

update public.transaction_services set original_price_snapshot = price_snapshot where original_price_snapshot is null;

alter table public.transaction_services alter column original_price_snapshot set not null;


-- 6. New RPC for creating transactions (Mixed Products & Services)
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
  v_employee public.employees%rowtype;
  v_service_final_price numeric(12,2);
  v_commission_amount numeric(12,2);
  
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

  select *
  into v_business
  from public.businesses
  where id = p_business_id
    and is_active = true;

  if not found then
    raise exception 'Bisnis tidak ditemukan.';
  end if;

  -- Handle Customer
  if p_customer_phone is not null and btrim(p_customer_phone) <> '' then
    select id into v_customer_id from public.customers where phone = btrim(p_customer_phone);
    if not found then
      insert into public.customers (phone, name) values (btrim(p_customer_phone), btrim(p_customer_name)) returning id into v_customer_id;
    else
      -- Optional: could update name if different, but skipping to avoid overwriting existing real data
    end if;
  else
    insert into public.customers (name) values (btrim(p_customer_name)) returning id into v_customer_id;
  end if;

  insert into public.transactions (
    business_id,
    customer_id,
    customer_name,
    customer_phone,
    payment_method,
    total_amount,
    notes,
    created_by
  )
  values (
    p_business_id,
    v_customer_id,
    btrim(p_customer_name),
    nullif(btrim(p_customer_phone), ''),
    p_payment_method,
    0,
    nullif(btrim(p_notes), ''),
    p_created_by
  )
  returning id, created_at
  into v_transaction_id, v_created_at;

  -- Process Services
  if jsonb_typeof(p_services) = 'array' then
    for v_service_item in select value from jsonb_array_elements(p_services) loop
      if nullif(v_service_item ->> 'serviceId', '') is null then
        raise exception 'Setiap item layanan wajib memiliki ID layanan.';
      end if;

      if nullif(v_service_item ->> 'employeeId', '') is null then
        raise exception 'Setiap item layanan wajib memiliki karyawan.';
      end if;

      select * into v_service from public.services
      where id = (v_service_item ->> 'serviceId')::uuid and business_id = p_business_id and is_active = true;

      if not found then
        raise exception 'Layanan tidak valid atau sudah nonaktif.';
      end if;

      select * into v_employee from public.employees
      where id = (v_service_item ->> 'employeeId')::uuid and business_id = p_business_id and is_active = true;

      if not found then
        raise exception 'Karyawan tidak valid atau sudah nonaktif.';
      end if;
      
      if v_service_item ? 'finalPrice' and (v_service_item ->> 'finalPrice') is not null then
        v_service_final_price := (v_service_item ->> 'finalPrice')::numeric;
      else
        v_service_final_price := v_service.price;
      end if;
      
      if v_service_final_price < 0 then
        raise exception 'Harga layanan tidak boleh negatif.';
      end if;

      v_commission_amount := round((v_service_final_price * v_employee.commission_rate) / 100.0, 2);
      v_total_amount := v_total_amount + v_service_final_price;
      v_total_commission := v_total_commission + v_commission_amount;

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
        commission_amount
      )
      values (
        v_transaction_id,
        v_service.id,
        v_service.name,
        v_employee.id,
        v_employee.name,
        v_service.price,
        v_service_final_price,
        abs(v_service.price - v_service_final_price),
        nullif(btrim(v_service_item ->> 'priceAdjustmentReason'), ''),
        v_employee.commission_rate,
        v_commission_amount
      );
    end loop;
  end if;

  -- Process Products
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
        transaction_id,
        product_id,
        product_name_snapshot,
        qty,
        price_snapshot,
        subtotal
      )
      values (
        v_transaction_id,
        v_product.id,
        v_product.name,
        (v_product_item ->> 'qty')::integer,
        v_product.price,
        v_product_subtotal
      );
    end loop;
  end if;

  update public.transactions
  set total_amount = v_total_amount
  where id = v_transaction_id;

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
