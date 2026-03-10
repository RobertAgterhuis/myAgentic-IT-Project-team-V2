# Guardrails – Senior Developer – 2026-03-10

## Metadata
- Agent: Senior Developer (06)
- Phase: 2
- Date: 2026-03-10
- Based on analysis: `.github/docs/phase-2/06-senior-developer-analysis.md`
- Mode: CREATE

## Guardrail G-SD-601

### Title
Route Layer Must Stay Adapter-Only

### Scope
- Applies to: Implementation Agent, Test Agent, PR/Review Agent for all Phase 5 CODE stories touching `.github/webapp/routes/`
- Time horizon: Permanent

### Rule
Route modules may not contain business-rule blocks larger than 20 LOC and may not directly perform persistence operations outside approved service/repository calls.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-601`, block merge, escalate to Senior Developer for boundary refactor decision.

### Rationale
Prevents architecture drift (RISK-601) and enforces component pattern blueprint (GAP-602).

### Verification Method
Code review checklist + static scan for direct `getStore().writeFile/readFile` usage in route modules.

---

## Guardrail G-SD-602

### Title
Coding Standards Checklist Required on Every PR

### Scope
- Applies to: All code and infra PRs
- Time horizon: Permanent

### Rule
Every PR must include completed coding standards checklist items (naming, error handling, logging, tests, maintainability) before approval.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-602`, reject PR review approval until checklist complete.

### Rationale
Addresses GAP-601 and reduces inconsistent implementation practices.

### Verification Method
PR template enforcement + reviewer sign-off required.

---

## Guardrail G-SD-603

### Title
Critical User Flows Must Have Automated E2E Coverage

### Scope
- Applies to: Release-bound branches and all PRs affecting UI/API behavior
- Time horizon: Permanent

### Rule
Progress dashboard load, questionnaire save flow, and decision update flow must always execute in automated e2e smoke tests in CI.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-603`, fail CI release gate, escalate to Senior Developer + DevOps Engineer.

### Rationale
Mitigates RISK-602 and closes GAP-603 testing blind spots.

### Verification Method
CI e2e smoke job with mandatory pass status.

---

## Guardrail G-SD-604

### Title
Security Scanning Gate Required for Merge

### Scope
- Applies to: All PRs to main
- Time horizon: Permanent (subject to Security Architect tool changes)

### Rule
Merge to `main` requires approved SAST scan with no unresolved High/Critical findings.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-604`, block merge, escalate unresolved findings through Security Architect.

### Rationale
Mitigates RISK-603 and addresses GAP-603 dependency on security test strategy.

### Verification Method
CI security job status + finding severity parser in PR checks.

---

## Guardrail G-SD-605

### Title
Dependency Changes Require Audit and License Evidence

### Scope
- Applies to: PRs changing `package.json` or lock files
- Time horizon: Permanent

### Rule
Any dependency add/update/removal must include vulnerability audit output and license classification evidence.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-605`, block merge; if non-permissive license detected, trigger `LICENSE_CHECK` escalation.

### Rationale
Addresses GAP-604 and mitigates RISK-604.

### Verification Method
Automated CI dependency scan + PR checklist artifact links.

---

## Guardrail G-SD-606

### Title
Maintainability Limits Must Be Enforced in CI

### Scope
- Applies to: All production JS files in `.github/webapp/`
- Time horizon: Permanent

### Rule
Files must remain <=350 LOC, functions <=60 LOC, and duplication above threshold (3 repeated blocks >15 LOC) is prohibited without debt exception record.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-606`, fail CI; allow temporary exception only with explicit debt ticket and target sprint for fix.

### Rationale
Mitigates RISK-605 and closes GAP-605/GAP-606.

### Verification Method
CI size/duplication checks + debt exception register audit.

---

## Guardrail G-SD-607

### Title
Coverage Thresholds May Not Regress

### Scope
- Applies to: All PRs affecting testable code
- Time horizon: Permanent

### Rule
Global coverage thresholds must not decrease from current baseline; critical module coverage may only increase or remain stable.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-607`, fail CI and require remediation plan in PR.

### Rationale
Prevents quality erosion and supports sustained regression protection (GAP-606).

### Verification Method
Vitest coverage gate + delta check against baseline artifact.

---

## Guardrail G-SD-608

### Title
Technical Debt Register Update Required Per Sprint

### Scope
- Applies to: Sprint retrospective artifacts for engineering sprints
- Time horizon: Permanent

### Rule
Each sprint must append debt metrics (complexity violations, flaky tests, coverage drift, open debt exceptions) to the technical debt register.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SD-608`, block sprint closure until debt entry is added or explicitly waived by Product Manager and Senior Developer.

### Rationale
Addresses GAP-606 and provides ongoing prevention against hidden debt growth.

### Verification Method
Retrospective checklist validation against debt log file.

---

## Guardrail Overview

| ID | Title | Scope | Priority | Verification |
|----|-------|-------|----------|-------------|
| G-SD-601 | Route Layer Must Stay Adapter-Only | Route modules | Critical | Static scan + review checklist |
| G-SD-602 | Coding Standards Checklist Required on Every PR | All code/infra PRs | High | PR template + reviewer sign-off |
| G-SD-603 | Critical User Flows Must Have Automated E2E Coverage | UI/API-changing PRs | Critical | CI e2e smoke job |
| G-SD-604 | Security Scanning Gate Required for Merge | All main-branch PRs | Critical | CI security job severity gate |
| G-SD-605 | Dependency Changes Require Audit and License Evidence | Dependency-change PRs | High | CI dependency audit + PR evidence |
| G-SD-606 | Maintainability Limits Must Be Enforced in CI | Production JS files | High | CI size/dup checks |
| G-SD-607 | Coverage Thresholds May Not Regress | All testable changes | High | Coverage gate + baseline delta check |
| G-SD-608 | Technical Debt Register Update Required Per Sprint | Sprint closure artifacts | Medium | Retrospective checklist audit |

## QUESTIONNAIRE_REQUEST
- `QUESTIONNAIRE_REQUEST: SD-G-601` – Confirm Security Architect-approved severity policy for SAST gate (High-only vs High+Critical).

## HANDOFF CHECKLIST
- [x] All guardrails are formulated as testable
- [x] All guardrails have a violation action
- [x] All guardrails have a rationale with source reference
- [x] All guardrails have a verification method
- [x] Overview table is complete
- [x] No duplicates with existing guardrails in `/.github/docs/guardrails/`
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff message
- [x] If cycle_type is SCOPE_CHANGE: Scope Change Impact section present as FIRST section (or NOT_APPLICABLE)
- [x] JSON export is valid

---

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Senior Developer (06)",
    "phase": "2",
    "date": "2026-03-10",
    "based_on_analysis": ".github/docs/phase-2/06-senior-developer-analysis.md",
    "mode": "CREATE"
  },
  "guardrails": [
    {
      "id": "G-SD-601",
      "title": "Route Layer Must Stay Adapter-Only",
      "scope": {
        "applies_to": ["Implementation Agent", "PR/Review Agent", "Route modules"],
        "time_horizon": "Permanent"
      },
      "rule": "Route modules may not contain business-rule blocks >20 LOC and may not perform direct persistence outside approved service/repository boundaries.",
      "violation_action": "Block merge and escalate for refactor decision",
      "rationale": "Mitigates RISK-601 and GAP-602",
      "analysis_reference": ["RISK-601", "GAP-602"],
      "verification_method": "Static route scan + code review checklist",
      "priority": "Critical"
    },
    {
      "id": "G-SD-602",
      "title": "Coding Standards Checklist Required on Every PR",
      "scope": {
        "applies_to": ["All code and infra PRs"],
        "time_horizon": "Permanent"
      },
      "rule": "Every PR must complete coding standards checklist before approval.",
      "violation_action": "Reject PR approval until checklist complete",
      "rationale": "Addresses GAP-601",
      "analysis_reference": ["GAP-601"],
      "verification_method": "PR template + reviewer sign-off",
      "priority": "High"
    },
    {
      "id": "G-SD-603",
      "title": "Critical User Flows Must Have Automated E2E Coverage",
      "scope": {
        "applies_to": ["UI/API-changing PRs"],
        "time_horizon": "Permanent"
      },
      "rule": "Progress, questionnaire save, and decision update flows must execute in CI e2e smoke suite.",
      "violation_action": "Fail CI and block release merge",
      "rationale": "Mitigates RISK-602 and closes GAP-603",
      "analysis_reference": ["RISK-602", "GAP-603"],
      "verification_method": "Mandatory CI e2e smoke job",
      "priority": "Critical"
    },
    {
      "id": "G-SD-604",
      "title": "Security Scanning Gate Required for Merge",
      "scope": {
        "applies_to": ["All main-branch PRs"],
        "time_horizon": "Permanent"
      },
      "rule": "Merge requires SAST pass with no unresolved blocking severity findings.",
      "violation_action": "Block merge and escalate to Security Architect",
      "rationale": "Mitigates RISK-603",
      "analysis_reference": ["RISK-603", "GAP-603"],
      "verification_method": "CI security scan severity gate",
      "priority": "Critical"
    },
    {
      "id": "G-SD-605",
      "title": "Dependency Changes Require Audit and License Evidence",
      "scope": {
        "applies_to": ["PRs modifying dependencies"],
        "time_horizon": "Permanent"
      },
      "rule": "Dependency change PRs must include vulnerability and license evidence.",
      "violation_action": "Block merge; trigger LICENSE_CHECK where applicable",
      "rationale": "Mitigates RISK-604 and addresses GAP-604",
      "analysis_reference": ["RISK-604", "GAP-604"],
      "verification_method": "CI dependency scan + checklist artifact validation",
      "priority": "High"
    },
    {
      "id": "G-SD-606",
      "title": "Maintainability Limits Must Be Enforced in CI",
      "scope": {
        "applies_to": ["Production JS modules"],
        "time_horizon": "Permanent"
      },
      "rule": "Files >350 LOC, functions >60 LOC, and duplication threshold breaches are blocked unless debt exception recorded.",
      "violation_action": "Fail CI; require debt exception record with fix sprint",
      "rationale": "Mitigates RISK-605 and closes GAP-605/GAP-606",
      "analysis_reference": ["RISK-605", "GAP-605", "GAP-606"],
      "verification_method": "CI size/duplication scripts + debt register check",
      "priority": "High"
    },
    {
      "id": "G-SD-607",
      "title": "Coverage Thresholds May Not Regress",
      "scope": {
        "applies_to": ["All testable code changes"],
        "time_horizon": "Permanent"
      },
      "rule": "Coverage thresholds and critical-module coverage may not decrease from baseline.",
      "violation_action": "Fail CI and require remediation plan",
      "rationale": "Prevents quality regression from GAP-606",
      "analysis_reference": ["GAP-606"],
      "verification_method": "Coverage baseline delta check",
      "priority": "High"
    },
    {
      "id": "G-SD-608",
      "title": "Technical Debt Register Update Required Per Sprint",
      "scope": {
        "applies_to": ["Sprint retrospectives"],
        "time_horizon": "Permanent"
      },
      "rule": "Each sprint must append debt metrics to technical debt register before sprint closure.",
      "violation_action": "Block sprint closure until debt entry exists or is waived",
      "rationale": "Addresses GAP-606 by forcing debt visibility",
      "analysis_reference": ["GAP-606"],
      "verification_method": "Retrospective checklist validation",
      "priority": "Medium"
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
