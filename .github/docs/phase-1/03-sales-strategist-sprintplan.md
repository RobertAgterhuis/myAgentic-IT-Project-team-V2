# Sprint Plan – Sales – 2026-03-09

## Metadata

- Agent: Sales Strategist (03)
- Phase: 1
- Based on recommendations:
  `.github/docs/phase-1/03-sales-strategist-recommendations.md`
- Date: 2026-03-09
- Total scope: 2 sprints
- Mode: CREATE

## Assumptions

- Team composition:
  - Team Core: 1 Senior DevOps Engineer, 20 SP/sprint
  - Team Strategy: Product/Domain/Sales strategy collaboration, 6 SP/sprint
- Sprint duration: 2 weeks
- Technology stack: repository-native docs/workflow + command center
- Prerequisites: BA and DE outputs complete; questionnaire answers available.

## Sprint 1 – Adoption Mechanics

### Goal

Operationalize a measurable internal adoption model for team rollout.

### Stories

| Story ID | Description                                                                                           | Type     | Team          | Acceptance Criteria                                                                                                     | Story Points | Dependencies | Blocker                                               | Risk   |
| -------- | ----------------------------------------------------------------------------------------------------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ----------------------------------------------------- | ------ |
| SP-1-301 | As rollout owner I want a decision-role map so that internal adoption has clear ownership.            | ANALYSIS | Team Strategy | Given stakeholder roles, when map is completed, then buyer/approver/user/blocker roles and criteria are documented.     | 3            | REC-301      | NONE                                                  | Low    |
| SP-1-302 | As operations owner I want funnel stage metrics so that adoption progress is measurable weekly.       | ANALYSIS | Team Strategy | Given funnel definition, when dashboard template is created, then stage conversion fields and targets exist.            | 5            | REC-302      | NONE                                                  | Medium |
| SP-1-303 | As maintainer I want lightweight metric capture added so that funnel data can be updated each sprint. | INFRA    | Team Core     | Given metric fields, when workflow update is merged, then weekly conversion status can be logged without manual rework. | 5            | REC-302      | INTERN: workflow wiring complexity (owner: Team Core) | Medium |

### Parallel Tracks

| Track   | Type     | Stories            | Team(s)       | Start condition |
| ------- | -------- | ------------------ | ------------- | --------------- |
| Track 1 | ANALYSIS | SP-1-301, SP-1-302 | Team Strategy | Sprint start    |
| Track 2 | INFRA    | SP-1-303           | Team Core     | Sprint start    |

### Blocker Register (Sprint 1)

| Blocker ID | Type   | Description                       | Owner     | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | --------------------------------- | --------- | ------------------- | ----------------------------- |
| BLK-1-301  | INTERN | Workflow metric wiring complexity | Team Core | Mid-sprint          | Orchestrator                  |

### Sprint KPIs

| KPI                                | Baseline | Target after sprint | Measurement method       |
| ---------------------------------- | -------- | ------------------- | ------------------------ |
| Decision map completion            | 0%       | 100%                | artifact checklist       |
| Funnel stage tracking availability | 0%       | 100%                | dashboard/workflow check |

### Definition of Done (Sprint 1)

- [ ] All stories complete
- [ ] Tests/reviews complete
- [ ] KPIs measured
- [ ] No new CRITICAL_FINDING

## Sprint 2 – Messaging Cohesion

### Goal

Create consistent internal value narrative to support broader team adoption.

### Stories

| Story ID | Description                                                                                                | Type     | Team          | Acceptance Criteria                                                                                                                 | Story Points | Dependencies | Blocker | Risk   |
| -------- | ---------------------------------------------------------------------------------------------------------- | -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------- | ------ |
| SP-2-301 | As stakeholder I want a single-page value narrative so that all communications use consistent positioning. | CONTENT  | Team Strategy | Given battlecard format, when document is published, then one-line positioning + 3 differentiators + objection handling is present. | 3            | REC-303      | NONE    | Low    |
| SP-2-302 | As reviewer I want consistency checks across core docs so that messaging drift is corrected.               | ANALYSIS | Team Strategy | Given baseline docs, when review runs, then >= 90% phrase consistency against battlecard is achieved.                               | 3            | SP-2-301     | NONE    | Medium |

### Parallel Tracks

| Track   | Type     | Stories  | Team(s)       | Start condition |
| ------- | -------- | -------- | ------------- | --------------- |
| Track 1 | CONTENT  | SP-2-301 | Team Strategy | Sprint start    |
| Track 2 | ANALYSIS | SP-2-302 | Team Strategy | After SP-2-301  |

### Blocker Register (Sprint 2)

| Blocker ID | Type   | Description     | Owner         | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | --------------- | ------------- | ------------------- | ----------------------------- |
| BLK-2-301  | INTERN | None identified | Team Strategy | Sprint completion   | Orchestrator                  |

### Sprint KPIs

| KPI                           | Baseline           | Target after sprint | Measurement method       |
| ----------------------------- | ------------------ | ------------------- | ------------------------ |
| Messaging consistency         | INSUFFICIENT_DATA: | >= 90%              | content review checklist |
| Documented objections covered | 0                  | >= 5                | battlecard audit         |

### Definition of Done (Sprint 2)

- [ ] All stories complete
- [ ] Reviews complete
- [ ] KPIs measured
- [ ] No new CRITICAL_FINDING

## Dependency Overview

| Story    | Depends on | Type           | Blocking? |
| -------- | ---------- | -------------- | --------- |
| SP-1-303 | REC-302    | Recommendation | Yes       |
| SP-2-302 | SP-2-301   | Internal story | Yes       |

## Parallel Tracks Overview

| Sprint   | Track   | Stories            | Teams         |
| -------- | ------- | ------------------ | ------------- |
| Sprint 1 | Track 1 | SP-1-301, SP-1-302 | Team Strategy |
| Sprint 1 | Track 2 | SP-1-303           | Team Core     |
| Sprint 2 | Track 1 | SP-2-301           | Team Strategy |
| Sprint 2 | Track 2 | SP-2-302           | Team Strategy |

## Sprint Plan Risk Log

| Risk                    | Probability | Impact | Mitigation                | Sprint |
| ----------------------- | ----------- | ------ | ------------------------- | ------ |
| Single-user inertia     | High        | High   | role map + funnel metrics | 1      |
| Messaging inconsistency | Medium      | High   | value narrative + audit   | 2      |

## Consolidated Blocker Register

| Blocker ID | Sprint | Type   | Description                       | Owner         | Escalation if not resolved by |
| ---------- | ------ | ------ | --------------------------------- | ------------- | ----------------------------- |
| BLK-1-301  | 1      | INTERN | Workflow metric wiring complexity | Team Core     | Orchestrator                  |
| BLK-2-301  | 2      | INTERN | None identified                   | Team Strategy | Orchestrator                  |

## HANDOFF CHECKLIST

- [x] Assumptions documented
- [x] Story types present
- [x] Teams assigned
- [x] Acceptance criteria present
- [x] Story points present
- [x] Blockers present
- [x] Parallel tracks identified
- [x] Sprint KPIs SMART
- [x] Dependency overview complete
- [x] Consolidated blocker register present
- [x] DoD present per sprint
- [x] No fictional capacity assumptions
- [x] Scope change tag NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Sales Strategist (03)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_recommendations": ".github/docs/phase-1/03-sales-strategist-recommendations.md",
    "total_sprints": 2,
    "mode": "CREATE"
  },
  "assumptions": {
    "teams": [
      {
        "name": "Team Core",
        "roles": ["Senior DevOps Engineer"],
        "capacity_per_sprint": "20 SP"
      },
      {
        "name": "Team Strategy",
        "roles": ["Product/Domain/Sales"],
        "capacity_per_sprint": "6 SP"
      }
    ],
    "sprint_duration_weeks": 2,
    "prerequisites": ["BA+DE complete", "questionnaire available"]
  },
  "handoff_checklist": {
    "assumptions_documented": true,
    "story_types_present": true,
    "teams_assigned": true,
    "acceptance_criteria_present": true,
    "story_points_present": true,
    "blockers_present": true,
    "parallel_tracks_present": true,
    "kpis_smart": true,
    "dependency_overview_complete": true,
    "consolidated_blockers_present": true,
    "definition_of_done_present": true,
    "no_fictional_capacity": true,
    "scope_change_tags": "NOT_APPLICABLE",
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
