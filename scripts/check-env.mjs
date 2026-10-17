#!/usr/bin/env node
/**
 * Validates that required environment variables are present.
 * Usage: node scripts/check-env.mjs
 * Exit 1 if critical vars are missing.
 */

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "CONNECTOR_ENCRYPTION_KEY",
];

const optional = ["SENTRY_DSN", "RESEND_API_KEY", "EMAIL_FROM"];

const placeholders = [
  ["NEXT_PUBLIC_SUPABASE_URL", /YOUR_PROJECT|your_project/i],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", /^your_anon_key$/i],
  ["SUPABASE_SERVICE_ROLE_KEY", /^your_service_role_key$/i],
];

let missing = 0;
let placeholderHits = 0;

console.log("Bibulance env check\n");

for (const key of required) {
  const raw = process.env[key];
  const ok = Boolean(raw && String(raw).trim());
  console.log(`${ok ? "OK " : "MISSING "} ${key}`);
  if (!ok) missing += 1;
}

for (const [key, pattern] of placeholders) {
  const raw = process.env[key];
  if (raw && pattern.test(String(raw).trim())) {
    console.log(`WARN  ${key} looks like a placeholder — replace with prod/staging values`);
    placeholderHits += 1;
  }
}

for (const key of optional) {
  const ok = Boolean(process.env[key] && String(process.env[key]).trim());
  console.log(`${ok ? "OK " : "—      "} ${key} (optional)`);
}

if (missing > 0) {
  console.error(`\n${missing} required variable(s) missing.`);
  process.exit(1);
}

if (placeholderHits > 0) {
  console.error(`\n${placeholderHits} placeholder value(s) detected.`);
  process.exit(1);
}

console.log("\nAll required variables are set.");
