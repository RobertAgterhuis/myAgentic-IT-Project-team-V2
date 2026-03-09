# Guardrails – Domain – 2026-03-09

## Metadata
- Agent: Domain Expert (02)
- Phase: 1
- Date: 2026-03-09
- Based on analysis: `.github/docs/phase-1/02-domain-expert-analysis.md`
- Mode: CREATE

## Guardrail G-DOM-201
### Title
Differentiation Integrity Guardrail
### Scope
- Applies to: Product Manager, Sales Strategist, Domain Expert
- Time horizon: Permanent
### Rule
Roadmap epics must always reference at least one documented differentiation capability; parity-only epics may not exceed 50% of the active sprint scope.
### Violation Action
Mark `GUARDRAIL_VIOLATION: G-DOM-201`, block epic approval, escalate to Orchestrator.
### Rationale
Mitigates RISK-201 (strategic drift).
### Verification Method
Quarterly roadmap audit using competitor matrix mapping.

## Guardrail G-DOM-202
### Title
Operational Data Classification Required
### Scope
- Applies to: Security Architect, Legal Counsel, PR/Review Agent
- Time horizon: Permanent
### Rule
Files containing runtime/session/questionnaire data must be classified (Public/Internal/Sensitive) before release; unclassified files may not be merged.
### Violation Action
Mark `GUARDRAIL_VIOLATION: G-DOM-202`, block merge.
### Rationale
Mitigates GAP-203 and RISK-202.
### Verification Method
CI lint/checklist gate on known file patterns.

## Guardrail G-DOM-203
### Title
Pilot Before Team-Scale Policy Freeze
### Scope
- Applies to: Product Manager, UX Researcher, Domain Expert
- Time horizon: Until team-scale rollout is approved
### Rule
No process policy may be marked FINAL for team rollout until at least one multi-user internal pilot is executed and findings reviewed.
### Violation Action
Mark `GUARDRAIL_VIOLATION: G-DOM-203`, downgrade policy status to DRAFT.
### Rationale
Mitigates RISK-203 (single-user bias).
### Verification Method
Pilot report existence check and review sign-off.

## Guardrail Overview
| ID | Title | Scope | Priority | Verification |
|----|-------|-------|----------|--------------|
| G-DOM-201 | Differentiation Integrity Guardrail | Roadmap/epics | Critical | Roadmap audit |
| G-DOM-202 | Operational Data Classification Required | Merge governance | High | CI check |
| G-DOM-203 | Pilot Before Team-Scale Policy Freeze | Process governance | High | Pilot report gate |

## HANDOFF CHECKLIST
- [x] Guardrails are testable
- [x] Violation action provided for each
- [x] Rationale references analysis findings
- [x] Verification method provided
- [x] Overview table complete
- [x] No duplicate conflict with existing global/business guardrails
- [x] Scope change section NOT_APPLICABLE
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
  "guardrails": [
    {"id":"G-DOM-201","title":"Differentiation Integrity Guardrail","analysis_reference":["RISK-201"],"priority":"Critical"},
    {"id":"G-DOM-202","title":"Operational Data Classification Required","analysis_reference":["GAP-203","RISK-202"],"priority":"High"},
    {"id":"G-DOM-203","title":"Pilot Before Team-Scale Policy Freeze","analysis_reference":["RISK-203"],"priority":"High"}
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
