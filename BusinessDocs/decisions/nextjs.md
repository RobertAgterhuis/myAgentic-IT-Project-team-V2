# Decisions: NextJS Framework

> Stack: nextjs | Status: DEFERRED | Applicable: PENDING
> Auto-activated by Orchestrator (RULE ORC-45) when this technology is detected.

---

## Decided Items

| ID      | Priority | Scope                                    | Decision                                                                                                                                                                    | Notes | Date       |
| ------- | -------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-200 | HIGH     | Phase 3 (NextJS Framework Baseline)      | App Router is the default baseline for new NextJS code; legacy pages usage is allowed only for existing modules with migration plan and owner.                              |       | 2026-03-07 |
| DEC-201 | HIGH     | Phase 3 (NextJS Rendering Strategy)      | Route-level rendering model must be explicitly declared by feature team; default is static/ISR where possible, SSR only when required by data freshness or personalization. |       | 2026-03-07 |
| DEC-202 | HIGH     | Phase 3 (NextJS Data & Secrets Boundary) | Secrets and privileged API calls are server-only (server components/actions/route handlers); client components cannot access secrets or privileged tokens directly.         |       | 2026-03-07 |
| DEC-203 | HIGH     | Phase 3 (NextJS Image & Asset Security)  | Configure strict allowlist for external image domains, keep image optimization enabled in production, and align image/asset sources with CSP policy.                        |       | 2026-03-07 |
| DEC-204 | HIGH     | Phase 3 (NextJS Caching & Revalidation)  | Define explicit cache and revalidation per data source; use tag/path invalidation for content changes; avoid uncached SSR by default unless required.                       |       | 2026-03-07 |
| DEC-205 | HIGH     | Phase 3 (NextJS Security Baseline)       | Enforce security headers, CSRF protections for state-changing endpoints, secure/HttpOnly/SameSite cookies, and reviewed middleware rules for auth and redirects.            |       | 2026-03-07 |
| DEC-206 | MEDIUM   | Phase 3 (NextJS API Route Standards)     | API routes require schema validation, standardized error contract, rate limiting for public endpoints, and explicit timeout/cancellation handling.                          |       | 2026-03-07 |
| DEC-207 | MEDIUM   | Phase 3 (NextJS Runtime Target)          | Default runtime is Node.js; Edge runtime is allowed only for stateless low-latency use cases after compatibility and observability requirements are met.                    |       | 2026-03-07 |
| DEC-208 | MEDIUM   | Phase 3 (NextJS Observability)           | Require structured logs, distributed tracing, Web Vitals collection, and alerting on error-rate/latency thresholds across server and client telemetry.                      |       | 2026-03-07 |
| DEC-209 | MEDIUM   | Phase 3 (NextJS Testing Gates)           | Require unit/integration tests for changed logic, critical user journey e2e tests, and minimum 80% line coverage for modified NextJS modules.                               |       | 2026-03-07 |
| DEC-210 | MEDIUM   | Phase 3 (NextJS Performance Budgets)     | Enforce Core Web Vitals targets at p75 (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1) and route bundle budgets with release block on sustained regressions.                        |       | 2026-03-07 |
| DEC-211 | LOW      | Phase 3 (Preview/Feature Flags)          | Every PR gets ephemeral preview where feasible; feature flags require owner, default-off for risky changes, rollout plan, and cleanup deadline after full rollout.          |       | 2026-03-07 |
| DEC-212 | MEDIUM   | Phase 3 (NextJS Upgrade Policy)          | Apply monthly minor/patch updates and plan major upgrades within 90 days of stable release; deprecated APIs require migration plans and tracked deadlines.                  |       | 2026-03-07 |
