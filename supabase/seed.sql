insert into public.businesses (name, slug, theme)
values
  ('Rapunsel Salon', 'rapunsel-salon', 'soft'),
  ('Energio Reflexologi', 'energio-reflexologi', 'green')
on conflict (slug) do update
set
  name = excluded.name,
  theme = excluded.theme,
  is_active = true,
  updated_at = timezone('utc', now());

with rapunsel as (
  select id
  from public.businesses
  where slug = 'rapunsel-salon'
),
energio as (
  select id
  from public.businesses
  where slug = 'energio-reflexologi'
)
insert into public.services (business_id, name, description, price, duration_minutes, is_active)
values
  ((select id from rapunsel), 'Potong Rambut', 'Layanan potong rambut dasar.', 50000, 45, true),
  ((select id from rapunsel), 'Creambath', 'Perawatan rambut dan kulit kepala.', 100000, 60, true),
  ((select id from rapunsel), 'Hair Spa', 'Perawatan intensif untuk rambut.', 150000, 75, true),
  ((select id from rapunsel), 'Hair Coloring', 'Pewarnaan rambut.', 300000, 120, true),
  ((select id from energio), 'Reflexology 60 Menit', 'Layanan refleksi 60 menit.', 120000, 60, true),
  ((select id from energio), 'Reflexology 90 Menit', 'Layanan refleksi 90 menit.', 150000, 90, true),
  ((select id from energio), 'Body Massage', 'Pijat tubuh relaksasi.', 180000, 90, true),
  ((select id from energio), 'Paket Relaxing', 'Paket refleksi dan relaksasi.', 250000, 120, true)
on conflict (business_id, name) do update
set
  description = excluded.description,
  price = excluded.price,
  duration_minutes = excluded.duration_minutes,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

with rapunsel as (
  select id
  from public.businesses
  where slug = 'rapunsel-salon'
),
energio as (
  select id
  from public.businesses
  where slug = 'energio-reflexologi'
)
insert into public.employees (business_id, name, position, base_salary, commission_rate, is_active)
values
  ((select id from rapunsel), 'Rina', 'Stylist', 1500000, 10, true),
  ((select id from rapunsel), 'Maya', 'Therapist', 1500000, 10, true),
  ((select id from energio), 'Andi', 'Therapist', 1700000, 10, true),
  ((select id from energio), 'Budi', 'Therapist', 1700000, 10, true)
on conflict (business_id, name) do update
set
  position = excluded.position,
  base_salary = excluded.base_salary,
  commission_rate = excluded.commission_rate,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

with rapunsel as (
  select id
  from public.businesses
  where slug = 'rapunsel-salon'
),
energio as (
  select id
  from public.businesses
  where slug = 'energio-reflexologi'
)
insert into public.settings (business_id, key, value)
values
  ((select id from rapunsel), 'google_sheets.enabled', 'false'),
  ((select id from rapunsel), 'google_sheets.sheet_name', 'Rapunsel Backup'),
  ((select id from energio), 'google_sheets.enabled', 'false'),
  ((select id from energio), 'google_sheets.sheet_name', 'Energio Backup')
on conflict (business_id, key) do update
set
  value = excluded.value,
  updated_at = timezone('utc', now());
