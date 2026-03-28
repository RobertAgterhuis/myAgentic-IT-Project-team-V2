# Pattern 06: Planning

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Planning is deeply embedded in the platform's SDLC operating model and is now analytically enhanced. Plans are formalized as phase outputs, roadmaps, sprint gates, backlog decisions, and a machine-readable objective graph. Dependency-aware execution planning derives optimal execution order and critical paths from artifact dependencies, while plan freshness validation proactively detects stale assumptions before they cause plan failures.

## Evidence

- The Synthesis Agent must produce a 12-month roadmap and is explicitly barred from inventing plan items that are not grounded in prior recommendations. Source: templates/sdlc/agents/17-synthesis-agent.md:203-220.
- The Synthesis Agent also produces executive summary, heatmap, and risk-matrix outputs before roadmap creation, which is a clear plan-before-execution structure. Source: templates/sdlc/agents/17-synthesis-agent.md:151-202.
- The Product Manager agent owns backlog prioritization, roadmap ownership, and Definition of Ready validation. Source: templates/sdlc/agents/34-product-manager.md:12-16.
- A machine-readable objective graph now links objectives to KPIs, epics, sprint items, and gates instead of keeping planning structure purely implicit. Source: platform/engine/objective-graph.ts:84-208, platform/engine/objective-graph.ts:342.
- The intelligence-loop API exposes objective CRUD and objective-health routes, which turns planning state into an inspectable runtime artifact. Source: src/webapp/routes/intelligence-loop.ts:38-117.
- Dependency-aware execution planning now computes safe execution groups from declared inter-agent dependencies using topological sort (Kahn's algorithm), derives the critical path via longest-path DP, and returns a prioritized execution order with estimated durations. Source: platform/engine/proactive-discovery-optimization.ts (planDependencyAwareExecution, DependencyAwarePlanResult), src/webapp/routes/intelligence-loop.ts (m4/dependency-plan).
- Plan freshness validation now automatically detects stale assumptions by checking declared assumption values against current decision state and measuring source document age. Source: platform/engine/proactive-discovery-optimization.ts (validatePlanFreshness, PlanFreshnessValidationResult), src/webapp/routes/intelligence-loop.ts (m4/plan-freshness/validate).

## Remaining Refinements

- Plan-risk simulation modeling uncertainty before Sprint Gate commitment is a future analytical increment.
- Automatic back-propagation of runtime outcomes into the objective graph remains a future enhancement.

## Audit Verdict

Planning is a platform-level strength with analytical depth. Dependency-aware execution planning and proactive stale-plan detection close the two principal remaining gaps. Target state is achieved.
