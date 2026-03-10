# Sprint Plan – Data Architect – 2026-03-10

## Metadata
- Agent: Data Architect (09)
- Phase: 2
- Based on recommendations: `.github/docs/phase-2/09-data-architect-recommendations.md`
- Date: 2026-03-10
- Total scope: 3 sprints
- Mode: CREATE

## Assumptions
- Team composition:
  - Team Data Governance - roles: Data Architect, Product Manager, Legal Counsel liaison - 3 people - capacity: INSUFFICIENT_DATA
  - Team Platform Data - roles: Senior Developer, DevOps Engineer - 2 people - capacity: INSUFFICIENT_DATA
- Sprint duration: 2 weeks
- Technology stack: Node.js, filesystem persistence (JSON/Markdown/JSONL), GitHub Actions CI
- Prerequisites:
  - Access to workflow and docs updates
  - Confirmation of legal retention constraints
  - Alignment with security classification model

## Sprint 10 – Data Integrity Automation

### Goal
Enable continuous data integrity detection to prevent silent persistence drift.

### Stories

| Story ID | Description | Type | Team | Acceptance Criteria | Story Points | Dependencies | Blocker | Risk |
|----------|-------------|------|------|---------------------|--------------|--------------|---------|------|
| SP-10-901 | As a platform owner I want nightly integrity checks so that malformed entities are detected before user impact | INFRA | Team Platform Data | Given scheduled workflow, when it runs nightly, then it validates core entities and publishes an integrity report artifact | INSUFFICIENT_DATA | REC-904 | NONE | Medium |
| SP-10-902 | As a maintainer I want parser/validator integrity assertions so that schema and markdown drift fail CI | CODE | Team Platform Data | Given pull request changes, when integrity assertions fail, then CI blocks merge | INSUFFICIENT_DATA | SP-10-901 | INTERN: shared test harness setup | Medium |

### Parallel Tracks

| Track | Type | Stories | Team(s) | Start condition |
|-------|------|---------|---------|----------------|
| Track 1 (Infra) | INFRA | SP-10-901 | Team Platform Data | Sprint 10 start |
| Track 2 (Code) | CODE | SP-10-902 | Team Platform Data | Sprint 10 start |

### Blocker Register (Sprint 10)

| Blocker ID | Type | Description | Owner | Expected Resolution | Escalation if not resolved by |
|------------|------|-------------|-------|---------------------|--------------------------------|
| BLK-10-901 | INTERN | Shared integrity test harness alignment | Senior Developer | Sprint 10 week 1 | Orchestrator -> DevOps Engineer |

### Sprint KPIs

| KPI | Baseline | Target after sprint | Measurement method |
|-----|----------|---------------------|--------------------|
| Integrity workflow runs/week | 0 | >=7 | Workflow run history |
| Critical integrity failures undetected >24h | INSUFFICIENT_DATA | 0 | Integrity report and incident log |

### Definition of Done (Sprint 10)
- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 11 – Governance and Versioned Contracts

### Goal
Establish governed data ownership and stable schema evolution controls.

### Stories

| Story ID | Description | Type | Team | Acceptance Criteria | Story Points | Dependencies | Blocker | Risk |
|----------|-------------|------|------|---------------------|--------------|--------------|---------|------|
| SP-11-901 | As a program lead I want a domain ownership matrix so that each data domain has accountable stewardship | ANALYSIS | Team Data Governance | Given ownership register, when reviewed, then each domain has owner, steward, and escalation path | INSUFFICIENT_DATA | REC-901 | EXTERN: owner confirmation pending | Medium |
| SP-11-902 | As an engineer I want schema version metadata and migration conventions so that data contract changes are backward-compatible | CODE | Team Platform Data | Given updated entities, when schema changes, then version metadata and migration tests pass for current and prior schema | INSUFFICIENT_DATA | REC-903 | INTERN: migration utility design | High |
| SP-11-903 | As a product analyst I want a governed KPI catalog so that dashboard metrics have clear lineage and definitions | ANALYSIS | Team Data Governance | Given KPI catalog, when dashboard KPI is referenced, then source formula and owner are documented | INSUFFICIENT_DATA | REC-906 | EXTERN: KPI owner decision | Medium |

### Parallel Tracks

| Track | Type | Stories | Team(s) | Start condition |
|-------|------|---------|---------|----------------|
| Track 1 (Code) | CODE | SP-11-902 | Team Platform Data | Sprint 11 start |
| Track 2 (Analysis) | ANALYSIS | SP-11-901, SP-11-903 | Team Data Governance | Sprint 11 start |

Track independence note: ANALYSIS blockers do not block CODE execution unless converted into explicit technical dependency.

### Blocker Register (Sprint 11)

| Blocker ID | Type | Description | Owner | Expected Resolution | Escalation if not resolved by |
|------------|------|-------------|-------|---------------------|--------------------------------|
| BLK-11-901 | EXTERN | Data domain owner confirmations | Product Manager | Sprint 11 week 1 | Orchestrator -> user |
| BLK-11-902 | EXTERN | KPI governance owner assignment | Product Manager | Sprint 11 week 1 | Orchestrator -> user |
| BLK-11-903 | INTERN | Migration utility scaffolding | Senior Developer | Sprint 11 week 2 | Orchestrator -> Software Architect |

### Sprint KPIs

| KPI | Baseline | Target after sprint | Measurement method |
|-----|----------|---------------------|--------------------|
| Data domains with assigned owner | 0% | 100% | Ownership matrix audit |
| Versioned core JSON entities | 0% | 100% | Schema audit in CI |
| Dashboard KPIs with documented lineage | 0% | 100% | KPI catalog coverage check |

### Definition of Done (Sprint 11)
- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 12 – Classification, Retention, and Capacity Forecast

### Goal
Complete privacy-aligned data governance and growth planning.

### Stories

| Story ID | Description | Type | Team | Acceptance Criteria | Story Points | Dependencies | Blocker | Risk |
|----------|-------------|------|------|---------------------|--------------|--------------|---------|------|
| SP-12-901 | As a data steward I want an entity-level classification and retention matrix so that privacy and lifecycle controls are enforceable | ANALYSIS | Team Data Governance | Given final matrix, when reviewed, then every core entity has class, retention, and deletion rule | INSUFFICIENT_DATA | REC-902 | EXTERN: Legal Counsel retention policy | High |
| SP-12-902 | As an operations lead I want monthly storage forecasts so that capacity risks are visible and proactive actions are planned | ANALYSIS | Team Data Governance | Given telemetry snapshots, when report is generated, then 3/6/12-month forecast and thresholds are published | INSUFFICIENT_DATA | REC-905 | EXTERN: growth horizon decision | Medium |
| SP-12-903 | As a developer I want retention and redaction policy checks so that non-compliant data handling fails validation | CODE | Team Platform Data | Given classified entities, when write/export occurs, then policy checks enforce retention/redaction constraints | INSUFFICIENT_DATA | SP-12-901 | INTERN: policy-to-code mapping | High |

### Parallel Tracks

| Track | Type | Stories | Team(s) | Start condition |
|-------|------|---------|---------|----------------|
| Track 1 (Analysis) | ANALYSIS | SP-12-901, SP-12-902 | Team Data Governance | Sprint 12 start |
| Track 2 (Code) | CODE | SP-12-903 | Team Platform Data | SP-12-901 approved |

### Blocker Register (Sprint 12)

| Blocker ID | Type | Description | Owner | Expected Resolution | Escalation if not resolved by |
|------------|------|-------------|-------|---------------------|--------------------------------|
| BLK-12-901 | EXTERN | Legal Counsel retention obligations | Legal Counsel | Sprint 12 week 1 | Orchestrator -> phase lead |
| BLK-12-902 | EXTERN | Growth horizon selection for forecasting | Product Manager | Sprint 12 week 1 | Orchestrator -> user |
| BLK-12-903 | INTERN | Policy-to-code mapping implementation | Senior Developer | Sprint 12 week 2 | Orchestrator -> DevOps Engineer |

### Sprint KPIs

| KPI | Baseline | Target after sprint | Measurement method |
|-----|----------|---------------------|--------------------|
| Entities classified with retention policy | INSUFFICIENT_DATA | 100% | Classification matrix coverage |
| Monthly forecast publication | 0/month | 1/month | Artifact publication check |
| Retention/redaction enforcement coverage | 0% | >=90% policy-critical paths | Policy test suite |

### Definition of Done (Sprint 12)
- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Dependency Overview

| Story | Depends on | Type | Blocking? |
|-------|------------|------|-----------|
| SP-10-902 | SP-10-901 | Internal story | Yes |
| SP-11-901 | Owner confirmation | EXTERN | Yes |
| SP-11-903 | KPI owner assignment | EXTERN | Yes |
| SP-12-901 | Legal Counsel retention policy | EXTERN | Yes |
| SP-12-903 | SP-12-901 | Internal story | Yes |

## Parallel Tracks Overview

| Sprint | Track | Stories | Teams |
|--------|-------|---------|-------|
| 10 | Track 1 | SP-10-901 | Team Platform Data |
| 10 | Track 2 | SP-10-902 | Team Platform Data |
| 11 | Track 1 | SP-11-902 | Team Platform Data |
| 11 | Track 2 | SP-11-901, SP-11-903 | Team Data Governance |
| 12 | Track 1 | SP-12-901, SP-12-902 | Team Data Governance |
| 12 | Track 2 | SP-12-903 | Team Platform Data |

## Sprint Plan Risk Log

| Risk | Probability | Impact | Mitigation | Sprint |
|------|-------------|--------|------------|--------|
| Legal retention dependencies delay classification | Medium | High | Early escalation through BLK-12-901 | 12 |
| Migration complexity underestimated | Medium | High | Prototype migration harness in Sprint 10 | 11 |
| Integrity checks produce high false positives initially | Medium | Medium | Tuning cycle after first week | 10 |

## Consolidated Blocker Register

| Blocker ID | Sprint | Type | Description | Owner | Escalation if not resolved by |
|------------|--------|------|-------------|-------|--------------------------------|
| BLK-10-901 | 10 | INTERN | Integrity harness alignment | Senior Developer | Orchestrator -> DevOps Engineer |
| BLK-11-901 | 11 | EXTERN | Data owner confirmations | Product Manager | Orchestrator -> user |
| BLK-11-902 | 11 | EXTERN | KPI owner assignment | Product Manager | Orchestrator -> user |
| BLK-11-903 | 11 | INTERN | Migration scaffolding | Senior Developer | Orchestrator -> Software Architect |
| BLK-12-901 | 12 | EXTERN | Legal retention obligations | Legal Counsel | Orchestrator -> phase lead |
| BLK-12-902 | 12 | EXTERN | Forecast horizon decision | Product Manager | Orchestrator -> user |
| BLK-12-903 | 12 | INTERN | Policy-to-code mapping | Senior Developer | Orchestrator -> DevOps Engineer |

## QUESTIONNAIRE_REQUEST
- `QUESTIONNAIRE_REQUEST: DA-Q-901` – storage growth planning horizon
- `QUESTIONNAIRE_REQUEST: DA-Q-902` – multi-user/non-localhost timeline
- `QUESTIONNAIRE_REQUEST: DA-Q-903` – retention windows for core artifacts
- `QUESTIONNAIRE_REQUEST: DA-Q-904` – KPI governance owner assignment

## HANDOFF CHECKLIST
- [x] Sprint plan assumptions are explicitly documented (including teams with capacity)
- [x] Every story has a story type classification (CODE/INFRA/DESIGN/CONTENT/ANALYSIS)
- [x] Every story has a team assignment (or INSUFFICIENT_DATA:)
- [x] Every story has acceptance criteria
- [x] Every story has a story point estimate (or INSUFFICIENT_DATA:)
- [x] Every story has a Blocker field (minimum NONE)
- [x] All EXTERN blockers have an owner and escalation route
- [x] Parallel tracks are identified per sprint
- [x] Sprint KPIs are SMART formulated
- [x] Dependency overview is completed
- [x] Consolidated Blocker Register is present
- [x] Definition of Done is present per sprint
- [x] No fictional capacity assumptions
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff message
- [x] Scope Change handling: NOT_APPLICABLE
- [x] JSON export is valid
