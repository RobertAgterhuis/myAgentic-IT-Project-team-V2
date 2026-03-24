# A1 — Agent Architecture

**Dimension:** Agentic System Design — Orchestration & Agent Topology  
**Score: 8 / 10**

---

## What Was Evaluated

How agents are defined, registered, invoked, and coordinated. Whether the orchestration model is deterministic or ad-hoc. Whether states, transitions, and agent roles are well-separated.

---

## Findings

### 1. Deterministic FSM — Real (platform/engine/state-machine.ts)

The orchestration layer is a typed, deterministic finite-state machine with **14 named states**:

```
IDLE → ONBOARDING → PHASE_1 → CRITIC_1 → PHASE_2 → CRITIC_2
     → PHASE_3 → CRITIC_3 → PHASE_4 → CRITIC_4
     → SYNTHESIS → SPRINT_GATE → PHASE_5_EXECUTING → COMPLETED
     (+ERROR terminal)
```

Source: `platform/engine/state-machine.ts` — `buildTransitionMap()` dynamically filters the full flow to the command mode selected, keeping structural states (IDLE, ERROR, COMPLETED) always present.

### 2. Eight Command Modes — Real

`CREATE`, `AUDIT`, `CREATE_BUSINESS`, `CREATE_TECH`, `CREATE_UX`, `FEATURE`, `SCOPE_CHANGE`, `HOTFIX` — each a predefined subset of phases. Source: `platform/engine/state-machine.ts` lines covering `COMMAND_PHASE_MAPS`.

HOTFIX is a bypass route that skips all phases and gates — appropriate for emergency patching. SCOPE_CHANGE does re-analysis without reinstating the full SDLC cycle.

### 3. 39 Agent Skill Files — Prompt Templates Only

All 39 agent definitions under `templates/sdlc/agents/00-orchestrator.md` through `38-architecture-compliance-reviewer.md` are pure Markdown prompt templates. They define:

- Role and responsibility boundary
- Skill contract constraints
- Expected output sections
- Handoff checklist schema

These are **not code**. They are read by the dispatcher at runtime and injected into the prompt envelope. This is the correct design for LLM-backed agents — separating behavior specification from invocation infrastructure.

### 4. Dispatcher — Real Orchestration Logic (platform/engine/dispatcher.ts)

`dispatcher.ts` is a substantive 322-line TypeScript file (163 lines covered, 50% branch) that performs:

- Platform routing: `copilot | claude | openai` selection
- Context injection: predecessor outputs + questionnaire answers + RAG context + session state
- Confidence scoring: `assessConfidence()` returns `{confidence, uncertainty_reasons, needs_human_review}` with 5 weighted factors
- Error severity classification: TRANSIENT/RECOVERABLE/FATAL via regex pattern matching
- Typed `AgentExecutionContext` struct with workspaceId, agentId, skillFile, ragContext, gitService

**Gap:** Dispatcher coverage at 50% branch coverage — the error recovery and confidence scoring branches are underexercised in tests.

### 5. Engine Hooks — Extensible (platform/engine/engine.ts)

`beforeTransition`, `afterTransition`, `onGateResult`, `onError` hook points in `engine.ts` allow new cross-cutting concerns to be added without touching the core state machine. Agent-performance-hook (token metrics), sprint-gate, and artifact-registration are all wired as `afterTransition` hooks.

### 6. Declarative Flow Definition — Real (platform/engine/flows.yaml)

The FSM state/transition graph is defined in `flows.yaml` and loaded at startup by `flow-loader.ts`. This enables the transition graph to be changed without code modification — important for experimentation with new command modes.

### 7. CLI Entry Point (platform/engine/cli.ts)

A CLI invocation path exists (`cli.ts`, 171 lines, 78% line coverage) for running the engine outside the web server — enabling batch execution, CI integration, and testing without the full HTTP stack.

---

## Strengths

1. **Typed orchestration** — No stringly-typed state names. States and transitions are TypeScript enums/maps, giving compile-time guarantees.
2. **Phase isolation** — Each CRITIC gate is a separate validation pass; PHASE_N agents cannot short-circuit the gate. This prevents lazy LLM outputs from propagating.
3. **Separation of concerns** — Skill files (what to do), dispatcher (how to invoke), FSM (when to invoke) are three separate concerns with clear interfaces.
4. **Extensible hook system** — New platform-wide behaviors can be added as hooks without modifying the core engine loop.
5. **HOTFIX bypass** — Emergency path exists and is named explicitly, not a silent workaround.

---

## Weaknesses

1. **50% dispatcher branch coverage** — The most critical decision-making logic in the system (confidence scoring, error retry classification) has incomplete test coverage. Source: `coverage-summary.json` — `dispatcher.ts` branches at 46.69%.
2. **Agent invocation is synchronous per run** — The FSM advances one agent at a time. Phases with multiple agents (e.g., PHASE_1 runs BA + Domain Expert + Sales + Financial + Product Manager) appear to run sequentially rather than in parallel, which limits throughput on long pipelines.
3. **No inter-agent message passing** — Agents communicate only via predecessor output files. There is no typed, structured message contract between agents — a later agent receives the entire predecessor markdown output as context, not a parsed data structure.
4. **`template-loader.ts` at 57% line coverage** — The loader that reads skill file templates from disk is the critical path for all agent invocations, yet only 57% covered. Source: `coverage-summary.json`.

---

## Recommended Improvements

1. Raise dispatcher test coverage to ≥80% branch — focus on confidence scoring path and retry classification.
2. Add a structured output contract per agent (JSON schema in the skill file frontmatter) so the dispatcher can validate the specific deliverable shape before gate passage, not just check section headers.
3. Consider parallelizing independent agents within a phase using `Promise.allSettled` — particularly for PHASE_1 where BA, Domain Expert, and Financial Analyst have no data dependency on each other.

---

## Source References

| File                               | Lines Read                                         | Key Finding                                             |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `platform/engine/state-machine.ts` | 1–123                                              | 14 states, buildTransitionMap, 8 command modes          |
| `platform/engine/engine.ts`        | 1–184                                              | Hook points, PHASE_GATE_TRANSITION_MAP                  |
| `platform/engine/dispatcher.ts`    | 1–322                                              | Platform routing, confidence scoring, context injection |
| `platform/engine/flows.yaml`       | 1–80                                               | Declarative FSM definition                              |
| `platform/engine/cli.ts`           | 1–171                                              | CLI invocation path                                     |
| `templates/sdlc/agents/`           | all 39 files                                       | Pure markdown skill files                               |
| `coverage/coverage-summary.json`   | dispatcher, state-machine, template-loader entries | Coverage gaps                                           |
