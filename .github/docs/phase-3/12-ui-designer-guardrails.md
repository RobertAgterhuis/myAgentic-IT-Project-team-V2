# UI Designer Guardrails — CREATE Mode
> **Agent:** 12-ui-designer  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10  
> **Based on analysis:** `.github/docs/phase-3/12-ui-designer-analysis.md`

---

## Metadata
- Agent: UI Designer (12)
- Phase: 3
- Date: 2026-03-10
- Based on analysis: `12-ui-designer-analysis.md`
- Mode: CREATE

---

## Guardrail G-UID-001

### Title
Semantic Tokens Only

### Scope
- Applies to: UI Designer outputs, Storybook component styling, UI implementation pull requests
- Time horizon: Permanent

### Rule
All color, spacing, typography, radius, shadow, and motion values MUST be consumed through semantic design tokens. Raw literal visual values in component styles are prohibited.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-001`; block PR merge until literal values are replaced with semantic tokens.

### Rationale
Prevents brand rework cascades and keeps value substitution isolated to token files.

### Verification Method
Static lint/check for hardcoded style values in component code and Storybook stories.

---

## Guardrail G-UID-002

### Title
Token Key Stability Freeze

### Scope
- Applies to: `.github/docs/brand/design-tokens.json`, design token registry updates
- Time horizon: From Phase 3 completion through Phase 5 MVP

### Rule
After token schema lock, token key names MUST NOT be renamed or deleted without documented migration note and Orchestrator approval.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-002`; reject token PR and require migration plan update.

### Rationale
Mitigates critical risk of broad rework caused by renaming semantic keys late.

### Verification Method
Token schema diff check in CI comparing key set against previous approved baseline.

---

## Guardrail G-UID-003

### Title
Inventory-First Component Creation

### Scope
- Applies to: Storybook Agent, Implementation Agent, UI component PRs
- Time horizon: Permanent

### Rule
No new reusable component may be implemented unless it is first declared in `component-inventory.md` with variants, states, and token mapping.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-003`; block PR and route back to inventory update workflow.

### Rationale
Prevents component drift and duplicate UI primitives.

### Verification Method
PR check requiring inventory diff whenever new component files are added.

---

## Guardrail G-UID-004

### Title
WCAG Visual Gate Before Implementation Lock

### Scope
- Applies to: color/state token sets, focus styles, component visual specs
- Time horizon: Mandatory before Phase 3 critic/risk validation

### Rule
All text/background/state/focus color pairs MUST pass WCAG AA thresholds before being marked implementation-ready.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-004`; freeze affected component specs until accessibility pass evidence is attached.

### Rationale
Avoids late accessibility rejection and compliance risk.

### Verification Method
Contrast audit matrix signed by Accessibility Specialist; automated axe/Lighthouse checks on key screens.

---

## Guardrail G-UID-005

### Title
Motion Budget Enforcement

### Scope
- Applies to: animated components, micro-interaction definitions
- Time horizon: Permanent

### Rule
Motion must use approved motion tokens, and non-essential animations must honor `prefers-reduced-motion`. Concurrent animation counts and durations must stay within defined budget.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-005`; require removal or tokenized replacement of non-compliant animations.

### Rationale
Reduces performance risk and accessibility discomfort from excessive motion.

### Verification Method
Storybook motion checklist + E2E reduced-motion tests + performance smoke checks.

---

## Guardrail G-UID-006

### Title
Responsive Spec Completeness

### Scope
- Applies to: all primary screens (Dashboard, Questionnaires, Decisions, Synthesis, Analytics, Official Documents, Session State, Help)
- Time horizon: Until all 8 screens are implemented and validated

### Rule
Each primary screen MUST include explicit behavior specs for mobile, tablet, desktop, and wide breakpoints before implementation begins.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-006`; classify implementation story as blocked until responsive spec is completed.

### Rationale
Prevents layout collapse and inconsistent behavior on non-desktop form factors.

### Verification Method
Design QA checklist validating per-breakpoint sections exist and match component behavior.

---

## Guardrail G-UID-007

### Title
Theme State Determinism

### Scope
- Applies to: theme UI controls, persisted settings behavior, app shell initialization
- Time horizon: Permanent

### Rule
Theme resolution order MUST be deterministic: user override > system preference > product default. Unknown persisted values must fall back safely.

### Violation Action
Mark `GUARDRAIL_VIOLATION: G-UID-007`; block release candidate until deterministic behavior test passes.

### Rationale
Protects UX consistency and reduces support overhead from theme reset bugs.

### Verification Method
Automated E2E tests across refresh/restart scenarios plus unit tests for theme resolver.

---

## Guardrail Overview

| ID | Title | Scope | Priority | Verification |
|---|---|---|---|---|
| G-UID-001 | Semantic Tokens Only | Component styling + Storybook | Critical | Lint/style scan for literals |
| G-UID-002 | Token Key Stability Freeze | Token registry | Critical | CI token-key diff gate |
| G-UID-003 | Inventory-First Component Creation | Component pipeline | High | PR inventory dependency check |
| G-UID-004 | WCAG Visual Gate Before Implementation Lock | Colors/focus/state styles | Critical | Contrast matrix + axe/Lighthouse |
| G-UID-005 | Motion Budget Enforcement | Animated UI | High | Motion checklist + reduced-motion tests |
| G-UID-006 | Responsive Spec Completeness | 8 primary screens | High | Per-breakpoint QA checklist |
| G-UID-007 | Theme State Determinism | Theme settings and runtime | Medium | E2E theme persistence tests |

---

## HANDOFF CHECKLIST
- [x] All guardrails are testable
- [x] All guardrails include violation action
- [x] All guardrails include rationale linked to analysis risks/gaps
- [x] All guardrails include verification method
- [x] Overview table complete
- [x] No duplicate IDs with existing global UX guardrails
- [x] `INSUFFICIENT_DATA` items tracked via questionnaire requests in analysis
- [x] Scope change section not applicable (normal cycle)
- [x] Ready for handoff

**Status:** READY  
**Next Agent:** 13-accessibility-specialist
