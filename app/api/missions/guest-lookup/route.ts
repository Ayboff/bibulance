import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, jsonError } from "@/lib/api/http";
import {
  guestTokensCookieOptions,
  mergeGuestTokens,
  readGuestTokensFromCookies,
} from "@/lib/guest/tokens";
import { listMissionsByPhoneAndLastName } from "@/lib/missions/guest-service";

const bodySchema = z.object({
  phone: z.string().min(1),
  lastname: z.string().min(2, "Nom requis"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(
        new ApiError(400, parsed.error.issues[0]?.message ?? "Données invalides"),
      );
    }

    const { missions, tokens } = await listMissionsByPhoneAndLastName(
      parsed.data.phone,
      parsed.data.lastname,
    );

    if (missions.length === 0) {
      return jsonError(
        new ApiError(
          404,
          "Aucun trajet trouvé pour ce téléphone et ce nom. Vérifiez la saisie.",
        ),
      );
    }

    const existing = await readGuestTokensFromCookies();
    let merged = existing;
    for (const t of tokens) {
      merged = mergeGuestTokens(merged, t);
    }

    const response = NextResponse.json({
      ok: true,
      count: missions.length,
    });

    const opts = guestTokensCookieOptions(merged);
    response.cookies.set(opts.name, opts.value, {
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
      maxAge: opts.maxAge,
    });

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
