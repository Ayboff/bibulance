import type { SourcePlatform } from "@/types/database";

/** Normalized mission shape produced by every connector. */
export type CanonicalMission = {
  source_platform: SourcePlatform;
  source_mission_id: string;
  rdv_time: string;
  status?: string;
  emitter_facility?: string | null;
  emitter_address?: string | null;
  destination_facility?: string | null;
  destination_address?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  vehicle_type?: "AMB" | "VSL" | null;
  care_type?: string | null;
  floor_info?: string | null;
  notes?: string | null;
  external_payload: Record<string, unknown>;
  sync_hash: string;
};

export type ConnectorCapabilities = {
  pull?: boolean;
  webhook?: boolean;
  pushStatus?: boolean;
};

export type PullCursor = Record<string, string>;

export interface MissionConnector {
  platform: SourcePlatform;
  capabilities: ConnectorCapabilities;
  validateCredentials(creds: Record<string, unknown>): Promise<boolean>;
  pullSince?(
    cursor: PullCursor,
    range: { from: Date; to: Date },
  ): Promise<CanonicalMission[]>;
  mapToCanonical(raw: unknown): CanonicalMission;
  handleWebhook?(
    payload: unknown,
    headers: Headers,
  ): Promise<CanonicalMission[]>;
  acknowledge?(externalId: string, status: string): Promise<void>;
}
