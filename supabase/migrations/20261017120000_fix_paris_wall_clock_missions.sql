-- Fix bibulance_web missions whose wall-clock Paris times were stored as UTC.
-- Idempotent: only rows not yet tagged with external_payload.tz = Europe/Paris.
-- Example bug: patient booked 22:45 → stored 22:45Z → dashboard showed 00:45 (CEST).

update public.missions
set
  rdv_time = timezone('Europe/Paris', (rdv_time at time zone 'UTC')),
  pec_estimated_time = timezone(
    'Europe/Paris',
    (pec_estimated_time at time zone 'UTC')
  ),
  external_payload = coalesce(external_payload, '{}'::jsonb)
    || jsonb_build_object('tz', 'Europe/Paris')
where source_platform = 'bibulance_web'
  and coalesce(external_payload ->> 'tz', '') is distinct from 'Europe/Paris';
