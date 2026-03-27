# Pattern 01: Prompt Chaining

Current score: 9.3/10
Target score: 9.9/10

## Assessment

This repository implements prompt chaining as a first-class orchestration primitive rather than as an ad hoc prompt trick. The strongest evidence is the explicit state-machine progression, the dispatcher handoff model, and the runtime prompt envelope that carries predecessor contracts, questionnaire input, and retrieved context into the next invocation.

## Evidence

- The architecture documents an ordered pipeline from IDE/browser entrypoints through Fastify into platform state machine, dispatcher, gate validator, and file-backed artifacts. Source: docs/architecture/overview.md:26-29, docs/architecture/overview.md:53, docs/architecture/overview.md:71.
- The dispatcher defines ordered execution groups per phase, then a second execution stage for PHASE_5 work, which creates a chain of dependent outputs rather than isolated prompts. Source: platform/engine/dispatcher.ts:630-642.
- Agent context assembly loads predecessor outputs into context.predecessorOutputs, derives predecessorContracts, and injects questionnaireInput for the next agent. Source: platform/engine/dispatcher.ts:830-837.
- Prompt assembly explicitly includes sanitizedSkillContent, predecessorContracts, and a retrieved context block in the prompt envelope. Source: platform/engine/runtime-adapter/prompt-assembly.ts:77-90, platform/engine/runtime-adapter/prompt-assembly.ts:156.
- The dispatcher contract comment states that predecessor output files and questionnaire answers are injected into runtime context before execution. Source: platform/engine/dispatcher.ts:750-759.

## Why The Score Is Not Higher

- Chaining is phase-structured, but chain optimization is mostly static. There is no explicit chain-quality evaluator that rewrites the next prompt when predecessor quality is weak.
- The system validates predecessor contracts, but it does not yet score prompt-to-prompt information loss across long chains.
- There is no adaptive prompt routing policy that changes chain depth based on uncertainty, cost, or prior chain performance.

## Path To 9.9

- Add chain-quality metrics: missing-source ratio, unresolved-open-item carryover, and handoff checklist completeness drift per hop.
- Add a prompt-rewrite stage that summarizes oversized predecessor artifacts into a verified intermediate contract before the next agent runs.
- Introduce dynamic chain depth controls so low-risk work can collapse hops while high-risk work expands into richer review chains.

## Audit Verdict

Prompt chaining is already a structural strength of the platform. Reaching 9.9 requires moving from deterministic chaining to adaptive, measured chaining.
