# Security Sweep 07: Prompt Injection and Tool-Loop Surfaces

## Scope

- Prompt assembly and model message construction
- Tool-use loop and model-to-tool feedback cycle
- Boundaries between trusted runtime data and untrusted model/user content

## Findings

### 1) Prompt injection surface via direct interpolation of user message + citations

- Severity: MAJOR
- Evidence:
  - src/webapp/routes/chat.ts:646
  - src/webapp/routes/chat.ts:684
  - src/webapp/routes/chat.ts:696
- Detail:
  - The LLM user message is composed by directly embedding `User message: ${input.message}` and citation excerpts into a single content block.
  - Retrieved citation excerpts can contain arbitrary text from indexed content; those excerpts are also injected into the same user turn.
- Risk:
  - Retrieved or user-provided text can carry instruction-like content that competes with intended assistant behavior.

### 2) Tool result reinjection as user-role content

- Severity: MAJOR
- Evidence:
  - src/webapp/routes/chat.ts:892
- Detail:
  - Tool execution results are serialized and fed back as a new `role: 'user'` message (`Tool execution results (JSON): ...`).
- Risk:
  - Any downstream model interpretation treats tool output as user content unless strongly constrained, increasing instruction-confusion risk.

### 3) Positive control: tool-loop round cap limits runaway chaining

- Severity: DEFENSE
- Evidence:
  - src/webapp/routes/chat.ts:866
  - src/webapp/routes/chat.ts:1243
- Detail:
  - Tool rounds are bounded and default to 4 rounds.
- Residual risk:
  - Prompt/tool confusion remains possible within those bounded rounds.

## Recommended Fixes

1. Introduce strict trust-boundary markup in LLM messages:

- Prefix user and citation data with explicit untrusted delimiters.
- Pass tool results as a dedicated tool role (if provider supports it), not user role.

2. Add prompt-injection mitigation layer:

- Reject or neutralize instruction-like patterns in retrieved citations.
- Add source-level allowlisting for high-trust collections.

3. Add telemetry + guardrail tests:

- Unit tests for prompt assembly ensuring immutable system policy framing.
- Regression tests for known prompt-injection payload families.

## Verdict for this area

- The architecture has basic loop safety but still exposes a meaningful prompt/tool confusion path that can influence model behavior under adversarial inputs.
