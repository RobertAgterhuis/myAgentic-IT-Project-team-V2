# Documentation Audit — Internal Verdict

**Date:** 2026-03-18  
**Auditor:** Internal (automated code ↔ documentation cross-reference)  
**Scope:** All 291 markdown files across root, docs/, BusinessDocs/, templates/, src/  
**Branch:** feature/documentation  
**External trigger:** External auditor flagged "high documentation drift, old documentation, stale documentation, documentation mismatch"

---

## Executive Verdict

**The external auditor is PARTIALLY CORRECT.** The documentation is not globally stale, but there are **concrete, measurable drift instances** where documentation describes architecture that no longer exists. The structural recommendation (consolidate into `docs/`) has merit but requires nuance.

### Verdict breakdown

| Category               | External claim             | Internal finding                                                                                                                                                   | Severity |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Documentation drift    | "High drift"               | **CONFIRMED** — 6 specific drift instances found (see below)                                                                                                       | HIGH     |
| Old documentation      | "Old/stale docs"           | **PARTIALLY CONFIRMED** — Not old by date, but content describes superseded architecture                                                                           | MEDIUM   |
| Documentation mismatch | "Mismatch"                 | **CONFIRMED** — README, CONTRIBUTING, architecture.md, technical-manual.md all reference pre-M29/M30/M33 architecture                                              | HIGH     |
| Consolidate to `docs/` | "Move everything to docs/" | **PARTIALLY AGREE** — docs/ should be the canonical source; root should be minimal. But BusinessDocs/ serves a different purpose (project data, not documentation) | MEDIUM   |

---

## Confirmed Drift Instances

### DRIFT-001: HTTP Framework (CRITICAL)

**What docs say:** "Native `http` module, localhost only" / "No Express or web framework dependency"  
**What code says:** `fastify@5.8.2` with 7 plugins (`@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit`, `@fastify/static`, `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-plugin`)

**Affected files:**

- `README.md` line 40 — "No Express or web framework dependency"
- `README.md` line 49 — "Native `http` module, localhost only"
- `README.md` line 217 — "server.ts ← Native http server entrypoint"
- `CONTRIBUTING.md` line 54 — "server.ts ← HTTP server, route handlers, SSE, metrics"
- `CONTRIBUTING.md` line 80–84 — Key Design Decisions reference raw http
- `docs/architecture.md` line 31 — "Native http module · 127.0.0.1:3000 · 16 routes"
- `docs/architecture.md` line 151 — "No web framework required"
- `BusinessDocs/Phase2-Tech/phase2-tech-audit.md` line 35 — "raw `http` module"
- `BusinessDocs/Phase2-Tech/phase2-tech-audit.md` line 44 — "not Express/Fastify/Koa"
- `BusinessDocs/onboarding/onboarding-output.md` line 56 — "custom http, minimal runtime deps"

**Root cause:** M30 (Fastify migration) was merged but documentation was not updated.

### DRIFT-002: Test Count (MEDIUM)

**What docs say:** Various conflicting numbers — "363 tests" (Jest), "1239 tests" (Vitest), "1370 tests", "2,420+ tests"  
**What code says:** 3,093 passing tests (Vitest only), 119 test files. No Jest runner.

**Affected files:**

- `README.md` line 52 — "2,420+ tests across 96 files"
- `README.md` line 308 — "2,420+ tests"
- `CONTRIBUTING.md` line 41 — "Run root tests (Jest, 363 tests)"
- `CONTRIBUTING.md` line 42 — "Run vitest tests (1239 tests)"
- `.github/PULL_REQUEST_TEMPLATE.md` line 15 — "Jest, 363 tests"
- `.github/PULL_REQUEST_TEMPLATE.md` line 16 — "1239 tests"
- `docs/architecture.md` line 143 — "2,420 passing across 96 test files"
- `docs/ci-health-review.md` line 58 — "~1370 passing"
- `docs/operating-handbook.md` line 135 — "1370 tests"
- `docs/release-checklist.md` line 21 — "1370 Vitest tests"
- `docs/help/troubleshooting.md` line 196 — "1370 tests"

**Root cause:** Test counts were snapshot-in-time values never updated. Jest references are from pre-consolidation era.

### DRIFT-003: Dependencies / Tech Stack Table (MEDIUM)

**What docs say:** "Minimal runtime dependencies: MCP SDK, Ajv, tsx"  
**What code says:** 14 production dependencies including Fastify ecosystem, BullMQ, ioredis, better-sqlite3, pino

**Affected files:**

- `README.md` line 48 — "minimal runtime dependencies: MCP SDK, Ajv, tsx"
- `CONTRIBUTING.md` line 76–79 — "Minimal runtime dependencies" / "only Node.js built-in modules"
- `docs/architecture.md` line 151 — Tech choices table

### DRIFT-004: Authentication & RBAC not reflected in general docs (LOW)

**What docs say:** Multiple docs say "No authentication" or "localhost only, no auth needed"  
**What code says:** M29 added GitHub OAuth 2.0 + RBAC (admin/operator/viewer) + SQLite session store

**Affected files:**

- `CONTRIBUTING.md` line 84 — "no authentication required"
- `BusinessDocs/Phase2-Tech/phase2-tech-audit.md` line 264 — "Authorization (RBAC): NO"
- Various synthesis/audit docs still reference "no auth" as current state

**Note:** `docs/api/auth-api.md` and `docs/security/security-design.md` ARE current — the drift is in older cross-cutting docs.

### DRIFT-005: Project Structure Tree (LOW)

**What docs say:** README and CONTRIBUTING show project tree with files that may not exist or miss new files  
**What code says:** New files added in M29–M33 (auth.ts, redis.ts, bullmq-queue.ts, session-store-redis.ts, sse-manager-redis.ts, etc.) not reflected

**Affected files:**

- `README.md` lines 209–240 — Project structure tree
- `CONTRIBUTING.md` lines 50–66 — Architecture overview tree

### DRIFT-006: Build/Test Commands (MEDIUM)

**What docs say:** `cd .github && npm test` / `npm run test:vitest` as separate commands  
**What code says:** Single `npm test` runs Vitest at root. No `.github` test suite referenced.

**Affected files:**

- `CONTRIBUTING.md` lines 173–191 — PR process instructs `cd .github && npm test`
- `docs/technical-manual.md` lines 948, 1126, 1380 — reference `.github` test paths
- `docs/user-manual.md` line 367 — references `cd .github`

---

## Structural Assessment

### Current documentation locations

| Location                           | Purpose                                                                                  | File count | Should stay?                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Root (`*.md`)                      | README, CONTRIBUTING, SECURITY, LICENSE, CHANGELOG, CODE_OF_CONDUCT                      | 6          | YES — GitHub convention, but README should be slim    |
| `docs/`                            | GitHub Pages site — user manual, technical manual, API reference, help, UX, security     | ~80        | YES — canonical documentation home                    |
| `BusinessDocs/`                    | Project data — decisions, questionnaire answers, audit artifacts, metrics, session state | ~120       | YES — but this is **project data**, not documentation |
| `templates/sdlc/`                  | Agent templates, contracts, guardrails, playbooks, decision catalogs                     | ~80        | YES — runtime templates, not documentation            |
| `src/webapp/README.md`             | Webapp-specific developer guide                                                          | 1          | MOVE content to `docs/`                               |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template                                                                              | 1          | YES — GitHub convention requires this location        |

### Agreement with external auditor

1. **AGREE: `docs/` should be the single source of truth** for all human-readable documentation. GitHub Pages makes this the public-facing site.
2. **AGREE: Root README should be minimal** — project title, one-paragraph description, badges, and links to `docs/`. Currently it's ~300 lines duplicating content that exists in `docs/`.
3. **DISAGREE: BusinessDocs/ should NOT move to docs/** — it contains project data (decisions, questionnaire answers, session artifacts), not documentation. It's consumed by the runtime agents.
4. **DISAGREE: "All documentation is old"** — most content was written or updated in March 2026. The problem is not age but _drift after architectural milestones_.

---

## Root Cause Analysis

The drift pattern is consistent: **milestone implementations (M29–M33) updated code but not documentation.** Each milestone had GitHub issues for code changes but no companion documentation-update issue. This is a process gap, not a content-quality gap.

| Milestone                    | What changed                              | Docs updated?                                 |
| ---------------------------- | ----------------------------------------- | --------------------------------------------- |
| M29: Auth & RBAC             | Added GitHub OAuth, RBAC, SQLite sessions | Only `docs/api/auth-api.md` and security docs |
| M30: Fastify Migration       | Replaced native http with Fastify 5       | Only ADR created; zero doc updates            |
| M31: Agent Execution         | UI-triggered agent execution              | Minimal doc impact                            |
| M32: Domain Model Refinement | Schema and model changes                  | No doc updates                                |
| M33: Scalability Foundation  | Added BullMQ, Redis, health probes        | Only ADR created; zero doc updates            |

---

## Conclusion

The external auditor correctly identified **real documentation drift**. The diagnosis of "high drift" is accurate for the specific files impacted by M29–M33 milestones. The recommendation to consolidate into `docs/` is sound. The characterization of "all documentation is old/stale" is overstated — most docs are current, but the high-visibility files (README, CONTRIBUTING) are the ones that drifted, creating a disproportionate impression of neglect.

**Recommended action:** Execute the documentation remediation plan (see `documentation-recommendations.md` and `documentation-milestones.md`).
