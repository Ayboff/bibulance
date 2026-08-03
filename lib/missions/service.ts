import type { SupabaseClient } from "@supabase/supabase-js";

import type { SessionContext } from "@/lib/auth/session";
import { canRegulate } from "@/lib/auth/rbac";
import { ApiError } from "@/lib/api/http";
import {
  buildRdvIso,
  normalizeVehicleType,
  type CreatePatientMissionInput,
  type ListMissionsQuery,
  type UpdateMissionInput,
  type UpdatePecInput,
} from "@/lib/missions/schema";
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

function subtractMinutes(isoLocal: string, minutes: number): string {
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) {
    // Fallback parse "YYYY-MM-DDTHH:mm:00"
    const asUtc = new Date(`${isoLocal}+00:00`);
    asUtc.setUTCMinutes(asUtc.getUTCMinutes() - minutes);
    return asUtc.toISOString();
  }
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

export async function listBookableCompanies(client: Client) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc("list_bookable_companies");
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as { id: string; name: string; slug: string }[];
}

export async function createPatientMission(
  client: Client,
  session: SessionContext,
  input: CreatePatientMissionInput,
): Promise<Mission> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: offsetRaw } = await (client as any).rpc(
    "company_pec_offset_minutes",
    { p_company_id: input.company_id },
  );
  const offset =
    typeof offsetRaw === "number" && offsetRaw > 0 ? offsetRaw : 45;

  const rdvLocal = buildRdvIso(input.date, input.time);
  const pecIso = subtractMinutes(rdvLocal, offset);
  const vehicleType = normalizeVehicleType(input.transport_type);

  const insert = {
    company_id: input.company_id,
    source_platform: "bibulance_web" as const,
    source_mission_id: `web-${session.userId.slice(0, 8)}-${Date.now()}`,
    status: "incoming" as const,
    rdv_time: rdvLocal,
    pec_estimated_time: pecIso,
    emitter_address: input.depart_address,
    destination_address: input.arrival_address,
    patient_first_name: input.firstname,
    patient_last_name: input.lastname,
    vehicle_type: vehicleType,
    trip_type: input.trip_type,
    care_type: input.reason ?? null,
    notes: input.comment ?? null,
    specialties: (input.specialties ?? {}) as Json,
    created_by: session.userId,
    external_payload: {
      phone: input.phone ?? null,
      patient_birthdate: input.patient_birthdate ?? null,
      channel: "bibulance_web",
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
    payload: { source: "bibulance_web" },
  });

  return data;
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
    const start = `${query.date}T00:00:00`;
    const end = `${query.date}T23:59:59.999`;
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

  if (input.platform_confirmation === true && !current.platform_confirmation) {
    patch.platform_confirmed_at = now;
    patch.status = (input.status ?? "confirmed") as MissionStatus;
  }

  if (input.assigned_vehicle_id) {
    patch.assigned_at = now;
    patch.is_locked = true;
    patch.status = (input.status ?? "assigned") as MissionStatus;
  }

  if (input.assigned_vehicle_id === null) {
    patch.assigned_at = null;
    patch.is_locked = false;
    if (!input.status) patch.status = "confirmed";
  }

  const { data, error } = await client
    .from("missions")
    .update(patch)
    .eq("id", missionId)
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);

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
