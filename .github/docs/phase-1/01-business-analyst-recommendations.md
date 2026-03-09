# Recommendations – Business – 2026-03-09

## Metadata
- Agent: Business Analyst (01)
- Phase: 1
- Based on analysis: `.github/docs/phase-1/01-business-analyst-analysis.md`
- Date: 2026-03-09
- Mode: CREATE

## Recommendation REC-001

### Problem
Team and capacity were previously undefined, blocking reliable sprint planning.

**Analysis reference:** GAP-001

### Solution
Define a single-team operating model and capacity baseline.

**Implementation approach:**
1. Set Team Core as 1 Senior DevOps Engineer at 100% capacity.
2. Use 2-week sprints with 20 SP planning capacity.
3. Recalibrate after Sprint 1 using observed velocity.

### Impact
| Dimension | Expected effect | Rationale |
|----------|----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Internal-use project, no revenue model. |
| Risk Reduction | High | Removes planning ambiguity and prevents fictional estimates. |
| Cost | Low | No external spend required. |
| UX | Medium | Stable delivery cadence improves iteration quality. |

### Rationale
Now resolved by questionnaire answer `QR-001`.

### Dependencies
- Requires: Questionnaire answer `QR-001`
- Blocked by: None
- Depends on output of: Product Manager (for final sprint sizing)

### Risk of Not Implementing
Sprint plans remain unreliable and downstream commitments become unstable.

### Measurement Criterion
- KPI: Sprint predictability (planned SP vs completed SP)
- Baseline: INSUFFICIENT_DATA:
- Target: >= 80% completion ratio by Sprint 2
- Measurement method: Sprint board delta
- Time horizon: 4 weeks

## Recommendation REC-002

### Problem
Hosting strategy ambiguity could force architecture rework.

**Analysis reference:** GAP-003

### Solution
Lock architecture to localhost-first single-user mode for v1.

**Implementation approach:**
1. Record localhost-only as architectural constraint.
2. Defer cloud and multi-user capabilities to backlog.
3. Add an explicit non-goal section in technical overview.

### Impact
| Dimension | Expected effect | Rationale |
|----------|----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | No monetization target. |
| Risk Reduction | High | Prevents scope drift and overengineering. |
| Cost | Medium reduction | Avoids cloud setup and infra overhead. |
| UX | Medium | Faster delivery of polished local workflow. |

### Rationale
Resolved by questionnaire answer `QR-003`.

### Dependencies
- Requires: Questionnaire answer `QR-003`
- Blocked by: None
- Depends on output of: Software Architect (Phase 2)

### Risk of Not Implementing
Architecture may oscillate between local and cloud assumptions, delaying delivery.

### Measurement Criterion
- KPI: Scope-change count caused by hosting assumptions
- Baseline: INSUFFICIENT_DATA:
- Target: 0 hosting-related scope changes in Phase 2
- Measurement method: decisions + scope-change log
- Time horizon: End of Phase 2

## Recommendation REC-003

### Problem
UX objective is vague ("latest trends, best practices").

**Analysis reference:** GAP-002, UNC-002

### Solution
Translate UX objective into objective criteria and references.

**Implementation approach:**
1. Define UX acceptance rubric: clarity, speed, keyboard flow, visual hierarchy.
2. Select 2-3 benchmark references in Phase 3 kickoff.
3. Require UX stories to map to rubric criteria.

### Impact
| Dimension | Expected effect | Rationale |
|----------|----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Internal-only usage. |
| Risk Reduction | Medium | Reduces subjective rework loops. |
| Cost | Low | Documentation and review effort only. |
| UX | High | Improves consistency and decision speed. |

### Rationale
Questionnaire `QR-007` provides direction but still needs measurable rubric.

### Dependencies
- Requires: Questionnaire answer `QR-007`
- Blocked by: None
- Depends on output of: UX Researcher / UX Designer

### Risk of Not Implementing
"Stunning" remains subjective, leading to repeated redesign.

### Measurement Criterion
- KPI: UX acceptance pass rate on first review
- Baseline: INSUFFICIENT_DATA:
- Target: >= 70% first-pass by Sprint 3
- Measurement method: design review checklist outcomes
- Time horizon: 6 weeks

## Recommendation REC-004

### Problem
Timeline/budget context was unclear; now set to Q4 2026 and unlimited hours, but schedule control is still needed.

**Analysis reference:** GAP-004

### Solution
Establish milestone-based delivery governance for Q4 2026.

**Implementation approach:**
1. Set milestones: Phase 1 complete, Phase 2 complete, Phase 3 complete, Phase 4 complete.
2. Add date windows per milestone and weekly progress review.
3. Escalate if milestone slips by >1 week.

### Impact
| Dimension | Expected effect | Rationale |
|----------|----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Not applicable. |
| Risk Reduction | Medium | Controls schedule slip despite unlimited effort budget. |
| Cost | Low | Governance-only overhead. |
| UX | Low | Indirect impact via stable planning. |

### Rationale
Questionnaire `QR-004` removed budget cap ambiguity but not schedule governance.

### Dependencies
- Requires: Questionnaire answer `QR-004`
- Blocked by: None
- Depends on output of: Product Manager

### Risk of Not Implementing
Open-ended execution risks late completion despite high effort.

### Measurement Criterion
- KPI: Milestone on-time completion rate
- Baseline: INSUFFICIENT_DATA:
- Target: 100% Phase milestones on time (+/- 1 week)
- Measurement method: session-state phase timestamps
- Time horizon: Q4 2026

## Recommendation REC-005

### Problem
No formal compliance required, but license and accessibility drift still pose governance risk.

**Analysis reference:** GAP-005, RISK-004, RISK-005

### Solution
Keep lightweight governance: MIT-license checks + WCAG regression checks.

**Implementation approach:**
1. Add dependency license check in CI for newly introduced packages.
2. Add accessibility regression checks in UI test pipeline.
3. Gate PR merges on these checks.

### Impact
| Dimension | Expected effect | Rationale |
|----------|----------------|-----------|
| Revenue | INSUFFICIENT_DATA: | Internal-use platform. |
| Risk Reduction | High | Prevents legal and usability regressions. |
| Cost | Low | Incremental CI runtime cost only. |
| UX | Medium | Sustains accessibility quality over time. |

### Rationale
Questionnaire `QR-008` lowers compliance scope, but governance still required.

### Dependencies
- Requires: CI pipeline updates
- Blocked by: None
- Depends on output of: Senior Developer, Security Architect, Accessibility Specialist

### Risk of Not Implementing
Potential MIT-incompatible dependencies or degraded accessibility in future sprints.

### Measurement Criterion
- KPI: PR pass rate for license+a11y checks
- Baseline: INSUFFICIENT_DATA:
- Target: 100% required checks green before merge
- Measurement method: CI status checks
- Time horizon: Continuous (per sprint)

---

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint |
|-------------------|--------|--------|----------|--------|
| REC-001 | High | Low | P1 | Sprint 1 |
| REC-002 | High | Low | P1 | Sprint 1 |
| REC-003 | Medium | Medium | P2 | Sprint 2 |
| REC-004 | Medium | Low | P2 | Sprint 1 |
| REC-005 | High | Medium | P1 | Sprint 2 |

## HANDOFF CHECKLIST
- [x] All recommendations reference an analysis finding (GAP/RISK)
- [x] All impacts have rationale
- [x] All INSUFFICIENT_DATA: items are documented
- [x] Measurement criteria are SMART formulated
- [x] Priority matrix is fully completed
- [x] Dependencies are documented
- [x] No recommendations outside competence domain
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff context
- [x] Scope Change Impact section: NOT_APPLICABLE
- [x] JSON export is valid and complete

## JSON EXPORT
```json
{
  "metadata": {
    "agent": "Business Analyst (01)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_analysis": ".github/docs/phase-1/01-business-analyst-analysis.md",
    "mode": "CREATE"
  },
  "recommendations": [
    {"id":"REC-001","problem":"Team/capacity undefined","analysis_reference":["GAP-001"],"priority":"P1","effort":"Low","sprint":"Sprint 1"},
    {"id":"REC-002","problem":"Hosting strategy ambiguous","analysis_reference":["GAP-003"],"priority":"P1","effort":"Low","sprint":"Sprint 1"},
    {"id":"REC-003","problem":"UX objective vague","analysis_reference":["GAP-002","UNC-002"],"priority":"P2","effort":"Medium","sprint":"Sprint 2"},
    {"id":"REC-004","problem":"Timeline governance missing","analysis_reference":["GAP-004"],"priority":"P2","effort":"Low","sprint":"Sprint 1"},
    {"id":"REC-005","problem":"Governance regression risk","analysis_reference":["GAP-005","RISK-004","RISK-005"],"priority":"P1","effort":"Medium","sprint":"Sprint 2"}
  ],
  "priority_matrix": [
    {"id":"REC-001","impact":"High","effort":"Low","priority":"P1","sprint":"Sprint 1"},
    {"id":"REC-002","impact":"High","effort":"Low","priority":"P1","sprint":"Sprint 1"},
    {"id":"REC-003","impact":"Medium","effort":"Medium","priority":"P2","sprint":"Sprint 2"},
    {"id":"REC-004","impact":"Medium","effort":"Low","priority":"P2","sprint":"Sprint 1"},
    {"id":"REC-005","impact":"High","effort":"Medium","priority":"P1","sprint":"Sprint 2"}
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
