import { NextResponse } from "next/server";

import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { getSessionContext, requireStaffSession } from "@/lib/auth/session";
import { attachGuestTokenCookie } from "@/lib/guest/tokens";
import {
  createPatientMissionSchema,
  listMissionsQuerySchema,
} from "@/lib/missions/schema";
import { createGuestPatientMission } from "@/lib/missions/guest-service";
import { createPatientMission, listMissions } from "@/lib/missions/service";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const session = await getSessionContext();
    if (!session) {
      return jsonError(new ApiError(401, "Connexion requise"));
    }
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
    const body = await request.json();
    const parsed = createPatientMissionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide"),
      );
    }

    const session = await getSessionContext();

    if (session) {
      const supabase = await createClient();
      const result = await createPatientMission(supabase, session, parsed.data);
      return jsonOk(
        {
          ok: true,
          mission: result.mission,
          missions: result.missions,
          created_count: result.created_count,
        },
        201,
      );
    }

    const result = await createGuestPatientMission(parsed.data);
    const response = NextResponse.json(
      {
        ok: true,
        mission: result.mission,
        missions: result.missions,
        created_count: result.created_count,
        guest_access_token: result.guest_access_token,
      },
      { status: 201 },
    );
    await attachGuestTokenCookie(response, result.guest_access_token);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
