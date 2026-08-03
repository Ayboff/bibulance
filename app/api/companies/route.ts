import { jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/session";
import { listBookableCompanies } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

/** Companies available for patient booking. */
export async function GET() {
  try {
    await requireSession();
    const supabase = await createClient();
    const companies = await listBookableCompanies(supabase);
    return jsonOk({ ok: true, companies });
  } catch (error) {
    return jsonError(error);
  }
}
