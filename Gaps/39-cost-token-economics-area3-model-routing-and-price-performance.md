# Area 3 - Model Routing and Price-Performance

## Routing architecture evidence

- Runtime resolves primary provider and can fall back across ordered providers on failure: [platform/sdlc/adapters/registry.ts](platform/sdlc/adapters/registry.ts#L177).
- Default runtime fallback ordering includes commercial providers and local fallback: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L235).
- Registry auto-registration exposes OpenAI, Anthropic, Copilot, Local providers: [platform/sdlc/adapters/registry.ts](platform/sdlc/adapters/registry.ts#L341).

## Price-performance concerns

1. Routing is resilience-oriented, not price-aware.
2. No observed policy that selects model tier by task complexity, latency target, or budget pressure.
3. Fallback can move work into higher-cost model classes without cost gate checks.

## Unit economics comparator

For two candidate models A and B:

$$
Cost_A = \frac{T_{in}}{10^6}P_{in,A}+\frac{T_{out}}{10^6}P_{out,A}
$$

$$
Cost_B = \frac{T_{in}}{10^6}P_{in,B}+\frac{T_{out}}{10^6}P_{out,B}
$$

Savings from routing B instead of A for share $s$ of calls:

$$
Savings = N\cdot s\cdot (Cost_A-Cost_B)
$$

## Sensitivity example

Suppose higher-tier call cost $0.06$ and lower-tier call cost $0.02$:

- Delta per call = $0.04$
- If 200k calls/month can be demoted for 35% of traffic:
  $$
  Savings = 200000\cdot0.35\cdot0.04 = 2800\text{ USD/month}
  $$

## Routing maturity scorecard

- Provider fallback availability: strong.
- Cost-aware policy routing: weak.
- Dynamic downgrade during budget stress: not evidenced.
- Task-level model classes (draft/review/critical): not evidenced.

## Area 3 verdict

- The platform has robust provider failover plumbing.
- It does not yet show an explicit price-performance router, which leaves recurring savings unrealized and introduces cost unpredictability during failover events.
