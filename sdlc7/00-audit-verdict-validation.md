# Audit Verdict Validation

## Scope

This document validates the external auditor's verdict against the current repository state as checked directly in code and configuration.

## Validation Method

The following areas were checked directly:

- runtime and persistence configuration in `src/webapp/config.ts`, `src/webapp/server.ts`, and `src/webapp/store.ts`
- security enforcement in `src/webapp/app.ts`, `src/webapp/plugins/security-headers.ts`, and `src/webapp/plugins/rate-limit.ts`
- typing and test posture in `tsconfig.json`, `vitest.config.mjs`, and `eslint.config.mjs`
- UI implementation depth in `src/webapp/ui/src/App.tsx`, `src/webapp/ui/src/App.test.tsx`, and `src/webapp/ui/package.json`
- route validation in `src/webapp/route-schemas.ts` and `src/webapp/routes/questionnaires.ts`
- CI and action pinning in `.github/workflows/ci.yml` and `.github/workflows/storybook.yml`
- documentation drift in `src/webapp/README.md` and `docs/reference/technical-manual.md`

## Executive Position

My conclusion is close to the external auditor's conclusion.

- The repository is clearly beyond prototype stage.
- The repository is not production-grade today.
- The single highest-priority problem is the non-local security boundary.

I would summarize the current state as: strong MVP platform foundation, inconsistent runtime story, and insufficient production hardening.

## Claim Validation Matrix

| Auditor claim                                                                                | My validation         | Evidence                                                                                                                                                                                                                                                                                                             | Opinion                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The repo has a real layered architecture with backend, UI, platform, tests, infra, and docs. | Confirmed             | `src/webapp/server.ts`, `src/webapp/ui/src/App.tsx`, `platform/engine`, `platform/schema`, `platform/sdlc`, `tests/`                                                                                                                                                                                                 | This is materially implemented, not presentation-only scaffolding.                                                                                                                                          |
| Documentation is inconsistent with the actual persistence/runtime model.                     | Confirmed             | `src/webapp/README.md` still says `No database`; `src/webapp/config.ts` exposes `STORAGE_PROVIDER`, `QUEUE_PROVIDER`, `SESSION_STORE`; `src/webapp/store.ts` still frames `FileStore` as default; `docs/reference/technical-manual.md` still describes file-based storage as the dominant model.                     | This is one of the most important confirmed findings.                                                                                                                                                       |
| There is visible migration baggage via `server.ts` and `server.legacy.ts`.                   | Confirmed with nuance | `src/webapp/server.legacy.ts` exists; `vitest.config.mjs` explicitly excludes it from coverage.                                                                                                                                                                                                                      | The baggage is real. I did not find an active production reference to the legacy server in current searches, so the coupling appears low, but the artifact should still be removed or quarantined formally. |
| The default runtime posture is single-node oriented.                                         | Confirmed             | `src/webapp/config.ts` defaults `STORAGE_PROVIDER` to `file` and `QUEUE_PROVIDER` to `memory`; `src/webapp/store.ts` defaults to sync file I/O; Redis-backed SSE in `src/webapp/server.ts` is optional.                                                                                                              | This is accurate and materially important.                                                                                                                                                                  |
| Request validation is schema-driven rather than purely ad hoc.                               | Confirmed             | `src/webapp/route-schemas.ts` defines real route schemas; `src/webapp/routes/questionnaires.ts` binds `schema: RS.questionnairesList` and `schema: RS.questionnaireSave`.                                                                                                                                            | This is a strong point in the codebase.                                                                                                                                                                     |
| Backend type discipline is intentionally loose.                                              | Confirmed             | `tsconfig.json` has `strict: false`, `strictNullChecks: false`, `allowJs: true`, `checkJs: true`.                                                                                                                                                                                                                    | The auditor is correct. This slows safe refactoring.                                                                                                                                                        |
| Large route and service files indicate logic concentration.                                  | Confirmed             | `src/webapp/routes/misc.ts` is 461 lines; `src/webapp/services/session-service.ts` is 347 lines; `src/webapp/routes/decisions.ts` is 210 lines.                                                                                                                                                                      | The claim is fair. Some concentration is already visible.                                                                                                                                                   |
| Security posture is materially weaker than the platform ambition.                            | Confirmed             | `src/webapp/app.ts` only applies fallback API-key protection to non-GET requests when auth is disabled; `src/webapp/plugins/security-headers.ts` allows `'unsafe-inline'`; `src/webapp/plugins/rate-limit.ts` exempts GET requests and keys off `req.ip` while `trustProxy: true` is enabled in `src/webapp/app.ts`. | This is the most serious validated concern.                                                                                                                                                                 |
| CI/CD is broad and serious, but not uniformly hardened.                                      | Confirmed             | `.github/workflows/ci.yml` pins some actions by SHA but still uses `aquasecurity/trivy-action@master`; `.github/workflows/storybook.yml` uses floating `@v4` tags and Node 20 while CI uses Node 22.                                                                                                                 | The tooling breadth is good, but consistency and supply-chain hardening are incomplete.                                                                                                                     |
| UI implementation is real, not decorative.                                                   | Confirmed             | `src/webapp/ui/src/App.tsx` lazy-loads a broad route set; `src/webapp/ui/package.json` has build, test, lint, Storybook; `src/webapp/ui/src/App.test.tsx` shows at least a minimal app-shell test.                                                                                                                   | The auditor is correct that the UI is real.                                                                                                                                                                 |
| The app can start in degraded states that production should reject.                          | Confirmed             | `src/webapp/server.ts` falls back to `createApp()` and starts even after storage provider initialization fails.                                                                                                                                                                                                      | This is explicitly implemented today and should be reversed for production mode.                                                                                                                            |

## Where The Auditor Was Slightly Too Broad

### Documentation drift is severe, but not uniformly stale

The external verdict is right that documentation drift exists. However, it is not true that the docs are still purely on the older file-only design everywhere. `docs/reference/technical-manual.md` has already been partly updated to mention optional Redis, BullMQ, Fastify plugin architecture, and the React SPA. The real problem is that the docs still mix an older localhost and file-centric operating model with newer provider-based runtime options.

### Legacy coexistence is proven, but active runtime dependence is not

The repository clearly still contains `server.legacy.ts`, and coverage excludes it. That said, I did not find current production wiring that imports it. So the issue is not active dependency so much as unresolved migration residue.

## My Scores

| Dimension                   | Auditor score | My score | Why                                                                                         |
| --------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------- |
| Architecture                | 7/10          | 7/10     | The structural decomposition is real, but the runtime story is still contradictory.         |
| Code quality                | 6/10          | 6/10     | Good modular intent, but strictness is off and some logic is too concentrated.              |
| Security                    | 4/10          | 4/10     | The non-local auth fallback and browser hardening gaps are real blockers.                   |
| Scalability and performance | 5/10          | 5/10     | There are hooks for scale, but defaults and hot-path I/O are still single-process oriented. |
| DevOps and CI/CD            | 7/10          | 7/10     | Breadth is strong, but pinning and version alignment are incomplete.                        |
| Product completeness        | 6/10          | 6/10     | It is a serious MVP, but not yet a production platform.                                     |

## My Verdict

The external auditor's central verdict holds up.

This repository is:

- an MVP, not a prototype
- production-adjacent in breadth, not production-grade in enforcement
- strongest in architecture breadth and delivery discipline
- weakest in security boundary hardening and runtime consolidation

## Priority Order I Would Use

1. Security fail-closed behavior for all non-local API exposure.
2. Canonical production runtime definition and startup enforcement.
3. Documentation alignment with the real runtime model.
4. Strict TypeScript migration and logic decomposition.
5. Scalability profile hardening once the runtime contract is fixed.

## Recommended Next Document

Use [07-synthesis-roadmap.md](./07-synthesis-roadmap.md) as the planning base for GitHub traceability.
