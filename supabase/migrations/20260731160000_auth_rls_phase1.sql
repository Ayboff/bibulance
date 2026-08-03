-- Phase 1: Auth reinforcement — invites + company bootstrap + tighter RLS

-- ---------------------------------------------------------------------------
-- Company invites (staff onboarding)
-- ---------------------------------------------------------------------------
create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  role public.app_role not null check (role in ('owner', 'admin', 'regulator', 'driver')),
token text not null unique default md5(gen_random_uuid()::text),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

create index company_invites_token_idx on public.company_invites (token)
  where accepted_at is null;

alter table public.company_invites enable row level security;

create policy "invites_select_admin"
  on public.company_invites for select to authenticated
  using (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "invites_insert_admin"
  on public.company_invites for insert to authenticated
  with check (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
  );

create policy "invites_update_admin_or_invitee"
  on public.company_invites for update to authenticated
  using (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "invites_delete_admin"
  on public.company_invites for delete to authenticated
  using (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
  );

-- ---------------------------------------------------------------------------
-- Bootstrap: create company + owner membership (first-time société)
-- ---------------------------------------------------------------------------
create or replace function public.create_company(
  p_name text,
  p_slug text,
  p_siret text default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company public.companies;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Invalid company name';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid slug (use lowercase letters, numbers, hyphens)';
  end if;

  insert into public.companies (name, slug, siret)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_siret), ''))
  returning * into v_company;

  insert into public.company_memberships (user_id, company_id, role)
  values (v_user_id, v_company.id, 'owner');

  update public.profiles
  set
    primary_role = 'owner',
    default_company_id = v_company.id,
    updated_at = now()
  where id = v_user_id;

  return v_company;
end;
$$;

revoke all on function public.create_company(text, text, text) from public;
grant execute on function public.create_company(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Accept invite → membership
-- ---------------------------------------------------------------------------
create or replace function public.accept_company_invite(p_token text)
returns public.company_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.company_invites;
  v_membership public.company_memberships;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_invite
  from public.company_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invite invalid or expired';
  end if;

  if lower(v_invite.email) <> lower(coalesce(v_email, '')) then
    raise exception 'Invite email does not match authenticated user';
  end if;

  insert into public.company_memberships (user_id, company_id, role)
  values (v_user_id, v_invite.company_id, v_invite.role)
  on conflict (user_id, company_id) do update
    set role = excluded.role,
        is_active = true
  returning * into v_membership;

  update public.company_invites
  set accepted_at = now()
  where id = v_invite.id;

  update public.profiles
  set
    primary_role = case
      when primary_role = 'patient' then v_invite.role
      else primary_role
    end,
    default_company_id = coalesce(default_company_id, v_invite.company_id),
    updated_at = now()
  where id = v_user_id;

  return v_membership;
end;
$$;

revoke all on function public.accept_company_invite(text) from public;
grant execute on function public.accept_company_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Soft-delete missions (admin/owner only)
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_mission(p_mission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id
  from public.missions
  where id = p_mission_id
    and deleted_at is null;

  if v_company_id is null then
    raise exception 'Mission not found';
  end if;

  if not public.has_company_role(v_company_id, array['owner', 'admin']::public.app_role[]) then
    raise exception 'Forbidden';
  end if;

  update public.missions
  set deleted_at = now(), updated_at = now()
  where id = p_mission_id;
end;
$$;

revoke all on function public.soft_delete_mission(uuid) from public;
grant execute on function public.soft_delete_mission(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tighten: no anonymous access (explicit revoke)
-- ---------------------------------------------------------------------------
revoke all on table public.companies from anon;
revoke all on table public.profiles from anon;
revoke all on table public.company_memberships from anon;
revoke all on table public.patients from anon;
revoke all on table public.vehicles from anon;
revoke all on table public.drivers from anon;
revoke all on table public.missions from anon;
revoke all on table public.mission_events from anon;
revoke all on table public.company_connectors from anon;
revoke all on table public.sync_runs from anon;
revoke all on table public.sync_cursors from anon;
revoke all on table public.company_invites from anon;

-- Authenticated table grants (RLS still applies)
grant select, insert, update on public.companies to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.company_memberships to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert, update on public.missions to authenticated;
grant select, insert on public.mission_events to authenticated;
grant select, insert, update, delete on public.company_connectors to authenticated;
grant select on public.sync_runs to authenticated;
grant select on public.sync_cursors to authenticated;
grant select, insert, update, delete on public.company_invites to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: is current user staff of any company
-- ---------------------------------------------------------------------------
create or replace function public.is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_memberships
    where user_id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin', 'regulator', 'driver')
  );
$$;

revoke all on function public.is_staff_user() from public;
grant execute on function public.is_staff_user() to authenticated;
