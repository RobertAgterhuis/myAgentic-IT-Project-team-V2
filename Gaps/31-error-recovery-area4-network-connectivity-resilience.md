# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 4 - Network & Connectivity Resilience

[🟡 MEDIUM] NETWORK RESILIENCE: `src/webapp/app.ts:78-79`  
 Connection type: HTTP server request lifecycle  
 Failure scenario: slow upstream handlers and hanging requests  
 Current handling: Fastify request timeout 30000ms and keepAliveTimeout 5000ms  
 User experience during failure: request returns error instead of infinite hang  
 Fix: align per-route SLA timeouts and expose timeout reason codes in responses.

[🟠 HIGH] NETWORK RESILIENCE: `src/webapp/ui/src/lib/api-client.ts:86-132`  
 Connection type: frontend -> backend HTTP fetch  
 Failure scenario: backend unreachable/network stall  
 Current handling: no client-side timeout/AbortController in API wrapper  
 User experience during failure: browser fetch may hang longer than expected; recovery depends on browser/network stack  
 Fix: add request timeout + abort in API client with retry strategy for idempotent GETs.

[🟡 MEDIUM] NETWORK RESILIENCE: `src/webapp/auth.ts:907-971`, `src/webapp/auth.ts:1094-1170`  
 Connection type: backend -> external auth APIs  
 Failure scenario: DNS/TLS/network failure to GitHub/Entra  
 Current handling: throws and route-level catch redirects to auth_failed pages  
 User experience during failure: login fails with generic redirect code  
 Fix: add explicit timeout and retry for transient auth endpoint failures.

[🔵 LOW] NETWORK RESILIENCE: `src/webapp/plugins/mcp-governance/health-monitor.ts:76-83`  
 Connection type: backend -> MCP endpoint probe  
 Failure scenario: endpoint timeout  
 Current handling: `AbortSignal.timeout` and unhealthy status return  
 User experience during failure: internal status degradation only  
 Fix: include failing endpoint details in operator dashboards/alerts.

[🔵 LOW] NETWORK RESILIENCE: `src/webapp/routes/misc-health.ts:90-123`  
 Connection type: readiness probe dependencies  
 Failure scenario: Redis down/unhealthy  
 Current handling: readiness endpoint returns 503 with checks payload  
 User experience during failure: platform marked not ready for orchestrator infra  
 Fix: include remediation hints in readiness response.

## 4B. WebSocket / SSE / Streaming

[🔵 LOW] NETWORK RESILIENCE: `src/webapp/sse-manager.ts:34-40`, `src/webapp/sse-manager.ts:52-61`  
 Connection type: SSE backend manager  
 Failure scenario: client disconnect/write failure  
 Current handling: heartbeat and remove failed client  
 User experience during failure: client drops; requires reconnect from frontend  
 Fix: attach disconnect reason telemetry and per-client last-event id support.

[🟡 MEDIUM] NETWORK RESILIENCE: `src/webapp/sse-manager-redis.ts:90-100`  
 Connection type: SSE cross-instance pub/sub  
 Failure scenario: Redis publish failure during broadcast  
 Current handling: catch and ignore publish errors; local instance still receives event  
 User experience during failure: inconsistent state across instances, difficult to diagnose  
 Fix: raise degraded-cluster SSE event + metric/alarm on publish failure rate.

[🔵 LOW] NETWORK RESILIENCE: `src/webapp/ui/src/hooks/use-sse-events.ts:212-227`  
 Connection type: frontend EventSource  
 Failure scenario: connection drop mid-stream  
 Current handling: exponential backoff reconnect (capped 30s), connection status in store  
 User experience during failure: reconnecting state visible; eventual consistency through query invalidation  
 Fix: persist and use last-event-id replay semantics to reduce missed event windows.

## 4C. Frontend <-> Backend Communication

[🟡 MEDIUM] NETWORK RESILIENCE: `src/webapp/ui/src/hooks/use-sse-events.ts:184-209`  
 Failure scenario: duplicate/inconsistent event delivery during reconnects  
 Current handling: fingerprint dedup window of 5s  
 User experience during failure: reduced duplicate toasts/invalidation, but not exactly-once  
 Fix: use server-generated event ids and monotonic offset reconciliation.

[🟡 MEDIUM] NETWORK RESILIENCE: `src/webapp/routes/misc-observability.ts:201-218`  
 Failure scenario: SSE connection flood  
 Current handling: max SSE clients (50) with 503 response  
 User experience during failure: new clients rejected without queued retry guidance  
 Fix: return explicit retry-after and client-side adaptive reconnect policy for 503 SSE_LIMIT.

## Area 4 Verdict

Connectivity handling is solid in SSE reconnection and server request timeout basics, but client HTTP timeout control and cross-instance SSE failure signaling are still weak points that can create hidden partial outages.
