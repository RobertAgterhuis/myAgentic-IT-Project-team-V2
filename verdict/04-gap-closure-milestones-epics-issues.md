# Gap Closure Plan — Milestones, Epics, and Issues (Blocking-First)

Source basis:

- [03-final-verdict.md](./03-final-verdict.md)
- [01-gulli-pattern-audit.md](./01-gulli-pattern-audit.md)
- [02-sdlc-quality-product-audit.md](./02-sdlc-quality-product-audit.md)

Objective:

- Close the highest-risk maturity gaps that block moving from Working MVP (Level 4) toward production-grade autonomous SDLC.
- Implement in strict dependency order so each step unlocks the next one.

## Delivery Order (What Blocks What)

1. M1: Closed-loop self-correction in dispatcher
   - Blocks M2, M3, M4, and M5.
   - Rationale: if the system cannot self-correct reliably, adding autonomy depth increases failure velocity.

2. M2: Real autonomous lane (no mocks) with end-to-end proof
   - Blocks M3 and M5.
   - Rationale: adaptation and SLA routing should optimize a real lane, not a synthetic benchmark.

3. M3: Bounded adaptive policy loop (safe auto-apply + rollback)
   - Partially blocked by M2 evidence quality.
   - Rationale: safe learning requires real run telemetry and benchmark gates.

4. M4: A2A operational coordination (not just tracing)
   - Partially blocked by M1 (needs stable correction path).
   - Rationale: multi-agent coordination should sit on top of stable single-agent corrective behavior.

5. M5: SLA-aware prioritization + deployment confidence lane
   - Blocked by M2 (proof lane) and informed by M3/M4 outputs.
   - Rationale: prioritize and release based on trustworthy runtime signals.

## Milestones

## M1 — Close Reflection Loop in Hot Path (BLOCKING)

Target outcome:

- Verifier findings can trigger bounded revise-and-reinvoke before terminal failure.

Definition of done:

- Dispatcher invokes SelfRevisionService on quality/verifier failure.
- Max revision attempts configurable and enforced.
- Revision events and outcomes are traceable in run artifacts.
- Integration tests verify successful self-correction and controlled fail/escalate paths.

### Epic M1-E1 — Dispatcher-Centric Self-Correction Runtime

- Issue M1-E1-I1: Add revision-decision hook in dispatcher failure handling.
- Issue M1-E1-I2: Introduce bounded reinvocation policy (attempt caps, jitter/backoff, stop reasons).
- Issue M1-E1-I3: Inject revision instructions into next invocation context envelope.
- Issue M1-E1-I4: Emit structured telemetry for revision attempt lifecycle.

### Epic M1-E2 — Validation and Safety Gates for Reflection

- Issue M1-E2-I1: Add integration tests for revise-success and revise-fail escalation.
- Issue M1-E2-I2: Add regression tests for no infinite loops / bounded retries.
- Issue M1-E2-I3: Add CI gate for reflection flow coverage.

## M2 — Prove Real Autonomous Lane End-to-End (BLOCKING)

Target outcome:

- One real sandboxed issue -> code edit -> test -> PR flow using real tool/runtime path (no mock adapter).

Definition of done:

- Replaces mocked flagship autonomous-lane proof with real sandbox execution path.
- Stores reproducible artifact trail (commands, outputs, diffs, test results, PR URL).
- Fails safely behind approvals/guardrails.

### Epic M2-E1 — Real Runtime Adapter Lane

- Issue M2-E1-I1: Build sandbox runtime adapter for branch-safe edits and command execution.
- Issue M2-E1-I2: Implement golden-path autonomous workflow harness using real tools.
- Issue M2-E1-I3: Persist replay bundle with correlation ID (tool calls, logs, outputs).

### Epic M2-E2 — Replace Synthetic Proof and Add Trust Signals

- Issue M2-E2-I1: Replace/retire mocked autonomous-lane integration test as primary proof.
- Issue M2-E2-I2: Add success criteria dashboard split (mocked/manual/autonomous).
- Issue M2-E2-I3: Add approval checkpoints and rollback hooks for sandbox lane.

## M3 — Adaptive Policy Loop with Safe Auto-Apply

Target outcome:

- Low-risk lessons-to-policy proposals can auto-apply under benchmark and rollback controls.

Definition of done:

- Policy changes are risk-classified.
- Low-risk class can auto-apply when benchmark thresholds pass.
- Rollback metadata and reversible operations are required for all auto-applied changes.

### Epic M3-E1 — Risk-Based Lessons Automation

- Issue M3-E1-I1: Add risk classifier for lessons-to-policy proposals.
- Issue M3-E1-I2: Implement auto-apply path for low-risk proposals with guard conditions.
- Issue M3-E1-I3: Add rollback journal and one-command revert path.

### Epic M3-E2 — Benchmark-Gated Adaptation Controls

- Issue M3-E2-I1: Define benchmark thresholds required for auto-apply.
- Issue M3-E2-I2: Add adaptation audit events to observability.
- Issue M3-E2-I3: Add fail-closed behavior when benchmark data is missing.

## M4 — Operational A2A Coordination

Target outcome:

- A2A becomes an active orchestration primitive with conflict handling and capability discovery.

Definition of done:

- Coordinator can request/compare/reconcile peer agent outputs on contested tasks.
- Capability discovery and routing confidence are surfaced.
- Conflict-resolution outcomes are persisted and queryable.

### Epic M4-E1 — A2A Control Path

- Issue M4-E1-I1: Add capability discovery interface for agent selection.
- Issue M4-E1-I2: Implement dispute/rebuttal protocol for conflicting outputs.
- Issue M4-E1-I3: Add fan-in synthesis policy for parallel branches.

### Epic M4-E2 — A2A Observability and Governance

- Issue M4-E2-I1: Extend A2A tracer with conflict-resolution state model.
- Issue M4-E2-I2: Add governance/approval hooks for high-risk multi-agent divergence.
- Issue M4-E2-I3: Add integration tests for coordinated multi-agent conflict scenarios.

## M5 — SLA-Aware Prioritization and Deployment Confidence

Target outcome:

- Queue and execution modes prioritize by SLA/risk; deploy lane includes staged rollout confidence checks.

Definition of done:

- Scheduler orders work by SLA urgency, risk, and phase criticality.
- Deploy lane has staged rollout + rollback criteria + approval policy.
- Runtime dashboards show orchestration latency budgets and breach signals.

### Epic M5-E1 — SLA/Risk Scheduling

- Issue M5-E1-I1: Add SLA model and risk weight inputs to queue prioritization.
- Issue M5-E1-I2: Route execution mode using confidence/risk thresholds.
- Issue M5-E1-I3: Add fairness controls per workspace to prevent noisy-neighbor starvation.

### Epic M5-E2 — Deployment Confidence Lane

- Issue M5-E2-I1: Add staged rollout orchestration with gates and rollback triggers.
- Issue M5-E2-I2: Add release evidence bundle requirements (tests, approvals, provenance).
- Issue M5-E2-I3: Add SLO dashboards for orchestration and release readiness.

## Dependency Map (Implementation Graph)

- M1-E1 -> M1-E2 -> M2-E1 -> M2-E2 -> M3-E1 -> M3-E2
- M1-E1 -> M4-E1 -> M4-E2
- M2-E2 + M3-E2 + M4-E2 -> M5-E1 -> M5-E2

## GitHub Creation Plan

Milestone order on GitHub:

1. M1 — Close Reflection Loop in Hot Path (BLOCKING)
2. M2 — Prove Real Autonomous Lane End-to-End (BLOCKING)
3. M3 — Adaptive Policy Loop with Safe Auto-Apply
4. M4 — Operational A2A Coordination
5. M5 — SLA-Aware Prioritization and Deployment Confidence

Issue label conventions:

- type:epic
- type:task
- area:orchestrator
- area:runtime
- area:quality
- area:a2a
- area:ops
- priority:p0 / priority:p1 / priority:p2
- blocking

## Tracking Fields (to be filled after GitHub creation)

Milestones:

- M1: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/150
- M2: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/151
- M3: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/152
- M4: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/153
- M5: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/milestone/154

Epics and issues:

- Canonical links file (epics + tasks): [05-github-backlog-links.md](./05-github-backlog-links.md)
- Raw export (includes duplicates from retries): [github-gap-closure-issues.json](./github-gap-closure-issues.json)
