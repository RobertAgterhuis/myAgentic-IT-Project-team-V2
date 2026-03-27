# Pattern 21: Exploration and Discovery

Current score: 8.4/10
Target score: 9.9/10

## Assessment

The repository supports exploration and discovery through RAG pattern queries, precedent lookup, retrospective knowledge, and operator-facing discovery surfaces. What is still missing is a more autonomous discovery engine that actively searches for unknown unknowns.

## Evidence

- The patterns query endpoint allows retrieval over global patterns and decision knowledge. Source: src/webapp/routes/rag.ts:491-563.
- Grounding collections include retrospectives as a standard retrieval source. Source: src/webapp/services/rag-grounding-service.ts:8-18.
- The approval and cockpit flows surface similar past overrides, which helps operators discover relevant precedent during decision making. Source: src/webapp/routes/cockpit.ts:766-791, src/webapp/ui/src/pages/approvals/approval-center-page.tsx:231-234.
- The user manual positions MCP as a cross-IDE discovery surface for local artifacts and audit trails. Source: docs/getting-started/user-manual.md:254-279.
- The architecture overview includes sprint artifacts, decisions, and phase outputs as persisted knowledge sources. Source: docs/architecture/overview.md:69-71.

## Why The Score Is Not Higher

- Discovery is still mostly query-driven by the operator or orchestrated workflow, not proactively hypothesis-driven by the system.
- There is limited evidence of exploratory search over alternative plans, missing evidence, or latent risks before they become explicit problems.
- Discovery results are not yet tightly linked into adaptive routing and planning policies.

## Path To 9.9

- Add proactive gap discovery jobs that search for missing citations, weak evidence, stale decisions, and contradictory artifacts.
- Add exploratory planning branches for high-uncertainty work before committing to a single execution path.
- Add discovery summaries that feed directly into reevaluate, sprint gate, and prioritization decisions.

## Audit Verdict

Exploration exists, but mostly as assisted retrieval. The jump to 9.9 requires proactive discovery behavior.
