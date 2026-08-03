import { createHash, timingSafeEqual } from "crypto";

import { decryptCredentials } from "@/lib/connectors/crypto";
import { mapExternalStatus } from "@/lib/connectors/helpers";
import { pullWithCredentials } from "@/lib/connectors/platforms";
import { ensureConnectorsRegistered } from "@/lib/connectors/register-all";
import { getConnector } from "@/lib/connectors/registry";
import type { CanonicalMission } from "@/lib/connectors/types";
import { shouldApplySyncUpdate } from "@/lib/missions/merge";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  Json,
  Mission,
  SourcePlatform,
  SyncRunStatus,
} from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;
type ConnectorRow = Database["public"]["Tables"]["company_connectors"]["Row"];

export type SyncStats = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: number;
};

export type SyncResult = {
  connectorId: string;
  platform: SourcePlatform;
  companyId: string;
  status: SyncRunStatus;
  stats: SyncStats;
  error?: string;
  runId: string;
};

function emptyStats(): SyncStats {
  return {
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    errors: 0,
  };
}

async function appendEvent(
  admin: Admin,
  args: {
    missionId: string;
    companyId: string;
    eventType: string;
    payload?: Json;
  },
) {
  await admin.from("mission_events").insert({
    mission_id: args.missionId,
    company_id: args.companyId,
    actor_id: null,
    event_type: args.eventType,
    payload: args.payload ?? {},
  });
}

function fullPatch(canonical: CanonicalMission) {
  return {
    rdv_time: canonical.rdv_time,
    status: mapExternalStatus(canonical.status),
    emitter_facility: canonical.emitter_facility,
    emitter_address: canonical.emitter_address,
    destination_facility: canonical.destination_facility,
    destination_address: canonical.destination_address,
    patient_first_name: canonical.patient_first_name,
    patient_last_name: canonical.patient_last_name,
    vehicle_type: canonical.vehicle_type,
    care_type: canonical.care_type,
    floor_info: canonical.floor_info,
    notes: canonical.notes,
    external_payload: canonical.external_payload as Json,
    sync_hash: canonical.sync_hash,
  };
}

function partialPatch(canonical: CanonicalMission) {
  // Locked missions: only non-workflow fields
  return {
    emitter_facility: canonical.emitter_facility,
    emitter_address: canonical.emitter_address,
    destination_facility: canonical.destination_facility,
    destination_address: canonical.destination_address,
    care_type: canonical.care_type,
    floor_info: canonical.floor_info,
    notes: canonical.notes,
    external_payload: canonical.external_payload as Json,
    sync_hash: canonical.sync_hash,
  };
}

export async function upsertCanonicalMission(
  admin: Admin,
  companyId: string,
  canonical: CanonicalMission,
  stats: SyncStats,
): Promise<"inserted" | "updated" | "skipped" | "conflict" | "error"> {
  try {
    const { data: existing } = await admin
      .from("missions")
      .select("*")
      .eq("company_id", companyId)
      .eq("source_platform", canonical.source_platform)
      .eq("source_mission_id", canonical.source_mission_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await admin
        .from("missions")
        .insert({
          company_id: companyId,
          source_platform: canonical.source_platform,
          source_mission_id: canonical.source_mission_id,
          ...fullPatch(canonical),
          status: mapExternalStatus(canonical.status),
        })
        .select("id")
        .single();

      if (error) throw error;

      await appendEvent(admin, {
        missionId: created.id,
        companyId,
        eventType: "sync_inserted",
        payload: { platform: canonical.source_platform },
      });
      stats.inserted += 1;
      return "inserted";
    }

    const mode = shouldApplySyncUpdate({
      isLocked: existing.is_locked,
      incomingHash: canonical.sync_hash,
      currentHash: existing.sync_hash,
    });

    if (mode === "noop") {
      stats.skipped += 1;
      return "skipped";
    }

    if (mode === "partial") {
      const { error } = await admin
        .from("missions")
        .update(partialPatch(canonical))
        .eq("id", existing.id);
      if (error) throw error;

      await appendEvent(admin, {
        missionId: existing.id,
        companyId,
        eventType: "sync_conflict",
        payload: {
          reason: "mission_locked",
          platform: canonical.source_platform,
        },
      });
      stats.conflicts += 1;
      stats.updated += 1;
      return "conflict";
    }

    // Do not overwrite local accept/assign workflow when already progressed
    const patch = fullPatch(canonical);
    const updatePayload: Database["public"]["Tables"]["missions"]["Update"] = {
      ...patch,
    };
    if (existing.accepted_bibulance || existing.assigned_vehicle_id) {
      delete updatePayload.status;
    }

    const { error } = await admin
      .from("missions")
      .update(updatePayload)
      .eq("id", existing.id);
    if (error) throw error;

    await appendEvent(admin, {
      missionId: existing.id,
      companyId,
      eventType: "sync_updated",
      payload: { platform: canonical.source_platform },
    });
    stats.updated += 1;
    return "updated";
  } catch (e) {
    console.error("upsertCanonicalMission", e);
    stats.errors += 1;
    return "error";
  }
}

export async function ingestCanonicalMissions(
  companyId: string,
  missions: CanonicalMission[],
): Promise<SyncStats> {
  const admin = createAdminClient();
  const stats = emptyStats();
  stats.fetched = missions.length;

  for (const mission of missions) {
    await upsertCanonicalMission(admin, companyId, mission, stats);
  }

  return stats;
}

async function loadCursors(
  admin: Admin,
  connectorId: string,
): Promise<Record<string, string>> {
  const { data } = await admin
    .from("sync_cursors")
    .select("cursor_key, cursor_value")
    .eq("connector_id", connectorId);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    out[row.cursor_key] = row.cursor_value;
  }
  return out;
}

async function saveCursor(
  admin: Admin,
  connectorId: string,
  key: string,
  value: string,
) {
  await admin.from("sync_cursors").upsert(
    {
      connector_id: connectorId,
      cursor_key: key,
      cursor_value: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connector_id,cursor_key" },
  );
}

export async function syncConnector(
  connector: ConnectorRow,
  options?: { missions?: CanonicalMission[]; rangeDays?: number },
): Promise<SyncResult> {
  ensureConnectorsRegistered();
  const admin = createAdminClient();
  const stats = emptyStats();

  const { data: run, error: runError } = await admin
    .from("sync_runs")
    .insert({
      connector_id: connector.id,
      company_id: connector.company_id,
      status: "running",
    })
    .select("*")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Unable to create sync_run");
  }

  try {
    await admin
      .from("company_connectors")
      .update({ status: "syncing", last_error: null })
      .eq("id", connector.id);

    const adapter = getConnector(connector.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform ${connector.platform}`);
    }

    let missions = options?.missions ?? [];

    if (!options?.missions && adapter.capabilities.pull) {
      const creds = decryptCredentials(connector.credentials_encrypted);
      const days = options?.rangeDays ?? 7;
      const to = new Date();
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const cursor = await loadCursors(admin, connector.id);
      void cursor;
      missions = await pullWithCredentials(adapter, creds, { from, to });
    }

    stats.fetched = missions.length;

    for (const mission of missions) {
      // Force platform from connector config (ignore mismatched payload platform)
      const normalized: CanonicalMission = {
        ...mission,
        source_platform: connector.platform,
      };
      await upsertCanonicalMission(
        admin,
        connector.company_id,
        normalized,
        stats,
      );
    }

    await saveCursor(
      admin,
      connector.id,
      "last_sync_at",
      new Date().toISOString(),
    );

    const status: SyncRunStatus =
      stats.errors > 0
        ? stats.inserted + stats.updated > 0
          ? "partial"
          : "failed"
        : "success";

    await admin
      .from("sync_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        stats: stats as unknown as Json,
        error: stats.errors > 0 ? `${stats.errors} row error(s)` : null,
      })
      .eq("id", run.id);

    await admin
      .from("company_connectors")
      .update({
        status: status === "failed" ? "error" : "idle",
        last_sync_at: new Date().toISOString(),
        last_error: stats.errors > 0 ? `${stats.errors} row error(s)` : null,
      })
      .eq("id", connector.id);

    return {
      connectorId: connector.id,
      platform: connector.platform,
      companyId: connector.company_id,
      status,
      stats,
      runId: run.id,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await admin
      .from("sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        stats: stats as unknown as Json,
        error: message,
      })
      .eq("id", run.id);

    await admin
      .from("company_connectors")
      .update({ status: "error", last_error: message })
      .eq("id", connector.id);

    return {
      connectorId: connector.id,
      platform: connector.platform,
      companyId: connector.company_id,
      status: "failed",
      stats,
      error: message,
      runId: run.id,
    };
  }
}

export async function syncAllEnabledConnectors(): Promise<SyncResult[]> {
  const admin = createAdminClient();
  const { data: connectors, error } = await admin
    .from("company_connectors")
    .select("*")
    .eq("is_enabled", true)
    .in("sync_mode", ["pull", "csv"]);

  if (error) throw new Error(error.message);

  const results: SyncResult[] = [];
  for (const connector of connectors ?? []) {
    // CSV connectors without file pull are skipped by cron (manual import)
    if (connector.platform === "csv" || connector.sync_mode === "csv") {
      continue;
    }
    results.push(await syncConnector(connector));
  }
  return results;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | null | undefined,
): boolean {
  if (!secret) return true; // allow if not configured (dev)
  if (!signatureHeader) return false;

  const expected = createHash("sha256")
    .update(secret + rawBody)
    .digest("hex");

  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type { Mission };
