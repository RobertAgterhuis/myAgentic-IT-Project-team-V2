# ADR-M33: Message Broker Selection — BullMQ

| Field      | Value                                 |
| ---------- | ------------------------------------- |
| **Status** | Accepted                              |
| **Date**   | 2026-03-18                            |
| **Source** | Scalability Assessment GAP-1, GAP-3   |
| **Scope**  | Job queue, SSE pub/sub, session store |

## Context

The platform currently uses in-process queues (`MemoryQueue`, `PersistentQueue`) and in-process SSE broadcasting. This works for single-instance deployment but prevents horizontal scaling because:

- **GAP-1**: Job queue state is instance-local — jobs are lost or duplicated across instances.
- **GAP-3**: SSE events only reach clients connected to the originating instance.
- **GAP-2**: Auth sessions are stored in per-instance SQLite — sticky sessions required.

An external message broker is needed for shared job queues, pub/sub fan-out, and session storage.

## Options Evaluated

### 1. Redis + BullMQ

| Aspect                     | Assessment                                                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job queue**              | BullMQ provides priority queues, delayed jobs, retries, DLQ, rate limiting, concurrency control — all features we already use in `MemoryQueue`/`PersistentQueue`. |
| **Pub/sub**                | Redis native pub/sub for SSE fan-out across instances.                                                                                                            |
| **Session store**          | Redis supports key-value with TTL — direct fit for session storage.                                                                                               |
| **Operational complexity** | Single Redis instance; well-understood ops model. Redis 7 alpine image is ~30 MB.                                                                                 |
| **Docker Compose**         | One additional service (`redis:7-alpine`). Already used by weblate stack.                                                                                         |
| **Node.js ecosystem**      | BullMQ is the de facto standard for Node.js job queues (~2M weekly downloads).                                                                                    |
| **Fallback**               | Graceful degradation to SQLite/in-memory queues when Redis is unavailable.                                                                                        |

### 2. NATS

| Aspect                     | Assessment                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job queue**              | JetStream provides durable queues but requires more configuration. No built-in priority queue, DLQ, or backoff — must be implemented manually. |
| **Pub/sub**                | Excellent pub/sub with subject-based routing.                                                                                                  |
| **Session store**          | Not a natural fit — requires JetStream KV store, less mature.                                                                                  |
| **Operational complexity** | Small binary but unfamiliar to most Node.js teams. Fewer managed hosting options.                                                              |
| **Docker Compose**         | Additional `nats:2-alpine` service.                                                                                                            |
| **Node.js ecosystem**      | `nats` package is well-maintained but much smaller community than BullMQ.                                                                      |

### 3. Standalone Redis (without BullMQ)

| Aspect                     | Assessment                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **Job queue**              | Requires building reliable queue semantics (BRPOPLPUSH, Lua scripts). Already solved by BullMQ. |
| **Pub/sub**                | Same Redis pub/sub as option 1.                                                                 |
| **Session store**          | Same as option 1.                                                                               |
| **Operational complexity** | Same Redis ops but more custom code to maintain.                                                |

## Decision

**BullMQ** (backed by Redis 7) is selected as the external message broker.

### Rationale

1. **Feature parity**: BullMQ's `Queue`/`Worker` map directly to our existing `JobQueue` interface — priority, concurrency, retry with backoff, DLQ, and job lifecycle events are all built-in.
2. **Minimal migration**: The `JobQueue` interface is preserved. `BullMQQueue` becomes a third implementation alongside `MemoryQueue` and `PersistentQueue`.
3. **Unified infrastructure**: One Redis instance serves job queues, SSE pub/sub, and session storage — no additional services.
4. **Graceful fallback**: When `REDIS_URL` is not set, the system falls back to `PersistentQueue` (SQLite) or `MemoryQueue`, maintaining single-instance development ergonomics.
5. **Ecosystem maturity**: BullMQ is actively maintained, has extensive documentation, and is the standard choice for Node.js background jobs.
6. **Already in stack**: Redis 7 is already present in the weblate trial compose file.

### Consequences

- Redis becomes a **required** service for multi-instance deployments.
- Redis is **optional** for single-instance/development — fallback to existing queues.
- `bullmq` and `ioredis` added as production dependencies.
- Docker Compose updated with a shared Redis service.
- Auth session store extended with Redis adapter for horizontal scaling.

## References

- [DEC-464] Queue tech recommendation (BusinessDocs/decisions/background-jobs.md)
- [DEC-345] Distributed cache decision (BusinessDocs/decisions/caching.md)
- [DEC-346] Session/Token cache decision (BusinessDocs/decisions/caching.md)
