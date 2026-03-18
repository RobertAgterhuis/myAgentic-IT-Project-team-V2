# Documentation Remediation — Milestones & Stories

**Date:** 2026-03-18  
**References:** `documentation-audit-verdict.md`, `documentation-recommendations.md`  
**Purpose:** GitHub-publishable milestones and stories for traceability

---

## Milestone: SDLC6 M34 — Documentation Remediation

**Description:** Address documentation drift identified by external audit. Fix factual inaccuracies, consolidate documentation into `docs/`, slim root files, and prevent future drift through process gates.

**Goal:** All public-facing documentation accurately reflects the current architecture (post-M33) and a PR documentation gate prevents future drift.

---

### Phase 1: Critical Drift Fixes (Priority: CRITICAL)

Stories that fix factual inaccuracies in high-visibility files. No structural changes — just correct the content.

---

#### Story M34-001: Fix HTTP Framework References (DRIFT-001)

**Description:** Replace all "Native `http` module" and "No web framework" references with accurate Fastify 5 descriptions.

**Acceptance Criteria:**

- [ ] `README.md` tech stack table says "Fastify 5" instead of "Native `http` module"
- [ ] `README.md` removes "No Express or web framework dependency" claim
- [ ] `README.md` project structure tree updated for current file layout
- [ ] `CONTRIBUTING.md` architecture overview references Fastify, plugins, routes
- [ ] `CONTRIBUTING.md` key design decisions section updated
- [ ] `docs/architecture/overview.md` layer diagram shows Fastify
- [ ] `docs/architecture/overview.md` tech choices table updated
- [ ] No remaining references to "native http" or "no framework" in any `.md` file
- [ ] All tests still pass after changes

**Files to modify:**

- `README.md`
- `CONTRIBUTING.md`
- `docs/architecture/overview.md`

**Labels:** `documentation`, `drift-fix`, `priority:critical`

---

#### Story M34-002: Fix Test Count and Runner References (DRIFT-002)

**Description:** Remove all hardcoded test counts and Jest references. Replace with accurate Vitest-only descriptions.

**Acceptance Criteria:**

- [ ] All references to "Jest, 363 tests" removed
- [ ] All references to "1239 tests", "1370 tests", "2,420 tests" replaced with "3,000+" or removed
- [ ] `CONTRIBUTING.md` commands table shows only `npm test` (Vitest)
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` checklist updated to single Vitest check
- [ ] `docs/operations/release-checklist.md` test count updated
- [ ] `docs/operations/operating-handbook.md` test command updated
- [ ] `docs/help/troubleshooting.md` test count updated
- [ ] `docs/operations/ci-health-review.md` test count updated
- [ ] No remaining references to Jest in any documentation file

**Files to modify:**

- `README.md`
- `CONTRIBUTING.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/architecture/overview.md`
- `docs/operations/release-checklist.md`
- `docs/operations/operating-handbook.md`
- `docs/operations/ci-health-review.md`
- `docs/help/troubleshooting.md`

**Labels:** `documentation`, `drift-fix`, `priority:critical`

---

#### Story M34-003: Fix Dependency and Tech Stack Claims (DRIFT-003)

**Description:** Update all "minimal runtime dependencies" claims to accurately reflect current production dependencies.

**Acceptance Criteria:**

- [ ] `README.md` tech stack accurately lists Fastify, BullMQ, ioredis, better-sqlite3, pino
- [ ] `CONTRIBUTING.md` design decisions section updated
- [ ] `docs/architecture/overview.md` tech choices table lists all production dependencies
- [ ] No remaining "only MCP SDK, Ajv, tsx" claims

**Files to modify:**

- `README.md`
- `CONTRIBUTING.md`
- `docs/architecture/overview.md`

**Labels:** `documentation`, `drift-fix`, `priority:medium`

---

#### Story M34-004: Fix Authentication References (DRIFT-004)

**Description:** Update docs that say "no authentication" to reflect M29's GitHub OAuth + RBAC.

**Acceptance Criteria:**

- [ ] `CONTRIBUTING.md` removes "no authentication required" statement
- [ ] `docs/architecture/overview.md` mentions auth layer
- [ ] Any remaining "no auth" references in cross-cutting docs are updated or annotated with historical context
- [ ] Auth is mentioned in the technology stack / architecture overview sections

**Files to modify:**

- `CONTRIBUTING.md`
- `docs/architecture/overview.md`

**Labels:** `documentation`, `drift-fix`, `priority:low`

---

#### Story M34-005: Fix Build and Test Commands (DRIFT-006)

**Description:** Remove all `cd .github && npm test` references and update test/build instructions.

**Acceptance Criteria:**

- [ ] All `cd .github` instructions removed from documentation
- [ ] `CONTRIBUTING.md` PR process uses root-level `npm test` only
- [ ] `docs/reference/technical-manual.md` test instructions updated
- [ ] `docs/getting-started/user-manual.md` developer instructions updated (if applicable)
- [ ] `docs/operations/operating-handbook.md` commands updated

**Files to modify:**

- `CONTRIBUTING.md`
- `docs/reference/technical-manual.md`
- `docs/getting-started/user-manual.md`
- `docs/operations/operating-handbook.md`

**Labels:** `documentation`, `drift-fix`, `priority:medium`

---

### Phase 2: Structural Consolidation (Priority: HIGH)

Stories that restructure where documentation lives to create a single source of truth.

---

#### Story M34-006: Slim Root README to Essential Information Only

**Description:** Reduce root README from ~300 lines to ~60 lines. Move detailed content to `docs/` and link to it.

**Acceptance Criteria:**

- [ ] README contains: title, one-paragraph description, badges, 10-line quick start, link table to `docs/`, license
- [ ] All detailed sections (MCP tools, commands table, project structure, testing details) removed from README
- [ ] Each removed section has a corresponding entry in the link table pointing to `docs/`
- [ ] `docs/index.md` updated to be the comprehensive landing page
- [ ] README is ≤ 80 lines

**Files to modify:**

- `README.md`
- `docs/index.md`

**Labels:** `documentation`, `structural`, `priority:high`

---

#### Story M34-007: Consolidate CONTRIBUTING.md into docs/

**Description:** Slim root `CONTRIBUTING.md` to essentials and move detailed content to `docs/contributing.md`.

**Acceptance Criteria:**

- [ ] Root `CONTRIBUTING.md` contains: clone instructions, install, test command, link to `docs/contributing.md`
- [ ] `docs/contributing.md` contains full coding standards, architecture, ESLint rules, PR process, security requirements
- [ ] Content from root `CONTRIBUTING.md` fully preserved in `docs/contributing.md`
- [ ] Root `CONTRIBUTING.md` is ≤ 40 lines

**Files to modify:**

- `CONTRIBUTING.md`
- `docs/contributing.md`

**Labels:** `documentation`, `structural`, `priority:high`

---

#### Story M34-008: Merge src/webapp/README.md into docs/

**Description:** Consolidate `src/webapp/README.md` content into `docs/reference/technical-manual.md` or `docs/architecture/overview.md`.

**Acceptance Criteria:**

- [ ] All unique content from `src/webapp/README.md` present in `docs/`
- [ ] `src/webapp/README.md` replaced with one-liner pointing to `docs/reference/technical-manual.md`
- [ ] No orphaned references to `src/webapp/README.md`

**Files to modify:**

- `src/webapp/README.md`
- `docs/reference/technical-manual.md`

**Labels:** `documentation`, `structural`, `priority:medium`

---

### Phase 3: Architecture Documentation Update (Priority: HIGH)

Stories that bring core architecture docs up to date with M29–M33 changes.

---

#### Story M34-009: Update docs/architecture/overview.md for Post-M33 State

**Description:** Rewrite the architecture document to reflect current Fastify + Redis + BullMQ + Auth architecture.

**Acceptance Criteria:**

- [ ] Layer diagram shows Fastify plugin architecture
- [ ] Redis/BullMQ shown as optional infrastructure layer
- [ ] Authentication/RBAC layer documented
- [ ] Module inventory includes all M29–M33 additions (auth.ts, redis.ts, context.ts, bullmq-queue.ts, plugins/, etc.)
- [ ] Design principles updated (plugin encapsulation, typed context, graceful degradation)
- [ ] Tech choices table accurate for all production dependencies
- [ ] Test count uses ranges, not fixed numbers

**Files to modify:**

- `docs/architecture/overview.md`

**Labels:** `documentation`, `architecture`, `priority:high`

---

#### Story M34-010: Update docs/reference/technical-manual.md to v3.0

**Description:** Bring the technical manual up to date with M29–M33 architectural changes.

**Acceptance Criteria:**

- [ ] Version bumped to 3.0
- [ ] Module inventory includes auth.ts, redis.ts, context.ts, plugins/, routes/ (Fastify)
- [ ] HTTP server section describes Fastify (not raw HTTP)
- [ ] Test section uses `npm test` (Vitest only, no Jest, no `.github`)
- [ ] Dependencies section lists all production deps
- [ ] Configuration section documents REDIS_URL, QUEUE_PROVIDER, SESSION_STORE, GITHUB_CLIENT_ID, etc.
- [ ] New subsections for: Authentication flow, Redis integration, BullMQ queue

**Files to modify:**

- `docs/reference/technical-manual.md`

**Labels:** `documentation`, `architecture`, `priority:high`

---

#### Story M34-011: Create Architecture Evolution Page

**Description:** Create `docs/architecture/evolution.md` documenting architectural changes by milestone.

**Acceptance Criteria:**

- [ ] Page created at `docs/architecture/evolution.md`
- [ ] Entries for M29 (Auth), M30 (Fastify), M31 (Agent Execution), M32 (Domain Model), M33 (Scalability)
- [ ] Each entry links to relevant ADR in `BusinessDocs/decisions/`
- [ ] Added to `docs/` Jekyll navigation
- [ ] Chronological format with date, milestone, and summary of change

**Files to create:**

- `docs/architecture/evolution.md`

**Labels:** `documentation`, `architecture`, `priority:low`

---

### Phase 4: Process Gate (Priority: HIGH)

Stories that prevent future documentation drift.

---

#### Story M34-012: Add Documentation Gate to PR Template

**Description:** Add documentation review checklist items to the PR template.

**Acceptance Criteria:**

- [ ] `.github/PULL_REQUEST_TEMPLATE.md` includes:
  - `[ ] Documentation updated (if changing APIs, architecture, dependencies, or config)`
  - `[ ] docs/ files checked for accuracy against this change`
- [ ] Stale Jest/test-count references removed from existing checklist
- [ ] `docs/contributing.md` documents the documentation review expectation

**Files to modify:**

- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/contributing.md`

**Labels:** `documentation`, `process`, `priority:high`

---

#### Story M34-013: Remove Hardcoded Metrics from All Documentation

**Description:** Replace all hardcoded snapshot-in-time metrics (test counts, file counts, agent counts) with ranges or dynamic references.

**Acceptance Criteria:**

- [ ] No exact test count appears in any documentation file
- [ ] Agent count uses "38+" or similar range notation
- [ ] Test file count uses "100+" or similar
- [ ] Coverage threshold stated as policy ("75%+ enforced") not as current value
- [ ] grep for `\b\d{3,4}\b.*test` returns no hardcoded test counts in `.md` files

**Files to modify:**

- All `.md` files containing hardcoded metrics (see DRIFT-002 in verdict)

**Labels:** `documentation`, `process`, `priority:medium`

---

## Story Dependency Graph

```
Phase 1 (Drift Fixes) ─── no dependencies, can be parallelized
  M34-001 (HTTP framework)
  M34-002 (Test counts)
  M34-003 (Dependencies)
  M34-004 (Auth references)
  M34-005 (Build commands)

Phase 2 (Structural) ─── depends on Phase 1 being complete
  M34-006 (Slim README) ─── depends on M34-001, M34-002, M34-003
  M34-007 (Consolidate CONTRIBUTING) ─── depends on M34-001, M34-005
  M34-008 (Merge webapp README) ─── no dependency

Phase 3 (Architecture Docs) ─── depends on Phase 1, can overlap with Phase 2
  M34-009 (architecture.md) ─── depends on M34-001, M34-003
  M34-010 (technical-manual.md) ─── depends on M34-001, M34-005
  M34-011 (Evolution page) ─── no dependency

Phase 4 (Process Gate) ─── can start immediately, blocks no other stories
  M34-012 (PR template) ─── depends on M34-002
  M34-013 (Remove metrics) ─── depends on M34-002
```

---

## Effort Estimates

| Story   | Size | Scope                             |
| ------- | ---- | --------------------------------- |
| M34-001 | S    | 3 files, ~20 line changes         |
| M34-002 | M    | 8 files, ~15 line changes         |
| M34-003 | S    | 3 files, ~10 line changes         |
| M34-004 | S    | 2 files, ~5 line changes          |
| M34-005 | S    | 4 files, ~10 line changes         |
| M34-006 | M    | 2 files, major README rewrite     |
| M34-007 | M    | 2 files, content migration        |
| M34-008 | S    | 2 files, content merge            |
| M34-009 | L    | 1 file, full architecture rewrite |
| M34-010 | L    | 1 file, major manual update       |
| M34-011 | S    | 1 new file                        |
| M34-012 | S    | 2 files, ~5 line changes          |
| M34-013 | M    | 8+ files, search-and-replace      |

**Total: 13 stories across 4 phases**
