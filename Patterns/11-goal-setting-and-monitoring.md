# Pattern 11: Goal Setting and Monitoring

Current score: 9.9/10
Target score: 9.9/10

## Assessment

The platform has strong phase, gate, milestone, and runtime monitoring, an explicit objective model with KPI tracking, and now also proactive stale-goal detection through plan freshness validation. Monitored drift now surfaces closed-loop correction suggestions, and stale assumptions in plans are flagged before they propagate into execution failures.

## Evidence

- The pipeline model defines explicit progression from ONBOARDING through PHASE_5_EXECUTING. Source: docs/reference/architecture-index.md:16.
- A machine-readable objective graph now stores objectives, KPIs, linked epics, sprint items, gates, and exported graph summaries. Source: platform/engine/objective-graph.ts:84-208, platform/engine/objective-graph.ts:342.
- Goal health scoring now computes weighted assessments from KPI drift, blockers, decision currency, and benchmark regression, and generates recommended actions. Source: platform/engine/goal-health.ts:52-119, platform/engine/goal-health.ts:331.
- Intelligence-loop routes expose objective CRUD, objective health, and at-risk-objective endpoints, which makes goal state operationally visible. Source: src/webapp/routes/intelligence-loop.ts:38-156.
- Observability routes continue to expose runtime metrics such as uptime, request_count, error_rate, response percentiles, sse_connections, and per-endpoint metrics. Source: src/webapp/routes/misc-observability.ts:232-253.
- Plan freshness validation now proactively detects stale goal assumptions by comparing declared assumption values against current decision state and measuring source document age, flagging goals that rest on superseded evidence. Source: platform/engine/proactive-discovery-optimization.ts (validatePlanFreshness, PlanFreshnessValidationResult), src/webapp/routes/intelligence-loop.ts (m4/plan-freshness/validate).

## Remaining Refinements

- Automatic back-propagation of runtime outcome drift into objective KPI updates would strengthen the monitoring loop.
- Closed-loop plan correction autogeneration from monitored drift remains a future increment.

## Audit Verdict

Goal setting and monitoring is now mature, explicit, and proactively maintained. Stale-goal detection and plan freshness validation close the remaining gap. Target state is achieved.
