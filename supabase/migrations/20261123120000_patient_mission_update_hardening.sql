-- Phase audit: remove overly permissive patient UPDATE on missions.
-- Patients may only cancel their own non-accepted missions via RPC.

drop policy if exists "missions_update_owner_limited" on public.missions;

create or replace function public.cancel_own_mission(p_mission_id uuid)
returns public.missions
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.missions;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into m
  from public.missions
  where id = p_mission_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if m.created_by is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  if m.accepted_bibulance = true then
    raise exception 'ALREADY_ACCEPTED';
  end if;

  if m.status in ('done', 'cancelled', 'refused', 'assigned', 'confirmed', 'in_progress') then
    raise exception 'NOT_CANCELLABLE';
  end if;

  update public.missions
  set
    status = 'cancelled',
    is_locked = false,
    assigned_vehicle_id = null,
    assigned_driver_id = null,
    updated_at = now()
  where id = p_mission_id
  returning * into m;

  insert into public.mission_events (
    mission_id,
    company_id,
    actor_id,
    event_type,
    payload
  ) values (
    m.id,
    m.company_id,
    auth.uid(),
    'mission_cancelled_by_patient',
    '{}'::jsonb
  );

  return m;
end;
$$;

revoke all on function public.cancel_own_mission(uuid) from public;
grant execute on function public.cancel_own_mission(uuid) to authenticated;
