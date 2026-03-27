# Agentic Design Patterns — Index

Audit of the `myAgentic-IT-Project-team-V2` repository against the 21 agentic design patterns from Antonio Gulli's framework.

**Overall score: 9.02 / 10** · Target after milestone execution: **9.91 / 10**

See [Patterns-Synthesis.md](Patterns-Synthesis.md) for roll-up scorecard and gap narrative.  
See [Patterns-Milestones.md](Patterns-Milestones.md) for the GitHub milestone/epic/issue backlog.

---

## Pattern Scores At A Glance

| #   | Pattern                         |   Score    | File                                                                                    |
| --- | ------------------------------- | :--------: | --------------------------------------------------------------------------------------- |
| 1   | Prompt Chaining                 |    9.3     | [01-prompt-chaining.md](Patterns/01-prompt-chaining.md)                                 |
| 2   | Routing                         |    9.1     | [02-routing.md](Patterns/02-routing.md)                                                 |
| 3   | Parallelization                 |    9.4     | [03-parallelization.md](Patterns/03-parallelization.md)                                 |
| 4   | Reflection                      |    8.9     | [04-reflection.md](Patterns/04-reflection.md)                                           |
| 5   | Tool Use                        |    8.9     | [05-tool-use.md](Patterns/05-tool-use.md)                                               |
| 6   | Planning                        |    9.2     | [06-planning.md](Patterns/06-planning.md)                                               |
| 7   | Multi-Agent                     |    9.6     | [07-multi-agent.md](Patterns/07-multi-agent.md)                                         |
| 8   | Memory Management               |    9.3     | [08-memory-management.md](Patterns/08-memory-management.md)                             |
| 9   | Learning and Adaptation         | **7.1** ⚠️ | [09-learning-and-adaptation.md](Patterns/09-learning-and-adaptation.md)                 |
| 10  | Model Context Protocol (MCP)    |    9.8     | [10-model-context-protocol-mcp.md](Patterns/10-model-context-protocol-mcp.md)           |
| 11  | Goal Setting and Monitoring     |    8.7     | [11-goal-setting-and-monitoring.md](Patterns/11-goal-setting-and-monitoring.md)         |
| 12  | Exception Handling and Recovery |    9.2     | [12-exception-handling-and-recovery.md](Patterns/12-exception-handling-and-recovery.md) |
| 13  | Human-in-the-Loop               |    9.7     | [13-human-in-the-loop.md](Patterns/13-human-in-the-loop.md)                             |
| 14  | Knowledge Retrieval (RAG)       |    9.4     | [14-knowledge-retrieval-rag.md](Patterns/14-knowledge-retrieval-rag.md)                 |
| 15  | Inter-Agent Communication (A2A) |    8.3     | [15-inter-agent-communication-a2a.md](Patterns/15-inter-agent-communication-a2a.md)     |
| 16  | Resource-Aware Optimization     |    8.8     | [16-resource-aware-optimization.md](Patterns/16-resource-aware-optimization.md)         |
| 17  | Reasoning Techniques            | **7.9** ⚠️ | [17-reasoning-techniques.md](Patterns/17-reasoning-techniques.md)                       |
| 18  | Guardrails / Safety Patterns    |    9.8     | [18-guardrails-safety-patterns.md](Patterns/18-guardrails-safety-patterns.md)           |
| 19  | Evaluation and Monitoring       |    9.4     | [19-evaluation-and-monitoring.md](Patterns/19-evaluation-and-monitoring.md)             |
| 20  | Prioritization                  |    9.3     | [20-prioritization.md](Patterns/20-prioritization.md)                                   |
| 21  | Exploration and Discovery       |    8.4     | [21-exploration-and-discovery.md](Patterns/21-exploration-and-discovery.md)             |

⚠️ = score below 8.0 (highest-priority uplift targets)

---

## Milestone Map

Milestones must be executed in order — each milestone is a prerequisite for the next.

```
M1: Close The Intelligence Loop
  └─ (unblocks) M2: Upgrade Reasoning And Collaboration
       └─ (unblocks) M3: Make Discovery And Optimization Proactive
            └─ (unblocks) M4: Finish To 9.9+
```

### M1 — Close The Intelligence Loop _(prerequisite for M2)_

Targets: Learning & Adaptation 7.1→8.8, Goal Setting 8.7→9.2, Evaluation 9.4→9.6

- **E1** Adaptive Policy Learning From Operational Evidence
  - Build lessons-to-policy pipeline
  - Persist agent failure taxonomy and remediation rules
  - Add benchmark-driven configuration tuning
- **E2** Objective Graph And Goal Health
  - Introduce machine-readable objective graph
  - Implement goal health scoring

### M2 — Upgrade Reasoning And Collaboration _(requires M1, unblocks M3)_

Targets: Reasoning 7.9→9.5, A2A 8.3→9.4, Reflection 8.9→9.5

- **E3** Explicit Reasoning Profiles And Verifiers
  - Add reasoning profiles to runtime adapter
  - Add verifier pass for high-risk deliverables
  - Add selective self-revision before handoff
- **E4** Typed A2A Messaging Layer
  - Define A2A message contract
  - Add peer clarification workflow
  - Add collaboration traces to observability

### M3 — Make Discovery And Optimization Proactive _(requires M2, unblocks M4)_

Targets: Exploration & Discovery 8.4→9.4, Resource-Aware Optimization 8.8→9.5, Routing 9.1→9.6

- **E5** Proactive Discovery Engine
  - Add stale knowledge scanner
  - Add contradiction and missing-citation discovery
  - Add exploratory branch generation for high-uncertainty work
- **E6** Dynamic Resource And Routing Optimization
  - Add dynamic concurrency policy
  - Add adaptive retrieval-depth and threshold policy
  - Add confidence-aware route escalation

### M4 — Finish To 9.9+ _(requires M3)_

Definition of done: All 21 patterns ≥ 9.4, average ≥ 9.90.

---

## Source Reference

- Framework: Antonio Gulli's 21 Agentic Design Patterns
- Evidence base: Repository grep/read audit, March 2026
- Scoring scale: 10.0 = deeply implemented, operational, adaptive
