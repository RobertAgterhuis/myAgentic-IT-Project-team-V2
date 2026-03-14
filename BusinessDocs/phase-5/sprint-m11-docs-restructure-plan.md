# M11: Docs → BusinessDocs Restructure — Sprint Plan

**Milestone**: M11 (BLOCKING — all other milestones gated until complete)  
**Branch**: `feature/m11-docs-restructure`  
**Created**: 2026-03-14  
**Impact**: ~350+ path references across runtime code, tests, agents, contracts, guardrails, playbooks, and configs

---

## Rationale

The `docs/` folder currently mixes **solution infrastructure** (contracts, guardrails, playbooks, templates) with **project-specific output** (phase deliverables, session state, metrics, brand assets, synthesis reports). This prevents clean multi-project reuse and violates separation-of-concerns.

### What MOVES to `BusinessDocs/`

| Folder / File                           | Contents                                                                   | Est. References |
| --------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| `docs/session/`                         | session-state.json, run-history, reevaluate-trigger, github-state-snapshot | ~35             |
| `docs/brand/`                           | design-tokens.json, brand-guidelines, brand assets                         | ~54             |
| `docs/synthesis/`                       | final reports, cross-team-blocker-matrix, scope changes                    | ~58             |
| `docs/metrics/`                         | KPI logs, runtime-metrics.json                                             | ~13             |
| `docs/retrospectives/`                  | sprint retros, velocity-log.json, lessons-learned                          | ~23             |
| `docs/phase-1/` through `docs/phase-4/` | Phase deliverables                                                         | ~20             |
| `docs/phase-5/`                         | Sprint deliverables, completion reports, test plans                        | ~15             |
| `docs/onboarding/`                      | onboarding-output.md                                                       | ~9              |
| `docs/storybook/`                       | component-inventory.md, storybook guardrails                               | ~18             |
| `docs/decisions.md`                     | Decision log (root file)                                                   | ~40             |
| `docs/decisions/`                       | Individual decision files                                                  | ~10             |
| `docs/github/`                          | GitHub config, labels, issue templates                                     | ~5              |
| `docs/analytics-events.json`            | Analytics event log                                                        | ~3              |
| `docs/domain-glossary.md`               | Domain terminology                                                         | ~5              |
| `docs/data-dictionary.md`               | Data dictionary                                                            | ~3              |
| `docs/audit/`                           | Audit log                                                                  | ~3              |
| `docs/user-manual.md`                   | End-user docs                                                              | ~2              |
| `docs/technical-manual.md`              | Technical docs                                                             | ~2              |
| `docs/privacy-policy.md`                | Privacy policy (project-specific)                                          | ~2              |

### What STAYS in `docs/`

| Folder / File                   | Reason                                      |
| ------------------------------- | ------------------------------------------- |
| `docs/contracts/`               | Solution infrastructure (agent contracts)   |
| `docs/guardrails/`              | Solution infrastructure (agent guardrails)  |
| `docs/playbooks/`               | Solution infrastructure (process playbooks) |
| `docs/templates/`               | Solution infrastructure (output templates)  |
| `docs/api/`                     | API documentation                           |
| `docs/help/`                    | In-app help system                          |
| `docs/security/`                | Security framework docs                     |
| `docs/_config.yml`              | GitHub Pages config                         |
| `docs/index.md`                 | GitHub Pages landing                        |
| `docs/README.md`                | Docs README                                 |
| `docs/agent-index.md`           | Agent skill/guardrail index                 |
| `docs/file-system-reference.md` | File system map                             |
| `docs/contributing.md`          | Contribution guide                          |
| `docs/quick-start.md`           | Quick start guide                           |
| `docs/mode-guide.md`            | Mode guide                                  |

---

## Sprint Stories

### Story M11-0: Introduce BUSINESS_OUTPUT constant + config layer

**Points**: 3  
**Description**: Add a `BUSINESS_OUTPUT` constant in `server.js` that initially points to the new `BusinessDocs/` paths for session, metrics, brand, synthesis, etc. Update `ctx` object to pass these. This creates a single choke point for all path references, making the physical move safe.

**Files**:

- `src/webapp/server.js` — Add new constants: `BUSINESS_OUTPUT = BUSINESS_DOCS`, restructure SESSION_DIR, DECISIONS_FILE, etc. to use `BUSINESS_OUTPUT` instead of `GITHUB_DOCS`
- `src/webapp/orchestrator/sprint-gate.js` — Replace 5 hardcoded `docs/...` strings with configurable paths from ctx or constants

**Acceptance Criteria**:

- [ ] All new path constants resolve to `BusinessDocs/` equivalents
- [ ] `ctx` object updated with new path references
- [ ] sprint-gate.js uses injected paths, not hardcoded strings
- [ ] All existing tests still pass (no physical move yet — paths just changed in code)

---

### Story M11-1: Physical move — session, decisions, audit

**Points**: 2  
**Description**: `git mv` the session/, decisions/, decisions.md, and audit/ folders/files from `docs/` to `BusinessDocs/`.

**Moves**:

- `docs/session/` → `BusinessDocs/session/`
- `docs/decisions.md` → `BusinessDocs/decisions.md`
- `docs/decisions/` → `BusinessDocs/decisions/`
- `docs/audit/` → `BusinessDocs/audit/`
- `docs/analytics-events.json` → `BusinessDocs/analytics-events.json`

**Acceptance Criteria**:

- [ ] All files moved via `git mv`
- [ ] Server starts without errors
- [ ] All unit tests pass
- [ ] Session state read/write works

---

### Story M11-2: Physical move — brand, storybook, synthesis

**Points**: 2  
**Description**: Move brand assets, storybook, and synthesis reports.

**Moves**:

- `docs/brand/` → `BusinessDocs/brand/`
- `docs/storybook/` → `BusinessDocs/storybook/`
- `docs/synthesis/` → `BusinessDocs/synthesis/`

**Acceptance Criteria**:

- [ ] All files moved via `git mv`
- [ ] `scripts/build-tokens.mjs` updated to use `BusinessDocs/brand/`
- [ ] All tests pass

---

### Story M11-3: Physical move — metrics, retrospectives, onboarding

**Points**: 2  
**Description**: Move operational data folders.

**Moves**:

- `docs/metrics/` → `BusinessDocs/metrics/`
- `docs/retrospectives/` → `BusinessDocs/retrospectives/`
- `docs/onboarding/` → `BusinessDocs/onboarding/`

**Acceptance Criteria**:

- [ ] All files moved via `git mv`
- [ ] metrics-dashboard.js routes still find metrics data
- [ ] drift.js still finds sync reports
- [ ] All tests pass

---

### Story M11-4: Physical move — phase folders (1-5)

**Points**: 2  
**Description**: Move all phase deliverable folders.

**Moves**:

- `docs/phase-1/` → `BusinessDocs/phase-1/`
- `docs/phase-2/` → `BusinessDocs/phase-2/`
- `docs/phase-3/` → `BusinessDocs/phase-3/`
- `docs/phase-4/` → `BusinessDocs/phase-4/`
- `docs/phase-5/` → `BusinessDocs/phase-5/`

**Acceptance Criteria**:

- [ ] All files moved via `git mv` (note: sprint plan stays in repo as `BusinessDocs/phase-5/`)
- [ ] All tests pass
- [ ] Dispatcher/pipeline tests updated

---

### Story M11-5: Physical move — remaining project-specific files

**Points**: 1  
**Description**: Move remaining project-specific files.

**Moves**:

- `docs/github/` → `BusinessDocs/github/`
- `docs/domain-glossary.md` → `BusinessDocs/domain-glossary.md`
- `docs/data-dictionary.md` → `BusinessDocs/data-dictionary.md`
- `docs/user-manual.md` → `BusinessDocs/user-manual.md`
- `docs/technical-manual.md` → `BusinessDocs/technical-manual.md`
- `docs/privacy-policy.md` → `BusinessDocs/privacy-policy.md`

**Acceptance Criteria**:

- [ ] All files moved
- [ ] All tests pass

---

### Story M11-6: Update test files (~25 references)

**Points**: 3  
**Description**: Update all test file path assertions and mock paths.

**Files**:

- `tests/unit/routes-drift.test.js`
- `tests/unit/session-state-resolver.test.js`
- `tests/unit/sprint-gate.test.js`
- `tests/unit/metrics-dashboard.test.js` (matomo paths)
- `tests/unit/routes-orchestrator.test.js` (dispatcher paths)
- `tests/smoke/create-pipeline.smoke.test.js`
- `tests/integration/regression-suite.test.js`
- `tests/integration/decisions-roundtrip.test.js`
- `tests/integration/server-api.test.js`

**Acceptance Criteria**:

- [ ] All test assertions updated to `BusinessDocs/` paths
- [ ] Jest 279/279, Vitest 1293/1293
- [ ] No test references docs/ for project-specific content

---

### Story M11-7: Update agent files (~203 references)

**Points**: 5  
**Description**: Mass find-and-replace across all 37 agent `.md` files. Replace `docs/session`, `docs/brand`, `docs/synthesis`, `docs/metrics`, `docs/retrospectives`, `docs/onboarding`, `docs/storybook`, `docs/phase-1..5`, `docs/decisions.md`, `docs/decisions/`, `docs/github/`, `docs/audit/` with `BusinessDocs/` equivalents.

**Files**: All files in `agents/*.md`

**Acceptance Criteria**:

- [ ] All ~203 path references updated
- [ ] No agent file references `docs/` for project-specific folders
- [ ] Infrastructure refs (`docs/contracts/`, `docs/guardrails/`, `docs/playbooks/`, etc.) left unchanged

---

### Story M11-8: Update contracts, guardrails, playbooks (~56 references)

**Points**: 3  
**Description**: Update all path references in solution infrastructure docs.

**Files**: All files in:

- `docs/contracts/*.md`
- `docs/guardrails/*.md`
- `docs/playbooks/*.md`

**Acceptance Criteria**:

- [ ] All ~56 path references updated
- [ ] Infrastructure cross-references (`docs/contracts/`, etc.) left unchanged

---

### Story M11-9: Update copilot-instructions + scripts

**Points**: 2  
**Description**: Update the copilot-instructions file (~17 refs) and build scripts (~3 refs).

**Files**:

- `.github/copilot-instructions.md` — 17 path references
- `scripts/build-tokens.mjs` — TOKENS_PATH
- `scripts/github-state-snapshot.js` — OUTPUT_FILE
- `src/webapp/orchestrator/state-persistence.js` — Fix DEFAULT_SESSION_DIR bug (resolves to `src/docs/session/` instead of `docs/session/` → should become `BusinessDocs/session/`)

**Acceptance Criteria**:

- [ ] copilot-instructions updated
- [ ] build-tokens.mjs points to `BusinessDocs/brand/design-tokens.json`
- [ ] github-state-snapshot.js outputs to `BusinessDocs/session/`
- [ ] state-persistence.js DEFAULT_SESSION_DIR bug fixed → `BusinessDocs/session/`
- [ ] All tests pass

---

### Story M11-10: Update file-system-reference + milestones.json + final verification

**Points**: 2  
**Description**: Update documentation, register milestone, run full test suite.

**Files**:

- `docs/file-system-reference.md` — Rewrite BusinessDocs/ section, update docs/ section
- `data/milestones.json` — Add M11 milestone entry
- `docs/agent-index.md` — Update any path references

**Acceptance Criteria**:

- [ ] file-system-reference.md reflects new structure
- [ ] milestones.json has M11 entry with all stories
- [ ] Full test suite: Jest 279/279, Vitest 1293/1293
- [ ] ESLint clean
- [ ] Server starts and serves all routes
- [ ] Git commit + push

---

## Execution Order

Stories MUST be executed in order (0 → 10). Each story has a verification gate (tests must pass) before proceeding.

## Total Points: 27

## Risk Mitigation

- **Rollback**: Each story is a separate commit. `git revert` any single story if needed.
- **Blocking**: This milestone blocks M6-M10; no other work should merge until M11 is complete.
- **GitHub Pages**: `docs/_config.yml` and `docs/index.md` stay — GitHub Pages unaffected.
