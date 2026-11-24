import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { getSessionContext } from "@/lib/auth/session";
import { readGuestTokensFromCookies } from "@/lib/guest/tokens";
import { cancelGuestMission } from "@/lib/missions/guest-service";
import { cancelOwnMission } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) throw new ApiError(400, "Identifiant mission requis");

    const session = await getSessionContext();
    if (session) {
      const supabase = await createClient();
      const mission = await cancelOwnMission(supabase, session, id);
      return jsonOk({ ok: true, mission });
    }

    const tokens = await readGuestTokensFromCookies();
    if (tokens.length === 0) {
      throw new ApiError(401, "Connexion ou lien de suivi requis");
    }

    const mission = await cancelGuestMission(id, tokens);
    return jsonOk({ ok: true, mission });
  } catch (error) {
    return jsonError(error);
  }
}
