# Sprint Plan – Senior Developer – 2026-03-10

## Metadata

- Agent: Senior Developer (06)
- Phase: 2
- Based on recommendations:
  `docs/phase-2/06-senior-developer-recommendations.md`
- Date: 2026-03-10
- Total scope: 2 sprints
- Mode: CREATE

## Sprint Plan Assumptions

- Team composition:
  - Team Platform Engineering – roles: Senior DevOps Engineer/Full-stack
    Engineer – 1 person – capacity: 20 SP/sprint
  - Team Security Governance – INSUFFICIENT_DATA: external dependency only, no
    direct story execution in this plan
  - Team Legal Governance – INSUFFICIENT_DATA: external dependency only, no
    direct story execution in this plan
- Sprint duration: 2 weeks
- Technology stack: Node.js 18+, native HTTP server, Vitest, ESLint, file-based
  persistence
- Prerequisites:
  - Software Architect deliverables approved (completed)
  - Session state operational in `docs/session/session-state.json`
  - Existing test/lint baseline executable in CI

## Sprint 10 – Engineering Standards and Governance Foundation

### Goal

Establish enforceable coding standards and dependency governance so all
subsequent code changes follow consistent quality rules.

### Stories

| Story ID  | Description                                                                                                                                          | Type     | Team                      | Acceptance Criteria                                                                                                                                                          | Story Points | Dependencies | Blocker                                                            | Risk                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------- |
| SP-10-601 | As a maintainer I want a mandatory coding standards document so that every PR is reviewed against consistent implementation rules.                   | CONTENT  | Team Platform Engineering | Given the standards doc path, when a PR is opened, then reviewer checklist references it and all required sections (naming, structure, errors, logging, review) are present. | 3            | NONE         | NONE                                                               | Low adoption if checklist not enforced |
| SP-10-602 | As a developer I want a pattern blueprint for route/service/repository boundaries so that route files stay thin and architecture drift is prevented. | ANALYSIS | Team Platform Engineering | Given a selected route file, when mapping responsibilities, then business logic and persistence calls are moved behind service boundaries or flagged for refactor.           | 5            | SP-10-601    | INTERN: pattern refactor scope may exceed sprint                   | Medium refactor spillover              |
| SP-10-603 | As a maintainer I want dependency governance policy and CI audit checks so that dependency changes are secure and license-compliant.                 | INFRA    | Team Platform Engineering | Given a dependency-changing PR, when CI runs, then vulnerability and license checks run and evidence is attached in artifacts.                                               | 5            | NONE         | EXTERN: legal interpretation for non-permissive license edge cases | owner: Legal Counsel                   | escalation: Orchestrator -> Legal Counsel Agent in Phase 2 |
| SP-10-604 | As a team member I want PR checklist enforcement for coding standards so that non-compliant PRs are blocked before merge.                            | INFRA    | Team Platform Engineering | Given PR template update, when PR created, then required standards checkboxes appear and cannot be skipped in review policy.                                                 | 2            | SP-10-601    | NONE                                                               | Low                                    |

### Parallel Tracks

| Track                                        | Type           | Stories              | Team(s)                   | Start condition     |
| -------------------------------------------- | -------------- | -------------------- | ------------------------- | ------------------- |
| Track 1 (Standards)                          | CONTENT        | SP-10-601            | Team Platform Engineering | Sprint 10 start     |
| Track 2 (Dependency Governance)              | INFRA          | SP-10-603            | Team Platform Engineering | Sprint 10 start     |
| Track 3 (Pattern Blueprint + PR Enforcement) | ANALYSIS/INFRA | SP-10-602, SP-10-604 | Team Platform Engineering | SP-10-601 completed |

Track-independence note: No CODE/INFRA story is blocked by CONTENT/ANALYSIS
external blockers; only internal dependency is SP-10-601 -> SP-10-602/SP-10-604.

### Blocker Register (Sprint 10)

| Blocker ID | Type   | Description                                                            | Owner                     | Expected Resolution | Escalation if not resolved by                       |
| ---------- | ------ | ---------------------------------------------------------------------- | ------------------------- | ------------------- | --------------------------------------------------- |
| BLK-10-001 | EXTERN | Legal interpretation required for non-permissive dependency exceptions | Legal Counsel             | End of Sprint 10    | Orchestrator escalation to Legal Counsel (Agent 33) |
| BLK-10-002 | INTERN | Pattern refactor scope may exceed sprint                               | Team Platform Engineering | Mid Sprint 10       | Escalate to Product Manager for slice reduction     |

### Sprint KPIs

| KPI                             | Baseline          | Target after sprint                        | Measurement method      |
| ------------------------------- | ----------------- | ------------------------------------------ | ----------------------- |
| PR standards checklist usage    | 0%                | 100% of PRs                                | PR template audit       |
| Dependency policy compliance    | 0%                | 100% dependency PRs include audit evidence | CI artifact + PR review |
| Route-service boundary adoption | INSUFFICIENT_DATA | >=70% of touched route files comply        | Static review checklist |

### Definition of Done (Sprint 10)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Sprint 11 – Test Completeness and Maintainability Gates

### Goal

Close critical testing blind spots and enforce maintainability limits to reduce
technical debt growth.

### Stories

| Story ID  | Description                                                                                                                                          | Type     | Team                      | Acceptance Criteria                                                                                                                          | Story Points | Dependencies | Blocker                                 | Risk                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ | --------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| SP-11-611 | As a maintainer I want a formal test strategy document so that unit, integration, e2e, and security tests have explicit ownership and pass criteria. | CONTENT  | Team Platform Engineering | Given test strategy doc, when reviewed, then all test layers have tools, owners, entry criteria, and fail thresholds defined.                | 3            | SP-10-601    | EXTERN: SAST/DAST tool approval pending | owner: Security Architect        | escalation: Orchestrator -> Security Architect Agent |
| SP-11-612 | As a developer I want 3 critical e2e smoke tests so that key user flows are validated on every PR.                                                   | CODE     | Team Platform Engineering | Given e2e suite run, when CI executes, then progress load, questionnaire save, and decision update flows all pass.                           | 8            | SP-11-611    | NONE                                    | Medium CI runtime increase       |
| SP-11-613 | As a developer I want maintainability thresholds enforced in CI so that oversized/duplicated code is prevented pre-merge.                            | INFRA    | Team Platform Engineering | Given modified files, when CI runs, then file/function size and duplication checks generate pass/fail outcomes with report.                  | 5            | SP-10-601    | NONE                                    | False positives at first rollout |
| SP-11-614 | As a team I want debt trend metrics recorded each sprint so that technical debt is visible and planned.                                              | ANALYSIS | Team Platform Engineering | Given sprint close, when retrospective runs, then debt metrics (complexity violations, flake rate, coverage drift) are appended to debt log. | 2            | SP-11-613    | NONE                                    | Low                              |

### Parallel Tracks

| Track                              | Type           | Stories              | Team(s)                   | Start condition    |
| ---------------------------------- | -------------- | -------------------- | ------------------------- | ------------------ |
| Track 1 (Test Strategy)            | CONTENT        | SP-11-611            | Team Platform Engineering | Sprint 11 start    |
| Track 2 (E2E Implementation)       | CODE           | SP-11-612            | Team Platform Engineering | SP-11-611 complete |
| Track 3 (Maintainability and Debt) | INFRA/ANALYSIS | SP-11-613, SP-11-614 | Team Platform Engineering | SP-10-601 complete |

Track-independence note: CODE track is dependent on CONTENT completion within
same team but not blocked by external CONTENT blocker except explicit Security
Architect dependency on SP-11-611.

### Blocker Register (Sprint 11)

| Blocker ID | Type   | Description                                             | Owner                     | Expected Resolution     | Escalation if not resolved by                              |
| ---------- | ------ | ------------------------------------------------------- | ------------------------- | ----------------------- | ---------------------------------------------------------- |
| BLK-11-001 | EXTERN | Security Architect approval of SAST/DAST tooling        | Security Architect        | First half of Sprint 11 | Orchestrator escalation to Agent 08                        |
| BLK-11-002 | INTERN | CI runtime increase from e2e suite may exceed threshold | Team Platform Engineering | End of Sprint 11        | Escalate to DevOps Engineer (Agent 07) for CI optimization |

### Sprint KPIs

| KPI                                  | Baseline           | Target after sprint           | Measurement method           |
| ------------------------------------ | ------------------ | ----------------------------- | ---------------------------- |
| Critical flow e2e coverage           | 0 flows            | 3 flows                       | CI e2e suite results         |
| Maintainability threshold compliance | INSUFFICIENT_DATA  | >=90% touched files compliant | CI size/dup reports          |
| Debt log update cadence              | 0 recorded entries | 1 entry/sprint                | Retrospective artifact audit |

### Definition of Done (Sprint 11)

- [ ] All stories complete (acceptance criteria met)
- [ ] Code review performed
- [ ] Tests passed
- [ ] KPI measurement performed
- [ ] Documentation updated
- [ ] No new CRITICAL_FINDING introduced

## Dependency Overview

| Story     | Depends on | Type           | Blocking? |
| --------- | ---------- | -------------- | --------- |
| SP-10-602 | SP-10-601  | Internal story | Yes       |
| SP-10-604 | SP-10-601  | Internal story | Yes       |
| SP-11-611 | SP-10-601  | Internal story | Yes       |
| SP-11-612 | SP-11-611  | Internal story | Yes       |
| SP-11-613 | SP-10-601  | Internal story | Yes       |
| SP-11-614 | SP-11-613  | Internal story | Yes       |

## Parallel Tracks Overview

| Sprint    | Track   | Stories              | Teams                     |
| --------- | ------- | -------------------- | ------------------------- |
| Sprint 10 | Track 1 | SP-10-601            | Team Platform Engineering |
| Sprint 10 | Track 2 | SP-10-603            | Team Platform Engineering |
| Sprint 10 | Track 3 | SP-10-602, SP-10-604 | Team Platform Engineering |
| Sprint 11 | Track 1 | SP-11-611            | Team Platform Engineering |
| Sprint 11 | Track 2 | SP-11-612            | Team Platform Engineering |
| Sprint 11 | Track 3 | SP-11-613, SP-11-614 | Team Platform Engineering |

## Sprint Plan Risk Log

| Risk                             | Probability | Impact | Mitigation                                        | Sprint |
| -------------------------------- | ----------- | ------ | ------------------------------------------------- | ------ |
| Legal dependency exception delay | Medium      | Medium | Early legal review kickoff and fallback policy    | 10     |
| Security tool decision delay     | Medium      | High   | Early dependency escalation to Security Architect | 11     |
| CI runtime regression            | Medium      | Medium | Parallelization and selective smoke scope         | 11     |

## Consolidated Blocker Register

| Blocker ID | Sprint | Type   | Description                                                   | Owner                     | Escalation if not resolved by        |
| ---------- | ------ | ------ | ------------------------------------------------------------- | ------------------------- | ------------------------------------ |
| BLK-10-001 | 10     | EXTERN | Legal interpretation for non-permissive dependency exceptions | Legal Counsel             | Orchestrator -> Agent 33             |
| BLK-10-002 | 10     | INTERN | Pattern refactor scope exceeds sprint                         | Team Platform Engineering | Product Manager scope slicing        |
| BLK-11-001 | 11     | EXTERN | SAST/DAST approval pending                                    | Security Architect        | Orchestrator -> Agent 08             |
| BLK-11-002 | 11     | INTERN | e2e suite runtime overhead                                    | Team Platform Engineering | DevOps Engineer optimization support |

## P1/P2 Traceability Table

| Recommendation | Priority | Story Exists? | Story IDs            |
| -------------- | -------- | ------------- | -------------------- |
| REC-601        | P1       | Yes           | SP-10-601, SP-10-604 |
| REC-602        | P1       | Yes           | SP-10-602            |
| REC-603        | P1       | Yes           | SP-11-611, SP-11-612 |
| REC-604        | P1       | Yes           | SP-10-603            |
| REC-605        | P2       | Yes           | SP-11-613, SP-11-614 |

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
- [x] If cycle_type is SCOPE_CHANGE: stories tagged correctly (or
      NOT_APPLICABLE)
- [x] JSON export is valid

---

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Senior Developer (06)",
    "phase": "2",
    "date": "2026-03-10",
    "based_on_recommendations": "docs/phase-2/06-senior-developer-recommendations.md",
    "total_sprints": 2,
    "mode": "CREATE"
  },
  "assumptions": {
    "teams": [
      {
        "name": "Team Platform Engineering",
        "roles": ["Senior DevOps Engineer", "Full-stack Engineer"],
        "capacity_per_sprint": "20 SP/sprint"
      },
      {
        "name": "Team Security Governance",
        "roles": ["Security Architect"],
        "capacity_per_sprint": "INSUFFICIENT_DATA"
      },
      {
        "name": "Team Legal Governance",
        "roles": ["Legal Counsel"],
        "capacity_per_sprint": "INSUFFICIENT_DATA"
      }
    ],
    "sprint_duration_weeks": 2,
    "prerequisites": [
      "Agent 05 outputs approved",
      "Session-state available",
      "Existing lint/test baseline operational"
    ]
  },
  "sprints": [
    {
      "sprint_number": 10,
      "name": "Engineering Standards and Governance Foundation",
      "goal": "Establish enforceable standards and dependency governance",
      "sprint_status": "QUEUED",
      "depends_on_sprints": [],
      "parallel_tracks": [
        {
          "track": "Track 1 (Standards)",
          "story_type": "CONTENT",
          "stories": ["SP-10-601"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "Sprint 10 start"
        },
        {
          "track": "Track 2 (Governance)",
          "story_type": "INFRA",
          "stories": ["SP-10-603"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "Sprint 10 start"
        },
        {
          "track": "Track 3 (Pattern+Checklist)",
          "story_type": "ANALYSIS",
          "stories": ["SP-10-602", "SP-10-604"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "SP-10-601 complete"
        }
      ],
      "stories": [
        {
          "id": "SP-10-601",
          "description": "As a maintainer I want a mandatory coding standards document so that every PR is reviewed against consistent implementation rules.",
          "story_type": "CONTENT",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given standards doc path, when a PR is opened, then reviewer checklist references required sections"
          ],
          "story_points": 3,
          "dependencies": [],
          "blocker": {
            "type": "NONE",
            "description": null,
            "owner": null,
            "escalation_if_unresolved_by": null
          },
          "risk": "Low adoption if checklist not enforced",
          "recommendation_ref": "REC-601",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-10-602",
          "description": "As a developer I want a pattern blueprint for route/service/repository boundaries so that route files stay thin and architecture drift is prevented.",
          "story_type": "ANALYSIS",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given selected route files, when mapped, then business logic and persistence are moved behind service boundaries or flagged"
          ],
          "story_points": 5,
          "dependencies": ["SP-10-601"],
          "blocker": {
            "type": "INTERN",
            "description": "Pattern refactor scope may exceed sprint",
            "owner": "Team Platform Engineering",
            "escalation_if_unresolved_by": "Product Manager scope slicing"
          },
          "risk": "Medium refactor spillover",
          "recommendation_ref": "REC-602",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-10-603",
          "description": "As a maintainer I want dependency governance policy and CI audit checks so that dependency changes are secure and license-compliant.",
          "story_type": "INFRA",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given dependency-changing PR, when CI runs, then vulnerability and license checks execute and attach evidence"
          ],
          "story_points": 5,
          "dependencies": [],
          "blocker": {
            "type": "EXTERN",
            "description": "Legal interpretation for non-permissive license edge cases",
            "owner": "Legal Counsel",
            "escalation_if_unresolved_by": "Orchestrator -> Agent 33"
          },
          "risk": "Policy delay",
          "recommendation_ref": "REC-604",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-10-604",
          "description": "As a team member I want PR checklist enforcement for coding standards so that non-compliant PRs are blocked before merge.",
          "story_type": "INFRA",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given PR template update, when PR created, then required standards checklist appears"
          ],
          "story_points": 2,
          "dependencies": ["SP-10-601"],
          "blocker": {
            "type": "NONE",
            "description": null,
            "owner": null,
            "escalation_if_unresolved_by": null
          },
          "risk": "Low",
          "recommendation_ref": "REC-601",
          "story_status": "QUEUED"
        }
      ],
      "blocker_register": [
        {
          "id": "BLK-10-001",
          "type": "EXTERN",
          "description": "Legal interpretation required for non-permissive dependency exceptions",
          "owner": "Legal Counsel",
          "expected_resolution": "End of Sprint 10",
          "escalation_route": "Orchestrator escalation to Agent 33"
        },
        {
          "id": "BLK-10-002",
          "type": "INTERN",
          "description": "Pattern refactor scope may exceed sprint",
          "owner": "Team Platform Engineering",
          "expected_resolution": "Mid Sprint 10",
          "escalation_route": "Product Manager scope slicing"
        }
      ],
      "kpis": [
        {
          "kpi": "PR standards checklist usage",
          "baseline": "0%",
          "target": "100%",
          "measurement_method": "PR checklist audit"
        },
        {
          "kpi": "Dependency policy compliance",
          "baseline": "0%",
          "target": "100% dependency PR evidence",
          "measurement_method": "CI artifact verification"
        }
      ],
      "definition_of_done": [
        "All stories complete",
        "Code review performed",
        "Tests passed",
        "KPI measurement performed",
        "Documentation updated",
        "No new CRITICAL_FINDING introduced"
      ]
    },
    {
      "sprint_number": 11,
      "name": "Test Completeness and Maintainability Gates",
      "goal": "Close critical test blind spots and enforce maintainability thresholds",
      "sprint_status": "QUEUED",
      "depends_on_sprints": ["10"],
      "parallel_tracks": [
        {
          "track": "Track 1 (Test Strategy)",
          "story_type": "CONTENT",
          "stories": ["SP-11-611"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "Sprint 11 start"
        },
        {
          "track": "Track 2 (E2E)",
          "story_type": "CODE",
          "stories": ["SP-11-612"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "SP-11-611 complete"
        },
        {
          "track": "Track 3 (Maintainability)",
          "story_type": "INFRA",
          "stories": ["SP-11-613", "SP-11-614"],
          "teams": ["Team Platform Engineering"],
          "start_condition": "SP-10-601 complete"
        }
      ],
      "stories": [
        {
          "id": "SP-11-611",
          "description": "As a maintainer I want a formal test strategy document so that all test layers have ownership and pass criteria.",
          "story_type": "CONTENT",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given strategy doc, when reviewed, then unit/integration/e2e/security ownership and thresholds are defined"
          ],
          "story_points": 3,
          "dependencies": ["SP-10-601"],
          "blocker": {
            "type": "EXTERN",
            "description": "SAST/DAST tool approval pending",
            "owner": "Security Architect",
            "escalation_if_unresolved_by": "Orchestrator -> Agent 08"
          },
          "risk": "Security tool delay",
          "recommendation_ref": "REC-603",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-11-612",
          "description": "As a developer I want 3 critical e2e smoke tests so that key user flows are validated on every PR.",
          "story_type": "CODE",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given e2e suite run, when CI executes, then progress load, questionnaire save, and decision update flows pass"
          ],
          "story_points": 8,
          "dependencies": ["SP-11-611"],
          "blocker": {
            "type": "NONE",
            "description": null,
            "owner": null,
            "escalation_if_unresolved_by": null
          },
          "risk": "CI runtime increase",
          "recommendation_ref": "REC-603",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-11-613",
          "description": "As a developer I want maintainability thresholds enforced in CI so that oversized or duplicated code is prevented before merge.",
          "story_type": "INFRA",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given modified files, when CI runs, then size and duplication checks produce pass/fail report"
          ],
          "story_points": 5,
          "dependencies": ["SP-10-601"],
          "blocker": {
            "type": "NONE",
            "description": null,
            "owner": null,
            "escalation_if_unresolved_by": null
          },
          "risk": "False positives",
          "recommendation_ref": "REC-605",
          "story_status": "QUEUED"
        },
        {
          "id": "SP-11-614",
          "description": "As a team I want debt trend metrics recorded each sprint so that technical debt remains visible and planned.",
          "story_type": "ANALYSIS",
          "team": "Team Platform Engineering",
          "acceptance_criteria": [
            "Given sprint close, when retrospective runs, then debt metrics are appended to debt log"
          ],
          "story_points": 2,
          "dependencies": ["SP-11-613"],
          "blocker": {
            "type": "NONE",
            "description": null,
            "owner": null,
            "escalation_if_unresolved_by": null
          },
          "risk": "Low",
          "recommendation_ref": "REC-605",
          "story_status": "QUEUED"
        }
      ],
      "blocker_register": [
        {
          "id": "BLK-11-001",
          "type": "EXTERN",
          "description": "Security Architect approval of SAST/DAST tooling",
          "owner": "Security Architect",
          "expected_resolution": "First half Sprint 11",
          "escalation_route": "Orchestrator -> Agent 08"
        },
        {
          "id": "BLK-11-002",
          "type": "INTERN",
          "description": "E2E suite runtime overhead",
          "owner": "Team Platform Engineering",
          "expected_resolution": "End Sprint 11",
          "escalation_route": "DevOps Engineer optimization support"
        }
      ],
      "kpis": [
        {
          "kpi": "Critical flow e2e coverage",
          "baseline": "0",
          "target": "3 flows",
          "measurement_method": "CI e2e run"
        },
        {
          "kpi": "Maintainability compliance",
          "baseline": "INSUFFICIENT_DATA",
          "target": ">=90%",
          "measurement_method": "CI size/dup report"
        }
      ],
      "definition_of_done": [
        "All stories complete",
        "Code review performed",
        "Tests passed",
        "KPI measurement performed",
        "Documentation updated",
        "No new CRITICAL_FINDING introduced"
      ]
    }
  ],
  "dependency_map": [
    { "story_id": "SP-10-602", "depends_on": ["SP-10-601"], "blocking": true },
    { "story_id": "SP-10-604", "depends_on": ["SP-10-601"], "blocking": true },
    { "story_id": "SP-11-611", "depends_on": ["SP-10-601"], "blocking": true },
    { "story_id": "SP-11-612", "depends_on": ["SP-11-611"], "blocking": true },
    { "story_id": "SP-11-613", "depends_on": ["SP-10-601"], "blocking": true },
    { "story_id": "SP-11-614", "depends_on": ["SP-11-613"], "blocking": true }
  ],
  "handoff_checklist": {
    "assumptions_documented": true,
    "story_types_present": true,
    "teams_assigned": true,
    "acceptance_criteria_present": true,
    "story_points_present": true,
    "blocker_field_present": true,
    "extern_blockers_with_owner_escalation": true,
    "parallel_tracks_identified": true,
    "kpis_smart": true,
    "dependency_overview_complete": true,
    "consolidated_blocker_register_present": true,
    "definition_of_done_per_sprint": true,
    "no_fictional_capacity": true,
    "scope_change_tags_present": "NOT_APPLICABLE",
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
