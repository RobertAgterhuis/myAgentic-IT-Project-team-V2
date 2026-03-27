# Pattern 11: Goal Setting and Monitoring

Current score: 8.7/10
Target score: 9.9/10

## Assessment

The platform has strong phase, gate, milestone, and runtime monitoring, but its goal model is still more workflow-centric than objective-hierarchy-centric. It monitors progress well; it does not yet express strategic goals as a deeply linked execution graph.

## Evidence

- The pipeline model defines explicit progression from ONBOARDING through PHASE_5_EXECUTING. Source: docs/reference/architecture-index.md:16.
- The dispatcher configuration includes humanReviewThresholds, showing that phase execution is monitored against confidence thresholds. Source: platform/engine/dispatcher.ts:668, platform/engine/dispatcher.ts:897-898.
- Session context tools expose workspace_id, session_status, mode, current_phase, current_agent, pending_approvals, and failed_gate. Source: src/webapp/routes/chat.ts:742-758.
- Observability routes expose uptime, request_count, error_rate, response percentiles, sse_connections, and per-endpoint metrics. Source: src/webapp/routes/misc-observability.ts:232-253.
- Chat grounding metrics additionally surface retrieval latency, first-token latency, citation counts, fallback rate, and no-match rate. Source: src/webapp/routes/misc-observability.ts:28-31, src/webapp/routes/misc-observability.ts:193-196.

## Why The Score Is Not Higher

- Goals are implicit in phases, artifacts, and milestones rather than represented as explicit machine-readable objectives with owners, dependencies, and measurable success criteria.
- Monitoring is strong at runtime and process levels, but weaker at business-outcome and agent-quality objective tracking.
- There is limited evidence of automatic plan correction when monitored goals drift.

## Path To 9.9

- Add an objective graph linking goals, KPIs, epics, stories, agents, and gates.
- Add goal health scoring with automatic risk escalation when metrics fall behind target.
- Add closed-loop plan correction suggestions driven by monitored objective drift.

## Audit Verdict

Monitoring is mature; explicit goal modeling is the main remaining gap.
