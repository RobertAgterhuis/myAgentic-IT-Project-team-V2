# Pattern 14: Knowledge Retrieval (RAG)

Current score: 9.9/10
Target score: 9.9/10

## Assessment

RAG is thoroughly integrated into the platform. Retrieval is grounded in agent profiles, workspace and global collections, semantic memory, freshness monitoring, and user-facing query endpoints. Freshness-aware context ranking now integrates item freshness as a secondary ranking signal, ensuring retrieved artifacts are not only relevant but also current.

## Evidence

- The grounding service defines standard collections for decisions, phase-outputs, codebase, sprint-artifacts, and retrospectives. Source: src/webapp/services/rag-grounding-service.ts:8-18.
- Agent-specific retrieval profiles prioritize different collections by agent role and phase. Source: src/webapp/services/rag-grounding-service.ts:66-117, src/webapp/services/rag-grounding-service.ts:275-301.
- Agent grounding builds a query from questionnaire input and predecessor outputs, then queries RAG plus semantic memory tiers run, project, and org. Source: src/webapp/services/rag-grounding-service.ts:363-398.
- Agent execution persists rag_retrieval_score into runtime metrics. Source: src/webapp/services/agent-execution-service.ts:491-530.
- The patterns query endpoint retrieves from global patterns, global decisions, and workspace decisions collections. Source: src/webapp/routes/rag.ts:491-563.
- Observability includes RAG freshness monitoring with stale, missing, unknown, and healthy states. Source: src/webapp/routes/misc-observability.ts:81, src/webapp/routes/misc-observability.ts:98-148, src/webapp/routes/misc-observability.ts:294.
- Freshness scoring per semantic memory entry is now computed from age, access count, and access recency as weighted factors. Source: platform/engine/semantic-memory.ts (freshnessScore).
- Context item ranking now uses freshness as a secondary signal weighted at 0.2, blended with relevance at 0.8, ensuring stale items rank below fresh items of equal relevance. Source: platform/engine/context-budgeter.ts (rankItems, ContextItem.freshnessScore).
- Adaptive retrieval-depth and threshold policies from the proactive discovery engine adjust topK and score minimum based on citation usefulness, no-match rate, and latency budget. Source: platform/engine/proactive-discovery-optimization.ts:547-598.

## Remaining Refinements

- Citation usefulness feedback loops for collection-specific query rewriting would deepen adaptive retrieval quality.
- Retrieval gap alerts when critical decisions are consistently missed remain a future observability increment.

## Audit Verdict

RAG is mature, observable, and now freshness-aware. Adaptive retrieval policies, freshness-weighted ranking, and semantic memory scoring close the key retrieval quality gaps. Target state is achieved.
