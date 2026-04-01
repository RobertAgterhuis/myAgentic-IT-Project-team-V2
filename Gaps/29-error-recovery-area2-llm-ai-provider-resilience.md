# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 2 - LLM & AI Provider Resilience

## 2A. LLM API Error Handling

[🟡 MEDIUM] LLM RESILIENCE: `platform/sdlc/adapters/providers/openai-llm.ts:289`  
 Failure scenario: upstream 429/503 pressure on completion/embedding calls.  
 Current handling: bounded retry with exponential backoff (`MAX_RETRIES=3`, base 1000ms).  
 Consequence: transient resilience exists, but no jitter and no dynamic provider budget protection.  
 Missing: jitter and retry-budget accounting per request/workflow.  
 Fix: add randomized backoff (full jitter) and per-request retry budget metadata.

[🟡 MEDIUM] LLM RESILIENCE: `platform/sdlc/adapters/providers/openai-llm.ts:289-301`  
 Failure scenario: non-retryable 401/400/403 errors.  
 Current handling: immediate failure after first attempt (correct), but error classification is string-based only.  
 Consequence: caller receives generic error text; weak programmatic branch behavior upstream.  
 Missing: normalized typed error taxonomy at provider boundary.  
 Fix: map HTTP status to typed `LLMErrorKind` consistently before throw.

[🟠 HIGH] LLM RESILIENCE: `src/webapp/routes/chat.ts:1305-1307`  
 Failure scenario: chat provider stream/tool call throws (timeout/network/provider failure).  
 Current handling: catch block records metric only.  
 Consequence: operator may not realize provider degraded; chat silently degrades to heuristic fallback text path.  
 Missing: explicit degraded-state response metadata and operator-facing warning.  
 Fix: return `provider_degraded=true` in API payload and SSE warning event with retry guidance.

[🟡 MEDIUM] LLM RESILIENCE: `src/webapp/routes/chat.ts:858-874`  
 Failure scenario: tool loop keeps requesting tools or hallucinates unstable tool flow.  
 Current handling: hard max rounds via `CHAT_LLM_TOOL_MAX_ROUNDS` default 4 and throws `TOOL_ROUND_LIMIT_EXCEEDED`.  
 Consequence: bounded runaway exists, but no adaptive repair prompt before hard fail.  
 Missing: tool-loop abort recovery message and structured retry path.  
 Fix: on round-limit breach, synthesize deterministic actionable response and emit diagnostics.

[⚪ INFO] LLM RESILIENCE: `platform/engine/runtime-adapter/profile.ts:9-13`  
 Failure scenario: provider fallback decision.  
 Current handling: regex-based fallback decision from message text.  
 Consequence: fragile classification; can mis-route fallback behavior.  
 Missing: typed error objects propagated from providers.  
 Fix: move from regex matching to structured error kinds (`RATE_LIMITED`, `AUTH_FAILURE`, etc.).

## 2B. LLM Response Validation

[🟡 MEDIUM] LLM RESILIENCE: `platform/engine/agent-runtime-adapter.ts:1112-1159`  
 Failure scenario: model output violates contract markers/sections.  
 Current handling: validation + repair prompt retries (`validationMaxRetries`, default 1).  
 Consequence: improves resilience for malformed output, but low retry budget can still leave hard failures.  
 Missing: differentiated handling for truncated vs semantically-invalid vs unsafe output.  
 Fix: classify validation findings and retry strategy by category.

[🟠 HIGH] LLM RESILIENCE: `src/webapp/routes/chat.ts:1266-1302`  
 Failure scenario: empty completion content or unusable output.  
 Current handling: falls back to streamed token concat or later `chatService` assistant synthesis.  
 Consequence: user can receive plausible but ungrounded fallback response without explicit trust downgrade.  
 Missing: response quality label and confidence downgrade marker.  
 Fix: include `response_origin: provider|fallback` and `grounding_quality` in response contract.

[🟡 MEDIUM] LLM RESILIENCE: `src/webapp/routes/chat.ts:796-843`  
 Failure scenario: hallucinated tool call name.  
 Current handling: `buildToolExecutionResult` returns unsupported tool error JSON.  
 Consequence: contained, but model may continue low-quality loops until round cap.  
 Missing: immediate tool schema correction message to model.  
 Fix: inject strict corrective assistant message when unknown tool appears.

## 2C. Token & Cost Runaway Protection

[🟠 HIGH] LLM RESILIENCE: `src/webapp/routes/chat.ts:69-77`, `src/webapp/routes/chat.ts:858-874`  
 Failure scenario: repeated chat retries and tool rounds inflate spend.  
 Current handling: per-request `maxTokens` and tool round cap only.  
 Consequence: no session/workflow spend ceiling; prolonged interactions can still over-consume budget.  
 Missing: per-session token and cost budget enforcement.  
 Fix: persist per-session token usage and reject/queue requests after budget threshold.

[🟡 MEDIUM] LLM RESILIENCE: `platform/engine/dispatcher.ts:1017-1020`, `platform/engine/dispatcher.ts:1330-1363`  
 Failure scenario: transient failure loops during invoke.  
 Current handling: bounded retries + exponential backoff.  
 Consequence: robust against infinite retries, but no global workflow token budget tie-in.  
 Missing: cost-aware retry gating.  
 Fix: include token-cost policy in retry decision hook.

## 2D. Provider Failover

[🔵 LOW] LLM RESILIENCE: `platform/engine/agent-runtime-adapter.ts:1085-1172`  
 Failure scenario: primary provider unavailable.  
 Current handling: fallback provider chain (`copilot`, `anthropic`, `openai`, `local`) with `shouldFallbackProvider`.  
 Consequence: strong resilience in runtime adapter path.  
 Missing: telemetry on which provider won and failover frequency SLOs.  
 Fix: add provider-failover counters and alerts.

[🟠 HIGH] LLM RESILIENCE: `src/webapp/routes/chat.ts:75-97`, `src/webapp/routes/chat.ts:1229-1307`  
 Failure scenario: chat-specific configured provider unavailable.  
 Current handling: no multi-provider failover in chat route; fallback is non-LLM response behavior.  
 Consequence: conversational quality and reliability drop during provider incidents.  
 Missing: chat-level provider fallback chain comparable to runtime adapter.  
 Fix: introduce provider registry fallback for chat route and expose active provider metadata.

## Area 2 Verdict

Core agent runtime has decent bounded retry/failover controls. Chat path is weaker: failures are often converted into silent degradation, with no strong user/operator signal, no cost caps per session, and no true multi-provider failover.
