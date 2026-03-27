# Pattern 17: Reasoning Techniques

Current score: 7.9/10
Target score: 9.9/10

## Assessment

The repository supports structured reasoning inputs, but it does not yet expose a broad portfolio of explicit reasoning strategies. Reasoning quality is improved indirectly through contracts, grounding, synthesis, and critique rather than through specialized reasoning operators.

## Evidence

- The runtime prompt envelope includes sanitized skill content, predecessor contracts, and retrieved context, which improves grounded reasoning quality. Source: platform/engine/runtime-adapter/prompt-assembly.ts:77-90, platform/engine/runtime-adapter/prompt-assembly.ts:147-156.
- The runtime adapter normalizes predecessor contracts and checks for handoff checklists before prompt construction. Source: platform/engine/agent-runtime-adapter.ts:374-429, platform/engine/agent-runtime-adapter.ts:956-1041.
- The Synthesis Agent is constrained to produce only traceable conclusions, which pushes reasoning toward evidence-backed consolidation. Source: templates/sdlc/agents/17-synthesis-agent.md:34, templates/sdlc/agents/17-synthesis-agent.md:151-202.
- Critic and Risk stages provide external challenge functions that improve reasoning quality across phases. Source: README.md:20-24, templates/sdlc/agents/00-orchestrator.md:706-760.

## Why The Score Is Not Higher

- There is little explicit evidence of self-consistency, debate, tree search, deliberative branching, or verifier-driven reasoning.
- Reasoning is largely embedded in agent instructions rather than formalized as reusable reasoning operators.
- The system does not yet track which reasoning strategy performs best by task type.

## Path To 9.9

- Add explicit reasoning profiles such as fast, critique-first, debate, and verification-heavy.
- Add verifier-assisted reasoning for architecture, security, and synthesis outputs.
- Add strategy selection based on task complexity, uncertainty, and historical success rate.

## Audit Verdict

Reasoning is controlled and grounded, but it is not yet deeply strategy-aware. This is another major lever for a 9.9+ target.
