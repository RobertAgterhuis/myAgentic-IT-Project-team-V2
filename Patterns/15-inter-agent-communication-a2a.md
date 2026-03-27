# Pattern 15: Inter-Agent Communication (A2A)

Current score: 8.3/10
Target score: 9.9/10

## Assessment

The repository clearly supports agent-to-agent communication, but primarily through orchestrated artifact passing rather than a richer autonomous A2A protocol. Communication exists; peer networking is still relatively constrained.

## Evidence

- The dispatcher loads predecessor outputs and questionnaire answers into each agent context before execution. Source: platform/engine/dispatcher.ts:830-837.
- Predecessor contracts are summarized and attached to agent context, including whether the source artifact contains a handoff checklist. Source: platform/engine/dispatcher.ts:399-412, platform/engine/dispatcher.ts:831.
- The runtime adapter normalizes predecessorContracts into the prompt envelope. Source: platform/engine/agent-runtime-adapter.ts:395-429, platform/engine/agent-runtime-adapter.ts:956-1041.
- The Orchestrator requires agents to pass file paths rather than entire output payloads across phase boundaries, which is a disciplined A2A handoff mechanism. Source: templates/sdlc/agents/00-orchestrator.md:581-621.
- The dispatcher comments describe grouped execution where outputs of one group feed into the next group as predecessor paths. Source: platform/engine/dispatcher.ts:626-642.

## Why The Score Is Not Higher

- Communication is brokered mainly by the Orchestrator and filesystem artifacts, not by a richer protocol for peer negotiation, capability discovery, or direct agent messaging.
- There is no explicit shared ontology for A2A message types beyond contracts and artifact summaries.
- There is little evidence of asynchronous multi-agent dialogues or collaborative problem solving outside predefined phase structures.

## Path To 9.9

- Add a typed A2A message contract for requests, clarifications, rebuttals, and evidence handoff.
- Add direct peer-to-peer collaboration patterns for architecture-security, UX-content, and dev-test coordination.
- Add provenance tracking on every inter-agent message, not only final artifacts.

## Audit Verdict

A2A is functionally present, but it is the more centralized, orchestrator-mediated form. Reaching 9.9 requires richer peer protocols.
