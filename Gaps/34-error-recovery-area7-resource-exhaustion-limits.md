# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 7 - Resource Exhaustion & Limits

## 7A. Runtime Guardrails Present

[🟢 GOOD] RESOURCE LIMITING: `src/webapp/app.ts:78-79`  
 Scenario: slow/stalled HTTP requests.  
 Current handling: Fastify `requestTimeout=30000` and `keepAliveTimeout=5000`.  
 Risk reduction: prevents indefinite request pinning of workers.

[🟢 GOOD] RESOURCE LIMITING: `src/webapp/config.ts:232-240`  
 Scenario: long-running tool calls / oversized output.  
 Current handling: global execution caps (`TOOL_EXEC_MAX_TIMEOUT_MS`, `TOOL_EXEC_MAX_OUTPUT_BYTES`, `TOOL_EXEC_MAX_MEMORY_MB`).  
 Risk reduction: bounds per-tool resource consumption.

[🟢 GOOD] RESOURCE LIMITING: `platform/engine/dispatcher.ts:735-746`  
 Scenario: runaway orchestration attempts and over-parallelization.  
 Current handling: default timeout/retry/revision ceilings and bounded parallel concurrency (`maxConcurrency=3`).  
 Risk reduction: constrains fan-out and retry storms.

[🟢 GOOD] RESOURCE LIMITING: `src/webapp/routes/chat.ts:83`, `src/webapp/routes/chat.ts:866-867`  
 Scenario: tool-call feedback loop in chat provider mode.  
 Current handling: explicit round cap (`CHAT_LLM_TOOL_MAX_ROUNDS`, default 4).  
 Risk reduction: prevents infinite tool-loop recursion.

## 7B. Exhaustion Risks & Gaps

[🟠 HIGH] RESOURCE EXHAUSTION: `src/webapp/services/auto-orchestration.ts:213-225`  
 Scenario: command queue file grows unbounded under bursty command submission.  
 Current handling: file lock and serialize write, but no queue-size cap or retention cap.  
 Failure mode: disk growth + longer parse/write critical sections + degraded dispatch latency.  
 Fix: enforce max queue length and archive/trim completed entries.

[🟡 MEDIUM] RESOURCE EXHAUSTION: `platform/engine/jobs/memory-queue.ts:42-47`  
 Scenario: high background job load in memory provider mode.  
 Current handling: bounded concurrency but in-memory storage with no persistence or hard size limit.  
 Failure mode: memory pressure spikes and loss on restart.  
 Fix: configurable max queued jobs and provider-level backpressure response.

[🟡 MEDIUM] RESOURCE EXHAUSTION: `platform/engine/jobs/persistent-queue.ts:30-33`, `platform/engine/jobs/persistent-queue.ts:228-232`  
 Scenario: repeated failing jobs accumulate in DLQ.  
 Current handling: DLQ writes exist, but no retention/rotation policy in queue implementation.  
 Failure mode: storage bloat over long periods.  
 Fix: TTL or capped DLQ with export/rotation policy.

[🔵 LOW] RESOURCE EXHAUSTION: `src/webapp/sse-manager.ts:29-48`, `src/webapp/sse-manager-redis.ts:28-70`  
 Scenario: very large number of SSE clients.  
 Current handling: heartbeats and cleanup on close, but no hard server-side connection cap.  
 Failure mode: high open-socket pressure in overloaded scenarios.  
 Fix: max client connections per node + graceful refusal policy.

## 7C. Queue & Worker Behavior Under Load

- Persistent queue supports retries and dead-lettering: `platform/engine/jobs/persistent-queue.ts:151-180`, `platform/engine/jobs/persistent-queue.ts:228-232`.
- Memory queue retries transient failures with exponential backoff: `platform/engine/jobs/memory-queue.ts:108-123`, `platform/engine/jobs/memory-queue.ts:186-190`.
- Timeout enforcement exists in both queue implementations: `platform/engine/jobs/persistent-queue.ts:236-240`, `platform/engine/jobs/memory-queue.ts:193-201`.
- Global lock timeout for file-serialized operations exists: `src/webapp/file-lock.ts:6`, `src/webapp/file-lock.ts:23-26`.

## Area 7 Verdict

Resource controls are substantial at request/tool/dispatcher levels, but storage-growth controls are weaker. The principal exhaustion risk is not CPU runaway, but unbounded queue/DLQ accumulation in extended degraded operation.
