# Guardrails – Product Management – 2026-03-09

## Metadata

- Agent: Product Manager (34)
- Phase: 1
- Date: 2026-03-09
- Based on analysis: `.github/docs/phase-1/34-product-manager-analysis.md`
- Mode: CREATE

## Guardrail G-PM-3401

### Title

Must Maintain Full REC Traceability Before Sprint Commitment

### Scope

- Applies to: Product Manager, Orchestrator
- Time horizon: Permanent

### Rule

A sprint commitment must not be approved unless each P1/P2 recommendation is
mapped to an owner, dependency set, and readiness status.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-PM-3401`, block sprint commitment.

### Rationale

Mitigates GAP-3401.

### Verification Method

Pre-sprint traceability matrix gate check.

## Guardrail G-PM-3402

### Title

Requires Definition-of-Ready Gate for All P1/P2 Items

### Scope

- Applies to: Product Manager, Implementation pipeline gatekeepers
- Time horizon: Permanent

### Rule

Items marked P1/P2 must always pass DoR (owner, acceptance criteria, split
feasibility, blockers) before implementation scheduling.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-PM-3402`, return item to planning backlog.

### Rationale

Mitigates GAP-3402 and RISK-3402.

### Verification Method

DoR register audit before sprint start.

## Guardrail G-PM-3403

### Title

Must Enforce Internal-First Scope Gate

### Scope

- Applies to: Product Manager, Scope Change Agent, Orchestrator
- Time horizon: Until formal scope change approves external model

### Rule

External-facing feature proposals must not enter active roadmap without a logged
scope decision.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-PM-3403`, move proposal to hold status.

### Rationale

Mitigates RISK-3401.

### Verification Method

Roadmap intake check for scope-decision ID.

## Guardrail Overview

| ID        | Title                                                        | Scope                | Priority | Verification                |
| --------- | ------------------------------------------------------------ | -------------------- | -------- | --------------------------- |
| G-PM-3401 | Must Maintain Full REC Traceability Before Sprint Commitment | sprint governance    | Critical | pre-sprint matrix gate      |
| G-PM-3402 | Requires Definition-of-Ready Gate for All P1/P2 Items        | readiness governance | Critical | DoR audit                   |
| G-PM-3403 | Must Enforce Internal-First Scope Gate                       | scope governance     | High     | intake scope decision check |

## HANDOFF CHECKLIST

- [x] Testable guardrails
- [x] Violation actions present
- [x] Analysis references present
- [x] Verification methods present
- [x] Overview complete
- [x] Scope change section NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Product Manager (34)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_analysis": ".github/docs/phase-1/34-product-manager-analysis.md",
    "mode": "CREATE"
  },
  "guardrails": [
    {
      "id": "G-PM-3401",
      "analysis_reference": ["GAP-3401"],
      "priority": "Critical"
    },
    {
      "id": "G-PM-3402",
      "analysis_reference": ["GAP-3402", "RISK-3402"],
      "priority": "Critical"
    },
    {
      "id": "G-PM-3403",
      "analysis_reference": ["RISK-3401"],
      "priority": "High"
    }
  ],
  "handoff_checklist": {
    "all_testable": true,
    "all_have_violation_action": true,
    "all_have_rationale": true,
    "all_have_verification": true,
    "overview_complete": true,
    "scope_change_impact_present": "NOT_APPLICABLE",
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
