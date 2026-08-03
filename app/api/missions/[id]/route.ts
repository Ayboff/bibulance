import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireSession, requireStaffSession } from "@/lib/auth/session";
import { updateMissionSchema } from "@/lib/missions/schema";
import { getMission, updateMission } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const supabase = await createClient();
    const mission = await getMission(supabase, id);
    return jsonOk({ ok: true, mission });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMissionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide"),
      );
    }

    const supabase = await createClient();
    const mission = await updateMission(supabase, session, id, parsed.data);
    return jsonOk({ ok: true, mission });
  } catch (error) {
    return jsonError(error);
  }
}
