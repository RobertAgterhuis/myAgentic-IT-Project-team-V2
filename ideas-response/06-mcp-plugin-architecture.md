# Domain 06 — MCP Plugin Architecture

> Source: `ideas/mcp_plugin_architecture_mapping_document.md` + `ideas/mcp_plugin_architecture_addendum_identity_consent.md`  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

---

## 1. Executive Summary

This is the **P0-CRITICAL** domain. Everything else in this analysis depends on this architecture being in place.

The consultant's mapping document defines a complete plugin-driven, remote-first MCP platform with:

- **Four cooperating planes:** Management, Policy, Runtime, Experience
- **Agent-centric RBAC:** each agent has a defined role template, server permissions, tool permissions, environment scope, and approval policy
- **Remote-first MCP server model:** servers are registered, governed, and health-checked; not assumed present
- **Declarative-by-code configuration:** agent definitions, server catalogs, policies — all code-generated; applied via reconcile loop
- **Explicit CLI lifecycle:** `init` → `bootstrap` → `reconcile` → `doctor` → `runtime build`
- **Microsoft Entra workload identity per agent role** (from addendum)

The current platform exposes a basic MCP server (`src/webapp/mcp-server.ts`) with tool handlers but **no RBAC, no per-agent policy, no server registry, no health model, no consent tracking, and no reconcile loop**. This is the deepest structural gap.

---

## 2. Current State Analysis

### What exists today

| Component        | Location                         | Notes                                   |
| ---------------- | -------------------------------- | --------------------------------------- |
| Basic MCP server | `src/webapp/mcp-server.ts`       | Tools exposed; no governance            |
| Rate limiter     | `src/webapp/rate-limiter.ts`     | Basic protection                        |
| Middleware       | `src/webapp/middleware.ts`       | Auth middleware; no agent-scoped checks |
| M2M API policy   | `src/webapp/m2m-api-policy.ts`   | Machine-to-machine policy; partial      |
| Runtime profiles | `src/webapp/runtime-profiles.ts` | Some runtime configuration              |
| Plugin directory | `src/webapp/plugins/`            | Existing plugin structure               |
| Auth / RBAC      | `src/webapp/auth.ts`             | GitHub-only; no agent roles             |

### Critical Gaps

| Gap                             | Severity | Description                                                            |
| ------------------------------- | -------- | ---------------------------------------------------------------------- |
| No MCP server registry          | Critical | Servers assumed present; no catalog, health, or governance             |
| No agent-centric RBAC           | Critical | No per-agent tool permission matrix                                    |
| No policy plane                 | Critical | No compiled policy model; no `auto/approval_required/two_step/blocked` |
| No runtime manifest             | Critical | Tools not resolved per-agent from policy                               |
| No reconcile loop               | Critical | No desired-state diff and apply mechanism                              |
| No per-agent workload identity  | Critical | No Entra app registrations; no consent tracking                        |
| No environment scope model      | High     | Dev/Test/Prod execution rules not enforced                             |
| No approval policy enforcement  | High     | Agent actions not gated by policy mode                                 |
| No bootstrap CLI                | High     | Manual setup required; not reproducible                                |
| No experience plane diagnostics | High     | Operators cannot see why a tool is blocked                             |

---

## 3. Architecture Design

### The Four Planes

```
┌────────────────────────────────────────────────────────────────────┐
│  MANAGEMENT PLANE                                                    │
│  Server Registry — Catalog what exists and what can be used         │
│  Auth Bindings — Credentials per server per environment             │
│  Health Monitor — Per-server health; uptime/latency tracking        │
│  Policy Metadata — Version-controlled policy definitions            │
└────────────────────────────┬───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│  POLICY PLANE                                                         │
│  Agent Types — Role definitions and template categories             │
│  Role Templates — Per-agent default permission sets                 │
│  Server Permissions — Agent × Server × Permission level matrix      │
│  Tool Permissions — Overrides and blocks at individual tool level   │
│  Environment Rules — Dev/Test/Prod execution constraints            │
│  Approval Policies — auto / approval_required / two_step / blocked │
└────────────────────────────┬───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│  RUNTIME PLANE                                                        │
│  Enabled Server Resolution — Project policy + health + auth → set   │
│  Initialize — Per-session capability discovery                      │
│  Tools/List — Filtered per agent and environment                    │
│  Runtime Manifests — Per-agent: visible tools + permission level    │
│  Enforcement Layer — All tool executions validated before dispatch  │
└────────────────────────────┬───────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│  EXPERIENCE PLANE                                                     │
│  Agent Views — Per-agent tool visibility with permission annotation │
│  Permission Matrix — Full Agent × Server × Tool view                │
│  Enablement Console — Tenant/workspace enable-disable with audit     │
│  Overrides Console — Time-bound manual override with audit          │
│  Diagnostics — Why is a tool blocked/degraded/pending approval?     │
│  Approvals — HITL gates for approval_required/two_step actions      │
└────────────────────────────────────────────────────────────────────┘
```

### Effective Enablement Formula

```
effectiveEnabled =
  registryAvailable
  AND tenantEnabled
  AND workspaceEnabled
  AND agentPolicyAllows
  AND authReady
  AND healthOk
  AND (for Microsoft integrations):
    AND servicePrincipalReady
    AND consentGranted
    AND credentialPolicyValid
```

Tool execution additionally requires:

```
toolExecutable =
  effectiveEnabled
  AND permissionSufficient
  AND environmentAllows
  AND approvalSatisfied
```

### Frontend Enablement Model

The platform must expose explicit frontend controls for MCP server enablement. Visibility without control is insufficient for tenant transparency.

There are three distinct enablement layers:

| Layer                | Controlled By                | Scope             | Purpose                                    |
| -------------------- | ---------------------------- | ----------------- | ------------------------------------------ |
| Registry presence    | Platform bootstrap/reconcile | Global            | Server exists in the managed catalog       |
| Tenant enablement    | Admin UI                     | Tenant            | Allow this tenant to use the server at all |
| Workspace enablement | Workspace admin UI           | Workspace/project | Allow this workspace to consume the server |

Required UX behavior:

- Tenant admins can enable or disable a registered MCP server for the tenant.
- Workspace admins can enable or disable a tenant-allowed server for a workspace.
- Disabled servers remain visible in the UI with a clear reason and scope badge; they are not silently hidden.
- Every toggle action requires audit metadata: actor, scope, serverId, previous state, new state, timestamp, justification.
- Workspace enablement cannot override a tenant-level disable.
- Runtime manifests and `tools/list` must reflect enablement changes after reconcile/runtime rebuild.

Required backend API surface:

```typescript
GET   /api/v1/mcp/servers
PATCH /api/v1/mcp/servers/:serverId/tenant-enablement
PATCH /api/v1/mcp/servers/:serverId/workspaces/:workspaceId/enablement
GET   /api/v1/mcp/servers/:serverId/enablement-history
```

Suggested mutation payload:

```typescript
interface McpEnablementUpdate {
  enabled: boolean;
  justification: string;
}
```

### Agent RBAC Matrix (from mapping document)

Permission legend: N = none, D = discover, R = read, P = propose, W = write, A = approval required, X = blocked

| Agent         | Azure | Azure DevOps | GitHub | SQL   | Playwright | Graph/Enterprise | SharePoint |
| ------------- | ----- | ------------ | ------ | ----- | ---------- | ---------------- | ---------- |
| Orchestrator  | D,R   | D,R          | D,R    | D,R   | D,R        | D,R              | D,R        |
| Product       | N     | R,P          | R      | N     | N          | N                | R,W        |
| Architect     | R,P   | R,P          | R      | R,P   | R          | R,P              | R,W        |
| Developer     | R     | R,W          | R,W    | R     | R          | N                | R          |
| UI            | N     | R            | R,W    | N     | R,W        | N                | R          |
| QA            | R     | R,W          | R      | R     | R,W        | N                | R          |
| DevOps        | R,W,A | R,W,A        | R,W    | R     | R          | N                | R          |
| Infra         | R,W,A | R            | R,W    | R     | N          | R                | R          |
| Security      | R,P   | R            | R      | R     | R          | R,P              | R          |
| Data          | R     | R            | R,W    | R,W,A | N          | N                | R          |
| Documentation | N     | R            | R,W    | N     | N          | N                | R,W        |
| SRE/Ops       | R,W,A | R            | R      | R     | N          | R                | R          |

### MCP Server Catalog

| Server                    | Domain                | Risk        | Hosting |
| ------------------------- | --------------------- | ----------- | ------- |
| Azure MCP                 | Infrastructure        | High        | Remote  |
| Azure DevOps MCP          | Delivery              | Medium/High | Remote  |
| GitHub MCP                | Repository            | Medium      | Remote  |
| Microsoft Learn MCP       | Grounding             | Low         | Remote  |
| SQL MCP                   | Data                  | High        | Remote  |
| Playwright MCP            | Experience validation | Medium      | Remote  |
| Graph / Enterprise MCP    | Tenant and identity   | High        | Remote  |
| SharePoint / OneDrive MCP | Documents             | Medium      | Remote  |

### Approval Policy Modes

| Mode                | Meaning                       | Runtime Behavior                                  |
| ------------------- | ----------------------------- | ------------------------------------------------- |
| `auto`              | Execute directly              | No gate; standard audit event emitted             |
| `approval_required` | Human review before execution | Creates approval request; blocks until approved   |
| `two_step`          | Extra confirmation + approval | Double-gate; highest-risk destructive actions     |
| `blocked`           | Never executable in scope     | Omitted from manifest; returns `403` if attempted |

---

## 4. Code-Generated Configuration Model

All policy state **must** be defined declaratively in code and compiled into managed state:

```typescript
// src/webapp/plugins/mcp-config/agents.ts
export const agents = defineAgents({
  orchestrator: {
    category: 'planner',
    controlPosture: 'discover-read-only',
    requiresWorkloadIdentity: false,
  },
  infra: {
    category: 'platform-operator',
    controlPosture: 'high-risk-approval-gated',
    requiresWorkloadIdentity: true,
    appRegistrationRef: 'infra-agent-app',
  },
  // ...
});

// src/webapp/plugins/mcp-config/servers.ts
export const mcpServers = defineMcpServers({
  azure: {
    endpoint: process.env.AZURE_MCP_ENDPOINT,
    risk: 'high',
    authType: 'entra',
    healthCheckIntervalMs: 30_000,
  },
  // ...
});

// src/webapp/plugins/mcp-config/policies.ts
export const policies = definePolicies({
  infra_azure: {
    agent: 'infra',
    server: 'azure',
    permissions: ['R', 'W', 'A'],
    environments: { dev: 'W', test: 'W', prod: 'A' },
  },
  // ...
});

// src/webapp/plugins/mcp-config/environments.ts
export const environments = defineEnvironmentPolicies({
  prod: {
    defaultMode: 'read',
    writeRequires: 'approval_required',
    destructiveRequires: 'two_step',
    allowedAgents: ['devops', 'infra', 'sre'],
  },
});
```

---

## 5. CLI Command Model

```
Package lifecycle:
  npx my-plugin init           → Generate project config, folders, default definitions
  npx my-plugin bootstrap      → Run migrations, seed metadata, apply base policies, build manifests
  npx my-plugin reconcile      → Diff code vs actual state; plan and apply changes; rebuild manifests
  npx my-plugin doctor         → Validate config, DB, auth, endpoints, policy references, manifest buildability
  npx my-plugin agents sync    → Normalize and apply agent catalog changes
  npx my-plugin mcp sync       → Update server metadata, enablement, health-aware registration
  npx my-plugin policy sync    → Compile RBAC, environment, and tool policies into applied records
  npx my-plugin runtime build  → Build per-agent runtime manifests from effective policy + health + auth

Identity lifecycle (from addendum):
  npx my-plugin identity plan          → Compute required Entra app registrations per agent role
  npx my-plugin identity bootstrap     → Create/register Entra identity objects
  npx my-plugin identity consent status → Validate consent, permissions, credential health per agent role
```

### Recommended Operator Flow

```bash
npm install my-platform-plugin
npx my-platform-plugin init
npx my-platform-plugin bootstrap --apply
npx my-platform-plugin doctor
npx my-platform-plugin reconcile --dry-run
npx my-platform-plugin reconcile --apply
npx my-platform-plugin runtime build
# For Microsoft integrations:
npx my-platform-plugin identity plan
npx my-platform-plugin identity bootstrap
npx my-platform-plugin identity consent status
```

---

## 6. Phased Implementation Plan

### Phase 1 — Plugin Core & Agent Catalog (Milestone: M-INFRA-1a)

**Goal:** Plugin skeleton, CLI `init`/`bootstrap`/`doctor`, agent catalog schema, and basic server registry model.

#### Epic 1.1 — Plugin Package Structure

- **Issue 1.1.1** — Create plugin package structure under `src/webapp/plugins/mcp-governance/`
  - `defineAgents()`, `defineMcpServers()`, `definePolicies()`, `defineEnvironmentPolicies()` factory functions
  - Acceptance: TypeScript compiles; test instantiation of all four factories
  - Effort: M (2 days)

- **Issue 1.1.2** — Create `.generated/` output directory: `compiled-policies.json`, `mcp-registry.json`, `runtime-manifests/`
  - Acceptance: `npx plugin runtime build` generates all three artifacts
  - Effort: M (2 days)

- **Issue 1.1.3** — Implement `npx plugin init` CLI command
  - Generates default config scaffold: agent catalog template, empty server registry, example policies
  - Acceptance: running `init` on clean directory creates expected files
  - Effort: M (2 days)

#### Epic 1.2 — Agent Catalog Schema

- **Issue 1.2.1** — Define `AgentType` schema: id, category, controlPosture, template assignments, workload identity ref
  - Acceptance: TypeScript types, JSON schema, and DB migration complete
  - Effort: M (2 days)

- **Issue 1.2.2** — Seed all 12 agent types from mapping document into DB via `bootstrap`
  - Acceptance: `agents sync` idempotently applies the 12-agent catalog
  - Effort: M (2 days)

- **Issue 1.2.3** — Add `GET /api/v1/mcp/agents` endpoint: returns full agent catalog with template assignments
  - Acceptance: returns correct data; auth-protected
  - Effort: S (1 day)

#### Epic 1.3 — MCP Server Registry

- **Issue 1.3.1** — Create `McpServerRegistry` schema: id, endpoint, risk, authType, healthStatus, enabledForTenant, enabledForWorkspace
  - Acceptance: schema migration; CRUD service
  - Effort: M (2 days)

- **Issue 1.3.2** — Implement health monitor: `ping()` per registered server on interval; update `health_status` in DB
  - Acceptance: unhealthy server status reflected in registry within 60s of failure
  - Effort: M (2 days)

- **Issue 1.3.3** — Implement `mcp sync` CLI command: reads server definitions from code; diffs against registry; applies
  - Acceptance: adding a new server definition triggers registry upsert
  - Effort: M (2–3 days)

- **Issue 1.3.4** — Add `GET /api/v1/mcp/servers` endpoint: full registry with health, auth, and enablement status
  - Acceptance: correct data; shows health inline
  - Effort: S (1 day)

- **Issue 1.3.5** — Add MCP enablement mutation endpoints for tenant and workspace scope
  - `PATCH /api/v1/mcp/servers/:serverId/tenant-enablement`
  - `PATCH /api/v1/mcp/servers/:serverId/workspaces/:workspaceId/enablement`
  - Acceptance: writes enablement state with justification and audit event; tenant disable wins over workspace enable
  - Effort: M (2 days)

---

### Phase 2 — Policy Plane (Milestone: M-INFRA-3a)

**Goal:** RBAC matrix compilation, environment scope model, approval policy model.

#### Epic 2.1 — Server-Level RBAC

- **Issue 2.1.1** — Define `AgentServerPolicy` schema: agentId, serverId, permissions[], environmentRules
  - Table: `agent_server_policies`
  - Acceptance: schema migration; 12 × 8 matrix fits in table
  - Effort: M (2 days)

- **Issue 2.1.2** — Implement `policy sync` CLI command: compiles policy definitions from code into `agent_server_policies` table
  - Acceptance: dry-run shows correct diff; apply upserts all rows
  - Effort: M (2–3 days)

- **Issue 2.1.3** — Implement `PolicyService.resolveServerPermission(agentId, serverId, environment)`: returns effective permission level
  - Acceptance: unit tests for all 12 × 8 × 3 permutation combinations
  - Effort: M (2 days)

#### Epic 2.2 — Tool-Level Overrides

- **Issue 2.2.1** — Define `AgentToolPolicy` schema: agentId, serverId, toolId, overrideMode, approvalRequired, blocked
  - Table: `agent_tool_policies`
  - Acceptance: schema migration; baseline policies insertable
  - Effort: M (2 days)

- **Issue 2.2.2** — Implement tool-level policy resolution in `PolicyService.resolveToolPermission()`
  - Tool policy overrides server policy (more restrictive wins)
  - Acceptance: `delete_resource` tool forced to `blocked` for Orchestrator even if server allows `R`
  - Effort: M (2 days)

#### Epic 2.3 — Environment Scope Rules

- **Issue 2.3.1** — Implement environment rule enforcement: `prod` default read-only; write requires `approval_required`
  - Acceptance: write operation to `prod` scope triggers approval request creation
  - Effort: M (2–3 days)

- **Issue 2.3.2** — Add `ENV_SCOPE` to every tool invocation request; validate in enforcement layer
  - Acceptance: missing `env_scope` returns `400`; incorrect scope returns `403`
  - Effort: M (2 days)

---

### Phase 3 — Runtime Plane (Milestone: M-INFRA-3b)

**Goal:** Runtime manifests, tools/list filtering, and enforcement layer.

#### Epic 3.1 — Runtime Manifest Generator

- **Issue 3.1.1** — Implement `npx plugin runtime build` manifest generation
  - Per-agent manifest: `{ agentId, generatedAt, servers: [{serverId, tools: [{toolId, permissionLevel, approvalMode, blocked}]}] }`
  - Output to `.generated/runtime-manifests/{agentId}.json`
  - Acceptance: 12 manifest files generated; each reflects effective policy
  - Effort: L (3–4 days)

- **Issue 3.1.2** — Integrate health and auth state into manifest: unhealthy server tools marked `degraded`; auth-not-ready marked `auth_pending`
  - Acceptance: manifest reflects live health state
  - Effort: M (2 days)

- **Issue 3.1.3** — Add manifest rebuild trigger: reconcile run always ends with `runtime build`
  - Acceptance: `reconcile --apply` automatically rebuilds manifests
  - Effort: S (1 day)

#### Epic 3.2 — Tools/List Filtering

- **Issue 3.2.1** — Override `tools/list` MCP response: filter per agent identity and runtime manifest
  - Acceptance: Orchestrator's `tools/list` does not include Infra tools; Developer does not see SQL schema-write tools
  - Effort: L (3 days)

- **Issue 3.2.2** — Add permission annotation to each returned tool: `{ permissionLevel, approvalRequired, blocked }`
  - Acceptance: agent can inspect its own effective permissions in manifest
  - Effort: M (2 days)

#### Epic 3.3 — Enforcement Layer

- **Issue 3.3.1** — Implement `ToolExecutionGuard` middleware: validates every tool call against runtime manifest before dispatch
  - Checks: agent identity, tool visible, permission sufficient, environment allows, approval satisfied
  - Acceptance: unauthorized tool call returns structured `{ blocked: true, reason, requiredApprovalMode }` response
  - Effort: L (4 days)

- **Issue 3.3.2** — Integrate `ToolExecutionGuard` into `mcp-server.ts` tool dispatch
  - Acceptance: all existing tool calls still pass; new policy-blocked calls return correct error
  - Effort: M (2 days)

- **Issue 3.3.3** — Add `approval_required` flow: blocked tool call auto-creates approval request; returns `{ pending: true, approvalId }`
  - Acceptance: DevOps agent Prod write creates approval request; approval unblocks execution
  - Effort: L (3–4 days)

---

### Phase 4 — Experience Plane & Reconcile Loop (Milestone: M-INFRA-3c)

**Goal:** Admin experience for managing the policy model; full reconcile lifecycle; doctor checks.

#### Epic 4.1 — Experience Plane UI

- **Issue 4.1.1** — **Agent Permission Matrix** page: full Agent × Server × Tool view with permission levels and approval modes
  - Acceptance: matrix renders all 12 agents × all registered servers × tool categories
  - Effort: L (3–4 days)

- **Issue 4.1.2** — **Agent View** page per agent: which tools are visible, blocked, or require approval
  - Acceptance: shows effective permissions with "why" explanations
  - Effort: M (2–3 days)

- **Issue 4.1.3** — **Override Console** page: time-bound manual overrides; audit trail; scope-limited
  - Acceptance: override recorded with timestamp, expiry, author, justification
  - Effort: M (2–3 days)

- **Issue 4.1.4** — **Diagnostics page** (`/admin/mcp/diagnostics`): per-server health, per-agent manifest validity, consent status summary
  - Acceptance: shows all unhealthy servers and auth-pending agents in one view
  - Effort: M (2–3 days)

- **Issue 4.1.5** — **MCP Enablement Console** pages for tenant and workspace scope
  - Tenant admin view: list all registered servers with enable/disable toggle, risk, health, auth readiness, current tenant state
  - Workspace admin view: list tenant-allowed servers with per-workspace toggle and inherited-disable reason
  - Acceptance: operator can clearly see enabled vs disabled state, who changed it, and why
  - Effort: L (3–4 days)

- **Issue 4.1.6** — **Enablement History** panel showing all toggle actions with actor and justification
  - Acceptance: every enable/disable action is visible in chronological order and linked to the server/workspace scope it changed
  - Effort: M (2 days)

#### Epic 4.2 — Reconcile Loop

- **Issue 4.2.1** — Implement full `reconcile` command: read code → diff vs DB → plan changes → display plan → apply with confirmation
  - Acceptance: `--dry-run` shows diff; `--apply` applies and rebuilds manifests
  - Effort: L (4 days)

- **Issue 4.2.2** — Add `reconcile_runs` audit table: timestamp, duration, changes applied, who ran it
  - Acceptance: every reconcile run logged; viewable in Experience plane
  - Effort: S (1 day)

- **Issue 4.2.3** — Implement `doctor` command: validates config files, DB connectivity, server health, auth status, policy completeness, manifest buildability
  - Output: list of errors/warnings with remediation steps
  - Acceptance: `doctor` catches 8 known misconfiguration scenarios
  - Effort: L (3 days)

---

### Phase 5 — Workload Identity Integration (Milestone: M-INFRA-3d)

**Goal:** Per-agent-role Entra workload identity; consent tracking in runtime plane. Depends on Domain 02 Phase 3.

_Issues already defined in Domain 02 Phase 3 (Epic 3.1–3.3). Integration tasks here:_

- **Issue 5.1** — Wire `AgentWorkloadIdentity.effectiveEnabled` into `ToolExecutionGuard`
  - Acceptance: agent with `ConsentPending` status cannot execute Microsoft-backed tools
  - Effort: M (2 days)

- **Issue 5.2** — Include workload identity status in runtime manifests for Microsoft-integrated agents
  - Acceptance: manifest shows `auth_status: 'consent_pending'` for Infra agent in new tenant
  - Effort: M (2 days)

- **Issue 5.3** — Add workload identity to `doctor` checks: missing consent, expiring credentials, missing service principal
  - Acceptance: `doctor` flags all three conditions with remediation guidance
  - Effort: M (2 days)

---

## 7. Milestones

### M-INFRA-1a — Plugin Core

- **Deliverables:** Plugin structure; `defineAgents/Servers/Policies/Environments` factories; agent catalog; server registry; enablement mutation APIs; `init`, `bootstrap` CLI
- **Exit criteria:** 12 agents in catalog; 8 servers in registry; `doctor` runs clean

### M-INFRA-3a — Policy Plane

- **Deliverables:** `AgentServerPolicy` + `AgentToolPolicy` tables; `policy sync`; `PolicyService`; environment scope enforcement
- **Exit criteria:** Full RBAC matrix compiled; Policy diff shows correct changes on update

### M-INFRA-3b — Runtime Plane

- **Deliverables:** Runtime manifests per agent; `tools/list` filtering; `ToolExecutionGuard`; `approval_required` flow
- **Exit criteria:** Tools/list returns agent-specific filtered set; unauthorized call returns structured blocked response

### M-INFRA-3c — Experience Plane & Reconcile

- **Deliverables:** Permission Matrix UI; diagnostics page; override console; enablement console; enablement history; `reconcile` command; `doctor` command
- **Exit criteria:** Admin can see and change MCP enablement state with audit trail; reconcile applies code changes to DB; doctor catches 8 scenarios

### M-INFRA-3d — Workload Identity

- **Deliverables:** Consent state in `ToolExecutionGuard`; workload identity in manifests; identity checks in `doctor`
- **Exit criteria:** Agent blocked when consent missing; doctor flags all identity issues

---

## 8. Design Principles (Non-Negotiable)

1. **Default deny and least privilege** — no permission without explicit grant
2. **Remote-first** — servers assumed remote; local is developer-companion mode only
3. **Agent awareness from runtime manifests** — not from prompt memory or LLM inference
4. **All policy state code-generated** — declarative definitions compiled into DB; no manual DB edits
5. **Bootstrap and reconcile must be explicit, auditable, and repeatable** — no hidden npm install side effects
6. **Production write and destructive actions always require approval** — no exceptions by default
7. **Orchestrator is a planner and router, not a privileged executor** — broad visibility, minimal execution rights

---

## 9. Risks

| Risk                                                          | Likelihood | Impact   | Mitigation                                                                |
| ------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------- |
| RBAC matrix complexity causes inconsistent policy compilation | High       | Critical | Automated policy consistency tests; check all 12×8 permutations in CI     |
| Tool execution guard performance overhead at scale            | Medium     | High     | Manifest caching in Redis; invalidate on reconcile; < 5ms overhead target |
| Reconcile causes unintended policy regressions                | Medium     | Critical | Mandatory dry-run display before apply; reconcile_runs audit table        |
| Agent identity not available at runtime (no session context)  | Medium     | High     | Require agent identity claim in every MCP session header                  |
| Health check false positives cause tool unavailability        | Low        | Medium   | Configurable failure threshold before marking server unhealthy            |

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] Four-plane architecture documented with complete description
- [x] Agent RBAC matrix (12 × 8) documented
- [x] MCP server catalog (8 servers) documented
- [x] Approval policy modes defined
- [x] Code-generated config model with TypeScript examples
- [x] CLI command model (operator flow) documented
- [x] `effectiveEnabled` formula documented
- [x] Workload identity integration with Domain 02 explicitly linked
- [x] Non-negotiable design principles documented
- [x] Phased plan actionable with effort estimates
- [x] Deliverable written to file
