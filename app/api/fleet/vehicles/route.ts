import { z } from "zod";

import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireStaffSession } from "@/lib/auth/session";
import { createVehicle } from "@/lib/fleet/service";
import { listCompanyVehicles } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  code: z.string().min(1),
  vehicle_type: z.enum(["AMB", "VSL"]),
});

export async function GET() {
  try {
    const session = await requireStaffSession();
    const supabase = await createClient();
    const vehicles = await listCompanyVehicles(
      supabase,
      session.activeCompanyId!,
    );
    return jsonOk({ ok: true, vehicles });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide");
    }
    const supabase = await createClient();
    const vehicle = await createVehicle(supabase, session, parsed.data);
    return jsonOk({ ok: true, vehicle }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
