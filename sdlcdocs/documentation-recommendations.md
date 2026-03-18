# Documentation Remediation — Recommendations

**Date:** 2026-03-18  
**References:** `documentation-audit-verdict.md`  
**Scope:** Structural + content recommendations to address confirmed drift

---

## R1: Slim the Root README

**Priority:** HIGH  
**Rationale:** The root README is ~300 lines and duplicates content from `docs/`. It contains stale tech stack claims, project structure trees, and command references that drift independently. A slim README with links to `docs/` eliminates dual-maintenance.

**Target state:** Root README should contain ONLY:

1. Project title + one-paragraph description
2. Badges (CI, coverage, license, Node.js version)
3. Quick start (max 10 lines: install, build, run)
4. Link table pointing to `docs/` for everything else
5. License line

**Estimated reduction:** ~300 lines → ~60 lines

---

## R2: Fix the 6 Confirmed Drift Instances

**Priority:** CRITICAL  
**Rationale:** The drift instances in the verdict are factually incorrect documentation that could mislead contributors and users.

### R2.1: HTTP Framework (DRIFT-001)

- Update all references from "Native `http` module" to "Fastify 5"
- Update tech stack table in README (until slimmed) and `docs/architecture/overview.md`
- Remove "No Express or web framework dependency" claims
- Update `docs/architecture/overview.md` layer diagram
- Update project structure references in CONTRIBUTING.md

### R2.2: Test Count (DRIFT-002)

- Replace all hardcoded test counts with "3,000+" or remove specific numbers
- Remove all Jest references (Jest is no longer used)
- Update `npm test` command descriptions — it's Vitest only now
- Fix `.github/PULL_REQUEST_TEMPLATE.md` checklist

### R2.3: Dependencies (DRIFT-003)

- Update "Minimal runtime dependencies" text to accurately reflect Fastify, BullMQ, ioredis, better-sqlite3, pino ecosystem
- Update the Technology Stack table in README and architecture docs

### R2.4: Auth & RBAC (DRIFT-004)

- Update cross-cutting docs that say "no authentication" — auth exists since M29
- Add auth status to architecture overview

### R2.5: Project Structure (DRIFT-005)

- Update project structure trees in README and CONTRIBUTING to reflect M29–M33 additions
- Add new key files: `app.ts`, `auth.ts`, `redis.ts`, `context.ts`, routes/, plugins/

### R2.6: Build/Test Commands (DRIFT-006)

- Remove all `cd .github && npm test` references
- Update commands table in CONTRIBUTING.md
- Fix `docs/reference/technical-manual.md`, `docs/operations/operating-handbook.md`, `docs/operations/release-checklist.md`, `docs/help/troubleshooting.md`

---

## R3: Consolidate Scattered Documentation into `docs/`

**Priority:** MEDIUM  
**Rationale:** The external auditor correctly identified that `docs/` (GitHub Pages) should be the canonical documentation home. Some content currently lives in root files or `src/webapp/README.md` that belongs in `docs/`.

### Actions:

1. **`CONTRIBUTING.md`** — Slim root version to "See `docs/contributing.md`" with just the essentials (clone, install, test). Move detailed coding standards, architecture overview, and PR process into `docs/contributing.md`.
2. **`src/webapp/README.md`** — Merge content into `docs/reference/technical-manual.md` or `docs/architecture/overview.md`. Remove or replace with a pointer.
3. **Keep in root** (GitHub convention): `README.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`
4. **Do NOT move `BusinessDocs/`** — this is runtime project data consumed by agents, not documentation

---

## R4: Introduce a Documentation Update Gate in the PR Process

**Priority:** HIGH  
**Rationale:** The root cause of drift is that milestone PRs had no documentation checklist item. Every PR that changes public APIs, architecture, dependencies, or configuration should require a docs review.

### Actions:

1. Add to `.github/PULL_REQUEST_TEMPLATE.md`:
   ```markdown
   - [ ] Documentation updated (if changing APIs, architecture, dependencies, or config)
   - [ ] `docs/` files checked for accuracy against this change
   ```
2. Add a "docs-review" label that triggers a lightweight CI check (optional, future)
3. Document this gate in `docs/contributing.md`

---

## R5: Remove Hardcoded Metrics from Documentation

**Priority:** MEDIUM  
**Rationale:** Hardcoded test counts (363, 1239, 1370, 2420, 3093) drift immediately after any test addition. Agent counts (38) also drift as agents are added.

### Actions:

1. Replace specific test counts with ranges ("3,000+") or remove entirely
2. Replace "38 agents" with "38+" or generate from runtime
3. Replace "96 test files" with "100+"
4. Consider: generate a `docs/_data/stats.json` from CI that docs reference dynamically

---

## R6: Add M29–M33 Architecture Changes to `docs/architecture/overview.md`

**Priority:** HIGH  
**Rationale:** `docs/architecture/overview.md` is the primary architecture reference but reflects pre-M29 state.

### Actions:

1. Update layer diagram to show Fastify, plugin architecture, route modules
2. Add Redis/BullMQ optional infrastructure layer
3. Add authentication/RBAC layer
4. Update tech choices table
5. Update "Design Principles" to reflect new patterns (plugin encapsulation, typed context, etc.)

---

## R7: Create a `docs/changelog-architecture.md` Living Document

**Priority:** LOW  
**Rationale:** ADRs exist in `BusinessDocs/decisions/` but there's no single document that shows the architectural evolution chronologically. This would help onboarding and prevent future "is this still true?" confusion.

### Actions:

1. Create a page listing architectural changes by milestone:
   - M29: Authentication & RBAC
   - M30: Fastify migration
   - M31: Agent execution via UI
   - M32: Domain model refinement
   - M33: Scalability foundation (BullMQ, Redis)
2. Link to relevant ADRs from each entry
3. Add to `docs/` navigation

---

## R8: Update `docs/reference/technical-manual.md`

**Priority:** HIGH  
**Rationale:** Version 2.0 (dated 2026-03-30) predates M29–M33 and contains outdated module descriptions.

### Actions:

1. Update module inventory (add auth.ts, redis.ts, context.ts, plugins/, bullmq-queue.ts)
2. Update HTTP server description (Fastify, not raw HTTP)
3. Update test instructions (remove `.github` references)
4. Update dependency list
5. Bump version to 3.0

---

## Summary Priority Matrix

| Rec | Title                      | Priority | Effort | Impact                           |
| --- | -------------------------- | -------- | ------ | -------------------------------- |
| R1  | Slim root README           | HIGH     | Small  | Eliminates largest drift surface |
| R2  | Fix 6 drift instances      | CRITICAL | Medium | Removes factual inaccuracies     |
| R3  | Consolidate into docs/     | MEDIUM   | Medium | Single source of truth           |
| R4  | PR documentation gate      | HIGH     | Small  | Prevents future drift            |
| R5  | Remove hardcoded metrics   | MEDIUM   | Small  | Eliminates recurring drift       |
| R6  | Update architecture.md     | HIGH     | Medium | Core reference accuracy          |
| R7  | Architecture changelog     | LOW      | Small  | Onboarding aid                   |
| R8  | Update technical-manual.md | HIGH     | Large  | Developer reference accuracy     |
