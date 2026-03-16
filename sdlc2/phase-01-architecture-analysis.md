# Phase 1 — Architecture Analysis

> Deep structural analysis of the myAgentic-IT-Project-team-V2 repository.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## 1. Major Architecture Layers

The system is organized into five distinct architectural layers, each with clear
boundaries and responsibilities.

### Layer 1 — Platform Engine (`platform/engine/`)

The core orchestration runtime. This layer contains:

| Module                 | Responsibility                                         |
| ---------------------- | ------------------------------------------------------ |
| `engine.ts`            | Top-level entry point; wires FSM, persistence, and SSE |
| `state-machine.ts`     | Finite state machine with mode-specific transitions    |
| `dispatcher.ts`        | Agent invocation, context injection, retry logic       |
| `flow-loader.ts`       | Custom zero-dep YAML parser for `flows.yaml`           |
| `flow-schema.ts`       | AJV-based validation of `flows.json`                   |
| `agent-schema.ts`      | AJV-based validation of `agents.json`                  |
| `tool-schema.ts`       | AJV-based validation of `tools.json` + cross-ref       |
| `gate-validator.ts`    | Contract/guardrail enforcement at critic gates         |
| `sprint-gate.ts`       | Sprint readiness checks (DoR, velocity, blockers)      |
| `state-persistence.ts` | File-based crash-recovery persistence                  |
| `template-loader.ts`   | Template pack discovery, manifest validation, loading  |
| `cli.ts`               | CLI entry point for all command modes                  |

**Design pattern**: The engine uses constructor-based dependency injection
(`createEngine(options)`) with a `store` abstraction for all I/O. This enables
full testability without filesystem coupling.

### Layer 2 — Platform SDLC Domain (`platform/sdlc/`)

A formal domain model for SDLC lifecycle concepts. This is the **domain kernel**:

| Module             | Responsibility                                                                |
| ------------------ | ----------------------------------------------------------------------------- |
| `entities.ts`      | Domain entity types (Product → Project → Feature → … → Incident)              |
| `lifecycle.ts`     | Stage definitions, transition rules, gate conditions                          |
| `artifacts.ts`     | Versioned artifact management with lineage edges                              |
| `governance.ts`    | Roles, permissions, approval policies, GovernanceEngine                       |
| `traceability.ts`  | DAG-based traceability matrix with impact analysis                            |
| `observability.ts` | DORA metrics computation, project KPI tracking                                |
| `adapters/`        | External tool integration (Git, CI, Container, Cloud, Security, Testing, LLM) |

**Design pattern**: Pure domain model with zero external dependencies. All types
are canonical and use factory functions. The `ArtifactRegistry` and
`TraceabilityMatrix` are in-memory structures with store-backed persistence.

### Layer 3 — Canonical Schema Registry (`platform/schema/`)

JSON Schema definitions that serve as the single source of truth:

| Schema                          | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `agent-canonical.schema.json`   | Validates agent definitions with platform bindings |
| `flow-canonical.schema.json`    | Validates FSM states, modes, gates                 |
| `tool-canonical.schema.json`    | Validates tool catalog with capability flags       |
| `sdlc-entity.schema.json`       | Validates domain entities                          |
| `sdlc-artifact.schema.json`     | Validates artifacts with versioning/lineage        |
| `sdlc-governance.schema.json`   | Validates governance structures                    |
| `template-manifest.schema.json` | Validates template pack manifests                  |

Data files (`agents.json`, `flows.json`, `tools.json`) are validated against
these schemas at build time and runtime.

### Layer 4 — Web Application (`src/webapp/`)

A Command Center UI with API server:

| Component           | Responsibility                                                    |
| ------------------- | ----------------------------------------------------------------- |
| `server.ts`         | HTTP server (zero-framework, `node:http`)                         |
| `mcp-server.ts`     | MCP stdio server for IDE integration                              |
| `middleware.ts`     | Security headers, sanitization, structured logging                |
| `store.ts`          | FileStore with atomic writes + backup-on-write                    |
| `cache.ts`          | File-level read cache                                             |
| `audit.ts`          | Append-only JSON Lines audit trail                                |
| `file-lock.ts`      | Advisory file locking for concurrent writes                       |
| `drift-detector.ts` | Session-state vs GitHub board drift detection                     |
| `models.ts`         | Domain parsing (questionnaires, decisions, pipeline)              |
| `schemas.ts`        | Request/response validation                                       |
| `routes/`           | Modular route handlers (dashboard, orchestrator, decisions, etc.) |
| `ui/`               | React + Vite SPA (Storybook-integrated)                           |

**Design pattern**: The server is a pure `http.createServer` with no framework
(Express, Fastify, etc.). Routing is explicit. Security hardening includes CSP,
rate limiting, path traversal prevention, secret detection, and structured
logging with PII exclusion.

### Layer 5 — Template Pack System (`templates/sdlc/`)

Declarative configuration defining the SDLC process itself:

| Directory           | Content                                            |
| ------------------- | -------------------------------------------------- |
| `agents/`           | 38 agent skill files (markdown instructions)       |
| `contracts/`        | 28 output contracts per agent/deliverable type     |
| `guardrails/`       | 10 guardrail files (global + per-domain)           |
| `playbooks/`        | 2 master playbooks (creation + audit)              |
| `workflows/`        | 6 workflow definitions (YAML)                      |
| `output-templates/` | Markdown templates for standardized deliverables   |
| `decisions/`        | Pre-seeded decision category files (20 categories) |
| `manifest.json`     | Pack metadata + phase-agent-contract-guardrail map |

---

## 2. Core Engine Design

The engine follows a **deterministic FSM + event-driven** architecture:

```
                 ┌─────────────┐
                 │  flows.yaml │  (declarative state definitions)
                 └──────┬──────┘
                        │ loadFlows()
                        ▼
┌──────────┐    ┌───────────────┐    ┌───────────────────┐
│ CLI / API │───▶│  Engine.ts    │───▶│  StateMachine     │
│           │    │  (top-level)  │    │  (FSM transitions)│
└──────────┘    └───────┬───────┘    └─────────┬─────────┘
                        │                      │
                ┌───────▼───────┐      ┌───────▼────────┐
                │ Dispatcher    │      │ GateValidator   │
                │ (agent invoke)│      │ (contract check)│
                └───────┬───────┘      └───────┬────────┘
                        │                      │
                ┌───────▼───────┐      ┌───────▼────────┐
                │ StatePersist  │      │ SprintGate     │
                │ (crash recov) │      │ (DoR/velocity) │
                └───────────────┘      └────────────────┘
                        │
                ┌───────▼───────┐
                │ SSE Broadcast │
                │ (UI push)     │
                └───────────────┘
```

**Key engine characteristics:**

1. **Mode-aware FSM**: The transition map is dynamically built from the set of
   phases selected by the command mode (`CREATE`, `AUDIT`, `FEATURE`,
   `SCOPE_CHANGE`, `HOTFIX`, and partial modes like `CREATE_TECH`).

2. **Structural states**: `IDLE`, `ONBOARDING`, `SYNTHESIS`, `SPRINT_GATE`,
   `PHASE_5_EXECUTING`, `COMPLETED` are always present regardless of which
   phases are selected.

3. **Critic gates**: After each phase (`PHASE_N`), a mandatory `CRITIC_N` state
   validates deliverables against contracts and guardrails before advancement.

4. **Auto-persist**: Every state transition is atomically written to
   `session-state.json`, enabling crash recovery. The `StatePersistence` module
   uses merge semantics to preserve non-engine fields.

5. **SSE bridge**: State changes are broadcast in real-time to connected UI
   clients via `sseNotify`.

---

## 3. Template Pack Architecture

The template system is **pluggable and self-describing**:

```
templates/
  └─ sdlc/
       ├─ manifest.json          ← Pack metadata + wiring
       ├─ agents/                ← 38 agent skill files
       ├─ contracts/             ← 28 output contracts
       ├─ guardrails/            ← 10 guardrail sets
       ├─ playbooks/             ← Master process definitions
       ├─ workflows/             ← 6 reusable workflow YAML files
       ├─ output-templates/      ← Standardized deliverable templates
       └─ decisions/             ← Decision category seeds
```

The `manifest.json` contains:

- Schema version (semver) for forward compatibility
- Phase → Agent mapping (which agents run in which phase)
- Phase → Contract mapping (which contracts validate which phase)
- Phase → Guardrail mapping
- Critic → Phase reverse mapping
- Command mode definitions
- Decision category seeds with default statuses

The `template-loader.ts` in the engine:

1. Discovers template packs by scanning `templates/` for `manifest.json`
2. Validates the manifest against `template-manifest.schema.json`
3. Returns a structured configuration that the engine, dispatcher, and gate
   validator use to self-configure

**This is a significant architectural decision** — it means the process itself is
data-driven, not code-driven. A new SDLC template could theoretically be created
by writing a `manifest.json` + supporting files without modifying engine code.

---

## 4. Canonical Schema Model

The schema model operates at two levels:

### Level 1 — Process Schemas (agent/flow/tool)

These define the operational configuration of the multi-agent system:

- **Agents**: ID, name, role, phase assignment, skill files, tool bindings,
  guardrails, contracts, dependencies, and platform bindings (Copilot/Claude/OpenAI)
- **Flows**: FSM states, full flow sequence, structural states, command modes,
  gates with conditions
- **Tools**: Abstract tool definitions with typed parameters, capability flags,
  side effects, and platform-specific native bindings

### Level 2 — Domain Schemas (entity/artifact/governance)

These define the SDLC domain model:

- **Entities**: 11 entity types from Product to Improvement, with lifecycle
  stages, statuses, priorities, and trace links
- **Artifacts**: 8 artifact types with version history, checksums, lineage edges
  (PRODUCES/CONSUMES/TRANSFORMS/VALIDATES/SUPERSEDES)
- **Governance**: Role bindings, approval requests, and approval policies with
  gate-level granularity

The two schema levels are **intentionally separate**: process schemas drive the
engine, domain schemas model the work products. This separation is architecturally
sound — it means the engine doesn't need to know about specific domain entities.

---

## 5. Transpiler / Generator System

The transpiler (`scripts/generate-platform.js`) reads canonical schemas and
generates platform-specific instruction files:

| Target  | Output                                                |
| ------- | ----------------------------------------------------- |
| Copilot | `copilot-instructions.md` + per-agent skill summaries |
| Claude  | `CLAUDE.md` + `.claude/` directory structure          |
| OpenAI  | `codex.md` + `.codex/` directory structure            |

The transpiler:

1. Loads `agents.json`, `flows.json`, `tools.json` from canonical schemas
2. Resolves platform bindings per agent and tool
3. Generates formatted markdown/config for each target platform
4. Produces per-agent skill files with instructions, dependencies, and tools

This is a **code generation pipeline** that enables multi-platform support from
a single canonical source. The approach is similar to how Protobuf generates
language-specific stubs from `.proto` files.

---

## 6. UI Layer

### Backend API (`src/webapp/routes/`)

| Route Module           | Endpoints                                      |
| ---------------------- | ---------------------------------------------- |
| `dashboard.ts`         | Health, metrics, activity, stats               |
| `orchestrator.ts`      | Engine status, advance, reset, templates, seed |
| `decisions.ts`         | Decision CRUD, category management             |
| `questionnaires.ts`    | Questionnaire reading, answer submission       |
| `milestones.ts`        | Milestone tracking                             |
| `commands.ts`          | Command queue operations                       |
| `progress.ts`          | Pipeline progress tracking                     |
| `drift.ts`             | Drift detection results                        |
| `metrics-dashboard.ts` | Runtime metrics                                |
| `subscribe.ts`         | SSE subscription                               |
| `misc.ts`              | Help, analytics, locales                       |

### Frontend SPA (`src/webapp/ui/`)

- **React + Vite** SPA with TypeScript
- Pages: Dashboard, Command Center, Pipeline, Decisions, Questionnaires, Metrics
- Uses Storybook for component development
- Design token system (`tokens.css`)
- Accessibility-tested (Playwright E2E with axe)

### MCP Server (`src/webapp/mcp-server.ts`)

Exposes the full Command Center API as MCP tools over stdio:

- Session state operations
- Questionnaire management
- Decision management
- Command queue
- Pipeline progress
- Metrics and health

---

## 7. Integration Surfaces

### MCP Integration

- Stdio transport for IDE embedding
- Full tool parity with HTTP API
- Resource endpoints for session state and configuration

### HTTP API

- REST-style JSON API on port 3000
- SSE for real-time state updates
- Rate limiting, CORS, CSP headers
- Request validation via `schemas.ts`

### CLI

- `platform/engine/cli.ts` — Direct engine invocation
- Supports all command modes: CREATE, AUDIT, FEATURE, SCOPE_CHANGE, HOTFIX
- Platform selection (Copilot, Claude, Codex)
- Resume from persisted state

### GitHub Integration

- GitHub state snapshot (`scripts/github-state-snapshot.js`)
- GitHub config audit (`scripts/github-config-audit.js`)
- Drift detection between session state and GitHub board
- Issue creation/sync via GitHub Integration Agent

### Docker / Infrastructure

- `Dockerfile` for webapp production image
- `Dockerfile.storybook` for design system
- `docker-compose.yml` with multiple profiles (dev, analytics, webapp, weblate)
- Matomo analytics integration
- Weblate translation management integration

---

## 8. Design Philosophy

The system embodies several deliberate architectural principles:

### 8.1 — Zero External Dependencies (where possible)

The engine and SDLC domain modules are written with zero or minimal external
dependencies. The YAML parser is hand-written. The HTTP server uses `node:http`.
This is a **reliability choice** — fewer dependencies mean fewer supply chain
risks and smaller attack surface.

### 8.2 — Schema-First Design

Everything is defined by JSON Schema first, then validated at runtime. Agents,
flows, tools, entities, artifacts, governance structures — all have formal
schemas. This enables machine-readable contracts and cross-platform code generation.

### 8.3 — Store Abstraction (Dependency Injection)

All file I/O goes through a `Store` interface with `FileStore` (production) and
`InMemoryStore` (testing) implementations. This enables hermetic testing and
makes the system portable to different storage backends.

### 8.4 — Declarative Process Definition

The SDLC process itself is defined declaratively in `manifest.json`,
`flows.yaml`, and workflow YAML files. The engine interprets these definitions
rather than hardcoding process steps. This is the foundation for template
pack extensibility.

### 8.5 — Defense in Depth (Security)

Multiple security layers: path traversal prevention, secret detection, input
sanitization, CSP headers, rate limiting, structured logging with PII exclusion,
atomic file writes, and backup-on-write. Security is treated as a first-class
architectural concern, not an afterthought.

### 8.6 — Auditability

Append-only JSON Lines audit trail, backup-on-write for all mutations,
structured logging, and session state history provide full auditability of
every system action.

---

## 9. Architectural Strengths

1. **Clean separation of concerns**: Engine ↔ Domain Model ↔ Schema ↔ Template ↔ UI
   are genuinely independent layers with well-defined interfaces.

2. **The canonical schema model is production-grade**: 7 JSON Schemas with
   cross-reference validation, semantic checks, and AJV 2020-12 compliance.

3. **The template pack concept is architecturally novel**: Making the SDLC
   process itself a pluggable data package is rare in engineering platforms.

4. **The transpiler enables true multi-platform support**: Generating
   platform-specific instructions from a single source is a sound approach
   to the multi-LLM challenge.

5. **The FSM engine is well-designed**: Mode-aware transition maps, critic gates,
   auto-persistence, and SSE broadcasting form a coherent orchestration core.

6. **Testing is comprehensive**: 58 unit tests, 10 integration tests, 6 E2E
   specs, schema validation tests, transpiler tests — covering all major
   subsystems.

7. **Security posture is above average**: The defensive measures (CSP, rate
   limiting, path traversal prevention, secret scanning, atomic writes) reflect
   production awareness unusual in platform prototypes.

8. **The tool adapter framework is correctly abstracted**: Generic interface +
   category-based registry + health checks provides a clean extensibility model.

9. **The domain model is formally complete**: 11 entity types, 10 lifecycle
   stages, 8 artifact types, 8 roles, 7 permissions — this covers the full
   SDLC lifecycle.

10. **The governance model is structurally sound**: Role-based permissions with
    gate-level approval policies and audit trails provides a real governance
    framework.
