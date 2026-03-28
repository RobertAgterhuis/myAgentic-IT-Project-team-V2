# Pattern 01: Prompt Chaining

Current score: 9.9/10
Target score: 9.9/10

## Assessment

This repository implements prompt chaining as a first-class orchestration primitive with an analytical quality layer. The explicit state-machine progression and dispatcher handoff model are the foundation. Chain quality analysis now adds automated scoring of predecessor outputs, detects weak contracts, and recommends chain depth adjustments — closing the gap between deterministic chaining and measured, adaptive chaining.

## Evidence

- The architecture documents an ordered pipeline from IDE/browser entrypoints through Fastify into platform state machine, dispatcher, gate validator, and file-backed artifacts. Source: docs/architecture/overview.md:26-29, docs/architecture/overview.md:53, docs/architecture/overview.md:71.
- The dispatcher defines ordered execution groups per phase, then a second execution stage for PHASE_5 work, which creates a chain of dependent outputs rather than isolated prompts. Source: platform/engine/dispatcher.ts:630-642.
- Agent context assembly loads predecessor outputs into context.predecessorOutputs, derives predecessorContracts, and injects questionnaireInput for the next agent. Source: platform/engine/dispatcher.ts:830-837.
- Prompt assembly explicitly includes sanitizedSkillContent, predecessorContracts, and a retrieved context block in the prompt envelope. Source: platform/engine/runtime-adapter/prompt-assembly.ts:77-90, platform/engine/runtime-adapter/prompt-assembly.ts:156.
- The dispatcher contract comment states that predecessor output files and questionnaire answers are injected into runtime context before execution. Source: platform/engine/dispatcher.ts:750-759.
- Chain quality analysis now scores predecessor contract completeness, detects missing-source ratios and unresolved open items, recommends chain depth adjustments, and returns a quality band (strong/watch/weak). Source: platform/engine/proactive-discovery-optimization.ts (analyzeChainQuality, ChainQualityAnalysisResult), src/webapp/routes/intelligence-loop.ts (m4/chain-quality-analysis).

## Remaining Refinements

- A prompt-rewrite stage that summarizes oversized predecessor artifacts before the next hop would be a further refinement.
- Dynamic chain depth collapsing for low-risk work based on chain quality band is a future automation increment.

## Audit Verdict

Prompt chaining is a structural strength of the platform and is now analytically measured. The chain quality evaluator closes the gap between deterministic and adaptive chaining. Target state is achieved.
