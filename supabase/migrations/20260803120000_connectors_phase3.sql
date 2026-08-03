-- Phase 3: staff can view connector status (no credential exposure in API select lists)

create policy "connectors_select_staff"
  on public.company_connectors for select to authenticated
  using (public.is_company_member(company_id));

create policy "sync_runs_select_staff"
  on public.sync_runs for select to authenticated
  using (public.is_company_member(company_id));
