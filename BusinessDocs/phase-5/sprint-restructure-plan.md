# Sprint Plan: Repository Structure Reorganization

**Sprint ID:** S-RESTRUCTURE  
**Branch:** `feature/clean-reorder`  
**Date:** 2026-03-13  
**Goal:** Move all misplaced files to their logical locations and update every reference so nothing breaks.

---

## Execution Order & Dependencies

```
Story 0 (prerequisite) ── no deps
Story 1 ── depends on nothing  
Story 2 ── depends on nothing  
Story 3 ── depends on nothing  
Story 4 ── depends on nothing  
Story 5 ── depends on nothing  
Story 6 ── depends on Story 5 (vitest config)  
Story 7 ── depends on Stories 1–6 (file-system-reference rewrite)  
Story 8 ── depends on nothing  
── Full test suite ── after all stories  
── Commit & push ──  
```

---

## Story 0: Cleanup Stale Config Reference

**What:** Remove already-deleted `dashboard.js` from vitest coverage exclude.

| # | Action | File |
|---|--------|------|
| 0.1 | Remove `'src/webapp/dashboard.js'` line from coverage.exclude | `vitest.config.mjs` |

**Test:** `npx vitest run` (root) — all pass, no coverage config errors.

---

## Story 1: Move 12 Misplaced Docs from `docs/` Root to Subdirectories

**What:** Sprint/milestone artifacts, policy docs, and workflow guides are scattered in `docs/` root instead of the subdirectories that exist for them.

### Moves

| # | Source | Destination | Rationale |
|---|--------|-------------|-----------|
| 1.1 | `docs/SPRINT-9-COMPLETION-REPORT.md` | `docs/phase-5/sprint-9-completion-report.md` | All sprint reports live in phase-5/ |
| 1.2 | `docs/SPRINT-9-TEST-PLAN.md` | `docs/phase-5/sprint-9-test-plan.md` | Sprint artifact, consistent naming |
| 1.3 | `docs/accessibility-audit-s9h.md` | `docs/phase-5/sprint-9h-accessibility-audit.md` | Sprint S9H deliverable |
| 1.4 | `docs/M5-security-typescript-audit.md` | `docs/phase-5/m5-security-typescript-audit.md` | Milestone execution doc |
| 1.5 | `docs/scope-change-all-2026-03-12.md` | `docs/synthesis/scope-change-all-2026-03-12.md` | file-system-reference says scope changes go to synthesis/ |
| 1.6 | `docs/security-design.md` | `docs/security/security-design.md` | docs/security/ already exists |
| 1.7 | `docs/data-inventory.md` | `docs/security/data-inventory.md` | Privacy/compliance companion doc |
| 1.8 | `docs/ga-definition.md` | `docs/phase-5/ga-definition.md` | Governance/release doc |
| 1.9 | `docs/operating-handbook.md` | `docs/phase-5/operating-handbook.md` | Operations artifact |
| 1.10 | `docs/release-checklist.md` | `docs/phase-5/release-checklist.md` | Release discipline doc |
| 1.11 | `docs/truth-source-policy.md` | `docs/guardrails/truth-source-policy.md` | Policy/guardrail document |
| 1.12 | `docs/translation-workflow.md` | `docs/help/translation-workflow.md` | Workflow how-to guide |

### Breaking References to Update

| # | File | Line(s) | What to Update |
|---|------|---------|----------------|
| 1.R1 | `tests/unit/governance-docs.test.js` | 21-24, 44, 95, 143 | `readDoc()` uses `path.resolve(__dirname, '../../docs')` + bare filename. Change to: `readDoc('security/security-design.md')`, `readDoc('security/data-inventory.md')`, `readDoc('phase-5/ga-definition.md')` |
| 1.R2 | `docs/SPRINT-9-COMPLETION-REPORT.md` (self) | 445-446 | Update self-references and link to TEST-PLAN after both are moved |
| 1.R3 | `docs/session/session-state.json` | 268+ | Update path values for `ga-definition.md` → `phase-5/ga-definition.md` |
| 1.R4 | `docs/index.md` | Various | Update any Jekyll links to moved files |
| 1.R5 | `docs/file-system-reference.md` | Multiple | Remove moved files from docs/ table (defer to Story 7) |

**Test:** `npx vitest run tests/unit/governance-docs.test.js` — must still pass (36 tests).

---

## Story 2: Delete Brand-Guidelines Duplicate

**What:** `docs/brand-guidelines.md` (v1.0) is an outdated duplicate of `docs/brand/brand-guidelines.md` (v2.0, canonical).

### Actions

| # | Action |
|---|--------|
| 2.1 | `git rm docs/brand-guidelines.md` |

### References to Update

| # | File | Line | What to Update |
|---|------|------|----------------|
| 2.R1 | `docs/index.md` | ~27 | Change `[Brand Guidelines](brand-guidelines)` → `[Brand Guidelines](brand/brand-guidelines)` |
| 2.R2 | `docs/README.md` | ~305 | Update structure description |
| 2.R3 | `docs/onboarding/onboarding-output.md` | 106, 118, 176 | Change `docs/brand-guidelines.md` → `docs/brand/brand-guidelines.md` |
| 2.R4 | `docs/phase-1/01-business-analyst-analysis.md` | ~44 | Update reference |
| 2.R5 | `docs/file-system-reference.md` | ~224 | Remove row (defer to Story 7) |

**Test:** Verify no links point to deleted file: `grep -r "brand-guidelines" docs/ | grep -v brand/`

---

## Story 3: Move KPI Logs & Retrospectives Per Documented Convention

**What:** `file-system-reference.md` says KPI files belong in `docs/metrics/` and retrospectives in `docs/retrospectives/`. Currently they're in `docs/phase-5/`.

### Moves

| # | Source | Destination |
|---|--------|-------------|
| 3.1 | `docs/phase-5/sprint-1-kpi-final.json` | `docs/metrics/sprint-1-kpi-final.json` |
| 3.2 | `docs/phase-5/sprint-1-kpi-log.md` | `docs/metrics/sprint-1-kpi-log.md` |
| 3.3 | `docs/phase-5/sprint-2-kpi-log.md` | `docs/metrics/sprint-2-kpi-log.md` |
| 3.4 | `docs/phase-5/sprint-3-kpi-log.md` | `docs/metrics/sprint-3-kpi-log.md` |
| 3.5 | `docs/phase-5/sprint-5-kpi-log.md` | `docs/metrics/sprint-5-kpi-log.md` |
| 3.6 | `docs/phase-5/sprint-1-retrospective.md` | `docs/retrospectives/sprint-1-retrospective.md` |
| 3.7 | `docs/phase-5/sprint-2-retrospective.md` | `docs/retrospectives/sprint-2-retrospective.md` |
| 3.8 | `docs/phase-5/sprint-4-retrospective.md` | `docs/retrospectives/sprint-4-retrospective.md` |
| 3.9 | `docs/phase-5/sprint-5-retrospective.md` | `docs/retrospectives/sprint-5-retrospective.md` |

### References to Update

| # | File | What to Update |
|---|------|----------------|
| 3.R1 | `docs/session/session-state.json` | Update 8 path values: `kpi_tracking`, `sprint_kpi_final`, `sprint_N_retrospective` entries |
| 3.R2 | Sprint completion reports (phase-5/) | Internal links referencing retro/KPI files in same dir |
| 3.R3 | `docs/file-system-reference.md` | Verify metrics/ and retrospectives/ documentation (defer to Story 7) |

**Test:** `npx vitest run` — full suite (KPI/retro paths are referenced at runtime via session-state.json).

---

## Story 4: Move `docs/decisions-architecture.md`

**What:** System documentation for the decision architecture sits alongside decision records. Belongs in `docs/help/`.

### Move

| Source | Destination |
|--------|-------------|
| `docs/decisions-architecture.md` | `docs/help/decisions-architecture.md` |

### Breaking References to Update

| # | File | Line | What to Update |
|---|------|------|----------------|
| 4.R1 | `docs/user-manual.md` | 149 | Change `(decisions-architecture.md)` → `(help/decisions-architecture.md)` |
| 4.R2 | `docs/technical-manual.md` | 833 | Change `(../decisions-architecture.md)` → `(../help/decisions-architecture.md)` |
| 4.R3 | `docs/help/decisions.md` | 226 | Change `docs/decisions-architecture.md` → `docs/help/decisions-architecture.md` |
| 4.R4 | `docs/file-system-reference.md` | 225 | Move to help/ section (defer to Story 7) |

**Test:** Manual — verify markdown links resolve.

---

## Story 5: Consolidate Server-Side Test Files to `tests/unit/`

**What:** 10 test files in `src/webapp/` and 6 in `src/webapp/routes/` should move to `tests/unit/` to match the dominant convention. React UI tests (`src/webapp/ui/`) stay co-located (standard Vite/React pattern).

### Moves (16 files)

| # | Source | Destination | Import Path Change |
|---|--------|-------------|-------------------|
| 5.1 | `src/webapp/cache.test.js` | `tests/unit/cache.test.js` | `./store` → `../../src/webapp/store`, `./cache` → `../../src/webapp/cache` |
| 5.2 | `src/webapp/contrast.test.js` | `tests/unit/contrast.test.js` | No source imports (standalone validation) |
| 5.3 | `src/webapp/drift-detector.test.js` | `tests/unit/drift-detector.test.js` | `./drift-detector` → `../../src/webapp/drift-detector`, `./schemas` → `../../src/webapp/schemas` |
| 5.4 | `src/webapp/errors.test.js` | `tests/unit/errors.test.js` | `./utils/errors` → `../../src/webapp/utils/errors` |
| 5.5 | `src/webapp/metrics-dashboard.test.js` | `tests/unit/metrics-dashboard.test.js` | `./store` → `../../src/webapp/store`, `./cache` → `../../src/webapp/cache`, `./routes/metrics-dashboard` → `../../src/webapp/routes/metrics-dashboard` |
| 5.6 | `src/webapp/models.test.js` | `tests/unit/models.test.js` | `./models` → `../../src/webapp/models` |
| 5.7 | `src/webapp/schemas.test.js` | `tests/unit/schemas.test.js` | `./schemas` → `../../src/webapp/schemas` |
| 5.8 | `src/webapp/server.test.js` | `tests/unit/server.test.js` | `./server` → `../../src/webapp/server` |
| 5.9 | `src/webapp/session-state-resolver.test.js` | `tests/unit/session-state-resolver.test.js` | `./session-state-resolver` → `../../src/webapp/session-state-resolver` |
| 5.10 | `src/webapp/store.test.js` | `tests/unit/store.test.js` | `./store` → `../../src/webapp/store` |
| 5.11 | `src/webapp/routes/dashboard.test.js` | `tests/unit/routes-dashboard.test.js` | `./dashboard.js` → `../../src/webapp/routes/dashboard.js` |
| 5.12 | `src/webapp/routes/decisions.test.js` | `tests/unit/routes-decisions.test.js` | `./decisions.js` → `../../src/webapp/routes/decisions.js` |
| 5.13 | `src/webapp/routes/drift.test.js` | `tests/unit/routes-drift.test.js` | `./drift.js` → `../../src/webapp/routes/drift.js` |
| 5.14 | `src/webapp/routes/milestones.test.js` | `tests/unit/routes-milestones.test.js` | `./milestones.js` → `../../src/webapp/routes/milestones.js` |
| 5.15 | `src/webapp/routes/orchestrator.test.js` | `tests/unit/routes-orchestrator.test.js` | `./orchestrator.js` → `../../src/webapp/routes/orchestrator.js` |
| 5.16 | `src/webapp/routes/subscribe.test.js` | `tests/unit/routes-subscribe.test.js` | `./subscribe.js` → `../../src/webapp/routes/subscribe.js` |

### Config & Reference Updates

| # | File | What to Update |
|---|------|----------------|
| 5.C1 | `vitest.config.mjs` | Remove `src/webapp/**/*.test.js` from `include` (only `tests/**/*.test.js` needed now). Remove `src/webapp/**/*.test.js` from `coverage.exclude` (no more test files in src/) |
| 5.C2 | `.husky/pre-commit` | Change `npx vitest run src/webapp/schemas.test.js src/webapp/middleware.test.js` → `npx vitest run tests/unit/schemas.test.js tests/unit/middleware.test.js` |
| 5.C3 | `docs/accessibility-audit-s9h.md` | Update references to `src/webapp/contrast.test.js` |
| 5.C4 | `docs/phase-2/06-senior-developer-analysis.md` | Update references (informational) |

**Test:** 
1. `npx vitest run` (root) — all 46+ suites pass
2. `npx jest --ci` — all 14 suites pass  
3. Verify pre-commit hook: `bash .husky/pre-commit` runs without path errors

---

## Story 6: Delete Empty Directories & Relocate Example Test

**What:** Clean up ghost directories and misplaced test file.

| # | Action |
|---|--------|
| 6.1 | Delete empty `src/docs/` directory (if still exists on disk) |
| 6.2 | Delete empty `src/system/` directory (if exists) |
| 6.3 | Move `tests/example.test.js` → `tests/unit/example.test.js` (or delete — it's already excluded in vitest; only runs via Jest) |

### Config Updates (if moving example.test.js)

| # | File | What to Update |
|---|------|----------------|
| 6.C1 | `vitest.config.mjs` | Change `tests/example.test.js` → `tests/unit/example.test.js` in exclude list |
| 6.C2 | `package.json` jest.testMatch | Change `<rootDir>/tests/example.test.js` → `<rootDir>/tests/unit/example.test.js` |

**Test:** `npx jest --ci` — 14 suites (including example) pass.

---

## Story 7: Rewrite `docs/file-system-reference.md`

**What:** The file incorrectly says `agents/` and `docs/` are inside `.github/`. After Stories 1–6, many file locations have changed. This needs a comprehensive rewrite.

### Actions

| # | Action |
|---|--------|
| 7.1 | Fix Section 2: `.github/` should only list workflows, templates, dependabot, CODEOWNERS |
| 7.2 | Add `agents/` as a root-level section (currently misplaced under .github/) |
| 7.3 | Remove entries for deleted/moved files (brand-guidelines.md, decisions-architecture.md from docs/ table) |
| 7.4 | Add entries for new locations (docs/security/security-design.md, docs/security/data-inventory.md, etc.) |
| 7.5 | Update src/webapp/ section (no more test files listed there) |
| 7.6 | Update tests/ section (new files from Story 5) |
| 7.7 | Verify docs/metrics/ and docs/retrospectives/ sections match reality |

**Test:** Manual review — verify every listed file actually exists at the stated path.

---

## Story 8: Deduplicate `CONTRIBUTING.md`

**What:** `CONTRIBUTING.md` (root, GitHub convention) and `docs/contributing.md` (GitHub Pages wrapper) overlap.

### Actions

| # | Action |
|---|--------|
| 8.1 | Replace `docs/contributing.md` content with a thin redirect that links to root `CONTRIBUTING.md` |

**Test:** Verify `docs/contributing.md` renders correctly on GitHub Pages.

---

## Verification Gate (after all stories)

| # | Check | Command |
|---|-------|---------|
| V1 | Vitest (root) | `npx vitest run` — all suites pass |
| V2 | Jest (root) | `npx jest --ci` — all 14 suites pass |
| V3 | ESLint | `npx eslint .` — clean |
| V4 | Pre-commit hook | `bash .husky/pre-commit` — exits 0 |
| V5 | Vitest (UI) | `cd src/webapp/ui && npx vitest run` |
| V6 | No broken doc refs | `grep -r` spot checks for old paths |
| V7 | Git status clean | Only intentional changes staged |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken test imports after Story 5 | HIGH — CI fails | Update every `require()`/`import` path. Run tests after each file move. |
| session-state.json path breakage | MEDIUM — runtime errors | Carefully update all path values in Stories 1 & 3 |
| Git history loss | LOW | `git mv` preserves history. Squash commit on PR will lose individual moves but `git log --follow` still works. |
| Missed reference in agent skill files | LOW — docs only | Agents reference `docs/brand/brand-guidelines.md` (canonical) — already correct. Spot-check after completion. |
| Pre-commit hook failure | MEDIUM — blocks future commits | Test hook explicitly in V4 gate |

---

## Summary

| Story | Files Moved/Deleted | References Updated | Effort |
|-------|--------------------:|-------------------:|--------|
| 0 | 0 | 1 | Trivial |
| 1 | 12 moved | ~8 | Medium |
| 2 | 1 deleted | ~5 | Small |
| 3 | 9 moved | ~10 | Medium |
| 4 | 1 moved | 4 | Small |
| 5 | 16 moved | ~20+ (all imports) | Large |
| 6 | 1 moved + 2 dirs | 2 | Small |
| 7 | 0 (rewrite) | ~30 lines | Medium |
| 8 | 0 (edit) | 1 | Trivial |
| **Total** | **39 moved, 1 deleted** | **~80+** | |
