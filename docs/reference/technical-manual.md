---
layout: default
title: Technical Manual
parent: Reference
nav_order: 1
permalink: /technical-manual/
description:
  Developer reference for the MCP server, HTTP endpoints, file-based storage,
  and test infrastructure.
---

# Technical Manual — myAgentic-IT-Project-team

> Version 3.0 | Last updated: 2026-03-18 (M34 Documentation Remediation)

This manual covers the server architecture, API reference, data model,
configuration, deployment, and development practices for the Questionnaire &
Decisions Manager web application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Reference](#module-reference)
3. [API Reference](#api-reference)
4. [Data Model](#data-model)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Security Model](#security-model)
8. [Testing](#testing)
9. [Development Setup](#development-setup)
10. [Monitoring & Observability](#monitoring--observability)
11. [Analytics Events Reference](#analytics-events-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React SPA)                 │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────┐ │
│  │ Cmd Ctr  │ │Questionnaires│ │   Decisions       │ │
│  └──────────┘ └──────────────┘ └──────────────────┘ │
│         ↕ HTTP/JSON            ↕ SSE                 │
└─────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────┐
│            Fastify 5 Application (server.ts)          │
│  Plugin architecture · typed context · 127.0.0.1:3000│
│                                                      │
│  ┌────────────────┐  ┌──────────────────────────┐    │
│  │ plugins/       │  │ routes/                   │   │
│  │  body-parser   │  │  questionnaires.ts        │   │
│  │  rate-limit    │  │  decisions.ts             │   │
│  │  security-hdrs │  │  commands.ts              │   │
│  │  index.ts      │  │  progress.ts              │   │
│  └────────────────┘  │  misc.ts (SSE, metrics,   │   │
│                       │   export, help, health,   │   │
│  ┌────────────────┐  │   analytics, audit, static)│  │
│  │ auth.ts        │  └──────────────────────────┘   │
│  │ GitHub OAuth   │                                  │
│  │ RBAC           │  ┌──────────────────────────┐   │
│  │ session cookies│  │ context.ts               │   │
│  └────────────────┘  │ typed request context     │   │
│                       └──────────────────────────┘   │
│  ┌────────────────┐                                  │
│  │ middleware.ts  │  ┌──────────────────────────┐   │
│  │ (pure funcs)   │  │ redis.ts (optional)      │   │
│  │ sanitization   │  │ session-store-redis.ts   │   │
│  │ logging        │  │ sse-manager-redis.ts     │   │
│  │ error handling │  │ bullmq queue (optional)  │   │
│  └────────────────┘  └──────────────────────────┘   │
│      │                                               │
│  ┌───┴───┐ ┌────────┐ ┌────────┐ ┌───────────────┐  │
│  │models │ │ cache  │ │schemas │ │  audit         │  │
│  └───┬───┘ └───┬────┘ └────────┘ └───────────────┘  │
│      │         │                                     │
│  ┌───┴─────────┴───┐  ┌─────────────────┐           │
│  │   store.ts      │  │  file-lock.ts   │           │
│  │ FileStore /     │  │  withFileLock() │           │
│  │ InMemoryStore   │  │  (shared lock)  │           │
│  └─────────────────┘  └─────────────────┘           │
│         ↕                                            │
│  ┌─────────────────┐                                 │
│  │ Filesystem       │ (docs/, BusinessDocs/) │
│  └─────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

### Design Principles

- **Fastify 5 plugin architecture** — Encapsulated plugins for rate limiting,
  security headers, body parsing, CORS, static file serving, and Swagger docs.
- **Typed context** — `context.ts` provides a strongly-typed request context
  shared across route handlers.
- **MCP integration** — MCP server uses `@modelcontextprotocol/sdk` for
  cross-IDE support via stdio transport.
- **Store abstraction** — All filesystem I/O goes through the Store interface.
  `FileStore` for local development, `SqliteStore` for production
  (`STORAGE_PROVIDER=sqlite`), `InMemoryStore` for testing. The active backend
  is selected by the `StorageProvider` abstraction in `platform/engine/persistence`.
- **GitHub OAuth + RBAC** — `auth.ts` handles GitHub OAuth authentication;
  role-based access control enforces per-endpoint permissions.
- **Optional Redis** — Redis is used for session storage (`session-store-redis.ts`),
  SSE pub/sub (`sse-manager-redis.ts`), and BullMQ job queues when available.
  The system gracefully degrades to in-memory alternatives.
- **Atomic writes** — `store.writeFile()` writes to a temp file, then rename.
  A backup is created before overwriting existing files.
- **Unified store writes** — `mcp-server.ts` delegates all writes through
  `store.writeFile()` instead of its own implementation, ensuring identical
  backup, atomic-rename, and directory-creation behavior across both entry points.
- **Shared file locking** — All JSON write paths are serialized per file via
  `withFileLock()` from `file-lock.ts`. Uses promise-chaining (no OS-level
  locks) to prevent concurrent write corruption.
- **Configurable network binding** — Binds to `127.0.0.1:3000` by default (local
  development). Production deployments may bind to non-local addresses; doing so
  requires explicit `TRUST_PROXY` and at least one configured auth mechanism
  (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` or `API_KEY`). All non-local
  `/api/*` requests require valid credentials. The runtime profile contract is
  validated at startup before bind.
- **React SPA** — Vite + React + TypeScript front-end in `src/webapp/ui/`.
  Built with TanStack Query, Zustand, and Tailwind CSS.
- **Structured logging** — pino JSON logger for structured request/error logging.

---

## Runtime Profiles

The system supports four explicit runtime profiles, determined by environment variables and network binding:

### Local Development

- **Detection:** `NODE_ENV !== 'production'` AND localhost binding (`127.0.0.1`, `localhost`, `::1`)
- **Storage:** `STORAGE_PROVIDER=file` (default)
- **Queue:** `QUEUE_PROVIDER=memory` (default)
- **Sessions:** `SESSION_STORE=sqlite` (default)
- **Redis:** Not required; omit `REDIS_URL`
- **Startup behavior:** Tolerates missing services; logs warnings but continues with fallback modes
- **Best for:** Single-operator development, zero-config testing, debug workflows
- **Example:** `npm start` (no env vars needed)

### CI/Test

- **Detection:** `NODE_ENV=test`
- **Storage:** File-based (`.agentic/storage/`)
- **Queue:** In-memory job queue
- **Sessions:** SQLite or in-memory
- **Redis:** Disabled
- **Startup behavior:** No external service requirements; all operations in-process
- **Rate limiting:** Disabled (only in test environments)
- **Best for:** Automated test suites, CI pipelines
- **Example:** `NODE_ENV=test npm test`

### Production (Single Node)

- **Detection:** `NODE_ENV=production` OR non-localhost binding (e.g., `HOST=0.0.0.0`)
- **Storage:** `STORAGE_PROVIDER=sqlite` (required)
- **Queue:** `QUEUE_PROVIDER=persistent` (default for production)
- **Sessions:** `SESSION_STORE=sqlite` (or `redis` if `REDIS_URL` set)
- **Redis:** Optional; enables `QUEUE_PROVIDER=bullmq` and Redis-backed sessions/pub-sub
- **Startup behavior:** **Fails (exit 1) if `STORAGE_PROVIDER` initialization fails** — no fallback allowed
- **Auth requirement:** `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` OR `API_KEY` (minimum 24 characters)
- **Network:** Non-localhost binding requires `TRUST_PROXY` and auth; all non-local `/api/*` requests require valid credentials
- **Best for:** Single-instance production deployments with durable state
- **Example:** `NODE_ENV=production STORAGE_PROVIDER=sqlite STORAGE_PATH=/data/agentic.db npm start`

### Production (Distributed)

- **Detection:** Multi-instance setup with shared `REDIS_URL`
- **Storage:** `STORAGE_PROVIDER=sqlite` (shared database, managed separately)
- **Queue:** `QUEUE_PROVIDER=bullmq` (Redis-backed, enables horizontal parallelism)
- **Sessions:** `SESSION_STORE=redis` (shared session store)
- **Redis:** Required; `REDIS_URL` must point to accessible instance
- **Startup behavior:** **Fails if any required service is unreachable** — strict fail-closed semantics
- **Auth:** Requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` OR `API_KEY`
- **Network:** Load balancer in front; instances register via Redis pub/sub; `TRUST_PROXY` must be configured
- **Best for:** High-availability, multi-instance deployments, shared state across clusters
- **Example:**

```bash
NODE_ENV=production \
  STORAGE_PROVIDER=sqlite \
  STORAGE_PATH=/shared-nfs/agentic.db \
  QUEUE_PROVIDER=bullmq \
  SESSION_STORE=redis \
  REDIS_URL=redis://redis-primary:6379 \
  TRUST_PROXY=1 \
  npm start
```

---

## Module Reference

### file-lock.ts

Shared concurrency primitive for all JSON file writes. Prevents concurrent write
corruption across both server.ts and mcp-server.ts.

**Exports:**

- `withFileLock(filePath, fn)` — Acquires a per-file promise-chain lock,
  executes `fn()`, and releases. Locks are keyed by `path.resolve(filePath)`.
  Errors in `fn` are propagated after lock release.
- `_writeLocks` — `Map<string, Promise>` of active lock chains (exported for
  testing only).

**Design:**

- Uses promise-chaining (not OS-level file locks) — each new write `.then()`s
  onto the previous promise for the same resolved path.
- Lock Map entries are cleaned up after the chain completes (both success and
  error).
- Singleton: both `server.ts` and `mcp-server.ts` import the same instance via
  Node.js require cache.
- Zero external dependencies — only `node:path`.

**Added in:** SP-1 (TECH-01 — P2-R01: file corruption prevention).

### server.ts — Fastify Application Factory

The main Fastify application factory. Registers plugins, builds the typed
context, wires route modules, and creates the Fastify server instance.

**Key exports:**

- `buildApp()` — Creates and configures the Fastify application
- `server` — The Fastify server instance

### app.ts — Application Bootstrap

Application entry point that bootstraps the Fastify server with all plugins
and routes registered.

### context.ts — Typed Request Context

Provides a strongly-typed request context object shared across all route
handlers. Encapsulates store, cache, audit, SSE manager, metrics, and
configuration.

### auth.ts — Authentication & Authorization

GitHub OAuth authentication flow with session cookie management and role-based
access control (RBAC).

**Key features:**

- GitHub OAuth callback handling
- Session cookie creation and validation
- Role-based permission checks per endpoint
- Session store abstraction (Redis or in-memory)

### plugins/ — Fastify Plugin Modules

| Plugin                | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `body-parser.ts`      | JSON body parsing with size limits           |
| `rate-limit.ts`       | Per-IP rate limiting via @fastify/rate-limit |
| `security-headers.ts` | CSP, X-Frame-Options, HSTS security headers  |
| `index.ts`            | Plugin registration orchestrator             |

### redis.ts — Redis Client

Optional Redis client with graceful degradation. When Redis is not configured
(no `REDIS_URL` env var), the system falls back to in-memory alternatives.

### session-store-redis.ts — Redis Session Store

Redis-backed session storage for multi-instance deployments.

### sse-manager-redis.ts — Redis SSE Pub/Sub

Redis pub/sub-backed SSE manager for broadcasting events across multiple
server instances.

### middleware.ts (~262 lines)

Pure middleware functions with no shared state dependencies. Extracted from
server.ts in SP-4.

**Key exports:**

- `structuredLog(level, message, fields)` — JSON log entry to stdout/stderr
- `log(method, url, status, ms)` — HTTP request log shorthand
- `setSecurityHeaders(res)` — CSP, X-Frame-Options, etc.
- `safePath(base, relative)` — Blocks path traversal
- `json(res, status, data)` — Send JSON response with security headers
- `readBody(req)` — Read request body (1MB limit)
- `parseBody(req)` — Parse JSON body with Content-Type validation
- `sanitizeMarkdown(text)` — Escape Markdown injection
- `sanitizeQID(text)` — Neutralize Q-ID patterns
- `detectSecrets(text)` — Scan for secret patterns
- `checkSecretsInBody(body, fields)` — Multi-field secret scan
- `handleMethodNotAllowed(res, pathname, routes)` — 405 response
- `handleRouteError(err, res)` — Error response handler

### routes/ — Route Handler Modules

Factory function modules receiving a shared `ctx` object. Each returns a route
map (`{ 'METHOD /path': handler }`).

| Module                     | LOC | Routes                                                                                                                                                                                                                 |
| -------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/questionnaires.ts` | 150 | `GET /api/questionnaires`, `POST /api/save`                                                                                                                                                                            |
| `routes/decisions.ts`      | 200 | `GET /api/decisions`, `POST /api/decisions`, `POST /api/decisions/activate-category`                                                                                                                                   |
| `routes/commands.ts`       | 130 | `POST /api/command`, `GET /api/command`                                                                                                                                                                                |
| `routes/progress.ts`       | 160 | `GET /api/progress`                                                                                                                                                                                                    |
| `routes/misc.ts`           | 297 | `GET /api/session`, `POST /api/reevaluate`, `GET /api/export`, `GET /api/help`, `GET /api/events`, `GET /api/metrics`, `GET /api/health`, `POST /api/analytics`, `GET /api/analytics`, `GET /api/audit`, `GET /health` |
| `routes/subscribe.ts`      | 55  | `POST /api/subscribe`                                                                                                                                                                                                  |

### mcp-server.ts

MCP (Model Context Protocol) server for cross-IDE integration. Exposes the
Command Center functionality as MCP tools and resources via stdio transport.

**Dependency:** `@modelcontextprotocol/sdk` for MCP protocol support.

**Concurrency:** All 6 write paths use `withFileLock()` from `file-lock.ts` to
serialize file mutations, sharing the same lock Map as `server.ts`.

**Transport:** stdio — launched automatically by the IDE via `.vscode/mcp.json`
or equivalent IDE configuration.

**Tools (13):**

| Tool                  | Parameters                                                | Description                                                    |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `get_project_status`  | —                                                         | Session state, pipeline progress, command queue summary        |
| `get_progress`        | —                                                         | Phase completion status, current agent, sprint info            |
| `list_questionnaires` | —                                                         | All questionnaires with completion stats (total/answered/open) |
| `get_questionnaire`   | `file`                                                    | Full parsed questionnaire with questions, answers, statuses    |
| `save_answers`        | `file`, `updates[]`                                       | Save answers (with secret detection and sanitization)          |
| `list_decisions`      | —                                                         | Decisions grouped by status (open/decided/deferred)            |
| `create_decision`     | `type`, `priority`, `scope`, `text`, `notes?`             | Create open question or operational decision                   |
| `answer_decision`     | `id`, `answer`                                            | Answer an open question                                        |
| `decide_question`     | `id`                                                      | Finalize an answered question → decided                        |
| `queue_command`       | `command`, `project?`, `scope?`, `description?`, `brief?` | Queue orchestrator command                                     |
| `get_command_queue`   | —                                                         | Full command queue history                                     |
| `get_help`            | `topic?`                                                  | Help topic content, or table of contents if omitted            |
| `get_audit_log`       | `limit?`                                                  | Recent audit trail entries (default 50, max 1000)              |

**Resources (3):**

| URI                       | MIME Type          | Description           |
| ------------------------- | ------------------ | --------------------- |
| `agentic://session-state` | `application/json` | Current session state |
| `agentic://decisions`     | `application/json` | All decisions         |
| `agentic://command-queue` | `application/json` | Command queue         |

**Key implementation details:**

- Reuses `models.ts`, `store.ts`, `cache.ts`, `audit.ts`, and `server.ts`
  sanitization functions from the web UI
- All file writes delegate to `store.writeFile()` (unified in SP-2, TECH-04),
  ensuring identical backup + atomic-rename behavior as server.ts
- Input sanitization (markdown injection, Q-ID neutralization, secret detection)
  is applied to all tool inputs
- Path traversal is blocked via `safePath()` on all file parameters
- Startup gated behind `if (require.main === module)` for test-safe importing

### store.ts

Storage abstraction layer.

**Classes:**

- `FileStore` — Production store using `fs` for file I/O.
  - `readFile(path)` → string
  - `writeFile(path, content)` — Atomic write with backup
  - `exists(path)` → boolean
  - `listDir(path)` → string[]
  - `mtime(path)` → number (modification timestamp)
- `InMemoryStore` — Test store with in-memory filesystem.
  - Same interface as FileStore
  - Constructor accepts `{ [path]: content }` initial data
  - `_backups` Map tracks overwritten versions

**Functions:**

- `setStore(store)` — Replace the global store instance
- `getStore()` — Get the current global store instance

### models.ts

Domain parsing and mutation functions.

**Key functions:**

- `parseQuestionnaire(content, relPath, basePath)` — Parses questionnaire
  Markdown into structured data
- `updateAnswerInContent(content, questionId, answer, status)` — Replaces a
  question's answer in Markdown
- `parseDecisions(content)` → `{ open, decided, deferred }` — Parses
  decisions.md into arrays
- `nextDecisionId(content, prefix)` → string — Computes next sequential ID
- `addOpenQuestion(content, entry)` → string — Inserts a new open question row
- `addOperationalDecision(content, entry)` → string — Inserts a new decided item
- `moveToDecided(content, id, answer)` → string — Moves an open question to
  decided
- `moveToDeferred(content, id, reason)` → string — Moves an item to deferred
- `parseSessionState(content)` → object — Parses session-state.json
- `parseIndex(content)` → object — Parses questionnaire-index.md

### cache.ts

File cache with mtime-based invalidation.

**Class: `FileCache`**

- `read(filePath)` → string — Returns cached content; re-reads if mtime changed
- `readJSON(filePath, validator?)` → `{ data, errors }` — Parses JSON with
  optional schema validation
- `invalidate(filePath)` — Removes a specific cache entry
- `invalidateAll()` — Clears the entire cache
- `stats()` → `{ hits, misses, size }` — Cache statistics

### schemas.ts

JSON schema validators for all data stores. All validators return
`{ valid: boolean, errors: string[] }`.

**Pre-existing validators:**

- `validateSessionState(obj)` — Validates session state object (schema_version,
  project_name, status, etc.)
- `validateCommandEntry(obj)` — Validates a command queue entry (command,
  project, timestamp)
- `validateAnalyticsEvent(obj)` — Validates a single analytics event (type,
  timestamp, properties)

**New validators (SP-3, TECH-03):**

- `validateAnalyticsEventArray(arr)` — Validates an array of analytics events
  (1–100 items)
- `validateReevaluateTrigger(obj)` — Validates reevaluate trigger data (scope ∈
  {ALL, BUSINESS, TECH, UX, MARKETING}, reason, source)
- `validateDecisionCreate(obj)` — Validates decision creation (type, priority,
  scope, text required; type/priority enum checked)
- `validateDecisionMutation(obj)` — Validates decision mutation structure
  (action required, optional id/answer/reason/text/notes strings)
- `validateQuestionnaireUpdate(obj)` — Validates questionnaire answer update
  (questionId, answer, status ∈ {ANSWERED, OPEN, SKIPPED, DEFERRED})
- `validateProjectBrief(obj)` — Validates project brief (non-empty string, max
  50 KB)

**Exported constants:**

- `VALID_ANALYTICS_EVENTS` — Array of 9 valid analytics event types
- `VALID_MUTATION_ACTIONS` — Array of 8 valid decision mutation actions

**Coverage (SP-3):** 98.3% statements, 96.8% branches, 100% functions

### strings.ts

Externalized user-facing strings.

**Exports:**

- `VALIDATION` — Validation error message templates
- `RESPONSES` — Response message factories (e.g., `reevaluateTrigger(scope)`,
  `commandQueued(cmd)`)
- `STATIC` — Static string constants

### audit.ts

Mutation audit trail.

**Class: `AuditTrail`**

- `constructor({ dir, maxSize?, filename? })` — Creates audit trail instance
- `log({ operation, entity_type, entity_id?, user?, summary })` — Appends a log
  entry
- `read(limit)` → array — Returns the last N entries (default 50)
- `count()` → number — Total entry count
- `logPath` → string — Full path to the log file

**Format:** Append-only JSON Lines (`.jsonl`). Each line:
`{ timestamp, operation, entity_type, entity_id, user, summary }`. File rotation
at configurable max size (default 10 MB).

### utils/errors.ts

Structured error catalog.

**Functions:**

- `errorResponse(code, details?)` → `{ code, message, recovery, details? }` —
  Returns structured error for a known error code
- `statusToCode(httpStatus)` → string — Maps HTTP status to error code

**Error codes:** `VALIDATION_ERROR`, `FILE_NOT_FOUND`, `DECISIONS_NOT_FOUND`,
`INVALID_ACTION`, `UNKNOWN_COMMAND`, `NOT_FOUND`, `PATH_TRAVERSAL`,
`PAYLOAD_TOO_LARGE`, `INVALID_CONTENT_TYPE`, `INVALID_JSON`, `INVALID_INPUT`,
`METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`

### utils/secret-utils.ts

Secret detection and warning utilities.

**Functions:**

- `formatSecretWarnings(patterns)` → string[] — Formats detected patterns into
  warning messages
- `attachSecretWarnings(response, patterns)` — Adds `warnings` array to a
  response object if patterns found

---

## API Reference

All endpoints accept and return JSON. The server runs on
`http://127.0.0.1:3000`.

> **Comprehensive documentation:** Full endpoint details — including auth
> requirements, request/response schemas, and example requests — are available
> in the [`docs/api/`](api/index.md) directory. The sections below provide a
> quick inline reference; see the per-group pages for complete coverage:
>
> | Group                  | Page                                               |
> | ---------------------- | -------------------------------------------------- |
> | Authentication & Users | [auth-api.md](api/auth-api.md)                     |
> | Questionnaires         | [questionnaires-api.md](api/questionnaires-api.md) |
> | Decisions              | [decisions-api.md](api/decisions-api.md)           |
> | Commands               | [commands-api.md](api/commands-api.md)             |
> | Orchestrator           | [orchestrator-api.md](api/orchestrator-api.md)     |
> | Sessions & Progress    | [sessions-api.md](api/sessions-api.md)             |
> | Milestones             | [milestones-api.md](api/milestones-api.md)         |
> | Governance             | [governance-api.md](api/governance-api.md)         |
> | Analytics & Metrics    | [analytics-api.md](api/analytics-api.md)           |
> | Agents                 | [agents-api.md](api/agents-api.md)                 |
> | Artifacts              | [artifacts-api.md](api/artifacts-api.md)           |
> | Workspaces             | [workspaces-api.md](api/workspaces-api.md)         |
> | Dashboard & Cockpit    | [dashboard-api.md](api/dashboard-api.md)           |
> | Jobs                   | [jobs-api.md](api/jobs-api.md)                     |
> | System & Health        | [system-api.md](api/system-api.md)                 |
> | Newsletter             | [subscribe-api.md](api/subscribe-api.md)           |

### Questionnaires

#### GET /api/questionnaires

Returns all questionnaires parsed from `BusinessDocs/` subdirectories.

**Response:**

```json
{
  "questionnaires": [
    {
      "file": "Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md",
      "agent": "Software Architect",
      "phase": "Phase 2",
      "questions": [
        {
          "id": "Q-05-001",
          "required": true,
          "question": "...",
          "answer": "",
          "status": "OPEN"
        }
      ]
    }
  ]
}
```

#### POST /api/save

Save answers to a questionnaire.

**Request:**

```json
{
  "file": "Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md",
  "updates": [
    {
      "questionId": "Q-05-001",
      "answer": "My answer here",
      "status": "ANSWERED"
    }
  ]
}
```

**Response:**

```json
{ "ok": true, "updated": 1, "warnings": [] }
```

The `warnings` array contains secret detection alerts if credentials are found
in answers.

### Session

#### GET /api/session

Returns the current session state from `session-state.json`.

**Response:** The full session state object (see [Data Model](#data-model)).

### Decisions

#### GET /api/decisions

Returns all decisions parsed from `decisions.md`.

**Response:**

```json
{
  "open": [...],
  "decided": [...],
  "deferred": [...]
}
```

#### POST /api/decisions

Create, answer, decide, or defer a decision.

**Request (create):**

```json
{
  "action": "create",
  "type": "OPEN_QUESTION",
  "priority": "HIGH",
  "scope": "Phase 2",
  "text": "Which database should we use?"
}
```

**Request (answer):**

```json
{ "action": "answer", "id": "DEC-R2-010", "answer": "PostgreSQL" }
```

**Request (decide):**

```json
{ "action": "decide", "id": "DEC-R2-010", "answer": "PostgreSQL — final" }
```

**Request (defer):**

```json
{ "action": "defer", "id": "DEC-R2-010", "reason": "Need more research" }
```

**Response:** `{ "ok": true, "id": "DEC-R2-011" }`

### Commands

#### POST /api/command

Queue a command for the agent pipeline.

**Request:**

```json
{ "command": "CREATE MyProject" }
```

**Response:**

```json
{ "ok": true, "clipboard_text": "CREATE MyProject", "entry": { ... } }
```

Supported commands: `CREATE`, `AUDIT`, `FEATURE`, `REEVALUATE`, `SCOPE CHANGE`,
`HOTFIX`, `CONTINUE`, `REFRESH ONBOARDING`, and partial/combo variants.

#### GET /api/command

Returns the command queue.

**Response:**

```json
{
  "queue": [...],
  "command": { ... }
}
```

### Progress

#### GET /api/progress

Returns pipeline progress across all 7 phase groups.

**Response:**

```json
{
  "phases": [
    { "key": "ONBOARDING", "label": "Onboarding", "status": "COMPLETE", "agents": [...] },
    { "key": "PHASE-2", "label": "Architecture & Design", "status": "IN_PROGRESS", "agents": [...] }
  ]
}
```

### Export

#### GET /api/export

Exports the full project state as a single JSON object.

**Response:**

```json
{
  "session": { ... },
  "command_queue": [...],
  "decisions": { "open": [], "decided": [], "deferred": [] },
  "questionnaires": [...],
  "exported_at": "2026-03-08T12:00:00Z"
}
```

### Analytics

#### POST /api/analytics

Submit UI analytics events.

**Request:**

```json
{
  "events": [
    { "event": "page_view", "properties": { "page": "questionnaires" } }
  ]
}
```

**Valid event types:** `page_view`, `tab_switch`, `command_launch`,
`questionnaire_save`, `decision_update`, `error_displayed`, `feature_usage`,
`session_start`, `session_end`

See [Analytics Events Reference](#analytics-events-reference) for full details
on each event type.

**Response:** `{ "ok": true, "accepted": 1, "rejected": 0 }`

#### GET /api/analytics

Returns stored analytics events.

**Response:** `{ "events": [...] }`

### Reevaluate

#### POST /api/reevaluate

Triggers a reevaluation of one or more scopes.

**Request:**

```json
{ "scope": "TECH" }
```

**Response:** `{ "ok": true, "scope": "TECH" }`

Writes a trigger file to `BusinessDocs/session/reevaluate-trigger.json`.

### Help

#### GET /api/help

Returns the help table of contents.

**Response:**
`{ "toc": [{ "slug": "getting-started", "title": "Getting Started" }] }`

#### GET /api/help?topic=getting-started

Returns a specific help topic.

**Response:**
`{ "slug": "getting-started", "title": "Getting Started", "content": "..." }`

**Validation:** slugs are validated — path traversal attempts return 400.

### Monitoring

#### GET /api/health

Returns server health.

**Response:**

```json
{ "status": "ok", "sse_connections": 0, "timestamp": "2026-03-08T12:00:00Z" }
```

#### GET /api/metrics

Returns server metrics.

**Response:**

```json
{
  "uptime_seconds": 3600,
  "request_count": 150,
  "error_count": 2,
  "error_rate": 0.013,
  "response_time_p50": 5,
  "response_time_p95": 25,
  "response_time_p99": 50,
  "sse_connections": 1,
  "cache_hit_ratio": 0.85,
  "per_endpoint": { ... }
}
```

### Audit

#### GET /api/audit

Returns mutation audit trail entries.

**Query parameters:**

- `limit` — Number of entries to return (default: 50, max: 1000)

**Response:**

```json
{
  "entries": [
    {
      "timestamp": "2026-03-08T12:00:00Z",
      "operation": "UPDATE_ANSWER",
      "entity_type": "questionnaire",
      "entity_id": "Q-05-001",
      "user": "webapp",
      "summary": "..."
    }
  ],
  "total": 42,
  "limit": 50
}
```

### SSE

#### GET /api/events

Server-Sent Events stream for real-time updates.

**Event types:**

- `questionnaire_update` — Questionnaire answer changed
- `decision_update` — Decision created/modified
- `command_queued` — New command added to queue
- `reevaluate_trigger` — Reevaluation triggered

**Example:**

```
event: questionnaire_update
data: {"file":"Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md"}

```

### Newsletter

#### POST /api/subscribe

Subscribe an email address to the newsletter via Buttondown ESP.

**Request body:**

```json
{
  "email": "user@example.com",
  "metadata": {
    "segment": "developers",
    "source": "landing-page"
  }
}
```

**Segments:** `engineering-leaders`, `product-managers`, `developers`,
`evaluators`

**Responses:**

- `201` — `{ "status": "pending_confirmation", "message": "..." }`
- `400` — Invalid email or segment
- `409` — Email already subscribed
- `201` (local fallback) — `{ "status": "stored_locally" }` when
  `BUTTONDOWN_API_KEY` not set; subscriptions saved to
  `BusinessDocs/local-subscriptions.json`

**Security:** API key is server-side only, never exposed to clients. Local
fallback ensures subscriptions are captured during development without requiring
an ESP account.

---

### Static Files

#### GET /

Serves `index.html` (the single-page web UI).

#### GET /landing

Serves `landing.html` (the marketing landing page with subscribe form). Includes
`og:image` and `twitter:card` meta tags for social media previews.

#### GET /social-cards/:file.svg

Serves SVG social cards from `src/webapp/social-cards/`. Files:
`card-architecture.svg`, `card-launch.svg`, `card-risk-matrix.svg`,
`card-sprint-results.svg`. Content-Type: `image/svg+xml`, cached 24h.

#### GET /locales/:locale/:file.json

Serves locale translation files from `locales/` at repository root. Path
traversal prevented by `safePath()`. Example:
`GET /locales/fr-FR/ui-labels.json`. Content-Type: `application/json`, cached
1h.

#### GET /health

Lightweight health check (no JSON structure, fast response).

---

## Data Model

### session-state.json

Location: `BusinessDocs/session/session-state.json`

```json
{
  "session_id": "string — unique session identifier",
  "cycle_type": "FULL_CREATE | COMBO_AUDIT | PARTIAL_CREATE | ... (11 types)",
  "status": "NOT_STARTED | ONBOARDING | PHASE-1-IN-PROGRESS | ... | COMPLETE",
  "current_phase": "ONBOARDING | PHASE-1 | PHASE-2 | PHASE-3 | PHASE-4 | SYNTHESIS | PHASE-5",
  "current_agent": "string — agent ID (e.g. '20-implementation-agent')",
  "current_step": "string — human-readable step description",
  "initiated_at": "ISO 8601 timestamp",
  "last_updated": "ISO 8601 timestamp",
  "completed_phases": ["array of phase keys"],
  "completed_agents": ["array of agent IDs"],
  "phase_outputs": { "phase-key": "file path or object of agent outputs" },
  "sprint_backlog": { "sprint-id": { ... } }
}
```

### decisions.md

Location: `docs/decisions.md`

Markdown file with two main sections:

- **Open Questions table** — items waiting for user answers
- **Category Registry table** — lookup table mapping each technology stack to
  its category file, decision count, status (`ACTIVE`/`PARTIAL`/`DEFERRED`), and
  applicability flag

Per-technology decisions live in category files under
`docs/decisions/[stack].md`. Each category file has a header
(`> Stack: … | Status: … | Applicable: …`) and a table of `DECIDED` items.

Each row: `| ID | Priority | Scope | Decision/Question | Notes/Answer | Date |`

> **For the full file architecture, data flow, deferred activation sequence
> (ORC-45), and triple-check enforcement chain, see
> [`docs/help/decisions-architecture.md`](../help/decisions-architecture.md).**

### Questionnaires

Location: `BusinessDocs/Phase[N]-[Discipline]/Questionnaires/*.md`

Markdown files with structured questions:

```markdown
### Q-05-001 [REQUIRED]

**Question:** What is the target deployment environment? **Why we need this:**
To determine infrastructure requirements. **Expected format:** Text description
**Your answer:**

> (user fills in here)
```

### Analytics Events

Location: `docs/analytics-events.json`

JSON array of event objects:

```json
[
  {
    "event": "page_view",
    "properties": { "page": "questionnaires" },
    "timestamp": "2026-03-08T12:00:00Z"
  }
]
```

### Audit Log

Location: `BusinessDocs/audit/audit-log.jsonl`

Append-only JSON Lines file:

```jsonl
{
  "timestamp": "2026-03-08T12:00:00.000Z",
  "operation": "UPDATE_ANSWER",
  "entity_type": "questionnaire",
  "entity_id": "Q-05-001",
  "user": "webapp",
  "summary": "Updated answer for Q-05-001"
}
```

### Command Queue

Location: `BusinessDocs/session/command-queue.json`

JSON array of command entries:

```json
[
  {
    "command": "CREATE MyProject",
    "requested_at": "2026-03-08T12:00:00Z",
    "status": "PENDING"
  }
]
```

---

## Configuration

The server uses environment variables and sensible defaults. See [src/webapp/README.md](../../src/webapp/README.md) for complete configuration table and runtime profile setup instructions.

Key environment variables:

| Variable           | Default       | Description                                                                    |
| ------------------ | ------------- | ------------------------------------------------------------------------------ |
| `PORT`             | `3000`        | HTTP server port (1–65535 validated at startup)                                |
| `HOST`             | `127.0.0.1`   | Bind address; non-local requires auth or API_KEY                               |
| `NODE_ENV`         | `development` | Controls startup strictness; `production` enforces storage provider success    |
| `STORAGE_PROVIDER` | `file`        | Storage backend: `file` (JSON) or `sqlite` (database)                          |
| `QUEUE_PROVIDER`   | `memory`      | Job queue: `memory` (in-process), `persistent` (disk), `bullmq` (Redis)        |
| `SESSION_STORE`    | `sqlite`      | Session storage: `sqlite` (embedded) or `redis` (distributed)                  |
| `REDIS_URL`        | _(unset)_     | Redis connection; if set, enables Redis features; startup fails if unreachable |
| `TRUST_PROXY`      | `false`       | Trusted proxy configuration (explicit security-by-default)                     |
| `API_KEY`          | _(unset)_     | API-only authentication for non-local access (minimum 24 characters if set)    |

All file paths are computed relative to the repository root. The server expects
to be launched from the repository root directory or with the correct working
directory.

---

## Deployment

Choose a deployment profile matching your environment. See [Runtime Profiles](#runtime-profiles) above for detailed setup.

### Development

```bash
npm install
npm start
```

Listens on `http://127.0.0.1:3000`. All services use in-process/file-based defaults.

### Single-Node Production

```bash
NODE_ENV=production \
  STORAGE_PROVIDER=sqlite \
  STORAGE_PATH=/data/agentic.db \
  GITHUB_CLIENT_ID=$YOUR_GITHUB_CLIENT_ID \
  GITHUB_CLIENT_SECRET=$YOUR_GITHUB_CLIENT_SECRET \
  npm start
```

**Important:** Storage provider init failure **aborts startup** with exit code 1 (fail-closed). No fallback mode.

### Docker (Single Node)

Dockerfile is provided in `infra/Dockerfile`.

```bash
docker build -t agentic-sdlc:latest -f infra/Dockerfile .

docker run \
  -e NODE_ENV=production \
  -e STORAGE_PROVIDER=sqlite \
  -e STORAGE_PATH=/data/agentic.db \
  -e GITHUB_CLIENT_ID=$YOUR_GITHUB_CLIENT_ID \
  -e GITHUB_CLIENT_SECRET=$YOUR_GITHUB_CLIENT_SECRET \
  -v /data:/data \
  -p 3000:3000 \
  agentic-sdlc:latest
```

The container includes a HEALTHCHECK using `/api/health` and `/health` endpoints.

### Docker Compose (Development Full Stack)

The platform runs as a multi-container stack (app + analytics + i18n):

```bash
# Install all dependencies first
npm install

# Start full-stack developer mode (includes Matomo analytics and Weblate i18n)
docker compose -f infra/docker-compose.dev.yml up --build -d

# Or webapp + analytics only
docker compose -f infra/docker-compose.webapp.yml up --build -d

# Verify health
docker compose -f infra/docker-compose.dev.yml ps
```

| Service                              | Port | Purpose                 |
| ------------------------------------ | ---- | ----------------------- |
| command-center                       | 3000 | Main web UI + API       |
| matomo + matomo-db + matomo-web      | 8080 | Privacy-first analytics |
| weblate + weblate-db + weblate-cache | 8081 | Translation management  |

### Distributed Production (Multi-Instance with Redis)

See [Runtime Profiles](#runtime-profiles) for `production-distributed` configuration (BullMQ, Redis sessions, shared database).

### Process Management

```bash
# Using PM2
npx pm2 start npx -- tsx src/webapp/server.ts --name agentic-team

# Check status
npx pm2 status
```

### Health Checks

The server exposes two complementary health endpoints:

- `GET /health` — **Liveness probe.** Lightweight check that the process is
  running. Returns `{ status, version, uptime, store_status }`.
- `GET /api/health` — **Readiness probe.** Confirms the server is ready to
  handle requests. Returns additional `sse_connections` and `timestamp` fields.
  Used by Docker HEALTHCHECK and Playwright `webServer.url`.

> `GET /api/dashboard/health` is _not_ a server health endpoint — it returns
> project health indicators (code quality, test coverage, etc.) for the
> Dashboard UI.

### Analytics Stack (Matomo)

Privacy-first analytics via self-hosted Matomo, defined in
`infra/docker-compose.analytics.yml` (3-service stack):

| Service    | Image               | Purpose                                           |
| ---------- | ------------------- | ------------------------------------------------- |
| matomo     | matomo:5-fpm-alpine | Matomo PHP-FPM application                        |
| matomo-db  | mariadb:11          | Persistent analytics database                     |
| matomo-web | nginx:alpine        | Reverse proxy (config: `infra/matomo-nginx.conf`) |

```bash
# Start analytics stack (requires .env with MATOMO_DB_PASSWORD + MATOMO_DB_ROOT_PASSWORD)
docker compose -f infra/docker-compose.analytics.yml up -d

# Verify health
docker compose -f infra/docker-compose.analytics.yml ps
```

Port configurable via `MATOMO_PORT` env var (default: 8080). Cookieless tracking
mode configured post-install per `sp-2-mat-matomo-deployment.md`.

### Translation Management (Weblate)

Self-hosted Weblate TMS for i18n, defined in `infra/docker-compose.weblate.yml`
(3-service stack):

| Service       | Image               | Purpose                           |
| ------------- | ------------------- | --------------------------------- |
| weblate       | weblate/weblate:5.4 | Translation UI + REST/GraphQL API |
| weblate-db    | postgres:16-alpine  | Persistent translation database   |
| weblate-cache | redis:7-alpine      | Cache + async task broker         |

```bash
# Copy env template and set passwords
cp .env.weblate.example .env.weblate
# Edit .env.weblate: set WEBLATE_ADMIN_PASSWORD + WEBLATE_DB_PASSWORD

# Start Weblate stack
docker compose -f infra/docker-compose.weblate.yml --env-file .env.weblate up -d
```

Port configurable via `WEBLATE_PORT` env var (default: 8081). Pilot translation
strings in `locales/en-US/` (120 keys across 3 namespaces: ui-labels,
validation-messages, doc-snippets). Vendor evaluation:
`docs/phase-5/sp-2-501-tms-vendor-scoring.md`.

---

## Security Model

### Non-local API Access Policy

- Localhost bindings (`127.0.0.1`, `localhost`, `::1`) are the default and are
  intended for single-operator runtime.
- For non-local bindings, startup now fails closed unless one approved security
  mode is configured:
  - GitHub OAuth auth middleware enabled, or
  - `API_KEY` configured (minimum 24 characters).
- When running non-local without OAuth, all `/api/**` routes require
  `x-api-key` and requests are rejected with `401` if the key is missing or
  invalid.
- Rate limiting applies to API routes by default (including selected GET APIs);
  only explicit low-risk exceptions are exempt (`/api/health`, `/api/events`).

### Production Startup Requirements

Startup is determined to be in a **production context** when:

- `NODE_ENV=production`, or
- Server is bound to a non-local address (`HOST` is not `127.0.0.1`, `localhost`, or `::1`)

In production context:

- **Storage provider initialization is mandatory.** If `initStorageProvider()` fails, startup aborts with `exit(1)`.
- Fallback to file-only storage (degraded mode) is **not allowed**.
- This prevents cases where the database is unreachable but the server starts anyway
  and silently accepts requests destined for persistent storage that will never be saved.

In local development:

- Storage provider initialization failures log a warning but do not prevent startup.
- The server can continue with file-based storage or other fallback modes.
- This allows development and testing without a full infrastructure stack.

### HTTP Security Headers

Every response includes: | Header | Value | |--------|-------| |
`X-Content-Type-Options` | `nosniff` | | `X-Frame-Options` | `DENY` | |
`Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; ...` | |
`Referrer-Policy` | `strict-origin-when-cross-origin` | | `Permissions-Policy` |
Restricts camera, microphone, geolocation | | `Cross-Origin-Opener-Policy` |
`same-origin` |

### Input Sanitization

- **Markdown injection** — `sanitizeMarkdown()` escapes `#`, `---`, `|`, and
  other Markdown control characters.
- **Q-ID neutralization** — `sanitizeQID()` replaces hyphens in Q-ID patterns
  with non-breaking hyphens to prevent ID injection.
- **Path traversal** — `safePath()` validates all file paths, blocking `..`
  traversal.
- **Payload limits** — Request bodies are limited to prevent abuse.

### Secret Detection

`detectSecrets()` scans answers for:

- AWS Access Keys (`AKIA...`)
- GitHub Tokens (`ghp_...`, `gho_...`, `ghs_...`)
- Private Keys (`-----BEGIN ... PRIVATE KEY-----`)
- Generic API key patterns

Detected patterns generate warnings (not rejections) — users are informed but
not blocked.

---

## Testing

### Framework

**Vitest** with **@vitest/coverage-v8** for code coverage.

### Test Structure

```
tests/
  unit/
    audit-trail.test.js       — AuditTrail class
    backup-strategy.test.js    — Backup-on-write behavior
    file-lock.test.js          — Concurrent write safety
    mcp-server.test.js         — MCP server tools + resources (71 tests)
    models-edge.test.js        — Model parsing edge cases
    sanitization.test.js       — Input sanitization
    ...
  integration/
    decisions-roundtrip.test.js — Decision create/answer/decide flow
    e2e-api-flows.test.js       — End-to-end API workflows
    server-api.test.js          — All API endpoints
    store-cache.test.js         — Store + cache interaction
    regression-suite.test.js    — Cross-sprint regression (67 tests)
```

### Running Tests

All dev commands run from the repository root:

```bash
npm test                  # All tests (Vitest)
npm run test:coverage     # With coverage report
npm run test:watch        # Watch mode
npx vitest run tests/unit # Only unit tests
```

### Coverage Thresholds

Configured in `vitest.config.mjs`:

- Statements: ≥ 70%
- Branches: ≥ 70%
- Functions: ≥ 70%
- Lines: ≥ 70%

### Full Test Suite

The project uses **Vitest** for all tests. The suite covers unit, integration,
smoke, and end-to-end tests.

#### Test Structure

```
tests/
  example.test.js                        — Baseline validation
  unit/
    middleware.test.js                   — Pure middleware functions (27 tests)
    matomo-analytics.test.js             — Matomo Docker stack validation (32 tests)
    landing-matomo.test.js               — Landing page Matomo integration (12 tests)
    weblate-docker.test.js               — Weblate Docker stack validation (25 tests)
    email-templates.test.js              — Email template validation (10 tests)
    weblate-trial.test.js                — Locale strings + Docker config (16 tests)
    social-cards.test.js                 — Social card SVG validation (12 tests)
    translation-validation.test.js       — i18n key parity, placeholders, ICU, brand (37 tests)
    landing-qa.test.js                   — Landing page 8 AC + Matomo integration (43 tests)
    pilot-readiness.test.js              — Pilot materials completeness validation (23 tests)
  integration/
    server.integration.test.js           — API endpoint integration (~22 tests)
    health.integration.test.js           — Health endpoint contracts (9 tests)
    subscribe.integration.test.js        — Newsletter subscribe endpoint (8 tests)
  smoke/
    landing.smoke.test.js               — HTTP-based smoke tests (29 tests)
```

#### Running Tests

```bash
# From repository root:
npm test                  # All tests (unit + integration + smoke)
npm run test:coverage     # With coverage report
npm run test:integration  # Integration tests only
npm run test:smoke        # Smoke tests only
```

#### Smoke Test Architecture (SP-11-613)

HTTP-based tests using Vitest. No Playwright dependency — the smoke suite
validates critical user journeys at the HTTP level using the same server-import
pattern proven in integration tests.

**8 smoke test groups (29 tests):**

| Group     | Journey                   | Tests |
| --------- | ------------------------- | ----- |
| SMOKE-001 | Landing page loads        | 3     |
| SMOKE-002 | Dashboard accessible      | 3     |
| SMOKE-003 | Health endpoint           | 4     |
| SMOKE-004 | API session reachable     | 3     |
| SMOKE-005 | Questionnaire list loads  | 3     |
| SMOKE-006 | Security headers baseline | 5     |
| SMOKE-007 | Decisions endpoint        | 2     |
| SMOKE-008 | Marketing landing page    | 6     |

**CI Integration:** Job 7 (smoke-test) in `.github/workflows/ci-pipeline.yml`
runs on `main` branch pushes after staging deployment. Test artifacts are
uploaded with 30-day retention.

**Accessibility Gate (Sprint 2):** Job 8 (accessibility-gate) is IMPLEMENTED in
`.github/workflows/ci-pipeline.yml` per spec
`docs/phase-5/sp-1-203-accessibility-gate.md`. Runs axe-core WCAG 2.1
A+AA scan + Lighthouse accessibility audit with a 90% score threshold. Triggers
on `main` push and all PRs.

Run `npm run test:coverage` for current coverage metrics.

### Test Conventions

- Use `InMemoryStore` — never touch the real filesystem.
- Use `setStore(store)` in `beforeEach` to reset state between tests.
- Call `_cache.invalidateAll()` to clear cache state.
- Server tests use `server.listen(0)` for random port allocation.

---

## CI/CD Pipeline

### Overview

The CI/CD pipeline (`.github/workflows/ci-pipeline.yml`) automates build, test,
security scanning, and deployment for all PRs and pushes to `main`.

**Trigger Events:**

- `push` to `main`, `feature/**`, `hotfix/**`
- `pull_request` to `main`

### Job Architecture

```
[lint] ──┐
[test] ──┼──→ [build] ──→ [deploy-staging] ──→ [integration-test]
[security]┘                                 ──→ [smoke-test]
                                                    ↓
                                              [status-badge]
```

| Job | Name                 | Trigger           | Purpose                                         |
| --- | -------------------- | ----------------- | ----------------------------------------------- |
| 1   | `lint`               | All pushes + PRs  | ESLint + Prettier code quality                  |
| 2   | `test`               | All pushes + PRs  | Vitest unit tests + coverage gate               |
| 3   | `security`           | All pushes + PRs  | Gitleaks secret scan + Trivy vulnerability scan |
| 4   | `build`              | After Jobs 1-3    | `npm run build` + Docker image (GHCR)           |
| 5   | `deploy-staging`     | `main` push only  | Docker Compose health-checked deployment        |
| 6   | `integration-test`   | After staging     | `npm run test:integration` in CI                |
| 7   | `smoke-test`         | After staging     | `npm run test:smoke` (29 tests, 8 journeys)     |
| 8   | `accessibility-gate` | `main` push + PRs | axe-core WCAG 2.1 A/AA + Lighthouse > 90        |
| 9   | `status`             | Always            | Build status badge generation                   |

### Job Details

#### Job 1: Lint & Code Quality

- Runs `npm run lint` (ESLint) and `npm run format:check` (Prettier)
- Fails on any lint or formatting error

#### Job 2: Unit Tests & Coverage

- Runs `npm run test:coverage`
- Coverage uploaded to Codecov
- Enforces 80% line coverage minimum via threshold check

#### Job 3: Security Scan

- **Gitleaks**: Scans for committed secrets and API keys
- **Trivy**: Filesystem vulnerability scan (CRITICAL + HIGH severity)
- SARIF results uploaded to GitHub Security tab

#### Job 4: Build & Docker Image

- Requires Jobs 1-3 to pass
- Builds application and Docker image (multi-platform: amd64 + arm64)
- Pushes to GHCR on non-PR events

#### Job 5: Deploy to Staging

- `main` push only — Docker Compose deployment with health check loop
- 30 retries × 2s intervals, fails if service doesn't respond
- Tears down staging environment after downstream jobs complete

#### Job 6: Integration Tests

- Runs after staging deployment succeeds
- Executes `npm run test:integration` against live service

#### Job 7: Smoke Tests

- Runs after staging deployment succeeds
- Executes `npm run test:smoke` — 23 HTTP-based journey tests
- Artifacts uploaded with 30-day retention

#### Job 8: Accessibility Gate (Sprint 2)

- **Status:** ✅ IMPLEMENTED (SP-2-CI8 #124, Sprint 2 Day 2)
- Runs after build, on `main` pushes and PRs to `main`
- Starts the application, waits for readiness, then runs:
  - **axe-core**: WCAG 2.1 A + AA violation detection (`@axe-core/cli`)
  - **Lighthouse**: Accessibility category audit (headless Chrome)
- **Threshold:** Lighthouse score > 90, zero critical/serious axe violations
- **Artifact:** `a11y-report.json` uploaded with 30-day retention
- Specification: `docs/phase-5/sp-1-203-accessibility-gate.md`

### Environment

| Variable          | Value | Purpose                     |
| ----------------- | ----- | --------------------------- |
| `NODE_VERSION`    | `22`  | Node.js runtime version     |
| `DOCKER_BUILDKIT` | `1`   | Docker BuildKit for caching |

### Required Secrets

| Secret               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `GITHUB_TOKEN`       | Automatic — Gitleaks + Docker push          |
| `CODECOV_TOKEN`      | Coverage upload (optional)                  |
| `GITLEAKS_LICENSE`   | Gitleaks enterprise (optional)              |
| `BUTTONDOWN_API_KEY` | Newsletter subscribe endpoint (server-side) |

---

## Frontend UX Patterns

### Button Loading State (SP-7 / UX-04)

All async operations in the UI show a spinner on the triggering button using the
`setBtnLoading(btn, loading)` helper:

```js
setBtnLoading(btn, true); // adds .btn-loading class, sets aria-busy, disables
await someAsyncOp();
setBtnLoading(btn, false); // removes .btn-loading, clears aria-busy, re-enables
```

The `.btn-loading` CSS class hides the button text (`color: transparent`) and
overlays a CSS-only spinner via `::after` pseudo-element. This prevents
double-click submissions and provides visual feedback during network operations.

**Covered operations:** Save single answer, Save all for file, Global Save All,
Answer/Decide/Defer/Expire/Reopen Decision, Activate Category, Create Decision,
Edit Decision, Reevaluate.

### Skeleton Loaders

On first page load, both the questionnaires panel (`#main`) and decisions panel
(`#decMain`) show skeleton placeholder cards with shimmer animation while data
loads. The containers are marked with `aria-busy="true"` and cleared after data
arrives.

### Empty States (SP-7 / UX-05)

When no data exists, panels show guided numbered steps instead of generic empty
messages:

- **Questionnaires empty state** — `renderEmpty()` shows a 4-step guide (open
  Copilot Chat, type CREATE/AUDIT, follow prompts, wait for questionnaires).
- **Decisions empty state** — `renderDecisions()` distinguishes "truly empty"
  (no decisions at all → shows 3-step guide) from "filter empty" (decisions
  exist but hidden by filters → shows "adjust filters" message).

All empty state text is sourced from the `STRINGS` constant for i18n readiness.

---

## Development Setup

```bash
# Clone
git clone https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2.git
cd myAgentic-IT-Project-team-V2

# Install
npm install

# Verify
npm test        # Vitest — all tests should pass
npm run lint    # Should show 0 errors

# Develop
npm run test:watch   # Re-runs on changes
npm start            # Start server for manual testing
```

See [CONTRIBUTING.md](contributing) for coding standards and PR process.

---

## Monitoring & Observability

### Metrics Endpoint

`GET /api/metrics` provides:

- **Request count** and **error count** with error rate
- **Response time percentiles** (p50, p95, p99)
- **SSE connection count**
- **Cache hit ratio**
- **Per-endpoint breakdowns** (count, avg response time, error rate)

### Structured Logging

The server emits JSON-formatted log lines to stdout:

```json
{
  "timestamp": "2026-03-08T12:00:00.000Z",
  "level": "info",
  "message": "http_request",
  "method": "GET",
  "url": "/api/health",
  "status": 200,
  "duration_ms": 1
}
```

### Audit Trail

All data mutations (questionnaire answers, decision changes) are logged to the
append-only audit trail at `BusinessDocs/audit/audit-log.jsonl`. Query via
`GET /api/audit?limit=100`.

---

## Analytics Events Reference

_Sprint reference: SP-R2-004-008_

### Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                          │
│                                                               │
│  trackEvent(name, props) → _analyticsQueue[]                  │
│       ↓ (batched, every 5 s or 50 events)                     │
│  flushAnalytics() → POST /api/analytics { events: [...] }    │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│  server.ts  apiPostAnalytics()                                │
│                                                               │
│  1. Validate each event against VALID_ANALYTICS_EVENTS        │
│  2. Reject unknown event types (counted, not fatal)           │
│  3. Append valid events to analytics-events.json              │
│  4. Cap file at 5 000 events (FIFO — oldest trimmed)          │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│  docs/analytics-events.json                           │
│  [{ "event": "…", "properties": {}, "timestamp": "…" }, …]   │
└───────────────────────────────────────────────────────────────┘
```

### Server-Side Valid Event Types

The server validates events against a strict allowlist defined in `server.ts`:

```js
const VALID_ANALYTICS_EVENTS = [
  'page_view',
  'tab_switch',
  'command_launch',
  'questionnaire_save',
  'decision_update',
  'error_displayed',
  'feature_usage',
  'session_start',
  'session_end',
];
```

Events not in this list are **rejected** (counted in the `rejected` field of the
response).

### Event Catalog

| Event                | Description                                             | Expected Properties                      | Source                         |
| -------------------- | ------------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `page_view`          | User viewed a page/section                              | `{ page: string }`                       | Client (not yet wired)         |
| `tab_switch`         | User switched to a different tab                        | `{ tab: string }`                        | Client — `switchTab()` wrapper |
| `command_launch`     | User launched a command from the Command Center         | `{ command: string }`                    | Client (not yet wired)         |
| `questionnaire_save` | User saved questionnaire answers                        | `{ file: string, count: number }`        | Client (not yet wired)         |
| `decision_update`    | User created, answered, decided, or deferred a decision | `{ action: string, id: string }`         | Client (not yet wired)         |
| `error_displayed`    | An error was shown to the user                          | `{ message: string, endpoint?: string }` | Client (not yet wired)         |
| `feature_usage`      | User used a specific feature                            | `{ feature: string }`                    | Client (not yet wired)         |
| `session_start`      | User session started                                    | `{}`                                     | Client (not yet wired)         |
| `session_end`        | User session ended                                      | `{}`                                     | Client (not yet wired)         |

### Client-Side Events Currently Emitted

The front-end (React SPA) fires these events via `trackEvent()`:

| Call Site         | Event Name            | Properties       | Server Accepts?           |
| ----------------- | --------------------- | ---------------- | ------------------------- |
| Page load         | `app_start`           | `{ tab }`        | **No** — not in allowlist |
| Tab switch        | `tab_switch`          | `{ tab }`        | Yes                       |
| Onboarding finish | `onboarding_complete` | `{ steps_seen }` | **No** — not in allowlist |
| Onboarding skip   | `onboarding_skip`     | `{ step }`       | **No** — not in allowlist |

> **Note:** Three of the four client-side events (`app_start`,
> `onboarding_complete`, `onboarding_skip`) are silently rejected by the server
> because they are not in `VALID_ANALYTICS_EVENTS`. Only `tab_switch` events are
> actually persisted. This is a known gap — either the server allowlist should
> be expanded or the client event names should be changed to match.

### Client Integration

**`trackEvent(eventName, properties)`** — Queues an event for batch submission.

```js
trackEvent('tab_switch', { tab: 'decisions' });
```

**Batching:** Events queue in `_analyticsQueue` and flush every 5 seconds
(`ANALYTICS_FLUSH_MS`) or when 50 events accumulate. Flushes are fire-and-forget
— failures are silently dropped (analytics is non-critical).

**Opt-out:** Users can opt out by setting `localStorage.analytics_optout = '1'`.
When opted out, `trackEvent()` returns immediately without queuing.

### Storage

| Property     | Value                                |
| ------------ | ------------------------------------ |
| File         | `docs/analytics-events.json`         |
| Format       | JSON array of event objects          |
| Max events   | 5 000 (`ANALYTICS_MAX_EVENTS`)       |
| Overflow     | Oldest events trimmed (FIFO)         |
| Write safety | `withFileLock()` + `safeWriteSync()` |

**Event object schema:**

```json
{
  "event": "tab_switch",
  "properties": { "tab": "decisions" },
  "timestamp": "2026-03-08T12:00:00.000Z"
}
```

The `timestamp` is set server-side (not from the client payload) to prevent
clock-skew issues.

### Validation

Server-side validation (`validateAnalyticsEvent`):

1. Event must be a non-null object
2. `event` field must be in the `VALID_ANALYTICS_EVENTS` allowlist
3. `properties`, if present, must be an object

Request-level validation:

- `events` must be a non-empty array with at most 100 items per batch
- Invalid events are counted in `rejected` but do not fail the entire request —
  valid events in the same batch are still persisted

### API Quick Reference

```
POST /api/analytics
  Body: { "events": [{ "event": "…", "properties": {} }, …] }
  Response: { "ok": true, "accepted": N, "rejected": N }

GET /api/analytics
  Response: { "events": [...], "total": N }
```
