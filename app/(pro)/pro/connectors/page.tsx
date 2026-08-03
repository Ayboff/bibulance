import { redirect } from "next/navigation";

import { ConnectorsPanel } from "@/components/connectors/connectors-panel";
import { canAdminCompany } from "@/lib/auth/rbac";
import { getSessionContext } from "@/lib/auth/session";
import { ensureConnectorsRegistered } from "@/lib/connectors/register-all";
import { listConnectors } from "@/lib/connectors/registry";
import { createClient } from "@/lib/supabase/server";

export default async function ProConnectorsPage() {
  const session = await getSessionContext();
  if (!session?.isStaff || !session.activeCompanyId) {
    redirect("/pro/onboarding");
  }

  ensureConnectorsRegistered();
  const supabase = await createClient();
  const { data: connectors } = await supabase
    .from("company_connectors")
    .select(
      "id, platform, display_name, sync_mode, is_enabled, last_sync_at, last_error, status, config, created_at, updated_at",
    )
    .eq("company_id", session.activeCompanyId)
    .order("platform");

  const adapters = listConnectors().map((c) => ({
    platform: c.platform,
    capabilities: c.capabilities,
  }));

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Connecteurs</h1>
        <p className="text-muted">
          Ambléa, SPS, SCR’urgences, PTAH, CSV — sync automatique (cron) et
          webhooks.
        </p>
        {!canAdminCompany(session.activeRole) ? (
          <p className="mt-2 text-sm text-muted">
            La configuration est réservée aux administrateurs. Les régulateurs
            voient l’état des syncs.
          </p>
        ) : null}
      </div>
      <ConnectorsPanel
        companyId={session.activeCompanyId}
        initialConnectors={connectors ?? []}
        adapters={adapters}
      />
    </section>
  );
}
