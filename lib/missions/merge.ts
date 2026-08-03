import { createHash } from "crypto";

import type { CanonicalMission } from "@/lib/connectors/types";

/** Stable hash for change detection during sync upserts. */
export function computeSyncHash(parts: Record<string, unknown>): string {
  const payload = JSON.stringify(parts, Object.keys(parts).sort());
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Merge rules for connector upserts (Phase 3 will call this from SyncEngine).
 * Locked missions only accept non-conflicting field updates.
 */
export function shouldApplySyncUpdate(args: {
  isLocked: boolean;
  incomingHash: string;
  currentHash: string | null;
}): "noop" | "full" | "partial" {
  if (args.currentHash && args.currentHash === args.incomingHash) {
    return "noop";
  }
  if (args.isLocked) {
    return "partial";
  }
  return "full";
}

export function softDuplicateHint(
  a: Pick<CanonicalMission, "patient_last_name" | "rdv_time" | "emitter_address">,
  b: Pick<CanonicalMission, "patient_last_name" | "rdv_time" | "emitter_address">,
): boolean {
  if (!a.patient_last_name || !b.patient_last_name) return false;
  if (a.patient_last_name.toLowerCase() !== b.patient_last_name.toLowerCase()) {
    return false;
  }
  const ta = Date.parse(a.rdv_time);
  const tb = Date.parse(b.rdv_time);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  const deltaMin = Math.abs(ta - tb) / 60_000;
  return deltaMin <= 15;
}
