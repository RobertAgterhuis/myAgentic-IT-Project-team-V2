# Sprint Plan – Business – 2026-03-09

## Metadata

- Agent: Business Analyst (01)
- Phase: 1
- Based on recommendations:
  `.github/docs/phase-1/01-business-analyst-recommendations.md`
- Date: 2026-03-09
- Total scope: 2 sprints
- Mode: CREATE

## Assumptions

- Team composition:
  - Team Core: Senior DevOps Engineer (1 person), capacity: 20 SP/sprint
- Sprint duration: 2 weeks
- Technology stack: Node.js, GitHub, VS Code, web-based Command Center
- Prerequisites:
  - Onboarding complete
  - Session-state transitions enforced
  - Questionnaire answers registered

## Sprint 1 – Foundations Locked

### Goal

Establish a stable execution baseline by locking team capacity, localhost scope,
and milestone governance.

### Stories

| Story ID | Description                                                                                                                  | Type     | Team      | Acceptance Criteria                                                                                                          | Story Points | Dependencies | Blocker | Risk   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------- | ------ |
| SP-1-001 | As project owner, I want team capacity formalized so that sprint estimates are reliable.                                     | ANALYSIS | Team Core | Given planning assumptions, when sprint plan is drafted, then capacity is explicitly 20 SP/sprint and used in all estimates. | 3            | REC-001      | NONE    | Low    |
| SP-1-002 | As architect stakeholder, I want localhost-only scope declared so that architecture avoids cloud overreach.                  | ANALYSIS | Team Core | Given phase-2 kickoff, when architecture starts, then non-goal includes cloud deployment for v1.                             | 3            | REC-002      | NONE    | Low    |
| SP-1-003 | As product owner, I want Q4 milestone governance defined so that schedule drift is detectable early.                         | ANALYSIS | Team Core | Given timeline target Q4 2026, when milestones are tracked weekly, then slips >1 week trigger escalation.                    | 5            | REC-004      | NONE    | Medium |
| SP-1-004 | As delivery lead, I want questionnaire answers persisted in official docs so that downstream agents consume verified inputs. | CONTENT  | Team Core | Given QR answers, when docs are updated, then all QR-001..QR-009 are stored in BusinessDocs with source/date.                | 2            | SP-1-001     | NONE    | Low    |

### Parallel Tracks

| Track              | Type     | Stories                      | Team(s)   | Start condition |
| ------------------ | -------- | ---------------------------- | --------- | --------------- |
| Track 1 (Analysis) | ANALYSIS | SP-1-001, SP-1-002, SP-1-003 | Team Core | Sprint 1 start  |
| Track 2 (Content)  | CONTENT  | SP-1-004                     | Team Core | After SP-1-001  |

### Blocker Register (Sprint 1)

| Blocker ID | Type   | Description     | Owner     | Expected Resolution | Escalation if not resolved by |
| ---------- | ------ | --------------- | --------- | ------------------- | ----------------------------- |
| BLK-1-001  | INTERN | None identified | Team Core | Sprint 1            | Orchestrator                  |

### Sprint KPIs

| KPI                               | Baseline | Target after sprint | Measurement method            |
| --------------------------------- | -------- | ------------------- | ----------------------------- |
| Planning assumptions completeness | 0%       | 100%                | Checklist in sprint plan      |
| Hosting ambiguity findings        | 1        | 0                   | Phase-2 analysis findings     |
| Milestone governance defined      | No       | Yes                 | Decision/plan document review |

### Definition of Done (Sprint 1)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed (where applicable)
- [ ] Tests passed (where applicable)
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 2 – Quality and UX Criteria

### Goal

Define measurable UX criteria and enforce lightweight governance checks for a11y
and licensing.

### Stories

| Story ID | Description                                                                                          | Type   | Team      | Acceptance Criteria                                                                                      | Story Points | Dependencies      | Blocker | Risk   |
| -------- | ---------------------------------------------------------------------------------------------------- | ------ | --------- | -------------------------------------------------------------------------------------------------------- | ------------ | ----------------- | ------- | ------ |
| SP-2-001 | As UX stakeholder, I want a measurable UX rubric so that 'stunning' is testable.                     | DESIGN | Team Core | Given UX references, when rubric is finalized, then each UX story maps to at least one rubric criterion. | 5            | REC-003, SP-1-003 | NONE    | Medium |
| SP-2-002 | As quality owner, I want CI license checks so that MIT compatibility is preserved.                   | INFRA  | Team Core | Given dependency changes, when CI runs, then incompatible licenses fail the pipeline.                    | 3            | REC-005           | NONE    | Medium |
| SP-2-003 | As accessibility owner, I want automated a11y regression checks so that WCAG quality does not drift. | CODE   | Team Core | Given UI changes, when tests run, then accessibility checks execute and must pass before merge.          | 5            | REC-005           | NONE    | Medium |

### Parallel Tracks

| Track            | Type   | Stories  | Team(s)   | Start condition |
| ---------------- | ------ | -------- | --------- | --------------- |
| Track 1 (Design) | DESIGN | SP-2-001 | Team Core | Sprint 2 start  |
| Track 2 (Infra)  | INFRA  | SP-2-002 | Team Core | Sprint 2 start  |
| Track 3 (Code)   | CODE   | SP-2-003 | Team Core | Sprint 2 start  |

### Blocker Register (Sprint 2)

| Blocker ID | Type   | Description                                   | Owner     | Expected Resolution | Escalation if not resolved by   |
| ---------- | ------ | --------------------------------------------- | --------- | ------------------- | ------------------------------- |
| BLK-2-001  | INTERN | Tool setup complexity for a11y/license checks | Team Core | Sprint 2 mid-point  | Orchestrator + Senior Developer |

### Sprint KPIs

| KPI                               | Baseline | Target after sprint | Measurement method |
| --------------------------------- | -------- | ------------------- | ------------------ |
| UX rubric coverage for UX stories | 0%       | 100%                | UX story checklist |
| PRs with license check            | 0%       | 100%                | CI status          |
| PRs with a11y check               | 0%       | 100%                | CI status          |

### Definition of Done (Sprint 2)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Dependency Overview

| Story    | Depends on | Type           | Blocking? |
| -------- | ---------- | -------------- | --------- |
| SP-1-004 | SP-1-001   | Internal story | Yes       |
| SP-2-001 | SP-1-003   | Internal story | Yes       |
| SP-2-002 | REC-005    | Recommendation | Yes       |
| SP-2-003 | REC-005    | Recommendation | Yes       |

## Parallel Tracks Overview

| Sprint   | Track   | Stories                      | Teams     |
| -------- | ------- | ---------------------------- | --------- |
| Sprint 1 | Track 1 | SP-1-001, SP-1-002, SP-1-003 | Team Core |
| Sprint 1 | Track 2 | SP-1-004                     | Team Core |
| Sprint 2 | Track 1 | SP-2-001                     | Team Core |
| Sprint 2 | Track 2 | SP-2-002                     | Team Core |
| Sprint 2 | Track 3 | SP-2-003                     | Team Core |

## Sprint Plan Risk Log

| Risk                        | Probability | Impact | Mitigation                               | Sprint   |
| --------------------------- | ----------- | ------ | ---------------------------------------- | -------- |
| Rework due to subjective UX | Medium      | Medium | UX rubric definition (SP-2-001)          | Sprint 2 |
| Governance checks delay CI  | Low         | Medium | Incremental rollout and baseline scripts | Sprint 2 |

## Consolidated Blocker Register

| Blocker ID | Sprint | Type   | Description                      | Owner     | Escalation if not resolved by   |
| ---------- | ------ | ------ | -------------------------------- | --------- | ------------------------------- |
| BLK-1-001  | 1      | INTERN | None identified                  | Team Core | Orchestrator                    |
| BLK-2-001  | 2      | INTERN | Tool setup complexity for checks | Team Core | Orchestrator + Senior Developer |

## HANDOFF CHECKLIST

- [x] Sprint plan assumptions are explicitly documented (including teams with
      capacity)
- [x] Every story has a story type classification
- [x] Every story has a team assignment
- [x] Every story has acceptance criteria
- [x] Every story has a story point estimate
- [x] Every story has a Blocker field
- [x] All EXTERN blockers have owner and escalation route (N/A)
- [x] Parallel tracks are identified per sprint
- [x] Sprint KPIs are SMART formulated
- [x] Dependency overview is completed
- [x] Consolidated Blocker Register is present
- [x] Definition of Done is present per sprint
- [x] No fictional capacity assumptions
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff
      context
- [x] Scope change tagging: NOT_APPLICABLE
- [x] JSON export is valid

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Business Analyst (01)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_recommendations": ".github/docs/phase-1/01-business-analyst-recommendations.md",
    "total_sprints": 2,
    "mode": "CREATE"
  },
  "assumptions": {
    "teams": [
      {
        "name": "Team Core",
        "roles": ["Senior DevOps Engineer"],
        "capacity_per_sprint": "20 SP"
      }
    ],
    "sprint_duration_weeks": 2,
    "prerequisites": [
      "Onboarding complete",
      "Questionnaire answers registered",
      "Session-state integrity"
    ]
  },
  "sprints": [
    {
      "sprint_number": 1,
      "name": "Foundations Locked",
      "stories": ["SP-1-001", "SP-1-002", "SP-1-003", "SP-1-004"]
    },
    {
      "sprint_number": 2,
      "name": "Quality and UX Criteria",
      "stories": ["SP-2-001", "SP-2-002", "SP-2-003"]
    }
  ],
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
