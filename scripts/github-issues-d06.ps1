#!/usr/bin/env pwsh
# Domain 06 - MCP Plugin Architecture: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms99=99; $ms104=104; $ms108=108; $ms111=111; $ms113=113

Write-Host "`n=== Domain 06: MCP Plugin Architecture ===" -ForegroundColor Magenta

# ── M-INFRA-1a ──────────────────────────────────────
Write-Host "`n-- M-INFRA-1a --"
$e11 = New-Issue "Epic: MCP Plugin Package Structure" (B @(
    "## Epic 1.1 - Plugin Package Structure",
    "**Milestone:** M-INFRA-1a",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)",
    "",
    "Create plugin package at src/webapp/plugins/mcp-governance/ with four factory functions.",
    "",
    "### Issues",
    "- [ ] Plugin package structure and factory functions",
    "- [ ] .generated/ output directory with compiled artifacts",
    "- [ ] CLI init command"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms99

New-Issue "MCP-1.1.1 - Plugin package structure and factory functions" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-1a",
    "",
    "Create plugin package at src/webapp/plugins/mcp-governance/ with:",
    "- defineAgents() factory",
    "- defineMcpServers() factory",
    "- definePolicies() factory",
    "- defineEnvironmentPolicies() factory",
    "",
    "**Acceptance criteria:**",
    "- TypeScript compiles with no errors",
    "- Test instantiation of all four factories with sample data passes",
    "- No side effects at import time",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.1.2 - .generated/ output directory with compiled artifacts" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-1a",
    "",
    "Create output contract for compiled artifacts:",
    "- .generated/compiled-policies.json",
    "- .generated/mcp-registry.json",
    "- .generated/runtime-manifests/{agentId}.json",
    "",
    "Add .generated/ to .gitignore.",
    "",
    "**Acceptance criteria:**",
    "- Running 'npx plugin runtime build' generates all three artifact paths",
    "- .generated/ is excluded from git",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.1.3 - CLI init command" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INFRA-1a",
    "",
    "Implement 'npx my-plugin init' CLI command that generates default config scaffold.",
    "Creates folder structure under src/webapp/plugins/mcp-governance/config/",
    "Must be idempotent (does not overwrite existing files).",
    "",
    "**Acceptance criteria:**",
    "- Running init on a clean directory creates expected files",
    "- Running init a second time does not overwrite existing config",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

$e12 = New-Issue "Epic: MCP Agent Catalog Schema" (B @(
    "## Epic 1.2 - Agent Catalog Schema",
    "**Milestone:** M-INFRA-1a",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)",
    "",
    "Define and persist the canonical 12-agent catalog with role categories, control postures, workload identity references.",
    "",
    "### Issues",
    "- [ ] AgentType schema + DB migration",
    "- [ ] Seed 12 agent types via bootstrap",
    "- [ ] GET /api/v1/mcp/agents endpoint"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms99

New-Issue "MCP-1.2.1 - AgentType schema and DB migration" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INFRA-1a",
    "",
    "Define AgentType TypeScript type and DB schema with fields:",
    "id, category, controlPosture, requiresWorkloadIdentity, appRegistrationRef, templateCategory",
    "",
    "Create SQLite migration for agent_types table.",
    "",
    "**Acceptance criteria:**",
    "- TypeScript types exported from plugin package",
    "- DB migration runs clean on fresh DB",
    "- JSON schema generated for validation",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.2.2 - Seed 12 agent types via bootstrap command" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INFRA-1a",
    "",
    "Create seed data for all 12 agents from the mapping document:",
    "orchestrator, product, architect, developer, ui, qa, devops, infra, security, data, documentation, sre",
    "",
    "Wire into 'npx plugin bootstrap --apply'. Must be idempotent.",
    "",
    "**Acceptance criteria:**",
    "- agents sync idempotently applies the 12-agent catalog",
    "- Re-running does not create duplicates",
    "- GET /api/v1/mcp/agents returns all 12 after seeding",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.2.3 - GET /api/v1/mcp/agents endpoint" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INFRA-1a",
    "",
    "Route: GET /api/v1/mcp/agents",
    "Auth: operator or admin role required",
    "Response: Array of AgentType objects",
    "",
    "**Acceptance criteria:**",
    "- Returns all 12 agents after bootstrap",
    "- Auth-protected (401 without session)",
    "- Response matches TypeScript AgentType schema",
    "",
    "**Effort:** S (1 day)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

$e13 = New-Issue "Epic: MCP Server Registry" (B @(
    "## Epic 1.3 - MCP Server Registry",
    "**Milestone:** M-INFRA-1a",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 1)",
    "",
    "Implement the server registry: schema, health monitor, mcp sync CLI, and servers API endpoint.",
    "",
    "### Issues",
    "- [ ] McpServerRegistry schema + CRUD service",
    "- [ ] Health monitor (ping interval)",
    "- [ ] mcp sync CLI command",
    "- [ ] GET /api/v1/mcp/servers endpoint"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms99

New-Issue "MCP-1.3.1 - McpServerRegistry schema and CRUD service" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INFRA-1a",
    "",
    "Define McpServerRegistry schema fields:",
    "id, endpoint, risk (low/medium/high), authType (entra/oauth/apikey/none),",
    "healthStatus (healthy/degraded/unhealthy), tenantEnabled, workspaceEnabled, lastHealthCheck",
    "",
    "Create McpServerRegistryService with CRUD methods.",
    "",
    "**Acceptance criteria:**",
    "- DB migration runs clean",
    "- CRUD service unit-tested",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.3.2 - Health monitor with configurable ping interval" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INFRA-1a",
    "",
    "Implement health monitor that pings each registered server at configurable interval (default 30s).",
    "Updates health_status in DB. Configurable failure threshold (default: 3 consecutive failures).",
    "",
    "**Acceptance criteria:**",
    "- Unhealthy server status reflected in registry within 60s of failure",
    "- Health check errors do not crash the platform process",
    "- Interval configurable via env var MCP_HEALTH_INTERVAL_MS",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms99

New-Issue "MCP-1.3.3 - mcp sync CLI command" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INFRA-1a",
    "",
    "Implement 'npx plugin mcp sync' command that reads server definitions from code (defineMcpServers()),",
    "diffs against current DB registry state, and applies upserts.",
    "",
    "**Acceptance criteria:**",
    "- Adding a new server definition triggers registry upsert on next sync",
    "- Dry-run mode (--dry-run) shows diff without applying",
    "- Sync result logged with counts (added/updated/unchanged)",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms99

New-Issue "MCP-1.3.4 - GET /api/v1/mcp/servers endpoint" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INFRA-1a",
    "",
    "Route: GET /api/v1/mcp/servers",
    "Auth: operator or admin role required",
    "Response: Array of McpServerRegistry objects including current health status",
    "",
    "**Acceptance criteria:**",
    "- Reflects live health status inline",
    "- Auth-protected",
    "- Returns empty array (not 404) when no servers registered",
    "",
    "**Effort:** S (1 day)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms99

# ── M-INFRA-3a ──────────────────────────────────────
Write-Host "`n-- M-INFRA-3a --"

$e21 = New-Issue "Epic: Server-Level RBAC (AgentServerPolicy)" (B @(
    "## Epic 2.1 - Server-Level RBAC",
    "**Milestone:** M-INFRA-3a - Policy Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)",
    "",
    "Implement the 12x8 agent-server permission matrix as DB-backed policy records.",
    "Permissions: N=none, D=discover, R=read, P=propose, W=write, A=approval required, X=blocked",
    "",
    "### Issues",
    "- [ ] AgentServerPolicy schema + DB migration",
    "- [ ] policy sync CLI command",
    "- [ ] PolicyService.resolveServerPermission()"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms104

New-Issue "MCP-2.1.1 - AgentServerPolicy schema and DB migration" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-3a",
    "",
    "Create agent_server_policies table:",
    "- agent_id FK to agent_types.id",
    "- server_id FK to mcp_server_registry.id",
    "- permissions: string[] (e.g., ['R', 'P', 'W'])",
    "- environment_rules: JSON (e.g., {dev: 'W', test: 'W', prod: 'A'})",
    "",
    "**Acceptance criteria:**",
    "- DB migration runs clean",
    "- 12x8 = 96 policy rows fit without conflicts",
    "- TypeScript types exported",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms104

New-Issue "MCP-2.1.2 - policy sync CLI command" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-3a",
    "",
    "Implement 'npx plugin policy sync' that compiles definePolicies() definitions into agent_server_policies table.",
    "",
    "**Acceptance criteria:**",
    "- Dry-run shows correct diff (added/changed/unchanged rows)",
    "- Apply upserts all rows correctly",
    "- After sync, full RBAC matrix is queryable via PolicyService",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms104

New-Issue "MCP-2.1.3 - PolicyService.resolveServerPermission()" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INFRA-3a",
    "",
    "Implement PolicyService.resolveServerPermission(agentId, serverId, environment) returning effective permission level.",
    "Default deny: returns 'N' for any unknown agent/server combination.",
    "Environment rule overrides base permission when more restrictive.",
    "",
    "**Acceptance criteria:**",
    "- Unit tests cover all 12x8x3 permutation combinations (288 cases)",
    "- Returns 'N' for unknown combinations (default deny)",
    "- Environment override correctly restricts base permission",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms104

$e22 = New-Issue "Epic: Tool-Level Permission Overrides (AgentToolPolicy)" (B @(
    "## Epic 2.2 - Tool-Level Permission Overrides",
    "**Milestone:** M-INFRA-3a - Policy Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)",
    "",
    "Implement per-tool policy overrides. Tool policy overrides server policy (more restrictive wins).",
    "",
    "### Issues",
    "- [ ] AgentToolPolicy schema + DB migration",
    "- [ ] PolicyService.resolveToolPermission() with override logic"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms104

New-Issue "MCP-2.2.1 - AgentToolPolicy schema and DB migration" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INFRA-3a",
    "",
    "Create agent_tool_policies table:",
    "- agent_id, server_id, tool_id (composite key)",
    "- override_mode: 'allow' | 'block' | 'approval_required'",
    "- blocked: boolean",
    "",
    "**Acceptance criteria:**",
    "- Migration runs clean",
    "- Tool-level block for delete_resource on Orchestrator agent is insertable and queryable",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms104

New-Issue "MCP-2.2.2 - PolicyService.resolveToolPermission() with override logic" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INFRA-3a",
    "",
    "Implement PolicyService.resolveToolPermission(agentId, serverId, toolId, environment).",
    "Rule: Tool policy overrides server policy. More restrictive wins.",
    "Rule: Missing tool policy falls through to server policy.",
    "",
    "**Acceptance criteria:**",
    "- delete_resource tool forced to 'blocked' for Orchestrator even if server policy allows R",
    "- Missing tool policy falls through correctly",
    "- Unit tests for override precedence scenarios",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms104

$e23 = New-Issue "Epic: Environment Scope Rules Enforcement" (B @(
    "## Epic 2.3 - Environment Scope Rules",
    "**Milestone:** M-INFRA-3a - Policy Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 2)",
    "",
    "Enforce production/test/dev environment rules:",
    "- prod defaults to read-only",
    "- write in prod requires approval_required",
    "- destructive in prod requires two_step",
    "",
    "### Issues",
    "- [ ] Environment rule enforcement (prod write triggers approval)",
    "- [ ] ENV_SCOPE header validation on all tool invocations"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms104

New-Issue "MCP-2.3.1 - Environment rule enforcement for prod write and destructive ops" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-INFRA-3a",
    "",
    "Implement environment rule enforcement from defineEnvironmentPolicies():",
    "- prod default mode: read-only",
    "- Write in prod: escalates to approval_required",
    "- Destructive in prod: escalates to two_step",
    "",
    "**Acceptance criteria:**",
    "- Write operation to prod scope automatically creates an approval request",
    "- Destructive ops in prod require two-step confirmation",
    "- Dev/test environments allow write without approval (as configured)",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P0-critical","enhancement","tech","security") $ms104

New-Issue "MCP-2.3.2 - ENV_SCOPE validation on all tool invocations" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-INFRA-3a",
    "",
    "Add ENV_SCOPE (dev/test/prod) to every tool invocation request and validate in enforcement layer.",
    "Scope injected via MCP session context, not per-call parameter.",
    "",
    "**Acceptance criteria:**",
    "- Missing env_scope on tool call returns 400",
    "- Incorrect or unauthorized scope returns 403",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech","security") $ms104

# ── M-INFRA-3b ──────────────────────────────────────
Write-Host "`n-- M-INFRA-3b --"

$e31 = New-Issue "Epic: Runtime Manifest Generator" (B @(
    "## Epic 3.1 - Runtime Manifest Generator",
    "**Milestone:** M-INFRA-3b - Runtime Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)",
    "",
    "Generate per-agent runtime manifests from compiled policy + health + auth state.",
    "Manifests are the single source of truth for what each agent can do at runtime.",
    "",
    "### Issues",
    "- [ ] runtime build CLI and per-agent manifest generation",
    "- [ ] Health and auth state reflected in manifests",
    "- [ ] Manifest auto-rebuild at end of reconcile"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms108

New-Issue "MCP-3.1.1 - runtime build CLI and per-agent manifest generation" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-3b",
    "",
    "Implement 'npx plugin runtime build' generating .generated/runtime-manifests/{agentId}.json",
    "",
    "Manifest structure: { agentId, generatedAt, servers: [{ serverId, tools: [{ toolId, permissionLevel, approvalMode, blocked }] }] }",
    "",
    "**Acceptance criteria:**",
    "- 12 manifest files generated (one per agent)",
    "- Each reflects effective policy from agent_server_policies + agent_tool_policies",
    "- Build fails with clear error if policy data is missing",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms108

New-Issue "MCP-3.1.2 - Health and auth state included in runtime manifests" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-3b",
    "",
    "Integrate server health and auth state into manifest generation:",
    "- Unhealthy server tools marked degraded: true",
    "- Auth-not-ready server tools marked authStatus: auth_pending",
    "",
    "**Acceptance criteria:**",
    "- Manifest reflects live health within one reconcile cycle",
    "- degraded and auth_pending statuses render correctly in Experience plane UI",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms108

New-Issue "MCP-3.1.3 - Manifest rebuild trigger at end of reconcile" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INFRA-3b",
    "",
    "Ensure 'reconcile --apply' always rebuilds all manifests as its final step.",
    "",
    "**Acceptance criteria:**",
    "- 'reconcile --apply' automatically calls 'runtime build' after applying changes",
    "- Manifest timestamps updated after every reconcile run",
    "",
    "**Effort:** S (1 day)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms108

$e32 = New-Issue "Epic: Per-agent tools/list Filtering" (B @(
    "## Epic 3.2 - Per-agent tools/list Filtering",
    "**Milestone:** M-INFRA-3b - Runtime Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)",
    "",
    "Override the MCP tools/list response to return only the tools each agent is permitted to see.",
    "",
    "### Issues",
    "- [ ] Per-agent tools/list filtering from runtime manifest",
    "- [ ] Permission annotation on each returned tool"
)) @("epic","domain:mcp","P0-critical","enhancement") $ms108

New-Issue "MCP-3.2.1 - Per-agent tools/list filtering" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INFRA-3b",
    "",
    "Override tools/list MCP response handler to resolve agent identity from session,",
    "load agent's runtime manifest, and return only tools that are not blocked and not degraded.",
    "",
    "**Acceptance criteria:**",
    "- Orchestrator's tools/list does NOT include infra-only tools",
    "- Developer does NOT see SQL schema-write tools",
    "- Admin call returns full unfiltered list for debugging",
    "",
    "**Effort:** L (3 days)"
)) @("domain:mcp","P0-critical","enhancement","tech","security") $ms108

New-Issue "MCP-3.2.2 - Permission annotation on returned tools in tools/list" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INFRA-3b",
    "",
    "Annotate each tool in tools/list response: { name, permissionLevel, approvalRequired, blocked }",
    "",
    "**Acceptance criteria:**",
    "- Agent can inspect its own effective permissions from the tools/list response",
    "- Blocked tools not present in the list (not just flagged)",
    "- Annotation matches runtime manifest data",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms108

$e33 = New-Issue "Epic: ToolExecutionGuard Enforcement Layer" (B @(
    "## Epic 3.3 - ToolExecutionGuard Enforcement Layer",
    "**Milestone:** M-INFRA-3b - Runtime Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 3)",
    "",
    "Implement the enforcement layer that validates every tool call against the agent runtime manifest.",
    "This is the security-critical component that enforces all RBAC policy.",
    "",
    "### Issues",
    "- [ ] ToolExecutionGuard middleware",
    "- [ ] Integrate guard into mcp-server.ts dispatch",
    "- [ ] approval_required flow with ApprovalRequest creation"
)) @("epic","domain:mcp","P0-critical","enhancement","security") $ms108

New-Issue "MCP-3.3.1 - ToolExecutionGuard middleware" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-3b",
    "",
    "Implement ToolExecutionGuard that validates every tool call across five checks:",
    "1. Agent identity resolved from session",
    "2. Tool visible in agent manifest",
    "3. Permission level sufficient for operation type",
    "4. Environment scope allows this operation",
    "5. Approval policy satisfied",
    "",
    "On failure returns: { blocked: true, reason, requiredApprovalMode }",
    "",
    "**Acceptance criteria:**",
    "- Unauthorized tool call returns structured blocked response (not unhandled error)",
    "- Guard adds < 5ms overhead per call (manifest cached in Redis)",
    "- 100% of tool calls go through the guard",
    "",
    "**Effort:** L (4 days)"
)) @("domain:mcp","P0-critical","enhancement","tech","security") $ms108

New-Issue "MCP-3.3.2 - Integrate ToolExecutionGuard into mcp-server.ts" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-3b",
    "",
    "Wire ToolExecutionGuard into tool dispatch in src/webapp/mcp-server.ts.",
    "Guard applied before any tool handler executes.",
    "",
    "**Acceptance criteria:**",
    "- All existing tool calls still pass (no regression)",
    "- Policy-blocked calls return correct structured error",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms108

New-Issue "MCP-3.3.3 - approval_required flow: auto-create ApprovalRequest" (B @(
    "**Epic:** #$e33",
    "**Milestone:** M-INFRA-3b",
    "",
    "When a tool call hits approval_required policy:",
    "1. Auto-create ApprovalRequest record in DB",
    "2. Return { pending: true, approvalId } to caller",
    "3. Notify designated reviewer via SSE event",
    "4. Tool executes only after approval record is marked approved",
    "",
    "**Acceptance criteria:**",
    "- DevOps agent prod write creates an approval request with correct metadata",
    "- Approval by admin unblocks the pending tool execution",
    "- Expired approvals (configurable TTL) auto-reject",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:mcp","P0-critical","enhancement","tech") $ms108

# ── M-INFRA-3c ──────────────────────────────────────
Write-Host "`n-- M-INFRA-3c --"

$e41 = New-Issue "Epic: MCP Experience Plane UI" (B @(
    "## Epic 4.1 - Experience Plane UI",
    "**Milestone:** M-INFRA-3c - Experience Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 4)",
    "",
    "Build the admin UI for viewing and managing the full MCP permission state.",
    "",
    "### Issues",
    "- [ ] Agent Permission Matrix page (/admin/mcp/matrix)",
    "- [ ] Agent View per agent (/admin/mcp/agents/:id)",
    "- [ ] Override Console page (/admin/mcp/overrides)",
    "- [ ] MCP Diagnostics page (/admin/mcp/diagnostics)"
)) @("epic","domain:mcp","P1-high","enhancement") $ms111

New-Issue "MCP-4.1.1 - Agent Permission Matrix page (/admin/mcp/matrix)" (B @(
    "**Epic:** #$e41",
    "**Milestone:** M-INFRA-3c",
    "",
    "Full-page matrix view: all 12 agents x all registered servers x tool categories.",
    "Shows permission levels (N/D/R/P/W/A/X) and approval mode per cell.",
    "Filterable by agent, server, or permission level.",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

New-Issue "MCP-4.1.2 - Agent View with effective permissions (/admin/mcp/agents/:id)" (B @(
    "**Epic:** #$e41",
    "**Milestone:** M-INFRA-3c",
    "",
    "Per-agent view showing which tools are visible, blocked, or require approval - with why explanations.",
    "Shows workload identity status for agents requiring it.",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

New-Issue "MCP-4.1.3 - Override Console page (/admin/mcp/overrides)" (B @(
    "**Epic:** #$e41",
    "**Milestone:** M-INFRA-3c",
    "",
    "Time-bound manual override console: create, list, and expire overrides.",
    "Override recorded with: timestamp, expiry, author, justification.",
    "All overrides in audit trail.",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

New-Issue "MCP-4.1.4 - MCP Diagnostics page (/admin/mcp/diagnostics)" (B @(
    "**Epic:** #$e41",
    "**Milestone:** M-INFRA-3c",
    "",
    "Single-screen diagnostics showing: unhealthy servers, auth-pending agents,",
    "consent status summary, and manifest validity summary per agent.",
    "Status refreshes without page reload (SSE).",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:mcp","P1-high","enhancement","ux","ui") $ms111

$e42 = New-Issue "Epic: Reconcile Loop and Doctor Command" (B @(
    "## Epic 4.2 - Reconcile Loop and Doctor Command",
    "**Milestone:** M-INFRA-3c - Experience Plane",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 4)",
    "",
    "Full reconcile lifecycle: code -> diff -> plan -> apply -> audit. Plus doctor validation command.",
    "",
    "### Issues",
    "- [ ] reconcile command (dry-run + apply)",
    "- [ ] reconcile_runs audit table",
    "- [ ] doctor command with 8 validation checks"
)) @("epic","domain:mcp","P1-high","enhancement") $ms111

New-Issue "MCP-4.2.1 - reconcile command (dry-run + apply)" (B @(
    "**Epic:** #$e42",
    "**Milestone:** M-INFRA-3c",
    "",
    "Implement 'npx plugin reconcile' command:",
    "1. Read code definitions",
    "2. Diff against current DB state",
    "3. Display plan (added/changed/removed)",
    "4. On --apply: write changes to DB, rebuild manifests",
    "5. Log result to reconcile_runs table",
    "",
    "**Acceptance criteria:**",
    "- --dry-run shows diff without modifying DB",
    "- --apply applies and shows result summary",
    "- Ends with runtime build automatically",
    "- Reconcile is always explicit (never runs automatically)",
    "",
    "**Effort:** L (4 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms111

New-Issue "MCP-4.2.2 - reconcile_runs audit table" (B @(
    "**Epic:** #$e42",
    "**Milestone:** M-INFRA-3c",
    "",
    "Create reconcile_runs table: id, ran_at, ran_by, duration_ms, changes_applied (JSON), status",
    "",
    "**Acceptance criteria:**",
    "- Every 'reconcile --apply' creates a row",
    "- Failed reconcile records the error detail",
    "",
    "**Effort:** S (1 day)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms111

New-Issue "MCP-4.2.3 - doctor command with 8 validation checks" (B @(
    "**Epic:** #$e42",
    "**Milestone:** M-INFRA-3c",
    "",
    "Implement 'npx plugin doctor' checking:",
    "1. Config files present and valid",
    "2. DB connectivity",
    "3. All registered servers reachable",
    "4. Auth credentials present for servers requiring auth",
    "5. Policy completeness (no agent without policy rows)",
    "6. Manifest buildability (dry-run of runtime build)",
    "7. Missing workload identity for agents requiring it",
    "8. Expired or missing consent for Microsoft-backed servers",
    "",
    "Output: list of errors and warnings with remediation steps.",
    "Exit code 0 = all clear, 1 = errors found.",
    "",
    "**Effort:** L (3 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms111

# ── M-INFRA-3d ──────────────────────────────────────
Write-Host "`n-- M-INFRA-3d --"

$e5 = New-Issue "Epic: Workload Identity Integration in MCP Runtime" (B @(
    "## Epic 5 - Workload Identity Integration",
    "**Milestone:** M-INFRA-3d",
    "**Domain:** MCP Plugin Architecture (Domain 06, Phase 5)",
    "**Depends on:** M-INFRA-2c",
    "",
    "Wire consent and workload identity state from Domain 02 into MCP runtime enforcement.",
    "",
    "### Issues",
    "- [ ] Wire workload identity in ToolExecutionGuard",
    "- [ ] Workload identity status in runtime manifests",
    "- [ ] Identity checks in doctor command"
)) @("epic","domain:mcp","P1-high","enhancement") $ms113

New-Issue "MCP-5.1 - Wire AgentWorkloadIdentity.effectiveEnabled into ToolExecutionGuard" (B @(
    "**Epic:** #$e5",
    "**Milestone:** M-INFRA-3d",
    "**Depends on:** M-INFRA-2c",
    "",
    "Extend ToolExecutionGuard for agents using Microsoft-backed servers:",
    "- consentGranted=false: block with reason CONSENT_PENDING",
    "- servicePrincipalReady=false: block with reason IDENTITY_NOT_PROVISIONED",
    "- credentialPolicyValid=false: block with reason CREDENTIAL_POLICY_VIOLATION",
    "",
    "**Acceptance criteria:**",
    "- Agent with ConsentPending status cannot execute Microsoft-backed tools",
    "- Correct reason code returned in blocked response",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P1-high","enhancement","tech","security") $ms113

New-Issue "MCP-5.2 - Workload identity status in runtime manifests" (B @(
    "**Epic:** #$e5",
    "**Milestone:** M-INFRA-3d",
    "",
    "Include workload identity state in manifest for agents where requiresWorkloadIdentity=true.",
    "Example: { serverId: 'azure', authStatus: 'consent_pending', tools: [] }",
    "",
    "**Acceptance criteria:**",
    "- Manifest shows authStatus: consent_pending for Infra agent in new tenant",
    "- Experience plane diagnostics shows consent-pending agents",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms113

New-Issue "MCP-5.3 - Identity checks in doctor command" (B @(
    "**Epic:** #$e5",
    "**Milestone:** M-INFRA-3d",
    "",
    "Add to doctor command:",
    "- Missing Entra app registration for agents requiring workload identity",
    "- Pending consent for Microsoft-backed servers",
    "- Expiring credentials (warn if expiring within 30 days)",
    "",
    "**Acceptance criteria:**",
    "- Doctor flags all three conditions with remediation steps",
    "- Remediation step includes the correct CLI command to fix the issue",
    "",
    "**Effort:** M (2 days)"
)) @("domain:mcp","P1-high","enhancement","tech") $ms113

Write-Host "`nDomain 06 complete!" -ForegroundColor Cyan
