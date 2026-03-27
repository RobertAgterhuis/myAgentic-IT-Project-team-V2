# Pattern 06: Planning

Current score: 9.2/10
Target score: 9.9/10

## Assessment

Planning is deeply embedded in the platform's SDLC operating model. Plans are not just suggested; they are formalized as phase outputs, roadmaps, sprint gates, and backlog decisions.

## Evidence

- The Synthesis Agent must produce a 12-month roadmap and is explicitly barred from inventing plan items that are not grounded in prior recommendations. Source: templates/sdlc/agents/17-synthesis-agent.md:203-220.
- The Synthesis Agent also produces executive summary, heatmap, and risk-matrix outputs before roadmap creation, which is a clear plan-before-execution structure. Source: templates/sdlc/agents/17-synthesis-agent.md:151-202.
- The Product Manager agent owns backlog prioritization, roadmap ownership, and Definition of Ready validation. Source: templates/sdlc/agents/34-product-manager.md:12-16.
- The Product Manager planning flow includes feature prioritization and a priority matrix. Source: templates/sdlc/agents/34-product-manager.md:164-185, templates/sdlc/agents/34-product-manager.md:256-258.
- Sprint Gate logic explicitly applies IMPLEMENT or BACKLOG decisions per story and checks Definition of Ready before work proceeds. Source: templates/sdlc/playbooks/software-creation-playbook.md:382-417, templates/sdlc/playbooks/commercial-software-audit-playbook.md:333-368.

## Why The Score Is Not Higher

- Plans are comprehensive, but plan adaptation is still mostly event-driven rather than continuously optimized.
- The repository does not yet expose a single machine-readable planning graph linking goals, epics, issues, and runtime outcomes end to end.
- There is limited evidence of plan simulation against capacity, latency, or uncertainty scenarios before commitment.

## Path To 9.9

- Add a machine-readable planning graph that ties recommendations to epics, stories, gates, and observed results.
- Add plan-risk simulation before Sprint Gate approval.
- Add automated stale-plan detection when metrics, decisions, or reevaluate deltas invalidate assumptions.

## Audit Verdict

Planning is already a platform-level strength. The next increment is dynamic planning intelligence, not basic planning structure.
