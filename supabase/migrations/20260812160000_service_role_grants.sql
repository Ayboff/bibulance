-- Restore service_role table/function access for server paths (health, cron, webhooks).
-- Phase 1 revoked anon and granted authenticated only; service_role must keep admin access.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
