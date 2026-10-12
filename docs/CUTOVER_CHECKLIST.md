# Checklist cutover — Bibulance production

Cocher dans l’ordre. Ne passer en DNS prod qu’après la section **Go-live**.

## A. Préparation (J-2 / J-1)

- [ ] Projet Supabase **prod** créé (séparé du staging)
- [ ] Migrations poussées : `npm run db:push` sur le ref prod
- [ ] Seed démo **désactivé / non rejoué** en prod (ou société démo acceptée)
- [ ] Variables Vercel Production renseignées (voir `.env.example`)
- [ ] `node --env-file=.env.local scripts/check-env.mjs` OK en local avec valeurs prod de test
- [ ] Auth Supabase : Site URL + Redirect URLs = domaine prod
- [ ] Realtime : table `missions` publiée
- [ ] `CRON_SECRET` + `CONNECTOR_ENCRYPTION_KEY` générés (`openssl rand -hex 32`)
- [ ] Plan Vercel compatible avec la fréquence cron souhaitée
- [ ] Domaine acheté / DNS accessible
- [ ] Backup / export éventuel de l’ancien MVP (Render) si données à migrer

## B. Déploiement shadow (sans DNS public)

- [x] Projet Vercel lié au repo, branche `main`
- [x] Premier deploy Production réussi (URL `*.vercel.app`)
- [x] `GET https://bibulance.vercel.app/api/health` → 200
- [x] `GET https://bibulance.vercel.app/api/health?db=1` → `database: ok` (fixé 2026-08-12 via migration `service_role_grants`, confirmé 2026-10-12)
- [x] Créer 1 compte **société** + `create_company` sur onboarding (2026-10-12 — `Ambulances Cutover Test` / `cutover.societe.bibulance@example.com`)
- [x] Créer 1 compte **particulier** + mission test (`cutover.patient.bibulance@example.com` → mission 13/10)
- [x] Vérifier mission visible dashboard pro + PEC (acceptée + PEC 16:30 enregistrée)
- [x] Import CSV OK (3 missions AMB-1001/1002/1003)
- [x] Cron manuel avec Bearer secret OK (2026-10-12 — `synced=0`, auth Bearer OK)
- [x] Headers sécurité présents (`X-Frame-Options: DENY`, HSTS)

### Smoke tests automatisés (dernière vérif : 2026-10-12)

```bash
node scripts/smoke-production.mjs https://bibulance.vercel.app
# Cron (local, avec secret Vercel) :
CRON_SECRET=... node scripts/smoke-production.mjs https://bibulance.vercel.app
```

| Test | Résultat |
|------|----------|
| Health liveness | PASS |
| Health DB (`?db=1`) | **PASS** |
| Pages `/`, `/login`, `/register` | PASS (à reconfirmer après push) |
| Redirections auth (`/commander`, `/pro/missions`) | PASS |
| API missions sans session | PASS (401) |
| Cron sans Bearer | PASS (401) |

### Correctif appliqué (`database: error` → OK)

Cause : `service_role` n’avait plus les GRANT sur les tables après Phase 1.  
Fix : migration `20260812160000_service_role_grants.sql` poussée sur le projet `rdbvwattegnsyzfdrkfa`.

## C. Migration données (si reprise MVP)

- [ ] Script ETL missions → schéma Bibulance (company_id assigné)
- [ ] Vérifier unicité `(company_id, source_platform, source_mission_id)`
- [ ] Compter rows source vs cible
- [ ] Spot-check 5 missions métier + 5 particuliers
- [ ] Freeze écritures ancien backend (maintenance)

## D. Go-live DNS

- [ ] Ajouter domaine dans Vercel Domains
- [ ] Configurer CNAME / A chez le registrar
- [ ] SSL Vercel **Active**
- [ ] Mettre à jour `NEXT_PUBLIC_APP_URL` = URL canonique https
- [ ] Redeploy après changement d’URL (pour emails / redirects Auth)
- [ ] Mettre à jour Redirect URLs Supabase Auth
- [ ] Couper / rediriger l’ancien hébergement (Render CRA + API)

## E. Post go-live (J0 + 48h)

- [ ] Smoke tests section 6 de `DEPLOYMENT.md` sur le **vrai** domaine
- [ ] Inviter les premiers régulateurs (`/pro/settings`)
- [ ] Configurer au moins un connecteur (CSV ou API) pour 1 société pilote
- [ ] Surveiller `sync_runs` / erreurs Vercel Logs
- [ ] Surveiller auth failures Supabase
- [ ] Documenter contacts on-call / rollback

## Rollback rapide

1. Vercel → Deployments → Promote previous production deployment  
2. Ou DNS : remettre l’ancien CNAME  
3. Supabase : ne pas “down” les migrations déjà appliquées sans plan ; rollback app d’abord  

## Contacts / URLs à noter

| Item | Valeur |
|------|--------|
| App prod (shadow) | `https://bibulance.vercel.app` |
| Supabase project ref | *(à compléter)* |
| Vercel project | `bibulance` |
| Cron path | `/api/cron/sync-all` |
| Health | `/api/health` |
| Webhook pattern | `/api/webhooks/connectors/:platform` |
