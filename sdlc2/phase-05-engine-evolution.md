# Phase 5 — Engine Evolution

> Detailed evolution plan for the workflow engine layer.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Current Engine Architecture

```
engine.ts (orchestrator)
  ├── state-machine.ts    — FSM with 15 states, mode-aware transitions
  ├── dispatcher.ts       — Agent execution with context injection
  ├── flow-loader.ts      — Custom YAML parser for workflow definitions
  ├── gate-validator.ts   — Contract/guardrail enforcement at critic gates
  ├── sprint-gate.ts      — DoR, velocity, capacity, blocker checks
  ├── state-persistence.ts — File-based state with crash recovery
  ├── template-loader.ts  — Template pack discovery and validation
  └── cli.ts              — Command-line interface
```

The engine currently operates as a sequential pipeline: load template → build
transition map → execute states → validate at gates → persist state. This is
correct and should be preserved.

---

## Evolution 1: Transition Hook System

### Problem

Higher layers (artifact registration, governance checks, observability capture)
need to react to engine events. Currently, the only extension point is the SSE
broadcast in `engine.ts`, which is tightly coupled to HTTP.

### Design

```typescript
// In engine.ts — add to EngineOptions
interface EngineHooks {
  beforeTransition?: ((
    from: string,
    to: string,
    context: SessionState
  ) => Promise<void>)[];
  afterTransition?: ((
    from: string,
    to: string,
    context: SessionState
  ) => Promise<void>)[];
  onGateResult?: ((state: string, result: GateResult) => Promise<void>)[];
  onError?: ((state: string, error: Error) => Promise<void>)[];
}

interface EngineOptions {
  store: Store;
  hooks?: EngineHooks;
  // ... existing options
}
```

### Behavior

1. `beforeTransition` hooks fire synchronously (in order) before the FSM
   advances. If any hook throws, the transition is aborted and the engine
   transitions to ERROR.
2. `afterTransition` hooks fire after the FSM has advanced and state is
   persisted. Failures are logged but do not roll back the transition.
3. `onGateResult` fires after every critic gate evaluation.
4. The existing SSE broadcast becomes an `afterTransition` hook, removing
   the coupling.

### Implementation

- Modify `engine.ts` to accept hooks in options
- Add hook invocation in the `run()` loop around `this.stateMachine.transition()`
- Convert SSE broadcast to a hook
- No changes to `state-machine.ts` — hooks wrap the engine's use of the FSM,
  not the FSM itself

### Migration Impact

- **Breaking changes**: None. Hooks are optional. Existing `createEngine()`
  calls continue to work without hooks.
- **Files changed**: `engine.ts` only
- **Lines added**: ~40

---

## Evolution 2: Write-Ahead Persistence

### Problem

The current persistence model writes state AFTER a transition completes. If
the process crashes during agent execution (after transition, before persist),
the next resume will replay the state from the previous checkpoint.

This is acceptable for the current use case (agents are idempotent), but becomes
problematic when adapters execute real side effects (e.g., `git push`,
`docker deploy`).

### Design

```
Current:  transition() → execute agent → persist state
Proposed: persist(INTENT) → transition() → execute agent → persist(COMPLETE)
```

Add a `transition_status` field to session state:

```json
{
  "current_phase": "PHASE_2",
  "transition_status": "IN_PROGRESS" | "COMPLETE",
  "transition_started_at": "2026-03-15T10:00:00Z"
}
```

### Behavior

1. Before executing, write `transition_status: "IN_PROGRESS"` + target state
2. Execute the agent
3. On success, write `transition_status: "COMPLETE"`
4. On resume, if `transition_status === "IN_PROGRESS"`, the engine knows the
   last agent execution may have partially completed

### Recovery Strategy

When resuming with `IN_PROGRESS`:

- **Default**: Re-execute the agent (current behavior — agents are idempotent)
- **With side effects**: Check adapter result cache (see Evolution 3) before
  re-executing
- **Manual override**: `--skip-current` CLI flag to advance past the stuck state

### Implementation

- Modify `state-persistence.ts` to write intent before transition
- Add `transition_status` to session state schema
- Modify engine resume logic to check status
- **Lines added**: ~25
- **Files changed**: `state-persistence.ts`, `engine.ts`

---

## Evolution 3: Adapter Result Cache

### Problem

When adapters execute side effects (creating branches, deploying containers),
a crash-and-resume should not blindly re-execute. The engine needs to know
whether the side effect already succeeded.

### Design

Append adapter execution results to a local result log:

```
BusinessDocs/session/adapter-results.jsonl
```

Each entry:

```json
{
  "timestamp": "2026-03-15T10:00:00Z",
  "adapter": "git",
  "operation": "create_branch",
  "params_hash": "sha256:abc123",
  "result": { "success": true, "data": { "branch": "feature/SP-1-001" } },
  "idempotency_key": "SP-1-001-create_branch"
}
```

### Behavior

1. Before executing an adapter operation, check the result log for a matching
   `idempotency_key`
2. If found and `success: true`, return the cached result
3. If found and `success: false`, re-execute (it failed last time)
4. If not found, execute and log

### Implementation

- New file: `platform/engine/adapter-result-cache.ts` (~80 lines)
- Integrate into the Tool Executor (Phase 4, Layer 5)
- Uses the existing append-only pattern from `audit.ts`

---

## Evolution 4: Parallel Workflow Branches (Future)

### Problem

The current FSM is strictly sequential. Some workflows have parallelizable
branches (e.g., Phase 2 and Phase 3 could run concurrently if they don't
have data dependencies).

### Design Principle

Do NOT convert the FSM to a DAG execution engine. Instead, allow specific
states to spawn child workflows that execute in parallel and join before
the next sequential state.

```
                    ┌─→ Child FSM A ─┐
Main FSM → FORK ──┤                  ├── JOIN → Main FSM continues
                    └─→ Child FSM B ─┘
```

### Why NOT Now

1. The current sequential model is correct for the defined workflows
2. Adding parallel execution requires solving: shared state, merge conflicts,
   error handling in one branch while another is running
3. The template manifest would need a `parallel_branches` declaration
4. The complexity cost is high for moderate benefit

### Prerequisites

- Transition hooks (Evolution 1) — needed for coordinating branch events
- Write-ahead persistence (Evolution 2) — needed for crash recovery of branches
- Adapter result cache (Evolution 3) — needed for branch isolation

### Recommendation

**Defer to Phase 10 (Implementation Roadmap) as a late-stage evolution.**
Design the data model now (FORK/JOIN states in the FSM), but do not implement.
The hook system provides the extension point when the time comes.

---

## Evolution 5: Enhanced Error Recovery

### Problem

The current error handling transitions to ERROR state and stops. Recovery
requires manual intervention (`--resume` flag). For a platform that runs
long workflows, this is fragile.

### Design

**Error classification**:

```typescript
enum ErrorSeverity {
  TRANSIENT = 'TRANSIENT', // Retry-eligible (network, timeout)
  RECOVERABLE = 'RECOVERABLE', // Skip-eligible (non-critical agent failure)
  FATAL = 'FATAL', // Halt required (state corruption, auth failure)
}
```

**Recovery strategy per severity**:
| Severity | Action |
| ----------- | --------------------------------------------------- |
| TRANSIENT | Retry with exponential backoff (max 3, base 2s) |
| RECOVERABLE | Log warning, mark state as DEGRADED, continue |
| FATAL | Transition to ERROR, persist, halt |

### Integration with Dispatcher

The dispatcher already has retry logic (max retries, timeout). Extend it:

- Parse agent/adapter errors to classify severity
- Apply backoff: `delay = baseDelay * 2^attempt` (capped at 30s)
- On RECOVERABLE, add a `degradation_log` entry to session state listing
  what was skipped and why
- On FATAL, add error diagnostics to session state for debugging

### Implementation

- Modify `dispatcher.ts` to add error classification and backoff
- Add `error_severity` and `degradation_log` to session state
- **Lines changed**: ~30 in dispatcher.ts
- **Backward compatible**: Existing error → ERROR transitions still work.
  Classification is additive.

---

## Evolution 6: Long-Running Workflow Support

### Problem

Real SDLC workflows span days or weeks. The current engine runs in a single
process invocation. The `--resume` flag handles crashes, but there is no
first-class concept of "pause and resume later."

### Design

**Workflow states become durable checkpoints**:

- Every successful state transition is a resumable checkpoint
- The engine can be stopped cleanly at any checkpoint
- A new engine instance can resume from the last checkpoint

This is already partially implemented (`--resume` reads `session-state.json`).
The evolution is:

1. **Explicit pause command**: `engine stop --checkpoint` cleanly shuts down
   the engine at the current state boundary.
2. **Scheduled execution**: The CLI can be invoked by cron or CI to process
   the next state and exit. Each invocation processes one state transition.
3. **Human-in-the-loop gates**: Certain states (governance, critic validation)
   can be configured to require explicit human continuation.

### Implementation

- Add `--single-step` CLI flag: process one transition, persist, exit
- Add `--wait-for-approval` integration with governance layer
- Modify engine `run()` loop to check for stop signals between states
- **Lines changed**: ~20 in engine.ts, ~10 in cli.ts
- **Uses**: Transition hooks from Evolution 1

---

## Summary of Engine Evolutions

| #   | Evolution                  | Priority | Dependencies | Effort |
| --- | -------------------------- | -------- | ------------ | ------ |
| E1  | Transition Hook System     | P0       | None         | Small  |
| E2  | Write-Ahead Persistence    | P0       | None         | Small  |
| E3  | Adapter Result Cache       | P1       | E2           | Small  |
| E4  | Parallel Workflow Branches | P3       | E1, E2, E3   | Large  |
| E5  | Enhanced Error Recovery    | P1       | None         | Small  |
| E6  | Long-Running Support       | P2       | E1           | Small  |

**Critical path**: E1 → E3 + E5 → E6. Everything except E4 is achievable
with small, targeted changes to existing files.

### Architectural Invariant

The FSM remains the core abstraction. None of these evolutions replace the
state machine — they wrap it with hooks, resilience, and durability.
The state machine is the simplest correct model for sequential workflow
execution, and the system should stay committed to it.
