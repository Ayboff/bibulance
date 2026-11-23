-- Audit follow-up: invite privilege escalation + connector secret column exposure

-- Invites must never carry owner (bootstrap uses create_company instead).
alter table public.company_invites
  drop constraint if exists company_invites_role_check;

alter table public.company_invites
  add constraint company_invites_role_check
  check (role in ('admin', 'regulator', 'driver'));

-- Invitees must not UPDATE invites (role/token/email). Acceptance is RPC-only.
drop policy if exists "invites_update_admin_or_invitee" on public.company_invites;

create policy "invites_update_admin_only"
  on public.company_invites for update to authenticated
  using (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
  )
  with check (
    public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])
    and role in ('admin', 'regulator', 'driver')
  );

-- Hardening accept_company_invite: refuse owner role if legacy rows remain.
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
  v_role public.app_role;
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

  v_role := v_invite.role;
  if v_role = 'owner' or v_role = 'patient' then
    raise exception 'Invite role not allowed';
  end if;

  insert into public.company_memberships (user_id, company_id, role)
  values (v_user_id, v_invite.company_id, v_role)
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
      when primary_role = 'patient' then v_role
      else primary_role
    end,
    default_company_id = coalesce(default_company_id, v_invite.company_id),
    updated_at = now()
  where id = v_user_id;

  return v_membership;
end;
$$;

-- Staff can manage connectors but must not read secret columns via PostgREST.
revoke select (credentials_encrypted, webhook_secret)
  on public.company_connectors from authenticated;
