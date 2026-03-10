# Sprint Plan – Security Architect – 2026-03-10

## Metadata

- Agent: Security Architect (08)
- Phase: 2
- Based on recommendations:
  `.github/docs/phase-2/08-security-architect-recommendations.md`
- Date: 2026-03-10
- Total scope: 3 sprints
- Mode: CREATE

## Assumptions

- Team composition:
  - Team Security – roles: Security Architect, Senior Developer support, DevOps
    support – capacity: `INSUFFICIENT_DATA: exact SP/hours per sprint`
  - Team Platform – roles: Senior Developer, DevOps Engineer – capacity:
    `INSUFFICIENT_DATA: exact SP/hours per sprint`
- Sprint duration: 2 weeks
- Technology stack: Node.js web app, GitHub Actions CI/CD, Docker runtime
- Prerequisites for Sprint 1:
  - Access to CI workflow modification rights
  - Agreement on interim severity policy draft
  - Baseline test suite passing

## Sprint 10 – Security Gate Foundation

### Goal

Establish enforceable CI security gates and core abuse-prevention controls.

### Stories

| Story ID  | Description                                                                                                              | Type  | Team          | Acceptance Criteria                                                                                              | Story Points      | Dependencies | Blocker                                  | Risk   |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ----- | ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------------- | ------ |
| SP-10-801 | As a platform owner I want approved security gate severities so that critical findings block merge/release automatically | INFRA | Team Security | Given CI policy config, when a finding exceeds threshold, then PR/release is blocked                             | INSUFFICIENT_DATA | REC-806      | INTERN: Security+DevOps policy alignment | Medium |
| SP-10-802 | As an engineer I want DAST and container scan jobs so that runtime weaknesses are detected before release                | INFRA | Team Platform | Given CI run, when security stages execute, then DAST and image scan results are reported and threshold-enforced | INSUFFICIENT_DATA | SP-10-801    | INTERN: tool integration setup           | Medium |
| SP-10-803 | As an operator I want rate limiting on API endpoints so that request floods cannot degrade availability                  | CODE  | Team Platform | Given burst requests above threshold, when requests exceed limit, then server returns 429 and logs event         | INSUFFICIENT_DATA | REC-804      | NONE                                     | Low    |

### Parallel Tracks

| Track           | Type  | Stories              | Team(s)                       | Start condition |
| --------------- | ----- | -------------------- | ----------------------------- | --------------- |
| Track 1 (Infra) | INFRA | SP-10-801, SP-10-802 | Team Security + Team Platform | Sprint 10 start |
| Track 2 (Code)  | CODE  | SP-10-803            | Team Platform                 | Sprint 10 start |

Track independence note: CODE track (`SP-10-803`) is not blocked by
policy-documenting work from ANALYSIS/CONTENT/DESIGN tracks.

### Blocker Register (Sprint 10)

| Blocker ID | Type   | Description                                                 | Owner              | Expected Resolution | Escalation if not resolved by      |
| ---------- | ------ | ----------------------------------------------------------- | ------------------ | ------------------- | ---------------------------------- |
| BLK-10-001 | INTERN | Security severity consensus required for CI fail thresholds | Security Architect | Sprint 10 week 1    | Orchestrator -> Product Manager    |
| BLK-10-002 | INTERN | DAST/container scanner integration into existing CI         | DevOps Engineer    | Sprint 10 week 2    | Orchestrator -> Software Architect |

### Sprint KPIs

| KPI                           | Baseline | Target after sprint                         | Measurement method      |
| ----------------------------- | -------- | ------------------------------------------- | ----------------------- |
| Security scan families in CI  | 3        | 5                                           | Count CI job categories |
| Endpoint rate-limit coverage  | 0%       | >=80% endpoints                             | Endpoint policy tests   |
| Policy-enforced gate coverage | 0%       | 100% PR/release security checks thresholded | CI gate outcomes        |

### Definition of Done (Sprint 10)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 11 – AuthN/AuthZ Baseline

### Goal

Introduce first enforceable authentication and authorization controls.

### Stories

| Story ID  | Description                                                                                                                      | Type     | Team          | Acceptance Criteria                                                                            | Story Points      | Dependencies | Blocker                                               | Risk   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------- | ----------------- | ------------ | ----------------------------------------------------- | ------ |
| SP-11-801 | As a security owner I want an authentication ADR and enforcement toggle so that non-loopback deployments require identity checks | CODE     | Team Security | Given non-loopback mode, when app starts, then auth requirement is enabled and validated       | INSUFFICIENT_DATA | REC-801      | EXTERN: auth mechanism decision owner Product Manager | High   |
| SP-11-802 | As a maintainer I want a role-permission matrix so that endpoint operations are least-privileged                                 | ANALYSIS | Team Security | Given endpoint catalog, when matrix is generated, then every endpoint has minimum role defined | INSUFFICIENT_DATA | SP-11-801    | NONE                                                  | Medium |
| SP-11-803 | As a developer I want authorization tests so that unauthorized role actions are denied consistently                              | CODE     | Team Platform | Given role test cases, when unauthorized request occurs, then API returns deny response        | INSUFFICIENT_DATA | SP-11-802    | INTERN: shared test fixture readiness                 | Medium |

### Parallel Tracks

| Track              | Type     | Stories              | Team(s)                       | Start condition           |
| ------------------ | -------- | -------------------- | ----------------------------- | ------------------------- |
| Track 1 (Code)     | CODE     | SP-11-801, SP-11-803 | Team Security + Team Platform | SP-11-801 design approved |
| Track 2 (Analysis) | ANALYSIS | SP-11-802            | Team Security                 | Sprint 11 start           |

Track independence note: ANALYSIS blocker cannot block CODE/INFRA execution by
contract unless explicitly translated into an internal technical prerequisite.

### Blocker Register (Sprint 11)

| Blocker ID | Type   | Description                                                      | Owner            | Expected Resolution | Escalation if not resolved by   |
| ---------- | ------ | ---------------------------------------------------------------- | ---------------- | ------------------- | ------------------------------- |
| BLK-11-001 | EXTERN | Authentication mechanism decision for first multi-user milestone | Product Manager  | Sprint 11 week 1    | Orchestrator -> user decision   |
| BLK-11-002 | INTERN | Shared authorization fixture implementation                      | Senior Developer | Sprint 11 week 1    | Orchestrator -> DevOps Engineer |

### Sprint KPIs

| KPI                                    | Baseline          | Target after sprint                                  | Measurement method        |
| -------------------------------------- | ----------------- | ---------------------------------------------------- | ------------------------- |
| Route auth policy coverage             | 0%                | 100% protected endpoint classes in non-loopback mode | Route policy tests        |
| Endpoint role mapping coverage         | 0%                | 100% mapped endpoints                                | Matrix completeness audit |
| Authorization deny-path test pass rate | INSUFFICIENT_DATA | 100%                                                 | CI integration tests      |

### Definition of Done (Sprint 11)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 12 – Data Protection Completion

### Goal

Complete data classification and privacy-driven security controls.

### Stories

| Story ID  | Description                                                                                               | Type     | Team          | Acceptance Criteria                                                                                                    | Story Points      | Dependencies | Blocker                                        | Risk   |
| --------- | --------------------------------------------------------------------------------------------------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------------------- | ------ |
| SP-12-801 | As a security stakeholder I want a data classification matrix so that controls are matched to sensitivity | ANALYSIS | Team Security | Given data entities, when classified, then each entity has class and owner                                             | INSUFFICIENT_DATA | REC-805      | EXTERN: Data Architect + Legal Counsel outputs | High   |
| SP-12-802 | As an operator I want retention and secure logging rules so that privacy requirements are enforceable     | CODE     | Team Platform | Given class policy, when logs/retention execute, then prohibited data classes are redacted and retention rules applied | INSUFFICIENT_DATA | SP-12-801    | INTERN: policy-to-code mapping                 | Medium |

### Parallel Tracks

| Track              | Type     | Stories   | Team(s)       | Start condition                |
| ------------------ | -------- | --------- | ------------- | ------------------------------ |
| Track 1 (Analysis) | ANALYSIS | SP-12-801 | Team Security | Data Architect input available |
| Track 2 (Code)     | CODE     | SP-12-802 | Team Platform | SP-12-801 approved             |

### Blocker Register (Sprint 12)

| Blocker ID | Type   | Description                                                      | Owner                          | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | ---------------------------------------------------------------- | ------------------------------ | ------------------- | ----------------------------- |
| BLK-12-001 | EXTERN | Data classification inputs from Data Architect and Legal Counsel | Data Architect / Legal Counsel | Sprint 12 week 1    | Orchestrator -> Phase 2 lead  |

### Sprint KPIs

| KPI                      | Baseline          | Target after sprint       | Measurement method             |
| ------------------------ | ----------------- | ------------------------- | ------------------------------ |
| Classified data entities | 0%                | 100%                      | Classification matrix coverage |
| Redaction rule coverage  | INSUFFICIENT_DATA | 100% sensitive log fields | Log policy tests               |

### Definition of Done (Sprint 12)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Dependency Overview

| Story     | Depends on                       | Type           | Blocking? |
| --------- | -------------------------------- | -------------- | --------- |
| SP-10-802 | SP-10-801                        | Internal story | Yes       |
| SP-11-801 | Product auth decision            | EXTERN         | Yes       |
| SP-11-803 | SP-11-802                        | Internal story | Yes       |
| SP-12-801 | Data Architect and Legal outputs | EXTERN         | Yes       |
| SP-12-802 | SP-12-801                        | Internal story | Yes       |

## Parallel Tracks Overview

| Sprint | Track   | Stories              | Teams                        |
| ------ | ------- | -------------------- | ---------------------------- |
| 10     | Track 1 | SP-10-801, SP-10-802 | Team Security, Team Platform |
| 10     | Track 2 | SP-10-803            | Team Platform                |
| 11     | Track 1 | SP-11-801, SP-11-803 | Team Security, Team Platform |
| 11     | Track 2 | SP-11-802            | Team Security                |
| 12     | Track 1 | SP-12-801            | Team Security                |
| 12     | Track 2 | SP-12-802            | Team Platform                |

## Sprint Plan Risk Log

| Risk                                      | Probability | Impact | Mitigation                                            | Sprint |
| ----------------------------------------- | ----------- | ------ | ----------------------------------------------------- | ------ |
| Security gate policy not approved in time | Medium      | High   | Escalate BLK-10-001 early                             | 10     |
| Auth decision delayed                     | High        | High   | Use temporary localhost-only hard gate until decision | 11     |
| Data classification delayed               | Medium      | High   | Mark privacy controls as blocked and escalate         | 12     |

## Consolidated Blocker Register

| Blocker ID | Sprint | Type   | Description                    | Owner                          | Escalation if not resolved by      |
| ---------- | ------ | ------ | ------------------------------ | ------------------------------ | ---------------------------------- |
| BLK-10-001 | 10     | INTERN | Security threshold alignment   | Security Architect             | Orchestrator -> Product Manager    |
| BLK-10-002 | 10     | INTERN | DAST/container integration     | DevOps Engineer                | Orchestrator -> Software Architect |
| BLK-11-001 | 11     | EXTERN | Authentication decision        | Product Manager                | Orchestrator -> user decision      |
| BLK-11-002 | 11     | INTERN | Authorization test fixture     | Senior Developer               | Orchestrator -> DevOps Engineer    |
| BLK-12-001 | 12     | EXTERN | Data classification dependency | Data Architect / Legal Counsel | Orchestrator -> Phase 2 lead       |

## QUESTIONNAIRE_REQUEST

- `QUESTIONNAIRE_REQUEST: SEC-Q-801` – non-localhost exposure timeline
- `QUESTIONNAIRE_REQUEST: SEC-Q-802` – authentication mechanism decision
- `QUESTIONNAIRE_REQUEST: SEC-Q-803` – security severity thresholds
- `QUESTIONNAIRE_REQUEST: SEC-Q-805` – privacy/data class requirements

## HANDOFF CHECKLIST

- [x] Sprint plan assumptions are explicitly documented (including teams with
      capacity)
- [x] Every story has a story type classification
      (CODE/INFRA/DESIGN/CONTENT/ANALYSIS)
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
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff
      message
- [x] Scope Change handling: NOT_APPLICABLE
- [x] JSON export is valid
