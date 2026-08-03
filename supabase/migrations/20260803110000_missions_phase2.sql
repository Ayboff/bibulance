-- Phase 2: bookable companies for patient booking + mission helpers

create or replace function public.list_bookable_companies()
returns table (
  id uuid,
  name text,
  slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.slug
  from public.companies c
  where c.is_active = true
  order by c.name;
$$;

revoke all on function public.list_bookable_companies() from public;
grant execute on function public.list_bookable_companies() to authenticated;

-- Default PEC offset from company settings (minutes before RDV)
create or replace function public.company_pec_offset_minutes(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif((settings ->> 'pec_default_offset_minutes')::int, 0),
    45
  )
  from public.companies
  where id = p_company_id;
$$;

revoke all on function public.company_pec_offset_minutes(uuid) from public;
grant execute on function public.company_pec_offset_minutes(uuid) to authenticated;

-- Allow mission owners (patients) to write audit events on their missions
create policy "mission_events_insert_owner"
  on public.mission_events for insert to authenticated
  with check (
    public.is_mission_owner(mission_id)
  );
