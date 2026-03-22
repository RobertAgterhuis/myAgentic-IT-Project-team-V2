#!/usr/bin/env pwsh
# Part 1: Create labels and milestones for the ideas-response implementation plan
# Output: ms-numbers.json (milestone number map) for use by Part 2

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

# === LABELS ===
Write-Host "`n=== Creating Labels ===" -ForegroundColor Cyan
$newLabels = @(
    @{name="epic";            color="9B59B6"; description="Top-level epic tracking issue"},
    @{name="domain:mcp";      color="0052CC"; description="MCP Plugin Architecture domain"},
    @{name="domain:identity"; color="28A745"; description="Identity and Authentication domain"},
    @{name="domain:rag";      color="17A2B8"; description="RAG / Knowledge Retrieval domain"},
    @{name="domain:chat";     color="FD7E14"; description="Chat Interface domain"},
    @{name="domain:git";      color="6F42C1"; description="Git Backend domain"},
    @{name="domain:help";     color="20C997"; description="Help System domain"}
)

foreach ($l in $newLabels) {
    $p = @{name=$l.name; color=$l.color; description=$l.description} | ConvertTo-Json -Compress
    $out = ($p | gh api "repos/$repo/labels" --input - 2>&1)
    if ($out -match '"id"') { Write-Host "  Created: $($l.name)" -ForegroundColor Green }
    else { Write-Host "  Skipped (exists): $($l.name)" -ForegroundColor Yellow }
}

# === MILESTONES ===
Write-Host "`n=== Creating Milestones ===" -ForegroundColor Cyan

function New-MS($title, $desc) {
    $p = @{title=$title; description=$desc; state="open"} | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/milestones" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number): $title" -ForegroundColor Green
    return $r.number
}

$ms = @{}

# === Q1 Sprint 1-2 ===
Write-Host "`n-- Q1 Sprint 1-2 --"
$ms["INFRA-1a"] = New-MS "M-INFRA-1a — Plugin Core & Agent Catalog" "Plugin package structure, defineAgents/Servers/Policies/Environments factories, 12-agent catalog, 8-server registry, health monitor, CLI init + bootstrap. Domain 06 Phase 1. Sprint 1-2."
$ms["INFRA-2a"] = New-MS "M-INFRA-2a — Auth Provider Abstraction" "IAuthProvider interface, GitHubAuthProvider wrapper, multi-provider User model (provider_type + provider_id), zero-regression DB migration. Domain 02 Phase 1. Sprint 1-2."
$ms["INTEL-1"]  = New-MS "M-INTEL-1 — RAG Infrastructure" "LanceDB + @xenova/transformers, document loaders, deterministic control plane, semantic search API, context composition layer interface. Domain 01 Phase 1. Sprint 1-2."
$ms["UX-1a"]    = New-MS "M-UX-1a — Help Scaffold" "PageHelp React component (inline strip + expandable drawer), /api/v1/help API, 3 initial help pages. Domain 05 Phase 1. Sprint 1-2."
$ms["GIT-1a"]   = New-MS "M-GIT-1a — isomorphic-git Integration" "GitBackend TypeScript interface, IsomorphicGitBackend, GitCredentialStore, clone/pull/status operations, GitService. Domain 04 Phase 1. Sprint 1-2."

# === Q2 Sprint 3-4 ===
Write-Host "`n-- Q2 Sprint 3-4 --"
$ms["INFRA-3a"] = New-MS "M-INFRA-3a — Policy Plane" "AgentServerPolicy + AgentToolPolicy DB schemas, policy sync CLI, PolicyService(resolveServerPermission + resolveToolPermission), environment scope enforcement. Domain 06 Phase 2. Sprint 3-4."
$ms["INFRA-2b"] = New-MS "M-INFRA-2b — Entra OIDC Provider" "EntraAuthProvider via OIDC, Azure app registration, multi-provider login UI (provider selector), admin provider panel, auth audit log. Domain 02 Phase 2. Sprint 3-4."
$ms["INTEL-2"]  = New-MS "M-INTEL-2 — RAG Collections & Semantic Search" "8 RAG collections (governance-policy, agent-runbook, compliance-checklist, sprint-decisions, architecture-decisions, audit-findings, help-content, code-patterns), context composer (P0-Policy/P1-History/P2-Knowledge), context injection into agent prompt pipeline. Domain 01 Phase 2. Sprint 3-4."
$ms["GIT-1b"]   = New-MS "M-GIT-1b — Native Git Fallback & Credential Binding" "NativeGitBackend via execFile (not exec), backend auto-selection logic, provider API backend stub, Entra credential binding for HTTPS auth. Domain 04 Phase 2. Sprint 3-4."

# === Q3 Sprint 5-6 ===
Write-Host "`n-- Q3 Sprint 5-6 --"
$ms["INFRA-3b"] = New-MS "M-INFRA-3b — Runtime Plane" "Per-agent runtime manifests (.generated/runtime-manifests/), tools/list filtering per agent identity, ToolExecutionGuard middleware, approval_required flow with ApprovalRequest creation. Domain 06 Phase 3. Sprint 5-6."
$ms["UX-2a"]    = New-MS "M-UX-2a — Chat Service Phase 1" "ChatMessage + ProposedAction TypeScript types, ChatService with intent routing, 10-category intent classifier, chat API (GET/POST /api/v1/chat), operator console UI. Domain 03 Phase 1. Sprint 5-6."
$ms["UX-1b"]    = New-MS "M-UX-1b — Full Help System with LLM Drawer" "8 total help pages (including Sprint execution, Decisions, MCP Diagnostics, Override Console, Agent Detail), LLM-grounded help drawer via Azure OpenAI, markdown-based content management, state-aware variants. Domain 05 Phase 2. Sprint 5-6."

# === Q4 Sprint 7-8 ===
Write-Host "`n-- Q4 Sprint 7-8 --"
$ms["INFRA-3c"] = New-MS "M-INFRA-3c — Experience Plane & Reconcile Loop" "Permission Matrix UI (12 agents x all servers), Agent View per agent, time-bound Override Console with audit, MCP Diagnostics page, full reconcile command (dry-run + apply), reconcile_runs audit table, doctor command with 8 validation checks. Domain 06 Phase 4. Sprint 7-8."
$ms["INFRA-2c"] = New-MS "M-INFRA-2c — Agent Workload Identity" "AgentWorkloadIdentity DB schema, identity plan CLI, identity bootstrap CLI, identity consent status CLI, per-agent-role Entra app registrations, consent lifecycle tracking. Domain 02 Phase 3. Sprint 7-8."
$ms["INFRA-3d"] = New-MS "M-INFRA-3d — Workload Identity in MCP Runtime" "Consent state wired into ToolExecutionGuard, workload identity status in runtime manifests (auth_status: consent_pending), identity checks added to doctor command. Depends on M-INFRA-2c. Domain 06 Phase 5. Sprint 7-8."
$ms["UX-2b"]    = New-MS "M-UX-2b — Chat Phase 2 (RAG-backed)" "RAG context injection into chat response pipeline, gate failure explainer in chat detail panel, approval-via-chat for approval_required gates, SSE streaming for real-time responses. Domain 03 Phase 2. Sprint 7-8."

# === Year 2 Sprint 9-10 ===
Write-Host "`n-- Year 2 Sprint 9-10 --"
$ms["INTEL-3"]  = New-MS "M-INTEL-3 — Cross-session Learning" "Agent-preference tuning from session history, anomaly detection for unusual tool calls, usage pattern analysis endpoint. Domain 01 Phase 3. Sprint 9-10."
$ms["GIT-2"]    = New-MS "M-GIT-2 — Full Git Provider API" "Azure DevOps Repos API integration, GitHub API for branches and PRs, per-agent branch/PR creation, Git operations audit log. Domain 04 Phase 3. Sprint 9-10."
$ms["UX-3"]     = New-MS "M-UX-3 — Multi-agent Chat & Session Copilot" "Multi-agent conversation orchestration, session copilot feature, full approval UX (notifications, async approval, reviewer assignment). Domain 03 Phase 3. Sprint 9-10."

# === SAVE ===
$msJson = $ms | ConvertTo-Json
$msJson | Set-Content "$PSScriptRoot\ms-numbers.json"
Write-Host "`nSaved milestone numbers to scripts/ms-numbers.json" -ForegroundColor Green
Write-Host "`nMilestone map:"
$ms.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Host "  $($_.Key) => #$($_.Value)" }
