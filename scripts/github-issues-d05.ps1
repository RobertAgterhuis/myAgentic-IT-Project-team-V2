#!/usr/bin/env pwsh
# Domain 05 - Internal Help System: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms102=102; $ms110=110

Write-Host "`n=== Domain 05: Internal Help System ===" -ForegroundColor Magenta

# ── M-UX-1a ──────────────────────────────────────
Write-Host "`n-- M-UX-1a (Help Foundation) --"

$e11 = New-Issue "Epic: Help Backend Service" (B @(
    "## Epic 1.1 - Help Backend Service",
    "**Milestone:** M-UX-1a - Help Foundation",
    "**Domain:** Internal Help System (Domain 05, Phase 1)",
    "",
    "Productizes the existing MCP get_help capability into a REST API serving PageHelp objects.",
    "HelpService loads content from static JSON/YAML at startup.",
    "",
    "### Help API",
    "GET /api/v1/help/page/:routeSlug — returns PageHelp for a route",
    "GET /api/v1/help/topic/:topicId  — returns full topic markdown as HTML",
    "GET /api/v1/help/search?q=...    — full-text search across all help content",
    "",
    "### Issues",
    "- [ ] HelpService at src/webapp/services/help-service.ts",
    "- [ ] GET /api/v1/help/page/:routeSlug endpoint",
    "- [ ] GET /api/v1/help/topic/:topicId endpoint (XSS-sanitized markdown)",
    "- [ ] GET /api/v1/help/search full-text endpoint"
)) @("epic","domain:help","P1-high","enhancement") $ms102

New-Issue "HELP-1.1.1 - Create HelpService: load PageHelp from static config at startup" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-1a",
    "",
    "Create HelpService at src/webapp/services/help-service.ts.",
    "Loads PageHelp objects from static JSON/YAML content files at startup.",
    "Methods: getPageHelp(routeSlug), getTopic(topicId), search(query)",
    "",
    "PageHelp interface: { routePath, pageTitle, purpose, coreActions, inputsOutputs,",
    "  permissions, relatedPages, keywords, topicLinks, stateVariants? }",
    "",
    "**Acceptance criteria:**",
    "- Service loads and returns PageHelp for 5 test pages (commands, sessions, approvals, pipeline, agents)",
    "- Unknown route returns null (handled as 404 by route)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P1-high","enhancement","tech") $ms102

New-Issue "HELP-1.1.2 - GET /api/v1/help/page/:routeSlug endpoint" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-1a",
    "",
    "New route: src/webapp/routes/help.ts",
    "GET /api/v1/help/page/:routeSlug",
    "Returns PageHelp JSON; 404 for unknown route.",
    "Auth: authenticated session required.",
    "",
    "**Acceptance criteria:**",
    "- Returns correct PageHelp for /commands, /sessions, /approvals",
    "- Returns 404 for unknown route slug",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","enhancement","tech") $ms102

New-Issue "HELP-1.1.3 - GET /api/v1/help/topic/:topicId — XSS-sanitized markdown to HTML" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-1a",
    "",
    "GET /api/v1/help/topic/:topicId — reads from docs/help/ topic files.",
    "Renders markdown to HTML using a server-side markdown parser.",
    "Output MUST be sanitized (allowlist-based DOMPurify equivalent) before serving.",
    "",
    "**Security requirement:** Sanitize all HTML output to prevent XSS from any malicious content in help files.",
    "",
    "**Acceptance criteria:**",
    "- Topic renders correctly with headings, tables, code blocks",
    "- Script tags and event handlers stripped from output",
    "- 404 for unknown topic",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","enhancement","tech","security") $ms102

New-Issue "HELP-1.1.4 - GET /api/v1/help/search — in-memory full-text search across pages and topics" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-1a",
    "",
    "GET /api/v1/help/search?q=<query> — searches all PageHelp keyword fields + topic file content.",
    "Uses in-memory text index (no vector store required for Phase 1).",
    "Returns: { pages: PageHelp[], topics: HelpTopicLink[] }",
    "",
    "**Acceptance criteria:**",
    "- Query 'approval' returns Commands, Approvals, and Governance pages",
    "- Query 'gate' returns Pipeline, Sessions pages",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P1-high","enhancement","tech") $ms102

$e12 = New-Issue "Epic: Help UI Components" (B @(
    "## Epic 1.2 - Help UI Components",
    "**Milestone:** M-UX-1a - Help Foundation",
    "**Domain:** Internal Help System (Domain 05, Phase 1)",
    "",
    "Two-layer UI: PageHelpStrip (always accessible) + HelpDrawer (expandable detail).",
    "",
    "### Issues",
    "- [ ] PageHelpStrip: compact bar at top of each page, collapsible, purpose + actions",
    "- [ ] HelpDrawer: slide-in panel for Layer 2 topic content",
    "- [ ] Global ? icon in top navigation bar linking to page-specific help",
    "- [ ] HelpSearch component inside HelpDrawer"
)) @("epic","domain:help","P1-high","enhancement") $ms102

New-Issue "HELP-1.2.1 - PageHelpStrip: compact bar with purpose and actions, collapsible" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-1a",
    "",
    "Create PageHelpStrip React component:",
    "- Appears at top of each page when PageHelp available for the route",
    "- Shows: purpose (1 sentence), core actions list (max 5 items)",
    "- Collapsible; collapsed state stored in localStorage per route",
    "- 'Learn more' link opens HelpDrawer",
    "",
    "**Acceptance criteria:**",
    "- Renders on Commands, Sessions, Approvals pages",
    "- Dismissible; stays collapsed across page reloads",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P1-high","enhancement","ux","ui") $ms102

New-Issue "HELP-1.2.2 - HelpDrawer: slide-in panel for Layer 2 topic content with TOC" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-1a",
    "",
    "Create HelpDrawer React component:",
    "- Slide-in panel from the right",
    "- Renders fetched topic HTML with table of contents",
    "- 'Related pages' section with deep links",
    "- Triggered from 'Learn more' in PageHelpStrip",
    "",
    "**Acceptance criteria:**",
    "- Opens with correct topic for current route",
    "- Renders markdown correctly (headings, tables, code)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P1-high","enhancement","ux","ui") $ms102

New-Issue "HELP-1.2.3 - Global ? icon in navigation: opens help for current route" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-1a",
    "",
    "Add ? icon button to top navigation bar.",
    "Clicking opens HelpDrawer pre-loaded with help for the current route.",
    "Tooltip: 'Help for this page'.",
    "",
    "**Acceptance criteria:**",
    "- Icon visible on all routes",
    "- Opens correct help topic for each main route",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","enhancement","ux","ui") $ms102

New-Issue "HELP-1.2.4 - HelpSearch component: search bar inside HelpDrawer" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-1a",
    "",
    "Add search bar at top of HelpDrawer.",
    "Searches via GET /api/v1/help/search; renders results grouped by pages/topics.",
    "",
    "**Acceptance criteria:**",
    "- Typing 'gate' returns Pipeline, Sessions pages in results",
    "- Selecting a result navigates to that topic in the drawer",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","enhancement","ux","ui") $ms102

$e13 = New-Issue "Epic: Help Content for 5 Priority Pages" (B @(
    "## Epic 1.3 - Help Content: Priority 5 Pages",
    "**Milestone:** M-UX-1a - Help Foundation",
    "**Domain:** Internal Help System (Domain 05, Phase 1)",
    "",
    "Create PageHelp data + Layer 2 topic files for the 5 most critical pages.",
    "All content must be concise, specific, and role-aware.",
    "",
    "### Issues",
    "- [ ] Contents for: Commands, Pipeline, Sessions, Approvals/Governance, Agents pages"
)) @("epic","domain:help","P1-high","content") $ms102

New-Issue "HELP-1.3.1 - Help content: Commands page" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-1a",
    "",
    "Write PageHelp JSON + Layer 2 topics for Commands page:",
    "- pageHelp/commands.json: purpose, 5 core actions, permissions, related pages",
    "- docs/help/commands-modes.md: CREATE vs AUDIT vs FEATURE vs SCOPE_CHANGE vs HOTFIX",
    "- docs/help/commands-prerequisites.md: workspace + project state requirements",
    "",
    "**Acceptance criteria:**",
    "- Help strip renders on Commands page with correct content",
    "- HelpDrawer shows both topic files",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","content","ux") $ms102

New-Issue "HELP-1.3.2 - Help content: Pipeline / Orchestrator page" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-1a",
    "",
    "Write PageHelp + topics for Pipeline/Orchestrator page:",
    "- pageHelp/pipeline.json: purpose, phases explained, gate concepts",
    "- docs/help/pipeline-phases.md: PHASE_1 through PHASE_5 explained",
    "- docs/help/pipeline-gates.md: gate types, pass/fail conditions, override process",
    "",
    "**Acceptance criteria:**",
    "- Help renders on pipeline route with phase and gate content",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","content","ux") $ms102

New-Issue "HELP-1.3.3 - Help content: Sessions page" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-1a",
    "",
    "Write PageHelp + topics for Sessions page:",
    "- pageHelp/sessions.json: purpose, session lifecycle, filter/export actions",
    "- docs/help/sessions-lifecycle.md: created, running, completed, failed states",
    "",
    "**Acceptance criteria:**",
    "- Help renders with session lifecycle explanation",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","content","ux") $ms102

New-Issue "HELP-1.3.4 - Help content: Approvals and Governance page" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-1a",
    "",
    "Write PageHelp + topics for Approvals/Governance page (highest conceptual complexity):",
    "- pageHelp/approvals.json: HITL approvals, approval types, role requirements",
    "- docs/help/approvals-when-required.md: which actions trigger approval",
    "- docs/help/approvals-hotfix-bypass.md: emergency bypass use and audit implications",
    "- docs/help/approvals-override-decisions.md: audit trail and rejection consequences",
    "",
    "**Acceptance criteria:**",
    "- Help renders with approval types and hotfix bypass content",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P1-high","content","ux") $ms102

New-Issue "HELP-1.3.5 - Help content: Agents page" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-1a",
    "",
    "Write PageHelp + topics for Agents page:",
    "- pageHelp/agents.json: agent catalog, confidence history, RBAC",
    "- docs/help/agents-overview.md: all 38 agents, phases, dependencies",
    "- docs/help/agents-confidence.md: confidence scoring interpretation",
    "",
    "**Acceptance criteria:**",
    "- Help renders with agent catalog and confidence score guidance",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P1-high","content","ux") $ms102

# ── M-UX-1b ──────────────────────────────────────
Write-Host "`n-- M-UX-1b (Full Coverage + State-Aware Help) --"

$e21 = New-Issue "Epic: Help Content for Remaining Pages" (B @(
    "## Epic 2.1 - Help Content: All Remaining Pages",
    "**Milestone:** M-UX-1b - Full Help Coverage",
    "**Domain:** Internal Help System (Domain 05, Phase 2)",
    "",
    "Complete help content for all 7 remaining routes.",
    "",
    "### Issues",
    "- [ ] Policies page",
    "- [ ] Artifacts page",
    "- [ ] Audit Trail page",
    "- [ ] Questionnaires page",
    "- [ ] Workspaces page",
    "- [ ] Dashboard page",
    "- [ ] Administration page",
    "- [ ] Cockpit / Observability page"
)) @("epic","domain:help","P2-medium","content") $ms110

New-Issue "HELP-2.1.1 - Help content: Policies page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/policies.json + docs/help/policies-overview.md",
    "Topics: policy types, creating/editing policies, policy enforcement at gates",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.2 - Help content: Artifacts page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/artifacts.json + docs/help/artifacts-overview.md",
    "Topics: artifact types per phase, lineage view, export",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.3 - Help content: Audit Trail page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/audit.json + docs/help/audit-overview.md",
    "Topics: what is logged, filtering by actor/action/resource, export",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.4 - Help content: Questionnaires page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/questionnaires.json + docs/help/questionnaires-overview.md",
    "Topics: when questionnaires are generated, editing answers, re-evaluation flow",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.5 - Help content: Workspaces page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/workspaces.json + docs/help/workspaces-overview.md",
    "Topics: workspace vs project, credential binding, multi-workspace setup",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.6 - Help content: Dashboard page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/dashboard.json + docs/help/dashboard-metrics.md",
    "Topics: metric definitions, reading KPI widgets, drill-down navigation",
    "",
    "**Effort:** S (0.5 days)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.7 - Help content: Administration page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/administration.json + docs/help/administration-overview.md",
    "Topics: user management, role assignment, system configuration, integration setup",
    "",
    "**Effort:** S (1 day)"
)) @("domain:help","P2-medium","content","ux") $ms110

New-Issue "HELP-2.1.8 - Help content: Cockpit / Observability page" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-1b",
    "",
    "pageHelp/cockpit.json + docs/help/cockpit-overview.md",
    "Topics: live run telemetry, SSE event stream, agent health indicators",
    "",
    "**Effort:** S (0.5 days)"
)) @("domain:help","P2-medium","content","ux") $ms110

$e22 = New-Issue "Epic: State-Aware Help Variants" (B @(
    "## Epic 2.2 - State-Aware Help",
    "**Milestone:** M-UX-1b - Full Help Coverage",
    "**Domain:** Internal Help System (Domain 05, Phase 2)",
    "",
    "Adapt PageHelpStrip content to current platform state for actionable guidance.",
    "",
    "### State Variants",
    "- Commands + no active workspace = warning + link to Workspaces",
    "- Pipeline + gate failed = explanation + override action",
    "- Approvals + N pending = count notification + quick approve link",
    "- Agents + error state = error badge + timeline link",
    "",
    "### Issues",
    "- [ ] StateEvaluator in HelpService: evaluate HelpStateVariant conditions",
    "- [ ] State-aware content variants for 4 key pages"
)) @("epic","domain:help","P2-medium","enhancement") $ms110

New-Issue "HELP-2.2.1 - StateEvaluator in HelpService: evaluate state variant conditions" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-UX-1b",
    "",
    "Extend HelpService with StateEvaluator class:",
    "- Receives current session state snapshot",
    "- Evaluates HelpStateVariant.condition against the snapshot",
    "- Returns list of active variants to include in PageHelp response",
    "",
    "**Acceptance criteria:**",
    "- Commands page shows 'no active workspace' variant when workspace is null",
    "- Pipeline page shows 'gate failed' variant when current gate status is FAILED",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P2-medium","enhancement","tech") $ms110

New-Issue "HELP-2.2.2 - State-aware content variants for Commands, Pipeline, Approvals, Agents" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-UX-1b",
    "",
    "Write HelpStateVariant definitions for 4 pages:",
    "- Commands (no_active_workspace): 'You need an active workspace and project first'",
    "- Pipeline (gate_failed): 'Current run blocked at gate. Here is why and what to do.'",
    "- Approvals (pending_approvals_gt_0): 'N approvals pending. Each requires review to continue.'",
    "- Agents (agent_has_error): 'An agent has execution errors. Review the timeline for details.'",
    "",
    "**Acceptance criteria:**",
    "- Each variant tested with mocked state condition in unit tests",
    "",
    "**Effort:** M (2 days)"
)) @("domain:help","P2-medium","enhancement","content") $ms110

Write-Host "`nDomain 05 complete!" -ForegroundColor Cyan
