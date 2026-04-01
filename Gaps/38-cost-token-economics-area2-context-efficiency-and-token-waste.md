# Area 2 - Context Efficiency and Token Waste

## Key context-shaping mechanics

- Runtime adapter builds many context blocks (skill, predecessors, questionnaire, RAG matches, session state) then applies token budgeting/truncation: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L1000), [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L1070).
- Context budget defaults to `max(2048, maxTokens*3)` when env override is absent: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L311).
- Budgeting truncates by estimated token budget and can drop remaining blocks after exhaustion: [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts#L319), [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts#L152).
- Chat route includes only first 5 citations in prompt assembly: [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts#L677).

## Efficiency strengths

1. There is explicit pre-send budgeting and truncation logic.
2. Citation fan-in is capped in chat prompt composition.
3. Sanitization attempts reduce irrelevant adversarial text inflation.

## Waste vectors still present

1. Repeated full prompt envelopes across retries/repair cycles can re-send large context blocks.
2. Tool loops append JSON tool results back into the prompt, increasing subsequent prompt-token cost each round.
3. Validation retry path can duplicate near-identical context with only small repair instructions appended.
4. No evidence of semantic deduplication across repeated predecessor snippets before tokenization.

## Quantified waste model

Let:

- $B$ = baseline prompt tokens for first attempt
- $\Delta_{tool}$ = extra prompt tokens added per tool round
- $\Delta_{repair}$ = extra prompt tokens added per validation retry
- $R_u$ = tool rounds, $R_v$ = validation retries

Prompt-side total across one invocation approximates:

$$
T_{prompt,total} \approx (R_v+1)\left[B + \sum_{i=1}^{R_u} i\cdot \Delta_{tool}\right] + R_v\cdot \Delta_{repair}
$$

Token waste ratio vs single-pass baseline:

$$
Waste\% = \frac{T_{prompt,total}-B}{B}\times 100
$$

## Numeric scenario

Assume:

- $B=6{,}000$
- $\Delta_{tool}=900$
- $R_u=3$
- $R_v=1$
- $\Delta_{repair}=700$

Then:

$$
T_{prompt,total}=2\left[6000 + (1+2+3)\cdot 900\right] + 700 = 23500
$$

$$
Waste\%=\frac{23500-6000}{6000}\times100\approx 291.7\%
$$

This indicates nearly 4x baseline prompt tokens in a moderate loop scenario.

## Area 2 verdict

- Context budget controls exist and are meaningful.
- However, compounding loop mechanics can still create very high prompt-token amplification.
- Biggest optimization opportunity: delta-prompting and context dedupe across retries/tool rounds.
