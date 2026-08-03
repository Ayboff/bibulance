# Bibulance

SaaS multi-tenant pour sociétés d’ambulances — Next.js (App Router) + Supabase + Vercel.

## Surfaces

| Zone | Routes | Public |
|------|--------|--------|
| Marketing | `/` | Accueil |
| Auth | `/login`, `/register`, `/callback` | Phase 1 |
| Pro | `/pro/*` | Dashboard régulateur |
| Patient | `/commander`, `/mes-transports`, `/compte` | App particulier |
| API | `/api/missions`, `/api/cron/sync-all`, webhooks | Server |

## Stack

- Next.js 16 + TypeScript + Tailwind CSS 4
- Supabase Auth, Postgres, RLS, Realtime
- Zod validation, connecteurs logiciels métier (Phase 3)

## Démarrage local

```bash
cp .env.example .env.local
# Remplir les clés Supabase

npm install
npm run dev
```

### Migrations Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Lier le CLI : `npx supabase link --project-ref <ref>`
3. Appliquer : `npm run db:push`

Ou coller les fichiers de `supabase/migrations/` dans le SQL Editor (dans l’ordre).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run db:push` | Appliquer migrations (projet lié) |
| `npm run db:reset` | Reset local Supabase (si `supabase start`) |
| `npm run env:check` | Vérifier les variables `.env.local` |
| `npm run health` | Ping `/api/health?db=1` (serveur démarré) |

## Phases

0. **Fondations** — Next.js, schéma, RLS de base, stubs routes  
1. **Auth** (fait) — login/register, middleware, onboarding société, invites, RLS renforcée  
2. **Missions** (fait) — API CRUD, PEC, Realtime, UI pro/patient minimale  
3. **Connecteurs** (fait) — CSV, SyncEngine, cron, webhooks, stubs plateformes  
4. **Dashboard pro** (fait) — filtres, KPIs, confirmées, parc, polish UX  
5. **App particulier** (fait) — wizard accessible, contrastes élevés, états lisibles  
6. **Production** (fait) — Vercel, env, cron, health, checklist cutover  

### Production (Phase 6)

- Docs : [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) · [`docs/CUTOVER_CHECKLIST.md`](./docs/CUTOVER_CHECKLIST.md)
- `vercel.json` : région `cdg1`, cron `*/5 * * * *` → `/api/cron/sync-all`
- Headers sécurité (HSTS, frame deny, nosniff…)
- `GET /api/health` (+ `?db=1` pour ping DB)
- `npm run env:check` — valide les variables requises

```bash
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # CONNECTOR_ENCRYPTION_KEY
# Coller toutes les vars dans Vercel → Settings → Environment Variables
npx vercel --prod
```

### App particulier (Phase 5) — accessibilité

- Surface dédiée `.patient-app` : texte large, contraste élevé, focus visible 3px
- Boutons / cibles ≥ 48px, inputs ≥ 52px
- Wizard 1 écran = 1 action : société → départ → arrivée → date/heure → patient → véhicule → confirmation
- Statuts en français clair (Demande reçue, Véhicule prévu, En route…)
- `aria-live` sur mises à jour Realtime, labels explicites, skip link
- Nav basse simplifiée : Commander · Mes trajets · Mon compte


### Auth (Phase 1)

- `/login`, `/register` — email + mot de passe (Supabase Auth)
- `/callback` — échange PKCE / magic link
- `/pro/*` — réservé au staff (membership active)
- `/pro/onboarding` — créer une société (`create_company`) ou accepter une invite
- `/pro/invite?token=` — rejoindre une société
- `/commander`, `/mes-transports`, `/compte` — authentification requise
- Middleware : refresh session + redirections
- RPC : `create_company`, `accept_company_invite`, `is_staff_user`, `soft_delete_mission`

### Missions (Phase 2)

- `GET/POST /api/missions` — liste (company|mine) + création particulier
- `GET/PATCH /api/missions/:id` — détail + accept/confirm/assign
- `PATCH /api/missions/:id/pec` — modification PEC régulateur
- `GET /api/companies` — sociétés bookables
- `GET /api/fleet/vehicles` — véhicules société
- Realtime Supabase sur `missions` (pro par `company_id`, patient par `created_by`)
- UI : `/pro/missions`, `/commander`, `/mes-transports`

### Connecteurs (Phase 3)

- SyncEngine : upsert par `(company_id, source_platform, source_mission_id)` + `sync_hash`
- Adapters : CSV, Ambléa, SPS, SCR’urgences, PTAH, Paramedic
- `GET/POST /api/connectors` — config société
- `POST /api/connectors/:id/sync` — sync manuelle
- `POST /api/import/csv` — import fichier
- `POST /api/webhooks/connectors/:platform` — push partenaire (`x-company-id` + signature HMAC)
- `GET|POST /api/cron/sync-all` — cron Vercel (Bearer `CRON_SECRET`)
- UI : `/pro/connectors`
- Exemple CSV : `docs/sample-missions.csv`

Env recommandées : `CRON_SECRET`, `CONNECTOR_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Migration à pousser : `20260803110000_missions_phase2.sql` (si pas déjà fait)

```bash
npm run db:push
```

Dans Supabase → Database → Replication : s’assurer que `missions` est dans la publication `supabase_realtime` (déjà dans la migration init).

Quand Supabase est prêt :

```bash
cp .env.example .env.local
# renseigner URL + anon + service_role
npx supabase link --project-ref <ref>
npm run db:push
```

Dans le dashboard Supabase → Authentication → URL Configuration :
- Site URL : `http://localhost:3000`
- Redirect URLs : `http://localhost:3000/callback`

## Sécurité

- RLS activé sur toutes les tables métier
- `SUPABASE_SERVICE_ROLE_KEY` **uniquement** côté serveur (cron / sync)
- Isolation par `company_id` ; particuliers limités à `created_by = auth.uid()`

## Repo MVP legacy

L’ancien MVP (CRA + Express) reste dans `bibulance-mvp` pour référence pendant la migration.
