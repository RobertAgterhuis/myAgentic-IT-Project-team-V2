# Phase 4 — Target SDLC Platform Architecture

> Proposed 8-layer architecture that preserves existing elements and closes identified gaps.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Design Principles

1. **Preserve what works**: The existing engine, schema system, and SDLC domain
   model are sound. They are the foundation, not candidates for replacement.
2. **Wire before rewrite**: Most gaps are INTEGRATION, not ARCHITECTURAL. Connect
   existing components before creating new ones.
3. **Progressive enhancement**: Each layer should be deployable independently.
   The platform must remain functional at every intermediate step.
4. **No premature abstraction**: Design for the current and next use case, not
   for hypothetical future requirements.
5. **Existing code as specification**: The current stubs, interfaces, and schemas
   define the contracts. Implementations must satisfy them.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Layer 8: UI / API / MCP Interfaces                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ React SPA   │  │ HTTP API     │  │ MCP Server   │  │ CLI      │ │
│  └─────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 7: Observability Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ DORA Metrics │  │ Sprint KPIs  │  │ Agent Perf   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 6: Integration Adapters                      │
│  ┌─────┐ ┌────┐ ┌───────────┐ ┌───────┐ ┌──────┐ ┌────┐ ┌─────┐ │
│  │ Git │ │ CI │ │ Container │ │ Cloud │ │ Sec  │ │Test│ │ LLM │ │
│  └─────┘ └────┘ └───────────┘ └───────┘ └──────┘ └────┘ └─────┘ │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 5: Execution Runtime                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Agent Dispatcher  │  │ Tool Executor    │  │ Retry / DLQ      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 4: Governance Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Role / Permission│  │ Approval Engine  │  │ Policy Enforcer  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 3: Lifecycle Management                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Stage Machine    │  │ Transition Rules │  │ Gate Evaluator   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 2: Artifact Store                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Artifact Registry│  │ Version Control  │  │ Lineage Graph    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                    Layer 1: Workflow Engine                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ State Machine    │  │ Flow Loader      │  │ State Persistence│  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                    Foundation: Store / Audit / Config                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ FileStore        │  │ Audit Trail      │  │ Template Loader  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Layer-by-Layer Specification

### Foundation: Store / Audit / Config

**Existing components (PRESERVE)**:

- `FileStore` with atomic writes and backup-on-write
- `InMemoryStore` for testing
- `AuditTrail` with JSON Lines rotation
- `TemplateLoader` with manifest validation

**Evolution**:

- Add `Store` interface (already implicit — formalize it)
- Add scoped store paths per project when multi-project is introduced
- Add audit query method: `query(filter: AuditFilter): AuditEntry[]`
- Add audit entry signing (HMAC with server key) for tamper-evidence

**Migration path**: All existing code remains. New methods added to existing
classes. No breaking changes.

---

### Layer 1: Workflow Engine

**Existing components (PRESERVE)**:

- `StateMachine` with mode-aware FSM
- `FlowLoader` with custom YAML parser
- `StatePersistence` with crash recovery
- `Engine` orchestration class

**Evolution**:

- **Checkpoint persistence**: Persist state BEFORE transition (write-ahead)
  in addition to current after-transition persist.
- **Workflow versioning**: Store the workflow definition hash in session state.
  On resume, compare hashes. If different, log a `WORKFLOW_VERSION_MISMATCH`
  warning and continue (do not block — the FSM states are stable across versions).
- **Transition hooks**: Add `beforeTransition` and `afterTransition` hook arrays
  to the engine. This enables higher layers (governance, artifact registration)
  to integrate without modifying engine internals.
- **Event bus**: The SSE broadcast system already functions as an event bus.
  Formalize it: `engine.on('transition', handler)`, `engine.on('gate_result', handler)`.

**Migration path**: Add hook mechanism to `engine.ts`. Convert existing SSE
broadcast to use the hook system. Existing behavior unchanged.

---

### Layer 2: Artifact Store

**Existing components (EVOLVE)**:

- `ArtifactRegistry` class (currently standalone)
- `LineageEdge` model
- `sdlc-artifact.schema.json`

**Evolution**:

- **Wire into engine**: Register `ArtifactRegistry` as an engine service.
  Add an `afterTransition` hook that creates artifacts for completed agent
  deliverables.
- **Lineage auto-population**: When an agent's contract specifies input
  artifacts (from predecessor phase), automatically create CONSUMES edges.
  When it specifies output artifacts, create PRODUCES edges.
- **Content tracking**: Store SHA-256 hash of artifact content at registration
  time. Detect modifications to published artifacts.
- **Query API**: Add HTTP endpoints for artifact listing, lineage visualization,
  and coverage queries.

**Data flow**:

```
Agent completes → Dispatcher returns result
  → afterTransition hook fires
    → ArtifactRegistry.register(deliverable)
      → LineageEdge created (PRODUCES)
      → If contract declares inputs, LineageEdge created (CONSUMES)
    → AuditTrail.append(artifact_created)
```

**Migration path**: ArtifactRegistry already exists. Add it to engine options.
Add hook registration in `createEngine()`. No structural changes to the registry
itself.

---

### Layer 3: Lifecycle Management

**Existing components (PRESERVE)**:

- `lifecycle.ts` with stage definitions and gate conditions
- `entities.ts` with 11 entity types and 10 lifecycle stages
- `TraceabilityMatrix` with DAG operations

**Evolution**:

- **Entity runtime**: Create entities when workflow stages begin (e.g., a
  REQUIREMENT entity when Phase 1 produces a requirement deliverable). Currently
  entities are type definitions — they need instantiation.
- **Lifecycle enforcement**: When an entity transitions between stages, validate
  the transition against `lifecycle.ts` rules. Currently this validation exists
  but is never called.
- **Traceability population**: Add `afterTransition` hook that creates trace
  links between entities produced in adjacent phases. Phase 1 REQUIREMENT →
  Phase 2 ARCHITECTURE_DECISION via DERIVES_FROM.
- **Coverage dashboard**: Expose `TraceabilityMatrix.getCoverageReport()` through
  the API and dashboard.

**Migration path**: The domain model is complete. The work is instantiation and
hook wiring. No redesign needed.

---

### Layer 4: Governance Layer

**Existing components (EVOLVE)**:

- `GovernanceEngine` with roles, permissions, approval policies
- Gate validator with contract compliance
- Decision tracking system

**Evolution**:

- **Gate integration**: Add governance check as an optional step in the critic
  gate. When `--governance` flag is set, critic gates require approval before
  advancing.
- **Interactive approvals**: In `--interactive` mode, governance gates pause
  the workflow and prompt for approval via CLI or web UI.
- **Automated approvals**: In automated mode, respect the `auto_approve_when`
  field in approval policies (e.g., auto-approve if all contract checks pass).
- **Approval audit**: Every approval decision (approve/reject/auto-approve)
  is written to the audit trail.
- **Policy-as-code**: Move `DEFAULT_POLICIES` to a JSON file loaded by
  TemplateLoader, making policies configurable per template pack.

**Migration path**: Wire GovernanceEngine into gate-validator.ts as an optional
check. Add governance functions to the CLI and web routes. No structural changes
to GovernanceEngine itself.

---

### Layer 5: Execution Runtime

**Existing components (EVOLVE)**:

- `Dispatcher` with agent execution, context injection, retries
- `ToolAdapter` interface with `AdapterRegistry`
- MCP tool invocation

**Evolution**:

- **Tool Executor**: New service that bridges the dispatcher to adapter
  implementations. When an agent's output includes a tool invocation request,
  the executor routes it to the appropriate adapter.
- **Execution queue**: For long-running operations (build, deploy, test suite),
  queue the operation and poll for completion rather than blocking the dispatcher.
- **Dead letter queue**: Failed operations (after max retries) are written to
  a DLQ file for manual retry or investigation.
- **Execution context**: Each tool execution gets a scoped context with
  credentials, working directory, and timeout. Credentials come from environment
  variables or a config file — never embedded in state.

**Architecture decision**: The Tool Executor should be a thin dispatch layer,
not a workflow engine. Each adapter is responsible for its own execution logic.
The executor handles routing, timeout enforcement, and result normalization.

**Migration path**: The `ToolAdapter` interface and `AdapterRegistry` already
exist. The executor is a new file (~200 lines) that sits between the dispatcher
and the adapter registry. Adapters are then implemented one-by-one against the
existing interface.

---

### Layer 6: Integration Adapters

**Existing components (EVOLVE)**:

- 7 adapter implementations (all stubs)
- `BaseAdapter` with shared logic (health, config, execute dispatch)
- `AdapterRegistry` for lookup

**Evolution**: See Phase 7 (Tool Integration Model) for detailed adapter-by-adapter
implementation plan.

**Key architectural decision**: Adapters should target the tool executables already
present in the developer environment (git, docker, vitest, playwright). Shell
execution with structured output parsing is preferred over API-first approaches
because:

1. It works offline and in CI
2. It requires no API credentials for basic operations
3. It matches the zero-dependency philosophy

For operations requiring API access (GitHub API, Azure API), use `node:https`
with minimal wrappers, consistent with the existing HTTP server approach.

---

### Layer 7: Observability Layer

**Existing components (EVOLVE)**:

- DORA metrics computation
- Sprint KPIs
- Runtime metrics JSON
- Drift detector

**Evolution**:

- **Time-series storage**: Extend `runtime-metrics.json` to an append-only log
  with timestamps. Each metric snapshot is a new entry, not an overwrite.
- **Agent performance metrics**: The dispatcher already tracks execution time
  and retry count. Persist these per-agent metrics.
- **Trend computation**: At sprint boundaries, compute trends (velocity delta,
  defect rate delta, gate pass rate) and persist as a summary.
- **Alerting thresholds**: Define threshold rules. When a metric crosses a
  threshold (e.g., velocity drops >20% from baseline), add a WARNING to the
  sprint gate output.
- **Dashboard data API**: New API endpoints that return time-series data for
  charting.

**Migration path**: The observability module has correct computation logic.
The work is persistent storage and API exposure. No redesign needed.

---

### Layer 8: UI / API / MCP Interfaces

**Existing components (PRESERVE)**:

- React SPA with 6 pages
- HTTP API with 11 route modules
- MCP server with full tool parity
- CLI with 8 commands

**Evolution**:

- **Artifact browser**: New page showing artifact registry with lineage
  visualization (tree or DAG view).
- **Governance dashboard**: Page showing pending approvals, policy status,
  and compliance history.
- **Analytics dashboard**: Page with DORA trends, velocity charts, and agent
  performance.
- **Traceability explorer**: Page showing requirements → architecture →
  implementation → test → deployment trace chains.
- **MCP tool expansion**: Expose new capabilities (artifact queries, governance
  actions) through additional MCP tools.
- **API versioning**: Add `/api/v1/` prefix to all routes. Current routes
  remain as `/api/v1/` aliases.

**Migration path**: Add new pages to existing React SPA. Add new route modules
following the existing pattern. MCP tools added following the existing
`mcp-server.ts` pattern.

---

## Cross-Cutting Concerns

### Configuration Management

- All adapter configurations via environment variables or `.env` file
- Template manifest extended with adapter requirements section
- No credentials in state files or audit logs

### Error Handling Strategy

- Adapters: Return `AdapterResult` with success/failure, never throw
- Engine: Catch all errors, transition to ERROR state, persist error details
- API: Return structured error responses with correlation IDs

### Testing Strategy

- Each new component gets unit tests following existing `tests/unit/` patterns
- Integration tests for cross-layer interactions (engine → artifact → governance)
- Existing test suite must continue passing at every step

### Security Boundaries

- Adapter credentials isolated per adapter instance
- Audit trail immutability enforced (append-only + rotation)
- Rate limiting on all API endpoints (already implemented)
- Content Security Policy on all web responses (already implemented)
- Secret scanning on all incoming request bodies (already implemented)

---

## What Changes vs. What Stays

### Stays (Unchanged)

- State machine FSM and transition logic
- Template manifest structure and schema validation
- Custom YAML parser
- FileStore with atomic writes
- Audit trail format
- Existing API routes
- CLI interface and command structure
- Entity type definitions
- Lifecycle stage definitions
- React SPA structure
- Docker Compose configuration

### Evolves (Extended, Not Replaced)

- Engine gets transition hooks (additive)
- ArtifactRegistry gets engine integration (was standalone)
- GovernanceEngine gets gate integration (was standalone)
- TraceabilityMatrix gets auto-population (was manual)
- Dispatcher gets Tool Executor bridge (additive)
- Adapters get real implementations (replace stubs)
- Observability gets persistent storage (was in-memory)
- Metrics get time-series format (extends current format)

### New Components

- Tool Executor (~200 lines) — bridges dispatcher to adapters
- Audit query API (~100 lines) — filter/search audit entries
- Analytics persistence (~150 lines) — time-series metric store
- Artifact API routes (~100 lines) — CRUD + lineage queries

**Total estimated new code: ~550 lines**  
**Total estimated modified code: ~200 lines across 6 existing files**

This is a notably small footprint for the capability being added. It reflects
the quality of the existing architecture — the abstractions are correct, and the
gaps are primarily wiring.
