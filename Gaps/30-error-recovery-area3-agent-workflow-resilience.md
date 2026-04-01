# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 3 - Agent Workflow Resilience

[🟠 HIGH] WORKFLOW RESILIENCE: `src/webapp/services/auto-orchestration.ts:287-338`  
 Scenario: queued command dispatch succeeds but first advance fails.  
 Workflow stage: command activation -> initial transition.  
 Current behavior: command marked ERROR and loop returns.  
 Expected behavior: classify failure + optional retry path with bounded attempts before terminal ERROR.  
 Data at risk: queued user intent and workflow momentum.  
 Fix: add staged retry policy for `advance` failures with failure reason categorization.

[🔴 CRITICAL] WORKFLOW RESILIENCE: `src/webapp/services/agent-execution-service.ts:684-701`, `platform/engine/dispatcher.ts:1542-1554`  
 Scenario: operator cancels an agent while underlying invocation is still running.  
 Workflow stage: active agent execution.  
 Current behavior: job status is marked cancelled locally, but cancellation is not propagated into dispatcher/runtime call path.  
 Expected behavior: cancellation token should terminate runtime invocation and tool subprocesses.  
 Data at risk: artifact integrity, duplicated writes, hidden side effects after "cancelled" state.  
 Fix: thread `AbortSignal` through dispatcher and runtime adapter/tool execution boundaries.

[🟡 MEDIUM] WORKFLOW RESILIENCE: `src/webapp/services/auto-orchestration.ts:693-697`  
 Scenario: transition already IN_PROGRESS when auto cycle runs.  
 Workflow stage: transition management.  
 Current behavior: cycle exits early, relying on future timer ticks.  
 Expected behavior: track transition age and detect stalled in-progress transitions.  
 Data at risk: long-lived stuck transitions with no active remediation.  
 Fix: add transition watchdog and escalate after threshold.

[🟠 HIGH] WORKFLOW RESILIENCE: `src/webapp/services/auto-orchestration.ts:213-220`, `src/webapp/services/auto-orchestration.ts:252-255`  
 Scenario: command queue JSON malformed or partially written.  
 Workflow stage: queue claim/finalize.  
 Current behavior: reader catches and returns empty list.  
 Expected behavior: fail-fast with quarantine/repair marker and operator alert.  
 Data at risk: dropped pending commands and orphaned processing state.  
 Fix: add queue schema validation + quarantine file + explicit alarm event.

[🟡 MEDIUM] WORKFLOW RESILIENCE: `src/webapp/services/auto-orchestration.ts:479-552`  
 Scenario: partial multi-agent execution in a state; some agents finish and one fails.  
 Workflow stage: per-state agent execution.  
 Current behavior: completed outputs persist; failure throws and command ends in ERROR.  
 Expected behavior: checkpoint captures partial completion and allows resume-from-last-success.  
 Data at risk: repeated compute work and duplicate side effects on re-run.  
 Fix: persist per-agent state checkpoint and provide resume endpoint.

[🟡 MEDIUM] WORKFLOW RESILIENCE: `src/webapp/routes/orchestrator.ts:1328-1519`  
 Scenario: workflow blocked by pending approvals in production profiles.  
 Workflow stage: gate transition.  
 Current behavior: hard 409 block with SSE event.  
 Expected behavior: includes explicit recovery action bundle (approval IDs and next operator actions).  
 Data at risk: operator time and run continuity.  
 Fix: enrich block response with direct actionable recovery payload.

[🔵 LOW] WORKFLOW RESILIENCE: `platform/engine/dispatcher.ts:997-1375`  
 Scenario: transient invocation failures and quality revision cycles.  
 Workflow stage: invoke + validation + self-revision.  
 Current behavior: bounded retry/backoff and revision attempts, with degraded result output.  
 Expected behavior: also expose machine-readable stop reason taxonomy to orchestrator/UI consistently.  
 Data at risk: operator clarity, not core data.  
 Fix: standardize stop reason propagation into orchestrator/session state.

### 3B. Agent Crash Recovery

- Workflow state is persisted in command/session files and queue status updates (`auto-orchestration.ts:223-281`, `orchestrator.ts:1535-1753`).
- No heartbeat for active per-agent process lifecycle beyond status checks/timers.
- Recovery exists for durable queue domains (`persistent-queue.ts:75-87`) but not for in-memory agent job store in `AgentExecutionService` (`agent-execution-service.ts:75-84`).

### 3C. Partial Output Handling

- Partial success is persisted (`auto-orchestration.ts:533-538`), but output completeness metadata is not explicit.
- No first-class "incomplete artifact" mark when interruption occurs mid-run.

### 3D. Poison Input Protection

- Input validation exists in route and schema layers; however, predecessor outputs are consumed broadly in context building (`dispatcher.ts:1808-1910`) with limited poison-message isolation.
- No dead-letter channel for repeatedly failing command queue entries in file-queue path.

### 3E. Workflow Timeout & Abandonment

- Dispatcher-level timeout exists (`dispatcher.ts:1542-1554`) and default timeout is configured (`dispatcher.ts:735`).
- No global end-to-end workflow timeout for full command lifecycle in auto-orchestration loop.
- Zombie workflow detection is partial (transition lease/checkpoint elsewhere), but no explicit stalled command sweeper in auto-orchestration file queue path.

## Area 3 Verdict

Workflow resilience is moderate: bounded retries and some recovery primitives exist, but cancellation semantics, queue corruption handling, and global stuck-workflow detection are not strong enough for production-grade autonomous pipelines.
