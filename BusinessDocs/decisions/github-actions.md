# Decisions: GitHub Actions CI/CD

> Stack: github-actions | Status: ACTIVE | Applicable: PARTIAL

---

## Active Decisions

| ID      | Priority | Scope                             | Decision                                                                                                                                                                                                                               | Notes | Date       |
| ------- | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-213 | HIGH     | Phase 2 (GitHub Actions Standard) | Yes. All automation must run through in-repo GitHub workflow YAML; manual/legacy execution is break-glass only with incident ticket and back-port to workflow within 1 business day.                                                   |       | 2026-03-07 |
| DEC-214 | HIGH     | Phase 2 (Action Supply Chain)     | Yes. Actions must be pinned to full commit SHA; unpinned tags are prohibited in protected branches; third-party actions require approved publisher and periodic review.                                                                |       | 2026-03-07 |
| DEC-215 | HIGH     | Phase 2 (Workflow Permissions)    | Default `permissions: {}` (no permissions); elevate per job to least privilege only when required; write permissions on default branch require explicit owner-reviewed justification. This is the GitHub-recommended hardened default. |       | 2026-03-16 |
| DEC-217 | HIGH     | Phase 2 (Required Checks)         | Blocking checks: build, unit/integration tests, lint/format, dependency vulnerability scan, and required code scanning results for changed code.                                                                                       |       | 2026-03-07 |
| DEC-218 | HIGH     | Phase 2 (Branch Protection)       | Enforce PR-only merges, minimum 1 CODEOWNER review, up-to-date branch requirement, no force-push/delete on protected branches, and linear history or merge queue.                                                                      |       | 2026-03-07 |
| DEC-219 | HIGH     | Phase 2 (Workflow Trigger Safety) | Sensitive workflows cannot run privileged steps on untrusted fork code; `pull_request_target` use requires security review and strict path/event guards.                                                                               |       | 2026-03-07 |
| DEC-220 | HIGH     | Phase 2 (Artifact Integrity)      | Yes. Release artifacts must be immutable, traceable to commit/workflow run, and include provenance attestations before promotion.                                                                                                      |       | 2026-03-07 |
| DEC-223 | MEDIUM   | Phase 2 (Caching Policy)          | Use deterministic cache keys with lockfile/hash inputs, scoped restore keys, no cache writes from untrusted forks, and retention tuned to 7-30 days by workload churn.                                                                 |       | 2026-03-07 |
| DEC-224 | MEDIUM   | Phase 2 (Concurrency Control)     | Configure workflow/job concurrency groups per branch/environment with cancel-in-progress for non-release branches; production deploy groups must serialize and never overlap.                                                          |       | 2026-03-07 |
| DEC-228 | MEDIUM   | Phase 2 (Dependency Automation)   | Run dependency updates weekly, group low-risk updates by ecosystem, and allow auto-merge only when all required checks pass and change is patch-level with no policy violations.                                                       |       | 2026-03-07 |
| DEC-229 | MEDIUM   | Phase 2 (Flaky Test Governance)   | Flaky tests must be auto-flagged, assigned an owner within 1 business day, fixed or quarantined within 7 days, and cannot remain quarantined beyond one sprint without approval.                                                       |       | 2026-03-07 |
| DEC-233 | LOW      | Phase 2 (Workflow Naming & Docs)  | Workflows/jobs must use consistent descriptive naming convention and include purpose, triggers, owners, and runbook links in repo docs for operational clarity.                                                                        |       | 2026-03-07 |
| DEC-234 | LOW      | Phase 2 (Local CI Simulation)     | Local CI simulation is optional but recommended for rapid feedback; canonical gating remains GitHub-hosted CI results on pull requests.                                                                                                |       | 2026-03-07 |
| DEC-235 | MEDIUM   | Phase 2 (Security Scanning Depth) | Enable CodeQL for all supported repository languages, mandatory secret scanning and dependency scanning on PR and default branch, with high/critical findings blocking merge.                                                          |       | 2026-03-07 |

## Deferred Decisions (not applicable to current codebase)

| ID      | Priority | Scope | Decision                                                                            | Deferred Reason                                                                   | Date       |
| ------- | -------- | ----- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| DEC-216 | —        | —     | Must deployments use OIDC federation to cloud providers with long-lived cloud cr... | No cloud provider — OIDC federation not applicable for localhost                  | 2026-03-08 |
| DEC-221 | —        | —     | What reusable workflow/composite action strategy is required across repositories... | Single repository — reusable workflows across repos not needed                    | 2026-03-08 |
| DEC-222 | —        | —     | What policy governs GitHub-hosted vs self-hosted runners, including hardening an... | Not using self-hosted runners                                                     | 2026-03-08 |
| DEC-225 | —        | —     | What standards apply to test/build matrix design (OS/runtime coverage, fail-fast... | Single Node.js target — multi-OS/runtime matrix not applicable                    | 2026-03-08 |
| DEC-226 | —        | —     | What telemetry and alerting baseline is required for workflow health, failure ra... | Over-scoped CI observability for localhost dev tool                               | 2026-03-08 |
| DEC-227 | —        | —     | What retention policy applies to logs, test reports, artifacts, and security rep... | Over-scoped retention policy for localhost dev tool                               | 2026-03-08 |
| DEC-230 | —        | —     | What path-filter and affected-project strategy is required to optimize CI in mon... | Not a monorepo — path filters not applicable                                      | 2026-03-08 |
| DEC-231 | —        | —     | What environment protection and approval controls are required for release/deplo... | No production environment — release workflow controls not applicable (DEC-R2-001) | 2026-03-08 |
| DEC-232 | —        | —     | What review policy is mandatory for `.github/workflows` and shared action change... | Solo developer — 2 approvals + CODEOWNERS contradicts DEC-R2-005                  | 2026-03-08 |
| DEC-236 | —        | —     | What incident response and recovery expectations apply when GitHub Actions or ru... | Over-scoped incident recovery for localhost dev tool                              | 2026-03-08 |
