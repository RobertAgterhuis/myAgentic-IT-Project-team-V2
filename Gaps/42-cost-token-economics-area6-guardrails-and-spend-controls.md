# Area 6 - Cost Guardrails and Spend Controls

## Controls observed

- Context budgeter supports budget evaluation with bytes and optional cost limit fields (`costUsdLimit`, `consumedCostUsd`) and can return blocked mode: [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts#L49), [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts#L256).
- Runtime has token-budget sizing for context assembly: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L311).

## Critical control gaps

1. No strong evidence that `evaluateAgentBudget(...)` is enforced as a mandatory gate before all live LLM invocations.
2. No explicit global per-request or per-session hard USD kill switch in runtime and chat request paths.
3. No observed anomaly-triggered spend breaker (for sudden retry storms or tool-loop blowups).
4. No explicit monthly or workspace-level spend quotas in shown invocation paths.

## Governance maturity assessment

- Policy and guardrail primitives exist.
- Enforcement coverage appears incomplete for real spend containment.

## Risk equation

Let expected cost be $E[C]$ and tail multiplier be $M_{tail}$ from loops/retries:

$$
Tail\ Risk \sim E[C]\cdot M_{tail}\cdot (1-\text{enforcement coverage})
$$

With high $M_{tail}$ from Area 4, even moderate enforcement gaps produce disproportionate budget risk.

## Area 6 verdict

- The codebase contains building blocks for spend controls.
- End-to-end hard enforcement is not convincingly present at all call sites.
- Economic risk remains medium-high until mandatory preflight budget checks and emergency breakers are wired into every invocation path.
