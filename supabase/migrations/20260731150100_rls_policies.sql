-- Bibulance Phase 0: RLS helpers + policies

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, stable)
-- ---------------------------------------------------------------------------
create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.company_memberships
  where user_id = auth.uid()
    and is_active = true;
$$;

create or replace function public.has_company_role(p_company_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships m
    where m.user_id = auth.uid()
      and m.company_id = p_company_id
      and m.is_active = true
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    p_company_id,
    array['owner', 'admin', 'regulator', 'driver']::public.app_role[]
  );
$$;

create or replace function public.is_mission_owner(p_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.missions m
    where m.id = p_mission_id
      and m.deleted_at is null
      and m.created_by = auth.uid()
  );
$$;

create or replace function public.is_staff_for_mission(p_mission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.missions m
    where m.id = p_mission_id
      and m.deleted_at is null
      and public.is_company_member(m.company_id)
  );
$$;

revoke all on function public.current_company_ids() from public;
revoke all on function public.has_company_role(uuid, public.app_role[]) from public;
revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.is_mission_owner(uuid) from public;
revoke all on function public.is_staff_for_mission(uuid) from public;

grant execute on function public.current_company_ids() to authenticated;
grant execute on function public.has_company_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_mission_owner(uuid) to authenticated;
grant execute on function public.is_staff_for_mission(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.patients enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.missions enable row level security;
alter table public.mission_events enable row level security;
alter table public.company_connectors enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_cursors enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_same_company"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.company_memberships me
      join public.company_memberships them
        on them.company_id = me.company_id
      where me.user_id = auth.uid()
        and me.is_active
        and them.user_id = profiles.id
        and them.is_active
    )
  );

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create policy "companies_select_member"
  on public.companies for select to authenticated
  using (id in (select public.current_company_ids()));

create policy "companies_update_admin"
  on public.companies for update to authenticated
  using (public.has_company_role(id, array['owner', 'admin']::public.app_role[]))
  with check (public.has_company_role(id, array['owner', 'admin']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- company_memberships
-- ---------------------------------------------------------------------------
create policy "memberships_select_same_company"
  on public.company_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_member(company_id)
  );

create policy "memberships_insert_admin"
  on public.company_memberships for insert to authenticated
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

create policy "memberships_update_admin"
  on public.company_memberships for update to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create policy "patients_select_owner_or_staff"
  on public.patients for select to authenticated
  using (
    owner_user_id = auth.uid()
    or (company_id is not null and public.is_company_member(company_id))
  );

create policy "patients_insert_owner"
  on public.patients for insert to authenticated
  with check (owner_user_id = auth.uid() or (company_id is not null and public.is_company_member(company_id)));

create policy "patients_update_owner_or_staff"
  on public.patients for update to authenticated
  using (
    owner_user_id = auth.uid()
    or (company_id is not null and public.is_company_member(company_id))
  )
  with check (
    owner_user_id = auth.uid()
    or (company_id is not null and public.is_company_member(company_id))
  );

-- ---------------------------------------------------------------------------
-- vehicles / drivers
-- ---------------------------------------------------------------------------
create policy "vehicles_select_member"
  on public.vehicles for select to authenticated
  using (public.is_company_member(company_id));

create policy "vehicles_write_staff"
  on public.vehicles for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[]));

create policy "drivers_select_member"
  on public.drivers for select to authenticated
  using (public.is_company_member(company_id));

create policy "drivers_write_staff"
  on public.drivers for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[]));

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
create policy "missions_select_staff_or_owner"
  on public.missions for select to authenticated
  using (
    deleted_at is null
    and (
      public.is_company_member(company_id)
      or created_by = auth.uid()
    )
  );

create policy "missions_insert_patient_or_staff"
  on public.missions for insert to authenticated
  with check (
    (
      source_platform = 'bibulance_web'
      and created_by = auth.uid()
    )
    or public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[])
  );

create policy "missions_update_staff"
  on public.missions for update to authenticated
  using (
    deleted_at is null
    and public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[])
  )
  with check (
    public.has_company_role(company_id, array['owner', 'admin', 'regulator']::public.app_role[])
  );

create policy "missions_update_owner_limited"
  on public.missions for update to authenticated
  using (
    deleted_at is null
    and created_by = auth.uid()
    and accepted_bibulance = false
  )
  with check (
    created_by = auth.uid()
    and source_platform = 'bibulance_web'
  );

-- Soft-delete via update only (admin/owner) — no hard DELETE policy for authenticated

-- ---------------------------------------------------------------------------
-- mission_events
-- ---------------------------------------------------------------------------
create policy "mission_events_select"
  on public.mission_events for select to authenticated
  using (
    public.is_company_member(company_id)
    or public.is_mission_owner(mission_id)
  );

create policy "mission_events_insert_staff"
  on public.mission_events for insert to authenticated
  with check (
    public.has_company_role(company_id, array['owner', 'admin', 'regulator', 'driver']::public.app_role[])
  );

-- ---------------------------------------------------------------------------
-- connectors / sync (admin only for credentials)
-- ---------------------------------------------------------------------------
create policy "connectors_select_admin"
  on public.company_connectors for select to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

create policy "connectors_write_admin"
  on public.company_connectors for all to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

create policy "sync_runs_select_admin"
  on public.sync_runs for select to authenticated
  using (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

create policy "sync_cursors_select_admin"
  on public.sync_cursors for select to authenticated
  using (
    exists (
      select 1
      from public.company_connectors c
      where c.id = sync_cursors.connector_id
        and public.has_company_role(c.company_id, array['owner', 'admin']::public.app_role[])
    )
  );

-- Note: connector sync writes (upsert missions, sync_runs insert/update, cursors)
-- are performed with the service role from Next.js cron / webhook handlers.
