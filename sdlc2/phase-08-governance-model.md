# Phase 8 — Governance Model

> Roles, responsibilities, approval workflows, and compliance audit design.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Current Governance Architecture

### What Exists

The `platform/sdlc/governance.ts` module provides a complete governance model:

**Roles** (8 defined):

```
PRODUCT_OWNER | ARCHITECT | DEVELOPER | QA_ENGINEER |
SECURITY_REVIEWER | RELEASE_MANAGER | DEVOPS_ENGINEER | STAKEHOLDER
```

**Permissions** (7 defined):

```
CREATE | READ | UPDATE | DELETE | APPROVE | TRANSITION | DEPLOY
```

**GovernanceEngine API**:

- `assignRole(userId, role, scope)` → Role binding
- `checkPermission(userId, permission, resource)` → boolean
- `createApprovalRequest(gate, artifact, requestedBy)` → ApprovalRequest
- `processApproval(requestId, decision, approvedBy)` → ApprovalRequest
- `evaluateApproval(requestId, policy)` → boolean (policy fulfilled?)

**Approval Policies** (10 default):

```
IDEA → REQUIREMENT:    1 approval, PRODUCT_OWNER required
REQUIREMENT → DESIGN:  1 approval, ARCHITECT required
DESIGN → DEVELOPMENT:  2 approvals, ARCHITECT + QA_ENGINEER required
DEVELOPMENT → TESTING: 1 approval, DEVELOPER required
TESTING → STAGING:     2 approvals, QA_ENGINEER + SECURITY_REVIEWER required
STAGING → RELEASE:     2 approvals, RELEASE_MANAGER + PRODUCT_OWNER required
RELEASE → PRODUCTION:  3 approvals, RELEASE_MANAGER + DEVOPS_ENGINEER + PRODUCT_OWNER required
PRODUCTION → MONITORING: 1 approval, DEVOPS_ENGINEER required, auto-approve
MONITORING → IMPROVEMENT: 1 approval, PRODUCT_OWNER required
IMPROVEMENT → IDEA:    auto-approve
```

**Assessment**: The governance model is well-designed. Role granularity matches
real organizational structures. Policies map to SDLC gates correctly.
The 3-approval requirement for production deployment reflects appropriate rigor.

### What's Missing

1. **No runtime integration** — the GovernanceEngine is never called
2. **No identity system** — no concept of "who is the current user"
3. **No approval UI** — no interface for reviewers to act
4. **No policy customization** — hardcoded DEFAULT_POLICIES

---

## Governance Integration Design

### Integration Point: Critic Gates

The natural integration point is the critic gate, which already validates
deliverables after each phase. Governance adds an approval check:

```
Current flow:
  Phase completes → Critic gate → Contract check → Guardrail check → Pass/Fail

Proposed flow:
  Phase completes → Critic gate → Contract check → Guardrail check →
    → Governance check (if enabled) → Approval required? →
      → If auto-approve: advance
      → If manual: pause workflow, notify, wait
```

### Operating Modes

The governance layer should operate in three modes:

| Mode        | Behavior                                               | Use Case              |
| ----------- | ------------------------------------------------------ | --------------------- |
| `OFF`       | No governance checks. Current behavior.                | Solo developer        |
| `ADVISORY`  | Governance evaluates, logs results, but doesn't block. | Team learning balance |
| `ENFORCING` | Governance blocks transitions until approvals are met. | Production teams      |

Configuration:

```json
{
  "governance": {
    "mode": "off" | "advisory" | "enforcing",
    "policies": "default" | "custom",
    "customPolicyPath": "path/to/policies.json"
  }
}
```

This allows incremental adoption. Teams start with `off`, move to `advisory`
to see what governance would require, then switch to `enforcing` when ready.

---

## Identity Model

### Problem

The current system has no concept of identity. All operations are attributed
to "system" or the agent name. Governance requires knowing WHO is approving.

### Design: Lightweight Identity

Rather than implementing a full authentication system, adopt a minimal identity
model appropriate for a developer tool:

```typescript
interface Identity {
  id: string; // e.g., GitHub username or email
  name: string; // Display name
  roles: GovernanceRole[];
  source: 'git-config' | 'env' | 'config-file';
}
```

**Identity resolution order**:

1. `SDLC_USER` environment variable
2. `git config user.name` + `git config user.email`
3. `.sdlc-identity.json` in workspace root
4. Default: `{ id: 'system', name: 'System', roles: ['DEVELOPER'] }`

**No authentication**: This is a developer tool, not a SaaS platform. Identity
is used for attribution and role binding, not access control. Trust is local.

**Team roster** (optional):

```json
// .sdlc-team.json
{
  "members": [
    {
      "id": "jane@example.com",
      "name": "Jane",
      "roles": ["ARCHITECT", "DEVELOPER"]
    },
    {
      "id": "bob@example.com",
      "name": "Bob",
      "roles": ["QA_ENGINEER", "SECURITY_REVIEWER"]
    }
  ]
}
```

When a team roster exists, the governance engine can validate that approvals
come from users with the correct roles.

---

## Approval Workflows

### Workflow 1: Automated Phase Gate Approval

For phases validated by AI agents (Phases 1-4), the approval workflow is:

```
Critic validates deliverable →
  All contract checks pass? →
    YES → Check governance mode:
      OFF:       Advance immediately
      ADVISORY:  Log "would require approval from [ROLES]", advance
      ENFORCING: Create ApprovalRequest, pause workflow
    NO → Return to phase for rework (regardless of governance mode)
```

In ENFORCING mode, the workflow pauses and emits an SSE event:

```json
{
  "event": "approval_required",
  "gate": "CRITIC_2",
  "required_roles": ["ARCHITECT", "QA_ENGINEER"],
  "artifact": "P2-SA-analysis",
  "approval_request_id": "AR-001"
}
```

### Workflow 2: Sprint Gate Approval

Sprint gates already check DoR, velocity, and blockers. Add governance:

```
Sprint gate check →
  DoR met + capacity OK + no blockers →
    Governance mode check:
      OFF/ADVISORY: Proceed to sprint
      ENFORCING:    Require PRODUCT_OWNER + ARCHITECT approval
```

### Workflow 3: Production Deployment Approval

The highest-rigor approval:

```
Deployment to production requested →
  ENFORCING mode:
    Require 3 approvals:
      RELEASE_MANAGER (mandatory)
      DEVOPS_ENGINEER (mandatory)
      PRODUCT_OWNER (mandatory)
    All security scans must pass
    All tests must pass
    Rollback plan documented
  ADVISORY mode:
    Log requirements, proceed with warning
```

### Approval Resolution

```typescript
async function resolveApproval(
  request: ApprovalRequest,
  policy: ApprovalPolicy
): Promise<ApprovalDecision> {
  // Check if auto-approve conditions are met
  if (policy.auto_approve_when && evaluateCondition(policy.auto_approve_when)) {
    return { decision: 'AUTO_APPROVED', reason: policy.auto_approve_when };
  }

  // Check if timeout has expired
  if (policy.timeout_hours && hasExpired(request, policy.timeout_hours)) {
    return { decision: 'EXPIRED', reason: 'Approval timeout exceeded' };
  }

  // Count approvals by required roles
  const approvals = request.approvals.filter((a) => a.decision === 'APPROVED');
  const requiredRoles = policy.required_roles;
  const metRoles = requiredRoles.filter((role) =>
    approvals.some((a) => hasRole(a.approved_by, role))
  );

  if (metRoles.length >= policy.required_approvals) {
    return { decision: 'APPROVED', approvals };
  }

  return {
    decision: 'PENDING',
    missing_roles: requiredRoles.filter((r) => !metRoles.includes(r)),
  };
}
```

---

## Approval Interfaces

### CLI Approval

```bash
# List pending approvals
sdlc approvals list

# Approve a request
sdlc approvals approve AR-001 --as jane@example.com

# Reject with reason
sdlc approvals reject AR-001 --as bob@example.com --reason "Architecture violates constraint X"
```

### HTTP API

```
GET  /api/v1/approvals                    → List pending approvals
GET  /api/v1/approvals/:id                → Get approval details
POST /api/v1/approvals/:id/approve        → Approve (body: { user_id, comment? })
POST /api/v1/approvals/:id/reject         → Reject (body: { user_id, reason })
```

### MCP Tools

```json
[
  {
    "name": "governance_list_pending",
    "description": "List pending approval requests",
    "parameters": {}
  },
  {
    "name": "governance_approve",
    "description": "Approve a pending request",
    "parameters": {
      "request_id": "string",
      "user_id": "string",
      "comment": "string?"
    }
  },
  {
    "name": "governance_reject",
    "description": "Reject a pending request",
    "parameters": {
      "request_id": "string",
      "user_id": "string",
      "reason": "string"
    }
  }
]
```

### Web UI

A new governance dashboard page in the React SPA:

- Pending approvals list with role requirements
- Approval/rejection buttons with comment fields
- Approval history timeline
- Policy compliance summary per phase

---

## Policy-as-Code

### Move Policies to Configuration

Replace `DEFAULT_POLICIES` array with a JSON file loadable by TemplateLoader:

```json
// templates/sdlc/governance-policies.json
{
  "policies": [
    {
      "gate": "REQUIREMENT_TO_DESIGN",
      "from_stage": "REQUIREMENT",
      "to_stage": "DESIGN",
      "required_approvals": 1,
      "required_roles": ["ARCHITECT"],
      "timeout_hours": 48,
      "auto_approve_when": null,
      "escalation": {
        "after_hours": 24,
        "escalate_to": ["PRODUCT_OWNER"]
      }
    }
  ]
}
```

### Custom Policy Support

Template packs can override policies:

1. Default policies loaded from `templates/sdlc/governance-policies.json`
2. Project-specific overrides from `.sdlc-policies.json` in workspace root
3. Merge strategy: project-specific policies override defaults by `gate` key

### Policy Validation

Policies are validated against a JSON Schema:

- `required_roles` must be valid `GovernanceRole` values
- `required_approvals` must be >= 0 and <= `required_roles.length`
- `timeout_hours` must be positive
- Escalation roles must be valid

---

## Compliance Audit Trail

### Audit Events

Every governance action produces an audit entry:

| Event Type                | Trigger                          | Data                              |
| ------------------------- | -------------------------------- | --------------------------------- |
| `APPROVAL_REQUESTED`      | Workflow reaches governance gate | Gate, artifact, required roles    |
| `APPROVAL_GRANTED`        | User approves                    | User ID, role, timestamp          |
| `APPROVAL_REJECTED`       | User rejects                     | User ID, role, reason             |
| `APPROVAL_AUTO_GRANTED`   | Auto-approve condition met       | Condition, policy reference       |
| `APPROVAL_EXPIRED`        | Timeout exceeded                 | Request ID, timeout duration      |
| `APPROVAL_ESCALATED`      | Escalation triggered             | Original roles, escalation target |
| `GOVERNANCE_MODE_CHANGED` | Admin changes governance mode    | Old mode, new mode, changed by    |
| `POLICY_UPDATED`          | Policy file changed              | Changed policies, diff summary    |

### Compliance Report

Periodic compliance report (generated at sprint boundary):

```markdown
## Governance Compliance Report — Sprint SP-3

### Approval Statistics

- Total approval requests: 12
- Approved: 10
- Rejected: 1 (rework required)
- Auto-approved: 1
- Pending: 0

### Policy Adherence

- All production deployments had 3 approvals: YES
- All security reviews completed before staging: YES
- Average approval turnaround: 4.2 hours

### Escalations

- 0 escalations triggered

### Violations

- 0 policy violations detected
```

---

## Decision Integration

### Existing Decision System

The system already has a decision tracking mechanism:

- `BusinessDocs/decisions.md` with structured decision records
- Decision API routes in the webapp
- Decision categories in manifest (20 categories)
- MCP tools for decision management

### Governance ↔ Decision Connection

When a governance rejection includes a structural recommendation, it should
automatically create a decision record:

```
Rejection: "Architecture violates Azure cost constraint"
  → Auto-create decision record:
    Category: ARCHITECTURE
    Status: PROPOSED
    Context: Governance rejection at CRITIC_2 gate
    Options: [restructure, accept risk, seek exception]
```

This connects governance decisions to the existing decision tracking system,
providing full traceability from rejection to resolution.

---

## Implementation Priority

| Component                    | Priority | Dependency            | Effort |
| ---------------------------- | -------- | --------------------- | ------ |
| Governance mode config       | P0       | None                  | Small  |
| Gate integration (advisory)  | P0       | Mode config           | Small  |
| Lightweight identity         | P1       | None                  | Small  |
| Approval persistence         | P1       | Identity              | Small  |
| Gate integration (enforcing) | P1       | Approval persistence  | Medium |
| CLI approval commands        | P1       | Enforcing integration | Small  |
| HTTP approval API            | P2       | Enforcing integration | Small  |
| MCP approval tools           | P2       | HTTP API              | Small  |
| Web UI dashboard             | P2       | HTTP API              | Medium |
| Policy-as-code               | P2       | None                  | Small  |
| Compliance reporting         | P3       | All above             | Medium |

**Phase 1 deliverable** (P0 items): Governance mode switch + advisory logging.
This gives teams visibility into what governance would require without blocking
any workflows. ~50 lines of code in `gate-validator.ts` + `engine.ts`.
