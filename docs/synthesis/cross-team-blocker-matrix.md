# Cross-Team Blocker Matrix

## 1. Matrix Header

Date: 2026-03-10  
Phases included: Phase 1, Phase 2, Phase 3, Phase 4, Post-Phase-4  
Disciplines covered: BUSINESS, TECH, UX, MARKETING

## 2. Blocker Inventory

| Blocker ID    | Source -> Target      | Description                                                                                          | Classification | Resolution Status | Source                                                       |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ------------------------------------------------------------ |
| BLK-1-501     | BUSINESS -> UX        | Target locale decision unresolved; blocks localization prioritization and downstream TMS/QA planning | BLOCKING       | OPEN              | `docs/phase-3/RISK-ASSESSMENT-PHASE-3.md:79`         |
| BLK-2-501     | TECH -> UX            | TMS procurement delay risk blocks localization setup and CI integration                              | BLOCKING       | OPEN              | `docs/phase-3/RISK-ASSESSMENT-PHASE-3.md:80`         |
| BLOCKER-1-502 | TECH -> MARKETING     | GA4/account readiness dependency for funnel instrumentation and launch experiments                   | BLOCKING       | OPEN              | `docs/phase-4/16-cro-specialist-sprintplan.md:237`   |
| BLOCKER-1-501 | UX -> MARKETING       | Content/copy handoff dependency for CRO landing/onboarding tests                                     | BLOCKING       | OPEN              | `docs/phase-4/16-cro-specialist-sprintplan.md:237`   |
| BLK-2-401     | BUSINESS -> MARKETING | Pricing tier structure confirmation pending for brand architecture and pricing narrative consistency | ADVISORY       | OPEN              | `docs/phase-4/14-brand-strategist-sprintplan.md:279` |
| BLOCKER-2-502 | BUSINESS -> MARKETING | Finance/legal sign-off timing for pricing page and guarantees                                        | BLOCKING       | OPEN              | `docs/phase-4/16-cro-specialist-sprintplan.md:257`   |
| RISK-P4-008   | BUSINESS -> MARKETING | Partner LOI decision speed may slip and delay diversification path                                   | ADVISORY       | OPEN              | `docs/phase-4/critic-risk-validation.md:535`         |
| BLK-1-401     | BUSINESS -> MARKETING | Questionnaire response gaps on values/colors can trigger brand rework                                | ADVISORY       | DEFERRED          | `docs/phase-4/14-brand-strategist-sprintplan.md:271` |

## 3. Summary

### By Classification

| Classification | Count |
| -------------- | ----- |
| BLOCKING       | 5     |
| ADVISORY       | 3     |

### By Status

| Status   | Count |
| -------- | ----- |
| OPEN     | 7     |
| RESOLVED | 0     |
| DEFERRED | 1     |

Handoff status: COMPLETE
