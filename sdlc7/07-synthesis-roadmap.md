# Synthesis Roadmap

## Purpose

This document consolidates the validated findings from the SDLC7 audit pack into milestones, epics, and issue candidates that can be created in GitHub for traceability.

## Strategic Conclusion

The repository should prioritize hardening and runtime consolidation before adding major new surface area.

Recommended execution order:

1. Security boundary hardening
2. Runtime and architecture consolidation
3. Type safety and module decomposition
4. Scalability profile hardening
5. CI/CD consistency and workflow confidence
6. Product readiness and operability documentation

## Milestones

| Milestone ID | Milestone title                           | Goal                                                                              | Depends on |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| M1           | Security Boundary Hardening               | Make non-local runtime fail closed and harden browser plus edge security posture. | None       |
| M2           | Runtime Consolidation                     | Define and enforce one canonical production runtime contract.                     | M1         |
| M3           | Type Safety and Module Decomposition      | Improve refactor safety and reduce logic concentration.                           | M2         |
| M4           | Production Scalability Profile            | Move production runtime away from single-process assumptions.                     | M2         |
| M5           | CI/CD Consistency and Delivery Confidence | Align toolchain and strengthen automation confidence.                             | M1, M3     |
| M6           | Product Readiness and Operability         | Align product claims, startup behavior, and operating documentation.              | M1, M2, M5 |

## Epics And Issue Candidates

## M1 - Security Boundary Hardening

### Epic: Fail-closed API security model

| Issue type | Title                                              | Description                                                                        |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Epic       | Enforce fail-closed non-local API security         | Ensure every non-local API path is protected by one explicit authentication model. |
| Issue      | Reject startup when non-local auth is unconfigured | Fail boot if `HOST` is non-local and no approved auth configuration is present.    |
| Issue      | Protect all `/api` routes outside localhost        | Remove the current GET route gap when auth middleware is absent.                   |
| Issue      | Define machine-to-machine API mode explicitly      | If API-key mode is supported, define scope, route coverage, and audit behavior.    |

### Epic: Browser and proxy hardening

| Issue type | Title                                               | Description                                                             |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| Epic       | Harden browser and edge security posture            | Remove permissive browser policy and tighten proxy assumptions.         |
| Issue      | Replace CSP `'unsafe-inline'` with nonces or hashes | Remove inline execution allowances from default CSP.                    |
| Issue      | Bound trusted proxy configuration                   | Replace blanket `trustProxy: true` with explicit proxy trust policy.    |
| Issue      | Expand rate limiting to selected GET APIs           | Protect read-heavy routes from abuse instead of exempting GET globally. |

### Epic: Supply-chain hardening

| Issue type | Title                                           | Description                                                           |
| ---------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Epic       | Eliminate floating GitHub Actions               | Pin all remaining actions by SHA and review workflow permissions.     |
| Issue      | Replace Trivy `@master` action reference        | Pin `aquasecurity/trivy-action` in CI.                                |
| Issue      | Pin Storybook workflow actions                  | Replace floating `@v4` tags in Storybook workflow.                    |
| Issue      | Review workflow permissions for least privilege | Validate permissions across all workflows and tighten where possible. |

## M2 - Runtime Consolidation

### Epic: Canonical runtime profiles

| Issue type | Title                                                  | Description                                                            |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Epic       | Define supported runtime profiles                      | Formalize `local-dev`, `ci-test`, and production runtime profiles.     |
| Issue      | Add runtime profile validator                          | Validate provider combinations and fail on unsupported runtime states. |
| Issue      | Document profile-specific env contract                 | Publish required and optional variables per runtime profile.           |
| Issue      | Enforce storage provider startup success in production | Remove fallback startup when storage initialization fails.             |

### Epic: Remove architecture ambiguity

| Issue type | Title                                                         | Description                                                                    |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Epic       | Eliminate legacy and documentation ambiguity                  | Remove leftover migration baggage and align all architecture docs.             |
| Issue      | Audit and remove `server.legacy.ts` or isolate it             | Decide whether the file should be deleted or formally quarantined.             |
| Issue      | Rewrite `src/webapp/README.md` runtime section                | Remove the outdated `No database` claim and align with provider-based reality. |
| Issue      | Rewrite technical manual architecture and deployment sections | Reflect current storage, queue, auth, and deployment options accurately.       |

## M3 - Type Safety And Module Decomposition

### Epic: Strict TypeScript migration

| Issue type | Title                                                 | Description                                               |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Epic       | Turn on strict TypeScript in the backend and platform | Improve refactor safety and reduce nullability ambiguity. |
| Issue      | Enable `strictNullChecks` and fix resulting errors    | First-stage strictness rollout.                           |
| Issue      | Enable full `strict` and resolve blockers             | Complete the TS safety baseline.                          |
| Issue      | Add regression guard for strict mode                  | Prevent strictness rollback in CI.                        |

### Epic: Break up concentrated modules

| Issue type | Title                                                    | Description                                                         |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Epic       | Decompose oversized route and service modules            | Move large logic clusters into narrower domain units.               |
| Issue      | Split `routes/misc.ts` by concern                        | Separate health, analytics, audit, static, and auxiliary behaviors. |
| Issue      | Split `services/session-service.ts` into focused modules | Separate transition logic, persistence, and orchestration support.  |
| Issue      | Extract shared helper modules from large route handlers  | Reduce handler complexity and improve testability.                  |

## M4 - Production Scalability Profile

### Epic: Hot-path persistence modernization

| Issue type | Title                                                            | Description                                                         |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Epic       | Reduce synchronous file I/O in production request paths          | Move production-critical persistence off blocking filesystem calls. |
| Issue      | Audit sync file operations in request paths                      | Identify the highest-impact blocking paths.                         |
| Issue      | Route write-heavy operations through provider-backed persistence | Use production-grade providers for critical paths.                  |
| Issue      | Benchmark blocking behavior before and after remediation         | Capture evidence of improvement.                                    |

### Epic: Distributed runtime defaults

| Issue type | Title                                                              | Description                                                                                    |
| ---------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Epic       | Make scale-oriented runtime features default in production         | Move persistent queueing and distributed SSE from optional to required in production profiles. |
| Issue      | Define production queue default                                    | Choose and enforce the canonical queue provider.                                               |
| Issue      | Define distributed SSE default                                     | Require Redis-backed or equivalent fan-out in distributed mode.                                |
| Issue      | Enforce infrastructure prerequisites for production scale profiles | Fail startup when required scale components are missing.                                       |

### Epic: Dispatcher throughput improvement

| Issue type | Title                                            | Description                                               |
| ---------- | ------------------------------------------------ | --------------------------------------------------------- |
| Epic       | Introduce bounded parallelism in agent execution | Improve throughput without violating dependency ordering. |
| Issue      | Map safe parallel execution groups by phase      | Define where concurrency is contract-safe.                |
| Issue      | Add bounded parallel execution to dispatcher     | Keep dependency control while improving throughput.       |
| Issue      | Add concurrency observability metrics            | Track queue wait, execution fan-out, and bottlenecks.     |

## M5 - CI/CD Consistency And Delivery Confidence

### Epic: Toolchain standardization

| Issue type | Title                                                    | Description                                                           |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Epic       | Align development and CI toolchain versions              | Remove Node version drift and make the supported toolchain explicit.  |
| Issue      | Standardize Node version across root CI and Storybook CI | Align runtime and build assumptions.                                  |
| Issue      | Update docs to match supported Node version policy       | Keep local setup and CI expectations aligned.                         |
| Issue      | Audit package-level version mismatches                   | Reduce avoidable toolchain inconsistency across root and UI packages. |

### Epic: Quality reporting convergence

| Issue type | Title                                              | Description                                                           |
| ---------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Epic       | Make quality coverage honest across backend and UI | Ensure coverage and test reporting reflect the whole product surface. |
| Issue      | Publish root versus UI test responsibility matrix  | Clarify what each package-level test suite proves.                    |
| Issue      | Add UI coverage visibility to release readiness    | Avoid a misleading platform-level coverage story.                     |
| Issue      | Reduce unnecessary exclusions after legacy cleanup | Tighten coverage once migration residue is removed.                   |

### Epic: Workflow-level confidence

| Issue type | Title                                         | Description                                                              |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Epic       | Add higher-value workflow automation          | Prove real user journeys, not only shell rendering and library behavior. |
| Issue      | Add CREATE journey E2E coverage               | Validate the main creation workflow.                                     |
| Issue      | Add AUDIT journey E2E coverage                | Validate the main audit workflow.                                        |
| Issue      | Add questionnaire and decision workflow tests | Cover save, reevaluate, and lifecycle transitions.                       |

## M6 - Product Readiness And Operability

### Epic: Fail-closed production startup

| Issue type | Title                                                    | Description                                                     |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Epic       | Stop booting in invalid production states                | Make startup enforce required runtime guarantees.               |
| Issue      | Fail startup on missing critical production dependencies | Reject incomplete production configuration.                     |
| Issue      | Fail startup on insecure production auth posture         | Prevent degraded non-local boot modes.                          |
| Issue      | Add release gate for runtime profile validity            | Ensure production packages pass the supported-runtime contract. |

### Epic: Operability documentation

| Issue type | Title                                               | Description                                                               |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Epic       | Publish an operable platform reference              | Enable maintainers other than the author to run and support the platform. |
| Issue      | Write production reference architecture document    | Define the authoritative runtime shape.                                   |
| Issue      | Write operational runbook                           | Cover startup, failure modes, recovery, and maintenance tasks.            |
| Issue      | Align release messaging with actual readiness state | Avoid over-claiming before hardening is complete.                         |

## Suggested Labels

- `audit-validation`
- `security`
- `architecture`
- `runtime`
- `typescript`
- `scalability`
- `ci-cd`
- `documentation`
- `production-readiness`
- `traceability`

## Suggested First Wave

If only a small first wave can be funded, I would open these first:

1. Reject startup when non-local auth is unconfigured.
2. Protect all `/api` routes outside localhost.
3. Replace CSP `'unsafe-inline'`.
4. Enforce storage provider startup success in production.
5. Rewrite `src/webapp/README.md` and technical manual runtime sections.
6. Audit and remove or isolate `server.legacy.ts`.

## Traceability Note

Each issue created from this roadmap should reference the source analysis file in this folder so the reasoning remains auditable.
