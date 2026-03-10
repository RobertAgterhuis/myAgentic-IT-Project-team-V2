# Recommendations – Legal / Privacy Counsel – 2026-03-10

## Metadata
- Agent: Legal / Privacy Counsel (33)
- Phase: 2
- Based on analysis: `.github/docs/phase-2/33-legal-counsel-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

## Recommendation REC-3301

### Problem
Missing legal launch artifact pack.
**Analysis reference:** `GAP-3301`, `RISK-3305`

### Solution
Create a legal baseline pack in repo with mandatory templates and ownership.

**Implementation approach:**
1. Add templates: privacy notice checklist (Art. 13/14), RoPA template (Art. 30), breach notification template (Art. 33).
2. Add owner/review cadence metadata to each template.
3. Add sprint gate check ensuring template updates are referenced when relevant data flows change.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal tool, no direct revenue baseline |
| Risk Reduction | High | Improves legal readiness and auditability |
| Cost | Low | Documentation-centric work |
| UX | Low | Mostly internal governance |

### Rationale
Standardized legal artifacts reduce interpretation drift and phase closure delays.

### Dependencies
- Requires: none
- Blocked by: none
- Depends on output of: Data Architect, Security Architect

### Risk of Not Implementing
Legal readiness remains ad hoc and slower during future scope changes.

### Measurement Criterion
- KPI: Required legal templates present
- Baseline: 0/3
- Target: 3/3
- Measurement method: file existence and review metadata check
- Time horizon: Sprint 10

---

## Recommendation REC-3302

### Problem
GDPR lawful basis and notice mapping is incomplete.
**Analysis reference:** `GAP-3302`, `RISK-3303`

### Solution
Map each processing activity to lawful basis (Art. 6) and required notice disclosures (Art. 13/14).

**Implementation approach:**
1. Build processing-activity inventory linked to Data Architect entities.
2. Assign lawful basis and disclosure fields per activity.
3. Validate mapping against privacy notice checklist before release gates.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | No commercial baseline |
| Risk Reduction | High | Strengthens privacy compliance posture |
| Cost | Medium | Requires cross-team data/legal mapping |
| UX | Medium | Enables clearer user-facing privacy disclosures |

### Rationale
Art. 6 and Art. 13/14 alignment is core legal documentation duty where personal data may be processed.

### Dependencies
- Requires: field-level data inventory (`LEG-Q-3303`)
- Blocked by: unresolved PII classification matrix
- Depends on output of: Data Architect, Security Architect

### Risk of Not Implementing
Insufficient disclosure and lawful basis evidence can create compliance exposure.

### Measurement Criterion
- KPI: Processing activities mapped to lawful basis/disclosure fields
- Baseline: 0%
- Target: 100%
- Measurement method: mapping matrix completeness audit
- Time horizon: Sprint 11

---

## Recommendation REC-3303

### Problem
License compliance evidence is not operationalized.
**Analysis reference:** `GAP-3303`, `RISK-3302`, `LCHECK-001`, `LCHECK-002`

### Solution
Implement license evidence and policy gates.

**Implementation approach:**
1. Produce dependency license inventory file with SPDX identifiers.
2. Define allow/conditional/prohibited matrix (permissive allowed; weak copyleft conditional; strong copyleft policy via questionnaire).
3. Add CI license check step and exception workflow.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal tool |
| Risk Reduction | High | Prevents future incompatible license intake |
| Cost | Low-Medium | Tooling and policy documentation effort |
| UX | Low | Engineering workflow impact only |

### Rationale
License governance must be repeatable and auditable, not manual.

### Dependencies
- Requires: copyleft acceptance decision (`LEG-Q-3304`)
- Blocked by: none
- Depends on output of: Senior Developer, DevOps Engineer

### Risk of Not Implementing
License risks surface late, increasing remediation cost.

### Measurement Criterion
- KPI: Dependencies with validated SPDX license entry
- Baseline: INSUFFICIENT_DATA
- Target: 100%
- Measurement method: inventory coverage check in CI
- Time horizon: Sprint 10

---

## Recommendation REC-3304

### Problem
Retention obligations are undefined for core artifacts.
**Analysis reference:** `GAP-3304`, `RISK-3301`

### Solution
Define and approve a legal retention matrix for session, decisions, audit, analytics, and questionnaire artifacts.

**Implementation approach:**
1. Draft retention periods and rationale per artifact class.
2. Align with Security/Data classification outputs.
3. Translate approved policy into operational enforcement requirements.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal tool |
| Risk Reduction | High | Reduces over-retention/non-conformance risk |
| Cost | Medium | Cross-functional policy and implementation work |
| UX | Medium | Improves predictability for data lifecycle |

### Rationale
Retention obligations are a current blocking dependency for Data Architect and Security closure.

### Dependencies
- Requires: Legal+Data+Security sign-off; `LEG-Q-3302`
- Blocked by: unresolved legal retention approval
- Depends on output of: Data Architect, Security Architect

### Risk of Not Implementing
Retention behavior remains inconsistent and legally ambiguous.

### Measurement Criterion
- KPI: Core artifact classes with approved retention rule
- Baseline: 0%
- Target: 100%
- Measurement method: retention matrix completeness and approval record
- Time horizon: Sprint 11

---

## Recommendation REC-3305

### Problem
No standard DPA/SLA vendor legal checklist exists.
**Analysis reference:** `GAP-3305`, `RISK-3304`

### Solution
Create a vendor onboarding legal checklist covering DPA, SLA, portability, and exit clauses.

**Implementation approach:**
1. Define mandatory legal review points for any new third-party processor/service.
2. Add checklist to architecture/devops change process.
3. Require legal sign-off for processor onboarding.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | Internal scope |
| Risk Reduction | Medium | Reduces ad hoc contractual risk |
| Cost | Low | Checklist/documentation effort |
| UX | Low | Process-level improvement |

### Rationale
Prevents future contractual blind spots as platform expands.

### Dependencies
- Requires: processor inventory updates from DevOps changes
- Blocked by: none
- Depends on output of: DevOps Engineer

### Risk of Not Implementing
Future vendor onboarding can bypass key legal protections.

### Measurement Criterion
- KPI: New vendor intakes using legal checklist
- Baseline: 0%
- Target: 100%
- Measurement method: onboarding review records
- Time horizon: Sprint 12

---

## Recommendation REC-3306

### Problem
ToS/privacy/cookie policy requirements are undefined.
**Analysis reference:** `GAP-3306`

### Solution
Define minimum section requirements and ownership for legal user-facing docs.

**Implementation approach:**
1. Document required sections for ToS, Privacy Policy, and Cookie Policy.
2. Link requirements to processing map and retention matrix.
3. Define review cadence and owner role.

### Impact
| Dimension | Expected effect | Rationale |
|----------|-----------------|-----------|
| Revenue | `INSUFFICIENT_DATA:` | No monetized service baseline |
| Risk Reduction | Medium-High | Reduces ambiguity for public distribution posture |
| Cost | Low | Content and governance work |
| UX | Medium | Improves transparency and trust |

### Rationale
Public repo distribution and potential future external users require clear legal documentation standards.

### Dependencies
- Requires: audience decision (`LEG-Q-3301`)
- Blocked by: external distribution posture clarification
- Depends on output of: Product Manager

### Risk of Not Implementing
Legal communication quality remains inconsistent and hard to scale.

### Measurement Criterion
- KPI: Legal document requirement set completeness
- Baseline: 0%
- Target: 100%
- Measurement method: section checklist audit
- Time horizon: Sprint 11

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint |
|------------------|--------|--------|----------|--------|
| REC-3301 | High | Low | P1 | Sprint 10 |
| REC-3302 | High | Medium | P1 | Sprint 11 |
| REC-3303 | High | Medium | P1 | Sprint 10 |
| REC-3304 | High | Medium | P1 | Sprint 11 |
| REC-3305 | Medium | Low | P2 | Sprint 12 |
| REC-3306 | Medium | Low | P1 | Sprint 11 |

## HANDOFF CHECKLIST
- [x] All recommendations reference an analysis finding
- [x] All impacts have rationale
- [x] All INSUFFICIENT_DATA items are documented
- [x] Measurement criteria are SMART
- [x] Priority matrix is complete
- [x] Dependencies are documented
- [x] No out-of-domain recommendations
- [x] Scope Change Impact: NOT_APPLICABLE
- [x] Ready for sprint planning handoff
