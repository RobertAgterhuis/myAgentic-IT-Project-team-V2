# Decisions: Vite Framework

> Stack: vite | Status: DEFERRED | Applicable: PENDING
> Auto-activated by Orchestrator (RULE ORC-45) when this technology is detected.

---

## Decided Items

| ID      | Priority | Scope                              | Decision                                                                                                                                                              | Notes | Date       |
| ------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-189 | HIGH     | Phase 3 (Vite Framework Boundary)  | Vite is approved for SPA and frontend package/library builds; SSR workloads are not implemented in Vite and must use NextJS when server rendering is required.        |       | 2026-03-07 |
| DEC-190 | HIGH     | Phase 3 (Vite Runtime Baseline)    | Use pinned active LTS Node.js version in CI and local development with lockfile-enforced installs; package manager must be consistent across repo and enforced in CI. |       | 2026-03-07 |
| DEC-191 | HIGH     | Phase 3 (Vite Environment Secrets) | Client-exposed values must use VITE\_ prefix and contain no secrets; secrets remain server-side only and are injected at deployment platform level, never committed.  |       | 2026-03-07 |
| DEC-192 | HIGH     | Phase 3 (Vite Build & Deploy)      | Production builds must emit content-hashed assets, immutable cache headers for hashed files, and protected sourcemaps (restricted or disabled in public production).  |       | 2026-03-07 |
| DEC-193 | HIGH     | Phase 3 (Vite Security Headers)    | Enforce CSP, HSTS, X-Frame-Options/Frame-Ancestors controls, Referrer-Policy, and X-Content-Type-Options at edge/server layer for all production environments.        |       | 2026-03-07 |
| DEC-194 | MEDIUM   | Phase 3 (Vite Plugin Governance)   | Maintain an approved plugin allowlist; new plugins require security and maintenance review; plugin updates are reviewed monthly with pinned versions in lockfile.     |       | 2026-03-07 |
| DEC-195 | MEDIUM   | Phase 3 (Vite Target & Polyfills)  | Define browserslist baseline for supported evergreen browsers; polyfills are explicit and minimal, automatically validated in CI compatibility tests.                 |       | 2026-03-07 |
| DEC-196 | MEDIUM   | Phase 3 (Vite Performance Budgets) | Enforce bundle budgets in CI (initial JS and CSS size caps) and block merges on regression above 10% unless approved with mitigation plan.                            |       | 2026-03-07 |
| DEC-197 | MEDIUM   | Phase 3 (Vite Testing Strategy)    | Require unit/component tests for changed UI logic, critical-path e2e tests, and minimum 80% line coverage on app code before merge.                                   |       | 2026-03-07 |
| DEC-198 | LOW      | Phase 3 (Vite Dev Proxy Policy)    | Dev proxy targets must be explicit and environment-scoped; local mocks are versioned test fixtures and must not bypass auth/security logic in integration testing.    |       | 2026-03-07 |
| DEC-199 | MEDIUM   | Phase 3 (Vite Release Governance)  | Release immutable versioned artifacts only, keep previous deployable artifact available, and support one-click rollback with smoke-test validation after rollback.    |       | 2026-03-07 |
