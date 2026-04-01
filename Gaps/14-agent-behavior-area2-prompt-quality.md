# Agentic Behavior Audit — Area 2: Prompt Quality & Instruction Design

## Evidence Basis

- Prompt examples: templates/sdlc/agents/06-senior-developer.md:1, templates/sdlc/agents/21-test-agent.md:1, templates/sdlc/agents/18-critic-agent.md:1
- Handoff contract strictness: templates/sdlc/contracts/agent-handoff-contract.md:1
- Runtime prompt envelope and safety wrappers: platform/engine/runtime-adapter/prompt-assembly.ts:113, platform/engine/runtime-adapter/prompt-assembly.ts:145
- Context trust tagging and sanitization: platform/engine/agent-runtime-adapter.ts:116, platform/engine/agent-runtime-adapter.ts:342

## 2A/2B/2C/2D Prompt Quality Scoring (Representative Set)

[🟡 FRAGILE] PROMPT: templates/sdlc/agents/00-orchestrator.md:1 — Agent 00

- Clarity: 8/10 — very explicit process controller identity and rule list.
- Grounding: 6/10 — heavily grounded in process docs, but many obligations assume external enforcement not guaranteed by flow wiring.
- Format control: 7/10 — extensive mandatory structure but difficult to satisfy consistently in one pass.
- Guardrails: 8/10 — numerous must/must-not directives.
- Key weakness: instruction surface is so large that adherence reliability drops under long-context pressure.
- Rewrite priority: HIGH

[🟠 UNRELIABLE] PROMPT: templates/sdlc/agents/06-senior-developer.md:1 — Agent 06

- Clarity: 8/10 — clear role split for CREATE vs AUDIT.
- Grounding: 7/10 — demands source-backed claims and coverage gates.
- Format control: 9/10 — strong checklist and section ordering.
- Guardrails: 9/10 — repeated prohibitions and uncertainty handling.
- Key weakness: over-constrained output encourages mechanical checklist completion over adaptive reasoning quality.
- Rewrite priority: HIGH

[🟡 FRAGILE] PROMPT: templates/sdlc/agents/21-test-agent.md:1 — Agent 21

- Clarity: 8/10 — clear tiered testing workflow.
- Grounding: 7/10 — uses explicit artifacts from implementation outputs.
- Format control: 8/10 — required report schema is clear.
- Guardrails: 8/10 — well-defined out-of-scope boundaries.
- Key weakness: assumes reliable upstream artifacts and does not define fallback when those artifacts are stale/incomplete.
- Rewrite priority: MEDIUM

[🟡 FRAGILE] PROMPT: templates/sdlc/agents/18-critic-agent.md:1 — Agent 18

- Clarity: 9/10 — narrowly scoped evaluator role.
- Grounding: 7/10 — contract-based checks are concrete.
- Format control: 8/10 — explicit verdict structure.
- Guardrails: 8/10 — strong do-not directives.
- Key weakness: quality rubric still allows superficial pass/fail behavior without calibrated evidence weighting.
- Rewrite priority: MEDIUM

[🟡 FRAGILE] PROMPT: templates/sdlc/agents/19-risk-agent.md:1 — Agent 19

- Clarity: 8/10 — strong role demarcation.
- Grounding: 7/10 — explicitly tied to decisions and phase outputs.
- Format control: 7/10 — risk categories exist, but less strict machine-readability than other agents.
- Guardrails: 8/10 — conservative risk posture instructions.
- Key weakness: no explicit anti-overfitting mechanism for repetitive risk templates.
- Rewrite priority: MEDIUM

[🟡 FRAGILE] PROMPT: templates/sdlc/agents/36-questionnaire-agent.md:1 — Agent 36

- Clarity: 8/10 — two clear responsibilities.
- Grounding: 8/10 — strongly tied to BusinessDocs and contract format.
- Format control: 9/10 — structured output schema and naming conventions.
- Guardrails: 8/10 — plain-language and anti-hallucination mandates.
- Key weakness: strong template quality but weak runtime invocation coverage in main flow.
- Rewrite priority: HIGH

[⚪ PHANTOM] PROMPT: templates/sdlc/agents/37-scope-change-agent.md:1 — Agent 37

- Clarity: 9/10 — excellent boundary definition for premise-level change.
- Grounding: 8/10 — clear artifact paths and lifecycle outputs.
- Format control: 8/10 — strong report structures.
- Guardrails: 8/10 — explicit halt conditions.
- Key weakness: mismatch between high-quality prompt and absent guaranteed activation path in flow assignments.
- Rewrite priority: HIGH

## Cross-Cutting Prompt Findings

- Positive: prompt assembly explicitly instructs model to treat untrusted blocks as data and not instructions (platform/engine/runtime-adapter/prompt-assembly.ts:135).
- Positive: retrieved context is explicitly marked non-authoritative in user block (platform/engine/runtime-adapter/prompt-assembly.ts:71).
- Risk: large instruction payloads increase variance; context budgeting truncates content and may drop nuance (platform/engine/agent-runtime-adapter.ts:310, platform/engine/agent-runtime-adapter.ts:336).
- Risk: formatting expectations are strict, but error recovery depends on bounded retries/self-revision rather than schema-hard rejection at every stage (platform/engine/dispatcher.ts:1026, platform/engine/dispatcher.ts:1078).

## Area 2 Verdict

Prompt quality is generally high in clarity and constraints, but reliability is limited by prompt length, activation mismatches, and strong dependence on downstream retry/revision to repair first-pass failures.
