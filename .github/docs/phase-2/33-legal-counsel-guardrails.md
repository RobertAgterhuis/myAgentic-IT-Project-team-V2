# Guardrails – Legal / Privacy Counsel – 2026-03-10

## Metadata

- Agent: Legal / Privacy Counsel (33)
- Phase: 2
- Date: 2026-03-10
- Based on analysis: `.github/docs/phase-2/33-legal-counsel-analysis.md`
- Mode: CREATE

## Guardrail G-LEGAL-3301

### Title

Statutory source requirement for legal claims

### Scope

- Applies to: legal analysis, recommendations, compliance statements
- Time horizon: permanent

### Rule

Must not assert compliance status or legal risk conclusions without explicit
statutory or official guidance citation.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-LEGAL-3301`; block handoff until source citation is
added.

### Rationale

Prevents unsupported legal conclusions (`GAP-3301` governance quality).

### Verification Method

Manual legal review checklist verifies article/guidance references for each
legal claim.

---

## Guardrail G-LEGAL-3302

### Title

Retention policy prerequisite for data lifecycle automation

### Scope

- Applies to: retention/deletion/redaction implementation and policy docs
- Time horizon: permanent

### Rule

Must always define and approve legal retention windows before enabling automated
retention/deletion controls.

### Violation Action

Block related implementation stories; escalate to Orchestrator as unresolved
legal dependency.

### Rationale

Addresses `GAP-3304`, `RISK-3301`.

### Verification Method

Policy artifact audit confirms approved retention matrix and owner sign-off.

---

## Guardrail G-LEGAL-3303

### Title

License policy gate before dependency intake

### Scope

- Applies to: dependency additions and CI gates
- Time horizon: permanent

### Rule

Requires validated license inventory and policy gate before accepting new
third-party dependencies.

### Violation Action

Fail merge and require legal review record for dependency change.

### Rationale

Mitigates `GAP-3303`, `RISK-3302`.

### Verification Method

CI checks for dependency-license inventory update and policy compliance.

---

## Guardrail G-LEGAL-3304

### Title

Mandatory lawful-basis and disclosure mapping for processing activities

### Scope

- Applies to: privacy documentation and processing activity records
- Time horizon: permanent

### Rule

Must map each processing activity to lawful basis (Art. 6) and disclosure fields
(Art. 13/14) before release readiness sign-off.

### Violation Action

Block release readiness status; create compliance blocker issue.

### Rationale

Addresses `GAP-3302`, `RISK-3303`.

### Verification Method

Processing activity matrix completeness review.

---

## Guardrail G-LEGAL-3305

### Title

Vendor legal checklist enforcement for new processors

### Scope

- Applies to: vendor/service onboarding
- Time horizon: permanent

### Rule

Must not onboard a third-party processor without completed DPA/SLA/portability
checklist and legal approval.

### Violation Action

Flag onboarding as invalid and escalate to Orchestrator for decision hold.

### Rationale

Addresses `GAP-3305`, `RISK-3304`.

### Verification Method

Vendor intake audit verifies checklist artifact and approval metadata.

## Overlap Check

- `G-LEGAL-3301`: Supplement to `.github/docs/guardrails/07-legal-guardrails.md`
  `G-LEG-01`.
- `G-LEGAL-3302`: New, complements Security/Data guardrails on
  classification/retention.
- `G-LEGAL-3303`: Supplement to legal license controls; no conflict detected.
- `G-LEGAL-3304`: New, aligns with GDPR requirements and Security findings.
- `G-LEGAL-3305`: New, complements DevOps future vendor governance path.

## Guardrail Overview

| ID           | Title                                                  | Scope                 | Priority | Verification             |
| ------------ | ------------------------------------------------------ | --------------------- | -------- | ------------------------ |
| G-LEGAL-3301 | Statutory source requirement for legal claims          | Legal documentation   | Critical | Legal source checklist   |
| G-LEGAL-3302 | Retention policy prerequisite for lifecycle automation | Data lifecycle policy | Critical | Retention artifact audit |
| G-LEGAL-3303 | License policy gate before dependency intake           | Dependency governance | High     | CI policy check          |
| G-LEGAL-3304 | Lawful-basis and disclosure mapping mandatory          | Privacy documentation | High     | Processing matrix review |
| G-LEGAL-3305 | Vendor legal checklist enforcement                     | Vendor onboarding     | High     | Intake audit             |

## HANDOFF CHECKLIST

- [x] All guardrails are testable
- [x] All guardrails have violation actions
- [x] All guardrails reference analysis findings
- [x] All guardrails include verification methods
- [x] Overlap check completed against existing legal guardrails
- [x] Scope Change Impact: NOT_APPLICABLE
- [x] Output ready for Critic/Risk handoff
