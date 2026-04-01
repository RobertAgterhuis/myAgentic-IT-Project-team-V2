# Decisions: Google Lighthouse (CAT-07)

> Stack: lighthouse | Status: DEFERRED | Applicable: PENDING
> Auto-activated by Orchestrator (RULE ORC-45) when this technology is detected.

---

## Decided Items

| ID          | Priority | Scope                           | Decision                                                                                      | Notes                                                                                                                              | Date       |
| ----------- | -------- | ------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| DEC-CAT-701 | HIGH     | Phase 2 (Performance Budgets)   | Define performance budgets for all user-facing pages; Lighthouse CI enforces as blocking gate | Budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1, Total Blocking Time < 200ms (FID replaced by INP in Core Web Vitals since March 2024) | 2026-03-16 |
| DEC-CAT-702 | HIGH     | Phase 5 (CI Integration)        | Run Lighthouse CI on every PR for changed pages; store results as artifacts                   | Use @lhci/cli in GitHub Actions; compare against baseline assertions                                                               | 2026-03-18 |
| DEC-CAT-703 | MEDIUM   | Phase 2 (Accessibility Scoring) | Lighthouse accessibility score must be ≥ 90 for all pages; blocking on regression             | Supplements manual a11y testing; catches common WCAG violations                                                                    | 2026-03-18 |
| DEC-CAT-704 | MEDIUM   | Phase 5 (Best Practices Score)  | Lighthouse best practices score must be ≥ 90; warnings reviewed but non-blocking              | Catches security headers, console errors, deprecated APIs                                                                          | 2026-03-18 |
| DEC-CAT-705 | LOW      | Phase 5 (Historical Tracking)   | Store Lighthouse CI results in LHCI server or flat files for trend analysis                   | Enables performance regression detection over time                                                                                 | 2026-03-18 |

---
