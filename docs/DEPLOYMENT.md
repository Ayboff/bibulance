# Déploiement Bibulance — Vercel + Supabase

Guide de mise en production (Phase 6).

## Prérequis

- Compte [Vercel](https://vercel.com) (Pro recommandé pour cron `*/5`)
- Projet Supabase **production** (séparé du staging si possible)
- Domaine (ex. `app.bibulance.fr`)
- CLI : `npm i -g vercel` (optionnel) + `npx supabase`

> **Cron Vercel** : sur le plan Hobby, la fréquence minimale est souvent **1×/jour**.
> Le schedule `*/5 * * * *` nécessite en pratique un plan **Pro**.
> Alternative Hobby : `"0 * * * *"` (horaire) ou sync manuelle depuis `/pro/connectors`.

## 1. Variables d’environnement

Générer les secrets :

```bash
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # CONNECTOR_ENCRYPTION_KEY
```

Dans **Vercel → Project → Settings → Environment Variables**, pour Production (et Preview si besoin) :

| Variable | Scope | Notes |
|----------|--------|------|
| `NEXT_PUBLIC_APP_URL` | All | `https://app.bibulance.fr` (sans slash final) |
| `NEXT_PUBLIC_SUPABASE_URL` | All | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | clé `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **jamais** `NEXT_PUBLIC_` |
| `CRON_SECRET` | Server only | Vercel l’injecte sur les Cron Jobs |
| `CONNECTOR_ENCRYPTION_KEY` | Server only | chiffrement credentials connecteurs |

Vérification locale (avec `.env.local` chargé) :

```bash
node --env-file=.env.local scripts/check-env.mjs
curl -s http://localhost:3000/api/health?db=1 | jq
```

## 2. Supabase production

1. Créer / utiliser le projet prod
2. Appliquer les migrations :

```bash
npx supabase link --project-ref <PROD_REF>
npm run db:push
```

3. **Authentication → URL Configuration**
   - Site URL : `https://app.bibulance.fr`
   - Redirect URLs :
     - `https://app.bibulance.fr/callback`
     - `https://app.bibulance.fr/**` (si besoin previews)
     - `http://localhost:3000/callback` (dev)

4. **Authentication → Providers** : Email activé (confirm email selon votre choix)

5. **Database → Replication** : table `missions` dans `supabase_realtime`

6. (Recommandé) Activer **PITR / backups** sur le plan adapté

## 3. Déployer sur Vercel

### Première fois (GitHub)

1. Push le repo sur GitHub
2. Vercel → **Add New Project** → importer le repo
3. Framework : Next.js (auto)
4. Root directory : `.`
5. Coller les env vars
6. Deploy

### CLI

```bash
npx vercel          # preview
npx vercel --prod   # production
```

### Domaines

Vercel → Project → **Domains** :

| Domaine | Usage |
|---------|--------|
| `app.bibulance.fr` | App unique (pro + patient) |
| `www.bibulance.fr` | Redirect → `app` ou landing |

DNS chez votre registrar :

- `CNAME app` → `cname.vercel-dns.com` (ou selon UI Vercel)
- Attendre le certificat SSL (Let’s Encrypt auto)

Une seule app Next.js sert `/pro/*` et l’espace particulier — pas besoin de deux projets.

## 4. Cron connecteurs

`vercel.json` contient :

```json
{
  "crons": [{ "path": "/api/cron/sync-all", "schedule": "*/5 * * * *" }]
}
```

Vercel appelle :

`GET /api/cron/sync-all`  
Header : `Authorization: Bearer <CRON_SECRET>`

Test manuel :

```bash
curl -X GET "https://app.bibulance.fr/api/cron/sync-all" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Webhooks partenaires

URL par plateforme :

```
POST https://app.bibulance.fr/api/webhooks/connectors/{platform}
```

Headers :

- `x-company-id: <uuid société>`
- `x-bibulance-signature: <sha256 hex of secret+rawBody>` (si secret configuré)
- `Content-Type: application/json`

Configurer le secret dans `/pro/connectors`.

## 6. Smoke tests post-deploy

1. `GET /api/health` → `ok: true`
2. `GET /api/health?db=1` → `database: ok`
3. Inscription particulier → `/commander` wizard
4. Compte société → `/pro/onboarding` → missions
5. Import CSV exemple (`docs/sample-missions.csv`)
6. Modifier PEC → visible sur `/mes-transports` (Realtime)
7. Cron sync (si connecteur pull configuré)

## 7. Observabilité (recommandé)

- Vercel → Logs / Analytics
- UptimeRobot / Better Stack sur `/api/health`
- (Optionnel) Sentry via `SENTRY_DSN`

Voir aussi [CUTOVER_CHECKLIST.md](./CUTOVER_CHECKLIST.md).
