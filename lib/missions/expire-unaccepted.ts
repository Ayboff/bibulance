import { isUnacceptedPastDeadline } from "@/lib/patient/status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Mission } from "@/types/database";

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Annule les demandes non acceptées dont le RDV est passé.
 * Retourne la liste mise à jour (même ordre / mêmes ids).
 */
export async function expireUnacceptedPastMissions(
  missions: Mission[],
  nowMs = Date.now(),
): Promise<Mission[]> {
  const stale = missions.filter((m) => isUnacceptedPastDeadline(m, nowMs));
  if (stale.length === 0) return missions;

  const admin = createAdminClient();
  const updatedById = new Map<string, Mission>();

  for (const mission of stale) {
    const payload = {
      ...asRecord(mission.external_payload),
      expired_unaccepted: true,
      cancel_reason: "expired_unaccepted",
    } as Json;

    const { data, error } = await admin
      .from("missions")
      .update({
        status: "cancelled",
        is_locked: false,
        assigned_vehicle_id: null,
        assigned_driver_id: null,
        external_payload: payload,
      })
      .eq("id", mission.id)
      .in("status", ["incoming", "pending_platform"])
      .eq("accepted_bibulance", false)
      .select("*")
      .maybeSingle();

    if (error || !data) continue;

    await admin.from("mission_events").insert({
      mission_id: data.id,
      company_id: data.company_id,
      actor_id: null,
      event_type: "mission_expired_unaccepted",
      payload: { reason: "rdv_passed_without_accept" },
    });

    updatedById.set(data.id, data);
  }

  if (updatedById.size === 0) return missions;

  return missions.map((m) => updatedById.get(m.id) ?? m);
}
