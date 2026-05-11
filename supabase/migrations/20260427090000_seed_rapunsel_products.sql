-- Migration: 20260427090000_seed_rapunsel_products.sql
-- Seed sample products for Rapunsel Salon only.
-- Uses ON CONFLICT DO NOTHING so re-running this migration is safe.

do $$
declare
  v_rapunsel_id uuid;
begin
  select id into v_rapunsel_id
  from public.businesses
  where slug = 'rapunsel-salon'
  limit 1;

  if v_rapunsel_id is null then
    raise notice 'Rapunsel Salon business not found. Skipping product seed.';
    return;
  end if;

  insert into public.products (business_id, name, category, price, is_active)
  values
    (v_rapunsel_id, 'Shampoo Treatment',  'Perawatan Rambut', 75000,  true),
    (v_rapunsel_id, 'Hair Vitamin',        'Perawatan Rambut', 50000,  true),
    (v_rapunsel_id, 'Hair Mask',           'Perawatan Rambut', 85000,  true),
    (v_rapunsel_id, 'Serum Rambut',        'Perawatan Rambut', 95000,  true)
  on conflict (business_id, name) do nothing;

  raise notice 'Rapunsel products seeded (or already exist).';
end;
$$;
