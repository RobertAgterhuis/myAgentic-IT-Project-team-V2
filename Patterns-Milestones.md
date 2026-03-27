# Patterns Milestones, Epics, and GitHub-Publishable Issues

## Goal

Raise the repository's average Agentic Design Patterns score from 9.02/10 to at least 9.90/10 without weakening its current strengths in governance, guardrails, MCP, and human supervision.

## Milestone M1: Close The Intelligence Loop

Target score impact:

- Learning and Adaptation: 7.1 -> 8.8
- Goal Setting and Monitoring: 8.7 -> 9.2
- Evaluation and Monitoring: 9.4 -> 9.6

### Epic E1: Adaptive Policy Learning From Operational Evidence

Epic rationale:
The platform already captures reevaluate triggers, retrospectives, benchmark artifacts, and runtime metrics, but it does not yet convert them into durable execution policy changes.

Issues:

1. Issue: Build lessons-to-policy pipeline

- Labels: epic:E1, pattern:learning-adaptation, area:orchestration
- Problem: Retrospective and reevaluate outputs are not automatically transformed into routing, prompting, or validation policy updates.
- Acceptance criteria:
  - Parse reevaluate and retrospective artifacts into a normalized lessons registry.
  - Support policy recommendations for routing, prompt profile, validation strictness, and retrieval profile changes.
  - Produce a machine-readable change proposal artifact with rollback metadata.

2. Issue: Persist agent failure taxonomy and remediation rules

- Labels: epic:E1, pattern:learning-adaptation, area:runtime
- Problem: Failures are handled, but not classified into a reusable improvement corpus.
- Acceptance criteria:
  - Add structured failure classes for tool loops, provider fallback, missing evidence, contract violations, and approval bottlenecks.
  - Record remediation success rate per class.
  - Surface recommended mitigations in observability and cockpit APIs.

3. Issue: Add benchmark-driven configuration tuning

- Labels: epic:E1, pattern:learning-adaptation, pattern:evaluation-monitoring, area:performance
- Problem: Benchmarks exist but do not tune runtime behavior automatically.
- Acceptance criteria:
  - Compare current benchmark artifacts to previous baselines.
  - Generate bounded tuning proposals for concurrency, retrieval thresholds, and human-review thresholds.
  - Require explicit approval before applying a tuning proposal.

### Epic E2: Objective Graph And Goal Health

Epic rationale:
The repository monitors execution well, but goals remain too implicit across documents, metrics, and sprint decisions.

Issues:

1. Issue: Introduce machine-readable objective graph

- Labels: epic:E2, pattern:goal-monitoring, area:planning
- Problem: Goals, KPIs, epics, sprint items, and agents are not linked in one graph.
- Acceptance criteria:
  - Add a canonical objective graph schema.
  - Link goals to KPIs, epics, sprint stories, responsible agents, and gates.
  - Expose the graph through API and MCP read operations.

2. Issue: Implement goal health scoring

- Labels: epic:E2, pattern:goal-monitoring, pattern:prioritization, area:observability
- Problem: The system lacks a unified view of whether strategic goals are healthy, at risk, or off track.
- Acceptance criteria:
  - Compute status per goal using KPI drift, blocker count, open decisions, and benchmark regressions.
  - Surface at-risk goals in cockpit and sprint gate views.
  - Provide recommended next actions tied to each unhealthy goal.

## Milestone M2: Upgrade Reasoning And Collaboration

Target score impact:

- Reasoning Techniques: 7.9 -> 9.5
- Inter-Agent Communication: 8.3 -> 9.4
- Reflection: 8.9 -> 9.5

### Epic E3: Explicit Reasoning Profiles And Verifiers

Epic rationale:
The system uses grounded prompts and external critique, but it does not yet expose reasoning as a configurable strategy.

Issues:

1. Issue: Add reasoning profiles to runtime adapter

- Labels: epic:E3, pattern:reasoning-techniques, area:runtime
- Problem: All tasks are treated with roughly the same reasoning shape.
- Acceptance criteria:
  - Support profiles such as fast, critique-first, debate, verifier-heavy, and synthesis-safe.
  - Allow per-agent and per-task profile selection.
  - Record reasoning profile used in execution metadata.

2. Issue: Add verifier pass for high-risk deliverables

- Labels: epic:E3, pattern:reasoning-techniques, pattern:reflection, area:quality
- Problem: High-risk outputs rely on later-stage critique rather than immediate verifier checks.
- Acceptance criteria:
  - Trigger verifier pass for architecture, security, synthesis, and sprint-gate outputs.
  - Validate source coverage, contradiction risk, and contract completeness.
  - Fail closed or require human approval when verifier confidence is low.

3. Issue: Add selective self-revision before handoff

- Labels: epic:E3, pattern:reflection, area:orchestration
- Problem: Most reflection is externalized to Critic/Risk after the fact.
- Acceptance criteria:
  - Add pre-handoff self-review mode for configured agents.
  - Compare draft and revised output with revision reasons.
  - Log improvement deltas and residual uncertainties.

### Epic E4: Typed A2A Messaging Layer

Epic rationale:
The current handoff model is effective but too file-centric and orchestrator-mediated to score near-perfectly on A2A.

Issues:

1. Issue: Define A2A message contract

- Labels: epic:E4, pattern:a2a, area:schema
- Problem: There is no typed protocol for direct agent clarifications and rebuttals.
- Acceptance criteria:
  - Define message classes for request, clarification, challenge, rebuttal, evidence, and acceptance.
  - Support provenance, urgency, and required response semantics.
  - Version the contract in platform/schema.

2. Issue: Add peer clarification workflow

- Labels: epic:E4, pattern:a2a, pattern:multi-agent, area:engine
- Problem: Agents cannot directly request clarification from peers without escalating to a broader reevaluate path.
- Acceptance criteria:
  - Allow configured peer requests inside a bounded workflow.
  - Persist message threads with provenance.
  - Escalate unresolved conflicts to Critic/Risk or human approval.

3. Issue: Add collaboration traces to observability

- Labels: epic:E4, pattern:a2a, pattern:evaluation-monitoring, area:observability
- Problem: There is no consolidated measurement of collaboration quality.
- Acceptance criteria:
  - Track message counts, resolution time, escalation rate, and contradiction rate per agent pair.
  - Surface top-friction collaboration pairs in dashboards.
  - Correlate collaboration quality with deliverable quality.

## Milestone M3: Make Discovery And Optimization Proactive

Target score impact:

- Exploration and Discovery: 8.4 -> 9.4
- Resource-Aware Optimization: 8.8 -> 9.5
- Routing: 9.1 -> 9.6

### Epic E5: Proactive Discovery Engine

Epic rationale:
The platform can retrieve known information well, but it does not yet proactively search for weak evidence, stale knowledge, and hidden contradictions.

Issues:

1. Issue: Add stale knowledge scanner

- Labels: epic:E5, pattern:exploration-discovery, pattern:rag, area:knowledge
- Problem: Discovery is currently user-initiated or workflow-initiated.
- Acceptance criteria:
  - Detect stale decisions, stale RAG collections, and superseded artifacts.
  - Emit discovery findings with severity and affected workflows.
  - Offer reevaluate recommendations when staleness crosses threshold.

2. Issue: Add contradiction and missing-citation discovery

- Labels: epic:E5, pattern:exploration-discovery, pattern:guardrails, area:quality
- Problem: Contradictions are caught late and inconsistently.
- Acceptance criteria:
  - Scan phase outputs and synthesis artifacts for contradictory decisions and uncited claims.
  - Produce machine-readable findings and citation repair suggestions.
  - Block synthesis publication when contradiction severity is critical.

3. Issue: Add exploratory branch generation for high-uncertainty work

- Labels: epic:E5, pattern:exploration-discovery, pattern:planning, area:runtime
- Problem: The system commits too early to a single path when uncertainty is high.
- Acceptance criteria:
  - Support optional generation of alternative plan branches.
  - Compare branch tradeoffs by risk, effort, and expected value.
  - Surface top alternatives at sprint gate or approval time.

### Epic E6: Dynamic Resource And Routing Optimization

Epic rationale:
The repository already uses bounded execution and solid defaults. The missing step is live tuning.

Issues:

1. Issue: Add dynamic concurrency policy

- Labels: epic:E6, pattern:resource-aware-optimization, pattern:parallelization, area:performance
- Problem: Concurrency is capped but not adaptively tuned.
- Acceptance criteria:
  - Tune maxConcurrency using queue wait, failure rate, and throughput trends.
  - Apply safe bounds and rollback on regression.
  - Record policy changes in audit logs.

2. Issue: Add adaptive retrieval-depth and threshold policy

- Labels: epic:E6, pattern:resource-aware-optimization, pattern:rag, pattern:routing, area:knowledge
- Problem: Retrieval depth is largely static.
- Acceptance criteria:
  - Adjust topK and threshold based on citation usefulness, no-match rate, and latency budget.
  - Apply different policies for low-risk and high-risk tasks.
  - Record retrieval policy choice in execution metadata.

3. Issue: Add confidence-aware route escalation

- Labels: epic:E6, pattern:routing, pattern:human-in-loop, area:engine
- Problem: Routing does not escalate intelligently enough from fast-path to deep-path behavior.
- Acceptance criteria:
  - Route low-confidence tasks to deeper reasoning, verifier mode, or human approval.
  - Route high-confidence, low-risk tasks through reduced-latency execution paths.
  - Report escalation reasons in runtime traces.

## Milestone M4: Finish To 9.9+

Definition of done:

- Average score >= 9.90 across all 21 pattern files.
- No pattern remains below 9.4.
- Governance, guardrails, MCP, and human-in-the-loop scores remain at or above current levels.
- Benchmark, observability, and approval surfaces expose the new adaptive behaviors.
- All new policies are auditable, reversible, and covered by tests.

## Recommended GitHub Rollout Order

1. Create milestones M1 through M4.
2. Create epics E1 through E6 as tracking issues.
3. Create the issues under each epic exactly as listed above.
4. Link each issue back to the affected pattern files and the synthesis report.
5. Track score movement after each milestone by updating the individual pattern markdown files and Patterns-Synthesis.md.
