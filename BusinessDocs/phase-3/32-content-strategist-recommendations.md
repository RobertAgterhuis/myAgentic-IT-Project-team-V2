# Content Strategist Recommendations — CREATE Mode

> **Agent:** 32-content-strategist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 2 of 4 (Recommendations)  
> **Based on analysis:**
> `docs/phase-3/32-content-strategist-analysis.md`  
> **Date:** 2026-03-10

---

## Metadata

- Agent: Content Strategist / UX Writer (32)
- Phase: 3
- Based on analysis: `32-content-strategist-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

---

## Recommendation REC-CNT-001

### Problem

No central content style guide exists, creating high risk of terminology and
tone drift.

**Analysis reference:** GAP-CNT-001, RISK-CNT-001

### Solution

Create and govern a single content style guide artifact for all UX-facing text
frameworks.

**Implementation approach:**

1. Publish style guide with sections for voice, tone, terminology, readability,
   accessibility language rules.
2. Add canonical glossary with prohibited synonyms.
3. Define content review checklist and approval workflow.
4. Require style guide link in relevant implementation stories.

### Impact

| Dimension      | Expected effect             | Rationale                                                     |
| -------------- | --------------------------- | ------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | More coherent communication can improve trust and completion. |
| Risk Reduction | High                        | Reduces inconsistency and user confusion across tabs.         |
| Cost           | Medium reduction            | Fewer rewrites and review cycles.                             |
| UX             | High                        | More predictable, clear interaction language.                 |

### Rationale

Shared terminology and style standards are foundational for multi-agent UI
quality.

### Dependencies

- Requires: UX Designer (11), UI Designer (12), Accessibility Specialist (13)
- Blocked by: none
- Depends on output of: Content Strategist (32)

### Risk of Not Implementing

Content drift compounds quickly and undermines navigation confidence.

### Measurement Criterion

- KPI: Canonical term consistency rate
- Baseline: INSUFFICIENT_DATA
- Target: >= 95% canonical term adherence in audited UI content
- Measurement method: term-audit checklist by sprint
- Time horizon: Sprint 2

---

## Recommendation REC-CNT-002

### Problem

Onboarding communication framework is missing despite high complexity in
first-run journeys.

**Analysis reference:** GAP-CNT-002, RISK-CNT-005

### Solution

Define onboarding content pattern library with progressive disclosure and
context-aware guidance.

**Implementation approach:**

1. Map onboarding steps to required message intent (orient, instruct, confirm).
2. Define message length and sequencing rules per step.
3. Align guidance with UX Designer onboarding interaction pattern.
4. Add content QA checklist for onboarding updates.

### Impact

| Dimension      | Expected effect             | Rationale                                               |
| -------------- | --------------------------- | ------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better onboarding can reduce early drop-off.            |
| Risk Reduction | Medium                      | Reduces confusion and abandonment in first session.     |
| Cost           | Medium reduction            | Less iterative rewriting during onboarding refinements. |
| UX             | High                        | Smoother first-use comprehension and confidence.        |

### Rationale

Onboarding content quality is a major lever for activation in complex systems.

### Dependencies

- Requires: UX Designer (11), Accessibility Specialist (13)
- Blocked by: none
- Depends on output of: Content Strategist (32)

### Risk of Not Implementing

Users may fail to understand first steps and abandon setup.

### Measurement Criterion

- KPI: Onboarding guidance coverage
- Baseline: INSUFFICIENT_DATA
- Target: 100% onboarding stages mapped to guidance pattern
- Measurement method: content map verification
- Time horizon: Sprint 1

---

## Recommendation REC-CNT-003

### Problem

Error recovery messaging is not consistently structured across workflows.

**Analysis reference:** GAP-CNT-003, RISK-CNT-002

### Solution

Publish standardized error-message framework requiring issue context plus
corrective action.

**Implementation approach:**

1. Define required error message fields (cause, action, optional escalation
   path).
2. Provide framework templates for validation, network, and permission errors.
3. Align with accessibility requirements for clarity and screen-reader
   consumption.
4. Include framework checks in PR content review.

### Impact

| Dimension      | Expected effect             | Rationale                                               |
| -------------- | --------------------------- | ------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Better recovery messaging can preserve task completion. |
| Risk Reduction | High                        | Reduces repeated failure loops and user frustration.    |
| Cost           | Medium reduction            | Lower support burden and fewer reactive content fixes.  |
| UX             | High                        | Faster recovery and better perceived reliability.       |

### Rationale

Actionable error guidance is essential for operational workflows.

### Dependencies

- Requires: Accessibility Specialist (13), Senior Developer (06)
- Blocked by: none
- Depends on output of: Content Strategist (32)

### Risk of Not Implementing

Generic errors drive abandonment and support escalation.

### Measurement Criterion

- KPI: Error message actionability coverage
- Baseline: INSUFFICIENT_DATA
- Target: >= 95% of audited error states include corrective action
- Measurement method: error-state content audit
- Time horizon: Sprint 2

---

## Recommendation REC-CNT-004

### Problem

Readability and jargon governance lacks measurable controls.

**Analysis reference:** GAP-CNT-004, RISK-CNT-003

### Solution

Introduce readability validation policy and jargon-control rubric for UI/help
content.

**Implementation approach:**

1. Set sentence-length and complexity thresholds by content type.
2. Require acronym expansion and glossary linking rules.
3. Define readability review cadence at sprint closure.
4. Escalate repeated violations as governance debt.

### Impact

| Dimension      | Expected effect   | Rationale                                                     |
| -------------- | ----------------- | ------------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA | No direct baseline linking readability to revenue.            |
| Risk Reduction | High              | Reduces comprehension failures and accessibility regressions. |
| Cost           | Low increase      | Minor recurring review effort with broad quality benefit.     |
| UX             | High              | Improves clarity across personas and contexts.                |

### Rationale

Readability consistency prevents gradual content degradation.

### Dependencies

- Requires: Accessibility Specialist (13)
- Blocked by: none
- Depends on output of: Content Strategist (32)

### Risk of Not Implementing

Communication quality regresses over time and impairs task completion.

### Measurement Criterion

- KPI: Readability compliance rate
- Baseline: INSUFFICIENT_DATA
- Target: >= 90% of reviewed content meets defined readability standards
- Measurement method: sprint-end content quality review
- Time horizon: Sprint 3

---

## Recommendation REC-CNT-005

### Problem

Localization handoff package is not prepared, risking blocked or low-quality
localization start.

**Analysis reference:** GAP-CNT-005, RISK-CNT-004

### Solution

Deliver localization-ready package (style guide, glossary, content map, tone
spectrum) before Agent 35 starts.

**Implementation approach:**

1. Bundle required artifacts with version metadata.
2. Tag locale-sensitive items and non-translatable elements.
3. Document unresolved ambiguities for Localization Specialist.
4. Add handoff checklist gate before localization kickoff.

### Impact

| Dimension      | Expected effect             | Rationale                                                  |
| -------------- | --------------------------- | ---------------------------------------------------------- |
| Revenue        | INSUFFICIENT_DATA: indirect | Faster localization readiness can accelerate market entry. |
| Risk Reduction | High                        | Prevents localization churn and semantic inconsistency.    |
| Cost           | Medium reduction            | Reduces retranslation cycles.                              |
| UX             | Medium                      | Improves locale coherence and trust.                       |

### Rationale

Localization quality depends on strong source-content governance.

### Dependencies

- Requires: Localization Specialist (35)
- Blocked by: pending target language scope confirmation
- Depends on output of: Content Strategist (32)

### Risk of Not Implementing

Localization starts with incomplete context and generates avoidable rework.

### Measurement Criterion

- KPI: Localization handoff readiness
- Baseline: 0%
- Target: 100% required handoff artifacts complete before Agent 35 start
- Measurement method: handoff checklist audit
- Time horizon: End of Phase 3 content sub-phase

---

## Priority Matrix

| Recommendation ID | Impact | Effort | Priority | Sprint   |
| ----------------- | ------ | ------ | -------- | -------- |
| REC-CNT-001       | High   | Medium | P1       | Sprint 1 |
| REC-CNT-002       | High   | Medium | P1       | Sprint 1 |
| REC-CNT-003       | High   | Medium | P1       | Sprint 2 |
| REC-CNT-004       | Medium | Low    | P2       | Sprint 3 |
| REC-CNT-005       | High   | Medium | P1       | Sprint 2 |

---

## HANDOFF CHECKLIST

- [x] All recommendations reference GAP/RISK findings
- [x] Impacts contain rationale or `INSUFFICIENT_DATA`
- [x] SMART criteria included
- [x] Dependencies documented
- [x] Priority matrix complete
- [x] Recommendations remain in content strategy domain
- [x] No production-ready copy included
- [x] Ready for sprint plan handoff

**Status:** READY
