# Bibulance — Findings Phase 2

Date : 2026-11-23 (Europe/Paris)  
Base : `cursor/audit-optimisation-7b27`

Légende gravité : **P0** critique · **P1** majeur · **P2** important · **P3** mineur

## Synthèse

| Gravité | Détectés | Corrigés (cette itération) | Restants |
|---------|----------|----------------------------|----------|
| P0 | 3 | **3** | 0 |
| P1 | 8 | **6** | 2 (notifs + concurrence) |
| P2 | 6 | 1 (confirm refus) | 5 |
| P3 | 4 | — | 4 |

Scénarios générés : **12 544** (voir `scenarios-summary.json`).  
Exécutés automatiquement (transitions / statut / webhook / schema) : voir `npm test`.

---

## P0 — Critiques

### AUD-SEC-001 — RLS : patient peut modifier presque toute une mission
- **Écran / couche** : Postgres RLS `missions_update_owner_limited`
- **Cause** : `USING` exige `created_by = auth.uid()` et `accepted_bibulance = false`, mais `WITH CHECK` ne contraint pas les colonnes. Un client Supabase navigateur (clé anon) peut passer `status=done`, s’auto-accepter, etc.
- **Conséquence** : falsification de statut / données opérationnelles
- **Correction** : ✅ `20261123120000_patient_mission_update_hardening.sql` (drop policy + RPC `cancel_own_mission`) + `POST /api/missions/[id]/cancel`

### AUD-SEC-002 — Webhook connecteur accepté sans signature si secret absent
- **Fichier** : `lib/connectors/sync-engine.ts` `verifyWebhookSignature` → `if (!secret) return true`
- **Conséquence** : quiconque connaît `x-company-id` + plateforme peut injecter des missions
- **Correction** : ✅ rejet par défaut ; opt-in `ALLOW_INSECURE_WEBHOOKS=1` uniquement

### AUD-SEC-003 — Transitions de statut non validées
- **Fichier** : `lib/missions/service.ts` `updateMission` — `input.status` appliqué sans table de transitions
- **Conséquence** : `incoming → done`, réouverture depuis terminal, états incohérents
- **Correction** : ✅ `lib/missions/transitions.ts` + assert dans `updateMission`

---

## P1 — Majeurs

### AUD-SEC-004 — NIR en clair dans `external_payload` + UI pro
- Affiché en clair sur boards pro ; table `patients.nir_encrypted` non utilisée pour le flux web
- **Correction** : ✅ `sealNir` à l’écriture + `displayNirSafe` (masquage) ; validation NIR lettres renforcée

### AUD-UX-001 — Double soumission wizard possible
- `submit()` ne garde pas `if (busy) return` avant `setBusy(true)`
- **Correction** : ✅ `busyRef` synchrone

### AUD-UX-002 — Pas de bandeau urgence médicale (15 / SAMU)
- Commander = transport programmé sans orientation urgence vitale
- **Correction** : ✅ `EmergencyBanner` dans layout patient

### AUD-UX-003 — Patient ne peut pas annuler depuis l’UI
- Pas d’action cancel côté `/mes-transports`
- **Correction** : ✅ bouton + API cancel

### AUD-UX-004 — Brouillon wizard perdu au refresh
- State React uniquement, pas de `sessionStorage`
- **Correction** : ✅ persistance session (NIR exclu)

### AUD-SEC-006 — Téléphone lettres accepté (`abcdef`)
- **Correction** : ✅ refine ≥ 6 chiffres

### AUD-OPS-001 — Pas de notifications de changement de statut
- Seul email welcome ; patient/régulateur non alertés sur accept/refus/confirm
- Reste ouvert (Resend templates) — décision produit

### AUD-SEC-005 — Concurrence : deux régulateurs / accept broadcast
- `cancelBroadcastSiblings` best-effort ; pas de verrou optimiste versionné
- Reste ouvert (migration `updated_at` check) — P1 infra

---

## P2

| ID | Description |
|----|-------------|
| AUD-UX-010 | Refus / accept sans `confirm()` dialog |
| AUD-UX-011 | Filtres board sans `in_progress` / `done` / `cancelled` dans STATUS_OPTIONS |
| AUD-UX-012 | Messages patient peu différenciés `pending_platform` vs recherche partenaires (partiellement OK) |
| AUD-UX-013 | Accessibilité : selects natifs, contrastes à re-vérifier |
| AUD-OPS-010 | Connecteurs éditeurs génériques (pas de mapping réel Ambléa) |
| AUD-OPS-011 | Pas de tests automatisés avant Phase 3 |

---

## P3

| ID | Description |
|----|-------------|
| AUD-SEC-020 | `jsonError` log console serveur (OK) mais messages génériques |
| AUD-UX-020 | Landing marketing vs parcours réel — itération future |
| AUD-OPS-020 | HDS / DPA — hors code, validation humaine |
| AUD-OPS-021 | SMS — non implémenté |

---

## Hors scope (validation humaine)

- Certification HDS / contrat sous-traitance
- Intégrations API payantes éditeurs
- Envoi SMS production
- Migrations destructives massives
