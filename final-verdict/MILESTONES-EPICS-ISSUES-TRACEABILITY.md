# Final Milestones / Epics / Issues Traceability Backlog

Purpose: merged master backlog that combines:

- platform/engine traceability from [verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md](verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md)
- frontend/UI traceability from [ui-verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md](ui-verdict/MILESTONES-EPICS-ISSUES-TRACEABILITY.md)

This file is optimized for GitHub issue intake with one unified P1-P4 framework and explicit blocking order.

## ID Convention

- Track `CORE`: issues originating from verdict (engine/platform/SDLC).
- Track `UI`: issues originating from ui-verdict (frontend/UX/design).
- `GitHub Key` is unique and should be used as issue prefix when creating GitHub issues.

## Execution Order

1. Complete all `P1` issues where `Blocking=YES` across both tracks.
2. Complete remaining `P1` issues in dependency order.
3. Complete `P2` in dependency order.
4. Complete `P3` for scale hardening.
5. Complete `P4` for strategic maturity and optimization.

---

## Milestone P1 - Release Blockers and Baseline Hardening

Milestone goal: remove immediate reliability, safety, accessibility, and release-governance blockers.

### Epic P1-CORE-E1 - Critical Test Coverage Hardening

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                            | User Story                                                                                                                                                       |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-CORE-E1-I1 | CORE  | P1-E1-I1    | YES      | -             | Raise dispatcher branch coverage to >=80%        | As a platform operator, I want dispatcher error and confidence branches fully tested so that agent runs do not misclassify fatal/retry conditions in production. |
| P1-CORE-E1-I2 | CORE  | P1-E1-I2    | YES      | -             | Raise git adapter branch coverage to >=75%       | As a release manager, I want git adapter commit/diff/status paths covered so that gate-passage commits cannot silently fail or corrupt traceability.             |
| P1-CORE-E1-I3 | CORE  | P1-E1-I3    | YES      | -             | Raise llm adapter branch coverage to >=80%       | As an AI platform engineer, I want provider parsing paths covered so that Azure/OpenAI/Anthropic responses are handled safely and consistently.                  |
| P1-CORE-E1-I4 | CORE  | P1-E1-I4    | YES      | -             | Raise sprint gate branch coverage to >=80%       | As a delivery lead, I want sprint-gate logic fully tested so that destructive Phase 5 actions are only allowed when readiness checks are correct.                |
| P1-CORE-E1-I5 | CORE  | P1-E1-I5    | NO       | P1-CORE-E1-I1 | Raise observability function coverage to >=80%   | As an engineering manager, I want DORA calculations validated by tests so that planning and capacity decisions are based on accurate metrics.                    |
| P1-CORE-E1-I6 | CORE  | P1-E1-I6    | NO       | P1-CORE-E1-I1 | Add mutation testing for critical engine modules | As a QA lead, I want mutation testing in the critical engine path so that test assertions prove real fault detection, not only line execution.                   |
| P1-CORE-E1-I7 | CORE  | P1-E1-I7    | NO       | P1-CORE-E1-I1 | Add prompt-template snapshot regression tests    | As a prompt architect, I want snapshot/contract tests for skill templates so that accidental prompt regressions are caught before merge.                         |

### Epic P1-CORE-E2 - Human-in-the-Loop Safety Controls

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                    | User Story                                                                                                                                                       |
| ------------- | ----- | ----------- | -------- | ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-CORE-E2-I1 | CORE  | P1-E2-I1    | YES      | -             | Add approval SLA timeout with escalation                 | As an operations admin, I want pending approvals to auto-escalate/expire after SLA so that pipelines cannot stall indefinitely.                                  |
| P1-CORE-E2-I2 | CORE  | P1-E2-I2    | NO       | P1-CORE-E2-I1 | Add per-phase configurable needs_human_review thresholds | As a governance owner, I want stricter thresholds for high-risk phases so that security-critical outputs escalate earlier than marketing outputs.                |
| P1-CORE-E2-I3 | CORE  | P1-E2-I3    | NO       | P1-CORE-E2-I1 | Restrict confidence telemetry by role                    | As a security admin, I want role-based visibility for confidence/escalation metadata so that viewers cannot access operationally sensitive signals without need. |
| P1-CORE-E2-I4 | CORE  | P1-E2-I4    | NO       | P1-CORE-E2-I1 | Persist audit events in immutable SQLite table           | As a compliance auditor, I want durable append-only audit storage so that evidence survives restart and supports forensic investigations.                        |

### Epic P1-CORE-E3 - Deployment Readiness

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                            | User Story                                                                                                                            |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| P1-CORE-E3-I1 | CORE  | P1-E3-I1    | YES      | -             | Create staging CD pipeline with smoke validation | As a DevOps engineer, I want automatic deploy-to-staging after CI so that release readiness is continuously verified end-to-end.      |
| P1-CORE-E3-I2 | CORE  | P1-E3-I2    | YES      | -             | Enforce coverage thresholds as CI failing gate   | As a maintainer, I want explicit coverage fail thresholds in CI so that quality cannot regress silently over time.                    |
| P1-CORE-E3-I3 | CORE  | P1-E3-I3    | NO       | P1-CORE-E3-I1 | Add API and frontend performance regression gate | As a performance owner, I want benchmark gates in CI so that latency and Lighthouse performance regressions are blocked before merge. |

### Epic P1-UI-E1 - Architecture Decomposition and State Ownership

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                         | User Story                                                                                                                                                                                     |
| ----------- | ----- | ----------- | -------- | ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-UI-E1-I1 | UI    | P1-E1-I1    | YES      | -           | Decompose monolithic operational pages        | As a frontend engineer, I want commands, pipeline, and session detail pages split into container, sections, and controller hooks so that complexity stays maintainable as feature count grows. |
| P1-UI-E1-I2 | UI    | P1-E1-I2    | YES      | P1-UI-E1-I1 | Remove duplicated domain UI behavior          | As a maintainer, I want status mapping and badge logic centralized in shared helpers/components so that behavior is consistent across pages and easier to test.                                |
| P1-UI-E1-I3 | UI    | P1-E1-I3    | NO       | P1-UI-E1-I1 | Publish state ownership architecture contract | As a contributor, I want a documented Query vs Zustand vs local-state contract so that new features place state correctly and avoid regressions.                                               |

### Epic P1-UI-E2 - Accessibility and Design Guardrails

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                   | User Story                                                                                                                                                |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-UI-E2-I1 | UI    | P1-E2-I1    | YES      | -           | Re-enable Storybook contrast rule and govern exceptions | As an accessibility lead, I want contrast checks active in Storybook with explicit exceptions so that component-level a11y regressions are blocked early. |
| P1-UI-E2-I2 | UI    | P1-E2-I2    | YES      | -           | Add skip link and keyboard path verification            | As a keyboard-only user, I want a skip-to-content link and tested focus flow so that I can navigate primary operations quickly.                           |
| P1-UI-E2-I3 | UI    | P1-E2-I3    | NO       | P1-UI-E2-I1 | Enforce token and typography consistency checks         | As a design system engineer, I want lint checks for hardcoded colors, typography drift, and spacing misuse so that visual consistency scales.             |
| P1-UI-E2-I4 | UI    | P1-E2-I4    | NO       | P1-UI-E2-I3 | Refactor repeated form styling to shared primitives     | As a UI engineer, I want all form controls to use shared field primitives so that validation, spacing, and accessibility remain uniform.                  |

### Epic P1-UI-E3 - Performance and Reliability Visibility

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                      | User Story                                                                                                                                    |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-UI-E3-I1 | UI    | P1-E3-I1    | YES      | -           | Add bundle budget CI gate                  | As a release owner, I want bundle/chunk budgets enforced in CI so that payload regressions are blocked before merge.                          |
| P1-UI-E3-I2 | UI    | P1-E3-I2    | YES      | -           | Introduce production build profile control | As a frontend platform engineer, I want separate prod/dev sourcemap and diagnostics strategy so that release builds are optimized and secure. |
| P1-UI-E3-I3 | UI    | P1-E3-I3    | YES      | -           | Implement RUM and web-vitals telemetry     | As an operations team, I want client performance telemetry and alerts so that user-facing degradations are detected quickly.                  |
| P1-UI-E3-I4 | UI    | P1-E3-I4    | NO       | P1-UI-E3-I3 | Reduce mixed polling where SSE exists      | As a system operator, I want SSE-first updates with minimal fallback polling so that long sessions avoid avoidable load spikes.               |

### Epic P1-UI-E4 - Operator Decision and Recovery Clarity

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                          | User Story                                                                                                                      |
| ----------- | ----- | ----------- | -------- | ----------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1-UI-E4-I1 | UI    | P1-E4-I1    | YES      | -           | Add approval SLA timers and overdue indicators | As an approver, I want SLA countdown and overdue markers in approval queues so that urgent decisions are handled first.         |
| P1-UI-E4-I2 | UI    | P1-E4-I2    | NO       | P1-UI-E4-I1 | Add unified intervention console               | As an operator, I want pause/resume/reroute/cancel actions in one control surface so that intervention is fast and predictable. |
| P1-UI-E4-I3 | UI    | P1-E4-I3    | NO       | P1-UI-E4-I2 | Standardize session expiry and re-auth UX      | As a signed-in user, I want consistent token-expiry messaging and re-auth flow so that recovery is clear across all pages.      |

---

## Milestone P2 - Throughput, UX Flow, and Integration Quality

Milestone goal: improve orchestration speed, runtime clarity, IA usability, and output quality confidence.

### Epic P2-CORE-E1 - Orchestration Throughput and Structure

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                | User Story                                                                                                                                                    |
| ------------- | ----- | ----------- | -------- | ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-CORE-E1-I1 | CORE  | P2-E1-I1    | NO       | -             | Parallelize independent PHASE_1 agents               | As a product team, I want independent business agents to run in parallel so that end-to-end cycle time is reduced.                                            |
| P2-CORE-E1-I2 | CORE  | P2-E1-I2    | NO       | P2-CORE-E1-I1 | Add structured inter-agent output contract           | As an orchestration engineer, I want typed structured outputs between agents so that downstream agents consume validated data rather than raw markdown blobs. |
| P2-CORE-E1-I3 | CORE  | P2-E1-I3    | NO       | P2-CORE-E1-I2 | Raise template-loader coverage to >=80%              | As a runtime owner, I want template loading paths fully tested so that agent invocation cannot fail due to untested loader behavior.                          |
| P2-CORE-E1-I4 | CORE  | P2-E1-I4    | NO       | P2-CORE-E1-I1 | Add phase wall-clock timeouts and stall alerts       | As a release coordinator, I want per-phase timeout and alerting so that stuck pipelines are detected and resolved quickly.                                    |
| P2-CORE-E1-I5 | CORE  | P2-E1-I5    | NO       | P2-CORE-E1-I2 | Add synthesis validation sub-step before sprint-gate | As a PMO owner, I want synthesis output re-validated so that a single synthesis-quality failure cannot poison all downstream planning.                        |
| P2-CORE-E1-I6 | CORE  | P2-E1-I6    | NO       | P2-CORE-E1-I2 | Add agent automation-level metadata                  | As a program manager, I want each agent to declare automated vs human-assisted output so that delivery expectations are realistic.                            |

### Epic P2-CORE-E2 - LLM Runtime Improvements

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                           | User Story                                                                                                                                      |
| ------------- | ----- | ----------- | -------- | ------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-CORE-E2-I1 | CORE  | P2-E2-I1    | NO       | -             | Wire end-to-end LLM token streaming to SSE UI   | As an end user, I want token streaming in the UI so that responses feel fast and transparent.                                                   |
| P2-CORE-E2-I2 | CORE  | P2-E2-I2    | NO       | P2-CORE-E2-I1 | Implement LLM function-calling tool-use loop    | As an agent developer, I want model-native tool calling support so that agents can perform multi-step reasoning with tool feedback in one turn. |
| P2-CORE-E2-I3 | CORE  | P2-E2-I3    | NO       | -             | Replace curl subprocess with undici HTTP client | As a platform engineer, I want native HTTP calls so that process overhead is reduced and throughput improves under concurrency.                 |
| P2-CORE-E2-I4 | CORE  | P2-E2-I4    | NO       | P2-CORE-E2-I3 | Add provider fallback routing policy            | As an SRE, I want failover between providers/local mode so that missing keys or provider incidents do not hard-stop execution.                  |

### Epic P2-CORE-E3 - Workflow Validation and Quality Scoring

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                              | User Story                                                                                                                                   |
| ------------- | ----- | ----------- | -------- | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-CORE-E3-I1 | CORE  | P2-E3-I1    | NO       | -             | Add CLI dry-run mode for full config validation    | As a new operator, I want dry-run validation so that I can verify setup without consuming LLM credits.                                       |
| P2-CORE-E3-I2 | CORE  | P2-E3-I2    | NO       | -             | Add chaos/resumption test suite                    | As a reliability engineer, I want crash-and-resume tests so that state recovery and idempotency are proven under failure.                    |
| P2-CORE-E3-I3 | CORE  | P2-E3-I3    | NO       | P2-CORE-E3-I1 | Add deliverable quality scorer and approval signal | As an approver, I want objective quality scoring on deliverables so that approvals are based on quality evidence, not only structure.        |
| P2-CORE-E3-I4 | CORE  | P2-E3-I4    | NO       | -             | Validate external integration readiness status     | As a program manager, I want explicit readiness checks for Canva/Storybook/Matomo/Weblate so that roadmap claims reflect actual operability. |

### Epic P2-UI-E1 - Agent Runtime UX and Guided Actions

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                         | User Story                                                                                                                                        |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-UI-E1-I1 | UI    | P2-E1-I1    | NO       | P1-UI-E1-I1 | Add uniform live-progress affordances across runtime surfaces | As an operator, I want consistent real-time progress states for all long-running agent tasks so that I always understand current execution state. |
| P2-UI-E1-I2 | UI    | P2-E1-I2    | NO       | P2-UI-E1-I1 | Add blocker-and-next-action guidance cards                    | As a first-time user, I want explicit current blocker and next action guidance so that I can recover quickly from stalled workflows.              |
| P2-UI-E1-I3 | UI    | P2-E1-I3    | NO       | P1-UI-E4-I2 | Show feedback propagation markers                             | As a reviewer, I want to see how my intervention changed downstream execution so that correction loops are transparent.                           |

### Epic P2-UI-E2 - Navigation and IA Simplification

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                       | User Story                                                                                                                     |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P2-UI-E2-I1 | UI    | P2-E2-I1    | NO       | -           | Add persona-mode navigation presets         | As an operator/admin/reviewer, I want role-relevant landing and navigation emphasis so that I see only high-value areas first. |
| P2-UI-E2-I2 | UI    | P2-E2-I2    | NO       | P2-UI-E2-I1 | Reduce redirect and label entropy           | As a user, I want simplified route aliases and naming conventions so that IA mental models are stable and predictable.         |
| P2-UI-E2-I3 | UI    | P2-E2-I3    | NO       | P2-UI-E2-I1 | Persist filter state in URL for major pages | As a team member, I want filter/sort state encoded in URLs so that I can share and return to exact investigation contexts.     |

### Epic P2-UI-E3 - Forms, Validation, and Edit Safety

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                 | User Story                                                                                                                  |
| ----------- | ----- | ----------- | -------- | ----------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| P2-UI-E3-I1 | UI    | P2-E3-I1    | NO       | P1-UI-E2-I4 | Add standardized multi-field validation summary       | As a user completing complex forms, I want centralized error summaries so that I can resolve all validation issues quickly. |
| P2-UI-E3-I2 | UI    | P2-E3-I2    | NO       | P2-UI-E3-I1 | Add draft history and restore for key editable flows  | As an analyst, I want versioned draft restore for questionnaires and decisions so that accidental edits are reversible.     |
| P2-UI-E3-I3 | UI    | P2-E3-I3    | NO       | P2-UI-E3-I1 | Add explicit frontend runtime env contract validation | As a deployer, I want documented and validated frontend runtime config so that environments fail fast when misconfigured.   |

### Epic P2-UI-E4 - Artifact and Evidence Presentation

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                     | User Story                                                                                                                                    |
| ----------- | ----- | ----------- | -------- | ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-UI-E4-I1 | UI    | P2-E4-I1    | NO       | -           | Add integrated code artifact viewer with diff mode        | As a reviewer, I want syntax-highlighted file trees and diffs inside artifact flows so that I can evaluate outputs without context-switching. |
| P2-UI-E4-I2 | UI    | P2-E4-I2    | NO       | P2-UI-E4-I1 | Add semantic folding/chunking for long artifacts          | As a user reading large outputs, I want collapsible sections and semantic chunk navigation so that evidence review is efficient.              |
| P2-UI-E4-I3 | UI    | P2-E4-I3    | NO       | P2-UI-E4-I1 | Standardize export/share actions across artifact surfaces | As a compliance stakeholder, I want consistent copy/download/share actions across evidence pages so that traceability workflows are faster.   |

---

## Milestone P3 - Scalability and Operational Hardening

Milestone goal: strengthen resilience, security posture, memory architecture, mobile assurance, and test depth.

### Epic P3-CORE-E1 - Adapter and Tooling Resilience

| GitHub Key    | Track | Original ID | Blocking | Depends On | Title                                              | User Story                                                                                                                               |
| ------------- | ----- | ----------- | -------- | ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P3-CORE-E1-I1 | CORE  | P3-E1-I1    | NO       | -          | Raise security adapter and registry coverage >=75% | As a security architect, I want adapter registration and security scan adapters covered so that policy-critical tool paths are reliable. |
| P3-CORE-E1-I2 | CORE  | P3-E1-I2    | NO       | -          | Add tool-executor circuit breaker and backpressure | As an SRE, I want repeated external failures to fast-fail with cooldown so that queue health is preserved under dependency outages.      |
| P3-CORE-E1-I3 | CORE  | P3-E1-I3    | NO       | -          | Publish machine-readable MCP capability manifest   | As an integration engineer, I want documented MCP tool surfaces so that clients can integrate safely and predictably.                    |

### Epic P3-CORE-E2 - Memory and RAG Convergence

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                         | User Story                                                                                                                        |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| P3-CORE-E2-I1 | CORE  | P3-E2-I1    | NO       | -             | Switch context budgeting from bytes to token estimates        | As a runtime engineer, I want token-aware budgeting so that context truncation matches actual model limits across languages.      |
| P3-CORE-E2-I2 | CORE  | P3-E2-I2    | NO       | -             | Add background TTL sweeper for memory tiers                   | As a platform operator, I want periodic eviction so that stale project/org memory does not grow unbounded.                        |
| P3-CORE-E2-I3 | CORE  | P3-E2-I3    | NO       | -             | Add explicit rag-store unit/integration coverage reporting    | As a QA engineer, I want RAG store test visibility so that vector/schema behavior is verified and measurable in coverage outputs. |
| P3-CORE-E2-I4 | CORE  | P3-E2-I4    | NO       | P3-CORE-E2-I1 | Build unified KnowledgeProvider across SemanticMemory and RAG | As an agent developer, I want one knowledge query surface so that memory and retrieval contexts are consistent and composable.    |

### Epic P3-CORE-E3 - Security and Runtime Scale

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                   | User Story                                                                                                                           |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| P3-CORE-E3-I1 | CORE  | P3-E3-I1    | NO       | -             | Add API rate limiting and abuse controls                | As a security engineer, I want route-level throttling so that brute-force and prompt-abuse traffic is mitigated.                     |
| P3-CORE-E3-I2 | CORE  | P3-E3-I2    | NO       | -             | Validate Windows runtime parity for LLM transport       | As a cross-platform maintainer, I want Windows transport tests so that behavior matches CI and production assumptions.               |
| P3-CORE-E3-I3 | CORE  | P3-E3-I3    | NO       | -             | Introduce scalable vector-store strategy for multi-node | As an infrastructure owner, I want a multi-writer-safe vector strategy so that concurrent workers do not corrupt or block retrieval. |
| P3-CORE-E3-I4 | CORE  | P3-E3-I4    | NO       | -             | Implement Redis pub/sub bridge for SSE fanout           | As an operations team, I want cross-node SSE fanout so that users receive events consistently in horizontally scaled deployments.    |
| P3-CORE-E3-I5 | CORE  | P3-E3-I5    | NO       | -             | Add DB concurrency strategy and pooling guidance        | As a platform engineer, I want explicit DB concurrency limits/pooling strategy so that high-concurrency workloads remain stable.     |
| P3-CORE-E3-I6 | CORE  | P3-E3-I6    | NO       | P1-CORE-E1-I1 | Raise BullMQ branch coverage to >=75%                   | As a reliability engineer, I want production queue branches covered so that retry, failover, and delayed job behavior is trusted.    |

### Epic P3-UI-E1 - Responsive and Mobile Assurance

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                   | User Story                                                                                                                              |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P3-UI-E1-I1 | UI    | P3-E1-I1    | NO       | -           | Add mobile and tablet Playwright projects               | As a QA engineer, I want explicit mobile/tablet projects in e2e so that core workflows are verified beyond desktop.                     |
| P3-UI-E1-I2 | UI    | P3-E1-I2    | NO       | P3-UI-E1-I1 | Introduce compact mode for dense operational pages      | As a mobile operator, I want compact variants for pipeline/session/approvals so that critical controls remain usable on narrow screens. |
| P3-UI-E1-I3 | UI    | P3-E1-I3    | NO       | P3-UI-E1-I1 | Publish supported viewport policy and acceptance matrix | As a product owner, I want explicit viewport support policy so that quality targets are measurable and enforceable.                     |

### Epic P3-UI-E2 - Test Depth and Resilience

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                               | User Story                                                                                                                                         |
| ----------- | ----- | ----------- | -------- | ----------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-UI-E2-I1 | UI    | P3-E2-I1    | NO       | -           | Publish frontend package coverage artifacts in CI   | As an engineering lead, I want package-level frontend coverage artifacts so that test confidence is visible in every release.                      |
| P3-UI-E2-I2 | UI    | P3-E2-I2    | NO       | P3-UI-E2-I1 | Add SSE reconnect/duplication fault-injection tests | As a reliability engineer, I want reconnection burst and duplicate-event tests so that real-time behavior is stable under adverse conditions.      |
| P3-UI-E2-I3 | UI    | P3-E2-I3    | NO       | P1-UI-E2-I2 | Expand accessibility edge-state e2e matrix          | As an accessibility specialist, I want e2e coverage for modals, drawers, and long-table keyboard flows so that edge interactions remain compliant. |

### Epic P3-UI-E3 - Interaction Pattern Standardization

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                          | User Story                                                                                                                          |
| ----------- | ----- | ----------- | -------- | ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| P3-UI-E3-I1 | UI    | P3-E3-I1    | NO       | P2-UI-E1-I1 | Create async UX pattern kit for mutation flows | As a user, I want consistent pending/success/error/retry behavior across all actions so that system behavior is predictable.        |
| P3-UI-E3-I2 | UI    | P3-E3-I2    | NO       | P3-UI-E3-I1 | Add optimistic update framework where safe     | As an operator, I want immediate local feedback for eligible actions so that the interface feels responsive during network latency. |
| P3-UI-E3-I3 | UI    | P3-E3-I3    | NO       | P3-UI-E3-I1 | Add reconnect/backoff status component         | As a runtime user, I want visible connection recovery status so that I understand when delays are network-related.                  |

### Epic P3-UI-E4 - Security Validation in UI Layer

| GitHub Key  | Track | Original ID | Blocking | Depends On | Title                                                            | User Story                                                                                                                                    |
| ----------- | ----- | ----------- | -------- | ---------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-UI-E4-I1 | UI    | P3-E4-I1    | NO       | -          | Add UI security smoke suite for protected-route and expiry cases | As a security engineer, I want e2e security smoke checks for protected routes and session expiry so that auth regressions are caught quickly. |

---

## Milestone P4 - Product Strategy and Contributor Maturity

Milestone goal: close commercialization and contributor-scale gaps.

### Epic P4-CORE-E1 - UX/Product Evidence Completion

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                  | User Story                                                                                                              |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| P4-CORE-E1-I1 | CORE  | P4-E1-I1    | NO       | P2-CORE-E3-I4 | Validate and document Matomo analytics event flow      | As a product analyst, I want verified analytics instrumentation so that product decisions are based on real usage data. |
| P4-CORE-E1-I2 | CORE  | P4-E1-I2    | NO       | P3-UI-E1-I1   | Add responsive/mobile acceptance matrix per page group | As a UX lead, I want responsive criteria validated so that the 23-page UI is usable across desktop/tablet/mobile.       |
| P4-CORE-E1-I3 | CORE  | P4-E1-I3    | NO       | P1-UI-E2-I3   | Audit and enforce design-token adoption coverage       | As a design systems engineer, I want token adoption measured so that visual consistency and theming are maintainable.   |

### Epic P4-CORE-E2 - Commercial and Market Positioning

| GitHub Key    | Track | Original ID | Blocking | Depends On    | Title                                                  | User Story                                                                                                           |
| ------------- | ----- | ----------- | -------- | ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| P4-CORE-E2-I1 | CORE  | P4-E2-I1    | NO       | -             | Define hosted SaaS reference offering and architecture | As a buyer, I want a managed deployment option so that enterprise adoption does not require full self-hosting.       |
| P4-CORE-E2-I2 | CORE  | P4-E2-I2    | NO       | -             | Define contributor CLA/IP governance model             | As legal counsel, I want explicit contributor/IP governance so that enterprise procurement risk is reduced.          |
| P4-CORE-E2-I3 | CORE  | P4-E2-I3    | NO       | P4-CORE-E2-I1 | Publish licensing and pricing strategy options         | As product leadership, I want a clear monetization framework so that open-source and commercial goals are aligned.   |
| P4-CORE-E2-I4 | CORE  | P4-E2-I4    | NO       | -             | Publish competitive positioning dossier                | As GTM leadership, I want a documented competitor comparison so that sales and roadmap decisions are evidence-based. |

### Epic P4-UI-E1 - Frontend Contributor Enablement

| GitHub Key  | Track | Original ID | Blocking | Depends On  | Title                                                                          | User Story                                                                                                                               |
| ----------- | ----- | ----------- | -------- | ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| P4-UI-E1-I1 | UI    | P4-E1-I1    | NO       | P1-UI-E1-I3 | Publish frontend maintainer guide (architecture, event model, testing pyramid) | As a new contributor, I want a single maintainer guide so that I can deliver changes without reverse-engineering architecture decisions. |
| P4-UI-E1-I2 | UI    | P4-E1-I2    | NO       | P4-UI-E1-I1 | Create shared scenario fixture library for UI states                           | As a test author, I want reusable fixtures for loading/error/empty/realtime states so that test authoring is faster and consistent.      |
| P4-UI-E1-I3 | UI    | P4-E1-I3    | NO       | P4-UI-E1-I1 | Document token-generation workflow and dependencies                            | As a UI contributor, I want clear token build workflow documentation so that design-system changes are safe and repeatable.              |
| P4-UI-E1-I4 | UI    | P4-E1-I4    | NO       | P4-UI-E1-I1 | Add one-command local quality gate for UI                                      | As a developer, I want one local command that runs lint, unit, a11y smoke, and visual smoke so that pre-PR checks are simple.            |

---

## Global Blocking Start Queue

1. P1-CORE-E1-I1
2. P1-CORE-E1-I2
3. P1-CORE-E1-I3
4. P1-CORE-E1-I4
5. P1-CORE-E2-I1
6. P1-CORE-E3-I1
7. P1-CORE-E3-I2
8. P1-UI-E1-I1
9. P1-UI-E1-I2
10. P1-UI-E2-I1
11. P1-UI-E2-I2
12. P1-UI-E3-I1
13. P1-UI-E3-I2
14. P1-UI-E3-I3
15. P1-UI-E4-I1

Run this queue first. Then proceed milestone by milestone using the dependency links.

---

## GitHub Labels Recommendation

- Priority: `P1`, `P2`, `P3`, `P4`
- Blocker: `blocking`
- Track: `track-core`, `track-ui`
- Type: `epic`, `story`, `tech-debt`, `security`, `devops`, `scalability`, `ux`, `accessibility`, `performance`, `docs`, `product`
- Area: `engine`, `workflow`, `llm`, `memory`, `governance`, `frontend`, `design-system`, `testing`, `observability`

---

## Notes

- This file is a merged and normalized planning artifact. Original source references and full weakness-level traceability remain available in the two source backlog files.
- If you want, the next step is generating import-ready CSV files (epics + issues) from this final merged file for bulk GitHub creation.
