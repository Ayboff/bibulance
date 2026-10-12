#!/usr/bin/env node
/**
 * Smoke tests against a deployed Bibulance instance (read-only + optional cron).
 *
 * Usage:
 *   node scripts/smoke-production.mjs https://bibulance.vercel.app
 *   CRON_SECRET=... node scripts/smoke-production.mjs https://bibulance.vercel.app
 */

const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

if (!base) {
  console.error("Usage: node scripts/smoke-production.mjs <APP_URL>");
  process.exit(1);
}

const cronSecret = process.env.CRON_SECRET;

function pass(label, detail = "") {
  console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
}

function skip(label, detail = "") {
  console.log(`SKIP  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function fetchStatus(path, init) {
  const res = await fetch(`${base}${path}`, { redirect: "manual", ...init });
  return res;
}

async function main() {
  console.log(`Bibulance smoke tests → ${base}\n`);

  // Health (liveness)
  try {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    if (res.status === 200 && body.ok) {
      pass("GET /api/health", "ok: true");
    } else {
      fail("GET /api/health", JSON.stringify(body));
    }
  } catch (e) {
    fail("GET /api/health", e.message);
  }

  // Health (DB readiness)
  try {
    const res = await fetch(`${base}/api/health?db=1`);
    const body = await res.json();
    if (res.status === 200 && body.checks?.database === "ok") {
      pass("GET /api/health?db=1", "database: ok");
    } else {
      const hint = body.database_hint ? ` (${body.database_hint})` : "";
      fail("GET /api/health?db=1", `database: ${body.checks?.database ?? "?"}${hint}`);
    }
  } catch (e) {
    fail("GET /api/health?db=1", e.message);
  }

  // Security headers
  try {
    const res = await fetch(base);
    const hsts = res.headers.get("strict-transport-security");
    const xfo = res.headers.get("x-frame-options");
    if (hsts && xfo === "DENY") {
      pass("Security headers", "HSTS + X-Frame-Options: DENY");
    } else {
      fail("Security headers", `HSTS=${!!hsts} XFO=${xfo}`);
    }
  } catch (e) {
    fail("Security headers", e.message);
  }

  // Public pages
  for (const path of ["/", "/login", "/register"]) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.status === 200) pass(`GET ${path}`);
      else fail(`GET ${path}`, `status ${res.status}`);
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // Auth gates (expect redirect to login)
  for (const path of ["/commander", "/pro/missions", "/mes-transports"]) {
    try {
      const res = await fetchStatus(path);
      const loc = res.headers.get("location") ?? "";
      if ([301, 302, 307, 308].includes(res.status) && loc.includes("/login")) {
        pass(`GET ${path}`, `redirect → login`);
      } else {
        fail(`GET ${path}`, `status ${res.status} location=${loc}`);
      }
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // API auth (expect 401)
  for (const [path, init] of [
    ["/api/missions", { method: "GET" }],
    ["/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
  ]) {
    try {
      const res = await fetch(`${base}${path}`, init);
      if (res.status === 401) pass(`${init.method ?? "GET"} ${path}`, "401 Unauthorized");
      else fail(`${init.method ?? "GET"} ${path}`, `status ${res.status}`);
    } catch (e) {
      fail(`${init.method ?? "GET"} ${path}`, e.message);
    }
  }

  // Cron without secret → 401
  try {
    const res = await fetch(`${base}/api/cron/sync-all`);
    if (res.status === 401) pass("GET /api/cron/sync-all (no auth)", "401 Unauthorized");
    else fail("GET /api/cron/sync-all (no auth)", `status ${res.status}`);
  } catch (e) {
    fail("GET /api/cron/sync-all (no auth)", e.message);
  }

  // Cron with secret (optional)
  if (cronSecret) {
    try {
      const res = await fetch(`${base}/api/cron/sync-all`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body.ok) {
        pass("GET /api/cron/sync-all (Bearer)", `synced=${body.synced ?? 0}`);
      } else {
        fail("GET /api/cron/sync-all (Bearer)", `status ${res.status} ${JSON.stringify(body)}`);
      }
    } catch (e) {
      fail("GET /api/cron/sync-all (Bearer)", e.message);
    }
  } else {
    skip("GET /api/cron/sync-all (Bearer)", "set CRON_SECRET to test");
  }

  console.log("\nManual tests (auth session required):");
  console.log("  - Register société → /pro/onboarding → create_company");
  console.log("  - Register particulier → /commander wizard → mission");
  console.log("  - PATCH PEC on /pro/missions → visible /mes-transports");
  console.log("  - Import docs/sample-missions.csv on /pro/connectors");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
