# Guardrails – Financial – 2026-03-09

## Metadata

- Agent: Financial Analyst (04)
- Phase: 1
- Date: 2026-03-09
- Based on analysis: `.github/docs/phase-1/04-financial-analyst-analysis.md`
- Mode: CREATE

## Guardrail G-FIN-401

### Title

Must Not Operate Without Monthly Labor-Burn Baseline

### Scope

- Applies to: Financial Analyst, Product Manager, Orchestrator
- Time horizon: Permanent

### Rule

Monthly sprint/program reporting must always include labor-burn baseline and
variance; reports without it are invalid.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-FIN-401`, block phase/sprint financial sign-off.

### Rationale

Mitigates GAP-401 and RISK-401.

### Verification Method

Monthly artifact presence + variance field completeness check.

## Guardrail G-FIN-402

### Title

Requires Financial KPI Cadence for Efficiency Claims

### Scope

- Applies to: Financial Analyst, KPI Agent
- Time horizon: Permanent

### Rule

Any claim of efficiency or cost improvement must reference a current monthly KPI
report; unverifiable claims must be tagged `UNCERTAIN:`.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-FIN-402`, reject claim from official report.

### Rationale

Mitigates GAP-402 and RISK-402.

### Verification Method

Report-to-claim traceability audit.

## Guardrail G-FIN-403

### Title

Must Keep Commercialization Trigger Model Up To Date

### Scope

- Applies to: Financial Analyst, Sales Strategist, Product Manager
- Time horizon: Until explicit decision to remain permanently non-commercial

### Rule

If external adoption intent changes, commercialization trigger model must be
updated before roadmap reprioritization.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-FIN-403`, freeze commercialization epics pending
update.

### Rationale

Mitigates GAP-403 and RISK-403.

### Verification Method

Scope-change gate check against trigger model timestamp.

## Guardrail Overview

| ID        | Title                                                | Scope               | Priority | Verification            |
| --------- | ---------------------------------------------------- | ------------------- | -------- | ----------------------- |
| G-FIN-401 | Must Not Operate Without Monthly Labor-Burn Baseline | financial reporting | Critical | monthly report check    |
| G-FIN-402 | Requires Financial KPI Cadence for Efficiency Claims | KPI governance      | High     | traceability audit      |
| G-FIN-403 | Must Keep Commercialization Trigger Model Up To Date | pivot readiness     | Medium   | scope-change gate check |

## HANDOFF CHECKLIST

- [x] All guardrails testable
- [x] Violation actions defined
- [x] Analysis references present
- [x] Verification method present
- [x] Overview complete
- [x] Scope change section NOT_APPLICABLE
- [x] JSON export valid

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Financial Analyst (04)",
    "phase": "1",
    "date": "2026-03-09",
    "based_on_analysis": ".github/docs/phase-1/04-financial-analyst-analysis.md",
    "mode": "CREATE"
  },
  "guardrails": [
    {
      "id": "G-FIN-401",
      "analysis_reference": ["GAP-401", "RISK-401"],
      "priority": "Critical"
    },
    {
      "id": "G-FIN-402",
      "analysis_reference": ["GAP-402", "RISK-402"],
      "priority": "High"
    },
    {
      "id": "G-FIN-403",
      "analysis_reference": ["GAP-403", "RISK-403"],
      "priority": "Medium"
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
