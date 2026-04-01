# GitHub Delivery Plan - Milestones, Epics, Issues (Traceable)

## How to Use This File

- Create Milestones first in listed order.
- Create Epics next, keeping `depends_on` links.
- Create Issues under each Epic with `blocked_by` enforced.
- Use `traceability_sources` for issue body references to audit evidence.

## Milestones (Execution Order)

| Milestone ID | Name                                     | Goal                                                                    | Blocks | Source Focus                            |
| ------------ | ---------------------------------------- | ----------------------------------------------------------------------- | ------ | --------------------------------------- |
| M1           | Security Baseline & Trust Boundaries     | Eliminate critical security bypasses and high-risk injection paths      | M2-M7  | 07-12, security-synthesis               |
| M2           | Durable Data & Migration Foundation      | Make persistence safe, recoverable, and migration-driven                | M3-M7  | 20-27, data-model-persistence-synthesis |
| M3           | Reliability & Recovery Hardening         | Remove silent degradation and improve recovery/operability              | M4-M7  | 28-36                                   |
| M4           | Platform Correctness & Wiring Integrity  | Fix broken connections, unimplemented paths, and behavior mismatches    | M5-M7  | 01-06, synthesis                        |
| M5           | Agent Quality & Orchestration Coherence  | Improve role activation, reasoning quality, and inter-agent consistency | M6-M7  | 13-19, agent-behavior-synthesis         |
| M6           | Cost Governance & FinOps Controls        | Add enforceable cost limits, attribution, and optimization loops        | M7     | 37-45                                   |
| M7           | Release Readiness & Operational Insights | Validate cross-cutting quality gates, dashboards, and rollout safety    | none   | all synthesis files                     |

## Epic Backlog

### M1 - Security Baseline & Trust Boundaries

#### EPIC E1 - Deny-by-default Tool Governance

- milestone: M1
- depends_on: none
- traceability_sources: [Gaps/09-security-tool-execution-guard-gaps.md](Gaps/09-security-tool-execution-guard-gaps.md), [Gaps/security-synthesis.md](Gaps/security-synthesis.md)
- issues:
  - ISSUE I-001: Switch tool-execution guard to deny-by-default when manifest/server record missing
    - labels: `security`, `critical`, `backend`
    - blocked_by: none
    - acceptance: missing manifest or server entry always blocks execution with explicit error code.
  - ISSUE I-002: Bind policy identity to authenticated principal, not caller-supplied `agent_id`
    - labels: `security`, `identity`, `backend`
    - blocked_by: I-001
    - acceptance: policy resolution uses trusted identity source; request payload cannot escalate scope.
  - ISSUE I-003: Add startup readiness gate for governance manifest integrity
    - labels: `security`, `ops`
    - blocked_by: I-001
    - acceptance: service is not ready when governance manifest is missing/malformed.

#### EPIC E2 - Prompt, Tool Loop, and Action Abuse Hardening

- milestone: M1
- depends_on: E1
- traceability_sources: [Gaps/07-security-prompt-and-tool-loop.md](Gaps/07-security-prompt-and-tool-loop.md), [Gaps/08-security-governance-and-action-abuse.md](Gaps/08-security-governance-and-action-abuse.md), [Gaps/security-synthesis.md](Gaps/security-synthesis.md)
- issues:
  - ISSUE I-004: Separate untrusted user/citation/tool data with strict trust-boundary framing
    - labels: `security`, `llm`, `backend`
    - blocked_by: I-001
    - acceptance: prompt assembly marks untrusted content and prevents instruction override from data blocks.
  - ISSUE I-005: Stop reinjecting tool results as user-role content
    - labels: `security`, `llm`
    - blocked_by: I-004
    - acceptance: tool outputs flow through dedicated structured/tool channel.
  - ISSUE I-006: Enforce server-side confirmation policy by action type (ignore payload flag)
    - labels: `security`, `governance`
    - blocked_by: I-001
    - acceptance: approve/reject/queue actions always require server-enforced confirmation.
  - ISSUE I-007: Add nonce/replay protection for chat action envelopes
    - labels: `security`, `backend`
    - blocked_by: I-006
    - acceptance: action replay attempts are rejected and audited.

#### EPIC E3 - XSS, Secrets, and Supply Chain Hardening

- milestone: M1
- depends_on: E2
- traceability_sources: [Gaps/10-security-auth-session-and-csrf.md](Gaps/10-security-auth-session-and-csrf.md), [Gaps/11-security-xss-and-content-sanitization.md](Gaps/11-security-xss-and-content-sanitization.md), [Gaps/12-security-secrets-supply-chain-and-runtime.md](Gaps/12-security-secrets-supply-chain-and-runtime.md)
- issues:
  - ISSUE I-008: Replace regex sanitizer with policy-based HTML sanitization
    - labels: `security`, `frontend`, `backend`
    - blocked_by: I-004
    - acceptance: malicious payload corpus is neutralized by tests.
  - ISSUE I-009: Restrict `dangerouslySetInnerHTML` usage via approved wrapper + lint rule
    - labels: `security`, `frontend`
    - blocked_by: I-008
    - acceptance: only approved component path can render sanitized HTML.
  - ISSUE I-010: Remove or tightly scope production API-key fallback mode
    - labels: `security`, `auth`
    - blocked_by: I-001
    - acceptance: full auth middleware required for non-local production routes.
  - ISSUE I-011: Resolve high/moderate UI dependency advisories with compatibility test run
    - labels: `security`, `dependencies`
    - blocked_by: none
    - acceptance: audit report reduced to accepted risk baseline with documented exceptions.

### M2 - Durable Data & Migration Foundation

#### EPIC E4 - Unified Persistence Model and Integrity

- milestone: M2
- depends_on: E1
- traceability_sources: [Gaps/20-data-model-area1-storage-technology-inventory.md](Gaps/20-data-model-area1-storage-technology-inventory.md), [Gaps/21-data-model-area2-schema-and-model-analysis.md](Gaps/21-data-model-area2-schema-and-model-analysis.md), [Gaps/22-data-model-area3-integrity-and-constraints.md](Gaps/22-data-model-area3-integrity-and-constraints.md)
- issues:
  - ISSUE I-012: Introduce canonical `workflow_runs` model with run-step-tool lineage
    - labels: `data`, `architecture`
    - blocked_by: I-001
    - acceptance: one query path reconstructs full workflow lifecycle.
  - ISSUE I-013: Add canonical `tool_call_log` persistence model
    - labels: `data`, `observability`
    - blocked_by: I-012
    - acceptance: each tool call has correlated input/output/duration/status/run id.
  - ISSUE I-014: Remove critical file-transaction fragility (WAL/journal or sqlite migration)
    - labels: `data`, `reliability`
    - blocked_by: I-012
    - acceptance: multi-write operations become atomic or recoverable.
  - ISSUE I-015: Enforce referential integrity for workspace/project relations
    - labels: `data`, `backend`
    - blocked_by: I-014
    - acceptance: orphan projects prevented or auto-remediated.

#### EPIC E5 - Migrations, Retention, and Backup/Restore

- milestone: M2
- depends_on: E4
- traceability_sources: [Gaps/23-data-model-area4-lifecycle-and-mutation-patterns.md](Gaps/23-data-model-area4-lifecycle-and-mutation-patterns.md), [Gaps/24-data-model-area5-agent-specific-persistence.md](Gaps/24-data-model-area5-agent-specific-persistence.md), [Gaps/25-data-model-area6-migration-seeding-and-evolution.md](Gaps/25-data-model-area6-migration-seeding-and-evolution.md), [Gaps/27-data-model-area8-backup-recovery-and-durability.md](Gaps/27-data-model-area8-backup-recovery-and-durability.md)
- issues:
  - ISSUE I-016: Implement unified migration framework + migration ledger across domains
    - labels: `data`, `migration`
    - blocked_by: I-012
    - acceptance: auth/rag/provider schemas migrate with versioned scripts and status table.
  - ISSUE I-017: Add backup/restore automation for all sqlite and critical file stores
    - labels: `ops`, `durability`
    - blocked_by: I-016
    - acceptance: restore drill passes with checksum validation.
  - ISSUE I-018: Add retention policies and compaction for jobs, DLQ, chat history, logs
    - labels: `ops`, `data-lifecycle`
    - blocked_by: I-016
    - acceptance: storage growth is bounded by policy and monitored.
  - ISSUE I-019: Persist session tracker and agent execution control-plane state durably
    - labels: `reliability`, `data`
    - blocked_by: I-012
    - acceptance: restart does not lose active session timeline or execution state.

#### EPIC E6 - Data Access Layer Consolidation

- milestone: M2
- depends_on: E5
- traceability_sources: [Gaps/26-data-model-area7-data-access-and-layer-separation.md](Gaps/26-data-model-area7-data-access-and-layer-separation.md)
- issues:
  - ISSUE I-020: Remove direct fs mutations from orchestration path into repository layer
    - labels: `architecture`, `backend`
    - blocked_by: I-014
    - acceptance: command/session mutations flow through single persistence abstraction.
  - ISSUE I-021: Enforce default pagination/limits on persistence list/query APIs
    - labels: `performance`, `backend`
    - blocked_by: I-020
    - acceptance: unbounded list queries are blocked in provider and route layers.

### M3 - Reliability & Recovery Hardening

#### EPIC E7 - Error Recovery and Operability Controls

- milestone: M3
- depends_on: E5
- traceability_sources: [Gaps/28-error-recovery-area1-failure-point-inventory.md](Gaps/28-error-recovery-area1-failure-point-inventory.md), [Gaps/29-error-recovery-area2-llm-ai-provider-resilience.md](Gaps/29-error-recovery-area2-llm-ai-provider-resilience.md), [Gaps/30-error-recovery-area3-agent-workflow-resilience.md](Gaps/30-error-recovery-area3-agent-workflow-resilience.md), [Gaps/31-error-recovery-area4-network-connectivity-resilience.md](Gaps/31-error-recovery-area4-network-connectivity-resilience.md), [Gaps/32-error-recovery-area5-state-corruption-consistency.md](Gaps/32-error-recovery-area5-state-corruption-consistency.md), [Gaps/33-error-recovery-area6-error-propagation-reporting.md](Gaps/33-error-recovery-area6-error-propagation-reporting.md), [Gaps/34-error-recovery-area7-resource-exhaustion-limits.md](Gaps/34-error-recovery-area7-resource-exhaustion-limits.md), [Gaps/35-error-recovery-area8-recovery-mechanisms-operability.md](Gaps/35-error-recovery-area8-recovery-mechanisms-operability.md), [Gaps/36-error-recovery-synthesis-and-final-verdict.md](Gaps/36-error-recovery-synthesis-and-final-verdict.md)
- issues:
  - ISSUE I-022: Add queue corruption quarantine + replay/repair workflow
    - labels: `reliability`, `critical`
    - blocked_by: I-014
    - acceptance: malformed queue never silently drops work; quarantine event emitted.
  - ISSUE I-023: Propagate cancellation end-to-end via AbortSignal across dispatcher/runtime/tools
    - labels: `reliability`, `backend`
    - blocked_by: I-020
    - acceptance: cancelled jobs terminate real execution path, not only local status.
  - ISSUE I-024: Add stalled transition watchdog and auto-escalation policy
    - labels: `reliability`, `ops`
    - blocked_by: I-022
    - acceptance: stale in-progress transitions trigger remediation events.
  - ISSUE I-025: Upgrade error reporting with correlation IDs and degraded-state signaling
    - labels: `observability`, `backend`
    - blocked_by: I-022
    - acceptance: major catch boundaries include structured diagnostics and user-visible degradation flag.
  - ISSUE I-026: Add queue/DLQ hard limits and backpressure behavior
    - labels: `performance`, `ops`
    - blocked_by: I-018
    - acceptance: queue exhaustion is bounded and surfaced before outage.

### M4 - Platform Correctness & Wiring Integrity

#### EPIC E8 - Wiring and Feature Integrity Corrections

- milestone: M4
- depends_on: E7
- traceability_sources: [Gaps/01-sweep-stub-placeholder.md](Gaps/01-sweep-stub-placeholder.md), [Gaps/02-sweep-broken-connections.md](Gaps/02-sweep-broken-connections.md), [Gaps/03-sweep-logic-gaps.md](Gaps/03-sweep-logic-gaps.md), [Gaps/04-sweep-data-flow-integrity.md](Gaps/04-sweep-data-flow-integrity.md), [Gaps/05-sweep-hardcoded-assumptions.md](Gaps/05-sweep-hardcoded-assumptions.md), [Gaps/06-sweep-feature-claims-vs-reality.md](Gaps/06-sweep-feature-claims-vs-reality.md), [Gaps/synthesis.md](Gaps/synthesis.md)
- issues:
  - ISSUE I-027: Fix drift endpoint mismatch and remove synthetic observability masking
    - labels: `bug`, `observability`, `critical`
    - blocked_by: I-025
    - acceptance: live drift source is used; fallback data is clearly marked and alerted.
  - ISSUE I-028: Implement backend receiver for web-vitals ingestion (`/api/v1/metrics/vitals`)
    - labels: `bug`, `telemetry`
    - blocked_by: I-025
    - acceptance: vitals events persist and appear in observability metrics.
  - ISSUE I-029: Align auth config validation semantics with runtime auth boot semantics
    - labels: `bug`, `auth`
    - blocked_by: I-010
    - acceptance: setup status reflects valid one-provider configuration.
  - ISSUE I-030: Implement GitHub refresh token path or remove dead contract path
    - labels: `bug`, `auth`
    - blocked_by: I-029
    - acceptance: refresh behavior is functional and covered by tests.
  - ISSUE I-031: Externalize hardcoded operational values to configuration with docs update
    - labels: `config`, `maintainability`
    - blocked_by: I-020
    - acceptance: route/runtime hardcoded constants replaced by documented env/config profile.

### M5 - Agent Quality & Orchestration Coherence

#### EPIC E9 - Agent Activation, Prompt Quality, and Evaluation Maturity

- milestone: M5
- depends_on: E8
- traceability_sources: [Gaps/13-agent-behavior-area1-inventory-role-clarity.md](Gaps/13-agent-behavior-area1-inventory-role-clarity.md), [Gaps/14-agent-behavior-area2-prompt-quality.md](Gaps/14-agent-behavior-area2-prompt-quality.md), [Gaps/15-agent-behavior-area3-reasoning-and-decision-quality.md](Gaps/15-agent-behavior-area3-reasoning-and-decision-quality.md), [Gaps/16-agent-behavior-area4-inter-agent-coherence.md](Gaps/16-agent-behavior-area4-inter-agent-coherence.md), [Gaps/17-agent-behavior-area5-failure-modes.md](Gaps/17-agent-behavior-area5-failure-modes.md), [Gaps/18-agent-behavior-area6-output-quality.md](Gaps/18-agent-behavior-area6-output-quality.md), [Gaps/19-agent-behavior-area7-eval-observability.md](Gaps/19-agent-behavior-area7-eval-observability.md), [Gaps/agent-behavior-synthesis.md](Gaps/agent-behavior-synthesis.md)
- issues:
  - ISSUE I-032: Add parity checks between orchestrator instructions and runtime flow assignments
    - labels: `agentic`, `quality`
    - blocked_by: I-020
    - acceptance: build/test fails when declared required agents are not wired in runtime flow.
  - ISSUE I-033: Add semantic novelty and depth checks to reject repetitive low-information outputs
    - labels: `agentic`, `quality`, `llm`
    - blocked_by: I-032
    - acceptance: repetitive outputs are flagged and re-routed before acceptance.
  - ISSUE I-034: Introduce golden-task evaluation harness and prompt A/B framework
    - labels: `evaluation`, `agentic`
    - blocked_by: I-033
    - acceptance: prompt/agent changes can be compared on stable benchmark tasks.
  - ISSUE I-035: Enrich handoff artifacts to satisfy contract fidelity and machine-readability
    - labels: `agentic`, `orchestration`
    - blocked_by: I-034
    - acceptance: downstream agents consume complete structured handoffs with provenance.

### M6 - Cost Governance & FinOps Controls

#### EPIC E10 - Cost Controls, Attribution, and Optimization

- milestone: M6
- depends_on: E9
- traceability_sources: [Gaps/37-cost-token-economics-area1-llm-call-inventory-and-baseline-math.md](Gaps/37-cost-token-economics-area1-llm-call-inventory-and-baseline-math.md), [Gaps/38-cost-token-economics-area2-context-efficiency-and-token-waste.md](Gaps/38-cost-token-economics-area2-context-efficiency-and-token-waste.md), [Gaps/39-cost-token-economics-area3-model-routing-and-price-performance.md](Gaps/39-cost-token-economics-area3-model-routing-and-price-performance.md), [Gaps/40-cost-token-economics-area4-retries-loops-fanout-worst-case.md](Gaps/40-cost-token-economics-area4-retries-loops-fanout-worst-case.md), [Gaps/41-cost-token-economics-area5-caching-and-redundancy.md](Gaps/41-cost-token-economics-area5-caching-and-redundancy.md), [Gaps/42-cost-token-economics-area6-guardrails-and-spend-controls.md](Gaps/42-cost-token-economics-area6-guardrails-and-spend-controls.md), [Gaps/43-cost-token-economics-area7-visibility-chargeback-and-attribution.md](Gaps/43-cost-token-economics-area7-visibility-chargeback-and-attribution.md), [Gaps/44-cost-token-economics-area8-unit-economics-scaling-and-break-even.md](Gaps/44-cost-token-economics-area8-unit-economics-scaling-and-break-even.md), [Gaps/45-cost-token-economics-synthesis-and-final-verdict.md](Gaps/45-cost-token-economics-synthesis-and-final-verdict.md)
- issues:
  - ISSUE I-036: Enforce per-session and per-workflow token/cost budget ceilings
    - labels: `finops`, `llm`, `backend`
    - blocked_by: I-025
    - acceptance: requests exceeding budget are blocked/deferred with explicit reason.
  - ISSUE I-037: Implement model routing policy by price-performance tier with fallback policy
    - labels: `finops`, `llm`
    - blocked_by: I-036
    - acceptance: routing decisions are policy-driven and auditable.
  - ISSUE I-038: Add retry-cost governor and fanout amplification protection
    - labels: `finops`, `reliability`
    - blocked_by: I-036
    - acceptance: retries/revisions stop when marginal value threshold is breached.
  - ISSUE I-039: Build chargeback-ready attribution (agent/provider/model/feature/session)
    - labels: `finops`, `observability`
    - blocked_by: I-013
    - acceptance: monthly spend can be allocated by cost center and feature lane.
  - ISSUE I-040: Add cache/reuse strategy for repeat context and deterministic tool outputs
    - labels: `finops`, `performance`
    - blocked_by: I-037
    - acceptance: repeated calls show measurable token reduction with no quality regression.

### M7 - Release Readiness & Operational Insights

#### EPIC E11 - Final Hardening, Governance Reporting, and Rollout

- milestone: M7
- depends_on: E3, E6, E7, E8, E9, E10
- traceability_sources: [Gaps/synthesis.md](Gaps/synthesis.md), [Gaps/security-synthesis.md](Gaps/security-synthesis.md), [Gaps/data-model-persistence-synthesis.md](Gaps/data-model-persistence-synthesis.md), [Gaps/agent-behavior-synthesis.md](Gaps/agent-behavior-synthesis.md), [Gaps/36-error-recovery-synthesis-and-final-verdict.md](Gaps/36-error-recovery-synthesis-and-final-verdict.md), [Gaps/45-cost-token-economics-synthesis-and-final-verdict.md](Gaps/45-cost-token-economics-synthesis-and-final-verdict.md)
- issues:
  - ISSUE I-041: Create cross-domain go-live checklist and automated gate pipeline
    - labels: `release`, `quality-gate`
    - blocked_by: I-011, I-018, I-026, I-040
    - acceptance: release blocked when critical controls or metrics are below threshold.
  - ISSUE I-042: Create executive dashboard for reliability, security, quality, and cost KPIs
    - labels: `reporting`, `insights`
    - blocked_by: I-025, I-039
    - acceptance: leadership can trace status from milestone to issue to source evidence.
  - ISSUE I-043: Run production-readiness game day for outage, corruption, and budget overrun scenarios
    - labels: `ops`, `drill`
    - blocked_by: I-022, I-023, I-036
    - acceptance: scenario playbooks validated with measurable recovery time and no unknown blockers.

## Full Traceability Matrix (All Gaps Files)

| Source File                                                            | Domain                         | Mapped Milestone | Mapped Epic |
| ---------------------------------------------------------------------- | ------------------------------ | ---------------- | ----------- |
| 01-sweep-stub-placeholder.md                                           | Platform correctness           | M4               | E8          |
| 02-sweep-broken-connections.md                                         | Platform correctness           | M4               | E8          |
| 03-sweep-logic-gaps.md                                                 | Platform correctness           | M4               | E8          |
| 04-sweep-data-flow-integrity.md                                        | Platform correctness           | M4               | E8          |
| 05-sweep-hardcoded-assumptions.md                                      | Platform correctness           | M4               | E8          |
| 06-sweep-feature-claims-vs-reality.md                                  | Platform correctness           | M4               | E8          |
| 07-security-prompt-and-tool-loop.md                                    | Security                       | M1               | E2          |
| 08-security-governance-and-action-abuse.md                             | Security                       | M1               | E2          |
| 09-security-tool-execution-guard-gaps.md                               | Security                       | M1               | E1          |
| 10-security-auth-session-and-csrf.md                                   | Security                       | M1               | E3          |
| 11-security-xss-and-content-sanitization.md                            | Security                       | M1               | E3          |
| 12-security-secrets-supply-chain-and-runtime.md                        | Security                       | M1               | E3          |
| 13-agent-behavior-area1-inventory-role-clarity.md                      | Agent quality                  | M5               | E9          |
| 14-agent-behavior-area2-prompt-quality.md                              | Agent quality                  | M5               | E9          |
| 15-agent-behavior-area3-reasoning-and-decision-quality.md              | Agent quality                  | M5               | E9          |
| 16-agent-behavior-area4-inter-agent-coherence.md                       | Agent quality                  | M5               | E9          |
| 17-agent-behavior-area5-failure-modes.md                               | Agent quality                  | M5               | E9          |
| 18-agent-behavior-area6-output-quality.md                              | Agent quality                  | M5               | E9          |
| 19-agent-behavior-area7-eval-observability.md                          | Agent quality                  | M5               | E9          |
| 20-data-model-area1-storage-technology-inventory.md                    | Data model                     | M2               | E4          |
| 21-data-model-area2-schema-and-model-analysis.md                       | Data model                     | M2               | E4          |
| 22-data-model-area3-integrity-and-constraints.md                       | Data model                     | M2               | E4          |
| 23-data-model-area4-lifecycle-and-mutation-patterns.md                 | Data lifecycle                 | M2               | E5          |
| 24-data-model-area5-agent-specific-persistence.md                      | Data lifecycle                 | M2               | E5          |
| 25-data-model-area6-migration-seeding-and-evolution.md                 | Data migration                 | M2               | E5          |
| 26-data-model-area7-data-access-and-layer-separation.md                | Data access                    | M2               | E6          |
| 27-data-model-area8-backup-recovery-and-durability.md                  | Data durability                | M2               | E5          |
| 28-error-recovery-area1-failure-point-inventory.md                     | Reliability                    | M3               | E7          |
| 29-error-recovery-area2-llm-ai-provider-resilience.md                  | Reliability                    | M3               | E7          |
| 30-error-recovery-area3-agent-workflow-resilience.md                   | Reliability                    | M3               | E7          |
| 31-error-recovery-area4-network-connectivity-resilience.md             | Reliability                    | M3               | E7          |
| 32-error-recovery-area5-state-corruption-consistency.md                | Reliability                    | M3               | E7          |
| 33-error-recovery-area6-error-propagation-reporting.md                 | Reliability                    | M3               | E7          |
| 34-error-recovery-area7-resource-exhaustion-limits.md                  | Reliability                    | M3               | E7          |
| 35-error-recovery-area8-recovery-mechanisms-operability.md             | Reliability                    | M3               | E7          |
| 36-error-recovery-synthesis-and-final-verdict.md                       | Reliability synthesis          | M3               | E7          |
| 37-cost-token-economics-area1-llm-call-inventory-and-baseline-math.md  | FinOps                         | M6               | E10         |
| 38-cost-token-economics-area2-context-efficiency-and-token-waste.md    | FinOps                         | M6               | E10         |
| 39-cost-token-economics-area3-model-routing-and-price-performance.md   | FinOps                         | M6               | E10         |
| 40-cost-token-economics-area4-retries-loops-fanout-worst-case.md       | FinOps                         | M6               | E10         |
| 41-cost-token-economics-area5-caching-and-redundancy.md                | FinOps                         | M6               | E10         |
| 42-cost-token-economics-area6-guardrails-and-spend-controls.md         | FinOps                         | M6               | E10         |
| 43-cost-token-economics-area7-visibility-chargeback-and-attribution.md | FinOps                         | M6               | E10         |
| 44-cost-token-economics-area8-unit-economics-scaling-and-break-even.md | FinOps                         | M6               | E10         |
| 45-cost-token-economics-synthesis-and-final-verdict.md                 | FinOps synthesis               | M6               | E10         |
| agent-behavior-synthesis.md                                            | Agent synthesis                | M5               | E9          |
| data-model-persistence-synthesis.md                                    | Data synthesis                 | M2               | E4/E5/E6    |
| security-synthesis.md                                                  | Security synthesis             | M1               | E1/E2/E3    |
| synthesis.md                                                           | Platform correctness synthesis | M4               | E8          |

## Suggested GitHub Labels

- `milestone:m1-security`
- `milestone:m2-data-foundation`
- `milestone:m3-reliability`
- `milestone:m4-correctness`
- `milestone:m5-agent-quality`
- `milestone:m6-finops`
- `milestone:m7-release-readiness`
- `epic`
- `blocked`
- `depends-on`
- `critical`

## Blocking Rules to Enforce in GitHub

- Do not start M2 epics before E1 is complete.
- Do not start M5 and M6 before E7 and E8 are complete.
- Do not close M7 until E11 acceptance criteria and game day pass.
