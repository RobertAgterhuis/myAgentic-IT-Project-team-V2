---
title: Architecture Overview
parent: Architecture
nav_order: 1
permalink: /architecture/overview/
description: System architecture, layer diagram, data flow, and module inventory.
---

# Architecture Overview

This document describes the layered architecture of the Agentic SDLC Platform,
how data flows through the system, and how the MCP integration works.

> For a chronological view of architectural changes, see
> [Architecture Evolution](evolution).

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
│          Fastify 5 Application (src/webapp/)             │
│  Plugin architecture · 127.0.0.1:3000 · typed context    │
├──────────────────────────────────────────────────────────┤
│  plugins/   │  routes/    │  auth.ts    │  middleware.ts  │
│  context.ts │  models/    │  store.ts   │  schemas.ts     │
│  cache.ts   │  audit.ts   │  redis.ts   │  sse-manager.ts │
├──────────────────────────────────────────────────────────┤
│  Optional Infrastructure                                  │
│  Redis (sessions, SSE pub/sub) · BullMQ (job queue)       │
│  better-sqlite3 (structured data) · pino (logging)        │
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
│  38+ agent skill files · contracts · guardrails · playbooks│
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
Fastify Application (src/webapp/server.ts)
  │  Fastify route matching → handler
  ▼
Route handler (src/webapp/routes/*.ts)
  │  validates input via route-schemas.ts / schemas.ts (Ajv)
  │  checks auth & RBAC permissions (auth.ts)
  │  reads/writes via store.ts (atomic file I/O)
  │  logs mutation via audit.ts (append-only JSONL)
  ▼
File system (BusinessDocs/, session/)
  │  JSON and Markdown files
  ▼
SSE broadcast (sse-manager.ts / sse-manager-redis.ts)
  │  notifies connected UI clients of changes
  ▼
UI reactively updates via React Query
```

### Key Mechanisms

- **Fastify plugin architecture** — Encapsulated plugins for rate limiting,
  security headers, body parsing, CORS, static file serving, and Swagger docs.
- **Typed context** — `context.ts` provides a strongly-typed request context
  shared across all route handlers.
- **Authentication** — GitHub OAuth flow in `auth.ts` with session cookies.
  RBAC enforces per-endpoint permissions.
- **Atomic writes** — `store.ts` writes to a temp file then renames, preventing
  partial writes.
- **File locking** — `file-lock.ts` serializes concurrent writes to the same
  file via promise-chaining.
- **Audit trail** — Every mutation is logged to `BusinessDocs/audit/audit-log.jsonl`
  (append-only JSON Lines).
- **Rate limiting** — Fastify rate-limit plugin enforces per-IP request limits.
- **Security headers** — Fastify security-headers plugin sets CSP,
  X-Frame-Options, etc.
- **Graceful degradation** — Redis, BullMQ, and SQLite are optional. The system
  falls back to in-memory alternatives when external services are unavailable.

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
Shared modules (models/, store.ts, schemas.ts)
  │  Same validation and persistence as HTTP API
  ▼
BusinessDocs/ (file system)
```

The MCP server and HTTP server share the same models, store, and validation
logic, ensuring consistency regardless of whether changes come from the web UI
or an IDE tool call.

---

## Module Inventory

| Layer        | Path                     | Key Files | Purpose                                                                       |
| ------------ | ------------------------ | --------: | ----------------------------------------------------------------------------- |
| Engine       | `platform/engine/`       |       20+ | Domain-agnostic pipeline engine: state machine, dispatcher, gate validator    |
| Schema       | `platform/schema/`       |       10+ | Canonical JSON Schema definitions + registry data                             |
| SDLC         | `platform/sdlc/`         |        7+ | SDLC lifecycle bindings: governance, traceability, observability              |
| Server       | `src/webapp/*.ts`        |       25+ | Fastify app: config, context, auth, plugins, middleware, models, store, cache |
| Plugins      | `src/webapp/plugins/`    |         4 | Fastify plugins: body-parser, rate-limit, security-headers, index             |
| Routes       | `src/webapp/routes/`     |       16+ | API route handlers per domain                                                 |
| Models       | `src/webapp/models/`     |         — | Domain parsing (questionnaires, decisions, session state)                     |
| Services     | `src/webapp/services/`   |         — | Business logic services                                                       |
| Types        | `src/webapp/types/`      |         — | TypeScript type definitions                                                   |
| Auth         | `src/webapp/auth.ts`     |         1 | GitHub OAuth + session cookies + RBAC                                         |
| Redis        | `src/webapp/redis.ts`    |         1 | Redis client with graceful degradation                                        |
| UI           | `src/webapp/ui/src/`     |      150+ | React SPA: pages, components, hooks, stores                                   |
| Agent skills | `templates/sdlc/agents/` |       38+ | Agent skill files (00-orchestrator through 37-scope-change-agent)             |
| Tests        | `tests/`                 |      100+ | Unit, integration, e2e, smoke                                                 |

**Total tests:** Thousands of passing tests across many test files (Vitest).

---

## Technology Decisions

| Concern           | Choice                    | Rationale                                                           |
| ----------------- | ------------------------- | ------------------------------------------------------------------- |
| HTTP server       | Fastify 5                 | Plugin architecture, JSON Schema validation, high performance       |
| Authentication    | GitHub OAuth + RBAC       | Secure session-based auth with role-based permissions               |
| Job queue         | BullMQ (optional)         | Redis-backed job queue with graceful degradation to synchronous     |
| Data storage      | File / SQLite (pluggable) | Local dev: file-based in BusinessDocs/; production: SQLite or Redis |
| Audit trail       | JSON/Markdown in Git      | Immutable history of all changes; human-readable; version tracked   |
| Structured data   | better-sqlite3 (optional) | Embedded SQL for structured persistence when needed                 |
| Session store     | Redis or SQLite           | Redis for multi-instance; SQLite for single-instance local dev      |
| UI framework      | React 18 + Vite           | Fast HMR in dev; optimized production builds                        |
| MCP transport     | stdio (JSON-RPC)          | IDE-native; no network port required                                |
| Schema validation | Ajv + JSON Schema         | Shared validation between server and MCP; compile-time schemas      |
| Testing           | Vitest                    | Fast, ESM-native, compatible with the project's TypeScript setup    |
| Logging           | pino                      | Structured JSON logging, high throughput                            |
| Design tokens     | Custom build script       | Generates CSS custom properties from `design-tokens.json`           |

---

## Design Principles

- **Plugin encapsulation** — Each Fastify plugin encapsulates a concern (rate
  limiting, security headers, body parsing) and is registered independently.
- **Typed context** — Route handlers receive a typed context object rather than
  reaching into global state.
- **Store abstraction** — All filesystem I/O goes through the Store interface.
  `FileStore` for production, `InMemoryStore` for testing.
- **Graceful degradation** — Redis, BullMQ, and SQLite are optional. The system
  detects availability at startup and falls back to in-memory alternatives.
- **Atomic writes** — All file mutations use write-to-temp + rename to prevent
  partial writes. Backups are created before overwriting.
- **Shared file locking** — All write paths are serialized per file via
  `withFileLock()`. Both server and MCP server share the same lock Map.
- **Localhost only** — Server binds to `127.0.0.1:3000`. No external network
  exposure by default.
