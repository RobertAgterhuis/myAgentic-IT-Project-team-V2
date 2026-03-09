# Lessons Learned — Cumulative

_Last update: SP-8 — 2026-03-09_

## ⚡ Top-3 for next sprint (automatically generated)
1. LL-14: For documentation rewrites >100 lines, use backup → delete → create workflow instead of in-place replacement.
2. LL-15: Verify session-state.json current_step matches expected state at session start before proceeding.
3. LL-12: When writing tests that validate CSS properties in inline stylesheets, match against `var(--token-name)` rather than raw computed values.

## All active lessons

| ID | Sprint | Lesson | Category | Recommended action | Status |
|----|--------|--------|----------|--------------------|--------|
| LL-1 | SP-1 | Technical manual claimed "95%+ statement coverage" but actual measurement was 87.47%. Discrepancy only caught by Documentation Agent cross-check. | QUALITY | Documentation Agent must verify all numeric claims (coverage, test counts, error counts) against actual tool output before publishing. | ACTIVE |
| LL-2 | SP-1 | Sprint completed at 11 SP vs 10 SP nominal capacity (velocity ratio 1.0). SP-2: 10 SP, velocity 1.0. SP-3: 11 SP, velocity 1.0. Three data points — sufficient for capacity adjustment. Average: 10.7 SP. | ESTIMATION | Can increase nominal capacity to 11 SP for SP-4+. Continue monitoring velocity ratio. | ACTIVE |
| LL-3 | SP-1 | Running CODE and ANALYSIS stories on parallel tracks eliminated all inter-story blocking. Confirmed in SP-2 (TECH-04 CODE + BIZ-03 ANALYSIS). | VELOCITY | Continue parallel-track assignment for stories without dependencies. Prioritize placing at least one non-CODE story per sprint. | ACTIVE |
| LL-4 | SP-2 | Abstractions pay off: FileStore existed from SP-1 for server.js. When TECH-04 required unifying mcp-server.js writes, the refactoring was minimal (replace safeWrite body with store.writeFile()). Early abstraction reduced SP-2 effort. | ARCHITECTURE | When introducing new write/read paths, wrap them in the existing abstraction layer from the start — avoid creating parallel "quick" implementations. | ACTIVE |
| LL-5 | SP-3 | When replacing inline validators with centralized schema validators (TECH-03), error messages must match existing test assertions exactly. Schema validators should handle structural concerns only; business logic validation (e.g., action dispatch, custom error codes) should remain in handlers. 11 test failures were caused by message mismatches before alignment. | INTEGRATION | When centralizing validation: (1) inventory all error messages in existing tests, (2) make schema return identical messages, (3) keep business-specific dispatch in handlers. | ACTIVE |
| LL-6 | SP-5 | Focus indicators that use only `box-shadow` are invisible in Windows High Contrast Mode (`forced-colors: active`). Always use `outline` as the primary focus indicator — it is the only CSS property guaranteed to render in all display modes. | ACCESSIBILITY | When auditing or adding focus styles: (1) use `outline` as primary indicator, (2) verify `forced-colors` media query includes `outline` rule, (3) `box-shadow` may supplement but never replace `outline`. | ACTIVE |
| LL-7 | SP-5 | Use a single `role="main"` (or `<main>`) per page. When a SPA has multiple content panels (tab panels), wrap all of them in one main landmark rather than giving each panel its own `<main>`. | ACCESSIBILITY | At HTML authoring time: one main landmark wrapping all content containers. Inner sections use `<div>` with `role="tabpanel"` or `<section>`. | ACTIVE |
| LL-8 | SP-5 | Skip-nav target should be the outermost always-visible content container (`role="main"` wrapper), not a specific panel that may be hidden by tab navigation. | ACCESSIBILITY | Skip link `href` should target the main landmark ID. Verify the target element is always in the DOM and not `display: none`. | ACTIVE |
| LL-9 | SP-6 | When adding persistence to an in-memory data structure, design the load/flush pair together and test the round-trip explicitly. The round-trip test (flush → reset → load → verify) is the most important single test — it validates the contract that data survives restarts. | PERSISTENCE | Always write a round-trip test when adding file-backed persistence. Load must handle missing/corrupt files gracefully. | ACTIVE |
| LL-10 | SP-6 | Health endpoints should use the lightest possible store probe (e.g., `store.exists()` on a known directory) rather than a full read/write cycle. This ensures the health check itself doesn't create load or side effects. | OPERATIONS | Health check probes: read-only, no allocations, no file creation. Target <10ms response. | ACTIVE |
| LL-11 | SP-6 | When adding periodic timers in a Node.js server, always `.unref()` the timer to prevent it from keeping the process alive during shutdown. Pair with `clearInterval()` in the shutdown handler. | NODE_JS | `.unref()` all timers; `clearInterval()` in shutdown; flush any pending data before exit. | ACTIVE |
| LL-12 | SP-7 | When writing tests that validate CSS properties in inline stylesheets, match against `var(--token-name)` rather than raw computed values. The codebase uses CSS custom properties consistently, and tests must reflect this. | TESTING | Test assertions for CSS should reference design token variable names, not raw values. | ACTIVE |
| LL-13 | SP-7 | When regex-parsing JS array content that may contain square brackets inside strings, use `],` (bracket followed by comma or end-of-array) as the terminator rather than a bare `]` to avoid premature matches. | TESTING | Use `],` or end-of-array patterns when regex-extracting array literals from source code. | ACTIVE |
| LL-14 | SP-8 | Attempting to replace entire file content (200+ lines) in a single `replace_string_in_file` operation fails. For documentation rewrites >100 lines, use backup → delete → create workflow. | TOOLING | For large file rewrites: (1) backup original, (2) delete file, (3) create with new content. Never attempt single-operation replacement of entire files. | ACTIVE |
| LL-15 | SP-8 | session-state.json can revert to older values between sessions (likely due to concurrent writes or cache). Always verify `current_step` matches expected state at session start before making updates. | PERSISTENCE | At session start: read session-state.json, verify current_step, correct if drifted before proceeding. | ACTIVE |

## Revised lessons
| ID | Original lesson | Reason for revision | Revised lesson |
|----|----------------|--------------------|--------------------|

## Archived lessons (no longer relevant)
| ID | Lesson | Archived per sprint |
