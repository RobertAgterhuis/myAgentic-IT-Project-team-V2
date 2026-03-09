# Recommendations – Sales – 2026-03-09

## Metadata
- Agent: Sales Strategist (03)
- Phase: 1
- Based on analysis: `.github/docs/phase-1/03-sales-strategist-analysis.md`
- Date: 2026-03-09
- Mode: CREATE

## Recommendation REC-301
### Problem
Buyer/influencer map is undefined for team rollout.

**Analysis reference:** GAP-301, RISK-301

### Solution
Create an internal adoption decision map (buyer, approver, user, blocker roles).

**Implementation approach:**
1. Document role matrix for internal rollout.
2. Attach decision criteria and objections per role.
3. Validate with at least one additional stakeholder.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Internal model only. |
| Risk Reduction | High | Prevents owner-only stagnation. |
| Cost | Low | Workshop/documentation effort only. |
| UX | Medium | Role-specific onboarding improves adoption clarity. |

### Rationale
Direct mitigation for adoption stagnation risk.

### Dependencies
- Requires: Product Manager collaboration
- Blocked by: stakeholder availability
- Depends on output of: Product Manager

### Risk of Not Implementing
Team rollout stalls due to unclear ownership and approvals.

### Measurement Criterion
- KPI: role map completion and sign-off
- Baseline: 0%
- Target: 100% complete and approved
- Measurement method: checklist
- Time horizon: 1 sprint

## Recommendation REC-302
### Problem
No measurable internal adoption funnel exists.

**Analysis reference:** GAP-302, RISK-301

### Solution
Define and instrument internal adoption funnel metrics.

**Implementation approach:**
1. Define stage conversions (awareness->trial->evaluation->adoption).
2. Assign target percentages per stage.
3. Track weekly and review in sprint check-ins.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Internal model. |
| Risk Reduction | High | Enables early detection of rollout friction. |
| Cost | Low | Metrics and review cadence only. |
| UX | High | Funnel analytics reveal friction points quickly. |

### Rationale
Converts qualitative rollout into measurable execution.

### Dependencies
- Requires: telemetry/logging support
- Blocked by: metric instrumentation backlog
- Depends on output of: Senior Developer / KPI Agent

### Risk of Not Implementing
Adoption improvements remain anecdotal and non-repeatable.

### Measurement Criterion
- KPI: stage conversion dashboard coverage
- Baseline: 0%
- Target: 100% stage metrics tracked weekly
- Measurement method: dashboard/checklist
- Time horizon: 2 sprints

## Recommendation REC-303
### Problem
Value messaging may fragment across docs and conversations.

**Analysis reference:** RISK-302

### Solution
Publish a single-page value narrative + battlecard for internal stakeholders.

**Implementation approach:**
1. Define one-line positioning and 3 differentiators.
2. Map common objections and responses.
3. Reuse wording in docs and sprint updates.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | No direct sales target. |
| Risk Reduction | Medium | Reduces confusion and alignment drift. |
| Cost | Low | Content artifact only. |
| UX | Medium | Clear language improves user confidence and onboarding. |

### Rationale
Mitigates messaging inconsistency during team-scale adoption.

### Dependencies
- Requires: Domain Expert differentiator matrix
- Blocked by: none
- Depends on output of: Domain Expert + Content Strategist

### Risk of Not Implementing
Contradictory messaging weakens trust and slows adoption.

### Measurement Criterion
- KPI: message consistency score across core docs
- Baseline: INSUFFICIENT_DATA:
- Target: >= 90% consistency against battlecard phrases
- Measurement method: monthly content review
- Time horizon: 1 sprint

## PRIORITY MATRIX (MANDATORY)
| Recommendation ID | Impact | Effort | Priority | Sprint |
|-------------------|--------|--------|----------|--------|
| REC-301 | High | Low | P1 | Sprint 1 |
| REC-302 | High | Medium | P1 | Sprint 1 |
| REC-303 | Medium | Low | P2 | Sprint 2 |

## HANDOFF CHECKLIST
- [x] All recommendations reference analysis findings
- [x] All impacts have rationale
- [x] INSUFFICIENT_DATA documented
- [x] SMART criteria included
- [x] Priority matrix complete
- [x] Dependencies documented
- [x] No out-of-domain recommendations
- [x] Scope change section NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT
```json
{
  "metadata": {
    "agent": "Sales Strategist (03)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_analysis": ".github/docs/phase-1/03-sales-strategist-analysis.md",
    "mode": "CREATE"
  },
  "recommendations": [
    {"id":"REC-301","analysis_reference":["GAP-301","RISK-301"],"priority":"P1","effort":"Low","sprint":"Sprint 1"},
    {"id":"REC-302","analysis_reference":["GAP-302","RISK-301"],"priority":"P1","effort":"Medium","sprint":"Sprint 1"},
    {"id":"REC-303","analysis_reference":["RISK-302"],"priority":"P2","effort":"Low","sprint":"Sprint 2"}
  ],
  "priority_matrix": [
    {"id":"REC-301","impact":"High","effort":"Low","priority":"P1","sprint":"Sprint 1"},
    {"id":"REC-302","impact":"High","effort":"Medium","priority":"P1","sprint":"Sprint 1"},
    {"id":"REC-303","impact":"Medium","effort":"Low","priority":"P2","sprint":"Sprint 2"}
  ],
  "handoff_checklist": {
    "all_recs_reference_analysis": true,
    "all_impacts_have_rationale": true,
    "insufficient_data_documented": true,
    "smart_criteria": true,
    "priority_matrix_complete": true,
    "dependencies_documented": true,
    "no_out_of_scope_recs": true,
    "scope_change_impact_present": "NOT_APPLICABLE",
    "mode_consistent": true,
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
