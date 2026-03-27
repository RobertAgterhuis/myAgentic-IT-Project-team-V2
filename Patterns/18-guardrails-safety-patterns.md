# Pattern 18: Guardrails / Safety Patterns

Current score: 9.8/10
Target score: 10.0/10

## Assessment

Safety and guardrails are among the repository's strongest qualities. The platform combines policy documents, contract validation, approvals, audit trails, RBAC, safe defaults, and disciplined file-based governance.

## Evidence

- The README describes trust strengths as orchestration, gated phases, auditability, policy guardrails, and documentation flow. Source: README.md:13.
- The architecture overview documents audit trail logging, file locking, atomic writes, rate limiting, security headers, and typed context. Source: docs/architecture/overview.md:93, docs/architecture/overview.md:104-121.
- MCP governance defaults set baseline permissions and explicit deny states for sensitive servers like governance-approval and azure-management. Source: src/webapp/plugins/mcp-governance/defaults.ts:210-216.
- Governance then selectively elevates permissions only for appropriate roles such as orchestrator, security, devops, and infra. Source: src/webapp/plugins/mcp-governance/defaults.ts:239-349.
- Orchestrator contract validation rules require handoff checklist completion, required sections, source citations, and anti-hallucination compliance. Source: templates/sdlc/agents/00-orchestrator.md:649-705.
- Security documentation ties session-state protection to withFileLock and audit trails. Source: docs/security/security-design.md:116, docs/security/security-design.md:180, docs/security/security-design.md:243-252.

## Why The Score Is Not Higher

- Guardrails are strong, but policy observability could be even tighter by linking runtime violations directly to policy drift dashboards.
- There is room for more automated preemption of unsafe plan shapes before they reach approval queues.

## Path To 9.9+

- Add policy-drift analytics and automatic reconciliation suggestions.
- Add richer blast-radius scoring for proposed overrides and exceptions.
- Add cross-policy conflict detection before execution starts.

## Audit Verdict

Guardrails and safety are already top-tier. The repository's credibility depends heavily on this strength, and it is justified by the implementation.
