# Decisions: Microsoft Playwright (CAT-08)

> Stack: playwright | Status: DEFERRED | Applicable: NO
> Deferred-Reason: No @playwright/test, playwright config, or E2E test
> references detected. Current E2E testing uses Jest + JSDOM. Activate when
> browser-based E2E testing is introduced.
> GitHub Issue: #34

---

## Decided Items

| ID      | Priority | Scope                                | Decision                                                                                           | Notes                                                                                            | Date       |
| ------- | -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| DEC-CAT-801 | HIGH | Phase 2 (E2E Strategy)               | Use Playwright as the sole E2E test framework; no Cypress, Selenium, or Puppeteer                  | Playwright supports all major browsers with single API; cross-browser by default                  | 2026-03-18 |
| DEC-CAT-802 | HIGH | Phase 2 (Browser Matrix)             | Test against Chromium, Firefox, and WebKit in CI; Chromium-only acceptable for local dev            | Full matrix on PR merge; Chromium-only for draft PRs to reduce CI time                            | 2026-03-18 |
| DEC-CAT-803 | HIGH | Phase 5 (CI Parallelism)             | Run Playwright tests with sharding (≥ 2 shards) in CI for acceptable wall-clock time               | Use `--shard` flag; collect trace/screenshot artifacts on failure                                 | 2026-03-18 |
| DEC-CAT-804 | MEDIUM | Phase 2 (Test Isolation)            | Each Playwright test must be independent; no shared state between tests; use fixtures               | Browser context per test; storageState fixtures for authenticated tests                           | 2026-03-18 |
| DEC-CAT-805 | MEDIUM | Phase 5 (Visual Regression)         | Use Playwright's screenshot comparison for critical UI flows; review diffs in PR                    | Visual snapshots stored in repo; `--update-snapshots` requires explicit approval                  | 2026-03-18 |
| DEC-CAT-806 | LOW  | Phase 2 (API Mocking)                | Use Playwright's `route()` API for external API mocking in E2E tests; no separate mock servers      | Keeps test infrastructure simple; mocks defined in test files                                     | 2026-03-18 |

---

_Category created: 2026-03-18 | Implementation Agent | Sprint 5 SP-5-CAT_
