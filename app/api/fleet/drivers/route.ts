import { z } from "zod";

import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireStaffSession } from "@/lib/auth/session";
import { createDriver, listCompanyDrivers } from "@/lib/fleet/service";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  display_name: z.string().min(2),
  vehicle_id: z.string().uuid().nullable().optional(),
  status: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireStaffSession();
    const supabase = await createClient();
    const drivers = await listCompanyDrivers(
      supabase,
      session.activeCompanyId!,
    );
    return jsonOk({ ok: true, drivers });
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
    const driver = await createDriver(supabase, session, parsed.data);
    return jsonOk({ ok: true, driver }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
