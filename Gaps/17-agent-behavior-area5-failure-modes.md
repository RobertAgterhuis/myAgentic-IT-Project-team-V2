# Agentic Behavior Audit — Area 5: Failure Modes & Degenerate Behavior

## [🔴] FAILURE MODE: Agent Graph (systemic)

- Type: silent failure / cascading error
- Trigger: template instructions require agents not guaranteed in runtime assignment map.
- Evidence: templates/sdlc/agents/00-orchestrator.md:177, templates/sdlc/agents/00-orchestrator.md:238, platform/engine/flows.yaml:323
- Detection: YES (only if operators inspect flow/assignment discrepancy)
- User impact: workflows appear complete while intended specialist steps may not execute as explicit agent invocations.
- Mitigation: enforce compile-time parity checks between orchestrator instructions and runtime flow assignments.

## [🟠] FAILURE MODE: Agent 06

- Type: degenerate loop / low-information repetition
- Trigger: sandbox runtime path repeatedly emits generic step artifacts.
- Evidence: BusinessDocs/session/agent-runs/2026-04-01T11-01-35-252Z-06.md:1, BusinessDocs/session/agent-runs/2026-04-01T11-01-35-252Z-06.md:8, BusinessDocs/session/agent-runs/2026-04-01T11-01-45-117Z-06.md:1
- Detection: PARTIAL (logs show repetition, but no explicit degeneracy detector for semantic novelty)
- User impact: outputs look active but contribute limited reasoning value.
- Mitigation: add semantic-delta checks across consecutive outputs and block low-novelty repeats.

## [🟡] FAILURE MODE: Dispatcher Retry/Reinvocation

- Type: bounded retry churn
- Trigger: contract/quality failures trigger re-invocation and revision attempts.
- Evidence: platform/engine/dispatcher.ts:1019, platform/engine/dispatcher.ts:1078, platform/engine/dispatcher.ts:1290
- Detection: YES (invocation logs + stop reasons)
- User impact: latency/cost increase before eventual stop.
- Mitigation: add early-stop on repeated near-identical outputs and stronger failure clustering.

## [🟠] FAILURE MODE: Contract-Passing but Content-Shallow Output

- Type: hallucination-adjacent quality drift / superficial compliance
- Trigger: checklist-heavy prompts + contract validation can pass structure without depth.
- Evidence: platform/engine/verifier-pass.ts:62, platform/engine/deliverable-quality.ts:72
- Detection: PARTIAL (quality score exists but depth proxy is coarse)
- User impact: users receive compliant-looking artifacts that still require major manual correction.
- Mitigation: add task-grounded factual consistency scoring and gold-set semantic checks.

## [🟡] FAILURE MODE: Context Loss Under Budgeting

- Type: context truncation drift
- Trigger: context token budgeting and truncation strips detail.
- Evidence: platform/engine/agent-runtime-adapter.ts:310, platform/engine/agent-runtime-adapter.ts:336
- Detection: NO explicit downstream alert when critical rationale is trimmed.
- User impact: reduced consistency and missing constraints in generated outputs.
- Mitigation: preserve high-priority blocks with explicit pinning; emit truncation impact events.

## Area 5 Verdict

Major failures are less about crash loops and more about semantic reliability: assignment drift, repetitive low-information artifacts, and structural compliance that can mask weak reasoning depth.
