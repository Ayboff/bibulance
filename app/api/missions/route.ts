import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { requireSession, requireStaffSession } from "@/lib/auth/session";
import {
  createPatientMissionSchema,
  listMissionsQuerySchema,
} from "@/lib/missions/schema";
import { createPatientMission, listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const parsed = listMissionsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Query invalide"),
      );
    }

    const freshSession =
      parsed.data.scope === "company" ? await requireStaffSession() : session;

    const supabase = await createClient();
    const missions = await listMissions(supabase, freshSession, parsed.data);
    return jsonOk({ ok: true, missions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createPatientMissionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide"),
      );
    }

    const supabase = await createClient();
    const mission = await createPatientMission(supabase, session, parsed.data);
    return jsonOk({ ok: true, mission }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
