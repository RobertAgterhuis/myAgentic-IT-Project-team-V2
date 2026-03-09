# Guardrails – Business – 2026-03-09

## Metadata
- Agent: Business Analyst (01)
- Phase: 1
- Date: 2026-03-09
- Based on analysis: `.github/docs/phase-1/01-business-analyst-analysis.md`
- Mode: CREATE

## Guardrail G-BUS-CREATE-001

### Title
No Sprint Planning Without Named Team Capacity

### Scope
- Applies to: Business Analyst, Product Manager, Orchestrator
- Time horizon: Permanent

### Rule
Sprint plans must not be approved unless team name, role composition, and capacity per sprint are explicitly documented from verified input.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-BUS-CREATE-001`, block handoff, escalate to Orchestrator.

### Rationale
Prevents recurrence of GAP-001 (team/capacity ambiguity).

### Verification Method
Manual contract check against sprint plan assumptions section.

---

## Guardrail G-BUS-CREATE-002

### Title
Hosting Constraint Must Be Declared Before Phase 2 Architecture

### Scope
- Applies to: Business Analyst, Software Architect, Orchestrator
- Time horizon: Until hosting strategy changes via formal scope change

### Rule
Phase 2 architecture work may not start until deployment mode is explicitly declared (localhost/internal/cloud) and logged in session-state and phase documents.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-BUS-CREATE-002`, pause Phase 2 start, escalate to Orchestrator.

### Rationale
Mitigates GAP-003 and avoids architecture rework.

### Verification Method
Startup gate check in session-state + architecture kickoff checklist.

---

## Guardrail G-BUS-CREATE-003

### Title
Subjective UX Terms Require Measurable Rubric

### Scope
- Applies to: Business Analyst, UX Researcher, UX Designer, Product Manager
- Time horizon: Permanent

### Rule
Terms such as "best UX" or "visually stunning" must always be translated into measurable acceptance criteria before design stories are approved.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-BUS-CREATE-003`, reject affected story until rubric linkage exists.

### Rationale
Mitigates GAP-002 and UNC-002 by enforcing objective UX criteria.

### Verification Method
Story review checklist requiring rubric mapping in acceptance criteria.

---

## Guardrail G-BUS-CREATE-004

### Title
Mandatory Quality Gates Cannot Be Skipped by Status Edits

### Scope
- Applies to: Orchestrator, PR/Review Agent, all phase agents
- Time horizon: Permanent

### Rule
A phase status transition must always require the expected validation artifacts (critic/risk outputs) and may not be accepted solely by manual session-state edits.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-BUS-CREATE-004`, revert transition, escalate for manual override decision.

### Rationale
Mitigates RISK-003 (quality gate bypass under time pressure).

### Verification Method
Automated pre-transition check in Command Center workflow.

---

## Guardrail G-BUS-CREATE-005

### Title
License and Accessibility Checks Required for UI/Dependency Changes

### Scope
- Applies to: Senior Developer, PR/Review Agent, Accessibility Specialist
- Time horizon: Permanent

### Rule
Any PR that introduces UI changes or new dependencies must include passing accessibility and license-compatibility checks before merge.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-BUS-CREATE-005`, block merge, escalate to PR/Review Agent.

### Rationale
Mitigates RISK-004 (license conflict) and RISK-005 (a11y drift).

### Verification Method
CI-required checks and PR template enforcement.

---

## Guardrail Overview

| ID | Title | Scope | Priority | Verification |
|----|-------|-------|----------|-------------|
| G-BUS-CREATE-001 | No Sprint Planning Without Named Team Capacity | Phase 1 planning artifacts | Critical | Manual contract check |
| G-BUS-CREATE-002 | Hosting Constraint Before Phase 2 | Phase 1 to 2 transition | High | Gate check in kickoff |
| G-BUS-CREATE-003 | Subjective UX Terms Need Rubric | UX story readiness | High | Story checklist |
| G-BUS-CREATE-004 | Quality Gates Cannot Be Skipped | All phase transitions | Critical | Workflow enforcement |
| G-BUS-CREATE-005 | License+a11y Checks Mandatory | PR merge workflow | High | CI required checks |

## HANDOFF CHECKLIST
- [x] All guardrails are formulated as testable
- [x] All guardrails have a violation action
- [x] All guardrails have a rationale with source reference
- [x] All guardrails have a verification method
- [x] Overview table is complete
- [x] No duplicates with existing guardrails in `.github/docs/guardrails/`
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff context
- [x] Scope Change Impact section: NOT_APPLICABLE
- [x] JSON export is valid

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
  "guardrails": [
    {"id":"G-BUS-CREATE-001","title":"No Sprint Planning Without Named Team Capacity","analysis_reference":["GAP-001"],"priority":"Critical"},
    {"id":"G-BUS-CREATE-002","title":"Hosting Constraint Must Be Declared Before Phase 2 Architecture","analysis_reference":["GAP-003"],"priority":"High"},
    {"id":"G-BUS-CREATE-003","title":"Subjective UX Terms Require Measurable Rubric","analysis_reference":["GAP-002","UNC-002"],"priority":"High"},
    {"id":"G-BUS-CREATE-004","title":"Mandatory Quality Gates Cannot Be Skipped by Status Edits","analysis_reference":["RISK-003"],"priority":"Critical"},
    {"id":"G-BUS-CREATE-005","title":"License and Accessibility Checks Required for UI/Dependency Changes","analysis_reference":["RISK-004","RISK-005"],"priority":"High"}
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
