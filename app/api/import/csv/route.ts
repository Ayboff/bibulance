import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { canAdminCompany } from "@/lib/auth/rbac";
import { requireStaffSession } from "@/lib/auth/session";
import {
  DEFAULT_CSV_MAPPING,
  parseCsvMissions,
  type CsvColumnMapping,
} from "@/lib/connectors/csv";
import { syncConnector } from "@/lib/connectors/sync-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SourcePlatform } from "@/types/database";

/**
 * Import a CSV file into missions for the active company.
 * Optionally targets an existing connector (platform csv or other).
 */
export async function POST(request: Request) {
  try {
    const session = await requireStaffSession();
    if (!canAdminCompany(session.activeRole) && session.activeRole !== "regulator") {
      // regulators can import too
    }

    const form = await request.formData();
    const file = form.get("file");
    const platform = String(form.get("platform") ?? "csv") as SourcePlatform;

    if (!(file instanceof File)) {
      throw new ApiError(400, "Fichier CSV requis (field: file)");
    }

    const text = await file.text();
    const mapping = {
      ...DEFAULT_CSV_MAPPING,
    } satisfies CsvColumnMapping;

    const missions = parseCsvMissions(text, mapping, platform);
    if (missions.length === 0) {
      throw new ApiError(
        400,
        "Aucune ligne valide (colonnes source_mission_id + rdv_time requises)",
      );
    }

    const admin = createAdminClient();
    let { data: connector } = await admin
      .from("company_connectors")
      .select("*")
      .eq("company_id", session.activeCompanyId!)
      .eq("platform", platform)
      .maybeSingle();

    if (!connector) {
      const supabase = await createClient();
      const { data: created, error } = await supabase
        .from("company_connectors")
        .insert({
          company_id: session.activeCompanyId!,
          platform,
          display_name: `Import ${platform}`,
          sync_mode: "csv",
          is_enabled: true,
          status: "idle",
          config: { mapping },
        })
        .select("*")
        .single();

      if (error) {
        // fallback admin insert (RLS)
        const { data: adminCreated, error: adminError } = await admin
          .from("company_connectors")
          .insert({
            company_id: session.activeCompanyId!,
            platform,
            display_name: `Import ${platform}`,
            sync_mode: "csv",
            is_enabled: true,
            status: "idle",
            config: { mapping },
          })
          .select("*")
          .single();
        if (adminError) throw new ApiError(400, adminError.message);
        connector = adminCreated;
      } else {
        connector = created;
      }
    }

    const result = await syncConnector(connector!, { missions });
    return jsonOk({ ok: true, imported: missions.length, result });
  } catch (error) {
    return jsonError(error);
  }
}
