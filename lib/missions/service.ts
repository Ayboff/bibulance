import type { SupabaseClient } from "@supabase/supabase-js";

import type { SessionContext } from "@/lib/auth/session";
import { canRegulate } from "@/lib/auth/rbac";
import { ApiError } from "@/lib/api/http";
import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import {
  buildRdvIso,
  normalizeVehicleType,
  type CreatePatientMissionInput,
  type ListMissionsQuery,
  type UpdateMissionInput,
  type UpdatePecInput,
} from "@/lib/missions/schema";
import { parisDayBoundsUtc } from "@/lib/missions/timezone";
import {
  assertMissionTransition,
  canPatientCancel,
} from "@/lib/missions/transitions";
import { sealNir } from "@/lib/privacy/nir";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json, Mission, MissionStatus } from "@/types/database";

type Client = SupabaseClient<Database>;

async function appendEvent(
  client: Client,
  args: {
    missionId: string;
    companyId: string;
    actorId: string | null;
    eventType: string;
    payload?: Json;
  },
) {
  await client.from("mission_events").insert({
    mission_id: args.missionId,
    company_id: args.companyId,
    actor_id: args.actorId,
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

export async function listBookableCompanies(client: Client) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc("list_bookable_companies");
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export type CreatePatientMissionResult = {
  mission: Mission;
  missions: Mission[];
  created_count: number;
};

export async function createPatientMission(
  client: Client,
  session: SessionContext,
  input: CreatePatientMissionInput,
): Promise<CreatePatientMissionResult> {
  const dispatchMode = input.dispatch_mode ?? "specific";
  const bookingModeRaw = input.booking_mode ?? "once";
  const bookingMode =
    bookingModeRaw === "iterative" || bookingModeRaw === "recurring"
      ? "iterative"
      : "once";

  let targetCompanies: { id: string; name: string; slug: string }[];
  if (dispatchMode === "partners") {
    targetCompanies = await listBookableCompanies(client);
    if (targetCompanies.length === 0) {
      throw new ApiError(400, "Aucune société partenaire disponible");
    }
  } else {
    if (!input.company_id) {
      throw new ApiError(400, "Société requise");
    }
    targetCompanies = [
      { id: input.company_id, name: "", slug: "" },
    ];
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
      const { data: offsetRaw } = await (client as any).rpc(
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
        source_mission_id: `web-${session.userId.slice(0, 8)}-${stamp}-${occIndex}-${company.id.slice(0, 6)}`,
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
        created_by: session.userId,
        external_payload: {
          phone: input.phone ?? null,
          patient_birthdate: input.patient_birthdate || null,
          patient_social_security: sealNir(input.patient_social_security),
          ordered_for_someone: input.ordered_for_someone === true,
          relative_firstname: input.relative_firstname?.trim() || null,
          relative_lastname: input.relative_lastname?.trim() || null,
          relative_relation: input.relative_relation?.trim() || null,
          relative_phone: input.relative_phone?.trim() || null,
          channel: "bibulance_web",
          tz: "Europe/Paris",
          dispatch_mode: dispatchMode,
          booking_mode: bookingMode,
          broadcast_id: broadcastId,
          series_id: seriesId,
          occurrence_index: occIndex,
        } as Json,
      };

      const { data, error } = await client
        .from("missions")
        .insert(insert)
        .select("*")
        .single();

      if (error) throw new ApiError(400, error.message);

      await appendEvent(client, {
        missionId: data.id,
        companyId: data.company_id,
        actorId: session.userId,
        eventType: "mission_created",
        payload: {
          source: "bibulance_web",
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

  // Patient-facing count = logical trips (one per occurrence), not one per company.
  const logicalCount =
    dispatchMode === "partners" ? occurrences.length : created.length;

  return {
    mission: created[0]!,
    missions: created,
    created_count: logicalCount,
  };
}

async function cancelBroadcastSiblings(mission: Mission) {
  const meta = getMissionBookingMeta(mission);
  if (!meta.broadcast_id) return;

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: siblings } = await (admin as any)
      .from("missions")
      .select("id, company_id")
      .neq("id", mission.id)
      .is("deleted_at", null)
      .filter("external_payload->>broadcast_id", "eq", meta.broadcast_id)
      .in("status", ["incoming", "pending_platform"]);

    const rows = (siblings ?? []) as { id: string; company_id: string }[];
    if (rows.length === 0) return;

    const ids = rows.map((r) => r.id);
    await admin
      .from("missions")
      .update({
        status: "cancelled",
        accepted_bibulance: false,
        is_locked: false,
        assigned_vehicle_id: null,
        assigned_driver_id: null,
      })
      .in("id", ids);

    for (const row of rows) {
      await appendEvent(admin as unknown as Client, {
        missionId: row.id,
        companyId: row.company_id,
        actorId: null,
        eventType: "broadcast_cancelled",
        payload: {
          reason: "accepted_by_partner",
          winner_mission_id: mission.id,
          broadcast_id: meta.broadcast_id,
        },
      });
    }
  } catch {
    // Best-effort: acceptance still succeeds if sibling cancel fails.
  }
}

export async function listMissions(
  client: Client,
  session: SessionContext,
  query: ListMissionsQuery,
): Promise<Mission[]> {
  let builder = client
    .from("missions")
    .select("*")
    .is("deleted_at", null)
    .order("rdv_time", { ascending: true });

  if (query.scope === "mine") {
    builder = builder.eq("created_by", session.userId);
  } else {
    if (!session.activeCompanyId || !session.isStaff) {
      throw new ApiError(403, "Liste société réservée au staff");
    }
    builder = builder.eq("company_id", session.activeCompanyId);
  }

  if (query.date) {
    const { start, end } = parisDayBoundsUtc(query.date);
    builder = builder.gte("rdv_time", start).lte("rdv_time", end);
  }

  if (query.status) {
    builder = builder.eq("status", query.status);
  }

  if (query.source_platform) {
    builder = builder.eq("source_platform", query.source_platform);
  }

  if (query.include_confirmed === false) {
    builder = builder.or(
      "accepted_bibulance.eq.false,platform_confirmation.eq.false",
    );
  }

  const { data, error } = await builder;
  if (error) throw new ApiError(500, error.message);

  let rows = data ?? [];

  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter((m) => {
      const hay = [
        m.patient_first_name,
        m.patient_last_name,
        m.emitter_address,
        m.destination_address,
        m.emitter_facility,
        m.destination_facility,
        m.source_platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return rows;
}

export async function getMission(
  client: Client,
  missionId: string,
): Promise<Mission> {
  const { data, error } = await client
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(404, "Mission introuvable");
  return data;
}

export async function updateMission(
  client: Client,
  session: SessionContext,
  missionId: string,
  input: UpdateMissionInput,
): Promise<Mission> {
  if (!canRegulate(session.activeRole)) {
    throw new ApiError(403, "Action réservée aux régulateurs");
  }

  const current = await getMission(client, missionId);
  if (current.company_id !== session.activeCompanyId) {
    throw new ApiError(403, "Mission hors société active");
  }

  const patch: Database["public"]["Tables"]["missions"]["Update"] = {
    ...input,
  };

  const now = new Date().toISOString();

  if (input.accepted_bibulance === true && !current.accepted_bibulance) {
    patch.accepted_at = now;
    patch.status = (input.status ?? "pending_platform") as MissionStatus;
  }

  if (input.accepted_bibulance === false) {
    patch.status = "refused";
    patch.is_locked = false;
    patch.assigned_vehicle_id = null;
    patch.assigned_driver_id = null;
  }

  if (input.assigned_vehicle_id) {
    patch.assigned_at = now;
    patch.is_locked = true;
    // Assigning a vehicle implies the company takes the mission.
    if (!current.accepted_bibulance && input.accepted_bibulance !== false) {
      patch.accepted_bibulance = true;
      patch.accepted_at = current.accepted_at ?? now;
    }
  }

  if (input.assigned_vehicle_id === null) {
    patch.assigned_at = null;
    patch.is_locked = false;
  }

  if (input.platform_confirmation === true && !current.platform_confirmation) {
    patch.platform_confirmed_at = now;
  }

  // Resolve final status from combined flags (vehicle can be set before confirm).
  if (!input.status) {
    const accepted =
      (patch.accepted_bibulance ?? current.accepted_bibulance) === true;
    const confirmed =
      (patch.platform_confirmation ?? current.platform_confirmation) === true;
    const hasVehicle = Boolean(
      input.assigned_vehicle_id !== undefined
        ? input.assigned_vehicle_id
        : current.assigned_vehicle_id,
    );

    if (input.accepted_bibulance === false) {
      // already set to refused above
    } else if (hasVehicle && (confirmed || accepted)) {
      patch.status = confirmed ? "assigned" : "pending_platform";
    } else if (confirmed) {
      patch.status = "confirmed";
    } else if (accepted) {
      patch.status = "pending_platform";
    } else if (input.assigned_vehicle_id === null) {
      patch.status = "incoming";
    }
  }

  const nextStatus = (patch.status ?? current.status) as MissionStatus;
  try {
    assertMissionTransition(current.status, nextStatus);
  } catch {
    throw new ApiError(
      400,
      `Transition de statut interdite : ${current.status} → ${nextStatus}`,
    );
  }

  const { data, error } = await client
    .from("missions")
    .update(patch)
    .eq("id", missionId)
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);

  if (data.accepted_bibulance && !current.accepted_bibulance) {
    await cancelBroadcastSiblings(data);
  }

  await appendEvent(client, {
    missionId,
    companyId: data.company_id,
    actorId: session.userId,
    eventType: "mission_updated",
    payload: input as Json,
  });

  return data;
}

export async function updateMissionPec(
  client: Client,
  session: SessionContext,
  missionId: string,
  input: UpdatePecInput,
): Promise<Mission> {
  if (!canRegulate(session.activeRole)) {
    throw new ApiError(403, "Action réservée aux régulateurs");
  }

  const current = await getMission(client, missionId);
  if (current.company_id !== session.activeCompanyId) {
    throw new ApiError(403, "Mission hors société active");
  }

  const pec = new Date(input.pec_estimated_time);
  if (Number.isNaN(pec.getTime())) {
    throw new ApiError(400, "Format pec_estimated_time invalide");
  }

  const { data, error } = await client
    .from("missions")
    .update({
      pec_estimated_time: pec.toISOString(),
      pec_set_by: session.userId,
    })
    .eq("id", missionId)
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);

  await appendEvent(client, {
    missionId,
    companyId: data.company_id,
    actorId: session.userId,
    eventType: "pec_updated",
    payload: {
      pec_estimated_time: data.pec_estimated_time,
      previous: current.pec_estimated_time,
    },
  });

  return data;
}

export async function listCompanyVehicles(client: Client, companyId: string) {
  const { data, error } = await client
    .from("vehicles")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("code");

  if (error) throw new ApiError(500, error.message);
  return data ?? [];
}

/** Patient-initiated cancel (non-accepted, early statuses only). */
export async function cancelOwnMission(
  client: Client,
  session: SessionContext,
  missionId: string,
): Promise<Mission> {
  const current = await getMission(client, missionId);
  if (current.created_by !== session.userId) {
    throw new ApiError(403, "Vous ne pouvez annuler que vos propres demandes");
  }
  if (!canPatientCancel(current.status, current.accepted_bibulance)) {
    throw new ApiError(
      400,
      "Cette demande ne peut plus être annulée depuis l’espace patient",
    );
  }

  // Prefer RPC (security definer) when available after migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (client as any).rpc(
    "cancel_own_mission",
    { p_mission_id: missionId },
  );

  if (!rpcError && rpcData) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (row) return row as Mission;
  }

  // Fallback when migration not yet applied: staff-style update blocked by RLS
  // for patients — use admin only after authz checks above.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("missions")
    .update({
      status: "cancelled",
      is_locked: false,
      assigned_vehicle_id: null,
      assigned_driver_id: null,
    })
    .eq("id", missionId)
    .eq("created_by", session.userId)
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);

  await appendEvent(admin as unknown as Client, {
    missionId,
    companyId: data.company_id,
    actorId: session.userId,
    eventType: "mission_cancelled_by_patient",
    payload: { fallback: true, rpc_error: rpcError?.message ?? null },
  });

  return data;
}
