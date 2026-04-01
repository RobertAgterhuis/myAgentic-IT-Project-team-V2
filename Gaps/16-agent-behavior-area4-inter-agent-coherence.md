# Agentic Behavior Audit — Area 4: Inter-Agent Communication & Coherence

## Evidence Basis

- Handoff contract/interface: templates/sdlc/contracts/agent-handoff-contract.md:1
- Runtime phase and parallel groups: platform/engine/flows.yaml:404, platform/engine/flows.yaml:432
- A2A messaging/tracing services: platform/engine/a2a-messaging.ts:83, platform/engine/a2a-collaboration-tracer.ts:130
- Runtime assignment gaps: platform/engine/flows.yaml:323, platform/engine/flows.yaml:399

## INTER-AGENT ISSUE: Template-Orchestrator Intent → Runtime Flow Assignments

- Handoff point: templates/sdlc/agents/00-orchestrator.md:238
- Expected interface: Scope Change flow activates Agent 37.
- Actual output: Agent 37 not present in runtime assignments block.
- Mismatch: orchestration prompt contract diverges from executable flow map.
- Consequence: scope-change behavior depends on manual/indirect paths, reducing deterministic orchestration.
- Severity: 🔴

## INTER-AGENT ISSUE: Questionnaire Lifecycle Contract → Runtime Assignment Coverage

- Handoff point: templates/sdlc/agents/00-orchestrator.md:177
- Expected interface: mandatory Questionnaire Agent activation.
- Actual output: Agent 36 absent in flow assignments.
- Mismatch: strong lifecycle claims but incomplete direct activation path in assignment map.
- Consequence: answer loading/generation may rely on auxiliary services rather than explicit agent chain.
- Severity: 🟠

## INTER-AGENT ISSUE: Rich Handoff JSON Contract → Low-Fidelity Runtime Outputs

- Handoff point: templates/sdlc/contracts/agent-handoff-contract.md:77
- Expected interface: structured handoff payload with deliverables/checklist status.
- Actual output: session-state points to many /tmp/log-only-output artifacts.
- Mismatch: contract richness is not strongly reflected in persisted phase output references.
- Consequence: downstream agents may receive structurally thin evidence, harming coherence.
- Severity: 🟠

## INTER-AGENT ISSUE: A2A Capability Exists → Sparse Evidence of Active Use

- Handoff point: platform/engine/a2a-messaging.ts:83
- Expected interface: request/clarification/rebuttal workflows with provenance.
- Actual output: infrastructure exists, but repository evidence in current session artifacts is dominated by linear phase traces.
- Mismatch: capability presence is stronger than observed usage.
- Consequence: conflict resolution likely defaults to orchestration flow rather than active peer negotiation in practice.
- Severity: 🟡

## Area 4 Verdict

Inter-agent coherence is architecturally well-specified, but execution coherence is undermined by assignment/prompt drift and evidence that many handoffs are structurally lighter than the declared contracts.
