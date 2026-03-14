# Accessibility Specialist Guardrails — CREATE Mode

> **Agent:** 13-accessibility-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10  
> **Based on analysis:**
> `docs/phase-3/13-accessibility-specialist-analysis.md`

---

## Metadata

- Agent: Accessibility Specialist (13)
- Phase: 3
- Date: 2026-03-10
- Based on analysis: `13-accessibility-specialist-analysis.md`
- Mode: CREATE

---

## Guardrail G-A11Y-001

### Title

WCAG AA Release Gate

### Scope

- Applies to: all UI-related implementation stories and release candidates
- Time horizon: Permanent

### Rule

No release candidate may pass without documented WCAG 2.1 AA conformance
evidence for modified screens/components.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-001`; block release and escalate to
Orchestrator.

### Rationale

Addresses release-blocking non-compliance risk.

### Verification Method

Accessibility evidence checklist attached to sprint completion report.

---

## Guardrail G-A11Y-002

### Title

Contrast Matrix Enforcement

### Scope

- Applies to: design tokens, component styling, Storybook components
- Time horizon: Permanent

### Rule

Only contrast-approved token pairs may be used for text, controls, and focus
indicators.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-002`; reject PR until non-compliant pair is
replaced.

### Rationale

Prevents repeated contrast defects across shared components.

### Verification Method

Automated contrast tests and manual matrix cross-check during review.

---

## Guardrail G-A11Y-003

### Title

Keyboard Operability Minimum

### Scope

- Applies to: all interactive components and primary user flows
- Time horizon: Permanent

### Rule

Every interactive element must be fully keyboard operable with visible focus and
no keyboard trap.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-003`; block merge and require keyboard test
rerun.

### Rationale

Mitigates severe operability failures for non-pointer users.

### Verification Method

Automated keyboard flow tests plus manual tab walkthrough checklist.

---

## Guardrail G-A11Y-004

### Title

Focus Management Determinism

### Scope

- Applies to: modals, drawers, overlays, route transitions, dynamic updates
- Time horizon: Permanent

### Rule

Focus entry, trap, and return behavior must be explicitly implemented and tested
for every dynamic container.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-004`; affected story marked incomplete.

### Rationale

Avoids user disorientation and inaccessible modal workflows.

### Verification Method

Component-level focus scripts and integration tests on primary flows.

---

## Guardrail G-A11Y-005

### Title

Aria-Live Announcement Policy

### Scope

- Applies to: SSE status events, toasts, activity feed updates
- Time horizon: Permanent

### Rule

Dynamic status announcements must follow a documented polite/assertive policy
with deduplication and throttling.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-005`; block merge until announcement behavior
meets policy.

### Rationale

Prevents silent state changes and announcement noise in real-time UI.

### Verification Method

Screen-reader scripted tests with expected announcement logs.

---

## Guardrail G-A11Y-006

### Title

Assistive Technology Evidence Requirement

### Scope

- Applies to: sprint completion and release quality gates
- Time horizon: Until formal compliance operations supersede it

### Rule

Each sprint touching UI must produce AT/browser test evidence for declared
support matrix scenarios.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-006`; sprint cannot be marked complete.

### Rationale

Ensures accessibility claims are evidence-backed, not inferred.

### Verification Method

Required evidence artifacts reviewed in sprint completion report.

---

## Guardrail G-A11Y-007

### Title

Cognitive Accessibility Error Guidance

### Scope

- Applies to: forms, validation errors, instructional text
- Time horizon: Permanent

### Rule

Validation messages must include clear cause and actionable correction guidance
in plain language.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-A11Y-007`; return story for content and UX
revision.

### Rationale

Reduces abandonment and repeat error loops in complex flows.

### Verification Method

Manual content audit against cognitive accessibility rubric.

---

## Guardrail Overview

| ID         | Title                                     | Scope                 | Priority | Verification                       |
| ---------- | ----------------------------------------- | --------------------- | -------- | ---------------------------------- |
| G-A11Y-001 | WCAG AA Release Gate                      | UI release candidates | Critical | Evidence checklist review          |
| G-A11Y-002 | Contrast Matrix Enforcement               | Tokens/components     | Critical | Contrast test + matrix audit       |
| G-A11Y-003 | Keyboard Operability Minimum              | Interactive controls  | Critical | Keyboard automation + manual check |
| G-A11Y-004 | Focus Management Determinism              | Dynamic containers    | High     | Focus integration tests            |
| G-A11Y-005 | Aria-Live Announcement Policy             | Real-time updates     | High     | SR scripted logs                   |
| G-A11Y-006 | Assistive Technology Evidence Requirement | Sprint/release gates  | High     | Evidence artifact audit            |
| G-A11Y-007 | Cognitive Accessibility Error Guidance    | Forms and errors      | Medium   | Content rubric review              |

---

## HANDOFF CHECKLIST

- [x] All guardrails are testable
- [x] All guardrails include violation actions
- [x] All guardrails include rationale linked to analysis gaps/risks
- [x] All guardrails include verification methods
- [x] Guardrail overview table complete
- [x] No duplicate IDs with existing guardrails
- [x] `INSUFFICIENT_DATA` escalation captured in analysis questionnaire requests
- [x] Scope change section not applicable
- [x] Ready for handoff

**Status:** READY  
**Next Agent:** 32-content-strategist
