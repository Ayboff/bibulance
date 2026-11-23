# Phase 2 — Corrections appliquées

## Code

| Finding | Fichiers |
|---------|----------|
| AUD-SEC-001 | `supabase/migrations/20261123120000_patient_mission_update_hardening.sql`, `app/api/missions/[id]/cancel/route.ts`, `lib/missions/service.ts` |
| AUD-SEC-002 | `lib/connectors/sync-engine.ts`, `.env.example`, `docs/DEPLOYMENT.md` |
| AUD-SEC-003 | `lib/missions/transitions.ts`, `lib/missions/service.ts` |
| AUD-SEC-004 / 006 | `lib/privacy/nir.ts`, `lib/privacy/nir-display.ts`, `lib/missions/schema.ts`, `lib/missions/booking-meta.ts` |
| AUD-UX-001 / 004 | `components/patient/booking-wizard.tsx` |
| AUD-UX-002 | `components/patient/emergency-banner.tsx`, `app/(patient)/layout.tsx` |
| AUD-UX-003 | `components/patient/patient-trips-list.tsx` |
| AUD-UX-010 | `components/missions/pro-missions-board.tsx` (confirm refus) |

## Tests

- Vitest + `npm test`
- Générateur `scripts/audit/generate-scenarios.mjs` → **12 544** scénarios distincts
- Suites : transitions, NIR, webhook, matrice exécutable

## Action humaine requise

1. Appliquer la migration Supabase `20261123120000_patient_mission_update_hardening.sql` (`supabase db push` ou équivalent).
2. Vérifier `CONNECTOR_ENCRYPTION_KEY` en prod (NIR + credentials).
3. Ne **jamais** définir `ALLOW_INSECURE_WEBHOOKS` en production.
