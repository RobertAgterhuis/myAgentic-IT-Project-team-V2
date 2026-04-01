# Agentic SDLC — Agent Behavior & Reasoning Quality Synthesis

## Agent Quality Overview

| Agent                   | Role                             | Prompt Quality | Reasoning | Output Quality | Failure Handling | Overall |
| ----------------------- | -------------------------------- | :------------: | :-------: | :------------: | :--------------: | :-----: |
| 00                      | Orchestrator                     |       8        |     7     |       6        |        8         |   🟡    |
| 06                      | Senior Developer                 |       8        |     5     |       4        |        7         |   🟠    |
| 18                      | Critic                           |       8        |     7     |       6        |        7         |   🟡    |
| 19                      | Risk                             |       8        |     6     |       6        |        7         |   🟡    |
| 21                      | Test                             |       8        |     7     |       6        |        7         |   🟡    |
| 23                      | Reevaluate                       |       7        |     4     |       3        |        4         |   ⚪    |
| 24                      | Feature                          |       7        |     4     |       3        |        4         |   ⚪    |
| 36                      | Questionnaire                    |       8        |     6     |       5        |        5         |   ⚪    |
| 37                      | Scope Change                     |       9        |     6     |       4        |        5         |   ⚪    |
| 38                      | Architecture Compliance Reviewer |       8        |     7     |       6        |        7         |   🟡    |
| Other phase specialists | domain-specific analysis roles   |       7        |     6     |       5        |        6         |   🟡    |

## Failure Mode Summary

| Failure Mode                                 | Agents Affected                | Likelihood | Impact |                Detection Exists?                |
| -------------------------------------------- | ------------------------------ | :--------: | :----: | :---------------------------------------------: |
| Hallucination / unverified claims            | all analysis-heavy agents      |    MED     |  HIGH  |                     PARTIAL                     |
| Degenerate loops / repetitive outputs        | 06 and similar execution paths |    MED     |  MED   |                     PARTIAL                     |
| Scope drift                                  | orchestrator + phase agents    |    MED     |  HIGH  |                     PARTIAL                     |
| Silent failure via assignment drift          | 23/24/36/37                    |    HIGH    |  HIGH  | NO (explicit automated parity gate not visible) |
| Cascading error from weak upstream artifacts | 18/19/21 downstream            |    MED     |  HIGH  |                     PARTIAL                     |
| Format mismatch                              | handoff consumers              |    MED     |  MED   |            YES (contracts/verifier)             |
| Context loss                                 | all long-context prompts       |    MED     |  MED   |        NO strong truncation impact alert        |

## Top 10 Most Impactful Findings

| Rank | Area     | Agent(s)    | Finding                                                      | Impact on Output Quality                                   |
| ---- | -------- | ----------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 1    | Area 1/4 | 23/24/36/37 | Defined agents not in runtime assignment flow                | High trust gap between design intent and executed behavior |
| 2    | Area 6   | 06          | Repetitive low-information sandbox outputs                   | Usability without human correction is low                  |
| 3    | Area 2   | 00+many     | Prompt surface too large and over-constrained                | Compliance-looking output can hide shallow reasoning       |
| 4    | Area 3   | all         | Self-correction mainly externalized to dispatcher            | First-pass quality remains inconsistent                    |
| 5    | Area 5   | systemic    | Structural pass can outscore semantic depth                  | Reliability appears better than it is                      |
| 6    | Area 7   | all         | No strong A/B prompt evaluation harness                      | Prompt changes are hard to validate safely                 |
| 7    | Area 4   | all         | Handoff contract richer than many observed artifacts         | Inter-agent context quality degrades downstream            |
| 8    | Area 7   | all         | Human feedback loop exists only as review flags, not ratings | Slow learning from real user outcomes                      |
| 9    | Area 3   | all         | Confidence routing exists but confidence often heuristic     | Routing can be directionally right but uncalibrated        |
| 10   | Area 5   | all         | Context truncation has limited impact visibility             | Hidden omissions can skew decisions                        |

## Final Verdict

1. Are these agents or wrappers?

- Mixed. This is more than simple wrappers: there is multi-step orchestration, tool loops, verifier pass, self-revision, and confidence routing (platform/engine/dispatcher.ts:1026, platform/engine/runtime-adapter/tool-loop.ts:38, platform/engine/self-revision.ts:74). But practical behavior quality still often resembles prompt wrappers when outputs are shallow.

2. Output reliability estimate (usable without correction)

- 00 Orchestrator: 75%
- 18 Critic: 68%
- 19 Risk: 65%
- 21 Test: 66%
- 06 Senior Developer (observed lane): 42%
- 23 Reevaluate: 20% (flow invocation gap)
- 24 Feature: 20% (flow invocation gap)
- 36 Questionnaire: 30% as explicit runtime agent (despite good prompt)
- 37 Scope Change: 25% as explicit runtime agent
- 38 Architecture Compliance Reviewer: 62%

3. Weakest agent

- Agent 06 in observed artifacts, due repeated low-entropy output patterns (BusinessDocs/session/agent-runs/2026-04-01T11-01-35-252Z-06.md:1). Fix requires stronger semantic novelty checks, stricter acceptance mapping, and reject-on-template-only outputs.

4. Strongest agent

- Agent 00 (Orchestrator) for process reliability, because state machine and transitions are explicit and observable (platform/engine/engine.ts:149, BusinessDocs/session/transition-events.json:1).

5. Missing reasoning capability

- Calibrated uncertainty with evidence-weighted abstention. Current system flags uncertainty, but does not robustly enforce abstain/clarify-before-continue across all agents.

6. Proper evaluation framework (top 5 dimensions)

- Task success correctness: golden tasks with exact expected acceptance outcomes.
- Evidence faithfulness: every claim mapped to source snippets and line refs.
- Repair efficiency: correction rounds required to reach accepted output.
- Cross-agent consistency: contradiction rate between phase outputs and reviewers.
- Cost-quality frontier: token/cost per successful completion under fixed quality threshold.

7. Honest assessment vs manual copy-paste prompting

- It is meaningfully better than manual prompting in orchestration, traceability, and policy scaffolding (state machine, contracts, verifier, metrics).
- It is not yet meaningfully better in semantic reliability for all agents; some outputs still require substantial human correction and resemble structured prompt wrappers with retries.

## Bottom Line

The platform is an orchestrated agent framework with real control-plane depth, but behavior reliability is uneven. Production trust should be conditional on closing assignment drift, strengthening semantic evals, and hardening output-quality gates beyond structural compliance.
