import {
  buildCanonical,
  createHttpPullConnector,
} from "@/lib/connectors/helpers";
import type { CanonicalMission, MissionConnector } from "@/lib/connectors/types";

async function pullFromApi(
  creds: Record<string, unknown>,
  range: { from: Date; to: Date },
): Promise<unknown[]> {
  const apiUrl = String(creds.api_url ?? "");
  if (!apiUrl) return [];

  const url = new URL(apiUrl);
  url.searchParams.set("from", range.from.toISOString());
  url.searchParams.set("to", range.to.toISOString());

  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (typeof creds.api_key === "string" && creds.api_key) {
    headers.Authorization = `Bearer ${creds.api_key}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as
    | unknown[]
    | { missions?: unknown[]; data?: unknown[] };

  if (Array.isArray(json)) return json;
  if (Array.isArray(json.missions)) return json.missions;
  if (Array.isArray(json.data)) return json.data;
  return [];
}

function withPull(base: MissionConnector): MissionConnector {
  return {
    ...base,
    async pullSince(_cursor, range) {
      // SyncEngine binds credentials via pullWithCredentials
      void _cursor;
      void range;
      return [];
    },
  };
}

export async function pullWithCredentials(
  connector: MissionConnector,
  creds: Record<string, unknown>,
  range: { from: Date; to: Date },
): Promise<CanonicalMission[]> {
  if (!connector.capabilities.pull) return [];
  const rows = await pullFromApi(creds, range);
  return rows.map((row) => connector.mapToCanonical(row));
}

export const ambleaConnector = withPull(
  createHttpPullConnector({ platform: "amblea", displayLabel: "Ambléa" }),
);

export const spsConnector = withPull(
  createHttpPullConnector({ platform: "sps", displayLabel: "SPS" }),
);

export const scrUrgencesConnector: MissionConnector = {
  ...createHttpPullConnector({
    platform: "scr_urgences",
    displayLabel: "SCR'urgences",
  }),
  capabilities: { pull: true, webhook: true },
};

export const ptahConnector = withPull(
  createHttpPullConnector({ platform: "ptah", displayLabel: "PTAH" }),
);

export const paramedicConnector = withPull(
  createHttpPullConnector({
    platform: "paramedic",
    displayLabel: "Paramedic",
  }),
);

/** Sample mapper used by docs / tests for Ambléa-shaped payloads. */
export function mapAmbleaSample(row: Record<string, unknown>): CanonicalMission {
  return buildCanonical({
    platform: "amblea",
    source_mission_id: String(row.id ?? row.missionId ?? ""),
    rdv_time: String(row.rdv ?? row.rdv_time ?? ""),
    status: row.status ? String(row.status) : null,
    emitter_facility: (row.from ?? row.emitter_facility) as string | null,
    destination_facility: (row.to ?? row.destination_facility) as string | null,
    patient_first_name: (row.prenom ?? row.patient_first_name) as string | null,
    patient_last_name: (row.nom ?? row.patient_last_name) as string | null,
    vehicle_type: (row.type ?? row.vehicle_type) as string | null,
    raw: row,
  });
}
