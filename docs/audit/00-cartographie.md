# Bibulance — Cartographie (Phase 1)

Date : 2026-11-23 (Europe/Paris)  
Base auditée : `origin/main` @ `96b9e10`  
Branche de travail : `cursor/audit-optimisation-7b27`

## 1. Stack

| Couche | Choix |
|--------|--------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4, composants `components/ui/*` |
| Auth / DB | Supabase Auth + Postgres + RLS |
| Validation | Zod (`lib/missions/schema.ts`) |
| Email | Resend (welcome only) |
| Géo | BAN (`api-adresse.data.gouv.fr`) via `/api/geo/address-suggest` |
| Hébergement cible | Vercel + domaine `bibulance.fr` |
| Tests automatisés | **Aucun** (pas de Vitest/Jest/Playwright dans `package.json`) |

## 2. Surfaces produit

### Marketing
- `app/page.tsx` → `components/marketing/home-landing.tsx`
- Motions patient / dashboard pro
- SEO : `app/sitemap.ts`, `app/robots.ts`, JSON-LD, Search Console

### Auth
- `/login`, `/register`, `/callback`
- Rôles : `owner | admin | regulator | driver | patient`
- Onboarding société `/pro/onboarding`, invite `/pro/invite`
- Middleware session : `lib/supabase/middleware.ts`

### Patient
- `/commander` — wizard multi-étapes (~1340 lignes)
- `/commander/succes`
- `/mes-transports` — suivi + libellés métier (`lib/patient/status.ts`)
- `/compte`
- Adresses BAN autocomplete

### Pro (régulation)
- `/pro/missions` — board principal (~750 lignes)
- `/pro/confirmed` — missions confirmées
- `/pro/fleet` — véhicules / chauffeurs
- `/pro/connectors` — Ambléa, SPS, SCR’urgences, PTAH, Paramedic, CSV
- `/pro/settings`

### API
- Missions CRUD + PEC
- Fleet, companies, profile
- Connectors + webhooks + cron sync
- Health, CSV import, geo suggest

## 3. Domaine métier — missions

### Statuts réels (enum DB)
`incoming → pending_platform → confirmed → assigned → in_progress → done`  
Terminaux : `cancelled`, `refused`

Ce n’est **pas** la machine à 15 états idéalisée du brief ; flags complémentaires :
- `accepted_bibulance`
- `platform_confirmation`
- `is_locked` / véhicule / chauffeur
- `dispatch_mode` (`specific` | `partners`) + `broadcast_id`
- `booking_mode` (`once` | `iterative`)

### Flux patient
1. Auth → wizard (mode, société/partenaires, adresses, créneaux, identité, type transport, spécialités)
2. `POST /api/missions` → `createPatientMission`
3. Broadcast partenaires : 1 mission / société, annulation siblings à l’acceptation
4. Suivi via `/mes-transports` + realtime

### Flux régulateur
1. Board jour + filtres statut / source / recherche
2. Accept / refuse / confirme plateforme / assigne véhicule / PEC
3. Events `mission_events`
4. Sync connecteurs (pull/webhook/CSV) → `sync-engine`

## 4. Données & sécurité (état actuel)

- RLS multi-tenant société + patient owner
- NIR : champ `nir_encrypted` (à vérifier : chiffrement réel vs simple stockage)
- Secrets connecteurs : chiffrement app (`CONNECTOR_ENCRYPTION_KEY`)
- Pas de SMS ; emails = welcome uniquement (pas de notifs de statut)
- Pas de framework de tests ; smoke script prod manuel
- HDS / conformité santé : non démontrée dans le code (à traiter hors seules PR techniques)

## 5. Écarts majeurs déjà visibles (pré-audit)

| Zone | Observation |
|------|-------------|
| Tests | 0 fichier `*.test.*` / `*.spec.*` |
| Notifications cycle de vie | Absentes (statut → patient/pro) |
| Machine à états | Transitions implicites dans `updateMission`, pas de table de transitions explicite |
| Concurrence | Pas de verrou optimiste versionné sur update mission |
| Idempotence booking | Risque double-submit wizard non audité formellement |
| Brouillon patient | Draft en state React ; persistance refresh à vérifier |
| Connecteurs | Adaptateurs génériques ; APIs éditeurs non branchées en prod |
| Accessibilité | Non couverte par tests ; wizard dense |
| Urgence médicale | À vérifier (orientation 15/SAMU vs commande classique) |

## 6. Volume code (ordre de grandeur)

~140 fichiers applicatifs sur `main` ; cœurs critiques :
- `components/patient/booking-wizard.tsx`
- `components/missions/pro-missions-board.tsx`
- `lib/missions/service.ts` + `schema.ts`
- `lib/connectors/sync-engine.ts`
- Migrations `supabase/migrations/*`
