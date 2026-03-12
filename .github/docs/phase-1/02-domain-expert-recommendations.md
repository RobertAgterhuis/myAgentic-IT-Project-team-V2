# Recommendations – Domain – 2026-03-09

## Metadata

- Agent: Domain Expert (02)
- Phase: 1
- Based on analysis: `.github/docs/phase-1/02-domain-expert-analysis.md`
- Date: 2026-03-09
- Mode: CREATE

## Recommendation REC-201

### Problem

No normalized competitor comparison model exists.

**Analysis reference:** GAP-202

### Solution

Build a weighted competitor delta matrix focused on internal-first orchestration
differentiators.

**Implementation approach:**

1. Define 10 weighted capabilities (e.g., phase gates, audit trail, local-first,
   multi-agent sequencing).
2. Score Jira/Linear/Notion and manual stack against each capability.
3. Derive top 3 differentiators to prioritize in roadmap.

### Impact

| Dimension      | Expected effect    | Rationale                                                     |
| -------------- | ------------------ | ------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: | Internal-use project, no direct monetization target.          |
| Risk Reduction | High               | Prevents strategic drift toward feature parity race.          |
| Cost           | Low                | Analysis work only.                                           |
| UX             | Medium             | Clarifies where to invest UX effort for real differentiation. |

### Rationale

Directly mitigates weak prioritization risk found in GAP-202.

### Dependencies

- Requires: Domain + Product Manager collaboration
- Blocked by: None
- Depends on output of: Sales Strategist (positioning validation)

### Risk of Not Implementing

Roadmap may prioritize table-stakes instead of unique value.

### Measurement Criterion

- KPI: Differentiation coverage ratio
- Baseline: INSUFFICIENT_DATA:
- Target: top 3 roadmap epics explicitly tied to matrix
- Measurement method: epic-to-matrix traceability check
- Time horizon: 1 sprint

## Recommendation REC-202

### Problem

No formal data classification policy for logs/session/questionnaire artifacts.

**Analysis reference:** GAP-203, RISK-202

### Solution

Create lightweight data classification and handling policy for
repository-resident operational files.

**Implementation approach:**

1. Define classes: Public, Internal, Sensitive.
2. Map each file type (`session-state.json`, questionnaires, logs) to class.
3. Add handling rules (masking, retention, allowed fields).

### Impact

| Dimension      | Expected effect    | Rationale                                                     |
| -------------- | ------------------ | ------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: | Internal-use model.                                           |
| Risk Reduction | High               | Reduces accidental sensitive persistence and governance debt. |
| Cost           | Low                | Documentation + checklist update only.                        |
| UX             | Low                | Minimal direct UX impact.                                     |

### Rationale

Aligns with GDPR/ISO security principles without heavy compliance overhead.

### Dependencies

- Requires: Security Architect + Legal Counsel review in Phase 2
- Blocked by: None
- Depends on output of: Security Architect (08), Legal Counsel (33)

### Risk of Not Implementing

Policy ambiguity can produce avoidable compliance/security incidents.

### Measurement Criterion

- KPI: Policy coverage of operational file types
- Baseline: 0%
- Target: 100% mapped and documented
- Measurement method: policy artifact checklist
- Time horizon: 1 sprint

## Recommendation REC-203

### Problem

Single-user bias risks invalid assumptions for team adoption.

**Analysis reference:** RISK-203

### Solution

Run a structured 2-3 person internal pilot before broad process locking.

**Implementation approach:**

1. Identify two additional internal pilot users.
2. Run one full mini-cycle using Command Center.
3. Collect feedback with fixed rubric (friction points, clarity, confidence).

### Impact

| Dimension      | Expected effect    | Rationale                                         |
| -------------- | ------------------ | ------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: | No monetization model.                            |
| Risk Reduction | Medium             | Reduces bias and improves transferability.        |
| Cost           | Medium             | Requires coordination time from additional users. |
| UX             | High               | Directly improves usability for team rollout.     |

### Rationale

Prevents local optimization around one operator only.

### Dependencies

- Requires: Team availability (2 users)
- Blocked by: Team bandwidth
- Depends on output of: UX Researcher + Product Manager

### Risk of Not Implementing

Future adoption friction discovered too late.

### Measurement Criterion

- KPI: Pilot issue discovery count and closure rate
- Baseline: INSUFFICIENT_DATA:
- Target: >= 10 actionable findings, >= 80% resolved by next sprint
- Measurement method: issue tracker + closure status
- Time horizon: 2 sprints

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint   |
| ----------------- | ------ | ------ | -------- | -------- |
| REC-201           | High   | Low    | P1       | Sprint 1 |
| REC-202           | High   | Medium | P1       | Sprint 1 |
| REC-203           | Medium | Medium | P2       | Sprint 2 |

## HANDOFF CHECKLIST

- [x] All recommendations reference analysis findings
- [x] All impacts have rationale
- [x] INSUFFICIENT_DATA items documented
- [x] SMART measurement criteria included
- [x] Priority matrix complete
- [x] Dependencies documented
- [x] No out-of-domain recommendations
- [x] Scope change section: NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Domain Expert (02)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_analysis": ".github/docs/phase-1/02-domain-expert-analysis.md",
    "mode": "CREATE"
  },
  "recommendations": [
    {
      "id": "REC-201",
      "analysis_reference": ["GAP-202"],
      "priority": "P1",
      "effort": "Low",
      "sprint": "Sprint 1"
    },
    {
      "id": "REC-202",
      "analysis_reference": ["GAP-203", "RISK-202"],
      "priority": "P1",
      "effort": "Medium",
      "sprint": "Sprint 1"
    },
    {
      "id": "REC-203",
      "analysis_reference": ["RISK-203"],
      "priority": "P2",
      "effort": "Medium",
      "sprint": "Sprint 2"
    }
  ],
  "priority_matrix": [
    {
      "id": "REC-201",
      "impact": "High",
      "effort": "Low",
      "priority": "P1",
      "sprint": "Sprint 1"
    },
    {
      "id": "REC-202",
      "impact": "High",
      "effort": "Medium",
      "priority": "P1",
      "sprint": "Sprint 1"
    },
    {
      "id": "REC-203",
      "impact": "Medium",
      "effort": "Medium",
      "priority": "P2",
      "sprint": "Sprint 2"
    }
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
