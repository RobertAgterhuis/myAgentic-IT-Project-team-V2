# ADR-M31-001: UI-Triggered Agent Execution

- **Status:** Accepted
- **Date:** 2026-03-18
- **Milestone:** M31
- **Deciders:** Robert Agterhuis

## Context

The SDLC platform orchestrates 39 specialized agents through an automated state machine
(`platform/engine/engine.ts` → `state-machine.ts` → `dispatcher.ts`). Currently agents
can only be invoked as part of a full phase transition via `POST /api/orchestrator/advance`.

Users need the ability to:

1. Execute a specific agent on demand from the UI, without advancing the state machine.
2. Re-run a failed agent without replaying the full phase.
3. Monitor real-time execution status of a manually-triggered agent.
4. Provide optional context overrides (predecessor paths, questionnaire path) per execution.

## Decision

Introduce a **UI-triggered agent execution** capability that wraps the existing
`Dispatcher.invoke()` method behind a new HTTP endpoint and React UI components.

### Architecture

```
UI (AgentExecuteModal) → POST /api/agents/:id/execute
                              ↓
                     AgentExecutionService
                              ↓
                       Dispatcher.invoke()
                              ↓
                  SSE → agent_execution_start / _complete / _failed
```

### Components

| Layer     | File                                        | Purpose                              |
| --------- | ------------------------------------------- | ------------------------------------ |
| Schema    | `route-schemas.ts`                          | `agentExecute` JSON Schema           |
| Service   | `services/agent-execution-service.ts`       | Business logic, dispatcher wrapper   |
| Route     | `routes/agents.ts`                          | `POST /api/agents/:id/execute`       |
| Types     | `ui/src/lib/api-types.ts`                   | Request/response TypeScript types    |
| Hook      | `ui/src/hooks/use-agents.ts`                | `useExecuteAgent()` mutation hook    |
| Component | `ui/src/components/agent-execute-modal.tsx` | Execution dialog with context inputs |
| Page      | `ui/src/pages/agents/agents-page.tsx`       | "Execute" button on agent cards      |
| SSE       | `ui/src/hooks/use-sse-events.ts`            | Handle agent*execution*\* events     |

### Endpoint Contract

```
POST /api/agents/:id/execute
Body: { context?: { predecessorPaths?: string[], questionnairePath?: string } }
Response 200: { ok: true, execution: { agent_id, status, started_at, job_id? } }
Response 400: { ok: false, code: '...', error: '...' }
Response 404: { ok: false, code: 'NOT_FOUND', error: '...' }
```

### SSE Events

- `agent_execution_start` — emitted when execution begins
- `agent_execution_complete` — emitted on success
- `agent_execution_failed` — emitted on failure

## Consequences

- Users can re-run individual agents without state machine side effects.
- The existing dispatcher retry/timeout/logging logic is reused.
- Session tracker records manual executions for audit trail.
- No changes to the state machine or automated flow.

## Alternatives Considered

1. **Job Queue Approach** — Use `Dispatcher.enqueueInvocation()` with the M24 job queue.
   Rejected: adds complexity; direct invoke is simpler for v1.
2. **State Machine Override** — Add a "manual" mode to the state machine.
   Rejected: violates state machine integrity and introduces edge cases.
