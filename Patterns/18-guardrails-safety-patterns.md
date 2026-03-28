# Pattern 18: Guardrails / Safety Patterns

Current score: 9.9/10
Target score: 9.9/10

## Assessment

Safety and guardrails are among the repository's strongest qualities. The platform combines policy documents, contract validation, approvals, audit trails, RBAC, safe defaults, and disciplined file-based governance. Bounded auto-apply adds proactive blast-radius controls: every autonomous policy change is gated by a configurable maxChangePercent threshold and backed by a reversibleUntil window, making autonomous adaptation safe by design.

## Evidence

- The README describes trust strengths as orchestration, gated phases, auditability, policy guardrails, and documentation flow. Source: README.md:13.
- The architecture overview documents audit trail logging, file locking, atomic writes, rate limiting, security headers, and typed context. Source: docs/architecture/overview.md:93, docs/architecture/overview.md:104-121.
- MCP governance defaults set baseline permissions and explicit deny states for sensitive servers like governance-approval and azure-management. Source: src/webapp/plugins/mcp-governance/defaults.ts:210-216.
- Governance then selectively elevates permissions only for appropriate roles such as orchestrator, security, devops, and infra. Source: src/webapp/plugins/mcp-governance/defaults.ts:239-349.
- Orchestrator contract validation rules require handoff checklist completion, required sections, source citations, and anti-hallucination compliance. Source: templates/sdlc/agents/00-orchestrator.md:649-705.
- Security documentation ties session-state protection to withFileLock and audit trails. Source: docs/security/security-design.md:116, docs/security/security-design.md:180, docs/security/security-design.md:243-252.
- Bounded auto-apply enforces explicit blast-radius controls: a numeric change is auto-approved only when the proposed delta is within a configured maxChangePercent, preventing runaway policy drift. Source: platform/engine/proactive-discovery-optimization.ts (autoApplyAdaptivePolicyProposal, AdaptiveProposalAutoApplyResult.withinBounds).
- Every auto-applied change records a reversibleUntil timestamp, providing a time-bounded rollback window that preserves human override authority even for autonomous policy changes. Source: platform/engine/proactive-discovery-optimization.ts (AdaptiveProposalAutoApplyResult.reversibleUntil).

## Remaining Refinements

- Policy-drift analytics linking runtime violations to drift dashboards would deepen observability.
- Cross-policy conflict detection before execution starts is a future safety increment.

## Audit Verdict

Guardrails and safety are top-tier with proactive blast-radius controls now added to the autonomous adaptation layer. Bounded auto-apply ensures safe-by-design policy changes. Target state is achieved.
