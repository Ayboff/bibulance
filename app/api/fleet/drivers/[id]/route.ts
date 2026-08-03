import { z } from "zod";

import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireStaffSession } from "@/lib/auth/session";
import { updateDriver } from "@/lib/fleet/service";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  display_name: z.string().min(2).optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  status: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireStaffSession();
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide");
    }
    const supabase = await createClient();
    const driver = await updateDriver(supabase, session, id, parsed.data);
    return jsonOk({ ok: true, driver });
  } catch (error) {
    return jsonError(error);
  }
}
