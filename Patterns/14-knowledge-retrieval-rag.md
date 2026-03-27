# Pattern 14: Knowledge Retrieval (RAG)

Current score: 9.4/10
Target score: 9.9/10

## Assessment

RAG is thoroughly integrated into the platform. Retrieval is grounded in agent profiles, workspace and global collections, semantic memory, freshness monitoring, and user-facing query endpoints.

## Evidence

- The grounding service defines standard collections for decisions, phase-outputs, codebase, sprint-artifacts, and retrospectives. Source: src/webapp/services/rag-grounding-service.ts:8-18.
- Agent-specific retrieval profiles prioritize different collections by agent role and phase. Source: src/webapp/services/rag-grounding-service.ts:66-117, src/webapp/services/rag-grounding-service.ts:275-301.
- Agent grounding builds a query from questionnaire input and predecessor outputs, then queries RAG plus semantic memory tiers run, project, and org. Source: src/webapp/services/rag-grounding-service.ts:363-398.
- Agent execution persists rag_retrieval_score into runtime metrics. Source: src/webapp/services/agent-execution-service.ts:491-530.
- The patterns query endpoint retrieves from global patterns, global decisions, and workspace decisions collections. Source: src/webapp/routes/rag.ts:491-563.
- Observability includes RAG freshness monitoring with stale, missing, unknown, and healthy states. Source: src/webapp/routes/misc-observability.ts:81, src/webapp/routes/misc-observability.ts:98-148, src/webapp/routes/misc-observability.ts:294.

## Why The Score Is Not Higher

- Retrieval quality is measured, but automated query rewriting and citation-quality optimization are still limited.
- There is no strong evidence of collection-level learning from operator citation feedback.
- Retrieval policy still appears mostly static at the profile level.

## Path To 9.9

- Add citation usefulness feedback loops and collection-specific query rewriting.
- Add adaptive topK and threshold tuning from outcome quality.
- Add retrieval gap alerts when critical decisions or artifacts are consistently missed.

## Audit Verdict

RAG is mature, observable, and operationally meaningful. The remaining gap is adaptive retrieval quality tuning.
