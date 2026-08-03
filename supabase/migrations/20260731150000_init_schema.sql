-- Bibulance Phase 0: core multi-tenant schema
-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'owner',
  'admin',
  'regulator',
  'driver',
  'patient'
);

create type public.vehicle_type as enum ('AMB', 'VSL');

create type public.trip_type as enum ('aller', 'retour', 'aller_retour');

create type public.mission_status as enum (
  'incoming',
  'pending_platform',
  'confirmed',
  'assigned',
  'in_progress',
  'done',
  'cancelled',
  'refused'
);

create type public.source_platform as enum (
  'amblea',
  'sps',
  'scr_urgences',
  'ptah',
  'paramedic',
  'bibulance_web',
  'csv',
  'manual',
  'other'
);

create type public.connector_sync_mode as enum (
  'pull',
  'webhook',
  'csv',
  'manual'
);

create type public.sync_run_status as enum (
  'running',
  'success',
  'partial',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Companies (tenants)
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  siret text,
  timezone text not null default 'Europe/Paris',
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  primary_role public.app_role not null default 'patient',
  default_company_id uuid references public.companies (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Memberships (staff ↔ company)
-- ---------------------------------------------------------------------------
create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role public.app_role not null check (role in ('owner', 'admin', 'regulator', 'driver')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index company_memberships_company_idx
  on public.company_memberships (company_id)
  where is_active;

create index company_memberships_user_idx
  on public.company_memberships (user_id)
  where is_active;

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  phone text,
  nir_encrypted text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_owner_idx on public.patients (owner_user_id);
create index patients_company_idx on public.patients (company_id);

-- ---------------------------------------------------------------------------
-- Fleet
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  vehicle_type public.vehicle_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  display_name text not null,
  status text not null default 'available',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drivers_company_idx on public.drivers (company_id);

-- ---------------------------------------------------------------------------
-- Missions (unified aggregation)
-- ---------------------------------------------------------------------------
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  source_platform public.source_platform not null,
  source_mission_id text,
  external_payload jsonb not null default '{}'::jsonb,
  sync_hash text,
  status public.mission_status not null default 'incoming',
  rdv_time timestamptz not null,
  pec_estimated_time timestamptz,
  pec_set_by uuid references public.profiles (id) on delete set null,
  emitter_facility text,
  emitter_address text,
  destination_facility text,
  destination_address text,
  patient_id uuid references public.patients (id) on delete set null,
  patient_first_name text,
  patient_last_name text,
  vehicle_type public.vehicle_type,
  trip_type public.trip_type not null default 'aller',
  care_type text,
  floor_info text,
  notes text,
  specialties jsonb not null default '{}'::jsonb,
  contract_required boolean not null default false,
  accepted_bibulance boolean not null default false,
  platform_confirmation boolean not null default false,
  assigned_vehicle_id uuid references public.vehicles (id) on delete set null,
  assigned_driver_id uuid references public.drivers (id) on delete set null,
  is_locked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  platform_confirmed_at timestamptz,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index missions_external_uidx
  on public.missions (company_id, source_platform, source_mission_id)
  where source_mission_id is not null and deleted_at is null;

create index missions_company_rdv_idx
  on public.missions (company_id, rdv_time)
  where deleted_at is null;

create index missions_company_status_idx
  on public.missions (company_id, status)
  where deleted_at is null;

create index missions_created_by_idx
  on public.missions (created_by)
  where deleted_at is null;

create index missions_source_idx
  on public.missions (company_id, source_platform)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Mission audit events
-- ---------------------------------------------------------------------------
create table public.mission_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index mission_events_mission_idx
  on public.mission_events (mission_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Connectors
-- ---------------------------------------------------------------------------
create table public.company_connectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  platform public.source_platform not null,
  display_name text,
  sync_mode public.connector_sync_mode not null default 'pull',
  credentials_encrypted text,
  config jsonb not null default '{}'::jsonb,
  webhook_secret text,
  is_enabled boolean not null default true,
  last_sync_at timestamptz,
  last_error text,
  status text not null default 'idle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, platform)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.company_connectors (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  status public.sync_run_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text
);

create index sync_runs_connector_idx
  on public.sync_runs (connector_id, started_at desc);

create table public.sync_cursors (
  connector_id uuid not null references public.company_connectors (id) on delete cascade,
  cursor_key text not null,
  cursor_value text not null,
  updated_at timestamptz not null default now(),
  primary key (connector_id, cursor_key)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

create trigger vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

create trigger missions_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create trigger company_connectors_updated_at
  before update on public.company_connectors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, primary_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'primary_role')::public.app_role, 'patient')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Realtime: missions
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.missions;
