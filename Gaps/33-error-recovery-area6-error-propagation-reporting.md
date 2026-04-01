# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 6 - Error Propagation & Reporting

## 6A. Error Handling Patterns

Source: repository-wide scripted pass over `src/**/*.ts(x)` catch blocks (excluding dist/coverage), plus manual verification of high-impact routes/services.

| Pattern                                                         |                           File Count | Locations                                                                                                                                     | Assessment                                                                   |
| --------------------------------------------------------------- | -----------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Empty catch blocks (swallow errors silently)                    |                                    0 | Not detected in scripted pass                                                                                                                 | Good baseline, but many non-empty catches still suppress operational signal. |
| Catch-and-log-only (no recovery, no rethrow)                    |                            ~94 sites | `src/webapp/server.ts`, `src/webapp/routes/orchestrator.ts`, `src/webapp/routes/auth.ts`                                                      | Common pattern; helps observability but often does not recover.              |
| Catch-and-rethrow (proper propagation)                          |                             ~4 sites | `src/webapp/file-lock.ts:31-34`, provider runtime paths                                                                                       | Rare but strong when used.                                                   |
| Catch with recovery logic (retry/fallback/default)              |          ~3 clearly-classified sites | `platform/sdlc/adapters/providers/openai-llm.ts:289-301`, `src/webapp/ui/src/hooks/use-sse-events.ts:212-227`                                 | Present but sparse relative to failure surface.                              |
| Catch with user notification                                    |                            ~24 sites | `src/webapp/routes/*.ts`, UI hooks with toasts                                                                                                | Better user transparency in many HTTP paths.                                 |
| No error handling at all (likely-silent catch/no-signal bucket) | ~109 likely-silent sites (heuristic) | hotspots: `src/webapp/mcp-server.ts`, `src/webapp/routes/orchestrator.ts`, `src/webapp/routes/workspaces.ts`                                  | Needs triage; not all are severe, but volume is high.                        |
| Global error handler / error boundary                           |          backend: yes, frontend: yes | `src/webapp/app.ts:247-266`, `src/webapp/server.ts:1112`, `src/webapp/ui/src/components/ui/empty-state.tsx`                                   | Foundation exists.                                                           |
| Custom error classes with context                               |                                  yes | `src/webapp/services/decisions-service.ts`, `src/webapp/services/auto-orchestration.ts:91`, `src/webapp/plugins/mcp-governance/service.ts:76` | Strong pattern where applied.                                                |

## 6B. Error Reporting to Users

[🟡 MEDIUM] ERROR REPORTING: `src/webapp/app.ts:247-266`  
 Scenario: unhandled route exception.  
 Current handling: global handler maps status/code and returns JSON error body.  
 User experience: consistent API error shape.  
 Debug information available: request log has server-side details for 5xx (`request.log.error`).  
 Fix: include correlation id in response payload and logs.

[🟠 HIGH] ERROR REPORTING: `src/webapp/routes/chat.ts:1305-1307`  
 Scenario: provider failure in chat LLM path.  
 Current handling: metric increment only; no direct operator-facing warning of provider degradation.  
 User experience: receives fallback assistant output without explicit degraded-state message.  
 Debug information available: limited metric signal, no error detail at this catch site.  
 Fix: log structured error + expose degraded status in API response.

[🔵 LOW] ERROR REPORTING: `src/webapp/ui/src/hooks/use-sse-events.ts:212-227`  
 Scenario: SSE disconnect/reconnect cycle.  
 Current handling: store connection status and backoff metadata; no explicit toast for connectivity loss by default.  
 User experience: subtle unless user inspects connection indicators.  
 Debug information available: client state includes attempt and next retry timestamp.  
 Fix: optional non-intrusive connectivity banner after prolonged disconnect.

## 6C. Error Logging & Observability

[⚪ INFO] ERROR REPORTING: `src/webapp/middleware.ts:17-33`  
 Scenario: structured logging baseline.  
 Current handling: JSON lines with timestamp/level/message/fields.  
 User experience: indirect.  
 Debug information available: good machine-readable logs but no built-in cross-service correlation id propagation.  
 Fix: generate request-scoped trace IDs and thread through SSE, queue, and LLM invocations.

[🟡 MEDIUM] ERROR REPORTING: `src/webapp/server.ts:1109-1113`  
 Scenario: unhandled promise rejection.  
 Current handling: logs error string only.  
 User experience: none.  
 Debug information available: minimal context; may miss stack/operation metadata.  
 Fix: include stack, operation context, and related request/session ids.

[⚪ INFO] ERROR REPORTING: `src/webapp/routes/misc-observability.ts:220-258`  
 Scenario: runtime metrics and per-endpoint counters.  
 Current handling: metrics endpoint available, but no threshold-based alerting in-app for spikes beyond selected control-plane checks.  
 User experience: none unless dashboards watched.  
 Debug information available: useful pull-based metrics.  
 Fix: add active alert hooks for failure-rate and degradation thresholds.

## 6D. Error Boundary Architecture

- Backend global route boundary: `src/webapp/app.ts:247-266`.
- Backend process-level handlers: `src/webapp/server.ts:1109-1114`.
- Frontend Error Boundary exists and tested: `src/webapp/ui/src/components/ui/empty-state.test.tsx:68-76`.
- Async background loops rely on interval `void` calls and local catches (`src/webapp/server.ts:1038-1054`), which can hide repeated background loop failure patterns without dedicated alerting.

## Area 6 Verdict

Error boundaries exist and are broad, but recovery actions and operator-visible diagnostics are uneven. The biggest risk is not missing catch blocks, but catch blocks that convert hard failures into low-visibility degradation.
