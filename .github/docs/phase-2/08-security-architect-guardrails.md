# Guardrails – Security Architect – 2026-03-10

## Metadata
- Agent: Security Architect (08)
- Phase: 2
- Date: 2026-03-10
- Based on analysis: `.github/docs/phase-2/08-security-architect-analysis.md`
- Mode: CREATE

## Guardrail G-SEC-801

### Title
No non-loopback exposure without active authentication

### Scope
- Applies to: runtime configuration, deployment workflows, startup scripts
- Time horizon: permanent

### Rule
Must not bind service to non-loopback interfaces in deployed environments unless authentication mode is enabled and validated.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-SEC-801`, block release, escalate to Orchestrator.

### Rationale
Addresses `GAP-801`, `RISK-801`.

### Verification Method
CI deployment policy check + runtime startup assertion in smoke tests.

---

## Guardrail G-SEC-802

### Title
Endpoint authorization mapping is mandatory

### Scope
- Applies to: API route modules and route registration
- Time horizon: permanent

### Rule
Every non-public endpoint must declare required role/permission and include deny-path tests.

### Violation Action
Block merge and require authorization mapping update.

### Rationale
Addresses `GAP-802`, `RISK-802`.

### Verification Method
Policy matrix lint + integration tests per endpoint category.

---

## Guardrail G-SEC-803

### Title
Security scan coverage floor

### Scope
- Applies to: CI workflows (`pull_request`, `push`, release)
- Time horizon: permanent

### Rule
CI security gates must include secret scan, SAST, SCA, DAST, and container scan with approved fail thresholds.

### Violation Action
Block merge/release and create remediation ticket in sprint backlog.

### Rationale
Addresses `GAP-803`, `GAP-806`, `RISK-803`, `RISK-806`.

### Verification Method
Workflow policy linter verifies required jobs and threshold config.

---

## Guardrail G-SEC-804

### Title
Rate limiting on operational endpoints

### Scope
- Applies to: API endpoints handling mutable operations and heavy reads
- Time horizon: permanent

### Rule
Write endpoints must enforce rate limiting and return `429` when thresholds are exceeded.

### Violation Action
Reject deployment artifact and require abuse-prevention test coverage.

### Rationale
Addresses `GAP-804`, `RISK-804`.

### Verification Method
Automated load tests in CI against configured limits.

---

## Guardrail G-SEC-805

### Title
No secrets in code, logs, or persisted user text without warning controls

### Scope
- Applies to: source code, request handling, logging pipeline, persisted documents
- Time horizon: permanent

### Rule
Hardcoded secrets are prohibited; runtime secret pattern detection and CI secret scans must remain enabled.

### Violation Action
Block merge and rotate/revoke exposed credentials before continuation.

### Rationale
Addresses `SECURITY_FLAG AUTH-003`, `RISK-806`.

### Verification Method
TruffleHog CI pass, code review checklist, and runtime secret-warning test.

---

## Guardrail G-SEC-806

### Title
Data classification required before privacy-sensitive policy finalization

### Scope
- Applies to: data protection design, retention policy, redaction logic
- Time horizon: until Data Architect + Legal Counsel outputs are complete, then permanent enforcement

### Rule
Retention, deletion, and redaction controls must not be marked complete before approved data classification matrix exists.

### Violation Action
Mark story `BLOCKED` and escalate to Orchestrator with external dependency tag.

### Rationale
Addresses `GAP-805`, `RISK-805`.

### Verification Method
Cross-check sprint completion against approved classification artifact.

## Guardrail Overview

| ID | Title | Scope | Priority | Verification |
|----|-------|-------|----------|--------------|
| G-SEC-801 | No non-loopback exposure without active authentication | Runtime/deploy | Critical | CI + smoke tests |
| G-SEC-802 | Endpoint authorization mapping is mandatory | API routes | High | Matrix lint + tests |
| G-SEC-803 | Security scan coverage floor | CI workflows | Critical | Workflow policy lint |
| G-SEC-804 | Rate limiting on operational endpoints | API layer | High | Load tests |
| G-SEC-805 | No secrets in code/logs/persisted text | Code/log pipeline | Critical | Secret scan + tests |
| G-SEC-806 | Data classification required for privacy controls | Data protection | High | Artifact dependency check |

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
