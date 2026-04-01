# Area 1 - LLM Call Inventory and Baseline Cost Math

## Scope and intent

This area inventories all observed LLM call surfaces, then provides formula-driven unit economics for expected and worst-case token spend.

## Evidence-backed call inventory

### 1) Web chat route runtime

- Chat provider configuration is driven by `CHAT_LLM_PROVIDER`, `CHAT_LLM_MODEL`, `CHAT_LLM_MAX_TOKENS` (default 1024), `CHAT_LLM_TEMPERATURE`, and `CHAT_LLM_TOOL_MAX_ROUNDS` (default 4): [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts#L78).
- Provider is resolved through registry with optional model/maxTokens override: [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts#L90).
- Tool-use loop in chat calls `provider.complete(...)` repeatedly until no tool calls or `maxRounds` is exceeded: [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts#L828).
- The same chat request then calls `provider.stream(...)` to deliver final answer tokens: [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts#L1250).

### 2) Agent runtime adapter path

- Runtime default fallback chain is `['copilot', 'anthropic', 'openai', 'local']`: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L235).
- Runtime adapter supports provider fallback and validation retries (`validationMaxRetries` default 1): [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L946).
- Invocation can call provider multiple times due to repair prompts and tool loop execution helper: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L1112), [platform/engine/runtime-adapter/tool-loop.ts](platform/engine/runtime-adapter/tool-loop.ts#L57).

### 3) Provider-level API calls

- OpenAI provider defaults to `gpt-4o`, maxTokens 4096, retries up to 3: [platform/sdlc/adapters/providers/openai-llm.ts](platform/sdlc/adapters/providers/openai-llm.ts#L30), [platform/sdlc/adapters/providers/openai-llm.ts](platform/sdlc/adapters/providers/openai-llm.ts#L84).
- Anthropic provider defaults to `claude-sonnet-4-20250514`, maxTokens 4096, retries up to 3: [platform/sdlc/adapters/providers/anthropic-llm.ts](platform/sdlc/adapters/providers/anthropic-llm.ts#L30), [platform/sdlc/adapters/providers/anthropic-llm.ts](platform/sdlc/adapters/providers/anthropic-llm.ts#L83).
- Copilot provider defaults to `copilot-chat`, maxTokens 4096, retries up to 3: [platform/sdlc/adapters/providers/copilot-llm.ts](platform/sdlc/adapters/providers/copilot-llm.ts#L30), [platform/sdlc/adapters/providers/copilot-llm.ts](platform/sdlc/adapters/providers/copilot-llm.ts#L81).

### 4) Additional LLM adapter surfaces

- Generic LLM adapter exposes `prompt`, `analyze-code`, `generate-docs`, `review-architecture`, `generate-tests` operations and applies retry logic on provider calls: [platform/sdlc/adapters/llm-adapter.ts](platform/sdlc/adapters/llm-adapter.ts#L16), [platform/sdlc/adapters/llm-adapter.ts](platform/sdlc/adapters/llm-adapter.ts#L238).

### 5) Embeddings surface

- OpenAI embeddings exist in provider layer (`/v1/embeddings`) and consume token-metered calls: [platform/sdlc/adapters/providers/openai-llm.ts](platform/sdlc/adapters/providers/openai-llm.ts#L149).
- Current webapp RAG embedding provider is local by default and OpenAI backend is explicitly not implemented there: [src/webapp/services/rag/embedding-provider.ts](src/webapp/services/rag/embedding-provider.ts#L83).

## Baseline call-count model

Define:

- $R_t$ = transient retry count (provider/API retries)
- $R_v$ = validation retries
- $R_u$ = tool rounds
- $C$ = number of parallel agents active in a state

Approximate LLM call count per runtime invocation:

$$
N_{calls} \approx (1 + R_v) \times (1 + R_u) \times (1 + R_t)
$$

For chat route, expected call count is:

$$
N_{chat} \approx 1\text{ (stream final)} + (1 + R_u)\text{ complete calls in tool loop path}
$$

## Token-cost formula (provider-neutral)

Let price per 1M input tokens be $P_{in}$, output be $P_{out}$.
If one call consumes $(T_{in}, T_{out})$ tokens:

$$
Cost_{call} = \frac{T_{in}}{10^6}P_{in} + \frac{T_{out}}{10^6}P_{out}
$$

Then per invocation:

$$
Cost_{invocation} \approx N_{calls} \times Cost_{call}
$$

And state-level parallel fanout:

$$
Cost_{state} \approx C \times Cost_{invocation}
$$

## Numeric scenario framing (for immediate budgeting)

Use these conservative placeholders until finance plugs contract rates:

- Scenario A: $P_{in}=5$, $P_{out}=15$ (USD per 1M)
- Representative call: $T_{in}=6{,}000$, $T_{out}=1{,}500$

Then:

$$
Cost_{call}=\frac{6000}{10^6}5 + \frac{1500}{10^6}15 = 0.0525
$$

(~$0.053/call)

If runtime reaches $(R_v=1, R_u=4, R_t=1)$:

$$
N_{calls}=(1+1)(1+4)(1+1)=20
$$

$$
Cost_{invocation}\approx 20\times 0.0525=1.05
$$

If a phase runs at concurrency $C=3$ (dispatcher default cap): [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts#L746)

$$
Cost_{state}\approx 3\times 1.05=3.15
$$

per parallel wave.

## Area 1 verdict

- LLM spend exposure is structurally multi-layered (chat route, runtime adapter, generic adapter).
- Retries, tool loops, validation loops, and fallback mechanics multiply effective calls non-linearly.
- A finance-grade baseline can be produced now using formula inputs already available from telemetry fields and configuration constants.
