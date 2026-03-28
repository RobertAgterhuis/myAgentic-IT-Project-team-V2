# Pattern 02: Routing

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Routing is now implemented across command mode selection, phase-to-agent mapping, RAG collection selection, MCP governance, confidence-based fast-path/blocked execution, and capability-based agent selection. The platform routes work adaptively at all levels — from static phase maps to runtime capability resolution and budget-driven path selection.

## Evidence

- The README positions the platform around structured SDLC modes including CREATE, AUDIT, FEATURE, and REEVALUATE. Source: README.md:20-24.
- The architecture overview shows a shared engine layer containing the state machine, dispatcher, gate validator, and flow logic. Source: docs/architecture/overview.md:53.
- The dispatcher compiles a runtime phase map from canonical schema and enforces runtime/schema parity before execution. Source: platform/engine/dispatcher.ts:566-621.
- RAG routing is profile-based: technical agents are routed toward codebase-heavy collections, while non-technical strategy agents avoid the codebase by default. Source: src/webapp/services/rag-grounding-service.ts:66-117.
- Chat grounding routes by intent to decisions, codebase, or phase-outputs collections. Source: src/webapp/services/rag-grounding-service.ts:58-62, src/webapp/services/rag-grounding-service.ts:326-338.
- The patterns query route filters candidate collections down to global patterns, global decisions, and workspace decisions before retrieval. Source: src/webapp/routes/rag.ts:491-541.
- Capability-based agent routing now selects the best available agent when the preferred agent is unavailable, matching declared capability requirements against an agent capability map. Source: platform/engine/dispatcher.ts (resolveCapabilityAssignment, agentCapabilities, capabilityRequirements).
- Confidence-aware routing is now implemented through budget evaluation: agents are routed to standard, fast-path, or blocked modes based on remaining token, cost, and time budget — with fast-path triggered below 50% remaining. Source: platform/engine/dispatcher.ts (\_runBoundedGroup, \_dispatchStateSequential), platform/engine/context-budgeter.ts (evaluateAgentBudget).
- Adaptive retrieval-depth and concurrency policies now adjust routing configuration based on observed quality signals. Source: platform/engine/proactive-discovery-optimization.ts:547-598.

## Remaining Refinements

- Learned retrieval routing from prior hit-rate and citation usefulness outcomes is a future adaptive increment.
- Full capability-market-style routing where agents bid for tasks remains a future architecture pattern.

## Audit Verdict

Routing is now adaptive at multiple levels: budget-driven path selection, capability-based agent fallback, and adaptive retrieval-depth policies. Target state is achieved.
