# Localization Specialist Sprint Plan — CREATE Mode

> **Agent:** 35-localization-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 3 of 4 (Sprint Plan)  
> **Based on recommendations:**
> `docs/phase-3/35-localization-specialist-recommendations.md`  
> **Date:** 2026-03-10

---

## Metadata

- Agent: Localization Specialist (35)
- Phase: 3
- Based on recommendations: `35-localization-specialist-recommendations.md`
- Date: 2026-03-10
- Total scope: 3 sprints
- Mode: CREATE

---

## Sprint Plan Assumptions

- Team composition:
  - Team i18n Core: Senior Developer + Implementation pipeline, capacity:
    `INSUFFICIENT_DATA`
  - Team Localization Ops: Localization Specialist + content operations,
    capacity: `INSUFFICIENT_DATA`
  - Team QA Localization: Test Agent workflow + reviewer, capacity:
    `INSUFFICIENT_DATA`
  - Team Product Governance: Product Manager + Sales Strategist for market
    decisions, capacity: `INSUFFICIENT_DATA`
- Sprint duration: 2 weeks
- Technology stack: React/TypeScript, resource bundles, locale-aware formatting
  APIs, CI automation
- Prerequisites:
  - Content Strategist handoff package available
  - UI token and component naming baseline available

`INSUFFICIENT_DATA:` exact delivery capacity by team is not documented.

---

## Sprint 1 — Locale and Architecture Baseline Decisions

### Goal

Lock market locale priorities and foundational i18n architecture rules to
unblock implementation.

### Stories

| Story ID | Description                                                                                                                                       | Type     | Team                    | Acceptance Criteria                                                                                                                                                 | Story Points      | Dependencies | Blocker                               | Risk                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------------------------------------- | ---------------------- | ------------------------ | ------------- |
| SP-1-501 | As a product organization, we need an approved locale tier matrix so that localization sequencing is aligned with market strategy. (REC-L10N-001) | ANALYSIS | Team Product Governance | Given strategy inputs, when reviewed, then Tier 1/2/3 locales are approved with owners; Given unresolved locale, when present, then explicit defer decision exists. | INSUFFICIENT_DATA | None         | EXTERN: final market decision pending | owner: Product Manager | escalation: Orchestrator | RISK-L10N-001 |
| SP-1-502 | As an engineering team, we need i18n key and namespace standards so that translations remain stable and maintainable. (REC-L10N-002)              | CODE     | Team i18n Core          | Given standard doc, when implemented, then naming convention and namespace ownership are enforced; Given CI run, when key policy fails, then build fails.           | INSUFFICIENT_DATA | None         | NONE                                  | RISK-L10N-002          |
| SP-1-503 | As a cross-functional team, we need an explicit RTL scope decision so that layout strategy is predictable. (REC-L10N-004)                         | DESIGN   | Team Product Governance | Given locale matrix, when evaluated, then RTL scope is marked required/deferred; Given deferred scope, when documented, then compatibility constraints are listed.  | INSUFFICIENT_DATA | SP-1-501     | NONE                                  | RISK-L10N-004          |

### Parallel Tracks

| Track   | Type     | Stories  | Team(s)                 | Start condition   |
| ------- | -------- | -------- | ----------------------- | ----------------- |
| Track 1 | ANALYSIS | SP-1-501 | Team Product Governance | Sprint start      |
| Track 2 | CODE     | SP-1-502 | Team i18n Core          | Sprint start      |
| Track 3 | DESIGN   | SP-1-503 | Team Product Governance | SP-1-501 complete |

### Blocker Register (Sprint 1)

| Blocker ID | Type   | Description                          | Owner           | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | ------------------------------------ | --------------- | ------------------- | ----------------------------- |
| BLK-1-501  | EXTERN | Final market locale decision pending | Product Manager | Sprint 1 week 1     | Orchestrator                  |

### Sprint KPIs

| KPI                      | Baseline          | Target after sprint                            | Measurement method                 |
| ------------------------ | ----------------- | ---------------------------------------------- | ---------------------------------- |
| Locale matrix approval   | not approved      | approved with tier ownership                   | governance artifact review         |
| i18n key-policy adoption | INSUFFICIENT_DATA | key convention documented and CI policy active | CI policy audit                    |
| RTL decision status      | undecided         | decision documented                            | architecture decision record check |

### Definition of Done (Sprint 1)

- [ ] All stories complete
- [ ] Locale matrix approved or explicitly deferred with rationale
- [ ] i18n key standard published and enforceable
- [ ] RTL decision documented
- [ ] EXTERN blocker resolved/escalated

---

## Sprint 2 — Workflow Tooling and Integration

### Goal

Operationalize translation workflow tooling and integrate localization into
delivery pipeline.

### Stories

| Story ID | Description                                                                                                                                             | Type    | Team                  | Acceptance Criteria                                                                                                                                             | Story Points      | Dependencies | Blocker                              | Risk                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------------------------------------ | ------------------------- | ------------------------ | ------------- |
| SP-2-501 | As localization operations, we need a selected TMS and owner model so that translation throughput is predictable. (REC-L10N-003)                        | CONTENT | Team Localization Ops | Given shortlist, when selected, then owner and SLA model are documented; Given pilot run, when complete, then key workflow steps execute successfully.          | INSUFFICIENT_DATA | SP-1-501     | EXTERN: procurement approval pending | owner: Project Governance | escalation: Orchestrator | RISK-L10N-003 |
| SP-2-502 | As engineering, we need translation sync and validation in CI so that missing keys and fallback failures are caught early. (REC-L10N-002, REC-L10N-003) | INFRA   | Team i18n Core        | Given localization PR, when CI runs, then missing-key, fallback, and key-pattern checks execute; Given failure, when detected, then merge is blocked.           | INSUFFICIENT_DATA | SP-1-502     | NONE                                 | RISK-L10N-002             |
| SP-2-503 | As localization reviewers, we need context metadata for ambiguous keys so that translations preserve intent. (REC-L10N-002)                             | CONTENT | Team Localization Ops | Given translatable keys, when exported, then context notes exist for ambiguous or constrained strings; Given missing context, when found, then issue is logged. | INSUFFICIENT_DATA | SP-1-502     | NONE                                 | RISK-L10N-002             |

### Parallel Tracks

| Track   | Type    | Stories            | Team(s)               | Start condition                             |
| ------- | ------- | ------------------ | --------------------- | ------------------------------------------- |
| Track 1 | CONTENT | SP-2-501, SP-2-503 | Team Localization Ops | Sprint start (SP-2-503 depends on SP-1-502) |
| Track 2 | INFRA   | SP-2-502           | Team i18n Core        | SP-1-502 complete                           |

### Blocker Register (Sprint 2)

| Blocker ID | Type   | Description                      | Owner              | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | -------------------------------- | ------------------ | ------------------- | ----------------------------- |
| BLK-2-501  | EXTERN | TMS procurement approval pending | Project Governance | Sprint 2 week 1     | Orchestrator                  |

### Sprint KPIs

| KPI                           | Baseline          | Target after sprint                     | Measurement method  |
| ----------------------------- | ----------------- | --------------------------------------- | ------------------- |
| TMS readiness                 | 0%                | selected tool + owner + pilot completed | readiness checklist |
| Localization CI gate coverage | 0%                | 100% target checks enabled              | CI workflow audit   |
| Context metadata completeness | INSUFFICIENT_DATA | >= 90% ambiguous keys with context      | export audit        |

### Definition of Done (Sprint 2)

- [ ] All stories complete
- [ ] TMS selected and ownership model documented
- [ ] CI localization checks active
- [ ] Key-context protocol active
- [ ] EXTERN blocker resolved/escalated

---

## Sprint 3 — QA Evidence and Release Readiness

### Goal

Establish repeatable localization QA evidence and release gate criteria.

### Stories

| Story ID | Description                                                                                                                                         | Type     | Team                    | Acceptance Criteria                                                                                                                                                       | Story Points      | Dependencies       | Blocker | Risk          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------ | ------- | ------------- |
| SP-3-501 | As release QA, we need a localization evidence checklist so that each locale release is verifiable. (REC-L10N-005)                                  | ANALYSIS | Team QA Localization    | Given checklist, when applied, then required artifacts (fit, terminology, formatting, fallback) are present; Given missing artifact, when found, then release gate fails. | INSUFFICIENT_DATA | SP-2-501, SP-2-502 | NONE    | RISK-L10N-005 |
| SP-3-502 | As localization operations, we need per-tier pass/fail thresholds so that quality expectations are explicit by market priority. (REC-L10N-005)      | CONTENT  | Team Localization Ops   | Given tier definitions, when applied, then pass thresholds are documented per tier; Given release candidate, when evaluated, then pass/fail decision is traceable.        | INSUFFICIENT_DATA | SP-1-501, SP-3-501 | NONE    | RISK-L10N-005 |
| SP-3-503 | As program leadership, we need localization readiness reporting so that market expansion decisions are evidence-based. (REC-L10N-001, REC-L10N-005) | ANALYSIS | Team Product Governance | Given evidence inputs, when consolidated, then readiness status per tier is published (READY/PARTIAL/BLOCKING).                                                           | INSUFFICIENT_DATA | SP-3-501, SP-3-502 | NONE    | RISK-L10N-001 |

### Parallel Tracks

| Track   | Type     | Stories            | Team(s)                                   | Start condition              |
| ------- | -------- | ------------------ | ----------------------------------------- | ---------------------------- |
| Track 1 | ANALYSIS | SP-3-501, SP-3-503 | Team QA Localization / Product Governance | SP-3-503 depends on SP-3-501 |
| Track 2 | CONTENT  | SP-3-502           | Team Localization Ops                     | SP-3-501 complete            |

### Blocker Register (Sprint 3)

| Blocker ID | Type   | Description                                  | Owner                | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | -------------------------------------------- | -------------------- | ------------------- | ----------------------------- |
| BLK-3-501  | INTERN | Missing evidence artifacts from prior sprint | QA Localization Lead | Sprint 3 week 1     | Orchestrator                  |

### Sprint KPIs

| KPI                                | Baseline | Target after sprint                           | Measurement method      |
| ---------------------------------- | -------- | --------------------------------------------- | ----------------------- |
| Localization evidence completeness | 0%       | 100% required artifacts per release candidate | release checklist audit |
| Tier-based quality gate coverage   | 0%       | 100% tier thresholds documented and used      | governance review       |
| Market readiness reporting cadence | ad hoc   | 1 formal report per sprint                    | reporting artifacts     |

### Definition of Done (Sprint 3)

- [ ] All stories complete
- [ ] Localization QA evidence checklist active
- [ ] Tier quality thresholds documented and operational
- [ ] Readiness report published
- [ ] No unresolved critical localization finding

---

## Dependency Overview

| Story    | Depends on         | Type           | Blocking? |
| -------- | ------------------ | -------------- | --------- |
| SP-1-503 | SP-1-501           | Internal story | Yes       |
| SP-2-501 | SP-1-501           | Internal story | Yes       |
| SP-2-502 | SP-1-502           | Internal story | Yes       |
| SP-2-503 | SP-1-502           | Internal story | Yes       |
| SP-3-501 | SP-2-501, SP-2-502 | Internal story | Yes       |
| SP-3-502 | SP-1-501, SP-3-501 | Internal story | Yes       |
| SP-3-503 | SP-3-501, SP-3-502 | Internal story | Yes       |

---

## Parallel Tracks Overview

| Sprint   | Track   | Stories            | Teams                                     |
| -------- | ------- | ------------------ | ----------------------------------------- |
| Sprint 1 | Track 1 | SP-1-501           | Team Product Governance                   |
| Sprint 1 | Track 2 | SP-1-502           | Team i18n Core                            |
| Sprint 1 | Track 3 | SP-1-503           | Team Product Governance                   |
| Sprint 2 | Track 1 | SP-2-501, SP-2-503 | Team Localization Ops                     |
| Sprint 2 | Track 2 | SP-2-502           | Team i18n Core                            |
| Sprint 3 | Track 1 | SP-3-501, SP-3-503 | Team QA Localization / Product Governance |
| Sprint 3 | Track 2 | SP-3-502           | Team Localization Ops                     |

---

## Sprint Plan Risk Log

| Risk                               | Probability | Impact | Mitigation                                       | Sprint |
| ---------------------------------- | ----------- | ------ | ------------------------------------------------ | ------ |
| RISK-L10N-001 Locale ambiguity     | High        | High   | Locale decision gate and readiness reporting     | 1-3    |
| RISK-L10N-002 Key instability      | Medium      | High   | Key standard + CI checks                         | 1-2    |
| RISK-L10N-003 Workflow bottlenecks | Medium      | High   | TMS selection + owner model                      | 2      |
| RISK-L10N-004 RTL retrofit cost    | Medium      | Medium | Early RTL decision and compatibility constraints | 1      |
| RISK-L10N-005 QA inconsistency     | Medium      | Medium | Evidence checklist + quality thresholds          | 3      |

---

## Consolidated Blocker Register

| Blocker ID | Sprint | Type   | Description                                  | Owner                | Escalation if not resolved by |
| ---------- | ------ | ------ | -------------------------------------------- | -------------------- | ----------------------------- |
| BLK-1-501  | 1      | EXTERN | Final market locale decision pending         | Product Manager      | Orchestrator                  |
| BLK-2-501  | 2      | EXTERN | TMS procurement approval pending             | Project Governance   | Orchestrator                  |
| BLK-3-501  | 3      | INTERN | Missing evidence artifacts from prior sprint | QA Localization Lead | Orchestrator                  |

---

## Traceability: P1/P2 Recommendation Coverage

| Recommendation | Priority | Story coverage               |
| -------------- | -------- | ---------------------------- |
| REC-L10N-001   | P1       | SP-1-501, SP-3-503           |
| REC-L10N-002   | P1       | SP-1-502, SP-2-502, SP-2-503 |
| REC-L10N-003   | P1       | SP-2-501, SP-2-502           |
| REC-L10N-004   | P2       | SP-1-503                     |
| REC-L10N-005   | P2       | SP-3-501, SP-3-502, SP-3-503 |

No `MISSING_STORY` items.

---

## HANDOFF CHECKLIST

- [x] Assumptions documented without fictional capacity
- [x] Every story includes team/type/acceptance/dependency/blocker
- [x] EXTERN blockers include owner and escalation route
- [x] Parallel tracks identified
- [x] KPIs measurable or marked `INSUFFICIENT_DATA`
- [x] Dependency map and consolidated blockers complete
- [x] Definition of done present per sprint
- [x] P1/P2 recommendations mapped to stories
- [x] Ready for guardrails handoff

**Status:** READY
