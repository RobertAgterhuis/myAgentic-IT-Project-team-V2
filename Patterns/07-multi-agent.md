# Pattern 07: Multi-Agent

Current score: 9.6/10
Target score: 9.9/10

## Assessment

Multi-agent collaboration is one of the defining architectural patterns in this repository. The system is organized around specialist agents, ordered phases, cross-phase validation, and synthesis rather than a single monolithic generalist.

## Evidence

- The README describes the platform as a governed orchestration layer for multi-agent SDLC work. Source: README.md:13-24, README.md:104-106.
- The architecture overview states that templates/sdlc contains 38+ agent skill files, contracts, guardrails, and playbooks. Source: docs/architecture/overview.md:64.
- The dispatcher compiles phase-agent assignments from canonical schema and enforces parity between runtime and schema. Source: platform/engine/dispatcher.ts:566-621.
- The dispatcher defines explicit agent groups across SDLC states, including implementation, testing, review, documentation, GitHub integration, and retrospective roles in PHASE_5. Source: platform/engine/dispatcher.ts:630-642.
- The pipeline reference shows the full state progression from ONBOARDING to PHASE_5_EXECUTING. Source: docs/reference/architecture-index.md:16.

## Why The Score Is Not Higher

- The collaboration model is highly structured, but agent specialization is primarily phase-based and contract-based rather than market-style or capability-market coordination.
- The system has limited autonomous peer negotiation between agents outside orchestrated handoff points.
- Agent substitution and dynamic specialist selection are still relatively static.

## Path To 9.9

- Add capability-based agent dispatch and substitute-agent fallback rules.
- Add explicit negotiation and escalation protocols for cross-agent conflicts before Critic/Risk stages.
- Add per-agent quality and cost dashboards to tune team composition over time.

## Audit Verdict

This is already a genuinely multi-agent system, not a relabeled single-agent workflow. The remaining gap is adaptive team composition.
