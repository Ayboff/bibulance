# Rapport final d’audit — Bibulance

**Date** : 2026-11-23 (Europe/Paris)  
**Branche** : `cursor/audit-optimisation-7b27`  
**PR** : https://github.com/Ayboff/bibulance/pull/4  
**Base initiale** : `origin/main` @ `96b9e10`

---

## A. Synthèse générale

### État initial
Plateforme Next.js 16 / Supabase de mise en relation patients ↔ sociétés d’ambulances. Wizard patient riche, board régulateur, connecteurs génériques, email welcome. **Aucun test automatisé**. Plusieurs failles sécu (RLS patient, webhooks unsigned, escalade invite) et trous UX (pas d’annulation, pas de bandeau urgence, NIR en clair).

### Compteurs

| Métrique | Valeur |
|----------|--------|
| Problèmes détectés (P0–P3 documentés) | **≈ 45** |
| Problèmes corrigés dans le code | **≈ 28** |
| Restant (dont hors scope humain) | **≈ 17** |
| Gravité max restante ouverte | P1 (race broadcast partielle, notifs statut) |

### Sévérité corrigée
- **P0** : 4/4 traités (RLS patient, webhook unsigned, transitions, invite→owner)
- **P1** : majorité traités (NIR, CSV RBAC, redirect, téléphone, UX régulation, claim accept)
- **P2/P3** : partiels (a11y, HDS, SMS, emails statut)

---

## B. Résultats des scénarios (≥ 5 000)

| | |
|--|--|
| Scénarios conçus | **12 544** (IDs uniques) |
| Générateur | `npm run audit:scenarios` |
| Exécutés automatiquement | transitions + status_copy + webhook + schema booking (**>~6 000** assertions via boucle Vitest) |
| Documentés non exécutés runtime | ~4 480 (`executable: documented` — a11y visuelle, exceptions infra) |
| Réussis (suite Vitest) | **13/13** fichiers de tests verts (dernière run Phase 6) |
| Échoués | **0** (après alignement schéma / expectations) |
| Bloqués | E2E navigateur réel, DB Supabase live, charge — **non exécutés** (infra) |

### Par catégorie (générés)

| Catégorie | Volume |
|-----------|--------|
| A patient booking | 1 400 |
| B patient follow-up | 640 |
| C régulateur | 2 880 |
| D exceptionnel | 3 840 |
| E sécurité | 1 920 |
| F connecteurs | 840 |
| G a11y | 1 024 |

---

## C. Problèmes (extrait — voir `02-findings.md` + `04-followup-subagents.md`)

| ID | Gravité | Statut | Correction |
|----|---------|--------|------------|
| AUD-SEC-001 invite owner | P0 | ✅ | migration invites |
| AUD-SEC-002 webhook unsigned | P0 | ✅ | fail-closed signature |
| AUD-SEC-003 RLS patient update | P0 | ✅ | drop policy + cancel RPC |
| AUD-SEC-003b transitions | P0 | ✅ | `transitions.ts` |
| AUD-SEC-004 NIR plaintext | P1 | ✅ partiel | seal + mask UI |
| AUD-SEC-006 CSV RBAC | P1 | ✅ | 403 |
| AUD-SEC-007 broadcast race | P1 | ✅ partiel | claim `accepted=false` + 409 |
| AUD-SEC-010 open redirect | P1 | ✅ | `safeNextPath` |
| AUD-UX urgence / cancel / draft | P1 | ✅ | banner, API, sessionStorage |
| AUD-OPS notifs statut | P1 | ❌ ouvert | décision produit Resend |
| HDS / juridique | — | ❌ hors code | validation humaine |

---

## D. Améliorations réalisées (fichiers clés)

- `lib/missions/transitions.ts`, `service.ts` (transitions, claim accept, vehicle company check)
- `lib/privacy/nir*.ts`, `lib/auth/safe-next.ts`
- `supabase/migrations/20261123120000_*`, `20261123133000_*`
- `components/patient/*` (banner, cancel, draft, nav safe-area, autocomplete empty)
- `components/missions/pro-missions-board.tsx`
- Vitest + `scripts/audit/generate-scenarios.mjs`

---

## E. Améliorations restantes

| Besoin | Type |
|--------|------|
| Appliquer migrations Supabase en prod | intervention humaine |
| Emails/SMS de changement de statut | produit + Resend |
| Cancel siblings broadcast transactionnel / retry | technique |
| Connecteurs Ambléa/PTAH réels | partenariat éditeurs |
| Conformité HDS / DPA | juridique |
| E2E Playwright mobile + a11y axe | infra tests |
| Rate-limit BAN geo | technique |

---

## F. Évaluation finale (honnête, /10)

| Axe | Note | Commentaire |
|-----|------|-------------|
| Expérience patient | **7** | Beaucoup mieux (urgence, cancel, draft, tel) ; notifs absentes |
| Expérience régulateur | **7** | Confirms, spécialités, filtres ; pas de sheet mobile dédié |
| Fiabilité | **6.5** | Transitions + claim accept ; race siblings encore best-effort |
| Sécurité | **7** | P0 traités ; secrets connecteurs restreints ; HDS non prouvé |
| Accessibilité | **6** | Skip link, combobox amélioré ; pas d’audit axe automatisé |
| Performance | **N/C** | Non mesurée sous charge |
| Robustesse | **6.5** | Validation Zod renforcée ; pas de chaos/E2E réseau |
| Qualité code | **7** | Tests ajoutés ; wizard encore très long |
| Couverture tests | **5.5** | 12k scénarios définis, exécution logique forte, E2E 0 |

**Verdict** : Bibulance est **nettement plus sûr et plus utilisable** qu’avant l’audit, mais **pas encore « extrêmement fiable »** pour un usage santé sans migrations appliquées, notifs de cycle de vie, et validation HDS externe.

---

## Commandes de vérification

```bash
npm run audit:scenarios
npm test
npx tsc --noEmit
```
