import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireStaffSession } from "@/lib/auth/session";
import { updatePecSchema } from "@/lib/missions/schema";
import { updateMissionPec } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePecSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide"),
      );
    }

    const supabase = await createClient();
    const mission = await updateMissionPec(supabase, session, id, parsed.data);
    return jsonOk({ ok: true, mission });
  } catch (error) {
    return jsonError(error);
  }
}
