import { parse } from "csv-parse/sync";

import {
  buildCanonical,
  mapVehicleType,
} from "@/lib/connectors/helpers";
import type { CanonicalMission, MissionConnector } from "@/lib/connectors/types";
import type { SourcePlatform } from "@/types/database";

export type CsvColumnMapping = {
  source_mission_id: string;
  rdv_time: string;
  status?: string;
  emitter_facility?: string;
  emitter_address?: string;
  destination_facility?: string;
  destination_address?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  vehicle_type?: string;
  care_type?: string;
  floor_info?: string;
  notes?: string;
};

export const DEFAULT_CSV_MAPPING: CsvColumnMapping = {
  source_mission_id: "source_mission_id",
  rdv_time: "rdv_time",
  status: "status",
  emitter_facility: "emitter_facility",
  emitter_address: "emitter_address",
  destination_facility: "destination_facility",
  destination_address: "destination_address",
  patient_first_name: "patient_first_name",
  patient_last_name: "patient_last_name",
  vehicle_type: "vehicle_type",
  care_type: "care_type",
  floor_info: "floor_info",
  notes: "notes",
};

function cell(
  row: Record<string, string>,
  key: string | undefined,
): string | null {
  if (!key) return null;
  const value = row[key];
  if (value === undefined || value === "") return null;
  return value.trim();
}

export function parseCsvMissions(
  csvText: string,
  mapping: CsvColumnMapping = DEFAULT_CSV_MAPPING,
  platform: SourcePlatform = "csv",
): CanonicalMission[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    // Allow docs/sample-missions.csv header comments (# …)
    comment: "#",
  }) as Record<string, string>[];

  const missions: CanonicalMission[] = [];

  for (const row of records) {
    const sourceId = cell(row, mapping.source_mission_id);
    const rdv = cell(row, mapping.rdv_time);
    if (!sourceId || !rdv) continue;

    missions.push(
      buildCanonical({
        platform,
        source_mission_id: sourceId,
        rdv_time: rdv,
        status: cell(row, mapping.status),
        emitter_facility: cell(row, mapping.emitter_facility),
        emitter_address: cell(row, mapping.emitter_address),
        destination_facility: cell(row, mapping.destination_facility),
        destination_address: cell(row, mapping.destination_address),
        patient_first_name: cell(row, mapping.patient_first_name),
        patient_last_name: cell(row, mapping.patient_last_name),
        vehicle_type: cell(row, mapping.vehicle_type),
        care_type: cell(row, mapping.care_type),
        floor_info: cell(row, mapping.floor_info),
        notes: cell(row, mapping.notes),
        raw: row,
      }),
    );
  }

  return missions;
}

export const csvConnector: MissionConnector = {
  platform: "csv",
  capabilities: { pull: false, webhook: false },
  async validateCredentials() {
    return true;
  },
  mapToCanonical(raw) {
    const row = raw as Record<string, string>;
    return buildCanonical({
      platform: "csv",
      source_mission_id: String(row.source_mission_id ?? row.id ?? ""),
      rdv_time: String(row.rdv_time ?? ""),
      status: row.status,
      emitter_facility: row.emitter_facility,
      emitter_address: row.emitter_address,
      destination_facility: row.destination_facility,
      destination_address: row.destination_address,
      patient_first_name: row.patient_first_name,
      patient_last_name: row.patient_last_name,
      vehicle_type: mapVehicleType(row.vehicle_type) ?? row.vehicle_type,
      care_type: row.care_type,
      floor_info: row.floor_info,
      notes: row.notes,
      raw: row,
    });
  },
};
