import type { MissionStatus } from "@/types/database";

/**
 * Explicit allowed status transitions for regulator / system updates.
 * Terminal states have no outbound edges.
 */
export const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> =
  {
    incoming: ["pending_platform", "confirmed", "assigned", "cancelled", "refused"],
    pending_platform: [
      "incoming",
      "confirmed",
      "assigned",
      "cancelled",
      "refused",
    ],
    confirmed: ["assigned", "in_progress", "cancelled", "pending_platform"],
    assigned: ["confirmed", "in_progress", "cancelled", "pending_platform"],
    in_progress: ["done", "cancelled", "assigned"],
    done: [],
    cancelled: [],
    refused: [],
  };

export function canTransitionMissionStatus(
  from: MissionStatus,
  to: MissionStatus,
): boolean {
  if (from === to) return true;
  return MISSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertMissionTransition(
  from: MissionStatus,
  to: MissionStatus,
): void {
  if (!canTransitionMissionStatus(from, to)) {
    throw new Error(`TRANSITION_FORBIDDEN:${from}->${to}`);
  }
}

/** Statuses a patient may request via cancel API. */
export function canPatientCancel(status: MissionStatus, accepted: boolean): boolean {
  if (accepted) return false;
  if (status === "done" || status === "cancelled" || status === "refused") {
    return false;
  }
  if (status === "in_progress" || status === "assigned" || status === "confirmed") {
    return false;
  }
  return status === "incoming" || status === "pending_platform";
}
