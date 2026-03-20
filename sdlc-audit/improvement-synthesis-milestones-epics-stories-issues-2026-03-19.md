# Improvement Synthesis (Milestones -> Epics -> Stories -> GitHub Issue Drafts)

Source: `sdlc-audit/independent-verdict-2026-03-19.md`
Date: 2026-03-19

## Planning Assumptions

- Each dimension gets at least one improvement epic.
- Epics are grouped into execution milestones that can be tracked in GitHub Milestones.
- Stories are implementation slices; Issues are publish-ready backlog entries.

## Milestone Map

| Milestone ID | Milestone Name                                | Target Window | Primary Dimensions |
| ------------ | --------------------------------------------- | ------------- | ------------------ |
| M1           | Autonomous Runtime Foundation                 | Weeks 1-4     | A1, A2, B2         |
| M2           | Tooling and Safety Integration                | Weeks 3-6     | A3, C3, A5         |
| M3           | State, Scale, and Operations Hardening        | Weeks 5-9     | A4, C4, C5         |
| M4           | SDLC Productization and Quality Consolidation | Weeks 8-12    | B1, C1, C2, D1, D2 |

---

## M1 - Autonomous Runtime Foundation

### Epic E-A1: Dispatcher Runtime Adapter Integration (Dimension A1)

Goal: replace externally-required invoker with first-class runtime adapter wiring.

Stories:

- S-A1-1 Define `AgentRuntimeAdapter` interface and provider contract.
- S-A1-2 Implement default adapter resolution from runtime profile/config.
- S-A1-3 Inject adapter into dispatcher and agent execution service.
- S-A1-4 Add fail-safe fallback adapter for deterministic local tests.

GitHub Issues:

- I-A1-001: Create `AgentRuntimeAdapter` abstraction and default registry.
- I-A1-002: Wire dispatcher `invoke` path to adapter registry (remove default throw in normal operation).
- I-A1-003: Update manual agent execution service to use configured runtime adapter.
- I-A1-004: Add integration tests covering configured adapter and missing-adapter behavior.

Acceptance criteria:

- Manual execution in UI succeeds with configured adapter (no test monkey-patch).
- Missing adapter is surfaced as configuration validation error at startup, not first invocation crash.

### Epic E-A2: Provider Integration and Structured Outputs (Dimension A2)

Goal: production-grade LLM integration quality.

Stories:

- S-A2-1 Add one production provider adapter and one local/mock adapter.
- S-A2-2 Enforce JSON-schema structured output validation per agent contract.
- S-A2-3 Add malformed-output repair/retry channel.
- S-A2-4 Capture token/cost/latency usage metrics per invocation.

GitHub Issues:

- I-A2-001: Implement provider adapter (`openai` or `copilot`) with typed request/response envelope.
- I-A2-002: Add contract-bound output parser and validator in invocation pipeline.
- I-A2-003: Implement structured retry policy for parse/validation failures.
- I-A2-004: Persist model telemetry (tokens, latency, retries, provider status) into runtime metrics.

Acceptance criteria:

- Agent outputs that violate schema are rejected and retried with bounded policy.
- Usage metrics visible from API/observability endpoints.

### Epic E-B2: Canonical Autonomous Lane Proof (Dimension B2)

Goal: prove realistic end-to-end autonomous workflow.

Stories:

- S-B2-1 Define reference scenario repo/issue and expected output.
- S-B2-2 Execute issue -> plan -> code -> test -> PR loop with runtime adapter.
- S-B2-3 Add reproducible script and artifact trace for CI replay.

GitHub Issues:

- I-B2-001: Add reproducible benchmark scenario under `usertests/` or `tests/integration/`.
- I-B2-002: Add CI job to execute autonomous lane smoke path and publish artifacts.
- I-B2-003: Add failure classification report for lane execution failures.

Acceptance criteria:

- CI run shows one complete autonomous lane with machine-readable evidence artifacts.

---

## M2 - Tooling and Safety Integration

### Epic E-A3: Unify Tool Calling Through ToolExecutor (Dimension A3)

Goal: converge all agent tool operations on one typed runtime layer.

Stories:

- S-A3-1 Integrate `ToolExecutor` into agent action execution pipeline.
- S-A3-2 Define per-tool capability scopes and authorization checks.
- S-A3-3 Add tool invocation audit and replay trace IDs.

GitHub Issues:

- I-A3-001: Add tool execution middleware to dispatcher runtime adapter path.
- I-A3-002: Add RBAC/capability mapping for tool IDs from canonical `tools.json`.
- I-A3-003: Emit tool execution audit events with adapter/operation/params hash/result.
- I-A3-004: Add integration tests for denied/allowed tool operations by role/profile.

Acceptance criteria:

- No side-effecting tool operation bypasses `ToolExecutor`.
- Unauthorized tool operations are denied with explicit error codes.

### Epic E-C3: Agent-Specific Security Guardrails (Dimension C3)

Goal: secure model-context and action boundaries.

Stories:

- S-C3-1 Add context trust labeling and prompt-sanitization stage.
- S-C3-2 Add pre-action policy checks for write/commit/PR/deploy operations.
- S-C3-3 Add security regression tests for prompt-injection patterns.

GitHub Issues:

- I-C3-001: Introduce `ContextTrustLevel` metadata on all model-bound context blocks.
- I-C3-002: Add policy gate before `tool.files.write`, `tool.git.commit`, and `tool.github.issue` actions.
- I-C3-003: Add adversarial prompt/context test suite under `tests/security/`.

Implementation status (2026-03-20):

- [x] I-C3-001 implemented in `platform/engine/agent-runtime-adapter.ts`.
- [x] I-C3-002 implemented in `platform/engine/tool-execution-middleware.ts` + policy pack updates.
- [x] I-C3-003 implemented in `tests/security/adversarial-prompt-context.test.js`.

Acceptance criteria:

- Prompt/context sanitization and trust classification run before every model invocation.
- Side-effecting actions require explicit policy approval path.

### Epic E-A5: Human Override and Provenance (Dimension A5)

Goal: stronger explainability and intervention controls.

Stories:

- S-A5-1 Add confidence score and uncertainty flag to each agent output.
- S-A5-2 Implement mid-flight override with resumable subplan.
- S-A5-3 Store rationale graph for machine and human decisions.

GitHub Issues:

- I-A5-001: Extend agent result schema with `confidence`, `uncertainty_reasons`, `needs_human_review`.
- I-A5-002: Add orchestrator API for pause/override/resume with rationale input.
- I-A5-003: Add decision provenance view in cockpit/governance UI.

Acceptance criteria:

- Operators can interrupt and reroute a running plan without losing state.
- Every decision includes machine-readable provenance.

---

## M3 - State, Scale, and Operations Hardening

### Epic E-A4: Semantic Memory and Context Optimization (Dimension A4)

Goal: improve context relevance and long-horizon memory.

Stories:

- S-A4-1 Add memory abstraction for reusable organizational knowledge.
- S-A4-2 Add context compaction and ranking pipeline before invocation.
- S-A4-3 Add citation-enforced retrieval augmentation from docs/code/decisions.

GitHub Issues:

- I-A4-001: Design memory tiers (`run`, `project`, `org`) with retention policy.
- I-A4-002: Implement context budgeter (rank/summarize/truncate with deterministic ordering).
- I-A4-003: Add retrieval API for decisions/docs with citation metadata.

Acceptance criteria:

- Invocation payload size and relevance metrics are measured and improved.
- Retrieved context snippets are citation-linked in outputs.

### Epic E-C4: Performance and Scalability Validation (Dimension C4)

Goal: convert scalability design into measurable evidence.

Stories:

- S-C4-1 Define SLOs for orchestration, SSE, and tool execution latency.
- S-C4-2 Add load test profiles for parallel agent dispatch and queue throughput.
- S-C4-3 Add distributed tracing spans for agent + tool lifecycle.

GitHub Issues:

- I-C4-001: Publish performance target document and baseline metrics.
- I-C4-002: Implement load scenarios under `tests/load/` for bounded parallel dispatch.
- I-C4-003: Add per-agent and per-tool timing traces to observability pipeline.

Acceptance criteria:

- Performance dashboard reports p50/p95/p99 latencies and failure rates per stage.

### Epic E-C5: Operational Runbooks and Release Maturity (Dimension C5)

Goal: align runtime ops maturity with CI maturity.

Stories:

- S-C5-1 Document environment promotion strategy (dev/stage/prod).
- S-C5-2 Add incident runbooks for failed orchestrations and degraded dependencies.
- S-C5-3 Add deployment verification and rollback checks.

GitHub Issues:

- I-C5-001: Add release topology and environment contract docs under `docs/operations/`.
- I-C5-002: Add runbooks for Redis outage, provider outage, queue backlog, schema mismatch.
- I-C5-003: Add post-deploy health gates and rollback automation hooks.

Acceptance criteria:

- Runbooks are testable and referenced from production alert payloads.

---

## M4 - SDLC Productization and Quality Consolidation

### Epic E-B1: Executable Phase Exit Criteria (Dimension B1)

Goal: turn phase breadth into enforceable completion quality.

Stories:

- S-B1-1 Define machine-checkable exit criteria per phase.
- S-B1-2 Encode criteria in policy evaluator/gate validator.
- S-B1-3 Add UI visibility for unmet exit conditions.

GitHub Issues:

- I-B1-001: Add phase exit criteria schema and policy docs.
- I-B1-002: Enforce criteria in `runGate`/`runSprintGate` decision path.
- I-B1-003: Add gate diagnostics endpoint + UI panel for unmet criteria.

Acceptance criteria:

- Phase transitions blocked when exit criteria are unmet, with actionable diagnostics.

### Epic E-C1: Runtime-Schema Convergence (Dimension C1)

Goal: remove divergence between hardcoded maps and canonical schema.

Stories:

- S-C1-1 Compile phase-agent mapping from `platform/schema/agents.json`.
- S-C1-2 Add startup validation: runtime map must equal compiled schema output.
- S-C1-3 Generate architecture map docs automatically.

GitHub Issues:

- I-C1-001: Build `compileAgentPhaseMap()` utility and replace static dispatcher map source.
- I-C1-002: Add invariant test for runtime/schema parity.
- I-C1-003: Generate architecture index artifacts in docs pipeline.

Acceptance criteria:

- No manually maintained duplicate source of truth for agent-phase mapping.

### Epic E-C2: Craftsmanship and Maintainability Debt Burn-down (Dimension C2)

Goal: reduce bespoke risk and strengthen typed invariants.

Stories:

- S-C2-1 Replace custom flow YAML subset parser with maintained parser or strict schema transform.
- S-C2-2 Expand strict typing and invariant checks for dispatcher/engine contracts.
- S-C2-3 Add mutation/fault-injection tests for orchestration edge cases.

GitHub Issues:

- I-C2-001: Introduce standards-based flow parser and migration tests.
- I-C2-002: Add stricter TypeScript types around invocation result contracts.
- I-C2-003: Add failure-mode tests for persistence corruption and recovery transitions.

Acceptance criteria:

- Parser edge-case defect class is eliminated or heavily reduced via standard parser + tests.

### Epic E-D1: Product Onboarding and First-Run Success (Dimension D1)

Goal: improve usability for non-author operators.

Stories:

- S-D1-1 Add first-run diagnostics wizard (auth/provider/storage/queue checks).
- S-D1-2 Add guided setup templates by runtime profile.
- S-D1-3 Add troubleshooting panel linked to detected startup errors.

GitHub Issues:

- I-D1-001: Build onboarding diagnostics endpoint + UI setup flow.
- I-D1-002: Add profile-specific setup checklists and remediation hints.
- I-D1-003: Add one-click environment validation report export.

Acceptance criteria:

- New operator reaches first successful run without reading source code.

### Epic E-D2: Competitive Evidence Pack (Dimension D2)

Goal: resolve current `INSUFFICIENT_DATA` with measurable comparisons.

Stories:

- S-D2-1 Define benchmark suite and evaluation rubric.
- S-D2-2 Run comparative tests against selected baselines/tools.
- S-D2-3 Publish repeatable benchmark artifacts and methodology.

GitHub Issues:

- I-D2-001: Create benchmark protocol doc and metric definitions.
- I-D2-002: Implement benchmark runner and result export format.
- I-D2-003: Publish quarterly benchmark report in docs/operations.

Acceptance criteria:

- Competitive positioning statements are evidence-backed and reproducible.

---

## Dependency and Sequencing Notes

- E-A1, E-A2, E-A3 are blocking for credible autonomy claims.
- E-C3 and E-A5 should run in parallel with E-A3 to avoid security debt.
- E-C1 should begin once E-A1 starts to prevent adding new hardcoded runtime mappings.
- E-D2 should start only after one stable autonomous lane exists (E-B2 complete).

## Suggested GitHub Labels

- `area/runtime`
- `area/orchestration`
- `area/tooling`
- `area/security`
- `area/observability`
- `area/performance`
- `area/product`
- `type/epic`
- `type/story`
- `type/issue`
- `priority/p0`
- `priority/p1`

## Suggested Priority Buckets

- P0: I-A1-001, I-A1-002, I-A2-001, I-A3-001, I-C3-002, I-B2-001
- P1: I-A2-002, I-A2-004, I-A5-001, I-C1-001, I-C4-001
- P2: I-D1-001, I-D2-001, I-C2-001, I-C5-001
