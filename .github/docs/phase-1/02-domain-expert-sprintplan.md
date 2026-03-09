# Sprint Plan – Domain – 2026-03-09

## Metadata
- Agent: Domain Expert (02)
- Phase: 1
- Based on recommendations: `.github/docs/phase-1/02-domain-expert-recommendations.md`
- Date: 2026-03-09
- Total scope: 2 sprints
- Mode: CREATE

## Assumptions
- Team composition:
  - Team Core: 1 Senior DevOps Engineer, capacity 20 SP/sprint
  - Team Domain Review (virtual role): Domain Expert + Product Manager support, capacity 6 SP/sprint (analytical tasks)
- Sprint duration: 2 weeks
- Technology stack: Node.js-based repository workflow, Markdown/JSON governance artifacts
- Prerequisites:
  - Business Analyst outputs completed
  - Questionnaire answers recorded
  - Session-state continuity intact

## Sprint 1 – Strategic Clarity
### Goal
Create objective market/competition/governance foundations to protect differentiation.

### Stories
| Story ID | Description | Type | Team | Acceptance Criteria | Story Points | Dependencies | Blocker | Risk |
|----------|-------------|------|------|---------------------|--------------|--------------|---------|------|
| SP-1-201 | As strategy owner I want a weighted competitor matrix so that roadmap priorities are evidence-based. | ANALYSIS | Team Domain Review | Given selected competitors, when matrix is completed, then top 3 differentiators and top 3 parity requirements are documented. | 5 | REC-201 | NONE | Medium |
| SP-1-202 | As governance owner I want a data classification policy so that operational files have clear handling rules. | ANALYSIS | Team Domain Review | Given file categories, when policy is drafted, then each file type has class, retention, and masking rules. | 5 | REC-202 | NONE | Medium |
| SP-1-203 | As implementation lead I want PR checklist controls for policy compliance so that merges enforce governance. | CONTENT | Team Core | Given policy draft, when checklist is updated, then merge review includes policy compliance checks. | 3 | SP-1-202 | NONE | Low |

### Parallel Tracks
| Track | Type | Stories | Team(s) | Start condition |
|-------|------|---------|---------|----------------|
| Track 1 | ANALYSIS | SP-1-201, SP-1-202 | Team Domain Review | Sprint start |
| Track 2 | CONTENT | SP-1-203 | Team Core | After SP-1-202 draft |

### Blocker Register (Sprint 1)
| Blocker ID | Type | Description | Owner | Expected Resolution | Escalation if not resolved by |
|------------|------|-------------|-------|---------------------|---------------------------------|
| BLK-1-201 | INTERN | Alignment on weighted criteria for competitor matrix | Product Manager | Mid-sprint | Orchestrator |

### Sprint KPIs
| KPI | Baseline | Target after sprint | Measurement method |
|-----|----------|---------------------|--------------------|
| Competitor matrix completion | 0% | 100% | Artifact review |
| Operational file policy coverage | 0% | 100% | Policy checklist |

### Definition of Done (Sprint 1)
- [ ] All stories complete
- [ ] Review complete
- [ ] KPI measurement complete
- [ ] No new critical finding

## Sprint 2 – Team Adoption Readiness
### Goal
Validate transferability from single-user operation to small-team usage.

### Stories
| Story ID | Description | Type | Team | Acceptance Criteria | Story Points | Dependencies | Blocker | Risk |
|----------|-------------|------|------|---------------------|--------------|--------------|---------|------|
| SP-2-201 | As product owner I want a 2-3 person internal pilot so that we identify adoption blockers early. | ANALYSIS | Team Core | Given pilot participants, when mini-cycle completes, then findings are logged with severity and owners. | 8 | REC-203 | EXTERN: pilot participant availability | owner: Team Lead | escalation: Orchestrator |
| SP-2-202 | As UX/process owner I want a pilot rubric so that feedback is structured and comparable. | DESIGN | Team Domain Review | Given pilot scope, when rubric is used, then each step has scored friction/confidence measures. | 3 | SP-2-201 | NONE | Low |

### Parallel Tracks
| Track | Type | Stories | Team(s) | Start condition |
|-------|------|---------|---------|----------------|
| Track 1 | ANALYSIS | SP-2-201 | Team Core | Sprint start |
| Track 2 | DESIGN | SP-2-202 | Team Domain Review | Sprint start |

### Blocker Register (Sprint 2)
| Blocker ID | Type | Description | Owner | Expected Resolution | Escalation if not resolved by |
|------------|------|-------------|-------|---------------------|---------------------------------|
| BLK-2-201 | EXTERN | Pilot participant schedule conflicts | Team Lead | Mid-sprint | Orchestrator |

### Sprint KPIs
| KPI | Baseline | Target after sprint | Measurement method |
|-----|----------|---------------------|--------------------|
| Pilot participants | 1 | >= 3 | Attendance record |
| Actionable pilot findings resolved | 0% | >= 80% in next sprint | Issue tracking |

### Definition of Done (Sprint 2)
- [ ] All stories complete
- [ ] Review complete
- [ ] KPI measurement complete
- [ ] No new critical finding

## Dependency Overview
| Story | Depends on | Type | Blocking? |
|-------|------------|------|-----------|
| SP-1-203 | SP-1-202 | Internal story | Yes |
| SP-2-201 | REC-203 | Recommendation | Yes |
| SP-2-202 | SP-2-201 | Internal story | Yes |

## Parallel Tracks Overview
| Sprint | Track | Stories | Teams |
|--------|-------|---------|-------|
| 1 | Track 1 | SP-1-201, SP-1-202 | Team Domain Review |
| 1 | Track 2 | SP-1-203 | Team Core |
| 2 | Track 1 | SP-2-201 | Team Core |
| 2 | Track 2 | SP-2-202 | Team Domain Review |

## Sprint Plan Risk Log
| Risk | Probability | Impact | Mitigation | Sprint |
|------|-------------|--------|------------|--------|
| Insufficient pilot participation | Medium | Medium | Early scheduling + escalation | 2 |
| Matrix scoring disputes | Low | Medium | PM arbitration | 1 |

## Consolidated Blocker Register
| Blocker ID | Sprint | Type | Description | Owner | Escalation if not resolved by |
|------------|--------|------|-------------|-------|----------------------------------|
| BLK-1-201 | 1 | INTERN | Matrix weighting alignment | Product Manager | Orchestrator |
| BLK-2-201 | 2 | EXTERN | Pilot participant availability | Team Lead | Orchestrator |

## HANDOFF CHECKLIST
- [x] Assumptions documented
- [x] Story types included
- [x] Team assignment included
- [x] Acceptance criteria included
- [x] Story points included
- [x] Blocker field included for all stories
- [x] EXTERN blocker includes owner and escalation
- [x] Parallel tracks identified
- [x] Sprint KPIs defined
- [x] Dependency overview completed
- [x] Consolidated blocker register present
- [x] Definition of done included
- [x] No fictional capacity assumptions
- [x] Scope change tag NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT
```json
{
  "metadata": {
    "agent": "Domain Expert (02)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_recommendations": ".github/docs/phase-1/02-domain-expert-recommendations.md",
    "total_sprints": 2,
    "mode": "CREATE"
  },
  "assumptions": {
    "teams": [
      {"name":"Team Core","roles":["Senior DevOps Engineer"],"capacity_per_sprint":"20 SP"},
      {"name":"Team Domain Review","roles":["Domain Expert","Product Manager"],"capacity_per_sprint":"6 SP"}
    ],
    "sprint_duration_weeks": 2,
    "prerequisites": ["Business Analyst completed", "Questionnaire recorded"]
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
