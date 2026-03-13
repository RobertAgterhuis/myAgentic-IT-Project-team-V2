# Localization Specialist Recommendations — CREATE Mode

> **Agent:** 35-localization-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 2 of 4 (Recommendations)  
> **Based on analysis:**
> `docs/phase-3/35-localization-specialist-analysis.md`  
> **Date:** 2026-03-10

---

## Metadata

- Agent: Localization Specialist (35)
- Phase: 3
- Based on analysis: `35-localization-specialist-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

---

## Recommendation REC-L10N-001

### Problem

Launch locale priorities are unconfirmed, blocking practical localization
sequencing.

**Analysis reference:** GAP-L10N-001, RISK-L10N-001

### Solution

Run a locale-priority decision gate that confirms Tier 1/2/3 locales with
explicit business rationale.

**Implementation approach:**

1. Collect market constraints and launch timelines from Product + Sales.
2. Define locale tiers and required scope per tier (UI, docs, support).
3. Publish approved locale matrix with owners and review date.
4. Use matrix as mandatory input for sprint localization planning.

### Impact

| Dimension      | Expected effect             | Rationale                                                              |
| -------------- | --------------------------- | ---------------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better prioritization can accelerate entry into highest-value markets. |
| Risk Reduction | High                        | Prevents roadmap ambiguity and launch delays.                          |
| Cost           | Medium reduction            | Reduces wasted translation work for low-priority locales.              |
| UX             | Medium                      | Better localized experience for prioritized audiences.                 |

### Rationale

Localization planning must anchor to explicit market commitments.

### Dependencies

- Requires: Product Manager (34), Sales Strategist (03)
- Blocked by: none
- Depends on output of: Localization Specialist (35)

### Risk of Not Implementing

Localization execution remains unfocused and schedule confidence drops.

### Measurement Criterion

- KPI: Locale matrix approval status
- Baseline: not approved
- Target: approved Tier 1/2/3 matrix with owners
- Measurement method: governance artifact check
- Time horizon: Sprint 1

---

## Recommendation REC-L10N-002

### Problem

i18n key and namespace standards are not formally published.

**Analysis reference:** GAP-L10N-002, RISK-L10N-002

### Solution

Publish i18n key architecture standard with namespace ownership and key-change
policy.

**Implementation approach:**

1. Define key naming convention and namespace boundaries.
2. Define translator-context metadata requirements.
3. Add key-change policy (deprecation window, migration notes).
4. Add CI check for prohibited key patterns.

### Impact

| Dimension      | Expected effect   | Rationale                                               |
| -------------- | ----------------- | ------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | No direct baseline for revenue impact.                  |
| Risk Reduction | High              | Stabilizes translation memory and reduces churn.        |
| Cost           | Medium reduction  | Fewer retranslation cycles from unstable keys.          |
| UX             | Medium            | More consistent localized wording and context fidelity. |

### Rationale

Stable key architecture is essential for scalable localization.

### Dependencies

- Requires: Senior Developer (06), DevOps Engineer (07)
- Blocked by: none
- Depends on output of: Localization Specialist (35)

### Risk of Not Implementing

Frequent key churn breaks localization continuity and increases defects.

### Measurement Criterion

- KPI: i18n key stability rate
- Baseline: INSUFFICIENT_DATA
- Target: 0 ungoverned key renames after standard adoption
- Measurement method: key-diff policy checks in CI
- Time horizon: Sprint 2

---

## Recommendation REC-L10N-003

### Problem

Translation workflow tooling and ownership are undefined.

**Analysis reference:** GAP-L10N-003, RISK-L10N-003

### Solution

Select and onboard a single TMS with assigned owner and SLA model.

**Implementation approach:**

1. Score TMS shortlist against integration, glossary, review workflow, and audit
   needs.
2. Assign localization operations owner.
3. Define translation SLA targets by tier.
4. Integrate translation sync/check into CI/CD pipeline.

### Impact

| Dimension      | Expected effect             | Rationale                                                     |
| -------------- | --------------------------- | ------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better localization throughput can accelerate market rollout. |
| Risk Reduction | High                        | Reduces manual process fragmentation and missed deadlines.    |
| Cost           | Medium                      | Tool cost added, but operational inefficiency reduced.        |
| UX             | Medium                      | Improves translation consistency and release reliability.     |

### Rationale

Tooling and ownership are preconditions for reliable localization delivery.

### Dependencies

- Requires: DevOps Engineer (07), project governance owner
- Blocked by: procurement/approval process
- Depends on output of: Localization Specialist (35)

### Risk of Not Implementing

Localization remains ad hoc and low predictability for release readiness.

### Measurement Criterion

- KPI: TMS operational readiness
- Baseline: 0%
- Target: selected tool, owner assigned, workflow active
- Measurement method: readiness checklist and pilot run
- Time horizon: Sprint 2

---

## Recommendation REC-L10N-004

### Problem

RTL support decision is unresolved, risking expensive late redesign.

**Analysis reference:** GAP-L10N-004, RISK-L10N-004

### Solution

Record explicit RTL decision and add conditional architecture guardrails.

**Implementation approach:**

1. Decide MVP RTL scope (`required` vs `deferred`).
2. If deferred, enforce directional-compatible CSS/structure standards now.
3. If required, add dedicated RTL test and design adaptation workstream.
4. Track decision in session/architecture docs.

### Impact

| Dimension      | Expected effect            | Rationale                                              |
| -------------- | -------------------------- | ------------------------------------------------------ |
| Revenue        | INSUFFICIENT_DATA          | Market opportunity impact depends on selected regions. |
| Risk Reduction | Medium                     | Prevents surprise rework if RTL becomes mandatory.     |
| Cost           | Medium reduction long-term | Early compatibility lowers future adaptation cost.     |
| UX             | Medium                     | Better readiness for direction-sensitive languages.    |

### Rationale

Directionality strategy should be explicit and time-bounded.

### Dependencies

- Requires: Product Manager (34), UI Designer (12)
- Blocked by: locale strategy decision
- Depends on output of: Localization Specialist (35)

### Risk of Not Implementing

Potentially large retrofits when adding RTL locales later.

### Measurement Criterion

- KPI: RTL decision and readiness status
- Baseline: undecided
- Target: documented decision + compatibility checklist complete
- Measurement method: architecture decision record audit
- Time horizon: Sprint 1

---

## Recommendation REC-L10N-005

### Problem

Localization QA evidence protocol is incomplete.

**Analysis reference:** GAP-L10N-005, RISK-L10N-005

### Solution

Create localization QA evidence checklist and release gate requirements per
locale tier.

**Implementation approach:**

1. Define required evidence: terminology validation, UI fit checks, formatting
   checks, fallback checks.
2. Define pass/fail thresholds per tier.
3. Require evidence bundle for each localized release candidate.
4. Integrate into sprint completion and release review.

### Impact

| Dimension      | Expected effect   | Rationale                                                  |
| -------------- | ----------------- | ---------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | No direct baseline tied to evidence process.               |
| Risk Reduction | High              | Improves confidence and consistency of localized releases. |
| Cost           | Low increase      | QA overhead is added but rework risk drops.                |
| UX             | Medium            | Fewer localization defects in production.                  |

### Rationale

Evidence-backed QA is needed for repeatable localization quality.

### Dependencies

- Requires: Test Agent (21), Localization Specialist (35)
- Blocked by: none
- Depends on output of: Localization Specialist (35)

### Risk of Not Implementing

Localization quality remains variable and hard to verify.

### Measurement Criterion

- KPI: Localization QA evidence completeness
- Baseline: 0%
- Target: 100% of target-locale releases include required evidence bundle
- Measurement method: release checklist audit
- Time horizon: Sprint 3

---

## Priority Matrix

| Recommendation ID | Impact | Effort | Priority | Sprint     |
| ----------------- | ------ | ------ | -------- | ---------- |
| REC-L10N-001      | High   | Medium | P1       | Sprint 1   |
| REC-L10N-002      | High   | Medium | P1       | Sprint 1-2 |
| REC-L10N-003      | High   | High   | P1       | Sprint 2   |
| REC-L10N-004      | Medium | Medium | P2       | Sprint 1   |
| REC-L10N-005      | Medium | Medium | P2       | Sprint 3   |

---

## HANDOFF CHECKLIST

- [x] All recommendations mapped to GAP/RISK findings
- [x] Impact fields completed with rationale/`INSUFFICIENT_DATA`
- [x] SMART metrics provided
- [x] Dependencies and blockers documented
- [x] Priority matrix completed
- [x] Recommendations stay within localization domain
- [x] Ready for sprint plan handoff

**Status:** READY
