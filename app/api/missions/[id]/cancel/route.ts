import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/session";
import { cancelOwnMission } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!id) throw new ApiError(400, "Identifiant mission requis");

    const supabase = await createClient();
    const mission = await cancelOwnMission(supabase, session, id);
    return jsonOk({ ok: true, mission });
  } catch (error) {
    return jsonError(error);
  }
}
