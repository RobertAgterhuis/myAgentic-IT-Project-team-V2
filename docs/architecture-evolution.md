---
title: Architecture Evolution
nav_order: 5
---

# Architecture Evolution

Chronological record of significant architectural changes. Each entry links to
the relevant Architecture Decision Record (ADR) in `BusinessDocs/decisions/`.

---

## M29 — Authentication & RBAC (2026-03-17)

**ADR:** [adr-m29-auth-architecture.md](../BusinessDocs/decisions/adr-m29-auth-architecture.md)

Replaced the localhost IP-trust bypass with a full authentication layer.

| Component     | Change                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| Auth provider | GitHub OAuth 2.0 Authorization Code flow                                  |
| Sessions      | Server-side cookie sessions in SQLite (HttpOnly, Secure, SameSite=Strict) |
| RBAC          | Three-tier roles — `admin` > `operator` > `viewer`                        |
| CSRF          | Double-submit cookie pattern                                              |
| New files     | `auth.ts`, `context.ts`                                                   |

---

## M30 — Fastify Migration (2026-03-17)

**ADR:** [adr-m30-http-framework.md](../BusinessDocs/decisions/adr-m30-http-framework.md)

Migrated the HTTP layer from raw `http.createServer()` to **Fastify 5**.

| Component      | Before                                                                     | After                                      |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| HTTP framework | Node `http` module + custom router                                         | Fastify 5 with plugin architecture         |
| Validation     | Manual Ajv calls per route                                                 | Built-in JSON Schema via route schemas     |
| Logging        | Custom `logLine()`                                                         | Pino (Fastify built-in)                    |
| OpenAPI        | None                                                                       | `@fastify/swagger` + `@fastify/swagger-ui` |
| Middleware     | Ad-hoc pure functions                                                      | Fastify hooks + encapsulated plugins       |
| New files      | `app.ts`, `plugins/` directory (body-parser, rate-limit, security-headers) |

---

## M31 — UI-Triggered Agent Execution (2026-03-18)

**ADR:** [adr-m31-agent-execution.md](../BusinessDocs/decisions/adr-m31-agent-execution.md)

Added on-demand agent execution from the UI without requiring a full phase
transition through the state machine.

| Component | Change                                                      |
| --------- | ----------------------------------------------------------- |
| Endpoint  | `POST /api/agents/:id/execute`                              |
| Service   | `AgentExecutionService` wrapping `Dispatcher.invoke()`      |
| Real-time | SSE events: `agent_execution_start`, `_complete`, `_failed` |
| UI        | `AgentExecuteModal` component                               |

---

## M32 — Domain Model Refinement (2026-03-18)

Schema and model hardening across questionnaire parsing, decision lifecycle, and
markdown utilities. No ADR — incremental improvement milestone.

| Component | Change                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| Models    | Edge-case fixes for `parseQuestionnaire`, `parseDecisions`, `nextDecisionId`                       |
| Lifecycle | Hardened `moveToDecided`, `deferOpenQuestion`, `expireDecidedItem`, `reopenItem`, `editDecidedRow` |
| Tests     | Dedicated edge-case test suite (`models-m32-edge.test.js`)                                         |

---

## M33 — Scalability Foundation (2026-03-18)

**ADR:** [adr-m33-message-broker.md](../BusinessDocs/decisions/adr-m33-message-broker.md)

Introduced Redis + BullMQ as optional infrastructure for horizontal scaling.

| Component     | Before                                                       | After                                               |
| ------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Job queue     | In-process `MemoryQueue` / `PersistentQueue`                 | BullMQ (Redis-backed) with graceful fallback        |
| SSE broadcast | Instance-local                                               | Redis pub/sub fan-out across instances              |
| Session store | SQLite (per-instance)                                        | Redis with TTL (shared across instances)            |
| Health probes | Basic `/health`                                              | Liveness + readiness probes with Redis/queue status |
| Docker        | Single container                                             | Scaling compose with Redis service                  |
| New files     | `redis.ts`, `session-store-redis.ts`, `sse-manager-redis.ts` |
| Config vars   | `REDIS_URL`, `QUEUE_PROVIDER`, `SESSION_STORE`               |

---

## M34 — Documentation Remediation (2026-03-18)

No ADR — process milestone. Fixed documentation drift accumulated across
M29–M33: stale HTTP framework references, incorrect test counts, outdated
dependency claims, missing auth documentation, and hardcoded metrics. Slimmed
root README, consolidated CONTRIBUTING guides, and created this evolution page.
