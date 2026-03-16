# M24: Background Job Execution Model

> **Impact:** HIGH | **Breaking changes:** NONE (additive — new execution mode
> alongside existing in-process model) | **Blocks:** nothing | **Blocked by:**
> nothing (benefits from M23 persistence layer but can start independently)
>
> **Audit reference:** Weakness #1 and Phase 1 recommendation — "There is no
> evidence of queue workers, distributed execution, tenancy isolation, durable
> event streaming, or horizontal job processing. The core is sophisticated, but
> the operating model is still local/control-plane-first."
>
> **Validation:** CONFIRMED. The engine runs purely in-process: `createEngine()`
> in `engine.ts` executes synchronously within the Node process. The dispatcher
> retries locally with backoff but has no external job queue. Long-running agent
> invocations block the main event loop.

---

## Rationale

In-process execution means: if the server crashes, running work is lost. If an
agent invocation takes 30 seconds, no other work happens. If you want to run
two sprint analyses in parallel, you cannot. A background job model solves all
three problems while keeping the local-first philosophy intact.

---

## Issues

### M24-001: Define job execution interface

**Labels:** `architecture`, `engine`

Create `platform/engine/jobs/job-types.ts`:

```typescript
interface Job {
  id: string;
  type:
    | 'agent-invocation'
    | 'gate-validation'
    | 'artifact-registration'
    | 'sprint-gate'
    | 'policy-evaluation';
  payload: Record<string, unknown>;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: { message: string; severity: 'transient' | 'recoverable' | 'fatal' };
  retryCount: number;
  maxRetries: number;
}

interface JobQueue {
  enqueue(job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job>;
  dequeue(types?: string[]): Promise<Job | null>;
  complete(id: string, result: unknown): Promise<void>;
  fail(id: string, error: Job['error']): Promise<void>;
  cancel(id: string): Promise<void>;
  status(id: string): Promise<Job | null>;
  list(filter?: JobFilter): Promise<Job[]>;
}
```

**Acceptance criteria:**

- [ ] Job type definitions cover all current engine operations
- [ ] Interface supports priority, retry, and cancellation
- [ ] Types exported from jobs barrel

---

### M24-002: Implement in-process job queue

**Labels:** `engine`, `feature`

Create `platform/engine/jobs/memory-queue.ts`:

- Priority queue (higher priority jobs dequeue first)
- FIFO within same priority
- Configurable concurrency limit (default: 3 concurrent jobs)
- Job timeout enforcement
- Retry with exponential backoff (using dispatcher's existing severity
  classification)

This is the **default** mode — local-first, no external dependencies. It runs
jobs in the same process but on separate async tracks.

**Acceptance criteria:**

- [ ] Memory queue passes JobQueue contract tests
- [ ] Concurrency limit is enforced
- [ ] Priority ordering works correctly
- [ ] Retry with backoff works for transient failures
- [ ] Jobs time out after configured duration

---

### M24-003: Implement persistent job queue (StorageProvider-backed)

**Labels:** `engine`, `feature`

Create `platform/engine/jobs/persistent-queue.ts`:

- Uses `StorageProvider` (M23) to persist job state
- Survives server restart — queued and running jobs are recoverable
- Running jobs on restart are re-queued (idempotent re-execution)
- Polling-based dequeue with configurable interval
- Dead letter queue for jobs that exhaust retries

**Acceptance criteria:**

- [ ] Persistent queue passes JobQueue contract tests
- [ ] Jobs survive server restart
- [ ] Previously-running jobs are re-queued on restart
- [ ] Dead letter queue captures exhausted jobs
- [ ] Works with both file and SQLite storage providers

---

### M24-004: Create job worker loop

**Labels:** `engine`, `feature`

Create `platform/engine/jobs/worker.ts`:

- Continuous loop: dequeue → execute → complete/fail
- Configurable worker count (default: 1)
- Graceful shutdown: finish current job, don't dequeue new ones
- Health reporting: active job count, queue depth, processing rate

**Acceptance criteria:**

- [ ] Worker loop processes jobs continuously
- [ ] Graceful shutdown completes in-flight jobs
- [ ] Health metrics are exposed
- [ ] Worker count is configurable

---

### M24-005: Migrate dispatcher to use job queue

**Labels:** `refactor`, `engine`

Update `dispatcher.ts` to enqueue agent invocations as jobs instead of
executing them inline:

- `dispatch(agent, context)` → `queue.enqueue({ type: 'agent-invocation', ... })`
- Worker loop picks up the job and invokes the agent
- Dispatcher returns a job ID; callers can poll for result
- SSE notifications fire on job state changes (queued, running, completed,
  failed)

**Acceptance criteria:**

- [ ] Agent invocations go through the job queue
- [ ] Existing engine flow works identically (synchronous appearance,
      async execution)
- [ ] SSE notifications fire for job lifecycle events
- [ ] Existing tests pass (dispatcher behavior unchanged from caller's
      perspective)

---

### M24-006: Add job management to MCP and UI

**Labels:** `mcp`, `frontend`

MCP tools:

- `list_jobs` — list all jobs with status filter
- `get_job` — get job details + result
- `cancel_job` — cancel a queued or running job

UI (Pipeline page):

- Job queue visualization (queued, running, completed, failed)
- Job detail panel with logs and result
- Cancel button for queued/running jobs

**Acceptance criteria:**

- [ ] 3 new MCP tools for job management
- [ ] Pipeline page shows job queue state
- [ ] Job cancellation works from both MCP and UI
- [ ] Real-time updates via SSE

---

### M24-007: Add job observability metrics

**Labels:** `observability`, `engine`

Track and expose job metrics:

- Queue depth over time
- Job processing duration (p50, p95, p99)
- Jobs per type (agent-invocation, gate-validation, etc.)
- Failure rate by type and severity
- Retry count distribution
- Dead letter queue size

**Acceptance criteria:**

- [ ] Job metrics are captured and flushed with existing metrics system
- [ ] Observability page shows job health dashboard
- [ ] Alert-worthy conditions are identifiable (growing queue, high failure rate)
