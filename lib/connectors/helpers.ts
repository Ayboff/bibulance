import type { CanonicalMission, MissionConnector } from "@/lib/connectors/types";
import { computeSyncHash } from "@/lib/missions/merge";
import type { MissionStatus, SourcePlatform } from "@/types/database";

export function mapExternalStatus(raw?: string | null): MissionStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (["urgente", "urgent", "emergency"].includes(s)) return "incoming";
  if (["annulee", "annulée", "cancelled", "canceled"].includes(s)) {
    return "cancelled";
  }
  if (["terminee", "terminée", "done", "completed"].includes(s)) return "done";
  if (["affectee", "affectée", "assigned"].includes(s)) return "assigned";
  if (["confirmee", "confirmée", "confirmed"].includes(s)) return "confirmed";
  return "incoming";
}

export function mapVehicleType(
  raw?: string | null,
): "AMB" | "VSL" | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s.includes("AMB") || s.includes("AMBULANCE")) return "AMB";
  if (s.includes("VSL")) return "VSL";
  return null;
}

export function normalizeRdvTime(raw: string): string {
  const trimmed = raw.trim();
  // "YYYY-MM-DD HH:mm" → ISO-like local
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) {
    return trimmed.replace(" ", "T") + (trimmed.length === 16 ? ":00" : "");
  }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return trimmed;
}

export function buildCanonical(args: {
  platform: SourcePlatform;
  source_mission_id: string;
  rdv_time: string;
  status?: string | null;
  emitter_facility?: string | null;
  emitter_address?: string | null;
  destination_facility?: string | null;
  destination_address?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  vehicle_type?: string | null;
  care_type?: string | null;
  floor_info?: string | null;
  notes?: string | null;
  raw: Record<string, unknown>;
}): CanonicalMission {
  const rdv_time = normalizeRdvTime(args.rdv_time);
  const vehicle_type = mapVehicleType(args.vehicle_type);
  const hashParts = {
    source_mission_id: args.source_mission_id,
    rdv_time,
    status: args.status ?? null,
    emitter_facility: args.emitter_facility ?? null,
    emitter_address: args.emitter_address ?? null,
    destination_facility: args.destination_facility ?? null,
    destination_address: args.destination_address ?? null,
    patient_first_name: args.patient_first_name ?? null,
    patient_last_name: args.patient_last_name ?? null,
    vehicle_type,
    care_type: args.care_type ?? null,
  };

  return {
    source_platform: args.platform,
    source_mission_id: args.source_mission_id,
    rdv_time,
    status: args.status ?? undefined,
    emitter_facility: args.emitter_facility ?? null,
    emitter_address: args.emitter_address ?? null,
    destination_facility: args.destination_facility ?? null,
    destination_address: args.destination_address ?? null,
    patient_first_name: args.patient_first_name ?? null,
    patient_last_name: args.patient_last_name ?? null,
    vehicle_type,
    care_type: args.care_type ?? null,
    floor_info: args.floor_info ?? null,
    notes: args.notes ?? null,
    external_payload: args.raw,
    sync_hash: computeSyncHash(hashParts),
  };
}

export function createHttpPullConnector(opts: {
  platform: SourcePlatform;
  displayLabel: string;
}): MissionConnector {
  return {
    platform: opts.platform,
    capabilities: { pull: true, webhook: true },
    async validateCredentials(creds) {
      return typeof creds.api_url === "string" && creds.api_url.length > 0;
    },
    async pullSince(cursor, range) {
      // Credentials injected by SyncEngine via bound pull — default no-op
      void cursor;
      void range;
      return [];
    },
    mapToCanonical(raw) {
      const row = (raw ?? {}) as Record<string, unknown>;
      const id = String(
        row.source_mission_id ?? row.id ?? row.mission_id ?? "",
      );
      if (!id) {
        throw new Error(`${opts.displayLabel}: missing mission id`);
      }
      return buildCanonical({
        platform: opts.platform,
        source_mission_id: id,
        rdv_time: String(row.rdv_time ?? row.appointment_at ?? row.date ?? ""),
        status: row.status ? String(row.status) : null,
        emitter_facility: (row.emitter_facility as string) ?? null,
        emitter_address: (row.emitter_address as string) ?? null,
        destination_facility: (row.destination_facility as string) ?? null,
        destination_address: (row.destination_address as string) ?? null,
        patient_first_name: (row.patient_first_name as string) ?? null,
        patient_last_name: (row.patient_last_name as string) ?? null,
        vehicle_type: (row.vehicle_type as string) ?? null,
        care_type: (row.care_type as string) ?? null,
        floor_info: (row.floor_info as string) ?? null,
        notes: (row.notes as string) ?? null,
        raw: row,
      });
    },
    async handleWebhook(payload) {
      const body = payload as Record<string, unknown> | unknown[];
      const rows = Array.isArray(body)
        ? body
        : Array.isArray((body as { missions?: unknown[] }).missions)
          ? ((body as { missions: unknown[] }).missions)
          : [body];
      return rows.map((row) => this.mapToCanonical(row));
    },
  };
}
