# Suivi audits subagents (2026-11-23)

Sources :
- [Audit sécu auth missions](bc-8a67e36f-4d73-5878-98a0-e92c679b7d09)
- [Audit UX patient régulateur](bc-66b6c049-8032-5b3d-887a-60fce39a259d)

## Corrigé dans ce follow-up

| ID | Action |
|----|--------|
| AUD-SEC-001 (invite → owner) | Migration : invitee ne peut plus UPDATE ; rôle invite ∈ admin/regulator/driver ; accept refuse owner |
| AUD-SEC-005 (secrets connecteurs) | `REVOKE SELECT` credentials/webhook_secret |
| AUD-SEC-006 (CSV RBAC) | 403 si ni admin ni régulateur |
| AUD-SEC-008 (plain credentials prod) | throw si pas de clé en production |
| AUD-SEC-010 (open redirect) | bloque `//…` |
| AUD-SEC-013 (webhook sync_mode) | exige `sync_mode=webhook` |
| AUD-SEC-016 (health recon) | flags secrets seulement avec `?db=1` |
| AUD-UX téléphone self | requis wizard + schema |
| AUD-UX specialties | affichées board régulation |
| AUD-UX accept/assign confirms | partenaires + affectation=accept |
| AUD-UX busyRef pro | anti double action |
| AUD-UX upcoming overdue | non-terminaux restent « À venir » |
| AUD-UX tel: | liens cliquables board |
| AUD-UX filtres statut | in_progress/done/cancelled |
| AUD-UX NIR draft notice | bandeau restauration |

## Déjà traité avant ce follow-up

Webhook unsigned, RLS patient update, transitions, cancel patient UI, refuse confirm, emergency banner, NIR mask/seal.

## Encore ouvert (priorisé)

| ID | Notes |
|----|--------|
| AUD-SEC-007 / 012 | Race accept broadcast + cancel siblings best-effort |
| AUD-OPS notifs | Emails de statut |
| AUD-UX a11y restants | combobox, safe-area, aria tabs |
| AUD-SEC-014/015 | profiles_update columns ; CHECK déjà durci pour invites |

## Action humaine

Appliquer migrations :
- `20261123120000_patient_mission_update_hardening.sql`
- `20261123133000_invite_escalation_and_secrets.sql`
