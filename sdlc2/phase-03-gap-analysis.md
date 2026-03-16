# Phase 3 — Gap Analysis

> Systematic identification of gaps between current state and SDLC platform requirements.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Classification Framework

| Gap Type       | Definition                                                            |
| -------------- | --------------------------------------------------------------------- |
| ARCHITECTURAL  | Missing structural component or incorrect decomposition               |
| INTEGRATION    | Components exist but are not wired together                           |
| IMPLEMENTATION | Interface defined, implementation is a stub or incomplete             |
| OPERATIONAL    | Feature works but lacks runtime monitoring, alerting, or self-healing |
| EVOLUTION      | Current design blocks future capability; needs structural refactoring |

---

## 1. Artifact Lineage Integration

### Current State

- `ArtifactRegistry` class with CRUD, versioning, and lineage edges
- `LineageEdge` with 5 relationship types
- JSON Schema validation for artifacts
- Gate validator checks deliverable structure

### Gap

**Type: INTEGRATION**

The ArtifactRegistry exists as a standalone class but is never instantiated or
invoked by the engine. When the dispatcher runs an agent and produces a
deliverable (written to a file in `BusinessDocs/`), no artifact record is
created. The lineage graph is never populated.

### Specific Missing Connections

1. **Dispatcher → ArtifactRegistry**: After a successful agent execution, the
   dispatcher should register the deliverable as an artifact with type, status,
   and metadata.
2. **Gate Validator → ArtifactRegistry**: When the critic validates a deliverable,
   the validation result should update the artifact status (DRAFT → REVIEW →
   APPROVED or back to DRAFT on failure).
3. **Cross-phase lineage**: When Phase 2 references a Phase 1 deliverable, a
   CONSUMES edge should be created automatically.
4. **Sprint Gate → ArtifactRegistry**: Sprint artifacts (plans, retrospectives,
   KPI reports) should be registered.

### Impact

Without this integration, the system cannot answer fundamental questions:

- "What deliverables exist for this project?"
- "Which artifacts passed validation?"
- "What is the lineage chain from requirement to deployed code?"

### Recommendation

Wire `ArtifactRegistry` into `engine.ts` as a first-class service alongside
the state machine and persistence layer. Add artifact registration hooks in
the dispatcher's `afterExecute` path. Estimated touch points: 3 files
(engine.ts, dispatcher.ts, gate-validator.ts).

---

## 2. Release Lifecycle

### Current State

- `Release` and `Deployment` entity types defined in `entities.ts`
- RELEASE stage in `lifecycle.ts` with 3 gate conditions
- Feature delivery workflow includes RELEASE stage
- `CloudAdapter` has deploy/rollback operations (stubs)

### Gap

**Type: IMPLEMENTATION + INTEGRATION**

No runtime mechanism exists to:

1. Create a release entity from completed sprint output
2. Version the release (semantic versioning)
3. Build release artifacts (package, tag, publish)
4. Deploy to target environments
5. Track deployment status
6. Execute rollback on failure

The data model is ready; the execution layer is missing entirely.

### Specific Missing Components

1. **Release builder**: Service that assembles release artifacts from completed
   implementation tasks and produces a versioned package.
2. **Version resolver**: Determines next version based on semantic versioning
   rules and the nature of changes (breaking, feature, fix).
3. **Environment registry**: No inventory of deployment targets (dev, staging,
   production) with their configurations and promotion rules.
4. **Deployment orchestrator**: Sequence of operations (build → test → deploy →
   smoke → promote or rollback).
5. **Release notes generator**: Automated compilation from completed stories,
   decisions, and changelogs.

### Impact

The system can plan and build software but cannot release it. This makes the
Phase 5 Implementation loop incomplete — it ends at "PR merged" rather than
"deployed and validated."

### Recommendation

Implement the release lifecycle in two stages:

1. **Stage A**: Release entity creation + version resolution + release notes
   (pure data, no infrastructure).
2. **Stage B**: Wire CloudAdapter and ContainerAdapter to execute deployments
   (requires live adapter implementations).

---

## 3. Deployment Orchestration

### Current State

- `CloudAdapter` with operations: deploy, status, list_environments, rollback
- `ContainerAdapter` with operations: build, push, inspect, scan
- `Deployment` entity type with environment, targets, health_check, rollback_plan
- Docker Compose profiles for local deployment (dev, analytics, webapp)

### Gap

**Type: IMPLEMENTATION**

All adapter operations return `{ success: true, note: 'Stub' }`. There is no
code path from the engine to any deployment infrastructure.

### Specific Missing Implementations

1. **Docker/container execution**: `ContainerAdapter.execute('build')` should
   invoke `docker build` or equivalent.
2. **Cloud deployment**: `CloudAdapter.execute('deploy')` should target Azure
   (primary) or configurable provider.
3. **Health check validation**: Post-deployment health checks are modeled
   but not implemented.
4. **Rollback trigger**: No mechanism to detect deployment failure and initiate
   automatic rollback.
5. **Environment configuration**: No secure storage for environment-specific
   configurations, secrets, and connection strings.

### Impact

Without deployment orchestration, the system requires manual intervention for
every release, breaking the automation promise.

### Recommendation

Prioritize Azure deployment (based on the decision documents in
`BusinessDocs/decisions/`) as the primary implementation target. Use the
existing `BaseAdapter` extension pattern. Implement health checks using
HTTP endpoint polling.

---

## 4. Incident Feedback Loops

### Current State

- `Incident` entity type defined with severity, affected_services, root_cause,
  resolution_steps, lessons_learned
- `incident-response.yaml` workflow with 7 stages (TRIAGE → INVESTIGATION →
  MITIGATION → RESOLUTION → POST_MORTEM → IMPROVEMENT → CLOSURE)
- MTTR computation in observability module
- IMPROVEMENT entity type for process improvements

### Gap

**Type: INTEGRATION + IMPLEMENTATION**

The incident lifecycle is fully modeled but has no connection to:

1. Real incident detection (monitoring → alert → incident creation)
2. The sprint gate (incidents should influence sprint planning)
3. The retrospective agent (lessons from incidents should merge with sprint
   retrospectives)
4. The DORA metric pipeline (MTTR requires real incident timestamps)

### Specific Missing Connections

1. **Alert → Incident creation**: No inbound webhook or monitor integration.
2. **Incident → Sprint backlog**: No mechanism to inject incident-driven work
   items into the current sprint.
3. **Post-mortem → Lessons learned**: The incident workflow produces a post-mortem
   but doesn't write to `lessons-learned.md`.
4. **Incident metrics → Observability**: MTTR computation exists but has no
   real incident data to consume.

### Impact

Operational feedback is the loop that closes the gap between "software built"
and "software running." Without it, the platform handles creation but not
operational lifecycle.

### Recommendation

Start with the post-mortem → lessons-learned connection (pure data flow, no
infrastructure). Then add incident entity creation via API endpoint. Live
monitoring can come later.

---

## 5. Tool Execution Layer

### Current State

- 7 adapter types with `ToolAdapter` interface
- `AdapterRegistry` with registration, lookup, health checks
- 12 canonical tools defined in `tools.json`
- MCP server exposes tools via stdio

### Gap

**Type: IMPLEMENTATION (high priority)**

This is the system's most impactful gap. The adapters define WHAT should be
executable, but none of them actually execute anything.

### Stratified Gap Analysis

| Adapter            | Interface Quality | Implementation Status | Priority |
| ------------------ | ----------------- | --------------------- | -------- |
| `GitAdapter`       | Complete          | 100% stub             | P0       |
| `CiAdapter`        | Complete          | 100% stub             | P0       |
| `TestingAdapter`   | Complete          | 100% stub             | P0       |
| `SecurityAdapter`  | Complete          | 100% stub             | P1       |
| `ContainerAdapter` | Complete          | 100% stub             | P1       |
| `CloudAdapter`     | Complete          | 100% stub             | P2       |
| `LlmAdapter`       | Complete          | 100% stub             | P2       |

**P0 adapters** are required for basic development workflow automation (Git
operations, CI triggering, test execution).  
**P1 adapters** are required for security and deployment.  
**P2 adapters** can operate with manual fallbacks initially.

### Recommendation

Implement P0 adapters first, targeting:

- `GitAdapter`: Shell out to `git` CLI or use `simple-git` library
- `CiAdapter`: GitHub Actions API (REST)
- `TestingAdapter`: Shell out to `vitest`/`playwright`

Each adapter should keep the existing `BaseAdapter` pattern and only replace
the `execute()` stub with real logic.

---

## 6. Multi-Project Support

### Current State

- Single `session-state.json` per workspace
- Single `FileStore` instance per server
- No project-level scoping in the store layer
- Entity model has `project_id` fields but these are string identifiers with
  no project registry

### Gap

**Type: ARCHITECTURAL**

The system assumes a single project per workspace. This is acceptable for the
current use case but becomes a blocker when:

- An organization wants to run multiple projects from one platform instance
- A feature spans multiple projects
- Governance policies differ per project
- Observability needs to compare metrics across projects

### Specific Missing Components

1. **Project registry**: No concept of project as a first-class entity with
   configuration and lifecycle.
2. **Scoped stores**: FileStore paths are project-relative but there is no
   multi-tenant isolation.
3. **Cross-project dependencies**: No mechanism to express "Project B depends
   on Project A's API."
4. **Per-project governance**: Policies are global; no project-specific overrides.

### Impact

This is an EVOLUTION gap — the current design works for single-project use
but structurally prevents scaling to multi-project. It should be addressed
architecturally before it constrains adoption.

### Recommendation

Introduce `Project` as a top-level entity in the SDLC model. Scope stores,
state machines, and governance policies per project. Begin with directory-level
isolation (each project gets its own `BusinessDocs/` subtree).

---

## 7. Governance Model Runtime

### Current State

- GovernanceEngine with role management, permission checks, approval workflows
- 10 default approval policies mapped to lifecycle stage transitions
- Decision tracking via `decisions.md` and the decisions API

### Gap

**Type: INTEGRATION**

The GovernanceEngine is never invoked. The engine's state machine transitions
do not check approval status. Gate validator checks contract compliance but
not governance approvals.

### Specific Disconnections

1. **State transition → approval check**: `state-machine.ts` `transition()`
   does not call `GovernanceEngine.evaluateApproval()`.
2. **User → role binding**: No user authentication, so role bindings have no
   identity to bind to.
3. **Approval UI**: No interface for reviewers to approve/reject artifacts.
4. **Policy configuration**: DEFAULT_POLICIES are hardcoded; no admin interface.

### Architectural Note

This is a deliberate design decision for the current stage — the system runs
as a developer tool where the "user" is the AI agent or the developer. Adding
full governance enforcement makes sense when the platform serves a team.

### Recommendation

Wire GovernanceEngine into the critic gate as an optional check. When running
in `--interactive` mode, governance gates prompt for human approval. In
automated mode, governance checks are logged but non-blocking (advisory).

---

## 8. Lifecycle Analytics

### Current State

- DORA metrics computation (4 metrics, 4 levels)
- Sprint metrics (planned vs completed, velocity, defects)
- KPI definitions (cycle time, throughput, WIP, test coverage)
- Runtime metrics persistence (`runtime-metrics.json` + metrics API)
- Drift detection between session state and GitHub board

### Gap

**Type: IMPLEMENTATION + OPERATIONAL**

Analytics require time-series data, but:

1. No persistent metric store with time-series capability
2. No historical trend computation
3. No threshold alerting (e.g., "velocity dropped below baseline")
4. No dashboard with trend visualization
5. Metrics endpoint returns current values only

### Key Missing Analytics

- **Velocity trend**: Track across sprints for capacity planning accuracy
- **Defect escape rate**: Defects found in production vs pre-release
- **Lead time distribution**: P50/P90/P99 not just average
- **Phase duration analysis**: Time spent in each SDLC phase
- **Agent performance**: Success rate, retry rate, duration per agent
- **Template effectiveness**: Which templates produce highest gate pass rate

### Recommendation

1. Extend `runtime-metrics.json` to an append-only time-series format
   (or use SQLite for local analytics).
2. Add computed trend metrics at sprint boundaries.
3. Expose analytics via a dedicated API and dashboard page.
4. Agent performance metrics should be collected by the dispatcher (already has
   timing data — just needs persistence).

---

## Gap Priority Matrix

| #   | Gap                          | Type           | Impact | Effort | Priority |
| --- | ---------------------------- | -------------- | ------ | ------ | -------- |
| 5   | Tool Execution Layer         | IMPLEMENTATION | High   | High   | P0       |
| 1   | Artifact Lineage Integration | INTEGRATION    | High   | Medium | P0       |
| 7   | Governance Model Runtime     | INTEGRATION    | High   | Medium | P1       |
| 4   | Incident Feedback Loops      | INTEGRATION    | Medium | Medium | P1       |
| 2   | Release Lifecycle            | IMPL + INTEG   | High   | High   | P1       |
| 8   | Lifecycle Analytics          | IMPL + OPER    | Medium | Medium | P2       |
| 3   | Deployment Orchestration     | IMPLEMENTATION | Medium | High   | P2       |
| 6   | Multi-Project Support        | ARCHITECTURAL  | Low    | High   | P3       |

### Key Insight

The dominant gap type is **INTEGRATION** — components exist but are not connected.
This is the best possible situation for a maturing platform: the architectural
decisions are sound, the interfaces are defined, and the work ahead is primarily
wiring, not redesigning.

The exception is Gap #5 (Tool Execution) and Gap #3 (Deployment), which require
new implementation against external systems. These carry higher risk because they
depend on external API stability and require credential management.

Gap #6 (Multi-Project) is the only ARCHITECTURAL gap — it requires structural
changes. Addressable via a `Project` entity and scoped stores, but should be
planned carefully to avoid a premature abstraction.
