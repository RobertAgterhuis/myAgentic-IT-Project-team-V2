# Decisions: Cross-cutting Enterprise

> Stack: cross-cutting | Status: ACTIVE | Applicable: PARTIAL

---

## Active Decisions

| ID      | Priority | Scope                                    | Decision                                                                                                                                                                                                                                                                                       | Notes | Date       |
| ------- | -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-262 | HIGH     | Phase 2, Phase 3 (API Governance)        | All APIs require versioned contracts, backward compatibility by default, automated contract tests in CI, and formal deprecation windows with migration guidance before breaking changes.                                                                                                       |       | 2026-03-07 |
| DEC-267 | MEDIUM   | Phase 5 (Non-Functional Testing)         | Require load/performance tests for critical paths, resilience/failure-mode tests for key dependencies, and release-blocking performance regression thresholds in CI/CD.                                                                                                                        |       | 2026-03-07 |
| DEC-269 | MEDIUM   | Phase 4, Phase 5 (Release Lifecycle)     | Enforce semantic versioning, feature-flag ownership with expiry dates, release notes for all production changes, and formal sunset plans for deprecated capabilities.                                                                                                                          |       | 2026-03-07 |
| DEC-270 | MEDIUM   | All phases (Documentation & ADRs)        | Maintain ADRs for major technical decisions, service/runbook documentation as release prerequisites, and quarterly doc ownership reviews to prevent stale guidance.                                                                                                                            |       | 2026-03-07 |
| DEC-308 | HIGH     | Phase 2, Phase 3 (TypeScript Strictness) | Root tsconfig has `strict: false` / `strictNullChecks: false`; UI tsconfig has `strict: true`. This divergence must be resolved: create a migration plan to bring root to `strict: true` with sprint-level milestones. New packages must start with `strict: true`. See also DEC-239, DEC-243. |       | 2026-03-16 |
| DEC-309 | HIGH     | Phase 2 (ESLint Version Unification)     | Yes. Root uses ESLint v8 (EOL), UI uses ESLint v9. Migrate root to ESLint v9 with flat config. ESLint v8 is end-of-life and no longer receives security patches. Track as priority tech debt. See also DEC-237, DEC-257.                                                                       |       | 2026-03-16 |
| DEC-310 | MEDIUM   | Phase 2 (Test Runner Unification)        | Yes. The project currently runs both Jest and Vitest. Target Vitest as the single runner. Migrate remaining Jest tests incrementally. Remove Jest dependency when complete. See also DEC-288.                                                                                                  |       | 2026-03-16 |

## Deferred Decisions (activate when applicable to project)

| ID      | Priority | Scope | Decision                                                                            | Deferred Reason                        | Date |
| ------- | -------- | ----- | ----------------------------------------------------------------------------------- | -------------------------------------- | ---- |
| DEC-261 | —        | —     | What end-to-end identity and authorization model is mandatory for users, service... | Activate when identity system is added | —    |
| DEC-263 | —        | —     | What Azure network/edge architecture baseline is required for ingress, segmentat... | Activate when cloud deployment added   | —    |
| DEC-264 | —        | —     | What application-level data governance model is required for classification, enc... | Activate when data governance needed   | —    |
| DEC-265 | —        | —     | What workload-level continuity and disaster recovery standard is mandatory beyon... | Activate when production deployment    | —    |
| DEC-266 | —        | —     | What SRE operating model is required for SLOs, error budgets, incident severity,... | Activate when SRE team is formed       | —    |
| DEC-268 | —        | —     | What cadence is required for threat modeling, security validation, and remediati... | Activate when threat modeling scoped   | —    |
