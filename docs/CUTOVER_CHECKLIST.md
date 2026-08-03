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

- [ ] Projet Vercel lié au repo, branche `main`
- [ ] Premier deploy Production réussi (URL `*.vercel.app`)
- [ ] `GET https://<preview>/api/health` → 200
- [ ] `GET https://<preview>/api/health?db=1` → `database: ok`
- [ ] Créer 1 compte **société** + `create_company` sur onboarding
- [ ] Créer 1 compte **particulier** + mission test
- [ ] Vérifier mission visible dashboard pro + Realtime PEC
- [ ] Import CSV `docs/sample-missions.csv` OK
- [ ] Cron manuel avec Bearer secret OK
- [ ] Headers sécurité présents (`X-Frame-Options: DENY`, HSTS)

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
| App prod | `https://` |
| Supabase project ref | |
| Vercel project | |
| Cron path | `/api/cron/sync-all` |
| Health | `/api/health` |
| Webhook pattern | `/api/webhooks/connectors/:platform` |
