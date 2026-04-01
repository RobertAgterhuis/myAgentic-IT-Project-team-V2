# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 1 - Failure Point Inventory

## 1A. External Dependency Failures

DEPENDENCY: OpenAI Chat Completions API  
 Type: LLM API  
 Called from: `platform/sdlc/adapters/providers/openai-llm.ts:122`, `platform/sdlc/adapters/providers/openai-llm.ts:192`  
 Failure modes: timeout, 429 rate limit, 503 upstream failure, 401/403 auth failure, malformed JSON, stream body missing  
 Error handling at call site: retry in `_callWithRetry` for 429/503 only; stream path throws on non-2xx  
 Recovery mechanism: bounded retry (3) with exponential backoff, fallback to `complete()` when stream body missing (`openai-llm.ts:212`)  
 User notification: propagated to higher layers; no direct end-user notification at provider level

DEPENDENCY: OpenAI Embeddings API  
 Type: LLM API / embeddings  
 Called from: `platform/sdlc/adapters/providers/openai-llm.ts:163`  
 Failure modes: timeout, 429/503, malformed response, auth errors  
 Error handling at call site: same `_callWithRetry` path  
 Recovery mechanism: bounded retry only for 429/503  
 User notification: surfaced upstream as failure

DEPENDENCY: GitHub OAuth + GitHub user APIs  
 Type: external API / auth provider  
 Called from: `src/webapp/auth.ts:907`, `src/webapp/auth.ts:943`, `src/webapp/auth.ts:961`  
 Failure modes: network failure, 4xx/5xx auth exchange failure, malformed response  
 Error handling at call site: throws on non-OK and missing token  
 Recovery mechanism: none (no retry/backoff/timeout wrappers)  
 User notification: redirect with auth_failed in auth routes (`src/webapp/routes/auth.ts:321`, `src/webapp/routes/auth.ts:467`)

DEPENDENCY: Microsoft Entra token endpoints  
 Type: external API / auth provider  
 Called from: `src/webapp/auth.ts:1094`, `src/webapp/auth.ts:1164`  
 Failure modes: token exchange failure, missing token payload, network failure  
 Error handling at call site: throws on non-OK/missing token  
 Recovery mechanism: none  
 User notification: redirect with auth_failed (`src/webapp/routes/auth.ts:467`)

DEPENDENCY: Redis (SSE pub/sub, readiness, sessions in redis mode)  
 Type: cache / broker / session backing store  
 Called from: `src/webapp/redis.ts:16`, `src/webapp/sse-manager-redis.ts:34`, `src/webapp/routes/misc-health.ts:107`  
 Failure modes: connection failure, ping failure, pub/sub subscribe/publish errors  
 Error handling at call site: many catches, including silent catches in SSE pub/sub setup (`src/webapp/sse-manager-redis.ts:34`, `src/webapp/sse-manager-redis.ts:98`)  
 Recovery mechanism: local-only SSE delivery fallback if publish fails (`src/webapp/sse-manager-redis.ts:90-100`)  
 User notification: none for pub/sub peer-delivery failures

DEPENDENCY: Local filesystem for command queue and session state  
 Type: file system  
 Called from: `src/webapp/services/auto-orchestration.ts:215-225`, `src/webapp/services/commands-service.ts:118-122`, `src/webapp/file-lock.ts:12-41`  
 Failure modes: partial write, JSON corruption, lock timeout, disk full, permission issues  
 Error handling at call site: broad catch in queue readers returning empty array (`auto-orchestration.ts:213-220`)  
 Recovery mechanism: per-file lock with timeout (`file-lock.ts:6`, `file-lock.ts:25`)  
 User notification: often indirect; corruption may appear as missing queue entries

DEPENDENCY: RAG index storage (SQLite + LanceDB)  
 Type: database + vector store  
 Called from: `src/webapp/server.ts:111-121`, `src/webapp/server.ts:691-723`  
 Failure modes: stale index, sync failures, missing source paths  
 Error handling at call site: catches and logs warning, metrics increment (`server.ts:723`)  
 Recovery mechanism: periodic self-heal pass and file-watch-triggered pass (`server.ts:632-712`)  
 User notification: no direct user notification on background heal failures

DEPENDENCY: MCP server endpoints in health monitor  
 Type: external API / service registry endpoint  
 Called from: `src/webapp/plugins/mcp-governance/health-monitor.ts:76`  
 Failure modes: timeout, connection failure, non-OK status  
 Error handling at call site: catch returns unhealthy boolean (`health-monitor.ts:82`)  
 Recovery mechanism: periodic retry at interval (`health-monitor.ts:29-43`)  
 User notification: none; operational logs only

## 1B. Internal Component Failures

COMPONENT: Auto-orchestration coordinator  
 Defined in: `src/webapp/services/auto-orchestration.ts:106`  
 Can fail when: queue JSON invalid, lock timeout, orchestrator endpoint returns >=400, agent execution fails (`auto-orchestration.ts:520-528`)  
 Error boundary: partially contained, but failures can flip queued command to ERROR and halt automation loop (`auto-orchestration.ts:709-747`)  
 Blast radius: command pipeline stalls, no automatic progression, failed command backlog

COMPONENT: Dispatcher invoke loop  
 Defined in: `platform/engine/dispatcher.ts:997`  
 Can fail when: runtime adapter throws, TIMEOUT wrapper fires (`dispatcher.ts:1542-1554`), contract validation fails, retries exhausted  
 Error boundary: contained to invocation result object, but downstream orchestrator may stall/loop on repeated failure  
 Blast radius: failed agent outputs, degraded phase progression, possible repeated retrials and token burn

COMPONENT: Provider-backed runtime adapter  
 Defined in: `platform/engine/agent-runtime-adapter.ts:912`  
 Can fail when: provider selection fails, fallback chain exhausted (`agent-runtime-adapter.ts:1085-1172`), contract validation retries exhausted (`agent-runtime-adapter.ts:1112-1159`)  
 Error boundary: errors bubble to dispatcher, then orchestration/services  
 Blast radius: agent phase cannot produce artifact, may cascade to gate failures

COMPONENT: Chat route orchestration + tool loop  
 Defined in: `src/webapp/routes/chat.ts:1188`  
 Can fail when: provider unavailable, tool loop round limit exceeded (`chat.ts:867`), governance tool queries throw  
 Error boundary: broad catch for provider block only records a metric (`chat.ts:1305-1307`)  
 Blast radius: assistant response quality degrades silently to non-LLM fallback path

COMPONENT: SSE manager and UI SSE hook  
 Defined in: `src/webapp/sse-manager.ts:25`, `src/webapp/ui/src/hooks/use-sse-events.ts:154`  
 Can fail when: connection drops, EventSource missing, reconnection repeatedly errors  
 Error boundary: mostly contained; UI reconnect loop with exponential backoff (`use-sse-events.ts:216-227`)  
 Blast radius: stale frontend state and delayed user awareness of backend progress

COMPONENT: Persistent queue  
 Defined in: `platform/engine/jobs/persistent-queue.ts:55`  
 Can fail when: storage unavailable, fail called outside running state, timeout callback throws asynchronously (`persistent-queue.ts:236`)  
 Error boundary: partial; async timeout call in `_startTimeout` is not awaited/caught explicitly  
 Blast radius: unhandled async rejection risk, queue health degradation

## 1C. Failure Dependency Chains

CHAIN: Redis outage -> Redis SSE publish fails -> local node still updates but peer nodes miss events -> multi-instance UI desynchronizes  
 Evidence: `src/webapp/sse-manager-redis.ts:90-100`

CHAIN: Command queue JSON corruption -> `readCommandQueueUnsafe` returns [] -> dispatcher sees no processing command -> auto cycle idles silently  
 Evidence: `src/webapp/services/auto-orchestration.ts:213-220`, `src/webapp/services/auto-orchestration.ts:703-706`

CHAIN: LLM provider stream/complete failure in chat -> catch only emits metric -> chat falls back to non-provider message synthesis -> operator gets low-fidelity guidance without explicit outage signal  
 Evidence: `src/webapp/routes/chat.ts:1305-1307`, `src/webapp/services/chat-service.ts:175-182`

CHAIN: Runtime adapter fails contract validation after retries -> dispatcher marks failure/degraded -> orchestrator gate remains blocked -> command finalized ERROR -> user has to manually intervene  
 Evidence: `platform/engine/agent-runtime-adapter.ts:1112-1159`, `platform/engine/dispatcher.ts:1330-1363`, `src/webapp/services/auto-orchestration.ts:709-747`

CHAIN: Orchestrator status endpoint returns 401/500 in auto-cycle -> `getOrchestratorStatusForAutoRun` returns null -> no progression -> queued command remains PROCESSING/PENDING until manual action  
 Evidence: `src/webapp/services/auto-orchestration.ts:429-440`, `src/webapp/services/auto-orchestration.ts:693-697`

### 3 Longest Chains

1. Provider/contract failure chain: provider failure -> runtime adapter fallback/retry exhaustion -> dispatcher failure/degraded -> orchestrator blocked/ERROR -> command queue ERROR -> user manual recovery.
2. Status polling chain: orchestrator status fetch failure -> auto-cycle exits early -> no advance -> processing command not finalized -> no completion signal to UI/operators.
3. Queue corruption chain: command queue parse failure -> empty queue semantics -> dispatch inactivity -> no agent execution -> stale orchestrator session and user uncertainty.

### 3 Most Connected Failure Points

1. `src/webapp/services/auto-orchestration.ts` (dispatch loop, command finalization, gate integration).
2. `platform/engine/dispatcher.ts` (central invoke/retry/timeout/failure classification).
3. `src/webapp/routes/orchestrator.ts` (state transitions, session lifecycle, human override controls).

## Area 1 Verdict

The system has many explicit try/catch boundaries, but several high-connectivity failure points rely on best-effort behavior and silent fallbacks, which increases risk of latent pipeline stalls and operator confusion.
