# Recommendations – Security Architect – 2026-03-10

## Metadata
- Agent: Security Architect (08)
- Phase: 2
- Based on analysis: `.github/docs/phase-2/08-security-architect-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

## Recommendation REC-801

### Problem
Authentication is undefined (`GAP-801`) and expansion risk is high (`RISK-801`).
**Analysis reference:** `GAP-801`, `RISK-801`, `SECURITY_FLAG AUTH-001`

### Solution
Define and implement a minimal authentication architecture before any non-loopback exposure.

**Implementation approach:**
1. Introduce security ADR selecting default auth mode: `localhost-no-login` for current scope, `OIDC-required` for any non-loopback environment.
2. Add route-level auth enforcement abstraction in request dispatch with explicit allowlist for public endpoints (`/api/health` only).
3. Add CI policy check that fails if deployment target is non-loopback without auth mode enabled.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal tool; no direct revenue baseline provided |
| Risk Reduction | High | Eliminates uncontrolled exposure path |
| Cost | Low-Medium | Mostly design/policy + targeted implementation |
| UX | Low impact in localhost mode; controlled login impact in future | Split-mode policy avoids unnecessary friction now |

### Rationale
Security-by-design with staged controls keeps current workflow simple while preventing unsafe deployment drift.

### Dependencies
- Requires: `REC-802`, `REC-806`
- Blocked by: none for design; partial implementation depends on roadmap decision (`SEC-Q-801`)
- Depends on output of: DevOps Engineer, Senior Developer

### Risk of Not Implementing
Future environment expansion can expose privileged operations without identity assurance.

### Measurement Criterion
- KPI: Auth policy coverage
- Baseline: 0 protected routes
- Target: 100% non-public routes protected when non-loopback mode is enabled
- Measurement method: automated route policy test in CI
- Time horizon: by end of Sprint 11

---

## Recommendation REC-802

### Problem
Authorization model and permission matrix are absent (`GAP-802`, `RISK-802`).
**Analysis reference:** `GAP-802`, `RISK-802`, `SECURITY_FLAG AUTH-002`

### Solution
Create a role and permission matrix with route-level authorization requirements.

**Implementation approach:**
1. Define roles (`platform-admin`, `operator`, `viewer`) and operation-level permissions.
2. Map each API endpoint to minimum required role.
3. Add authorization unit tests validating allow/deny behavior for each endpoint group.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | No monetization model |
| Risk Reduction | High | Prevents over-privileged operations |
| Cost | Medium | Requires policy matrix + tests |
| UX | Medium | Clearer role expectations for future team growth |

### Rationale
RBAC baseline is the minimum control to prevent privilege escalation as usage expands from one operator.

### Dependencies
- Requires: `REC-801`
- Blocked by: auth mechanism finalization (`SEC-Q-802`)
- Depends on output of: Software Architect

### Risk of Not Implementing
Multi-user readiness remains unsafe and difficult to validate.

### Measurement Criterion
- KPI: Endpoint authorization coverage
- Baseline: 0% explicit role checks
- Target: 100% endpoints mapped to role requirements
- Measurement method: policy matrix lint + endpoint authorization tests
- Time horizon: by Sprint 11

---

## Recommendation REC-803

### Problem
DAST and container scanning are missing (`GAP-803`, `RISK-803`).
**Analysis reference:** `GAP-803`, `RISK-803`

### Solution
Extend CI with DAST and container-image vulnerability scanning plus explicit fail thresholds.

**Implementation approach:**
1. Add DAST stage against localhost test target after app startup.
2. Add container image scanning stage for Docker build outputs.
3. Define blocking severity thresholds shared with DevOps gate policy.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal platform |
| Risk Reduction | High | Adds runtime security coverage beyond static checks |
| Cost | Medium | Additional CI runtime and maintenance |
| UX | Neutral | No direct user-facing changes |

### Rationale
Defense-in-depth requires both static and dynamic validation.

### Dependencies
- Requires: `REC-806`
- Blocked by: severity threshold approval (`SEC-Q-803`)
- Depends on output of: DevOps Engineer

### Risk of Not Implementing
Known exploitable behavior classes can bypass pre-merge controls.

### Measurement Criterion
- KPI: Security scan coverage in CI
- Baseline: 3 scan families
- Target: 5 scan families (add DAST + container scan)
- Measurement method: CI workflow job inventory
- Time horizon: by Sprint 10 end

---

## Recommendation REC-804

### Problem
No rate-limiting controls exist (`GAP-804`, `RISK-804`).
**Analysis reference:** `GAP-804`, `RISK-804`

### Solution
Implement minimal abuse-prevention controls for API endpoints.

**Implementation approach:**
1. Add in-memory sliding-window rate limiter with configurable thresholds.
2. Exempt health endpoints from strict limits.
3. Add tests for normal traffic and burst traffic returning `429`.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal-only |
| Risk Reduction | Medium-High | Reduces accidental or malicious flooding |
| Cost | Low | Limited middleware + tests |
| UX | Low | Only affects abnormal request bursts |

### Rationale
Availability controls are a core security requirement even for internal tools.

### Dependencies
- Requires: none
- Blocked by: none
- Depends on output of: Senior Developer

### Risk of Not Implementing
Availability incidents remain likely under burst/error loops.

### Measurement Criterion
- KPI: Endpoints with rate-limit protection
- Baseline: 0
- Target: 100% write endpoints, >=80% read endpoints
- Measurement method: endpoint policy tests
- Time horizon: by Sprint 10

---

## Recommendation REC-805

### Problem
Data classification and privacy handling are undefined (`GAP-805`, `RISK-805`).
**Analysis reference:** `GAP-805`, `RISK-805`

### Solution
Define data classes, retention, and logging constraints with Data Architect and Legal Counsel.

**Implementation approach:**
1. Build data inventory for session state, questionnaire answers, decisions, audit, and runtime metrics.
2. Classify each entity (`Public`, `Internal`, `Confidential`, `Restricted`).
3. Map retention/deletion and log redaction requirements per class.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | No commercial baseline |
| Risk Reduction | High | Prevents privacy and retention control gaps |
| Cost | Medium | Requires cross-team alignment effort |
| UX | Low-Medium | May require small workflow changes for deletion/export |

### Rationale
Data protection by design depends on an explicit classification model.

### Dependencies
- Requires: Data Architect outputs, Legal Counsel outputs
- Blocked by: pending phase-2 agents (`09`, `33`)
- Depends on output of: Data Architect, Legal Counsel

### Risk of Not Implementing
Security controls remain inconsistent and hard to audit.

### Measurement Criterion
- KPI: Data entities with approved classification
- Baseline: 0%
- Target: 100%
- Measurement method: classification matrix coverage audit
- Time horizon: by Sprint 12

---

## Recommendation REC-806

### Problem
Security gate severities are not formally approved (`GAP-806`, `RISK-806`).
**Analysis reference:** `GAP-806`, `RISK-806`

### Solution
Publish a security gate policy defining pass/fail severities for each scan family.

**Implementation approach:**
1. Define policy matrix for SAST, DAST, SCA, secret scan, and container scan.
2. Map policy to PR and release gates in CI.
3. Add exception workflow with expiry and owner for temporary overrides.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal platform |
| Risk Reduction | High | Converts scans into enforceable controls |
| Cost | Low-Medium | Policy and workflow updates |
| UX | Low | Affects engineering process, not end-user interface |

### Rationale
Without clear severities, scan jobs are informational and risk acceptance is inconsistent.

### Dependencies
- Requires: DevOps promotion gate implementation
- Blocked by: severity consensus (`SEC-Q-803`)
- Depends on output of: DevOps Engineer

### Risk of Not Implementing
Critical findings may be knowingly or accidentally merged.

### Measurement Criterion
- KPI: Security findings blocked per policy
- Baseline: `INSUFFICIENT_DATA:` (historical baseline not collected)
- Target: 100% policy violations block merge/release
- Measurement method: CI gate outcome reports
- Time horizon: by Sprint 10

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint |
|------------------|--------|--------|----------|--------|
| REC-801 | High | Medium | P1 | Sprint 10 |
| REC-802 | High | Medium | P1 | Sprint 11 |
| REC-803 | High | Medium | P1 | Sprint 10 |
| REC-804 | Medium | Low | P1 | Sprint 10 |
| REC-805 | High | Medium | P2 | Sprint 12 |
| REC-806 | High | Low | P1 | Sprint 10 |

## HANDOFF CHECKLIST
- [x] All recommendations reference an analysis finding (GAP/RISK/CS/DESIGN ID)
- [x] All impacts have rationale (no empty cells)
- [x] All INSUFFICIENT_DATA: items are documented
- [x] Measurement criteria are SMART formulated
- [x] Priority matrix is fully completed
- [x] Dependencies are documented
- [x] No recommendations outside competence domain
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff message
- [x] Scope Change Impact: NOT_APPLICABLE
- [x] JSON export is valid and complete
