# GitHub Epic And Issue Drafts

## Purpose

This file turns the SDLC7 synthesis roadmap into copy-paste-ready GitHub epics and issues.

## Live GitHub Status

The draft set in this file has been created in GitHub and assigned to live milestones.

### Milestones created

- `M1: Security Boundary Hardening` - GitHub milestone `#81`
- `M2: Runtime Consolidation` - GitHub milestone `#82`
- `M3: Type Safety and Module Decomposition` - GitHub milestone `#83`
- `M4: Production Scalability Profile` - GitHub milestone `#84`
- `M5: CI/CD Consistency and Delivery Confidence` - GitHub milestone `#85`
- `M6: Product Readiness and Operability` - GitHub milestone `#86`

### Epic issues created

- `Epic 1` -> issue `#658`
- `Epic 2` -> issue `#656`
- `Epic 3` -> issue `#657`
- `Epic 4` -> issue `#655`
- `Epic 5` -> issue `#654`
- `Epic 6` -> issue `#662`
- `Epic 7` -> issue `#660`
- `Epic 8` -> issue `#659`
- `Epic 9` -> issue `#661`
- `Epic 10` -> issue `#663`
- `Epic 11` -> issue `#667`
- `Epic 12` -> issue `#668`
- `Epic 13` -> issue `#665`
- `Epic 14` -> issue `#666`
- `Epic 15` -> issue `#664`

### First-wave tasks created

- `Task 1` -> issue `#670`
- `Task 2` -> issue `#671`
- `Task 3` -> issue `#673`
- `Task 4` -> issue `#669`
- `Task 5` -> issue `#672`
- `Task 6` -> issue `#674`

### Parent-child links created

- `#658` -> `#670`, `#671`
- `#656` -> `#673`
- `#655` -> `#669`
- `#654` -> `#672`, `#674`

The wording below is aligned to the repository's existing GitHub issue forms:

- feature requests: problem statement, proposed solution, alternatives considered, acceptance criteria, priority
- tasks: description, acceptance criteria, effort estimate, dependencies

## Recommended Labels

- `type: feature`
- `type: chore`
- `security`
- `architecture`
- `runtime`
- `typescript`
- `scalability`
- `ci-cd`
- `documentation`
- `production-readiness`
- `traceability`
- `audit-validation`

## Suggested Milestone Mapping

- M1: Security Boundary Hardening
- M2: Runtime Consolidation
- M3: Type Safety and Module Decomposition
- M4: Production Scalability Profile
- M5: CI/CD Consistency and Delivery Confidence
- M6: Product Readiness and Operability

## Epic Drafts

## Epic 1

### Title

Enforce fail-closed non-local API security

### Live GitHub issue

`#658`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `security`
- `production-readiness`
- `audit-validation`

### Suggested milestone

M1: Security Boundary Hardening

### Problem statement

The current non-local runtime can expose API surface in degraded auth mode. In `src/webapp/app.ts`, when auth middleware is absent, the fallback protection only applies to non-GET API requests outside localhost. That leaves GET `/api/**` routes outside the same security model and creates a fail-open posture for non-local deployment.

### Proposed solution

Define one explicit non-local API security model and enforce it uniformly for all `/api` routes. Outside localhost, the application must either run with configured auth or fail startup. If machine-to-machine access is supported, that path must be explicit, bounded, and consistently applied.

### Alternatives considered

- Keep the current fallback and treat localhost assumptions as sufficient. Rejected because the code already supports non-local host configuration.
- Apply API-key fallback only to mutations. Rejected because this still leaves read APIs exposed in degraded auth mode.

### Acceptance criteria

- [ ] Outside localhost, startup fails when no approved auth mode is configured.
- [ ] All `/api` routes are protected by one explicit security model.
- [ ] The current GET route gap is removed.
- [ ] The chosen security model is documented in the technical manual.

### Priority

Critical

## Epic 2

### Title

Harden browser and edge security posture

### Live GitHub issue

`#656`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `security`
- `runtime`
- `audit-validation`

### Suggested milestone

M1: Security Boundary Hardening

### Problem statement

The current browser and edge posture remains too permissive for a production-grade platform. The default CSP still allows `'unsafe-inline'`, `trustProxy` is enabled globally without bounded trust configuration, and GET routes are broadly exempt from rate limiting.

### Proposed solution

Replace permissive defaults with bounded production-safe settings. Remove `'unsafe-inline'` from CSP, introduce explicit trusted proxy configuration, and expand abuse protection to selected GET APIs.

### Alternatives considered

- Keep current defaults for simplicity. Rejected because they are inconsistent with production-grade claims.
- Only harden CSP while leaving proxy and rate-limit policy unchanged. Rejected because the exposure model spans browser and edge assumptions together.

### Acceptance criteria

- [ ] Default CSP no longer relies on `'unsafe-inline'`.
- [ ] Trusted proxies are explicitly configured rather than globally trusted.
- [ ] Selected GET APIs are rate-limited under a documented policy.
- [ ] Health and internal endpoints are handled through explicit exceptions only.

### Priority

High

## Epic 3

### Title

Eliminate floating GitHub Actions

### Live GitHub issue

`#657`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `security`
- `ci-cd`
- `audit-validation`

### Suggested milestone

M1: Security Boundary Hardening

### Problem statement

The repository already pins many GitHub Actions, but not all of them. `aquasecurity/trivy-action@master` is still floating, and the Storybook workflow still uses floating `@v4` tags. That creates a supply-chain inconsistency.

### Proposed solution

Pin all remaining GitHub Actions by SHA and review workflow permissions for least privilege.

### Alternatives considered

- Keep major tags for convenience. Rejected because the repository already moved toward SHA pinning elsewhere.

### Acceptance criteria

- [ ] All GitHub Actions are pinned by SHA.
- [ ] Workflow permissions are reviewed and tightened where possible.
- [ ] Supply-chain documentation is updated to describe the pinning policy.

### Priority

High

## Epic 4

### Title

Define supported runtime profiles

### Live GitHub issue

`#655`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `architecture`
- `runtime`
- `production-readiness`

### Suggested milestone

M2: Runtime Consolidation

### Problem statement

The repository currently presents multiple runtime stories at once. Configuration supports provider-based storage, queueing, and sessions, while docs and defaults still lean on single-node file-backed behavior. This creates ambiguity in operations and deployment.

### Proposed solution

Formalize explicit runtime profiles such as `local-dev`, `ci-test`, `production-single-node`, and `production-distributed`. Validate supported combinations and document the environment contract for each.

### Alternatives considered

- Continue using loosely implied defaults. Rejected because runtime ambiguity is already causing documentation and readiness drift.

### Acceptance criteria

- [ ] Supported runtime profiles are formally defined.
- [ ] Unsupported provider combinations are rejected.
- [ ] Environment contract is documented per profile.
- [ ] Production profile assumptions are enforced at startup.

### Priority

High

## Epic 5

### Title

Eliminate legacy and documentation ambiguity

### Live GitHub issue

`#654`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `architecture`
- `documentation`
- `traceability`

### Suggested milestone

M2: Runtime Consolidation

### Problem statement

The repository still contains migration residue and outdated or mixed documentation. `server.legacy.ts` still exists, `src/webapp/README.md` still claims `No database`, and the technical manual mixes older file-centric assumptions with newer provider-based runtime details.

### Proposed solution

Remove or isolate `server.legacy.ts` and rewrite the affected documentation so it describes the actual runtime architecture, persistence model, and deployment assumptions.

### Alternatives considered

- Leave legacy files and rely on tribal knowledge. Rejected because this reduces maintainability and increases operational risk.

### Acceptance criteria

- [ ] `server.legacy.ts` is removed or formally isolated.
- [ ] `src/webapp/README.md` no longer contains outdated persistence claims.
- [ ] The technical manual aligns with the real runtime architecture.
- [ ] Coverage exclusions caused only by legacy residue are reviewed.

### Priority

High

## Epic 6

### Title

Turn on strict TypeScript in the backend and platform

### Live GitHub issue

`#662`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `typescript`
- `architecture`
- `audit-validation`

### Suggested milestone

M3: Type Safety and Module Decomposition

### Problem statement

The backend and platform currently run with `strict: false` and `strictNullChecks: false`, while also maintaining a mixed JS and TS posture. This materially reduces safe refactoring and makes architectural cleanup harder.

### Proposed solution

Roll out strict TypeScript in phases, starting with `strictNullChecks`, then full `strict`, while fixing issues module by module.

### Alternatives considered

- Keep current loose settings indefinitely. Rejected because the repository is already complex enough to benefit from stronger compiler guarantees.

### Acceptance criteria

- [ ] `strictNullChecks` is enabled and errors are resolved for targeted modules.
- [ ] Full `strict` is enabled for backend and platform code.
- [ ] CI prevents regression once strict mode is enabled.
- [ ] Remaining exceptions, if any, are tracked explicitly.

### Priority

High

## Epic 7

### Title

Decompose oversized route and service modules

### Live GitHub issue

`#660`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `architecture`
- `typescript`

### Suggested milestone

M3: Type Safety and Module Decomposition

### Problem statement

Several route and service files are already large enough to signal logic concentration. This increases cognitive load and makes refactoring harder.

### Proposed solution

Split oversized modules into narrower domain-focused units, starting with `routes/misc.ts` and `services/session-service.ts`.

### Alternatives considered

- Leave large files as-is and rely on comments or conventions. Rejected because the underlying maintenance problem remains.

### Acceptance criteria

- [ ] `routes/misc.ts` is decomposed by concern.
- [ ] `services/session-service.ts` is decomposed by domain responsibility.
- [ ] Shared helper logic is extracted where appropriate.
- [ ] Tests continue to cover the refactored behavior.

### Priority

Medium

## Epic 8

### Title

Reduce synchronous file I/O in production request paths

### Live GitHub issue

`#659`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `scalability`
- `runtime`

### Suggested milestone

M4: Production Scalability Profile

### Problem statement

The current request path still relies on synchronous file I/O in the default store implementation. This is acceptable for small local usage, but it is not a strong foundation for sustained production load.

### Proposed solution

Audit request-path file operations and route production-critical persistence through provider-backed implementations that avoid blocking the main Node.js process.

### Alternatives considered

- Keep sync file I/O for all modes. Rejected because the production scale story would remain optional rather than real.

### Acceptance criteria

- [ ] Sync request-path file operations are identified and prioritized.
- [ ] Production-critical persistence paths no longer depend on blocking file I/O.
- [ ] Before-and-after performance evidence is captured.

### Priority

Medium

## Epic 9

### Title

Make scale-oriented runtime features default in production

### Live GitHub issue

`#661`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `scalability`
- `runtime`
- `production-readiness`

### Suggested milestone

M4: Production Scalability Profile

### Problem statement

The repository supports Redis-backed SSE and queueing, but these remain optional while the defaults still lean on memory and file-backed local behavior.

### Proposed solution

Define persistent queueing and distributed SSE as production defaults, and enforce the required infrastructure for production runtime profiles.

### Alternatives considered

- Keep these capabilities optional forever. Rejected because it weakens the production deployment contract.

### Acceptance criteria

- [ ] Production queue provider is defined and enforced.
- [ ] Distributed SSE strategy is defined and enforced where multi-instance support is claimed.
- [ ] Production startup rejects missing scale prerequisites.

### Priority

Medium

## Epic 10

### Title

Introduce bounded parallelism in agent execution

### Live GitHub issue

`#663`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `scalability`
- `architecture`

### Suggested milestone

M4: Production Scalability Profile

### Problem statement

The dispatcher currently executes agents sequentially by default. This limits throughput even where dependency-safe parallel execution may be possible.

### Proposed solution

Map dependency-safe execution groups and introduce bounded parallelism where contracts allow it.

### Alternatives considered

- Force full parallelism. Rejected because orchestration dependencies are real.
- Keep everything serial. Rejected because it leaves throughput unnecessarily constrained.

### Acceptance criteria

- [ ] Safe parallel execution groups are identified.
- [ ] Dispatcher supports bounded parallel execution where allowed.
- [ ] Observability exists for queue wait, concurrency, and bottlenecks.

### Priority

Medium

## Epic 11

### Title

Align development and CI toolchain versions

### Live GitHub issue

`#667`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `ci-cd`
- `documentation`

### Suggested milestone

M5: CI/CD Consistency and Delivery Confidence

### Problem statement

The repository currently has toolchain drift between docs and workflows, including Node 22 in main CI and Node 20 in Storybook CI, while public docs still state Node 18 or later.

### Proposed solution

Define one supported toolchain policy and align development docs, CI, Storybook CI, and related automation around it.

### Alternatives considered

- Keep broad version wording and let workflows diverge. Rejected because it makes support and reproducibility weaker.

### Acceptance criteria

- [ ] Supported Node policy is explicitly defined.
- [ ] Root CI and Storybook CI are aligned.
- [ ] Documentation reflects the actual supported toolchain.

### Priority

Medium

## Epic 12

### Title

Make quality coverage honest across backend and UI

### Live GitHub issue

`#668`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `ci-cd`
- `traceability`

### Suggested milestone

M5: CI/CD Consistency and Delivery Confidence

### Problem statement

Current root coverage reporting excludes the UI package, while the UI has its own test stack. This makes the product-level quality story less transparent than it should be.

### Proposed solution

Clarify responsibility boundaries for root and UI tests and add release-readiness visibility for both.

### Alternatives considered

- Continue treating root coverage as the main signal. Rejected because it can overstate whole-product confidence.

### Acceptance criteria

- [ ] Root versus UI test responsibility is documented.
- [ ] UI coverage or equivalent release-readiness evidence is visible.
- [ ] Avoidable exclusions are reduced after legacy cleanup.

### Priority

Medium

## Epic 13

### Title

Add higher-value workflow automation

### Live GitHub issue

`#665`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `ci-cd`
- `production-readiness`

### Suggested milestone

M5: CI/CD Consistency and Delivery Confidence

### Problem statement

The repository has strong automation breadth, but not enough workflow-level proof for its most important user journeys.

### Proposed solution

Add higher-value automated coverage for CREATE, AUDIT, questionnaires, decisions, and security behavior.

### Alternatives considered

- Rely on low-level unit coverage and shell render tests. Rejected because the product’s operational value is workflow-based.

### Acceptance criteria

- [ ] CREATE workflow automation exists.
- [ ] AUDIT workflow automation exists.
- [ ] Questionnaire and decision lifecycle automation exists.
- [ ] Security behavior regressions are testable.

### Priority

Medium

## Epic 14

### Title

Stop booting in invalid production states

### Live GitHub issue

`#666`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `production-readiness`
- `runtime`
- `security`

### Suggested milestone

M6: Product Readiness and Operability

### Problem statement

The current server startup can continue after storage provider initialization failure, and production readiness assumptions are not yet enforced at boot time.

### Proposed solution

Reject invalid production runtime states during startup rather than logging warnings and continuing.

### Alternatives considered

- Keep degraded startup behavior for resilience. Rejected because it hides invalid production configuration and weakens operability guarantees.

### Acceptance criteria

- [ ] Production startup fails on missing critical runtime dependencies.
- [ ] Production startup fails on insecure auth posture.
- [ ] Release gating validates runtime profile correctness.

### Priority

High

## Epic 15

### Title

Publish an operable platform reference

### Live GitHub issue

`#664`

### Type

Feature Request

### Suggested labels

- `type: feature`
- `documentation`
- `production-readiness`
- `traceability`

### Suggested milestone

M6: Product Readiness and Operability

### Problem statement

The repository has enough implementation breadth that operability now depends on trusted documentation. Right now a new maintainer still has to reverse-engineer too much of the runtime model.

### Proposed solution

Publish one authoritative production reference architecture, one operational runbook, and aligned release-readiness language.

### Alternatives considered

- Continue relying on scattered docs and internal knowledge. Rejected because it does not scale past the original author.

### Acceptance criteria

- [ ] Production reference architecture is published.
- [ ] Operational runbook is published.
- [ ] Release language matches the actual hardening state.

### Priority

High

## First-Wave Task Drafts

These are the six highest-priority issues I would open first.

## Task 1

### Title

Reject startup when non-local auth is unconfigured

### Live GitHub issue

`#670`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `security`
- `production-readiness`

### Suggested milestone

M1: Security Boundary Hardening

### Description

Update startup behavior so the server fails boot when the configured host is non-local and no approved authentication mode is configured. This should remove the current degraded non-local startup path and make the production exposure model fail closed.

### Acceptance criteria

- [ ] Startup fails when `HOST` is non-local and auth is not configured.
- [ ] Failure message is actionable and points to the required configuration.
- [ ] Localhost development still works through an explicitly supported local profile.
- [ ] Technical manual is updated with the new behavior.

### Effort estimate

6h

### Dependencies

- Epic: Enforce fail-closed non-local API security

## Task 2

### Title

Protect all `/api` routes outside localhost

### Live GitHub issue

`#671`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `security`

### Suggested milestone

M1: Security Boundary Hardening

### Description

Refactor request protection so all `/api` routes outside localhost are covered by one explicit security model. Remove the current distinction where fallback protection only applies to non-GET requests when auth middleware is absent.

### Acceptance criteria

- [ ] GET `/api/**` routes are no longer exempt from the degraded auth fallback gap.
- [ ] Route protection behavior is consistent across read and write APIs.
- [ ] Regression tests cover the non-local auth enforcement path.

### Effort estimate

8h

### Dependencies

- Task: Reject startup when non-local auth is unconfigured

## Task 3

### Title

Replace CSP `'unsafe-inline'`

### Live GitHub issue

`#673`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `security`

### Suggested milestone

M1: Security Boundary Hardening

### Description

Replace the current inline-permissive Content Security Policy with a nonce-, hash-, or framework-compatible policy that removes `'unsafe-inline'` for production operation.

### Acceptance criteria

- [ ] Default CSP no longer includes `'unsafe-inline'` for scripts.
- [ ] Default CSP no longer includes `'unsafe-inline'` for styles unless explicitly justified and documented.
- [ ] The UI still renders correctly under the hardened policy.
- [ ] The chosen CSP approach is documented.

### Effort estimate

10h

### Dependencies

- Epic: Harden browser and edge security posture

## Task 4

### Title

Enforce storage provider startup success in production

### Live GitHub issue

`#669`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `runtime`
- `production-readiness`

### Suggested milestone

M2: Runtime Consolidation

### Description

Remove the current fallback path that allows the server to start after storage provider initialization failure in production-oriented runtime profiles.

### Acceptance criteria

- [ ] Production profile startup fails when storage provider initialization fails.
- [ ] Local development fallback, if preserved, is explicitly profile-bound and documented.
- [ ] Startup logging clearly communicates provider initialization outcome.

### Effort estimate

4h

### Dependencies

- Epic: Define supported runtime profiles

## Task 5

### Title

Rewrite runtime documentation to match the current architecture

### Live GitHub issue

`#672`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `documentation`
- `architecture`

### Suggested milestone

M2: Runtime Consolidation

### Description

Rewrite the runtime-related sections of `src/webapp/README.md` and `docs/reference/technical-manual.md` so they describe the actual persistence, queueing, session, and deployment model used by the current codebase.

### Acceptance criteria

- [ ] `src/webapp/README.md` no longer claims `No database`.
- [ ] The technical manual explains provider-based runtime choices accurately.
- [ ] Localhost-only assumptions and production-profile assumptions are clearly separated.
- [ ] The docs reference the canonical runtime profile definitions.

### Effort estimate

6h

### Dependencies

- Epic: Eliminate legacy and documentation ambiguity

## Task 6

### Title

Audit and remove or isolate `server.legacy.ts`

### Live GitHub issue

`#674`

### Type

Sprint Task

### Suggested labels

- `type: chore`
- `architecture`
- `traceability`

### Suggested milestone

M2: Runtime Consolidation

### Description

Confirm whether `src/webapp/server.legacy.ts` is still required. If not, remove it. If it is still needed temporarily, isolate it behind an explicit legacy boundary and document the retirement path.

### Acceptance criteria

- [ ] Current runtime references to `server.legacy.ts` are audited.
- [ ] The file is either removed or relocated behind an explicit legacy boundary.
- [ ] Coverage exclusions related only to that file are reviewed and updated.
- [ ] Documentation explains the final status.

### Effort estimate

4h

### Dependencies

- Epic: Eliminate legacy and documentation ambiguity

## Recommended Creation Order

1. Create the M1 epics first.
2. Create the six first-wave tasks next.
3. Create the M2 epics after the M1 work is accepted.
4. Create the remaining epics in milestone order.

## Traceability Footer

Suggested footer to append to each created issue:

```md
Traceability:

- Source analysis: `sdlc7/00-audit-verdict-validation.md`
- Source roadmap: `sdlc7/07-synthesis-roadmap.md`
- DRY
- No GOD code
- Modular
- Best-practice folder structure
```
