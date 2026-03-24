# Milestones / Epics / Issues Traceability Backlog

Purpose: convert all identified weaknesses into GitHub-ready, traceable user stories with clear priority (P1-P4), blocking status, and execution order.

---

## Execution Order

1. Start with all P1 issues marked `BLOCKING=YES`.
2. Complete remaining P1 issues.
3. Execute P2 in dependency order.
4. Execute P3 for scale and product hardening.
5. Execute P4 for strategic and go-to-market completeness.

---

## Milestone P1 — Platform Reliability & Release Safety

Milestone goal: remove critical release blockers affecting correctness, pipeline safety, and deployability.

### Epic P1-E1 — Critical Test Coverage Hardening

| Issue ID | Title                                            | Blocking | User Story                                                                                                                                                       | Source                                                                                             |
| -------- | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P1-E1-I1 | Raise dispatcher branch coverage to >=80%        | YES      | As a platform operator, I want dispatcher error and confidence branches fully tested so that agent runs do not misclassify fatal/retry conditions in production. | [A1 weakness](A1-agent-architecture.md#L80), [C2 weakness](C-code-quality-security-devops.md#L111) |
| P1-E1-I2 | Raise git adapter branch coverage to >=75%       | YES      | As a release manager, I want git adapter commit/diff/status paths covered so that gate-passage commits cannot silently fail or corrupt traceability.             | [A3 weakness](A3-tool-use.md#L100)                                                                 |
| P1-E1-I3 | Raise llm adapter branch coverage to >=80%       | YES      | As an AI platform engineer, I want provider parsing paths covered so that Azure/OpenAI/Anthropic responses are handled safely and consistently.                  | [A2 weakness](A2-llm-integration.md#L98)                                                           |
| P1-E1-I4 | Raise sprint gate branch coverage to >=80%       | YES      | As a delivery lead, I want sprint-gate logic fully tested so that destructive Phase 5 actions are only allowed when readiness checks are correct.                | [A5 weakness](A5-human-in-the-loop.md#L120)                                                        |
| P1-E1-I5 | Raise observability function coverage to >=80%   | NO       | As an engineering manager, I want DORA calculations validated by tests so that planning and capacity decisions are based on accurate metrics.                    | [B2 weakness](B2-workflow-realism.md#L118)                                                         |
| P1-E1-I6 | Add mutation testing for critical engine modules | NO       | As a QA lead, I want mutation testing in the critical engine path so that test assertions prove real fault detection, not only line execution.                   | [C2 weakness](C-code-quality-security-devops.md#L111)                                              |
| P1-E1-I7 | Add prompt-template snapshot regression tests    | NO       | As a prompt architect, I want snapshot/contract tests for skill templates so that accidental prompt regressions are caught before merge.                         | [C2 weakness](C-code-quality-security-devops.md#L111)                                              |

### Epic P1-E2 — Human-in-the-Loop Safety Controls

| Issue ID | Title                                                    | Blocking | User Story                                                                                                                                                       | Source                                      |
| -------- | -------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P1-E2-I1 | Add approval SLA timeout with escalation                 | YES      | As an operations admin, I want pending approvals to auto-escalate/expire after SLA so that pipelines cannot stall indefinitely.                                  | [A5 weakness](A5-human-in-the-loop.md#L120) |
| P1-E2-I2 | Add per-phase configurable needs_human_review thresholds | NO       | As a governance owner, I want stricter thresholds for high-risk phases so that security-critical outputs escalate earlier than marketing outputs.                | [A5 weakness](A5-human-in-the-loop.md#L120) |
| P1-E2-I3 | Restrict confidence telemetry by role                    | NO       | As a security admin, I want role-based visibility for confidence/escalation metadata so that viewers cannot access operationally sensitive signals without need. | [A5 weakness](A5-human-in-the-loop.md#L120) |
| P1-E2-I4 | Persist audit events in immutable SQLite table           | NO       | As a compliance auditor, I want durable append-only audit storage so that evidence survives restart and supports forensic investigations.                        | [A5 weakness](A5-human-in-the-loop.md#L120) |

### Epic P1-E3 — Deployment Readiness

| Issue ID | Title                                            | Blocking | User Story                                                                                                                            | Source                                                |
| -------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| P1-E3-I1 | Create staging CD pipeline with smoke validation | YES      | As a DevOps engineer, I want automatic deploy-to-staging after CI so that release readiness is continuously verified end-to-end.      | [C5 weakness](C-code-quality-security-devops.md#L263) |
| P1-E3-I2 | Enforce coverage thresholds as CI failing gate   | YES      | As a maintainer, I want explicit coverage fail thresholds in CI so that quality cannot regress silently over time.                    | [C5 weakness](C-code-quality-security-devops.md#L263) |
| P1-E3-I3 | Add API and frontend performance regression gate | NO       | As a performance owner, I want benchmark gates in CI so that latency and Lighthouse performance regressions are blocked before merge. | [C5 weakness](C-code-quality-security-devops.md#L263) |

---

## Milestone P2 — Architecture Throughput & Execution Quality

Milestone goal: improve workflow speed, structure, and quality determinism.

### Epic P2-E1 — Orchestration Throughput & Structure

| Issue ID | Title                                                | Blocking | User Story                                                                                                                                                    | Source                                                                               |
| -------- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| P2-E1-I1 | Parallelize independent PHASE_1 agents               | NO       | As a product team, I want independent business agents to run in parallel so that end-to-end cycle time is reduced.                                            | [A1 weakness](A1-agent-architecture.md#L80), [B1 weakness](B1-sdlc-coverage.md#L121) |
| P2-E1-I2 | Add structured inter-agent output contract           | NO       | As an orchestration engineer, I want typed structured outputs between agents so that downstream agents consume validated data rather than raw markdown blobs. | [A1 weakness](A1-agent-architecture.md#L80)                                          |
| P2-E1-I3 | Raise template-loader coverage to >=80%              | NO       | As a runtime owner, I want template loading paths fully tested so that agent invocation cannot fail due to untested loader behavior.                          | [A1 weakness](A1-agent-architecture.md#L80)                                          |
| P2-E1-I4 | Add phase wall-clock timeouts and stall alerts       | NO       | As a release coordinator, I want per-phase timeout and alerting so that stuck pipelines are detected and resolved quickly.                                    | [B1 weakness](B1-sdlc-coverage.md#L121)                                              |
| P2-E1-I5 | Add synthesis validation sub-step before sprint-gate | NO       | As a PMO owner, I want synthesis output re-validated so that a single synthesis-quality failure cannot poison all downstream planning.                        | [B1 weakness](B1-sdlc-coverage.md#L121)                                              |
| P2-E1-I6 | Add agent automation-level metadata                  | NO       | As a program manager, I want each agent to declare automated vs human-assisted output so that delivery expectations are realistic.                            | [B1 weakness](B1-sdlc-coverage.md#L121)                                              |

### Epic P2-E2 — LLM Runtime Improvements

| Issue ID | Title                                           | Blocking | User Story                                                                                                                                      | Source                                                                                          |
| -------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P2-E2-I1 | Wire end-to-end LLM token streaming to SSE UI   | NO       | As an end user, I want token streaming in the UI so that responses feel fast and transparent.                                                   | [A2 weakness](A2-llm-integration.md#L98)                                                        |
| P2-E2-I2 | Implement LLM function-calling tool-use loop    | NO       | As an agent developer, I want model-native tool calling support so that agents can perform multi-step reasoning with tool feedback in one turn. | [A2 weakness](A2-llm-integration.md#L98)                                                        |
| P2-E2-I3 | Replace curl subprocess with undici HTTP client | NO       | As a platform engineer, I want native HTTP calls so that process overhead is reduced and throughput improves under concurrency.                 | [A2 weakness](A2-llm-integration.md#L98), [C3 weakness](C-code-quality-security-devops.md#L215) |
| P2-E2-I4 | Add provider fallback routing policy            | NO       | As an SRE, I want failover between providers/local mode so that missing keys or provider incidents do not hard-stop execution.                  | [A2 weakness](A2-llm-integration.md#L98)                                                        |

### Epic P2-E3 — Workflow Validation & Quality Scoring

| Issue ID | Title                                              | Blocking | User Story                                                                                                                                   | Source                                                                                                                         |
| -------- | -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P2-E3-I1 | Add CLI dry-run mode for full config validation    | NO       | As a new operator, I want dry-run validation so that I can verify setup without consuming LLM credits.                                       | [B2 weakness](B2-workflow-realism.md#L118)                                                                                     |
| P2-E3-I2 | Add chaos/resumption test suite                    | NO       | As a reliability engineer, I want crash-and-resume tests so that state recovery and idempotency are proven under failure.                    | [B2 weakness](B2-workflow-realism.md#L118)                                                                                     |
| P2-E3-I3 | Add deliverable quality scorer and approval signal | NO       | As an approver, I want objective quality scoring on deliverables so that approvals are based on quality evidence, not only structure.        | [B2 weakness](B2-workflow-realism.md#L118)                                                                                     |
| P2-E3-I4 | Validate external integration readiness status     | NO       | As a program manager, I want explicit readiness checks for Canva/Storybook/Matomo/Weblate so that roadmap claims reflect actual operability. | [B2 weakness](B2-workflow-realism.md#L118), [B1 weakness](B1-sdlc-coverage.md#L121), [D1 weakness](D-product-strategy.md#L108) |

---

## Milestone P3 — Scalability, Security Hardening & Knowledge Architecture

Milestone goal: make the platform robust at higher load and stricter enterprise conditions.

### Epic P3-E1 — Adapter & Tooling Resilience

| Issue ID | Title                                              | Blocking | User Story                                                                                                                               | Source                             |
| -------- | -------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| P3-E1-I1 | Raise security adapter and registry coverage >=75% | NO       | As a security architect, I want adapter registration and security scan adapters covered so that policy-critical tool paths are reliable. | [A3 weakness](A3-tool-use.md#L100) |
| P3-E1-I2 | Add tool-executor circuit breaker and backpressure | NO       | As an SRE, I want repeated external failures to fast-fail with cooldown so that queue health is preserved under dependency outages.      | [A3 weakness](A3-tool-use.md#L100) |
| P3-E1-I3 | Publish machine-readable MCP capability manifest   | NO       | As an integration engineer, I want documented MCP tool surfaces so that clients can integrate safely and predictably.                    | [A3 weakness](A3-tool-use.md#L100) |

### Epic P3-E2 — Memory and RAG Convergence

| Issue ID | Title                                                         | Blocking | User Story                                                                                                                        | Source                                   |
| -------- | ------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| P3-E2-I1 | Switch context budgeting from bytes to token estimates        | NO       | As a runtime engineer, I want token-aware budgeting so that context truncation matches actual model limits across languages.      | [A4 weakness](A4-memory-context.md#L114) |
| P3-E2-I2 | Add background TTL sweeper for memory tiers                   | NO       | As a platform operator, I want periodic eviction so that stale project/org memory does not grow unbounded.                        | [A4 weakness](A4-memory-context.md#L114) |
| P3-E2-I3 | Add explicit rag-store unit/integration coverage reporting    | NO       | As a QA engineer, I want RAG store test visibility so that vector/schema behavior is verified and measurable in coverage outputs. | [A4 weakness](A4-memory-context.md#L114) |
| P3-E2-I4 | Build unified KnowledgeProvider across SemanticMemory and RAG | NO       | As an agent developer, I want one knowledge query surface so that memory and retrieval contexts are consistent and composable.    | [A4 weakness](A4-memory-context.md#L114) |

### Epic P3-E3 — Security and Runtime Scale

| Issue ID | Title                                                   | Blocking | User Story                                                                                                                           | Source                                                |
| -------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| P3-E3-I1 | Add API rate limiting and abuse controls                | NO       | As a security engineer, I want route-level throttling so that brute-force and prompt-abuse traffic is mitigated.                     | [C3 weakness](C-code-quality-security-devops.md#L215) |
| P3-E3-I2 | Validate Windows runtime parity for LLM transport       | NO       | As a cross-platform maintainer, I want Windows transport tests so that behavior matches CI and production assumptions.               | [C3 weakness](C-code-quality-security-devops.md#L215) |
| P3-E3-I3 | Introduce scalable vector-store strategy for multi-node | NO       | As an infrastructure owner, I want a multi-writer-safe vector strategy so that concurrent workers do not corrupt or block retrieval. | [C4 weakness](C-code-quality-security-devops.md#L263) |
| P3-E3-I4 | Implement Redis pub/sub bridge for SSE fanout           | NO       | As an operations team, I want cross-node SSE fanout so that users receive events consistently in horizontally scaled deployments.    | [C4 weakness](C-code-quality-security-devops.md#L263) |
| P3-E3-I5 | Add DB concurrency strategy and pooling guidance        | NO       | As a platform engineer, I want explicit DB concurrency limits/pooling strategy so that high-concurrency workloads remain stable.     | [C4 weakness](C-code-quality-security-devops.md#L263) |
| P3-E3-I6 | Raise BullMQ branch coverage to >=75%                   | NO       | As a reliability engineer, I want production queue branches covered so that retry, failover, and delayed job behavior is trusted.    | [B2 weakness](B2-workflow-realism.md#L118)            |

---

## Milestone P4 — Product, UX, and Commercial Strategy Completion

Milestone goal: close product-market and commercialization gaps.

### Epic P4-E1 — UX/Product Evidence Completion

| Issue ID | Title                                                  | Blocking | User Story                                                                                                              | Source                                    |
| -------- | ------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| P4-E1-I1 | Validate and document Matomo analytics event flow      | NO       | As a product analyst, I want verified analytics instrumentation so that product decisions are based on real usage data. | [D1 weakness](D-product-strategy.md#L108) |
| P4-E1-I2 | Add responsive/mobile acceptance matrix per page group | NO       | As a UX lead, I want responsive criteria validated so that the 23-page UI is usable across desktop/tablet/mobile.       | [D1 weakness](D-product-strategy.md#L108) |
| P4-E1-I3 | Audit and enforce design-token adoption coverage       | NO       | As a design systems engineer, I want token adoption measured so that visual consistency and theming are maintainable.   | [D1 weakness](D-product-strategy.md#L108) |

### Epic P4-E2 — Commercial & Market Positioning

| Issue ID | Title                                                  | Blocking | User Story                                                                                                           | Source                                    |
| -------- | ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| P4-E2-I1 | Define hosted SaaS reference offering and architecture | NO       | As a buyer, I want a managed deployment option so that enterprise adoption does not require full self-hosting.       | [D2 weakness](D-product-strategy.md#L190) |
| P4-E2-I2 | Define contributor CLA/IP governance model             | NO       | As legal counsel, I want explicit contributor/IP governance so that enterprise procurement risk is reduced.          | [D2 weakness](D-product-strategy.md#L190) |
| P4-E2-I3 | Publish licensing and pricing strategy options         | NO       | As product leadership, I want a clear monetization framework so that open-source and commercial goals are aligned.   | [D2 weakness](D-product-strategy.md#L190) |
| P4-E2-I4 | Publish competitive positioning dossier                | NO       | As GTM leadership, I want a documented competitor comparison so that sales and roadmap decisions are evidence-based. | [D2 weakness](D-product-strategy.md#L190) |

---

## Weakness-to-Issue Traceability Matrix

This matrix ensures every weakness from the verdict is represented by at least one issue.

| Weakness Area                                  | Covered By Issue IDs                   |
| ---------------------------------------------- | -------------------------------------- |
| Dispatcher coverage gaps                       | P1-E1-I1, P1-E1-I6                     |
| Sequential phase execution                     | P2-E1-I1                               |
| No inter-agent structured messaging            | P2-E1-I2                               |
| Template loader low coverage                   | P2-E1-I3                               |
| No LLM streaming                               | P2-E2-I1                               |
| No LLM tool-use                                | P2-E2-I2                               |
| curl transport overhead / parity               | P2-E2-I3, P3-E3-I2                     |
| No provider fallback                           | P2-E2-I4                               |
| Git/security/registry adapter coverage         | P1-E1-I2, P3-E1-I1                     |
| No circuit breaker                             | P3-E1-I2                               |
| MCP routing clarity                            | P3-E1-I3                               |
| Byte vs token budgeting                        | P3-E2-I1                               |
| Lazy TTL eviction                              | P3-E2-I2                               |
| RAG coverage visibility                        | P3-E2-I3                               |
| Memory/RAG disconnection                       | P3-E2-I4                               |
| Sprint gate coverage / HITL thresholds         | P1-E1-I4, P1-E2-I2                     |
| No approval timeout                            | P1-E2-I1                               |
| Confidence telemetry role risk                 | P1-E2-I3                               |
| Audit durability uncertainty                   | P1-E2-I4                               |
| No phase timing / stall detection              | P2-E1-I4                               |
| Synthesis SPOF                                 | P2-E1-I5                               |
| Agent automation clarity                       | P2-E1-I6                               |
| No dry-run                                     | P2-E3-I1                               |
| No chaos/resumption tests                      | P2-E3-I2                               |
| LLM-dependent quality only                     | P2-E3-I3                               |
| External integrations unconfirmed              | P2-E3-I4, P4-E1-I1                     |
| Branch coverage global weakness                | P1-E1-I1, P1-E1-I2, P1-E1-I3, P1-E1-I4 |
| No mutation testing / prompt snapshots         | P1-E1-I6, P1-E1-I7                     |
| No rate limiting                               | P3-E3-I1                               |
| LanceDB / SSE / DB scalability                 | P3-E3-I3, P3-E3-I4, P3-E3-I5           |
| No CD / perf gate / coverage gate              | P1-E3-I1, P1-E3-I3, P1-E3-I2           |
| UX analytics/responsive/token adoption unknown | P4-E1-I1, P4-E1-I2, P4-E1-I3           |
| SaaS/licensing/positioning gaps                | P4-E2-I1, P4-E2-I2, P4-E2-I3, P4-E2-I4 |

---

## GitHub Labels Recommendation

- Priority labels: `P1`, `P2`, `P3`, `P4`
- Blocking label: `blocking`
- Type labels: `epic`, `story`, `tech-debt`, `security`, `devops`, `scalability`, `product`
- Area labels: `engine`, `adapters`, `llm`, `workflow`, `ui`, `governance`, `observability`

---

## Suggested First Sprint Cut (Start Here)

1. P1-E1-I1 (blocking)
2. P1-E1-I2 (blocking)
3. P1-E2-I1 (blocking)
4. P1-E3-I1 (blocking)
5. P1-E3-I2 (blocking)
6. P1-E1-I3 (blocking)
7. P1-E1-I4 (blocking)

Completing these seven issues removes the highest release risk and creates a stable baseline for P2 work.
