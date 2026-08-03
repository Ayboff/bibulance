import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { ensureConnectorsRegistered } from "@/lib/connectors/register-all";
import { getConnector } from "@/lib/connectors/registry";
import {
  syncConnector,
  verifyWebhookSignature,
} from "@/lib/connectors/sync-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SourcePlatform } from "@/types/database";

type Params = { params: Promise<{ platform: string }> };

const PLATFORMS = new Set([
  "amblea",
  "sps",
  "scr_urgences",
  "ptah",
  "paramedic",
  "csv",
  "other",
]);

export async function POST(request: Request, { params }: Params) {
  try {
    ensureConnectorsRegistered();
    const { platform: platformRaw } = await params;
    if (!PLATFORMS.has(platformRaw)) {
      throw new ApiError(404, "Plateforme inconnue");
    }
    const platform = platformRaw as SourcePlatform;

    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      throw new ApiError(400, "Header x-company-id requis");
    }

    const rawBody = await request.text();
    const admin = createAdminClient();

    const { data: connector } = await admin
      .from("company_connectors")
      .select("*")
      .eq("company_id", companyId)
      .eq("platform", platform)
      .eq("is_enabled", true)
      .maybeSingle();

    if (!connector) {
      throw new ApiError(404, "Connecteur non configuré pour cette société");
    }

    const signature =
      request.headers.get("x-bibulance-signature") ??
      request.headers.get("x-signature");

    if (
      !verifyWebhookSignature(rawBody, signature, connector.webhook_secret)
    ) {
      throw new ApiError(401, "Signature webhook invalide");
    }

    const adapter = getConnector(platform);
    if (!adapter?.handleWebhook) {
      throw new ApiError(501, "Webhook non supporté pour cette plateforme");
    }

    let payload: unknown = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      throw new ApiError(400, "JSON invalide");
    }

    const missions = await adapter.handleWebhook(payload, request.headers);
    const result = await syncConnector(connector, { missions });
    return jsonOk({ ok: true, result });
  } catch (error) {
    return jsonError(error);
  }
}
