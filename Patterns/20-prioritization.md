# Pattern 20: Prioritization

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Prioritization is formalized at design time across agents, templates, sprint gate, and output contracts, and is now also quantified at runtime through a unified priority scoring engine. The platform does not leave prioritization implicit at any stage.

## Evidence

- The Product Manager agent owns backlog prioritization, sequencing, feature trade-offs, and Definition of Ready validation. Source: templates/sdlc/agents/34-product-manager.md:12-16, templates/sdlc/agents/34-product-manager.md:344-352.
- The Product Manager method includes a prioritization framework and a priority matrix with impact, effort, and P1/P2/P3 classification. Source: templates/sdlc/agents/34-product-manager.md:166-168, templates/sdlc/agents/34-product-manager.md:256-258.
- Recommendations templates require a completed priority matrix sorted by priority. Source: templates/sdlc/output-templates/recommendations-template.md:87-115.
- Sprint Gate applies IMPLEMENT or BACKLOG decisions per story. Source: templates/sdlc/playbooks/software-creation-playbook.md:412-417, templates/sdlc/playbooks/commercial-software-audit-playbook.md:363-368.
- Scope change handling includes backlog hold, reconciliation, and update priority treatment. Source: templates/sdlc/agents/37-scope-change-agent.md:97-112, templates/sdlc/agents/37-scope-change-agent.md:230-270.
- A runtime priority scoring engine now orders agent execution groups by a weighted composite of impact, urgency, risk, and cost signals before dispatch. Source: platform/engine/dispatcher.ts (orderByRuntimePriority, computePriorityScore, AgentPrioritySignal).
- The priority formula `impact×0.4 + urgency×0.35 + risk×0.2 − cost×0.15` provides a unified quantitative model combining the four key prioritization factors, consistent with the proactive discovery optimization scoring. Source: platform/engine/dispatcher.ts (computePriorityScore).

## Remaining Refinements

- Portfolio-level optimization views comparing competing epics across workstreams remain a future dashboard increment.
- Runtime reprioritization from benchmark drift is partially addressed via benchmark tuning proposals but not yet fully automated.

## Audit Verdict

Prioritization is now formal, repeatable, and quantified at runtime. The unified priority engine closes the design-time gap between static priority matrices and adaptive execution ordering. Target state is achieved.
