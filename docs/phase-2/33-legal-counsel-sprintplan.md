# Sprint Plan – Legal / Privacy Counsel – 2026-03-10

## Metadata

- Agent: Legal / Privacy Counsel (33)
- Phase: 2
- Based on recommendations:
  `docs/phase-2/33-legal-counsel-recommendations.md`
- Date: 2026-03-10
- Total scope: 3 sprints
- Mode: CREATE

## Assumptions

- Team composition:
  - Team Legal Governance - Legal Counsel + Product Manager liaison + Data
    Architect liaison - 3 people - capacity: INSUFFICIENT_DATA
  - Team Platform Compliance - Senior Developer + DevOps Engineer - 2 people -
    capacity: INSUFFICIENT_DATA
- Sprint duration: 2 weeks
- Technology stack: Markdown policy artifacts, GitHub Actions policy checks,
  Node.js project metadata
- Prerequisites:
  - Confirmed legal owner for policy approvals
  - Access to CI workflow updates
  - Clarified public distribution/legal audience decision

## Sprint 10 – Legal Baseline Pack and License Governance

### Goal

Establish minimum legal artifact pack and operational license compliance
controls.

### Stories

| Story ID   | Description                                                                                                    | Type    | Team                     | Acceptance Criteria                                                                                                                | Story Points      | Dependencies | Blocker                                  | Risk   |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------------- | ------ |
| SP-10-3301 | As a governance owner I want legal template pack artifacts so that legal baseline controls are standardized    | CONTENT | Team Legal Governance    | Given legal docs folder, when reviewed, then privacy checklist, RoPA template, and breach template are present with owner metadata | INSUFFICIENT_DATA | REC-3301     | NONE                                     | Medium |
| SP-10-3302 | As a maintainer I want dependency license inventory and CI gate so that incompatible licenses are caught early | INFRA   | Team Platform Compliance | Given CI run, when dependency license policy is violated, then workflow fails and reports violating package                        | INSUFFICIENT_DATA | REC-3303     | EXTERN: copyleft policy decision pending | High   |

### Parallel Tracks

| Track             | Type    | Stories    | Team(s)                  | Start condition |
| ----------------- | ------- | ---------- | ------------------------ | --------------- |
| Track 1 (Content) | CONTENT | SP-10-3301 | Team Legal Governance    | Sprint start    |
| Track 2 (Infra)   | INFRA   | SP-10-3302 | Team Platform Compliance | Sprint start    |

### Blocker Register (Sprint 10)

| Blocker ID  | Type   | Description                                                         | Owner           | Expected Resolution | Escalation if not resolved by |
| ----------- | ------ | ------------------------------------------------------------------- | --------------- | ------------------- | ----------------------------- |
| BLK-10-3301 | EXTERN | Copyleft acceptance policy decision needed for CI allow/deny matrix | Product Manager | Sprint 10 week 1    | Orchestrator -> user          |

### Sprint KPIs

| KPI                              | Baseline          | Target after sprint | Measurement method      |
| -------------------------------- | ----------------- | ------------------- | ----------------------- |
| Legal baseline templates present | 0/3               | 3/3                 | Artifact presence check |
| License inventory coverage       | INSUFFICIENT_DATA | 100% dependencies   | CI inventory report     |

### Definition of Done (Sprint 10)

- [ ] All stories complete (acceptance criteria met)
- [ ] Documentation updated
- [ ] KPI measurement performed
- [ ] No new CRITICAL_FINDING introduced

## Sprint 11 – Privacy Mapping and Retention Policy

### Goal

Complete privacy/legal mapping and retention obligations for core artifact
domains.

### Stories

| Story ID   | Description                                                                                                                        | Type     | Team                  | Acceptance Criteria                                                                                                    | Story Points      | Dependencies | Blocker                                             | Risk   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | --------------------------------------------------- | ------ |
| SP-11-3301 | As a privacy owner I want lawful-basis and disclosure mapping so that processing activities satisfy Art. 6 and Art. 13/14 coverage | ANALYSIS | Team Legal Governance | Given processing activity matrix, when audited, then each activity has lawful basis and required notice fields mapped  | INSUFFICIENT_DATA | REC-3302     | EXTERN: field-level personal-data inventory pending | High   |
| SP-11-3302 | As a compliance owner I want approved retention matrix so that data lifecycle obligations are enforceable                          | ANALYSIS | Team Legal Governance | Given artifact classes, when policy is approved, then each class has retention period, rationale, and deletion trigger | INSUFFICIENT_DATA | REC-3304     | EXTERN: retention approval pending                  | High   |
| SP-11-3303 | As a product lead I want legal doc section requirements so that ToS/privacy/cookie artifacts are consistent                        | CONTENT  | Team Legal Governance | Given requirement set, when reviewed, then ToS/Privacy/Cookie checklists are complete and assigned owner               | INSUFFICIENT_DATA | REC-3306     | EXTERN: audience decision pending                   | Medium |

### Parallel Tracks

| Track              | Type     | Stories                | Team(s)               | Start condition |
| ------------------ | -------- | ---------------------- | --------------------- | --------------- |
| Track 1 (Analysis) | ANALYSIS | SP-11-3301, SP-11-3302 | Team Legal Governance | Sprint start    |
| Track 2 (Content)  | CONTENT  | SP-11-3303             | Team Legal Governance | Sprint start    |

### Blocker Register (Sprint 11)

| Blocker ID  | Type   | Description                                              | Owner                           | Expected Resolution | Escalation if not resolved by |
| ----------- | ------ | -------------------------------------------------------- | ------------------------------- | ------------------- | ----------------------------- |
| BLK-11-3301 | EXTERN | Field-level personal-data inventory unresolved           | Data Architect                  | Sprint 11 week 1    | Orchestrator -> phase lead    |
| BLK-11-3302 | EXTERN | Retention period approval unresolved                     | Product Manager + Legal Counsel | Sprint 11 week 1    | Orchestrator -> user          |
| BLK-11-3303 | EXTERN | Public audience/legal document scope decision unresolved | Product Manager                 | Sprint 11 week 1    | Orchestrator -> user          |

### Sprint KPIs

| KPI                                               | Baseline | Target after sprint | Measurement method             |
| ------------------------------------------------- | -------- | ------------------- | ------------------------------ |
| Processing activities mapped to lawful basis      | 0%       | 100%                | Mapping matrix audit           |
| Core artifact classes with legal retention policy | 0%       | 100%                | Retention matrix audit         |
| Legal section checklist completeness              | 0%       | 100%                | Document requirement checklist |

### Definition of Done (Sprint 11)

- [ ] All stories complete (acceptance criteria met)
- [ ] Documentation updated
- [ ] KPI measurement performed
- [ ] No new CRITICAL_FINDING introduced

## Sprint 12 – Vendor Legal Intake Standardization

### Goal

Make future vendor/service onboarding legally consistent and auditable.

### Stories

| Story ID   | Description                                                                                                   | Type     | Team                     | Acceptance Criteria                                                                                                 | Story Points      | Dependencies | Blocker                               | Risk   |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------------------------------------- | ------ |
| SP-12-3301 | As a governance owner I want a vendor legal checklist so that DPA/SLA/portability review is standardized      | ANALYSIS | Team Legal Governance    | Given onboarding checklist, when a new vendor is proposed, then DPA/SLA/exit requirements are assessed and recorded | INSUFFICIENT_DATA | REC-3305     | NONE                                  | Medium |
| SP-12-3302 | As a platform owner I want legal review linkage in onboarding workflow so that vendor approvals are traceable | INFRA    | Team Platform Compliance | Given workflow change, when vendor record is created, then legal checklist completion reference is required         | INSUFFICIENT_DATA | SP-12-3301   | INTERN: workflow integration capacity | Medium |

### Parallel Tracks

| Track              | Type     | Stories    | Team(s)                  | Start condition    |
| ------------------ | -------- | ---------- | ------------------------ | ------------------ |
| Track 1 (Analysis) | ANALYSIS | SP-12-3301 | Team Legal Governance    | Sprint start       |
| Track 2 (Infra)    | INFRA    | SP-12-3302 | Team Platform Compliance | SP-12-3301 drafted |

### Blocker Register (Sprint 12)

| Blocker ID  | Type   | Description                         | Owner           | Expected Resolution | Escalation if not resolved by      |
| ----------- | ------ | ----------------------------------- | --------------- | ------------------- | ---------------------------------- |
| BLK-12-3301 | INTERN | Workflow integration prioritization | DevOps Engineer | Sprint 12 week 1    | Orchestrator -> Software Architect |

### Sprint KPIs

| KPI                                         | Baseline | Target after sprint | Measurement method             |
| ------------------------------------------- | -------- | ------------------- | ------------------------------ |
| Vendor onboarding checklists applied        | 0%       | 100%                | Onboarding records audit       |
| Vendor records with legal sign-off evidence | 0%       | 100%                | Workflow metadata verification |

### Definition of Done (Sprint 12)

- [ ] All stories complete (acceptance criteria met)
- [ ] Documentation updated
- [ ] KPI measurement performed
- [ ] No new CRITICAL_FINDING introduced

## Dependency Overview

| Story      | Depends on                          | Type           | Blocking? |
| ---------- | ----------------------------------- | -------------- | --------- |
| SP-10-3302 | Copyleft policy decision            | EXTERN         | Yes       |
| SP-11-3301 | Field-level personal-data inventory | EXTERN         | Yes       |
| SP-11-3302 | Retention period approval           | EXTERN         | Yes       |
| SP-11-3303 | Public audience decision            | EXTERN         | Yes       |
| SP-12-3302 | SP-12-3301                          | Internal story | Yes       |

## Parallel Tracks Overview

| Sprint | Track   | Stories                | Teams                    |
| ------ | ------- | ---------------------- | ------------------------ |
| 10     | Track 1 | SP-10-3301             | Team Legal Governance    |
| 10     | Track 2 | SP-10-3302             | Team Platform Compliance |
| 11     | Track 1 | SP-11-3301, SP-11-3302 | Team Legal Governance    |
| 11     | Track 2 | SP-11-3303             | Team Legal Governance    |
| 12     | Track 1 | SP-12-3301             | Team Legal Governance    |
| 12     | Track 2 | SP-12-3302             | Team Platform Compliance |

## Sprint Plan Risk Log

| Risk                                                 | Probability | Impact | Mitigation                                 | Sprint |
| ---------------------------------------------------- | ----------- | ------ | ------------------------------------------ | ------ |
| Delayed policy decisions from stakeholder inputs     | High        | Medium | Early escalation via blocker register      | 10-11  |
| Incomplete PII inventory delays lawful basis mapping | Medium      | High   | Tie resolution to Data Architect gate      | 11     |
| License policy ambiguity for copyleft packages       | Medium      | High   | Resolve `LEG-Q-3304` before CI enforcement | 10     |

## Consolidated Blocker Register

| Blocker ID  | Sprint | Type   | Description                          | Owner                           | Escalation if not resolved by      |
| ----------- | ------ | ------ | ------------------------------------ | ------------------------------- | ---------------------------------- |
| BLK-10-3301 | 10     | EXTERN | Copyleft policy decision needed      | Product Manager                 | Orchestrator -> user               |
| BLK-11-3301 | 11     | EXTERN | PII inventory unresolved             | Data Architect                  | Orchestrator -> phase lead         |
| BLK-11-3302 | 11     | EXTERN | Retention policy approval unresolved | Product Manager + Legal Counsel | Orchestrator -> user               |
| BLK-11-3303 | 11     | EXTERN | Audience/scope decision unresolved   | Product Manager                 | Orchestrator -> user               |
| BLK-12-3301 | 12     | INTERN | Workflow integration prioritization  | DevOps Engineer                 | Orchestrator -> Software Architect |

## QUESTIONNAIRE_REQUEST

- `QUESTIONNAIRE_REQUEST: LEG-Q-3301` – public audience/legal doc scope decision
- `QUESTIONNAIRE_REQUEST: LEG-Q-3302` – retention periods by artifact class
- `QUESTIONNAIRE_REQUEST: LEG-Q-3303` – field-level personal data processing
  confirmation
- `QUESTIONNAIRE_REQUEST: LEG-Q-3304` – copyleft dependency acceptance policy

## HANDOFF CHECKLIST

- [x] Sprint plan assumptions documented (capacity marked INSUFFICIENT_DATA
      where unknown)
- [x] Every story has story type and team assignment
- [x] Every story has acceptance criteria
- [x] Every story has blocker field
- [x] EXTERN blockers include owner and escalation route
- [x] Parallel tracks identified
- [x] Dependencies and consolidated blockers documented
- [x] KPI targets defined
- [x] No cross-track blocking violations introduced
- [x] Output ready for legal phase handoff
