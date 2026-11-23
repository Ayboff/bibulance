# Bibulance — Plan d’exécution audit & optimisation

Branche : `cursor/audit-optimisation-7b27`  
Principe : **mesurer → corriger → re-mesurer**. Aucune réussite simulée.

## Objectif opérationnel

Transformer Bibulance en plateforme fiable pour patients et régulateurs, avec :
1. Correctifs code **réels** sur les risques critiques
2. Une **matrice ≥ 5 000 scénarios distincts** (combinatoire métier, pas 5 000 clones)
3. Exécution automatisée du maximum de scénarios
4. Rapport d’audit honnête (exécuté / réussi / échoué / bloqué)

## Phases

### PHASE 1 — Cartographie ✅ (ce document + `00-cartographie.md`)
Livrable : carte architecture, flux, écarts visibles.  
**Pas de refonte structurelle avant validation de ce plan.**

### PHASE 2 — Audit ciblé du code (lecture + preuves)
Priorité de revue manuelle + outils :
1. Auth / RBAC / RLS / middleware
2. Cycle de vie mission (`create` / `update` / broadcast / PEC)
3. Wizard patient (validation, draft, double-submit, mobile)
4. Dashboard régulateur (filtres, actions irréversibles, realtime)
5. Connecteurs / webhooks / cron
6. Emails, logs, fuite de données santé
7. Accessibilité & responsive des parcours critiques

Livrable : `docs/audit/02-findings.md` (ID, gravité, preuve).

### PHASE 3 — Matrice 5 000+ scénarios
Générateur déterministe (`scripts/audit/` + éventuellement Vitest) :

| Lot | Catégorie | Cible volume | Nature |
|-----|-----------|--------------|--------|
| A | Patient commande (identité, adresses, créneaux, modes, devices) | ~1 200 | validation + UX rules |
| B | Patient suivi / messages statut | ~400 | mapping statut → copy |
| C | Régulateur (actions, filtres, conflits) | ~1 000 | transitions + RBAC |
| D | Exceptionnel (réseau, dates, concurrence, fuseaux) | ~800 | robustesse |
| E | Sécurité (rôles, IDOR, payload malformé) | ~800 | authz + schema |
| F | Connecteurs / import / webhook | ~400 | sync engine |
| G | Accessibilité / formulaires / edge UI | ~400 | règles a11y + formes |

Chaque scénario a : `id`, catégorie, rôle, données, action, attendu, gravité si fail.

**Distinct ≠ clone** : dimensions croisées (dispatch × booking × trip × transport × specialties × relative × date edge × role × status from/to).

### PHASE 4 — Exécution
- Installer Vitest (léger, aligné Node) si absent
- Exécuter générateur + suites unit/intégration
- Smoke HTTP local si serveur dispo
- Marquer **BLOCKED** si : pas de DB Supabase, pas de credentials, pas de navigateur E2E

### PHASE 5 — Corrections (par gravité)
Ordre strict :
1. **P0** sécurité / corruption données / statut incohérent
2. **P1** perte de saisie patient, double commande, UX bloquante
3. **P2** dashboard régulateur (clics, confirmations, filtres)
4. **P3** polish, copy, a11y non bloquante

**Hors scope sans validation humaine** (documentés, non « fake-fix ») :
- Déclarer conformité HDS / RGPD juridique
- Brancher vrais SMS / éditeurs Ambléa etc.
- Changer secrets prod
- Migrations destructives

### PHASE 6 — Non-régression
- Tests ciblés sur chaque fix P0/P1
- Rejouer la matrice automatisable

### PHASE 7 — Re-audit
- Diff findings avant/après
- Scores honnêtes (non testé ≠ fiable)

### PHASE 8 — Rapport final
Dossier `docs/audit/` :
- Synthèse
- Résultats 5 000 scénarios
- Liste problèmes
- Améliorations faites / restantes
- Évaluation par axe

## Lots de livraison code (PR)

| Lot PR | Contenu | Risque |
|--------|---------|--------|
| A | Infrastructure tests + générateur 5k + premiers findings | Faible |
| B | Machine à états explicite + garde-fous transitions | Moyen |
| C | Robustesse wizard (draft persist, anti double-submit, messages) | Moyen |
| D | Dashboard régulateur (confirmations, priorités, clarté) | Moyen |
| E | Sécurité / validation / messages patient statut | Moyen–Élevé |
| F | Rapport final + canvas éventuel | Faible |

Les lots peuvent être des commits successifs sur **cette** branche / PR, sauf besoin de split.

## Ce qui ne sera **pas** fait
- Prétendre 5 000 E2E navigateur si l’infra ne le permet pas
- Remplacer l’architecture Next/Supabase sans nécessité
- « Notes artificiellement excellentes »
- Actions médicales automatisées / diagnostic

## Première action après validation du plan
1. Ajouter tooling de tests (Vitest)
2. Générateur + exécution lot A/B/C minimum
3. Corriger les P0 trouvés immédiatement
4. Continuer lots jusqu’à rapport

## Critères de « terminé »
- ≥ 5 000 scénarios **définis** avec IDs uniques
- Maximum exécuté localement avec résultats chiffrés
- P0 connus corrigés ou explicitement bloqués avec raison
- Rapport `docs/audit/99-rapport-final.md` publié
- Code poussé + PR à jour
