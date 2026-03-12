# Recommendations – Senior Developer – 2026-03-10

## Metadata

- Agent: Senior Developer (06)
- Phase: 2
- Based on analysis: `.github/docs/phase-2/06-senior-developer-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

## Recommendation REC-601

### Problem

No canonical coding standards document exists, causing inconsistent conventions
and review churn.

**Analysis reference:** GAP-601

### Solution

Create and adopt `docs/engineering/coding-standards.md` and
`docs/engineering/code-review-checklist.md` as mandatory references.

**Implementation approach:**

1. Define conventions: naming, import ordering, file/function size limits, error
   contract, logging taxonomy.
2. Add PR template checkboxes referencing standards and checklist items.
3. Enforce with lint rules where feasible and review checks where lint is not
   feasible.

### Impact

| Dimension      | Expected effect   | Rationale                                                                      |
| -------------- | ----------------- | ------------------------------------------------------------------------------ |
| Revenue        | INSUFFICIENT_DATA | Internal platform; no direct revenue metric in current scope                   |
| Risk Reduction | High              | Reduces inconsistency and architecture drift introduction at review stage      |
| Cost           | Low               | Documentation + checklist setup is lightweight                                 |
| UX             | Medium positive   | More consistent error handling/logging improves operational troubleshooting UX |

### Rationale

Current standards are implicit in code only. Explicit standards reduce variance
and speed onboarding.

### Dependencies

- Requires: Existing lint config and route/module structure
- Blocked by: NONE
- Depends on output of: Software Architect (ADR baseline)

### Risk of Not Implementing

Short-term: higher review friction and inconsistent implementation style.
Long-term: compounded maintenance cost and weaker architecture adherence.

### Measurement Criterion

- KPI: Standards adoption rate
- Baseline: 0% (document absent)
- Target: 100% of PRs referencing checklist in Sprint 10
- Measurement method: PR template compliance audit
- Time horizon: End of Sprint 10

---

## Recommendation REC-602

### Problem

Pattern blueprint is not codified at implementation level, enabling
route-centric logic accumulation.

**Analysis reference:** GAP-602, RISK-601

### Solution

Define component pattern playbook with mandatory boundaries:

- Route Adapter layer: parsing, auth, response mapping only
- Service/Use-case layer: orchestration/business rules
- Repository layer: `Store` abstraction only

**Implementation approach:**

1. Publish `docs/engineering/pattern-blueprint.md` with allowed responsibilities
   per layer.
2. Add lint/review rule: route files may not call persistence directly except
   through service module.
3. Refactor top-risk route handlers to new service modules.

### Impact

| Dimension      | Expected effect   | Rationale                                             |
| -------------- | ----------------- | ----------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | Internal-only product stage                           |
| Risk Reduction | High              | Directly mitigates critical architecture drift risk   |
| Cost           | Medium            | Requires refactor and review guard updates            |
| UX             | Medium positive   | Fewer regressions from clearer separation of concerns |

### Rationale

Existing modular structure supports this transition with low disruption.

### Dependencies

- Requires: REC-601 standards document
- Blocked by: NONE
- Depends on output of: Software Architect ADR-001/ADR-003/ADR-004

### Risk of Not Implementing

Short-term: faster route-level code sprawl. Long-term: expensive
extraction/refactoring and increased defect density.

### Measurement Criterion

- KPI: Route purity ratio
- Baseline: INSUFFICIENT_DATA
- Target: >=90% of route files contain no business logic blocks over 20 LOC
- Measurement method: static review checklist + targeted grep lint
- Time horizon: End of Sprint 11

---

## Recommendation REC-603

### Problem

E2E and security test strategy is incomplete; critical flow regressions can
bypass CI.

**Analysis reference:** GAP-603, RISK-602, RISK-603

### Solution

Establish full test pyramid policy and add browser e2e + SAST gate.

**Implementation approach:**

1. Add `docs/testing/test-strategy.md` with ownership and pass criteria.
2. Implement e2e smoke suite for 3 critical flows:
   - Progress dashboard load
   - Questionnaire answer save flow
   - Decision creation/update flow
3. Integrate approved SAST tool once Security Architect confirms tool and
   thresholds.

### Impact

| Dimension      | Expected effect   | Rationale                                           |
| -------------- | ----------------- | --------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | Internal scope                                      |
| Risk Reduction | High              | Closes critical regression and security blind spots |
| Cost           | Medium            | Framework setup + maintenance + CI runtime increase |
| UX             | High positive     | Prevents user-facing workflow breaks                |

### Rationale

Coverage thresholds alone do not protect user journeys or security issues.

### Dependencies

- Requires: Security Architect decision for SAST tool/severity gates
- Blocked by: `DEPENDENT_ON: Security Architect`
- Depends on output of: Software Architect NFR/test recommendations

### Risk of Not Implementing

Short-term: production regressions in critical flows. Long-term: trust erosion
and brittle delivery cadence.

### Measurement Criterion

- KPI: Critical flow e2e coverage
- Baseline: 0 automated critical flows
- Target: 3 critical flows automated and running on each PR
- Measurement method: e2e CI job pass + suite count
- Time horizon: End of Sprint 11

---

## Recommendation REC-604

### Problem

Dependency update/vulnerability/license governance is not operationalized in
engineering workflow.

**Analysis reference:** GAP-604, RISK-604

### Solution

Implement dependency governance policy with explicit cadence, approval, and
scanning gates.

**Implementation approach:**

1. Publish `docs/engineering/dependency-governance.md` (cadence, owners,
   severity thresholds).
2. Add automated dependency audit job (weekly + on PR dependency change).
3. Add mandatory legal review path for non-permissive licenses (`LICENSE_CHECK`
   handoff).

### Impact

| Dimension      | Expected effect   | Rationale                                          |
| -------------- | ----------------- | -------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | Internal platform                                  |
| Risk Reduction | High              | Reduces supply-chain and legal exposure            |
| Cost           | Low               | Policy + CI checks are lightweight                 |
| UX             | Low positive      | Improved reliability from safer dependency updates |

### Rationale

Current runtime dependency count is low, so policy can be introduced with
minimal cost.

### Dependencies

- Requires: Legal Counsel license policy alignment
- Blocked by: NONE
- Depends on output of: Software Architect LCHECK items

### Risk of Not Implementing

Short-term: ad-hoc updates with unknown exposure. Long-term: compliance
incidents and emergency patching overhead.

### Measurement Criterion

- KPI: Dependency governance compliance
- Baseline: 0 documented policy checks
- Target: 100% dependency change PRs include audit + license evidence
- Measurement method: PR checklist audit and CI artifact presence
- Time horizon: End of Sprint 10

---

## Recommendation REC-605

### Problem

Maintainability limits are incomplete and CI debt gates are weak.

**Analysis reference:** GAP-605, GAP-606, RISK-605

### Solution

Strengthen maintainability controls and debt trend gating.

**Implementation approach:**

1. Add limits: max file length 350 LOC, max function length 60 LOC, duplication
   threshold (max 3 identical blocks >15 LOC).
2. Add CI scripts for size and duplication checks (warn in Sprint 10, fail in
   Sprint 11 onward).
3. Add quarterly debt register update policy in sprint retrospectives.

### Impact

| Dimension      | Expected effect   | Rationale                                             |
| -------------- | ----------------- | ----------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | Internal use                                          |
| Risk Reduction | Medium            | Reduces maintainability decay and defect leakage      |
| Cost           | Medium            | Requires incremental cleanup and tooling              |
| UX             | Medium positive   | More stable behavior due to simpler maintainable code |

### Rationale

Existing complexity cap is good but insufficient on its own.

### Dependencies

- Requires: REC-601 coding standards publication
- Blocked by: NONE
- Depends on output of: Senior Developer analysis

### Risk of Not Implementing

Short-term: growth in hidden debt and review load. Long-term: sustained velocity
degradation and rework-heavy sprints.

### Measurement Criterion

- KPI: Maintainability compliance score
- Baseline: INSUFFICIENT_DATA
- Target: >=90% of files compliant with size/function limits by Sprint 11
- Measurement method: CI size/duplication report
- Time horizon: End of Sprint 11

---

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint       |
| ----------------- | ------ | ------ | -------- | ------------ |
| REC-601           | High   | Low    | P1       | Sprint 10    |
| REC-602           | High   | Medium | P1       | Sprint 10-11 |
| REC-603           | High   | Medium | P1       | Sprint 11    |
| REC-604           | High   | Low    | P1       | Sprint 10    |
| REC-605           | Medium | Medium | P2       | Sprint 11    |

## Priority Rationale

- REC-601 is P1 because it is a prerequisite for enforceable review quality.
- REC-602 is P1 because it mitigates Critical risk RISK-601.
- REC-603 is P1 because it addresses Critical/High testing and security
  exposure.
- REC-604 is P1 because supply-chain/legal risk can block delivery unexpectedly.
- REC-605 is P2 because it is strategic debt prevention with medium immediate
  severity.

## QUESTIONNAIRE_REQUEST

- `QUESTIONNAIRE_REQUEST: SD-Q-601` – Security Architect to confirm SAST/DAST
  tool + blocking severities.
- `QUESTIONNAIRE_REQUEST: SD-Q-602` – Confirm acceptable CI runtime increase
  threshold for e2e/security jobs.

## HANDOFF CHECKLIST

- [x] All recommendations reference an analysis finding (GAP/RISK/CS/DESIGN ID)
- [x] All impacts have rationale (no empty cells)
- [x] All INSUFFICIENT_DATA: items are documented
- [x] Measurement criteria are SMART formulated
- [x] Priority matrix is fully completed
- [x] Dependencies are documented
- [x] No recommendations outside competence domain
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff
      message
- [x] If cycle_type is SCOPE_CHANGE: Scope Change Impact section present as
      FIRST section (or NOT_APPLICABLE)
- [x] JSON export is valid and complete

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
  "recommendations": [
    {
      "id": "REC-601",
      "problem": "Missing canonical coding standards document",
      "analysis_reference": ["GAP-601"],
      "solution": {
        "description": "Create mandatory coding standards and review checklist artifacts",
        "steps": [
          "Define naming/structure/error/logging standards",
          "Add PR checklist references",
          "Align lint/review enforcement"
        ]
      },
      "impact": {
        "revenue": "INSUFFICIENT_DATA",
        "risk_reduction": "High",
        "cost": "Low",
        "ux": "Medium positive",
        "rationale": "Improves consistency and reduces review churn"
      },
      "rationale": "Explicit rules reduce implementation variance",
      "dependencies": {
        "requires": ["Existing ESLint baseline"],
        "blocked_by": [],
        "depends_on_agent": ["Software Architect"]
      },
      "risk_of_not_implementing": "Inconsistent code style and rising maintenance overhead",
      "measurement": {
        "kpi": "Standards adoption rate",
        "baseline": "0%",
        "target": "100% PR checklist compliance",
        "method": "PR template audit",
        "horizon": "Sprint 10"
      },
      "priority": "P1",
      "effort": "Low",
      "sprint": "Sprint 10"
    },
    {
      "id": "REC-602",
      "problem": "No explicit code pattern blueprint per component",
      "analysis_reference": ["GAP-602", "RISK-601"],
      "solution": {
        "description": "Define and enforce route/service/repository boundaries",
        "steps": [
          "Publish pattern blueprint",
          "Add review/lint boundary checks",
          "Refactor high-risk route handlers"
        ]
      },
      "impact": {
        "revenue": "INSUFFICIENT_DATA",
        "risk_reduction": "High",
        "cost": "Medium",
        "ux": "Medium positive",
        "rationale": "Directly reduces architecture drift"
      },
      "rationale": "Current modular base allows low-friction boundary enforcement",
      "dependencies": {
        "requires": ["REC-601"],
        "blocked_by": [],
        "depends_on_agent": ["Software Architect"]
      },
      "risk_of_not_implementing": "Route-centric coupling and expensive refactors",
      "measurement": {
        "kpi": "Route purity ratio",
        "baseline": "INSUFFICIENT_DATA",
        "target": ">=90% route files without business logic blocks >20 LOC",
        "method": "Static review/lint checks",
        "horizon": "Sprint 11"
      },
      "priority": "P1",
      "effort": "Medium",
      "sprint": "Sprint 10-11"
    },
    {
      "id": "REC-603",
      "problem": "E2E and security test strategy incomplete",
      "analysis_reference": ["GAP-603", "RISK-602", "RISK-603"],
      "solution": {
        "description": "Implement critical flow e2e and SAST gate strategy",
        "steps": [
          "Publish test strategy doc",
          "Automate 3 critical e2e flows",
          "Integrate approved SAST tool"
        ]
      },
      "impact": {
        "revenue": "INSUFFICIENT_DATA",
        "risk_reduction": "High",
        "cost": "Medium",
        "ux": "High positive",
        "rationale": "Covers workflow regressions and security blind spots"
      },
      "rationale": "Coverage thresholds alone cannot validate user journeys/security",
      "dependencies": {
        "requires": ["Security tool decision"],
        "blocked_by": ["DEPENDENT_ON: Security Architect"],
        "depends_on_agent": ["Security Architect", "Software Architect"]
      },
      "risk_of_not_implementing": "Critical regressions and security gaps in production",
      "measurement": {
        "kpi": "Critical flow e2e coverage",
        "baseline": "0",
        "target": "3 critical flows on every PR",
        "method": "CI e2e job suite count and pass rate",
        "horizon": "Sprint 11"
      },
      "priority": "P1",
      "effort": "Medium",
      "sprint": "Sprint 11"
    },
    {
      "id": "REC-604",
      "problem": "Dependency governance not operationalized",
      "analysis_reference": ["GAP-604", "RISK-604"],
      "solution": {
        "description": "Create dependency governance policy and CI gates",
        "steps": [
          "Publish governance policy",
          "Automate vulnerability/license checks",
          "Require legal path for non-permissive licenses"
        ]
      },
      "impact": {
        "revenue": "INSUFFICIENT_DATA",
        "risk_reduction": "High",
        "cost": "Low",
        "ux": "Low positive",
        "rationale": "Prevents supply-chain/legal incidents"
      },
      "rationale": "Low dependency count makes policy adoption easy now",
      "dependencies": {
        "requires": ["Legal policy alignment"],
        "blocked_by": [],
        "depends_on_agent": ["Legal Counsel"]
      },
      "risk_of_not_implementing": "Higher chance of security/license incidents",
      "measurement": {
        "kpi": "Dependency governance compliance",
        "baseline": "0 documented checks",
        "target": "100% dependency change PRs include audit evidence",
        "method": "PR checklist + CI artifacts",
        "horizon": "Sprint 10"
      },
      "priority": "P1",
      "effort": "Low",
      "sprint": "Sprint 10"
    },
    {
      "id": "REC-605",
      "problem": "Maintainability thresholds incomplete",
      "analysis_reference": ["GAP-605", "GAP-606", "RISK-605"],
      "solution": {
        "description": "Add maintainability size/duplication limits and debt trend gates",
        "steps": [
          "Define thresholds",
          "Introduce CI size/dup checks",
          "Track debt register in retrospectives"
        ]
      },
      "impact": {
        "revenue": "INSUFFICIENT_DATA",
        "risk_reduction": "Medium",
        "cost": "Medium",
        "ux": "Medium positive",
        "rationale": "Reduces decay and long-term instability"
      },
      "rationale": "Complexity cap alone is insufficient for maintainability",
      "dependencies": {
        "requires": ["REC-601"],
        "blocked_by": [],
        "depends_on_agent": ["Senior Developer"]
      },
      "risk_of_not_implementing": "Compounding debt and slower delivery",
      "measurement": {
        "kpi": "Maintainability compliance score",
        "baseline": "INSUFFICIENT_DATA",
        "target": ">=90% file/function limit compliance",
        "method": "CI report",
        "horizon": "Sprint 11"
      },
      "priority": "P2",
      "effort": "Medium",
      "sprint": "Sprint 11"
    }
  ],
  "priority_matrix": [
    {
      "id": "REC-601",
      "impact": "High",
      "effort": "Low",
      "priority": "P1",
      "sprint": "Sprint 10"
    },
    {
      "id": "REC-602",
      "impact": "High",
      "effort": "Medium",
      "priority": "P1",
      "sprint": "Sprint 10-11"
    },
    {
      "id": "REC-603",
      "impact": "High",
      "effort": "Medium",
      "priority": "P1",
      "sprint": "Sprint 11"
    },
    {
      "id": "REC-604",
      "impact": "High",
      "effort": "Low",
      "priority": "P1",
      "sprint": "Sprint 10"
    },
    {
      "id": "REC-605",
      "impact": "Medium",
      "effort": "Medium",
      "priority": "P2",
      "sprint": "Sprint 11"
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
    "mode_consistent": "true",
    "json_valid": true,
    "ready_for_handoff": true
  }
}
```
