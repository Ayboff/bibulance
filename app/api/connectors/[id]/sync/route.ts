import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { canAdminCompany } from "@/lib/auth/rbac";
import { requireStaffSession } from "@/lib/auth/session";
import { syncConnector } from "@/lib/connectors/sync-engine";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await requireStaffSession();
    if (!canAdminCompany(session.activeRole)) {
      throw new ApiError(403, "Réservé owner/admin");
    }

    const { id } = await params;
    const supabase = await createClient();
    const { data: connector, error } = await supabase
      .from("company_connectors")
      .select("*")
      .eq("id", id)
      .eq("company_id", session.activeCompanyId!)
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    if (!connector) throw new ApiError(404, "Connecteur introuvable");

    // Use admin for sync writes (sync_runs insert etc. have limited RLS)
    const admin = createAdminClient();
    const { data: full } = await admin
      .from("company_connectors")
      .select("*")
      .eq("id", connector.id)
      .single();

    const result = await syncConnector(full ?? connector);
    return jsonOk({ ok: true, result });
  } catch (error) {
    return jsonError(error);
  }
}
