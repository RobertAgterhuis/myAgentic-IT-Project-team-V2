# Pattern 02: Routing

Current score: 9.1/10
Target score: 9.9/10

## Assessment

Routing is implemented across command mode selection, phase-to-agent mapping, RAG collection selection, and MCP governance. The platform clearly routes work by mode and state, but it is still more rules-driven than policy-learning-driven.

## Evidence

- The README positions the platform around structured SDLC modes including CREATE, AUDIT, FEATURE, and REEVALUATE. Source: README.md:20-24.
- The architecture overview shows a shared engine layer containing the state machine, dispatcher, gate validator, and flow logic. Source: docs/architecture/overview.md:53.
- The dispatcher compiles a runtime phase map from canonical schema and enforces runtime/schema parity before execution. Source: platform/engine/dispatcher.ts:566-621.
- RAG routing is profile-based: technical agents are routed toward codebase-heavy collections, while non-technical strategy agents avoid the codebase by default. Source: src/webapp/services/rag-grounding-service.ts:66-117.
- Chat grounding routes by intent to decisions, codebase, or phase-outputs collections. Source: src/webapp/services/rag-grounding-service.ts:58-62, src/webapp/services/rag-grounding-service.ts:326-338.
- The patterns query route filters candidate collections down to global patterns, global decisions, and workspace decisions before retrieval. Source: src/webapp/routes/rag.ts:491-541.

## Why The Score Is Not Higher

- Routing policies are mostly hand-authored; there is limited evidence of runtime policy learning or automated route optimization.
- There is no confidence-based router that escalates from single-agent to multi-agent or from lightweight grounding to deeper retrieval.
- Tool routing is governed, but agent-specialist selection remains phase-based rather than capability-score-based.

## Path To 9.9

- Add confidence-aware routing policies that can switch between fast path, deep path, and human-review path.
- Add learned retrieval routing based on prior hit-rate, citation usefulness, and answer-quality outcomes.
- Add capability tags and workload classifiers so specialist selection is more granular than current phase membership.

## Audit Verdict

Routing is mature and explicit. The next jump comes from adaptive policy routing, not more static route tables.
