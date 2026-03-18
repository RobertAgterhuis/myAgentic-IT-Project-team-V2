# Scalability And Performance Remediation

## Current Assessment

The repository has the right components for future scale, but the default operating mode is still optimized for modest, mostly local usage.

## Validated Findings

- `src/webapp/store.ts` uses synchronous filesystem calls such as `readFileSync`, `writeFileSync`, `renameSync`, and `copyFileSync`.
- `src/webapp/config.ts` defaults `STORAGE_PROVIDER` to `file`.
- `src/webapp/config.ts` defaults `QUEUE_PROVIDER` to `memory`.
- `src/webapp/server.ts` only switches to Redis-backed SSE when Redis is configured.
- `platform/engine/dispatcher.ts` iterates agents with `for (const agent of agents)`, confirming sequential execution in the current flow.

## My Opinion

The scalability story is currently optional rather than default. That is fine for a local MVP, but it is not enough for a platform marketed as production-ready. The biggest issue is not just speed. It is operational predictability under load and across multiple instances.

## Target State

The repository should distinguish clearly between:

- local-friendly mode
- production single-node mode
- production distributed mode

The production profiles should not depend on synchronous file persistence in the web process for hot paths.

## How I Would Fix It

### Fix 1: Move hot-path persistence away from synchronous file I/O

Short term:

- identify the most active write paths
- move them behind the provider abstraction
- reduce direct sync file usage in request handling paths

Long term:

- reserve sync file access for bootstrap, migration, or local-dev-only paths

### Fix 2: Make production queueing and distributed SSE explicit defaults

For production profiles:

- require persistent queueing
- require distributed event propagation where multi-instance deployment is supported
- fail startup when the selected production profile lacks its required infrastructure

### Fix 3: Introduce controlled parallelism where dependency-safe

The dispatcher should remain dependency-aware, but it should not stay serial by default if phases contain independent work. Add parallel execution only where contracts and ordering constraints allow it.

### Fix 4: Benchmark against a declared target profile

Define a baseline workload and test:

- request latency under load
- event fan-out behavior
- queue latency
- file or database write contention

## Milestone Candidate

Milestone: Production Runtime Scalability Profile

## Epic Candidates

### Epic: Hot-path persistence modernization

Suggested issues:

- Identify sync file I/O used in request paths
- route write-heavy paths through production-grade provider implementations
- measure blocking behavior before and after changes

### Epic: Distributed runtime defaults

Suggested issues:

- define production queue default
- define distributed SSE default
- enforce infrastructure requirements for production profiles

### Epic: Dispatcher throughput improvement

Suggested issues:

- classify agent dependency graph for safe parallelism
- implement bounded parallel execution where allowed
- add observability for queue wait and execution concurrency

## Acceptance Criteria

- Production runtime no longer depends on synchronous file I/O in hot request paths.
- Queueing and event propagation are production defaults, not optional add-ons.
- Dispatcher throughput improves without violating dependency ordering.
- A documented performance baseline exists.
