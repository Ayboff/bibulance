import { syncAllEnabledConnectors } from "@/lib/connectors/sync-engine";
import { ensureConnectorsRegistered } from "@/lib/connectors/register-all";
import { jsonError, jsonOk, ApiError } from "@/lib/api/http";

function authorize(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new ApiError(500, "CRON_SECRET non configuré");
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    throw new ApiError(401, "Unauthorized");
  }
}

async function runSync() {
  ensureConnectorsRegistered();
  const results = await syncAllEnabledConnectors();
  return {
    ok: true,
    synced: results.length,
    results: results.map((r) => ({
      connectorId: r.connectorId,
      platform: r.platform,
      status: r.status,
      stats: r.stats,
      error: r.error,
    })),
  };
}

/** Vercel Cron uses GET by default. */
export async function GET(request: Request) {
  try {
    authorize(request);
    return jsonOk(await runSync());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    authorize(request);
    return jsonOk(await runSync());
  } catch (error) {
    return jsonError(error);
  }
}
