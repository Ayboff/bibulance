import { getMissionBookingMeta } from "@/lib/missions/booking-meta";
import type { Mission } from "@/types/database";

/**
 * Partner dispatch creates one mission per company for the same logical trip
 * (shared broadcast_id). Patients must see a single card per trip.
 */
function patientMissionRank(m: Mission): number {
  if (m.status === "cancelled" || m.status === "refused") return 0;
  if (
    m.status === "done" ||
    m.status === "in_progress" ||
    m.status === "assigned" ||
    m.status === "confirmed"
  ) {
    return 4;
  }
  if (m.accepted_bibulance || m.status === "pending_platform") return 3;
  if (m.status === "incoming") return 2;
  return 1;
}

function pickBestInGroup(group: Mission[]): Mission {
  return [...group].sort((a, b) => {
    const rank = patientMissionRank(b) - patientMissionRank(a);
    if (rank !== 0) return rank;
    return a.rdv_time.localeCompare(b.rdv_time) || a.id.localeCompare(b.id);
  })[0]!;
}

/** Collapse partner-broadcast duplicates into one visible trip for the patient. */
export function dedupePatientVisibleMissions(missions: Mission[]): Mission[] {
  const byBroadcast = new Map<string, Mission[]>();
  const singles: Mission[] = [];

  for (const m of missions) {
    const broadcastId = getMissionBookingMeta(m).broadcast_id;
    if (!broadcastId) {
      singles.push(m);
      continue;
    }
    const list = byBroadcast.get(broadcastId) ?? [];
    list.push(m);
    byBroadcast.set(broadcastId, list);
  }

  const collapsed = Array.from(byBroadcast.values()).map(pickBestInGroup);
  return [...singles, ...collapsed];
}
