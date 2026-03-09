# Sprint Retrospective — SP-5 (Accessibility & Brand)

## Metadata
- **Sprint:** SP-5
- **Date:** 2026-03-09
- **Stories completed:** 4/4 (UX-01, UX-02, UX-03, MKT-01)
- **Points:** 11/11 (velocity 1.0)

---

## What Went Well

1. **Accessibility improvements were surgical** — All changes were HTML/CSS-only, requiring zero server-side modifications. This kept the blast radius minimal and eliminated API regression risk.

2. **Focus indicator audit was thorough** — Found 10 CSS rules that used `outline: none` on `:focus` with only `box-shadow` as replacement. The existing `forced-colors` media query already provided Windows High Contrast support, so only the standard focus rules needed updating.

3. **Brand name migration was clean** — 15 files across the repository were updated without breaking any tests. The canonical name decision (DEC-R4-003) provided clear guidance.

4. **Skip-nav targeting was improved** — Changing the target from `#main` (a hidden-by-default tab panel) to `#content` (the always-visible main landmark wrapper) ensures the skip link works regardless of active tab.

5. **Test authoring followed established patterns** — The new 27-test file uses the same static HTML analysis approach as existing accessibility tests, maintaining consistency.

---

## What Could Be Improved

1. **Inner `<main>` elements should have been flagged earlier** — The multiple `<main>` landmark issue (one per tab panel) was present since the initial HTML was created. Future accessibility audits (sprint planning) should include a landmark structure review before implementation begins.

2. **Multi-replace batch atomicity** — One replacement in a 5-operation batch failed because a prior replacement in the same batch changed the context for a later replacement. When replacements share overlapping context, they should be ordered carefully or executed sequentially.

---

## Lessons Learned

- **LESSON_CANDIDATE:** When auditing focus indicators, always check `forced-colors` media query compatibility. `box-shadow` is invisible in Windows High Contrast Mode; `outline` is the only reliable focus indicator across all display modes.
- **LESSON_CANDIDATE:** When using `role="main"` as a wrapper, prefer a `<div>` with `role="main"` over `<main>` to avoid confusion when inner sections also need semantic containers. A single `<main>` or `role="main"` per page is the rule.
- **LESSON_CANDIDATE:** Skip-nav target should be the outermost content container that is always visible, not a specific panel that may be hidden by tab navigation.

---

## Action Items for Next Sprint

- None. All accessibility stories from the UX discipline are complete.

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
