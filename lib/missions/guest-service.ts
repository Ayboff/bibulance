import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/http";
import {
  createGuestAccessToken,
  normalizePhoneDigits,
} from "@/lib/guest/tokens";
import {
  buildRdvIso,
  normalizeVehicleType,
  type CreatePatientMissionInput,
} from "@/lib/missions/schema";
import { sealNir } from "@/lib/privacy/nir";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPatientCancel } from "@/lib/missions/transitions";
import type { Database, Json, Mission } from "@/types/database";

type Client = SupabaseClient<Database>;
type Admin = ReturnType<typeof createAdminClient>;

function payloadOf(mission: Mission): Record<string, unknown> {
  const raw = mission.external_payload;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function guestTokenOf(mission: Mission): string | null {
  const t = payloadOf(mission).guest_access_token;
  return typeof t === "string" && t.length >= 16 ? t : null;
}

async function appendEvent(
  client: Client | Admin,
  args: {
    missionId: string;
    companyId: string;
    eventType: string;
    payload?: Json;
  },
) {
  await client.from("mission_events").insert({
    mission_id: args.missionId,
    company_id: args.companyId,
    actor_id: null,
    event_type: args.eventType,
    payload: args.payload ?? {},
  });
}

function subtractMinutes(isoUtc: string, minutes: number): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, "Horodatage RDV invalide");
  }
  d.setUTCMinutes(d.getUTCMinutes() - minutes);
  return d.toISOString();
}

async function listActiveCompanies(admin: Admin) {
  const { data, error } = await admin
    .from("companies")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");
  if (error) throw new ApiError(500, error.message);
  return data ?? [];
}

export async function listBookableCompaniesPublic() {
  const admin = createAdminClient();
  return listActiveCompanies(admin);
}

export type CreateGuestMissionResult = {
  mission: Mission;
  missions: Mission[];
  created_count: number;
  guest_access_token: string;
};

/** Commande patient sans compte — insert via service role. */
export async function createGuestPatientMission(
  input: CreatePatientMissionInput,
): Promise<CreateGuestMissionResult> {
  const admin = createAdminClient();
  const dispatchMode = input.dispatch_mode ?? "specific";
  const bookingModeRaw = input.booking_mode ?? "once";
  const bookingMode =
    bookingModeRaw === "iterative" || bookingModeRaw === "recurring"
      ? "iterative"
      : "once";

  let targetCompanies: { id: string; name: string; slug: string }[];
  if (dispatchMode === "partners") {
    targetCompanies = await listActiveCompanies(admin);
    if (targetCompanies.length === 0) {
      throw new ApiError(400, "Aucune société partenaire disponible");
    }
  } else {
    if (!input.company_id) throw new ApiError(400, "Société requise");
    const { data: company, error } = await admin
      .from("companies")
      .select("id, name, slug")
      .eq("id", input.company_id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new ApiError(500, error.message);
    if (!company) throw new ApiError(404, "Société introuvable");
    targetCompanies = [company];
  }

  const occurrences =
    input.occurrences && input.occurrences.length > 0
      ? input.occurrences
      : [
          {
            date: input.date!,
            time: input.time!,
            trip_type: input.trip_type,
          },
        ];

  if (occurrences.length === 0) {
    throw new ApiError(400, "Aucune date de transport");
  }

  const guestToken = createGuestAccessToken();
  const phoneDigits = normalizePhoneDigits(input.phone);
  const seriesId =
    bookingMode === "iterative" || occurrences.length > 1
      ? crypto.randomUUID()
      : null;
  const vehicleType = normalizeVehicleType(input.transport_type);
  const stamp = Date.now();
  const created: Mission[] = [];

  for (let occIndex = 0; occIndex < occurrences.length; occIndex++) {
    const occ = occurrences[occIndex]!;
    const tripType = occ.trip_type ?? input.trip_type ?? "aller";
    const broadcastId =
      dispatchMode === "partners" ? crypto.randomUUID() : null;

    for (const company of targetCompanies) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: offsetRaw } = await (admin as any).rpc(
        "company_pec_offset_minutes",
        { p_company_id: company.id },
      );
      const offset =
        typeof offsetRaw === "number" && offsetRaw > 0 ? offsetRaw : 45;

      const rdvLocal = buildRdvIso(occ.date, occ.time);
      const pecIso = subtractMinutes(rdvLocal, offset);

      const insert = {
        company_id: company.id,
        source_platform: "bibulance_web" as const,
        source_mission_id: `guest-${phoneDigits.slice(-4)}-${stamp}-${occIndex}-${company.id.slice(0, 6)}`,
        status: "incoming" as const,
        rdv_time: rdvLocal,
        pec_estimated_time: pecIso,
        emitter_address: input.depart_address,
        destination_address: input.arrival_address,
        patient_first_name: input.firstname,
        patient_last_name: input.lastname,
        vehicle_type: vehicleType,
        trip_type: tripType,
        care_type: input.reason ?? null,
        notes: input.comment ?? null,
        specialties: (input.specialties ?? {}) as Json,
        created_by: null,
        external_payload: {
          phone: input.phone ?? null,
          phone_digits: phoneDigits,
          patient_birthdate: input.patient_birthdate || null,
          patient_social_security: sealNir(input.patient_social_security),
          ordered_for_someone: input.ordered_for_someone === true,
          relative_firstname: input.relative_firstname?.trim() || null,
          relative_lastname: input.relative_lastname?.trim() || null,
          relative_relation: input.relative_relation?.trim() || null,
          relative_phone: input.relative_phone?.trim() || null,
          channel: "bibulance_web_guest",
          is_guest: true,
          guest_access_token: guestToken,
          tz: "Europe/Paris",
          dispatch_mode: dispatchMode,
          booking_mode: bookingMode,
          broadcast_id: broadcastId,
          series_id: seriesId,
          occurrence_index: occIndex,
        } as Json,
      };

      const { data, error } = await admin
        .from("missions")
        .insert(insert)
        .select("*")
        .single();

      if (error) throw new ApiError(400, error.message);

      await appendEvent(admin, {
        missionId: data.id,
        companyId: data.company_id,
        eventType: "mission_created",
        payload: {
          source: "bibulance_web_guest",
          dispatch_mode: dispatchMode,
          booking_mode: bookingMode,
        },
      });

      created.push(data);
    }
  }

  if (created.length === 0) {
    throw new ApiError(400, "Aucune mission créée");
  }

  const logicalCount =
    dispatchMode === "partners"
      ? occurrences.length
      : created.length;

  return {
    mission: created[0]!,
    missions: created,
    created_count: logicalCount,
    guest_access_token: guestToken,
  };
}

export async function listMissionsByGuestTokens(
  tokens: string[],
): Promise<Mission[]> {
  if (tokens.length === 0) return [];
  const admin = createAdminClient();
  // Fetch recent web missions and filter by token (payload JSON).
  const { data, error } = await admin
    .from("missions")
    .select("*")
    .eq("source_platform", "bibulance_web")
    .is("deleted_at", null)
    .order("rdv_time", { ascending: false })
    .limit(400);

  if (error) throw new ApiError(500, error.message);
  const set = new Set(tokens);
  return (data ?? []).filter((m) => {
    const t = guestTokenOf(m);
    return t != null && set.has(t);
  });
}

export async function listMissionsByPhoneAndLastName(
  phone: string,
  lastName: string,
): Promise<{ missions: Mission[]; tokens: string[] }> {
  const digits = normalizePhoneDigits(phone);
  const last = lastName.trim().toLowerCase();
  if (digits.length < 10 || last.length < 2) {
    throw new ApiError(400, "Téléphone (10 chiffres) et nom requis");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("missions")
    .select("*")
    .eq("source_platform", "bibulance_web")
    .is("deleted_at", null)
    .ilike("patient_last_name", lastName.trim())
    .order("rdv_time", { ascending: false })
    .limit(200);

  if (error) throw new ApiError(500, error.message);

  const matched = (data ?? []).filter((m) => {
    const p = payloadOf(m);
    const storedDigits =
      typeof p.phone_digits === "string"
        ? p.phone_digits
        : normalizePhoneDigits(String(p.phone ?? ""));
    if (storedDigits !== digits) return false;
    const name = (m.patient_last_name ?? "").trim().toLowerCase();
    return name === last;
  });

  const tokens = [
    ...new Set(
      matched
        .map((m) => guestTokenOf(m))
        .filter((t): t is string => Boolean(t)),
    ),
  ];

  return { missions: matched, tokens };
}

export async function cancelGuestMission(
  missionId: string,
  allowedTokens: string[],
): Promise<Mission> {
  const admin = createAdminClient();
  const { data: current, error } = await admin
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!current) throw new ApiError(404, "Mission introuvable");

  const token = guestTokenOf(current);
  if (!token || !allowedTokens.includes(token)) {
    throw new ApiError(403, "Vous ne pouvez annuler que vos propres demandes");
  }
  if (!canPatientCancel(current.status, current.accepted_bibulance)) {
    throw new ApiError(
      400,
      "Cette demande ne peut plus être annulée depuis l’espace patient",
    );
  }

  const { data, error: updateError } = await admin
    .from("missions")
    .update({
      status: "cancelled",
      is_locked: false,
      assigned_vehicle_id: null,
      assigned_driver_id: null,
    })
    .eq("id", missionId)
    .select("*")
    .single();

  if (updateError) throw new ApiError(400, updateError.message);

  await appendEvent(admin, {
    missionId,
    companyId: data.company_id,
    eventType: "mission_cancelled_by_guest",
    payload: { guest: true },
  });

  return data;
}

export async function getCompanyBySlug(slug: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new ApiError(500, error.message);
  return data;
}
