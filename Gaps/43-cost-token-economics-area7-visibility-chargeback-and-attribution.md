# Area 7 - Cost Visibility, Attribution, and Chargeback Readiness

## Telemetry strengths

- Dispatcher captures provider/model/attempts and token usage fields per invocation log entry: [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts#L1052).
- Agent performance hook persists token-related fields into metrics store: [platform/engine/agent-performance-hook.ts](platform/engine/agent-performance-hook.ts#L99).
- Observability records prompt/completion/total tokens and aggregates by agent/provider/model: [platform/sdlc/observability.ts](platform/sdlc/observability.ts#L596), [platform/sdlc/observability.ts](platform/sdlc/observability.ts#L759).

## Attribution gaps

1. Metrics are token-centric, not direct currency-centric (USD not first-class in observability series here).
2. No explicit tenant/workspace/project chargeback dimensions in the core token metric labels shown.
3. No invoice reconciliation pathway evident between provider billing exports and internal invocation records.
4. No clear per-feature budget dashboard KPI in runtime path evidence.

## Chargeback readiness score

Scoring rubric (0-5):

- Token capture: 5
- Provider/model attribution: 4
- Currency normalization: 2
- Cost center tagging: 2
- Reconciliation/auditability: 2

Estimated readiness: 3.0/5 (operationally useful, financially incomplete).

## Conversion model to USD for reporting

Given aggregated tokens by provider/model:

$$
USD = \sum_{p,m}\left(\frac{T_{in,p,m}}{10^6}P_{in,p,m}+\frac{T_{out,p,m}}{10^6}P_{out,p,m}\right)
$$

This transformation is feasible with current token telemetry but requires maintained pricing tables and billing-time joins.

## Area 7 verdict

- Observability is strong enough for internal optimization loops.
- Finance-grade chargeback and audited COGS reporting still require explicit currency attribution and reconciliation controls.
