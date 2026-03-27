# Pattern 20: Prioritization

Current score: 9.3/10
Target score: 9.9/10

## Assessment

Prioritization is formalized across agents, templates, sprint gate, and output contracts. The platform does not leave prioritization implicit; it requires explicit matrices, backlog decisions, and scope-aware reconciliation.

## Evidence

- The Product Manager agent owns backlog prioritization, sequencing, feature trade-offs, and Definition of Ready validation. Source: templates/sdlc/agents/34-product-manager.md:12-16, templates/sdlc/agents/34-product-manager.md:344-352.
- The Product Manager method includes a prioritization framework and a priority matrix with impact, effort, and P1/P2/P3 classification. Source: templates/sdlc/agents/34-product-manager.md:166-168, templates/sdlc/agents/34-product-manager.md:256-258.
- Recommendations templates require a completed priority matrix sorted by priority. Source: templates/sdlc/output-templates/recommendations-template.md:87-115.
- Sprint Gate applies IMPLEMENT or BACKLOG decisions per story. Source: templates/sdlc/playbooks/software-creation-playbook.md:412-417, templates/sdlc/playbooks/commercial-software-audit-playbook.md:363-368.
- Scope change handling includes backlog hold, reconciliation, and update priority treatment. Source: templates/sdlc/agents/37-scope-change-agent.md:97-112, templates/sdlc/agents/37-scope-change-agent.md:230-270.

## Why The Score Is Not Higher

- Prioritization is strong at design time, but there is less evidence of runtime reprioritization driven by observed value delivery.
- The system has structured priority inputs, but not yet a unified impact model combining quality, risk, cost, and strategic return.
- There is limited evidence of portfolio-level optimization across multiple workstreams.

## Path To 9.9

- Add a unified prioritization engine that combines risk, impact, cost, and dependency signals.
- Add runtime reprioritization suggestions based on benchmark drift and delivery outcomes.
- Add portfolio views that compare competing epics and sprint candidates quantitatively.

## Audit Verdict

Prioritization is already formal and repeatable. The next gain is richer quantitative optimization across scopes and time horizons.
