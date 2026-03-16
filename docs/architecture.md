---
title: Architecture Overview
nav_order: 3
description: System architecture, layer diagram, data flow, and module inventory.
---

# Architecture Overview

This document describes the layered architecture of the Agentic SDLC Platform,
how data flows through the system, and how the MCP integration works.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   IDE / Copilot Chat                    │
│              (VS Code, Visual Studio, JetBrains)        │
└────────────┬────────────────────────────┬───────────────┘
             │ MCP (stdio)                │ Browser
             ▼                            ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  src/webapp/mcp-server │  │  src/webapp/ui  (React SPA)  │
│  (Model Context Proto) │  │  Vite · TailwindCSS · Radix  │
└────────────┬───────────┘  └──────────────┬───────────────┘
             │                             │ HTTP/SSE
             ▼                             ▼
┌──────────────────────────────────────────────────────────┐
│              src/webapp/server.ts  (HTTP API)            │
│     Native http module · 127.0.0.1:3000 · 16 routes     │
├──────────────────────────────────────────────────────────┤
│  routes/   │  models.ts  │  store.ts  │  middleware.ts   │
│  schemas.ts│  cache.ts   │  audit.ts  │  sse-manager.ts  │
└─────────────────────┬────────────────────────────────────┘
                      │ file I/O (JSON/Markdown)
                      ▼
┌──────────────────────────────────────────────────────────┐
│                   platform/sdlc                          │
│  SDLC lifecycle, governance, traceability, observability │
├──────────────────────────────────────────────────────────┤
│                   platform/engine                        │
│  State machine · dispatcher · gate validator · flow      │
│  loader · tool executor · sprint gate · persistence      │
├──────────────────────────────────────────────────────────┤
│                   platform/schema                        │
│  Canonical JSON schemas (agents, flows, tools, entities) │
│  + registry data (agents.json, flows.json, tools.json)   │
└──────────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              templates/sdlc                               │
│  39 agent skill files · contracts · guardrails · playbooks│
└──────────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────┐
│              BusinessDocs/  (file-based persistence)     │
│  session-state.json · decisions.md · questionnaires      │
│  audit log (JSONL) · phase outputs · sprint artifacts    │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow: User Action → Persistence

```
User clicks in Command Center UI
  │
  ▼
React SPA (src/webapp/ui)
  │  fetch('/api/…')
  ▼
HTTP API (src/webapp/server.ts)
  │  resolveRoute() → route handler
  ▼
Route handler (src/webapp/routes/*.ts)
  │  validates input via schemas.ts (Ajv)
  │  reads/writes via store.ts (atomic file I/O)
  │  logs mutation via audit.ts (append-only JSONL)
  ▼
File system (BusinessDocs/, session/)
  │  JSON and Markdown files
  ▼
SSE broadcast (sse-manager.ts)
  │  notifies connected UI clients of changes
  ▼
UI reactively updates via React Query
```

### Key mechanisms

- **Atomic writes** — `store.ts` writes to a temp file then renames, preventing
  partial writes.
- **File locking** — `file-lock.ts` serialises concurrent writes to the same
  file.
- **Audit trail** — Every mutation is logged to `BusinessDocs/audit/audit-log.jsonl`
  (append-only JSON Lines).
- **Rate limiting** — `rate-limiter.ts` enforces per-IP request limits.
- **Security headers** — `middleware.ts` sets CSP, X-Frame-Options, etc.

---

## MCP Flow: IDE → File Store

```
IDE (Copilot Chat / any MCP client)
  │  stdio JSON-RPC
  ▼
src/webapp/mcp-server.ts
  │  McpServer from @modelcontextprotocol/sdk
  │  17 tools + 3 resources registered
  ▼
Shared modules (models.ts, store.ts, schemas.ts)
  │  Same validation and persistence as HTTP API
  ▼
BusinessDocs/ (file system)
```

The MCP server and HTTP server share the same models, store, and validation
logic, ensuring consistency regardless of whether changes come from the web UI
or an IDE tool call.

---

## Module Inventory

| Layer        | Path                         | Files | Purpose                                                                                                                          |       Test files |
| ------------ | ---------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------- | ---------------: |
| Engine       | `platform/engine/`           |    20 | Domain-agnostic pipeline engine: state machine, dispatcher, gate validator, flow loader, tool executor, sprint gate, persistence |        81 (unit) |
| Schema       | `platform/schema/`           |    11 | Canonical JSON Schema definitions + registry data (agents, flows, tools)                                                         |                — |
| SDLC         | `platform/sdlc/`             |     7 | SDLC lifecycle bindings: governance, traceability, observability, artifacts                                                      |                — |
| Server       | `src/webapp/*.ts`            |    20 | HTTP API server: config, router, middleware, models, store, cache, audit, SSE, metrics                                           | 15 (integration) |
| Routes       | `src/webapp/routes/`         |    16 | API route handlers: questionnaires, decisions, commands, progress, analytics, etc.                                               |                — |
| UI           | `src/webapp/ui/src/`         |   151 | React SPA: pages, components, hooks, stores (Vite + TailwindCSS + Radix UI)                                                      |     59 (UI unit) |
| Agent skills | `templates/sdlc/agents/`     |    39 | Agent skill files (00-orchestrator through 37-scope-change-agent + index)                                                        |                — |
| Contracts    | `templates/sdlc/contracts/`  |     — | Output contracts per deliverable type                                                                                            |                — |
| Guardrails   | `templates/sdlc/guardrails/` |     — | Domain guardrails (global, business, tech, UX, marketing, questionnaire)                                                         |                — |
| Tests        | `tests/`                     |    98 | Unit (81), integration (15), smoke (2)                                                                                           |                — |

**Total tests:** 2,420 passing across 96 test files (Vitest 4).

---

## Technology Decisions

| Concern           | Choice                   | Rationale                                                        |
| ----------------- | ------------------------ | ---------------------------------------------------------------- |
| HTTP server       | Native `http` module     | No web framework required; full control over headers and routing |
| Data storage      | File-based JSON/Markdown | No database required; human-readable; Git-trackable              |
| UI framework      | React 18 + Vite          | Fast HMR in dev; optimised production builds                     |
| MCP transport     | stdio (JSON-RPC)         | IDE-native; no network port required                             |
| Schema validation | Ajv + JSON Schema        | Shared validation between server and MCP; compile-time schemas   |
| Testing           | Vitest 4                 | Fast, ESM-native, compatible with the project's TypeScript setup |
| Design tokens     | Custom build script      | Generates CSS custom properties from `design-tokens.json`        |
