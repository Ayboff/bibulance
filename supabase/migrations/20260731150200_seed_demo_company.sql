-- Seed data for local / staging smoke tests (idempotent-ish via slug)
-- Apply only in non-production or after creating a real company via admin tooling.

insert into public.companies (id, name, slug, siret, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  'Ambulance Demo Paris',
  'ambulance-demo-paris',
  '12345678900012',
  '{"pec_default_offset_minutes": 45}'::jsonb
)
on conflict (slug) do nothing;

insert into public.vehicles (company_id, code, vehicle_type)
select c.id, v.code, v.vehicle_type::public.vehicle_type
from public.companies c
cross join (
  values
    ('VSL 12', 'VSL'),
    ('VSL 18', 'VSL'),
    ('AMB 3', 'AMB'),
    ('AMB 7', 'AMB')
) as v(code, vehicle_type)
where c.slug = 'ambulance-demo-paris'
on conflict (company_id, code) do nothing;
