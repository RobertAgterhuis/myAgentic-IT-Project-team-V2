# Pattern 21: Exploration and Discovery

Current score: 9.9/10
Target score: 9.9/10

## Assessment

The repository implements proactive exploration and discovery at multiple layers. RAG pattern queries, precedent lookup, and retrospective knowledge form the retrieval foundation. A proactive discovery engine now autonomously scans for stale decisions, missing citations, and contradictory artifacts. Plan freshness validation detects stale plan assumptions before they materialize as failures, and chain quality analysis surfaces missing-evidence gaps in agent output chains.

## Evidence

- The patterns query endpoint allows retrieval over global patterns and decision knowledge. Source: src/webapp/routes/rag.ts:491-563.
- Grounding collections include retrospectives as a standard retrieval source. Source: src/webapp/services/rag-grounding-service.ts:8-18.
- The approval and cockpit flows surface similar past overrides, which helps operators discover relevant precedent during decision making. Source: src/webapp/routes/cockpit.ts:766-791, src/webapp/ui/src/pages/approvals/approval-center-page.tsx:231-234.
- The user manual positions MCP as a cross-IDE discovery surface for local artifacts and audit trails. Source: docs/getting-started/user-manual.md:254-279.
- The architecture overview includes sprint artifacts, decisions, and phase outputs as persisted knowledge sources. Source: docs/architecture/overview.md:69-71.
- The proactive discovery optimization engine now autonomously scans for stale decisions, retrieval anomalies, and contradictory artifacts, emitting findings with severity classifications and reevaluate recommendations. Source: platform/engine/proactive-discovery-optimization.ts:547-598, src/webapp/routes/intelligence-loop.ts:537-730.
- Plan freshness validation proactively detects stale assumptions in active plans by comparing declared assumption values against current state and measuring source document age — a form of hypothesis-driven gap discovery before plan failures occur. Source: platform/engine/proactive-discovery-optimization.ts (validatePlanFreshness, PlanFreshnessValidationResult), src/webapp/routes/intelligence-loop.ts (m4/plan-freshness/validate).
- Chain quality analysis proactively discovers missing-source ratios, unresolved open items, and contract completeness gaps across predecessor agent outputs, exposing evidence weaknesses before downstream agents consume them. Source: platform/engine/proactive-discovery-optimization.ts (analyzeChainQuality), src/webapp/routes/intelligence-loop.ts (m4/chain-quality-analysis).

## Remaining Refinements

- Exploratory alternative plan branch generation for high-uncertainty work before committing to a single execution path is a future planning increment.
- Discovery summaries could be more tightly surfaced in sprint gate and reevaluate dashboards.

## Audit Verdict

Exploration and discovery is now proactively driven. The system autonomously detects stale knowledge, missing evidence, and assumption failures before they surface as runtime problems. Target state is achieved.
