import { NextResponse } from "next/server";

/**
 * Liveness / readiness probe for Vercel & uptime monitors.
 * Does not expose secrets. Optional DB ping: ?db=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantDb = url.searchParams.get("db") === "1";

  const checks: Record<string, "ok" | "missing" | "error"> = {
    app_url: process.env.NEXT_PUBLIC_APP_URL ? "ok" : "missing",
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing",
    supabase_anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing",
    service_role: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
    cron_secret: process.env.CRON_SECRET ? "ok" : "missing",
    connector_key: process.env.CONNECTOR_ENCRYPTION_KEY ? "ok" : "missing",
  };

  if (wantDb) {
    if (checks.service_role !== "ok") {
      checks.database = "missing";
    } else {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const { error } = await admin.from("companies").select("id").limit(1);
        checks.database = error ? "error" : "ok";
      } catch {
        checks.database = "error";
      }
    }
  }

  const ready =
    checks.supabase_url === "ok" &&
    checks.supabase_anon === "ok" &&
    checks.service_role === "ok" &&
    (!wantDb || checks.database === "ok");

  return NextResponse.json(
    {
      ok: ready,
      service: "bibulance",
      time: new Date().toISOString(),
      checks,
    },
    { status: ready ? 200 : 503 },
  );
}
