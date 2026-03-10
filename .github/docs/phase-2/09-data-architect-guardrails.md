# Guardrails – Data Architect – 2026-03-10

## Metadata
- Agent: Data Architect (09)
- Phase: 2
- Date: 2026-03-10
- Based on analysis: `.github/docs/phase-2/09-data-architect-analysis.md`
- Mode: CREATE

## Guardrail G-DATA-901

### Title
Data classification required before retention automation

### Scope
- Applies to: data policy artifacts, retention/redaction implementation stories
- Time horizon: permanent

### Rule
Must not finalize retention/deletion automation until approved entity-level classification matrix is present.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-DATA-901`, block handoff of affected stories, escalate to Orchestrator.

### Rationale
Prevents privacy-control failures from `GAP-902`, `RISK-901`.

### Verification Method
Pre-merge checklist validates classification artifact reference in policy/code PRs.

---

## Guardrail G-DATA-902

### Title
Schema changes require versioning and compatibility tests

### Scope
- Applies to: JSON entity schemas, parsers, model transformation logic
- Time horizon: permanent

### Rule
Must always include schema version updates and backward-compatibility tests when modifying persisted entity contracts.

### Violation Action
Block merge and create remediation issue linked to changed schema file.

### Rationale
Mitigates `GAP-903`, `RISK-902`.

### Verification Method
CI checks for version increment + migration test coverage on schema/model diffs.

---

## Guardrail G-DATA-903

### Title
Scheduled integrity validation is mandatory

### Scope
- Applies to: CI workflows and data validation utilities
- Time horizon: permanent

### Rule
Requires nightly integrity workflow validating schema conformance, markdown parseability, and cross-file consistency.

### Violation Action
Raise `CRITICAL_FINDING` and open blocker in current sprint backlog.

### Rationale
Prevents silent corruption from `GAP-904`, `RISK-903`.

### Verification Method
Workflow history audit confirms at least one successful run every 24 hours.

---

## Guardrail G-DATA-904

### Title
Every governed data domain must have a named owner

### Scope
- Applies to: data dictionary, governance docs, sprint plans
- Time horizon: permanent

### Rule
Must not introduce new persistent data domain without assigning owner and stewardship role.

### Violation Action
Mark story blocked until owner assignment is documented.

### Rationale
Addresses governance risk from `GAP-901`, `RISK-904`.

### Verification Method
Data dictionary review checks owner fields for each domain entry.

---

## Guardrail G-DATA-905

### Title
Dashboard KPI metrics require catalog lineage

### Scope
- Applies to: dashboard metric routes, KPI documentation
- Time horizon: permanent

### Rule
Must map each dashboard KPI to catalog definition including formula, source files, and owner.

### Violation Action
Reject metric changes until catalog mapping is added.

### Rationale
Mitigates semantic drift in `GAP-906`, `RISK-905`.

### Verification Method
PR checklist and lint rule confirm KPI ID references in changed metric code.

## Guardrail Overview

| ID | Title | Scope | Priority | Verification |
|----|-------|-------|----------|--------------|
| G-DATA-901 | Data classification required before retention automation | Data policy + implementation | Critical | Artifact dependency check |
| G-DATA-902 | Schema changes require versioning and compatibility tests | Schemas/models | High | CI version/migration check |
| G-DATA-903 | Scheduled integrity validation is mandatory | CI workflows | Critical | Nightly run audit |
| G-DATA-904 | Every governed data domain must have a named owner | Governance docs | High | Data dictionary owner review |
| G-DATA-905 | Dashboard KPI metrics require catalog lineage | Analytics routes/docs | High | PR mapping checklist |

## HANDOFF CHECKLIST
- [x] All guardrails are formulated as testable
- [x] All guardrails have a violation action
- [x] All guardrails have a rationale with source reference
- [x] All guardrails have a verification method
- [x] Overview table is complete
- [x] No duplicates with existing guardrails in `/.github/docs/guardrails/`
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff message
- [x] Scope Change Impact section: NOT_APPLICABLE
- [x] JSON export is valid
