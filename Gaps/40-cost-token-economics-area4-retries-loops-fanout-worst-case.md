# Area 4 - Retries, Loops, Fan-out, and Worst-Case Spend

## Multipliers observed in code

- Provider-layer retries up to 3 in OpenAI/Anthropic/Copilot implementations: [platform/sdlc/adapters/providers/openai-llm.ts](platform/sdlc/adapters/providers/openai-llm.ts#L30), [platform/sdlc/adapters/providers/anthropic-llm.ts](platform/sdlc/adapters/providers/anthropic-llm.ts#L30), [platform/sdlc/adapters/providers/copilot-llm.ts](platform/sdlc/adapters/providers/copilot-llm.ts#L30).
- Dispatcher transient retries and revision attempts create additional full invocations: [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts#L1017).
- Runtime validation retries can re-call completion path: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L1112).
- Tool loop can iterate until max rounds (default 4 in helper): [platform/engine/runtime-adapter/tool-loop.ts](platform/engine/runtime-adapter/tool-loop.ts#L33).
- Parallel fan-out constrained by dispatcher maxConcurrency default 3: [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts#L746).

## Worst-case invocation expansion

Let:

- $r_p$ provider retry factor
- $r_d$ dispatcher invocation retry/revision factor
- $r_v$ validation factor
- $r_u$ tool-round factor
- $c$ concurrency factor

Upper-envelope expansion:

$$
M_{worst} \approx r_p\cdot r_d\cdot r_v\cdot r_u\cdot c
$$

Where illustrative factors from defaults can imply:

- $r_p\approx4$ (initial + 3 retries)
- $r_v\approx2$ (initial + 1 validation retry)
- $r_u\approx5$ (initial + up to 4 rounds)
- $c\approx3$ in parallel state

Even before dispatcher re-invocation effects:

$$
M_{partial}=4\cdot2\cdot5\cdot3=120
$$

relative to a naive single-call mental model.

## Dollarized stress scenario

If single baseline call-equivalent cost is $0.03$:

$$
Cost_{stress}\approx 120\cdot0.03 = 3.60
$$

for one high-amplification execution wave.

## Operational implication

- P95/P99 cost can diverge far from average if looped flows are not explicitly budget-capped at the orchestration layer.
- Engineering intuition based on "one request = one model call" is economically invalid for this architecture.

## Area 4 verdict

- Multiple independent amplification mechanisms stack multiplicatively.
- Strong need for global per-request spend ceilings and loop-aware kill criteria to contain tail-cost events.
