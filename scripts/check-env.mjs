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

const optional = ["SENTRY_DSN"];

let missing = 0;

console.log("Bibulance env check\n");

for (const key of required) {
  const ok = Boolean(process.env[key] && String(process.env[key]).trim());
  console.log(`${ok ? "OK " : "MISSING "} ${key}`);
  if (!ok) missing += 1;
}

for (const key of optional) {
  const ok = Boolean(process.env[key] && String(process.env[key]).trim());
  console.log(`${ok ? "OK " : "—      "} ${key} (optional)`);
}

if (missing > 0) {
  console.error(`\n${missing} required variable(s) missing.`);
  process.exit(1);
}

console.log("\nAll required variables are set.");
