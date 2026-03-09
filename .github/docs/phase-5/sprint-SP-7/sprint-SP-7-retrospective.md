# Sprint Retrospective — SP-7 (UX Polish)

## Metadata
- **Sprint:** SP-7
- **Date:** 2026-03-09
- **Stories completed:** 2/2 (UX-04, UX-05)
- **Points:** 10/10 (velocity 1.0)

---

## What Went Well

1. **Loading state pattern was clean to implement** — The `setBtnLoading(btn, loading)` helper is only ~10 lines and slots into all 12 async call sites via a consistent `setBtnLoading → await → .finally → setBtnLoading` wrapper. No restructuring of existing event handlers was needed.

2. **CSS-only spinner avoids external dependencies** — The `.btn-loading::after` pseudo-element with `@keyframes spin` provides visual feedback without adding any JS animation libraries or SVG assets. Works with all button sizes via relative positioning.

3. **Empty state guided steps leverage existing STRINGS pattern** — Adding `noQuestionnairesSteps` and `noDecisionsSteps` to the STRINGS constant follows the established i18n-readiness convention. `renderEmpty()` and `renderDecisions()` already had empty-state branches, so the enhancement was additive.

4. **Skeleton loaders are one-shot and self-cleaning** — The skeleton placeholder is injected once per load when no cached data exists, and naturally replaced when the real render function runs. The `aria-busy="true"` attribute on the container correctly conveys loading state to screen readers.

5. **Zero regressions on 672 pre-existing tests** — All 24 test files pass (720 total including the 48 new tests). No changes were needed to existing test expectations.

---

## What Could Be Improved

1. **CSS design tokens vs. raw values caught in tests** — Initial test assertions used raw values (e.g., `border-radius: 50%`) but the actual CSS uses design token variables (e.g., `var(--radius-full)`). This required a test fix. Going forward, tests should always check for the token variable name rather than computed values.

2. **Regex matching for array content is fragile** — The `noQuestionnairesSteps` content includes literal `[your-project-name]`, which caused a regex `[\s\S]*?]` to terminate early. Matching `],` (bracket + comma) instead of bare `]` fixed it, but this highlights the fragility of regex-based content extraction from inline JS.

---

## Lessons Learned

- **LESSON_CANDIDATE:** When writing tests that validate CSS properties in inline stylesheets, match against `var(--token-name)` rather than raw computed values. The codebase uses CSS custom properties consistently, and tests must reflect this.
- **LESSON_CANDIDATE:** When regex-parsing JS array content that may contain square brackets inside strings, use `],` (bracket followed by comma or end-of-array) as the terminator rather than a bare `]` to avoid premature matches.

---

## Action Items for Next Sprint

- None. UX-04 and UX-05 are complete. Loading patterns and empty states are operational.

---

## HANDOFF CHECKLIST
- [x] All required sections are filled
- [x] All UNCERTAIN: items documented — NONE
- [x] All INSUFFICIENT_DATA: items documented — NONE
- [x] Output complies with contract
- [x] Guardrails checked
- [x] Machine-readable output
- [x] No contradictory statements
- [x] Source references included
- [x] Written to file per MEMORY MANAGEMENT PROTOCOL
