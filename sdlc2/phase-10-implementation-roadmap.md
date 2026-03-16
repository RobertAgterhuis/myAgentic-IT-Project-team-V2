# Phase 10 — Implementation Roadmap

> Step-by-step incremental evolution plan from current state to target architecture.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Guiding Principle

Every milestone produces a **deployable, testable system** that is strictly
better than the previous state. No milestone leaves the system in a degraded
or half-wired condition. The existing test suite must pass at every step.

---

## Milestone 1: Engine Hooks + Write-Ahead Persistence

**Objective**: Make the engine extensible without modifying its core loop.

### Deliverables

| Item                                 | File                   | Effort  |
| ------------------------------------ | ---------------------- | ------- |
| Transition hook system               | `engine.ts`            | ~40 LOC |
| Convert SSE broadcast to hook        | `engine.ts`            | ~10 LOC |
| Write-ahead persistence              | `state-persistence.ts` | ~25 LOC |
| `transition_status` in session state | `state-persistence.ts` | ~5 LOC  |
| Unit tests for hooks                 | `tests/unit/engine/`   | ~60 LOC |
| Unit tests for write-ahead           | `tests/unit/engine/`   | ~40 LOC |

### Acceptance Criteria

- [ ] `createEngine({ hooks: { afterTransition: [...] } })` executes hooks
- [ ] SSE broadcast works through hook (no behavior change for clients)
- [ ] Session state includes `transition_status: IN_PROGRESS | COMPLETE`
- [ ] Resume after crash with IN_PROGRESS re-executes the current agent
- [ ] All existing tests pass unchanged

### Dependencies

None. This is the foundation for all subsequent milestones.

---

## Milestone 2: Artifact Registration Integration

**Objective**: Artifacts are automatically registered when agents produce deliverables.

### Deliverables

| Item                                | File                       | Effort  |
| ----------------------------------- | -------------------------- | ------- |
| Artifact declarations in manifest   | `manifest.json`            | ~50 LOC |
| Schema extension for artifact decls | `template-manifest.schema` | ~30 LOC |
| Artifact registration hook          | `engine.ts` (new hook)     | ~60 LOC |
| Content hash computation            | `artifacts.ts`             | ~15 LOC |
| Lineage auto-population             | `artifacts.ts`             | ~40 LOC |
| Artifact API routes                 | `routes/artifacts.ts`      | ~80 LOC |
| Unit tests                          | `tests/unit/sdlc/`         | ~80 LOC |
| Integration test                    | `tests/integration/`       | ~40 LOC |

### Acceptance Criteria

- [ ] After phase completion, artifacts appear in registry with correct type/status
- [ ] Lineage edges (PRODUCES, CONSUMES) are created per manifest declarations
- [ ] Content hashes are computed and stored
- [ ] GET `/api/v1/artifacts` returns registered artifacts
- [ ] GET `/api/v1/artifacts/:id/lineage` returns lineage graph
- [ ] Gate validator verifies content hash integrity

### Dependencies

Milestone 1 (hooks system).

---

## Milestone 3: Shell Executor + P0 Adapters (Git, Testing)

**Objective**: The platform can execute real Git and testing operations.

### Deliverables

| Item                             | File                             | Effort   |
| -------------------------------- | -------------------------------- | -------- |
| Shell execution framework        | `adapters/shell-executor.ts`     | ~60 LOC  |
| GitAdapter implementation        | `adapters/git-adapter.ts`        | ~100 LOC |
| TestingAdapter implementation    | `adapters/testing-adapter.ts`    | ~120 LOC |
| Adapter result cache             | `engine/adapter-result-cache.ts` | ~80 LOC  |
| Tool Executor                    | `engine/tool-executor.ts`        | ~150 LOC |
| Unit tests for shell executor    | `tests/unit/adapters/`           | ~60 LOC  |
| Unit tests for each adapter      | `tests/unit/adapters/`           | ~80 LOC  |
| Integration test: git operations | `tests/integration/`             | ~40 LOC  |
| Integration test: test execution | `tests/integration/`             | ~40 LOC  |

### Acceptance Criteria

- [ ] `GitAdapter.execute('list_branches')` returns real branch list
- [ ] `GitAdapter.execute('create_branch', { name })` creates a real branch
- [ ] `TestingAdapter.execute('run_unit_tests')` runs vitest and returns results
- [ ] Health checks detect missing git/vitest binaries
- [ ] Adapter result cache prevents duplicate side effects on resume
- [ ] Tool Executor routes operations to correct adapter
- [ ] Timeout enforcement works (kills long-running operations)

### Dependencies

Milestone 1 (adapter result cache depends on write-ahead persistence).

### Risk

This milestone touches external systems for the first time. Testing requires
a real git repository and installed test frameworks. CI pipeline must have
these tools available.

---

## Milestone 4: Governance Mode + Advisory Logging

**Objective**: Gate validator reports governance requirements without blocking.

### Deliverables

| Item                              | File                 | Effort  |
| --------------------------------- | -------------------- | ------- |
| Governance mode configuration     | `engine.ts` / config | ~20 LOC |
| Advisory governance check in gate | `gate-validator.ts`  | ~40 LOC |
| Governance audit events           | `audit.ts` extension | ~20 LOC |
| Lightweight identity resolver     | `engine/identity.ts` | ~50 LOC |
| governance-policies.json          | `templates/sdlc/`    | ~60 LOC |
| Unit tests                        | `tests/unit/`        | ~60 LOC |

### Acceptance Criteria

- [ ] Governance mode `off` → no governance checks (current behavior)
- [ ] Governance mode `advisory` → gate results include governance report
- [ ] Identity resolved from git config / env variable
- [ ] Governance audit events written to audit trail
- [ ] Policies loaded from JSON file (not hardcoded)

### Dependencies

None (can run in parallel with Milestone 3).

---

## Milestone 5: Enhanced Error Recovery + Long-Running Support

**Objective**: The engine can handle transient failures and pause/resume cleanly.

### Deliverables

| Item                                     | File                   | Effort  |
| ---------------------------------------- | ---------------------- | ------- |
| Error classification in dispatcher       | `dispatcher.ts`        | ~30 LOC |
| Exponential backoff                      | `dispatcher.ts`        | ~15 LOC |
| Degradation log in session state         | `state-persistence.ts` | ~10 LOC |
| `--single-step` CLI flag                 | `cli.ts`               | ~10 LOC |
| Clean pause (`engine stop --checkpoint`) | `cli.ts` + `engine.ts` | ~20 LOC |
| Unit tests                               | `tests/unit/engine/`   | ~50 LOC |

### Acceptance Criteria

- [ ] Transient errors retry with backoff (max 3, base 2s, cap 30s)
- [ ] Recoverable errors log warning and continue (DEGRADED)
- [ ] Fatal errors halt cleanly with diagnostics
- [ ] `--single-step` processes one state and exits
- [ ] `engine stop` gracefully pauses at next state boundary

### Dependencies

Milestone 1 (hooks for clean pause signal).

---

## Milestone 6: P1 Adapters (CI, Security) + Enforcing Governance

**Objective**: Quality gates are automated and governance can block transitions.

### Deliverables

| Item                             | File                           | Effort   |
| -------------------------------- | ------------------------------ | -------- |
| CiAdapter implementation         | `adapters/ci-adapter.ts`       | ~150 LOC |
| SecurityAdapter implementation   | `adapters/security-adapter.ts` | ~130 LOC |
| Enforcing governance integration | `gate-validator.ts`            | ~50 LOC  |
| Approval persistence             | `store.ts` extension           | ~40 LOC  |
| CLI approval commands            | `cli.ts`                       | ~30 LOC  |
| HTTP approval API                | `routes/approvals.ts`          | ~80 LOC  |
| MCP approval tools               | `mcp-server.ts`                | ~40 LOC  |
| Unit tests                       | `tests/unit/`                  | ~100 LOC |
| Integration test: CI trigger     | `tests/integration/`           | ~40 LOC  |

### Acceptance Criteria

- [ ] `CiAdapter.execute('trigger_workflow')` triggers real GitHub Actions
- [ ] `SecurityAdapter.execute('run_sast')` runs ESLint security rules
- [ ] `SecurityAdapter.execute('audit_dependencies')` runs npm audit
- [ ] Governance mode `enforcing` blocks transitions until approved
- [ ] `sdlc approvals list` shows pending approvals
- [ ] `sdlc approvals approve AR-001` advances workflow
- [ ] HTTP API mirrors CLI functionality

### Dependencies

Milestones 3 (shell executor) and 4 (governance advisory).

---

## Milestone 7: Observability + Analytics Persistence

**Objective**: Metrics are persisted over time and trends are computed.

### Deliverables

| Item                              | File                         | Effort   |
| --------------------------------- | ---------------------------- | -------- |
| Time-series metrics storage       | `observability.ts` extension | ~80 LOC  |
| Agent performance capture         | `dispatcher.ts` hook         | ~30 LOC  |
| Sprint boundary trend computation | `sprint-gate.ts` extension   | ~50 LOC  |
| Analytics API endpoints           | `routes/analytics.ts`        | ~80 LOC  |
| Dashboard data integration        | `ui/pages/metrics/`          | ~100 LOC |
| Unit tests                        | `tests/unit/`                | ~60 LOC  |

### Acceptance Criteria

- [ ] Metrics are appended (not overwritten) with timestamps
- [ ] Agent execution time and success rate tracked per agent
- [ ] Velocity trend computed at sprint boundaries
- [ ] GET `/api/v1/analytics/trends` returns time-series data
- [ ] Metrics dashboard shows trend charts

### Dependencies

Milestones 1 (hooks for agent performance capture).

---

## Milestone 8: P2 Adapters + Release Lifecycle

**Objective**: The platform can build, deploy, and track releases.

### Deliverables

| Item                                | File                            | Effort   |
| ----------------------------------- | ------------------------------- | -------- |
| ContainerAdapter implementation     | `adapters/container-adapter.ts` | ~100 LOC |
| CloudAdapter implementation (Azure) | `adapters/cloud-adapter.ts`     | ~150 LOC |
| LlmAdapter implementation           | `adapters/llm-adapter.ts`       | ~200 LOC |
| Release entity creation             | `lifecycle.ts` extension        | ~60 LOC  |
| Version resolver                    | `engine/version-resolver.ts`    | ~80 LOC  |
| Release notes generator             | `engine/release-notes.ts`       | ~100 LOC |
| Integration tests                   | `tests/integration/`            | ~80 LOC  |

### Acceptance Criteria

- [ ] `ContainerAdapter.execute('build')` builds real Docker images
- [ ] `CloudAdapter.execute('deploy')` deploys to Azure
- [ ] Release entity created at sprint completion with version
- [ ] Release notes auto-generated from completed stories
- [ ] Rollback operation available via CloudAdapter

### Dependencies

Milestones 3 (shell executor) and 6 (CI adapter for deployment pipeline).

### Risk

Cloud deployment requires Azure credentials and infrastructure. Testing requires
a staging environment. Consider a dedicated test Azure resource group.

---

## Milestone 9: Template System Extensions

**Objective**: Templates define the complete SDLC process.

### Deliverables

| Item                              | File                       | Effort  |
| --------------------------------- | -------------------------- | ------- |
| Artifact declarations in manifest | `manifest.json`            | ~50 LOC |
| Governance policy references      | `manifest.json`            | ~30 LOC |
| Tool requirements per phase       | `manifest.json`            | ~30 LOC |
| Lifecycle rules in manifest       | `manifest.json`            | ~40 LOC |
| Template loader extensions        | `template-loader.ts`       | ~60 LOC |
| Manifest schema update            | `template-manifest.schema` | ~80 LOC |
| Transpiler update                 | `generate-platform.js`     | ~40 LOC |
| Unit tests                        | `tests/unit/`              | ~80 LOC |

### Acceptance Criteria

- [ ] Manifest schema v1.1.0 validates with artifact/governance/tool sections
- [ ] Template loader parses extended manifest correctly
- [ ] Missing optional sections gracefully default to current behavior
- [ ] Transpiler includes artifact/tool context in generated agent instructions
- [ ] All existing tests pass (backward compatibility)

### Dependencies

Milestones 2 (artifact model) and 4 (governance model).

---

## Milestone 10: Web UI Enhancements

**Objective**: Full platform visibility through the web interface.

### Deliverables

| Item                   | File                     | Effort   |
| ---------------------- | ------------------------ | -------- |
| Artifact browser page  | `ui/pages/artifacts/`    | ~150 LOC |
| Lineage visualization  | `ui/pages/artifacts/`    | ~100 LOC |
| Governance dashboard   | `ui/pages/governance/`   | ~150 LOC |
| Analytics trend charts | `ui/pages/metrics/`      | ~100 LOC |
| Traceability explorer  | `ui/pages/traceability/` | ~150 LOC |

### Acceptance Criteria

- [ ] Artifact browser shows all registered artifacts with status
- [ ] Lineage graph rendered as visual DAG
- [ ] Governance dashboard shows pending approvals
- [ ] Metrics page shows velocity/DORA trend charts
- [ ] Traceability explorer navigates requirement → code → test chains

### Dependencies

Milestones 2, 4, 7 (data must exist for UI to display).

---

## Execution Timeline

```
Milestone 1: Engine Hooks + Write-Ahead    ━━━━━━━━ (foundation)
                                                |
                ┌───────────────────────────────┼────────────────┐
                ▼                               ▼                ▼
Milestone 2: Artifact Integration    M3: P0 Adapters    M4: Governance Advisory
                |                        |                    |
                ▼                        ▼                    ▼
Milestone 5: Error Recovery       M6: P1 Adapters + Enforcing Governance
                                        |
                                        ▼
                Milestone 7: Observability + Analytics
                                        |
                                        ▼
                Milestone 8: P2 Adapters + Release Lifecycle
                                        |
                                        ▼
                Milestone 9: Template System Extensions
                                        |
                                        ▼
                Milestone 10: Web UI Enhancements
```

### Parallelization Opportunities

- **M2, M3, M4** can run in parallel after M1
- **M5** can run in parallel with M3 and M4
- **M7** can start once M1 is done (independent of adapters)
- **M9** should follow M2 and M4 (depends on artifact + governance models)
- **M10** is the final integration milestone

---

## Total Estimated Code Changes

| Category         | New LOC   | Modified LOC | New Files | Modified Files |
| ---------------- | --------- | ------------ | --------- | -------------- |
| Engine layer     | ~380      | ~100         | 3         | 4              |
| SDLC domain      | ~55       | ~30          | 0         | 2              |
| Adapters         | ~1010     | ~0           | 2         | 7 (stubs→impl) |
| Web app (routes) | ~280      | ~40          | 3         | 2              |
| Web app (UI)     | ~650      | ~0           | ~10       | 0              |
| Templates/config | ~210      | ~50          | 1         | 3              |
| Tests            | ~750      | ~0           | ~15       | 0              |
| **Total**        | **~3335** | **~220**     | **~34**   | **~18**        |

This is a modest footprint. The system's existing architecture means most
evolution is wiring, not rewriting. The largest single area is adapter
implementations (~1010 LOC), which are straightforward shell/API integrations.

---

## Risk Registry

| Risk                              | Probability | Impact | Mitigation                          |
| --------------------------------- | ----------- | ------ | ----------------------------------- |
| Shell execution security          | Medium      | High   | execFile only, no interpolation     |
| Cloud adapter credential exposure | Medium      | High   | Env vars only, audit all access     |
| Test instability in CI            | Medium      | Medium | Separate adapter tests, mock shell  |
| Template schema migration         | Low         | Medium | Schema versioning, backward compat  |
| LLM API rate limiting             | High        | Low    | Retry with backoff, token budgets   |
| Multi-project complexity          | Low         | High   | Defer to post-M10, keep single-proj |
