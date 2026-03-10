# Guardrails – Sales – 2026-03-09

## Metadata

- Agent: Sales Strategist (03)
- Phase: 1
- Date: 2026-03-09
- Based on analysis: `.github/docs/phase-1/03-sales-strategist-analysis.md`
- Mode: CREATE

## Guardrail G-SALES-301

### Title

Must Define Internal Decision Map Before Rollout Claims

### Scope

- Applies to: Sales Strategist, Product Manager, Orchestrator
- Time horizon: Permanent

### Rule

Team rollout readiness must not be declared until buyer/approver/user/blocker
roles are explicitly documented.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-SALES-301`, block readiness claim and escalate to
Orchestrator.

### Rationale

Mitigates GAP-301 and RISK-301.

### Verification Method

Checklist gate on phase/sprint readiness artifacts.

## Guardrail G-SALES-302

### Title

Must Track Funnel Stage Metrics Weekly

### Scope

- Applies to: Sales Strategist, KPI Agent, Product Manager
- Time horizon: Until stable team adoption (>=3 active users for 2 sprints)

### Rule

Internal adoption funnel stages must always be measured weekly; missing weekly
update invalidates adoption reporting.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-SALES-302`, mark KPI report incomplete.

### Rationale

Mitigates GAP-302 and RISK-301.

### Verification Method

Weekly KPI report presence and stage fields completeness check.

## Guardrail G-SALES-303

### Title

Requires Single Canonical Value Narrative

### Scope

- Applies to: Sales Strategist, Content Strategist, Product Manager
- Time horizon: Permanent

### Rule

Positioning statements in core docs must always align with the canonical
battlecard; contradictory claims may not be published.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-SALES-303`, block document sign-off.

### Rationale

Mitigates RISK-302.

### Verification Method

Monthly consistency scan across core docs and updates.

## Guardrail Overview

| ID          | Title                                                   | Scope                | Priority | Verification             |
| ----------- | ------------------------------------------------------- | -------------------- | -------- | ------------------------ |
| G-SALES-301 | Must Define Internal Decision Map Before Rollout Claims | rollout readiness    | Critical | readiness checklist      |
| G-SALES-302 | Must Track Funnel Stage Metrics Weekly                  | adoption analytics   | High     | weekly KPI check         |
| G-SALES-303 | Requires Single Canonical Value Narrative               | messaging governance | High     | monthly consistency scan |

## HANDOFF CHECKLIST

- [x] All guardrails are testable
- [x] All guardrails have violation actions
- [x] All guardrails have rationale references
- [x] All guardrails have verification methods
- [x] Overview table complete
- [x] Duplicate check done
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
  "guardrails": [
    {
      "id": "G-SALES-301",
      "title": "Must Define Internal Decision Map Before Rollout Claims",
      "analysis_reference": ["GAP-301", "RISK-301"],
      "priority": "Critical"
    },
    {
      "id": "G-SALES-302",
      "title": "Must Track Funnel Stage Metrics Weekly",
      "analysis_reference": ["GAP-302", "RISK-301"],
      "priority": "High"
    },
    {
      "id": "G-SALES-303",
      "title": "Requires Single Canonical Value Narrative",
      "analysis_reference": ["RISK-302"],
      "priority": "High"
    }
  ],
  "handoff_checklist": {
    "all_testable": true,
    "all_have_violation_action": true,
    "all_have_rationale": true,
    "all_have_verification": true,
    "overview_complete": true,
    "no_duplicates_with_existing": true,
    "scope_change_impact_present": "NOT_APPLICABLE",
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
