# Pattern 12: Exception Handling and Recovery

Current score: 9.9/10
Target score: 9.9/10

## Assessment

The repository takes failure modes seriously with fail-closed behavior, bounded retries, fallback providers, graceful degradation, and session recovery. Failure taxonomy from M1 provides structured error classification and remediation dashboards. Capability-based fallback and budget-aware blocking from M4 add further auto-recovery and graceful degradation paths at the dispatch level.

## Evidence

- The README states that production mode is designed to fail closed when required providers are unavailable. Source: README.md:78-81.
- The architecture overview documents graceful degradation for Redis, BullMQ, and SQLite when external services are unavailable. Source: docs/architecture/overview.md:121, docs/architecture/overview.md:177, docs/architecture/overview.md:199-204.
- The chat tool loop throws TOOL_ROUND_LIMIT_EXCEEDED after the configured limit. Source: src/webapp/routes/chat.ts:840.
- The runtime adapter tool loop also enforces TOOL_ROUND_LIMIT_EXCEEDED with maxToolRounds. Source: platform/engine/runtime-adapter/tool-loop.ts:46, platform/engine/runtime-adapter/tool-loop.ts:71-72.
- Runtime provider logic includes shouldFallbackProvider and provider fallback exhaustion handling. Source: platform/engine/agent-runtime-adapter.ts:45, platform/engine/agent-runtime-adapter.ts:1139-1149.
- The Orchestrator defines a session recovery protocol for CONTINUE, including corrupted or incomplete runs. Source: templates/sdlc/agents/00-orchestrator.md:598-649.
- A structured failure taxonomy now classifies exceptions into distinct categories with tracked remediation effectiveness, creating systematic error-pattern dashboards and playbook links. Source: platform/engine/failure-taxonomy.ts:88-120, src/webapp/routes/intelligence-loop.ts:169-207.
- Capability-based fallback in the dispatcher provides automatic agent-level recovery: when the preferred agent is unavailable, a compatible substitute is selected without surfacing the failure to the caller. Source: platform/engine/dispatcher.ts (resolveCapabilityAssignment).
- Budget-aware blocking provides graceful degradation at the resource level: agents whose estimated execution would exceed available token, cost, or time budget are blocked with a clear reason, while near-budget agents proceed in fast-path mode. Source: platform/engine/dispatcher.ts (\_runBoundedGroup, \_dispatchStateSequential), platform/engine/context-budgeter.ts (evaluateAgentBudget).
- Bounded auto-apply uses a reversibleUntil window on every automatically applied change, providing a compensating rollback mechanism for adaptive policy modifications. Source: platform/engine/proactive-discovery-optimization.ts (autoApplyAdaptivePolicyProposal).

## Remaining Refinements

- Compensating transactions for broad multi-file or multi-tool governed operations remain a future increment.
- Auto-remediation suggestions from historical recovery success are partially delivered via failure taxonomy but could be further automated.

## Audit Verdict

Exception handling is strong, diagnostically rich, and now includes automatic fallback recovery at the agent level. The failure taxonomy, capability fallback, budget degradation model, and reversible auto-apply together cover the principal exception management gaps. Target state is achieved.
