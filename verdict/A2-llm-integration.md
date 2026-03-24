# A2 — LLM Integration

**Dimension:** Agentic System Design — LLM Provider Integration  
**Score: 6 / 10**

---

## What Was Evaluated

Whether actual LLM API calls are made or stubbed. Which providers are supported. How prompts are constructed and sent. Whether token budgeting, rate-limit handling, and streaming are implemented.

---

## Findings

### 1. Real HTTP Calls via curl — No SDK Dependency

All LLM communication uses `shellExec('curl', ...)` — a deliberate architectural choice to avoid SDK lock-in. The implementation is in:

- `platform/sdlc/adapters/llm-adapter.ts` — unified entry point supporting `openai | azure-openai | anthropic | local | generic`
- `platform/sdlc/adapters/providers/openai-llm.ts` — concrete `OpenAILLMProvider` class
- `platform/sdlc/adapters/providers/anthropic-llm.ts` — concrete Anthropic provider
- `platform/sdlc/adapters/providers/copilot-llm.ts` — GitHub Copilot provider

Source: `llm-adapter.ts` lines 1–200, `openai-llm.ts` lines 1–80.

The curl-based approach means every LLM call produces an OS-level subprocess. This works but adds latency overhead (~10–30ms per call) compared to a Node.js HTTP client.

### 2. Three Production Providers Implemented

**OpenAI** (`providers/openai-llm.ts`):

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth: `OPENAI_API_KEY` env var, Bearer token
- Model: configurable, default `gpt-4o`
- Capabilities flagged: streaming✓, toolUse✓, embeddings✓, vision✓

**Azure OpenAI** (`llm-adapter.ts` lines 107–140):

- Endpoint: deployment-based URL `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`
- Auth: `AZURE_OPENAI_API_KEY`, `api-key` header
- Required env: `AZURE_OPENAI_API_KEY`, config `endpoint`, config `deployment`

**Anthropic** (`llm-adapter.ts` lines 142–183):

- Endpoint: `https://api.anthropic.com/v1/messages`
- Auth: `ANTHROPIC_API_KEY`, `x-api-key` header
- Handles system/non-system message split per Anthropic API contract
- Maps `input_tokens`/`output_tokens` → normalized `prompt_tokens`/`completion_tokens`

**GitHub Copilot** (`providers/copilot-llm.ts`):

- Separate provider for VS Code / GitHub hosted Copilot models

### 3. Rate-Limit Retry with Exponential Backoff — Real

Both `llm-adapter.ts` and `providers/openai-llm.ts` implement retry:

```
MAX_RETRIES = 3
BASE_DELAY_MS = 1000
delay = BASE_DELAY_MS * 2^attempt (exponential)
```

Retry triggers on HTTP 429 (rate limit). Source: `llm-adapter.ts` retry logic, `openai-llm.ts` lines 35–45.

### 4. Token Budget Enforcement — Real, Upstream

Token budgeting is handled **before** LLM invocation by `platform/engine/context-budgeter.ts` (94% line coverage). The budgeter ranks, summarizes, and truncates context to enforce a byte-level cap before the prompt is assembled. This is the correct place — the LLM adapter itself receives a pre-budgeted prompt.

### 5. LLM Provider Contract — Formally Typed

`platform/sdlc/adapters/contracts/llm-provider.ts` defines:

- `LLMProvider` interface with `complete()`, `embed()`, `stream()`, and `toolCall()` methods
- `LLMCapabilities` flags (streaming, toolUse, embeddings, vision)
- `CompletionInput`, `CompletionResult`, `TokenUsage`, `EmbeddingInput`, `EmbeddingResult`
- `ToolDefinition`, `ToolCall` for function calling support

The contract is typed. However:

**Gap 1** — Streaming is declared in the `LLMProvider` contract but whether `stream()` is wired to SSE delivery in the platform engine is not evident from the read code. The `AgentRuntimeAdapter` uses `complete()` calls; streaming appears to be capability-flagged but may not be exercised end-to-end.

**Gap 2** — `toolCall()` is in the contract. Tool-use (function calling) responses from the LLM are not visibly parsed in the dispatcher's response handler. The dispatcher calls `complete()` and gets back a text string — it does not appear to process `tool_calls` array responses from the LLM. This means the system uses LLMs for prose generation only, not for LLM-native tool-use (model decides → calls tool → observes result → continues).

### 6. LLM Adapter Coverage — Weak for Production Path

Source: `coverage-summary.json`:

- `llm-adapter.ts`: 61.94% lines, **42.34% branches** — the provider-specific code paths, especially Azure and Anthropic response parsing, have significant uncovered branches
- `providers/` files: not listed individually in the summary (they may be aliased under the registry)
- `agent-runtime-adapter.ts`: 64.23% lines, **50% branches** — the adapter that wraps provider invocation

---

## Strengths

1. **Three production providers implemented as real HTTP calls** — not mocked or stubbed behind a feature flag. OpenAI, Azure OpenAI, and Anthropic are all functional given API keys.
2. **Formal typed contract** — `llm-provider.ts` interface gives compile-time guarantees for new providers.
3. **No hardcoded API keys** — confirmed from both `llm-adapter.ts` and `openai-llm.ts`. All keys from environment variables.
4. **Retry on rate limit** — correct exponential backoff; does not retry on FATAL errors.
5. **Provider registration system** — `platform/sdlc/adapters/providers/index.ts` provides a registry pattern for adding new providers without modifying call sites.

---

## Weaknesses

1. **No end-to-end streaming** — The frontend has an SSE infrastructure (`/events` routes, SSE hooks) but LLM token-by-token streaming to the UI is not demonstrably wired. Users see completed responses, not live token streams.
2. **LLM tool-use not implemented** — The system invokes external tools (git, CI, security adapters) via its own tool executor, not via LLM function-calling. This is a valid design choice (orchestrator-driven vs model-driven tool use) but means the system cannot benefit from chain-of-thought tool orchestration within a single agent turn.
3. **curl subprocess per call** — Every LLM request spawns a shell process. Under load with concurrent sessions, this creates process table pressure. A Node.js HTTP client (`undici` or `node:http`) would be more efficient.
4. **42% branch coverage on llm-adapter.ts** — Provider-specific response parsing branches are not well-tested. Azure response parsing and Anthropic message format normalization are particularly undertested.
5. **No fallback / model routing** — No failover from OpenAI to Anthropic on provider failure. If `OPENAI_API_KEY` is absent, the run fails; no graceful degradation to local model.

---

## Recommended Improvements

1. Wire LLM streaming (`stream()` contract method) to SSE delivery for the agent execution endpoint — adds ~50 lines of plumbing but dramatically improves perceived responsiveness.
2. Add a `local` provider using Ollama or llama.cpp so the system can run fully offline — the config already has `provider: 'local'` as a valid value but the implementation returns `null`.
3. Replace `curl` subprocess with `undici` (Node.js stdlib since 18) for 20–30ms latency improvement per call and elimination of OS process overhead.
4. Add integration tests for Azure and Anthropic parsers using recorded HTTP fixtures to bring branch coverage above 80%.

---

## Source References

| File                                               | Lines Read                         | Key Finding                                                    |
| -------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `platform/sdlc/adapters/llm-adapter.ts`            | 1–200                              | Provider switching, curl impl, retry logic                     |
| `platform/sdlc/adapters/providers/openai-llm.ts`   | 1–80                               | OpenAI HTTP impl, capabilities                                 |
| `platform/sdlc/adapters/contracts/llm-provider.ts` | 1–60                               | Formal interface, tool-use contract                            |
| `platform/sdlc/adapters/providers/`                | dir listing                        | anthropic-llm, copilot-llm, openai-llm, docker, github, vitest |
| `coverage/coverage-summary.json`                   | llm-adapter, agent-runtime-adapter | Coverage gaps                                                  |
