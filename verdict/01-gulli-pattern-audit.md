# Part A — Agentic Design Patterns Audit

## A1. Foundational Patterns

Score: `8/10` — The core orchestration path is genuinely agentic: chained dispatch, task-aware routing, bounded parallelism, tool execution, and multi-agent handoff are real; reflection is the weak point.

Top 3 strengths:

- Sequential prompt chaining is explicit in the dispatcher, and predecessor outputs are carried forward as context instead of being recomputed from scratch ([dispatcher.ts](../platform/engine/dispatcher.ts#L778-L827), [dispatcher.ts](../platform/engine/dispatcher.ts#L1135-L1174)).
- Parallel execution is real, bounded, and observable, not just `Promise.all` sprayed into the codebase ([dispatcher.ts](../platform/engine/dispatcher.ts#L1350-L1447)).
- Team assembly is schema-backed and scored across domain match, capability match, prior success, and timeline fit rather than hardcoded agent selection ([task-assembly.ts](../platform/engine/task-assembly.ts#L28-L65), [task-assembly.ts](../platform/engine/task-assembly.ts#L140-L208), [task-assembly.ts](../platform/engine/task-assembly.ts#L445-L520)).

Top 3 weaknesses:

- Reflection exists as a separate service, but the main dispatcher path does not automatically re-run an agent after critique; the system records revision instructions more reliably than it self-corrects ([self-revision.ts](../platform/engine/self-revision.ts#L61-L99), [self-revision.ts](../platform/engine/self-revision.ts#L132-L201)).
- Routing is mostly deterministic registry scoring and mode selection; I did not find an ambiguity-resolution layer that can negotiate between competing workflows under uncertainty ([task-assembly.ts](../platform/engine/task-assembly.ts#L445-L520), [execution-mode.ts](../platform/engine/execution-mode.ts#L85-L194)).
- Multi-agent coordination is mainly predecessor-output handoff, not peer negotiation or consensus, which limits how agentic the collaboration really is under disagreement ([dispatcher.ts](../platform/engine/dispatcher.ts#L805-L827), [a2a-collaboration-tracer.ts](../platform/engine/a2a-collaboration-tracer.ts#L80-L141)).

Top 3 actionable improvements:

- Wire `SelfRevisionService` into the dispatcher retry path so verifier findings can trigger a bounded revise-and-reinvoke loop before failure is surfaced.
- Add an uncertainty-aware router that can choose between `SDLC_ONLY`, `AGENCY_ONLY`, and `HYBRID` using confidence thresholds instead of only descriptor and task-assembly rules.
- Add a formal fan-in synthesis pass after bounded parallel groups so concurrent outputs are reconciled instead of merely appended as predecessor paths.

### Pattern 1 — Prompt Chaining

Status: `Implemented`

The system uses explicit sequential chaining. `buildContext()` loads predecessor outputs, questionnaire input, and RAG context into an execution envelope, and `_dispatchStateSequential()` appends each successful agent output to the predecessor path list for the next agent in the chain ([dispatcher.ts](../platform/engine/dispatcher.ts#L778-L827), [dispatcher.ts](../platform/engine/dispatcher.ts#L1135-L1174)). This is not a single monolithic prompt wrapper.

### Pattern 2 — Routing

Status: `Implemented`

Routing is rule-based and registry-driven. `assembleTeam()` filters and scores candidates by domain, capability, quality, and timeline, then selects a team under explicit task constraints ([task-assembly.ts](../platform/engine/task-assembly.ts#L140-L208), [task-assembly.ts](../platform/engine/task-assembly.ts#L445-L520)). Execution-mode routing is separately modeled through `ExecutionModeDescriptor` and injection points ([execution-mode.ts](../platform/engine/execution-mode.ts#L45-L78), [execution-mode.ts](../platform/engine/execution-mode.ts#L139-L194)).

### Pattern 3 — Parallelization

Status: `Implemented`

Parallelism is real and controlled. `dispatchStateParallel()` runs ordered groups serially, but each group executes concurrently up to a configurable `maxConcurrency`, tracks `concurrencyHighWaterMark`, and aggregates results through `Promise.allSettled()` ([dispatcher.ts](../platform/engine/dispatcher.ts#L1340-L1447)). That is mature enough for production load testing, and the repo includes explicit load tests for bounded parallel dispatch.

### Pattern 4 — Reflection

Status: `Partially Implemented`

The reflection subsystem exists, but it is not fully closed-loop. `SelfRevisionService.evaluateRevisionNeed()` turns verifier findings and quality thresholds into structured revision instructions and persists revision events, and `markApplied()` records adoption ([self-revision.ts](../platform/engine/self-revision.ts#L61-L109), [self-revision.ts](../platform/engine/self-revision.ts#L132-L201)). What is missing is automatic reinvocation of the original agent with those revision instructions as part of the main dispatch path.

### Pattern 5 — Tool Use

Status: `Implemented`

Tool use is one of the strongest parts of the repo. `ToolExecutionMiddleware.execute()` enforces identity gates, runtime permissions, isolation-level checks, timeout guardrails, and audit logging before delegating execution ([tool-execution-middleware.ts](../platform/engine/tool-execution-middleware.ts#L760-L930)). `ToolExecutionGuard.evaluate()` adds per-agent manifest visibility, permission, approval, and env-scope enforcement ([tool-execution-guard.ts](../src/webapp/tool-execution-guard.ts#L61-L197)).

### Pattern 6 — Planning

Status: `Implemented`

Planning is modeled as data, not prose. `TaskDefinition` includes goals, domains, constraints, preferences, and command mode ([task-assembly.ts](../platform/engine/task-assembly.ts#L28-L65)), while `ObjectiveGraph` models objectives, KPIs, blockers, gates, and recommended actions ([objective-graph.ts](../platform/engine/objective-graph.ts#L12-L67)). That is explicit, inspectable planning state.

### Pattern 7 — Multi-Agent

Status: `Implemented`

This is a true multi-agent system, not a single-agent app with branding. The registry is validated and queryable ([agent-registry.ts](../platform/engine/agent-registry.ts#L120-L166)), teams are assembled per task ([task-assembly.ts](../platform/engine/task-assembly.ts#L445-L520)), and execution modes define how SDLC and agency agents combine ([execution-mode.ts](../platform/engine/execution-mode.ts#L139-L194)). Collaboration depth is uneven, but the multi-agent foundation is real.

## A2. Memory & Learning Patterns

Score: `7/10` — Memory, MCP, and goal monitoring are implemented; learning exists as a pipeline, but it is still approval-gated and not a credible closed-loop adaptation system.

Top 3 strengths:

- Three-tier semantic memory is explicit, scoped, and TTL-managed rather than an ad hoc blob store ([semantic-memory.ts](../platform/engine/semantic-memory.ts#L29-L37), [semantic-memory.ts](../platform/engine/semantic-memory.ts#L149-L239)).
- MCP is not cosmetic: the server exposes structured resources and governance-aware tools ([mcp-server.ts](../src/webapp/mcp-server.ts#L1147-L1193)).
- Goal monitoring is machine-readable and KPI-backed, with automated health scoring and recommended actions ([objective-graph.ts](../platform/engine/objective-graph.ts#L12-L67), [goal-health.ts](../platform/engine/goal-health.ts#L21-L132)).

Top 3 weaknesses:

- Learning and adaptation are proposal-centric, not self-optimizing; `createProposal()` ends in `pending-review`, and `applyProposal()` requires prior approval ([lessons-to-policy.ts](../platform/engine/lessons-to-policy.ts#L352-L383), [lessons-to-policy.ts](../platform/engine/lessons-to-policy.ts#L389-L418)).
- Memory access control is well-defined, but I did not find evidence that the strict memory-class policy is universally enforced on every retrieval path ([memory-access-policy.ts](../platform/engine/memory-access-policy.ts#L24-L68), [memory-access-policy.ts](../platform/engine/memory-access-policy.ts#L166-L220)).
- The code has multiple retrieval/context systems (`semantic-memory`, `retrieval-api`, `rag-grounding-service`, `knowledge-provider`), which increases capability but also fragmentation.

Top 3 actionable improvements:

- Auto-apply low-risk lessons-to-policy proposals behind benchmark gates and rollback windows, instead of forcing every improvement through a human review queue.
- Enforce `MemoryAccessPolicy` at all knowledge-provider and RAG grounding entry points, not only as a separately defined policy module.
- Add context-window telemetry per invocation so memory usefulness and context bloat are measured, not assumed.

### Pattern 8 — Memory Management

Status: `Implemented`

`SemanticMemoryStore` defines `run`, `project`, and `org` tiers with distinct TTL policies, deterministic eviction, and byte metrics ([semantic-memory.ts](../platform/engine/semantic-memory.ts#L29-L37), [semantic-memory.ts](../platform/engine/semantic-memory.ts#L149-L239)). `ContextBudgeter` then ranks, truncates, and drops context items to fit byte budgets before invocation ([context-budgeter.ts](../platform/engine/context-budgeter.ts#L4-L21), [context-budgeter.ts](../platform/engine/context-budgeter.ts#L185-L220)).

### Pattern 9 — Learning & Adaptation

Status: `Partially Implemented`

The lessons pipeline is real, but still only semi-automatic. `extractLessons()` parses reevaluate and retrospective artifacts into `NormalizedLesson`s, `createProposal()` converts them into policy changes, and `applyProposal()` can mark approved proposals as applied ([lessons-to-policy.ts](../platform/engine/lessons-to-policy.ts#L105-L188), [lessons-to-policy.ts](../platform/engine/lessons-to-policy.ts#L352-L418)). That is adaptation scaffolding plus partial execution, not continuous autonomous learning.

### Pattern 10 — Model Context Protocol (MCP)

Status: `Implemented`

The MCP server exposes typed resources for session state, decisions, and command queue, and the broader webapp includes governance-aware MCP administration routes and permissions ([mcp-server.ts](../src/webapp/mcp-server.ts#L1147-L1193), [app.tsx](../src/webapp/ui/src/app.tsx#L26-L33), [app.tsx](../src/webapp/ui/src/app.tsx#L92-L123)). This is operational, not stubbed.

### Pattern 11 — Goal Setting & Monitoring

Status: `Implemented`

Objectives are first-class records with KPIs, blockers, linked epics, and recommended actions ([objective-graph.ts](../platform/engine/objective-graph.ts#L12-L67)). `GoalHealthScoringService` computes weighted health factors, status, trend, and remediation actions ([goal-health.ts](../platform/engine/goal-health.ts#L21-L132)). That is explicit goal state and monitoring logic.

## A3. Production Robustness Patterns

Score: `8/10` — Exception handling, approvals, and grounded retrieval are materially implemented. The gap is not robustness primitives; the gap is how consistently they are enforced across every execution path.

Top 3 strengths:

- The dispatcher classifies failures by severity and retries transient/recoverable failures with backoff ([dispatcher.ts](../platform/engine/dispatcher.ts#L1186-L1207), [agency-executor.ts](../platform/engine/agency-executor.ts#L155-L183)).
- Human approval is implemented in actual API routes and SSE events, not just described in templates ([approvals.ts](../src/webapp/routes/approvals.ts#L25-L118)).
- RAG grounding is agent-specific and workspace-aware, with profile overrides and semantic-memory blending ([rag-grounding-service.ts](../src/webapp/services/rag-grounding-service.ts#L64-L120), [rag-grounding-service.test.js](../tests/unit/rag-grounding-service.test.js#L55-L125)).

Top 3 weaknesses:

- Retrieval quality is tested, but the repo still contains both keyword retrieval (`retrieval-api.ts`) and vector RAG paths, which creates duplicated retrieval logic and uneven guarantees ([retrieval-api.ts](../platform/engine/retrieval-api.ts#L4-L22), [knowledge-provider.ts](../platform/engine/knowledge-provider.ts#L120-L186)).
- HITL exists mostly as approvals, overrides, and route wrappers; confidence-threshold-based escalation is not consistently visible in the main orchestrator path.
- The repo proves many robustness services, but some of them are still optional or best-effort integrations rather than mandatory invariants.

Top 3 actionable improvements:

- Unify retrieval under one scored retrieval contract so keyword retrieval and vector RAG share the same relevance, citation, and policy surface.
- Add a mandatory confidence/escalation policy in orchestrator transitions rather than leaving escalation mostly to surrounding services.
- Add replay tooling that reconstructs a failed run across dispatcher, tools, approvals, and RAG lookups from a single correlation ID.

### Pattern 12 — Exception Handling & Recovery

Status: `Implemented`

The repo has real failure policy. The dispatcher classifies errors into `FATAL`, `TRANSIENT`, and `RECOVERABLE`, and supports retry/backoff behavior ([dispatcher.ts](../platform/engine/dispatcher.ts#L1186-L1207)). The agency execution path also has bounded retry loops per agent invocation ([agency-executor.ts](../platform/engine/agency-executor.ts#L155-L183)).

### Pattern 13 — Human-in-the-Loop

Status: `Implemented`

Approvals are operational. The approval routes list, approve, and reject pending governance approvals, emit structured logs, and push SSE events ([approvals.ts](../src/webapp/routes/approvals.ts#L25-L118)). Tool execution also supports approval-pending outcomes through manifest and governance checks ([tool-execution-guard.ts](../src/webapp/tool-execution-guard.ts#L179-L220)).

### Pattern 14 — Knowledge Retrieval (RAG)

Status: `Implemented`

`RagGroundingService` defines per-agent retrieval profiles, workspace-scoped collections, and optional semantic-memory inclusion ([rag-grounding-service.ts](../src/webapp/services/rag-grounding-service.ts#L64-L120), [rag-grounding-service.ts](../src/webapp/services/rag-grounding-service.ts#L160-L200)). The `/api/v1/rag/query` route validates collection names, `topK`, and thresholds before returning line-cited chunks ([rag.ts](../src/webapp/routes/rag.ts#L430-L505)).

## A4. Advanced & Optimization Patterns

Score: `6/10` — The advanced pattern surface is broad, but this is where the repo is most uneven: strong guardrails and observability, weaker closed-loop adaptation, A2A integration, and exploration on the main path.

Top 3 strengths:

- Resource-aware execution exists through context budgeting, cache TTLs, tool guardrails, and job priorities ([context-budgeter.ts](../platform/engine/context-budgeter.ts#L4-L21), [adapter-result-cache.ts](../platform/engine/adapter-result-cache.ts#L4-L18), [bullmq-queue.ts](../platform/engine/jobs/bullmq-queue.ts#L74-L93)).
- Guardrails are serious: content-type enforcement, secret detection, security headers, tool RBAC, isolation checks, and adversarial prompt tests are all present ([middleware.ts](../src/webapp/middleware.ts#L37-L131), [tool-execution-middleware.ts](../platform/engine/tool-execution-middleware.ts#L760-L930), [adversarial-prompt-context.test.js](../tests/security/adversarial-prompt-context.test.js#L66-L167)).
- Evaluation and monitoring are deep by normal OSS standards: DORA metrics, analytics routes, A2A trace persistence, coverage gates, performance gates, and autonomy benchmarks are all in code ([observability.ts](../platform/sdlc/observability.ts#L4-L85), [analytics.ts](../src/webapp/routes/analytics.ts#L32-L112), [ci.yml](../.github/workflows/ci.yml#L17-L257)).

Top 3 weaknesses:

- A2A communication is modeled and traced, but I did not find evidence that it is a first-class control path inside the main dispatcher loop; it looks more observable than operative ([a2a-collaboration-tracer.ts](../platform/engine/a2a-collaboration-tracer.ts#L80-L141)).
- Exploration/discovery features exist as a service API, but there is weak evidence that exploratory branches or contradiction scans drive default orchestrator decisions ([proactive-discovery-optimization.ts](../platform/engine/proactive-discovery-optimization.ts#L4-L10), [proactive-discovery-optimization.ts](../platform/engine/proactive-discovery-optimization.ts#L70-L109)).
- Prioritization exists at the queue level, but not as an end-to-end SLA-aware scheduler that reorders cross-workflow agent effort based on business urgency ([job-types.ts](../platform/engine/jobs/job-types.ts#L8-L38), [bullmq-queue.ts](../platform/engine/jobs/bullmq-queue.ts#L74-L93)).

Top 3 actionable improvements:

- Move A2A from traceable side-channel to explicit orchestration primitive with capability discovery and conflict resolution.
- Make proactive exploration a default branch in high-uncertainty planning rather than a standalone service.
- Add SLA-aware scheduling that combines job priority, phase criticality, and workspace risk into queue ordering and execution mode choice.

### Pattern 15 — Inter-Agent Communication (A2A)

Status: `Partially Implemented`

The repo has structured A2A artifacts and trace storage through `A2ACollaborationTracer`, including correlation IDs, priorities, outcomes, and latency metrics ([a2a-collaboration-tracer.ts](../platform/engine/a2a-collaboration-tracer.ts#L15-L76), [a2a-collaboration-tracer.ts](../platform/engine/a2a-collaboration-tracer.ts#L80-L141)). What I did not find in the core dispatcher path is A2A as a required decision mechanism; most cross-agent context still flows through predecessor outputs and shared session state.

### Pattern 16 — Resource-Aware Optimization

Status: `Implemented`

The repo manages resource use across multiple layers: `ContextBudgeter` budgets invocation payloads ([context-budgeter.ts](../platform/engine/context-budgeter.ts#L4-L21), [context-budgeter.ts](../platform/engine/context-budgeter.ts#L185-L220)), `AdapterResultCache` prevents duplicate side effects on resume/replay ([adapter-result-cache.ts](../platform/engine/adapter-result-cache.ts#L4-L18), [adapter-result-cache.ts](../platform/engine/adapter-result-cache.ts#L60-L121)), and `BullMQQueue` supports explicit priorities and retries ([bullmq-queue.ts](../platform/engine/jobs/bullmq-queue.ts#L74-L93)).

### Pattern 17 — Reasoning Techniques

Status: `Implemented`

Reasoning strategy is explicit. `ReasoningProfileService` distinguishes `fast`, `critique-first`, `debate`, and `verification-heavy` strategies, with phase- and agent-specific selection criteria plus self-critique/verifier toggles ([reasoning-profile.ts](../platform/engine/reasoning-profile.ts#L12-L56), [reasoning-profile.ts](../platform/engine/reasoning-profile.ts#L60-L160)). The weakness is not absence; it is incomplete integration with automatic revision.

### Pattern 18 — Guardrails & Safety

Status: `Implemented`

This is a strong area. The middleware enforces CSP, payload size, JSON-only input, markdown sanitization, and secret detection ([middleware.ts](../src/webapp/middleware.ts#L37-L131), [middleware.ts](../src/webapp/middleware.ts#L141-L195)). Tool execution adds permission, isolation, timeout, and audit guardrails ([tool-execution-middleware.ts](../platform/engine/tool-execution-middleware.ts#L760-L930)), and security tests explicitly attack prompt/context injection paths ([adversarial-prompt-context.test.js](../tests/security/adversarial-prompt-context.test.js#L66-L167)).

### Pattern 19 — Evaluation & Monitoring

Status: `Implemented`

Observability is unusually rich for this category of repo. The code computes DORA and project KPI metrics ([observability.ts](../platform/sdlc/observability.ts#L4-L85)), exposes analytics routes ([analytics.ts](../src/webapp/routes/analytics.ts#L32-L112)), and enforces CI gates for quality, tests, performance, security, accessibility, and build integrity ([ci.yml](../.github/workflows/ci.yml#L17-L520)).

### Pattern 20 — Prioritization

Status: `Partially Implemented`

The queueing model supports priority and retries. `Job` and `JobQueue` include priority in the core type system ([job-types.ts](../platform/engine/jobs/job-types.ts#L8-L38)), and `BullMQQueue.enqueue()` maps a 0–10 input priority into queue ordering ([bullmq-queue.ts](../platform/engine/jobs/bullmq-queue.ts#L74-L93)). What is missing is a broader prioritization strategy that accounts for SLAs, risk, or customer impact across workflows.

### Pattern 21 — Exploration & Discovery

Status: `Scaffolded Only`

The proactive optimization service defines stale-knowledge scans, contradiction scans, exploratory branches, adaptive concurrency, and route escalation ([proactive-discovery-optimization.ts](../platform/engine/proactive-discovery-optimization.ts#L4-L10), [proactive-discovery-optimization.ts](../platform/engine/proactive-discovery-optimization.ts#L24-L109)). That is real code, not a comment. But I did not find evidence that exploratory branches are a standard part of production orchestration, so I cannot rate this above scaffolded.

## A-Summary — Pattern Coverage Heatmap

| #   | Pattern                         | Status                | Quality | Key Evidence                                                                                         |
| --- | ------------------------------- | --------------------- | :-----: | ---------------------------------------------------------------------------------------------------- |
| 1   | Prompt Chaining                 | Implemented           |    4    | [dispatcher.ts](../platform/engine/dispatcher.ts#L778-L827)                                          |
| 2   | Routing                         | Implemented           |    4    | [task-assembly.ts](../platform/engine/task-assembly.ts#L445-L520)                                    |
| 3   | Parallelization                 | Implemented           |    4    | [dispatcher.ts](../platform/engine/dispatcher.ts#L1350-L1447)                                        |
| 4   | Reflection                      | Partially Implemented |    2    | [self-revision.ts](../platform/engine/self-revision.ts#L61-L109)                                     |
| 5   | Tool Use                        | Implemented           |    5    | [tool-execution-middleware.ts](../platform/engine/tool-execution-middleware.ts#L760-L930)            |
| 6   | Planning                        | Implemented           |    4    | [objective-graph.ts](../platform/engine/objective-graph.ts#L12-L67)                                  |
| 7   | Multi-Agent                     | Implemented           |    4    | [execution-mode.ts](../platform/engine/execution-mode.ts#L139-L194)                                  |
| 8   | Memory Management               | Implemented           |    4    | [semantic-memory.ts](../platform/engine/semantic-memory.ts#L29-L37)                                  |
| 9   | Learning & Adaptation           | Partially Implemented |    3    | [lessons-to-policy.ts](../platform/engine/lessons-to-policy.ts#L352-L418)                            |
| 10  | Model Context Protocol          | Implemented           |    4    | [mcp-server.ts](../src/webapp/mcp-server.ts#L1147-L1193)                                             |
| 11  | Goal Setting & Monitoring       | Implemented           |    4    | [goal-health.ts](../platform/engine/goal-health.ts#L21-L132)                                         |
| 12  | Exception Handling & Recovery   | Implemented           |    5    | [dispatcher.ts](../platform/engine/dispatcher.ts#L1186-L1207)                                        |
| 13  | Human-in-the-Loop               | Implemented           |    4    | [approvals.ts](../src/webapp/routes/approvals.ts#L25-L118)                                           |
| 14  | Knowledge Retrieval (RAG)       | Implemented           |    4    | [rag.ts](../src/webapp/routes/rag.ts#L430-L505)                                                      |
| 15  | Inter-Agent Communication (A2A) | Partially Implemented |    3    | [a2a-collaboration-tracer.ts](../platform/engine/a2a-collaboration-tracer.ts#L80-L141)               |
| 16  | Resource-Aware Optimization     | Implemented           |    4    | [context-budgeter.ts](../platform/engine/context-budgeter.ts#L185-L220)                              |
| 17  | Reasoning Techniques            | Implemented           |    3    | [reasoning-profile.ts](../platform/engine/reasoning-profile.ts#L60-L160)                             |
| 18  | Guardrails & Safety             | Implemented           |    5    | [middleware.ts](../src/webapp/middleware.ts#L37-L131)                                                |
| 19  | Evaluation & Monitoring         | Implemented           |    4    | [ci.yml](../.github/workflows/ci.yml#L17-L520)                                                       |
| 20  | Prioritization                  | Partially Implemented |    3    | [bullmq-queue.ts](../platform/engine/jobs/bullmq-queue.ts#L74-L93)                                   |
| 21  | Exploration & Discovery         | Scaffolded Only       |    2    | [proactive-discovery-optimization.ts](../platform/engine/proactive-discovery-optimization.ts#L4-L10) |

Patterns per tier coverage:

- Foundational: `7/7` present, `6` implemented, `1` partial.
- Memory & Learning: `4/4` present, `3` implemented, `1` partial.
- Production Robustness: `3/3` implemented.
- Advanced / Optimization: `7/7` present, `4` implemented, `2` partial, `1` scaffolded.

Agentic Maturity Level:

- `Level 4 — Advanced Agentic`
- Why not Level 5: the repo does not yet demonstrate closed-loop self-improvement, operational exploration as a default execution behavior, or strong SLA-aware prioritization. The blockers are Patterns `4`, `9`, `15`, `20`, and `21`.
