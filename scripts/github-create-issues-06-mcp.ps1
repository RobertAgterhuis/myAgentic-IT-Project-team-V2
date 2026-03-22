#!/usr/bin/env pwsh
# Part 2A: Domain 06 - MCP Plugin Architecture epics + issues

$repo  = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{
        title     = $title
        body      = $body
        labels    = $labels
        milestone = $msNum
    } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}

  # Milestone numbers
  $ms99  = 99
  $ms104 = 104
  $ms108 = 108
  $ms111 = 111
  $ms113 = 113

  Write-Host "`n=== Domain 06: MCP Plugin Architecture ===" -ForegroundColor Magenta

# ─────────────────────────────────────────────────────
# MILESTONE M-INFRA-1a (Plugin Core)
# ─────────────────────────────────────────────────────
Write-Host "`n-- M-INFRA-1a Phase 1: Plugin Core --"

Write-Host "`n  Epic 1.1: Plugin Package Structure"
$e11 = New-Issue "Epic: MCP Plugin Package Structure" @"
## Epic 1.1 — Plugin Package Structure
**Milestone:** M-INFRA-1a — Plugin Core & Agent Catalog
**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)

Create the foundational plugin package under `src/webapp/plugins/mcp-governance/` with four factory functions and the CLI scaffold. All other MCP governance work builds on this epic.

### Issues in this epic
- [ ] Plugin package structure and factory functions
- [ ] .generated/ output directory with compiled artifacts
- [ ] CLI `init` command
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms99

$i_111 = New-Issue "MCP-1.1.1 — Plugin package structure and factory functions" @"
**Epic:** #$e11
**Milestone:** M-INFRA-1a

Create plugin package at `src/webapp/plugins/mcp-governance/` with:
- `defineAgents()` factory
- `defineMcpServers()` factory
- `definePolicies()` factory
- `defineEnvironmentPolicies()` factory
- All return typed objects that feed into the compile/reconcile pipeline

**Acceptance criteria:**
- TypeScript compiles with no errors
- Test instantiation of all four factories with sample data passes
- No side effects at import time

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_112 = New-Issue "MCP-1.1.2 — .generated/ output directory with compiled artifacts" @"
**Epic:** #$e11
**Milestone:** M-INFRA-1a

Create output contract for compiled artifacts:
- `.generated/compiled-policies.json`
- `.generated/mcp-registry.json`
- `.generated/runtime-manifests/{agentId}.json`

The `runtime build` CLI command must produce all three. Add `.generated/` to `.gitignore`.

**Acceptance criteria:**
- Running `npx plugin runtime build` generates all three artifact paths
- `.generated/` is excluded from git

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_113 = New-Issue "MCP-1.1.3 — CLI `init` command" @"
**Epic:** #$e11
**Milestone:** M-INFRA-1a

Implement `npx my-plugin init` CLI command that:
- Generates default config scaffold: agent catalog template, empty server registry, example policies
- Creates folder structure under `src/webapp/plugins/mcp-governance/config/`
- Is idempotent (does not overwrite existing files)

**Acceptance criteria:**
- Running `init` on a clean directory creates expected files
- Running `init` a second time does not overwrite existing config

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

Write-Host "`n  Epic 1.2: Agent Catalog Schema"
$e12 = New-Issue "Epic: MCP Agent Catalog Schema" @"
## Epic 1.2 — Agent Catalog Schema
**Milestone:** M-INFRA-1a — Plugin Core & Agent Catalog
**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)

Define and persist the canonical 12-agent catalog with role categories, control postures, and workload identity references.

### Issues in this epic
- [ ] AgentType schema + DB migration
- [ ] Seed 12 agent types via bootstrap
- [ ] GET /api/v1/mcp/agents endpoint
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms99

$i_121 = New-Issue "MCP-1.2.1 — AgentType schema and DB migration" @"
**Epic:** #$e12
**Milestone:** M-INFRA-1a

Define `AgentType` TypeScript type and DB schema:
- `id` (e.g., 'orchestrator', 'infra')
- `category` (e.g., 'planner', 'platform-operator')
- `controlPosture` (e.g., 'discover-read-only', 'high-risk-approval-gated')
- `requiresWorkloadIdentity: boolean`
- `appRegistrationRef?: string`
- `templateCategory: string`

Create SQLite migration for `agent_types` table.

**Acceptance criteria:**
- TypeScript types exported from plugin package
- DB migration runs clean on fresh DB
- JSON schema generated for validation

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_122 = New-Issue "MCP-1.2.2 — Seed 12 agent types via bootstrap command" @"
**Epic:** #$e12
**Milestone:** M-INFRA-1a

Create seed data for all 12 agents from the mapping document:
orchestrator, product, architect, developer, ui, qa, devops, infra, security, data, documentation, sre

Wire into `npx plugin bootstrap --apply` command. Must be idempotent.

**Acceptance criteria:**
- `agents sync` idempotently applies the 12-agent catalog
- Re-running does not create duplicates
- `GET /api/v1/mcp/agents` returns all 12 after seeding

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_123 = New-Issue "MCP-1.2.3 — GET /api/v1/mcp/agents endpoint" @"
**Epic:** #$e12
**Milestone:** M-INFRA-1a

Add REST endpoint returning the full agent catalog with template assignments and control postures.

**Route:** `GET /api/v1/mcp/agents`
**Auth:** operator or admin role required
**Response:** Array of AgentType objects

**Acceptance criteria:**
- Returns all 12 agents after bootstrap
- Auth-protected (401 without session)
- Response matches TypeScript AgentType schema

**Effort:** S (1 day)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

Write-Host "`n  Epic 1.3: MCP Server Registry"
$e13 = New-Issue "Epic: MCP Server Registry" @"
## Epic 1.3 — MCP Server Registry
**Milestone:** M-INFRA-1a — Plugin Core & Agent Catalog
**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)

Implement the server registry: schema, health monitor, sync CLI, and API endpoint.

### Issues in this epic
- [ ] McpServerRegistry schema + CRUD service
- [ ] Health monitor (ping interval)
- [ ] `mcp sync` CLI command
- [ ] GET /api/v1/mcp/servers endpoint
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms99

$i_131 = New-Issue "MCP-1.3.1 — McpServerRegistry schema and CRUD service" @"
**Epic:** #$e13
**Milestone:** M-INFRA-1a

Define `McpServerRegistry` schema:
- `id` (e.g., 'azure', 'github')
- `endpoint: string`
- `risk: 'low' | 'medium' | 'high'`
- `authType: 'entra' | 'oauth' | 'apikey' | 'none'`
- `healthStatus: 'healthy' | 'degraded' | 'unhealthy'`
- `tenantEnabled: boolean`
- `workspaceEnabled: boolean`
- `lastHealthCheck: timestamp`

Create `McpServerRegistryService` with CRUD methods.

**Acceptance criteria:**
- DB migration runs clean
- CRUD service unit-tested

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_132 = New-Issue "MCP-1.3.2 — Health monitor with configurable ping interval" @"
**Epic:** #$e13
**Milestone:** M-INFRA-1a

Implement health monitor that pings each registered server at configurable interval (default 30s):
- Uses HTTP GET to server health endpoint or MCP handshake
- Updates `health_status` in DB on result
- Configurable failure threshold before marking `unhealthy` (default: 3 consecutive failures)

**Acceptance criteria:**
- Unhealthy server status reflected in registry within 60s of failure
- Health check errors do not crash the platform process
- Interval configurable via env var `MCP_HEALTH_INTERVAL_MS`

**Effort:** M (2 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms99

$i_133 = New-Issue "MCP-1.3.3 — `mcp sync` CLI command" @"
**Epic:** #$e13
**Milestone:** M-INFRA-1a

Implement `npx plugin mcp sync` command that:
- Reads server definitions from code (`defineMcpServers()`)
- Diffs against current DB registry state
- Applies upserts (adds new, updates changed, does NOT delete absent)

**Acceptance criteria:**
- Adding a new server definition in code triggers registry upsert on next sync
- Dry-run mode (`--dry-run`) shows diff without applying
- Sync result logged to console with counts (added/updated/unchanged)

**Effort:** M (2-3 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms99

$i_134 = New-Issue "MCP-1.3.4 — GET /api/v1/mcp/servers endpoint" @"
**Epic:** #$e13
**Milestone:** M-INFRA-1a

Add REST endpoint returning the full server registry with health, auth type, and enablement status.

**Route:** `GET /api/v1/mcp/servers`
**Auth:** operator or admin role required
**Response:** Array of McpServerRegistry objects including current health status

**Acceptance criteria:**
- Reflects live health status inline
- Auth-protected
- Returns empty array (not 404) when no servers registered yet

**Effort:** S (1 day)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms99

# ─────────────────────────────────────────────────────
# MILESTONE M-INFRA-3a (Policy Plane)
# ─────────────────────────────────────────────────────
Write-Host "`n-- M-INFRA-3a Phase 2: Policy Plane --"

Write-Host "`n  Epic 2.1: Server-Level RBAC"
$e21 = New-Issue "Epic: Server-Level RBAC (AgentServerPolicy)" @"
## Epic 2.1 — Server-Level RBAC
**Milestone:** M-INFRA-3a — Policy Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)

Implement the 12×8 agent-server permission matrix as DB-backed policy records with a compile-and-sync pipeline.

### Issues in this epic
- [ ] AgentServerPolicy schema + migration
- [ ] `policy sync` CLI command
- [ ] PolicyService.resolveServerPermission()
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms104

$i_211 = New-Issue "MCP-2.1.1 — AgentServerPolicy schema and DB migration" @"
**Epic:** #$e21
**Milestone:** M-INFRA-3a

Create `agent_server_policies` table:
- `agent_id: string FK → agent_types.id`
- `server_id: string FK → mcp_server_registry.id`
- `permissions: string[]` (e.g., ['R', 'P', 'W'])
- `environment_rules: JSON` (`{dev: 'W', test: 'W', prod: 'A'}`)

Permissions enum: N (none), D (discover), R (read), P (propose), W (write), A (approval required), X (blocked)

**Acceptance criteria:**
- DB migration runs clean
- 12×8 = 96 policy rows fit without conflicts
- TypeScript types exported

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

$i_212 = New-Issue "MCP-2.1.2 — `policy sync` CLI command" @"
**Epic:** #$e21
**Milestone:** M-INFRA-3a

Implement `npx plugin policy sync` that compiles `definePolicies()` definitions into `agent_server_policies` table.

**Acceptance criteria:**
- Dry-run shows correct diff (added/changed/unchanged rows)
- Apply upserts all rows correctly
- After sync, full RBAC matrix is queryable via PolicyService

**Effort:** M (2-3 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

$i_213 = New-Issue "MCP-2.1.3 — PolicyService.resolveServerPermission()" @"
**Epic:** #$e21
**Milestone:** M-INFRA-3a

Implement `PolicyService.resolveServerPermission(agentId, serverId, environment)` that returns effective permission level for a given combination.

**Acceptance criteria:**
- Unit tests cover all 12×8×3 permutation combinations (288 cases)
- Returns 'N' (none) for any unknown agent/server combination (default deny)
- Environment rule overrides base permission when more restrictive

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

Write-Host "`n  Epic 2.2: Tool-Level Overrides"
$e22 = New-Issue "Epic: Tool-Level Permission Overrides (AgentToolPolicy)" @"
## Epic 2.2 — Tool-Level Permission Overrides
**Milestone:** M-INFRA-3a — Policy Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)

Implement per-tool policy overrides that can block or restrict individual tools within a server, overriding the server-level policy.

### Issues in this epic
- [ ] AgentToolPolicy schema + migration
- [ ] PolicyService.resolveToolPermission() with override logic
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms104

$i_221 = New-Issue "MCP-2.2.1 — AgentToolPolicy schema and DB migration" @"
**Epic:** #$e22
**Milestone:** M-INFRA-3a

Create `agent_tool_policies` table:
- `agent_id, server_id, tool_id` (composite key)
- `override_mode: 'allow' | 'block' | 'approval_required'`
- `blocked: boolean`

**Acceptance criteria:**
- Migration runs clean
- Tool-level block for `delete_resource` tool on Orchestrator agent insertable

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

$i_222 = New-Issue "MCP-2.2.2 — PolicyService.resolveToolPermission() with override logic" @"
**Epic:** #$e22
**Milestone:** M-INFRA-3a

Implement `PolicyService.resolveToolPermission(agentId, serverId, toolId, environment)`.

**Rule:** Tool-level policy overrides server-level (more restrictive wins).

**Acceptance criteria:**
- `delete_resource` tool forced to `blocked` for Orchestrator even if server policy allows R
- Missing tool policy falls through to server policy
- Unit tests for override precedence

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

Write-Host "`n  Epic 2.3: Environment Scope Rules"
$e23 = New-Issue "Epic: Environment Scope Rules Enforcement" @"
## Epic 2.3 — Environment Scope Rules
**Milestone:** M-INFRA-3a — Policy Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)

Enforce production/test/dev environment rules: prod defaults to read-only, write requires approval_required, destructive requires two_step.

### Issues in this epic
- [ ] Environment rule enforcement (prod write triggers approval)
- [ ] ENV_SCOPE header validation on all tool invocations
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms104

$i_231 = New-Issue "MCP-2.3.1 — Environment rule enforcement for prod write/destructive" @"
**Epic:** #$e23
**Milestone:** M-INFRA-3a

Implement environment rule enforcement from `defineEnvironmentPolicies()`:
- `prod` default mode: read-only
- Write in prod: escalates to `approval_required`
- Destructive in prod: escalates to `two_step`

**Acceptance criteria:**
- Write operation to `prod` scope automatically creates an approval request
- Destructive ops in prod require two-step confirmation
- Dev/test environments allow write without approval (as configured)

**Effort:** M (2-3 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

$i_232 = New-Issue "MCP-2.3.2 — ENV_SCOPE validation on all tool invocations" @"
**Epic:** #$e23
**Milestone:** M-INFRA-3a

Add `ENV_SCOPE` (dev/test/prod) to every tool invocation request and validate in enforcement layer.

**Acceptance criteria:**
- Missing `env_scope` on tool call returns 400
- Incorrect/unauthorized scope returns 403
- Scope injected via MCP session context, not per-call parameter

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms104

# ─────────────────────────────────────────────────────
# MILESTONE M-INFRA-3b (Runtime Plane)
# ─────────────────────────────────────────────────────
Write-Host "`n-- M-INFRA-3b Phase 3: Runtime Plane --"

Write-Host "`n  Epic 3.1: Runtime Manifest Generator"
$e31 = New-Issue "Epic: Runtime Manifest Generator" @"
## Epic 3.1 — Runtime Manifest Generator
**Milestone:** M-INFRA-3b — Runtime Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)

Generate per-agent runtime manifests from compiled policy + health + auth state. These are the single source of truth for what each agent can do.

### Issues in this epic
- [ ] `runtime build` CLI + manifest generation
- [ ] Health/auth state reflected in manifests
- [ ] Manifest auto-rebuild at end of reconcile
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms108

$i_311 = New-Issue "MCP-3.1.1 — `runtime build` CLI and per-agent manifest generation" @"
**Epic:** #$e31
**Milestone:** M-INFRA-3b

Implement `npx plugin runtime build` that generates:
```json
{
  "agentId": "infra",
  "generatedAt": "2026-03-22T...",
  "servers": [
    {
      "serverId": "azure",
      "tools": [
        { "toolId": "list_resources", "permissionLevel": "R", "approvalMode": "auto", "blocked": false }
      ]
    }
  ]
}
```
Output to `.generated/runtime-manifests/{agentId}.json`

**Acceptance criteria:**
- 12 manifest files generated (one per agent)
- Each reflects effective policy from `agent_server_policies` + `agent_tool_policies`
- Build fails with clear error if policy data is missing

**Effort:** L (3-4 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms108

$i_312 = New-Issue "MCP-3.1.2 — Health and auth state included in runtime manifests" @"
**Epic:** #$e31
**Milestone:** M-INFRA-3b

Integrate server health and auth state into manifest generation:
- Unhealthy server tools marked `degraded: true`
- Auth-not-ready server tools marked `authStatus: 'auth_pending'`
- Blocked tools omitted from agent views (not just flagged)

**Acceptance criteria:**
- Manifest reflects live health within one reconcile cycle
- `degraded` and `auth_pending` statuses render correctly in Experience plane

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms108

$i_313 = New-Issue "MCP-3.1.3 — Manifest rebuild trigger at end of reconcile" @"
**Epic:** #$e31
**Milestone:** M-INFRA-3b

Ensure `reconcile --apply` always rebuilds all manifests as its final step.

**Acceptance criteria:**
- `reconcile --apply` automatically calls `runtime build` after applying changes
- Manifest timestamps updated after every reconcile run

**Effort:** S (1 day)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms108

Write-Host "`n  Epic 3.2: Tools/List Filtering"
$e32 = New-Issue "Epic: Per-agent tools/list Filtering" @"
## Epic 3.2 — Per-agent tools/list Filtering
**Milestone:** M-INFRA-3b — Runtime Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)

Override the MCP `tools/list` response to return only the tools each agent is permitted to see, with permission annotations.

### Issues in this epic
- [ ] Per-agent tools/list filtering from runtime manifest
- [ ] Permission annotation on each returned tool
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms108

$i_321 = New-Issue "MCP-3.2.1 — Per-agent tools/list filtering" @"
**Epic:** #$e32
**Milestone:** M-INFRA-3b

Override `tools/list` MCP response handler to:
1. Resolve calling agent identity from session
2. Load agent's runtime manifest
3. Return only tools that are not `blocked` and not `degraded`
4. Filter out tools from unhealthy servers

**Acceptance criteria:**
- Orchestrator's `tools/list` does NOT include infra-only tools
- Developer does NOT see SQL schema-write tools
- Admin call returns full unfiltered list for debugging

**Effort:** L (3 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms108

$i_322 = New-Issue "MCP-3.2.2 — Permission annotation on returned tools in tools/list" @"
**Epic:** #$e32
**Milestone:** M-INFRA-3b

Annotate each tool in `tools/list` response with effective permissions:
```json
{ "name": "deploy_resource", "permissionLevel": "W", "approvalRequired": true, "blocked": false }
```

**Acceptance criteria:**
- Agent can inspect its own effective permissions from the tools/list response
- Blocked tools not present in the list (not just flagged)
- Annotation matches runtime manifest data

**Effort:** M (2 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms108

Write-Host "`n  Epic 3.3: ToolExecutionGuard Enforcement Layer"
$e33 = New-Issue "Epic: ToolExecutionGuard Enforcement Layer" @"
## Epic 3.3 — ToolExecutionGuard Enforcement Layer
**Milestone:** M-INFRA-3b — Runtime Plane
**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)

Implement the enforcement layer that validates every tool call against the agent's runtime manifest before dispatch.

### Issues in this epic
- [ ] ToolExecutionGuard middleware
- [ ] Integrate guard in mcp-server.ts
- [ ] approval_required flow with ApprovalRequest creation
"@ @("epic","domain:mcp","P0-critical","enhancement") $ms108

$i_331 = New-Issue "MCP-3.3.1 — ToolExecutionGuard middleware" @"
**Epic:** #$e33
**Milestone:** M-INFRA-3b

Implement `ToolExecutionGuard` that validates every tool call:
1. Agent identity resolved from session
2. Tool visible in agent manifest
3. Permission level sufficient for operation type
4. Environment scope allows this operation
5. Approval policy satisfied (if `approval_required`, check pending approval)

On failure returns structured response:
```json
{ "blocked": true, "reason": "INSUFFICIENT_PERMISSION", "requiredApprovalMode": "approval_required" }
```

**Acceptance criteria:**
- Unauthorized tool call returns structured blocked response (not unhandled error)
- Performance: guard adds < 5ms overhead per call (manifest cached in Redis)
- 100% of tool calls go through the guard

**Effort:** L (4 days)
"@ @("domain:mcp","P0-critical","enhancement","tech","security") $ms108

$i_332 = New-Issue "MCP-3.3.2 — Integrate ToolExecutionGuard into mcp-server.ts" @"
**Epic:** #$e33
**Milestone:** M-INFRA-3b

Wire `ToolExecutionGuard` into tool dispatch in `src/webapp/mcp-server.ts`.

**Acceptance criteria:**
- All existing tool calls still pass (no regression)
- Policy-blocked calls return correct structured error
- Guard applied before any tool handler executes

**Effort:** M (2 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms108

$i_333 = New-Issue "MCP-3.3.3 — approval_required flow: auto-create ApprovalRequest" @"
**Epic:** #$e33
**Milestone:** M-INFRA-3b

When a tool call hits `approval_required` policy:
1. Auto-create `ApprovalRequest` record in DB
2. Return `{ pending: true, approvalId: '...' }` to caller
3. Notify designated reviewer via SSE event
4. Tool executes only after approval record is marked approved

**Acceptance criteria:**
- DevOps agent prod write creates an approval request with correct metadata
- Approval by admin unblocks the pending tool execution
- Expired approvals (configurable TTL) auto-reject

**Effort:** L (3-4 days)
"@ @("domain:mcp","P0-critical","enhancement","tech") $ms108

# ─────────────────────────────────────────────────────
# MILESTONE M-INFRA-3c (Experience Plane)
# ─────────────────────────────────────────────────────
Write-Host "`n-- M-INFRA-3c Phase 4: Experience Plane --"

Write-Host "`n  Epic 4.1: Experience Plane UI"
$e41 = New-Issue "Epic: MCP Experience Plane UI" @"
## Epic 4.1 — Experience Plane UI
**Milestone:** M-INFRA-3c — Experience Plane & Reconcile Loop
**Domain:** MCP Plugin Architecture (Domain 06, Phase 4)

Build the admin UI for viewing and managing the full MCP permission state.

### Issues in this epic
- [ ] Agent Permission Matrix page
- [ ] Agent View per agent
- [ ] Override Console page
- [ ] MCP Diagnostics page
"@ @("epic","domain:mcp","P1-high","enhancement") $ms111

$i_411 = New-Issue "MCP-4.1.1 — Agent Permission Matrix page (/admin/mcp/matrix)" @"
**Epic:** #$e41
**Milestone:** M-INFRA-3c

Build full-page matrix view showing all 12 agents × all registered servers × tool categories with permission levels and approval modes.

**UI route:** `/admin/mcp/matrix`

**Acceptance criteria:**
- Renders all agents and all registered servers
- Permission level shown per cell (N/D/R/P/W/A/X)
- Approval mode indicator (auto/required/two_step/blocked)
- Filterable by agent, server, or permission level

**Effort:** L (3-4 days)
"@ @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

$i_412 = New-Issue "MCP-4.1.2 — Agent View page with effective permissions (/admin/mcp/agents/:id)" @"
**Epic:** #$e41
**Milestone:** M-INFRA-3c

Per-agent view showing which tools are visible, blocked, or require approval — with explanations.

**Acceptance criteria:**
- Shows effective permissions with 'why' (policy rule, environment override, health degraded)
- Shows workload identity status if agent has `requiresWorkloadIdentity: true`
- Accessible by agent ID in URL

**Effort:** M (2-3 days)
"@ @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

$i_413 = New-Issue "MCP-4.1.3 — Override Console page (/admin/mcp/overrides)" @"
**Epic:** #$e41
**Milestone:** M-INFRA-3c

Build time-bound manual override console:
- Create override (agent, server/tool, permission, expiry, justification)
- List active and expired overrides
- Override recorded with: timestamp, expiry, author, justification
- All overrides in audit trail

**Acceptance criteria:**
- Override recorded with all required fields
- Override expires automatically at TTL
- Audit trail shows all overrides including expired ones

**Effort:** M (2-3 days)
"@ @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

$i_414 = New-Issue "MCP-4.1.4 — MCP Diagnostics page (/admin/mcp/diagnostics)" @"
**Epic:** #$e41
**Milestone:** M-INFRA-3c

Single-screen diagnostics view showing:
- All unhealthy servers with last check time and error
- All auth-pending agents with reason
- Consent status summary (requires M-INFRA-2c)
- Manifest validity summary per agent

**Acceptance criteria:**
- All unhealthy servers and auth-pending agents visible in one view
- Status refreshes without page reload (SSE)

**Effort:** M (2-3 days)
"@ @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

Write-Host "`n  Epic 4.2: Reconcile Loop"
$e42 = New-Issue "Epic: Reconcile Loop and Doctor Command" @"
## Epic 4.2 — Reconcile Loop and Doctor Command
**Milestone:** M-INFRA-3c — Experience Plane & Reconcile Loop
**Domain:** MCP Plugin Architecture (Domain 06, Phase 4)

Implement the full reconcile lifecycle (code → diff → plan → apply → audit) and the doctor validation command.

### Issues in this epic
- [ ] `reconcile` command with dry-run and apply modes
- [ ] `reconcile_runs` audit table
- [ ] `doctor` command with 8+ validation checks
"@ @("epic","domain:mcp","P1-high","enhancement") $ms111

$i_421 = New-Issue "MCP-4.2.1 — `reconcile` command (dry-run + apply)" @"
**Epic:** #$e42
**Milestone:** M-INFRA-3c

Implement full `npx plugin reconcile` command:
1. Read code definitions (agents, servers, policies, environments)
2. Diff against current DB state
3. Display plan (added/changed/removed rows)
4. On `--apply`: write changes to DB, rebuild manifests
5. Log result to `reconcile_runs` table

**Acceptance criteria:**
- `--dry-run` shows diff without modifying DB
- `--apply` applies and shows result summary
- Ends with `runtime build` automatically
- Reconcile is always explicit (never runs automatically in background)

**Effort:** L (4 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms111

$i_422 = New-Issue "MCP-4.2.2 — `reconcile_runs` audit table" @"
**Epic:** #$e42
**Milestone:** M-INFRA-3c

Create `reconcile_runs` table:
- `id, ran_at, ran_by, duration_ms, changes_applied: JSON, status: 'success'|'failed'`

**Acceptance criteria:**
- Every `reconcile --apply` creates a row
- Viewable in Experience plane (reconcile history page)
- Failed reconcile records the error detail

**Effort:** S (1 day)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms111

$i_423 = New-Issue "MCP-4.2.3 — `doctor` command with 8 validation checks" @"
**Epic:** #$e42
**Milestone:** M-INFRA-3c

Implement `npx plugin doctor` checking:
1. Config files present and valid JSON/TS
2. DB connectivity
3. All registered servers reachable (health ping)
4. Auth credentials present for all servers requiring auth
5. Policy completeness (no agent without any policy rows)
6. Manifest buildability (dry-run of runtime build)
7. Missing workload identity for agents requiring it
8. Expired/missing consent for Microsoft-backed servers

Output: list of errors and warnings with remediation steps.

**Acceptance criteria:**
- Catches all 8 known misconfiguration scenarios
- Exit code 0 means all clear, 1 means errors found

**Effort:** L (3 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms111

# ─────────────────────────────────────────────────────
# MILESTONE M-INFRA-3d (Workload Identity in MCP)
# ─────────────────────────────────────────────────────
Write-Host "`n-- M-INFRA-3d Phase 5: Workload Identity in MCP Runtime --"

$e5 = New-Issue "Epic: Workload Identity Integration in MCP Runtime" @"
## Epic 5 — Workload Identity Integration in Runtime
**Milestone:** M-INFRA-3d — Workload Identity in MCP Runtime
**Domain:** MCP Plugin Architecture (Domain 06, Phase 5)
**Depends on:** M-INFRA-2c (Agent Workload Identity from Domain 02)

Wire the consent and workload identity state from Domain 02 into the MCP runtime enforcement layer.

### Issues in this epic
- [ ] Wire workload identity in ToolExecutionGuard
- [ ] Workload identity status in runtime manifests
- [ ] Identity checks in doctor command
"@ @("epic","domain:mcp","P1-high","enhancement") $ms113

New-Issue "MCP-5.1 — Wire AgentWorkloadIdentity.effectiveEnabled into ToolExecutionGuard" @"
**Epic:** #$e5
**Milestone:** M-INFRA-3d
**Depends on:** M-INFRA-2c (AgentWorkloadIdentity schema)

Extend `ToolExecutionGuard` to check workload identity state for agents using Microsoft-backed servers:
- If `consentGranted = false`: block with reason `CONSENT_PENDING`
- If `servicePrincipalReady = false`: block with reason `IDENTITY_NOT_PROVISIONED`
- If `credentialPolicyValid = false`: block with reason `CREDENTIAL_POLICY_VIOLATION`

**Acceptance criteria:**
- Agent with `ConsentPending` status cannot execute Microsoft-backed tools
- Correct reason code returned in blocked response

**Effort:** M (2 days)
"@ @("domain:mcp","P1-high","enhancement","tech","security") $ms113

New-Issue "MCP-5.2 — Workload identity status in runtime manifests" @"
**Epic:** #$e5
**Milestone:** M-INFRA-3d

Include workload identity state in manifest for agents where `requiresWorkloadIdentity = true`:
```json
{ "serverId": "azure", "authStatus": "consent_pending", "tools": [] }
```

**Acceptance criteria:**
- Manifest shows `auth_status: 'consent_pending'` for Infra agent in a new tenant
- Experience plane diagnostics page shows consent pending agents

**Effort:** M (2 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms113

New-Issue "MCP-5.3 — Identity checks in `doctor` command" @"
**Epic:** #$e5
**Milestone:** M-INFRA-3d

Add to `doctor` command:
- Missing Entra app registration for agents requiring workload identity
- Pending consent for Microsoft-backed servers
- Expired or expiring credentials (warn if expiring within 30 days)

**Acceptance criteria:**
- `doctor` flags all three identity conditions with remediation steps
- Remediation step includes the correct CLI command to fix the issue

**Effort:** M (2 days)
"@ @("domain:mcp","P1-high","enhancement","tech") $ms113

Write-Host "`nDomain 06 complete!" -ForegroundColor Green
