# Pattern 04: Reflection

Current score: 8.9/10
Target score: 9.9/10

## Assessment

Reflection exists in the platform, but mostly as structured external critique rather than internal self-reflection by a single agent. The Critic/Risk loop is real and valuable; what is missing is finer-grained self-repair before handoff.

## Evidence

- The platform explicitly enforces critic and risk checkpoints before phase progression. Source: README.md:20-24.
- The Orchestrator instructions require Critic and Risk validation after each phase and cap remediation cycles, making reflective review a mandatory part of the workflow. Source: templates/sdlc/agents/00-orchestrator.md:706-760.
- The Synthesis Agent is prohibited from producing new analyses and must consolidate only traceable prior findings, which acts as a reflective consistency check across outputs. Source: templates/sdlc/agents/17-synthesis-agent.md:34, templates/sdlc/agents/17-synthesis-agent.md:96-150.
- REEVALUATE is a first-class command and playbook step, allowing changed inputs and detected deltas to trigger renewed analysis instead of silent drift. Source: README.md:20, templates/sdlc/playbooks/software-creation-playbook.md:404-410, templates/sdlc/playbooks/commercial-software-audit-playbook.md:355-361.

## Why The Score Is Not Higher

- Reflection is predominantly inter-agent, not intra-agent. There is limited evidence of an agent critiquing and revising its own draft before handoff.
- There is no explicit self-consistency or multi-sample reflection loop for difficult reasoning tasks.
- Reflection outcomes are not yet summarized into reusable improvement heuristics at the prompt-policy layer.

## Path To 9.9

- Add pre-handoff self-review passes for high-risk agents using contract-aware reflection prompts.
- Persist reflection findings into reusable failure-pattern registries that adjust future prompts and validations.
- Add a selective multi-draft review mode for architecture, security, and synthesis outputs.

## Audit Verdict

Reflection is materially present through critic/risk governance. The path to 9.9 is deeper self-revision before cross-agent review.
