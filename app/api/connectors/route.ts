import { z } from "zod";

import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { canAdminCompany } from "@/lib/auth/rbac";
import { requireStaffSession } from "@/lib/auth/session";
import { encryptCredentials } from "@/lib/connectors/crypto";
import { ensureConnectorsRegistered } from "@/lib/connectors/register-all";
import { listConnectors } from "@/lib/connectors/registry";
import { createClient } from "@/lib/supabase/server";
import type { ConnectorSyncMode, SourcePlatform } from "@/types/database";

const upsertSchema = z.object({
  platform: z.enum([
    "amblea",
    "sps",
    "scr_urgences",
    "ptah",
    "paramedic",
    "csv",
    "other",
  ]),
  display_name: z.string().optional(),
  sync_mode: z.enum(["pull", "webhook", "csv", "manual"]).default("pull"),
  is_enabled: z.boolean().optional(),
  api_url: z.string().url().optional().or(z.literal("")),
  api_key: z.string().optional(),
  webhook_secret: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    ensureConnectorsRegistered();
    const session = await requireStaffSession();
    if (!canAdminCompany(session.activeRole)) {
      // regulators can view status but not secrets
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_connectors")
      .select(
        "id, platform, display_name, sync_mode, is_enabled, last_sync_at, last_error, status, config, created_at, updated_at",
      )
      .eq("company_id", session.activeCompanyId!)
      .order("platform");

    if (error) throw new ApiError(500, error.message);

    const adapters = listConnectors().map((c) => ({
      platform: c.platform,
      capabilities: c.capabilities,
    }));

    return jsonOk({ ok: true, connectors: data ?? [], adapters });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession();
    if (!canAdminCompany(session.activeRole)) {
      throw new ApiError(403, "Réservé owner/admin");
    }

    const body = await request.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Payload invalide");
    }

    const creds: Record<string, unknown> = {};
    if (parsed.data.api_url) creds.api_url = parsed.data.api_url;
    if (parsed.data.api_key) creds.api_key = parsed.data.api_key;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_connectors")
      .upsert(
        {
          company_id: session.activeCompanyId!,
          platform: parsed.data.platform as SourcePlatform,
          display_name:
            parsed.data.display_name ?? parsed.data.platform.toUpperCase(),
          sync_mode: parsed.data.sync_mode as ConnectorSyncMode,
          is_enabled: parsed.data.is_enabled ?? true,
          credentials_encrypted:
            Object.keys(creds).length > 0 ? encryptCredentials(creds) : null,
          webhook_secret: parsed.data.webhook_secret ?? null,
          config: (parsed.data.config ?? {}) as never,
          status: "idle",
        },
        { onConflict: "company_id,platform" },
      )
      .select(
        "id, platform, display_name, sync_mode, is_enabled, last_sync_at, last_error, status, config",
      )
      .single();

    if (error) throw new ApiError(400, error.message);
    return jsonOk({ ok: true, connector: data }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
