-- Customer data module support.
-- Customers remain global because existing transaction creation deduplicates by unique phone.

create index if not exists customers_created_at_idx on public.customers (created_at desc);
create index if not exists customers_name_idx on public.customers (name);
create index if not exists transactions_customer_id_created_at_idx on public.transactions (customer_id, created_at desc);

drop policy if exists "authenticated can update customers" on public.customers;
create policy "owner and admin can update customers"
on public.customers
for update
to authenticated
using (public.current_user_role() in ('owner', 'admin'))
with check (public.current_user_role() in ('owner', 'admin'));
