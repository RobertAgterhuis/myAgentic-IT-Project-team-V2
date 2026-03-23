#!/usr/bin/env pwsh
# Domain 03 - Chat / Conversational Interface: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms109=109; $ms114=114; $ms117=117

Write-Host "`n=== Domain 03: Chat / Conversational Interface ===" -ForegroundColor Magenta

# ── M-UX-2a ──────────────────────────────────────
Write-Host "`n-- M-UX-2a (Chat API Foundation) --"

$e11 = New-Issue "Epic: Chat Backend Service" (B @(
    "## Epic 1.1 - Chat Backend Service",
    "**Milestone:** M-UX-2a - Chat Service Phase 1",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 1)",
    "",
    "Governed operator console backend. Every response grounded in deterministic platform state.",
    "",
    "### Hard Constraints",
    "- Must not become system of record (deterministic stores own workflow truth)",
    "- Every substantive claim must have a citation",
    "- Never execute irreversible actions without approval prompt",
    "",
    "### Issues",
    "- [ ] ChatService with conversation history + LLM provider integration",
    "- [ ] POST /api/v1/chat/message endpoint",
    "- [ ] ContextAssembler: pulls live session/phase/gate/approvals state",
    "- [ ] IntentClassifier: routes message to appropriate handler",
    "- [ ] GET /api/v1/chat/history and DELETE /api/v1/chat/session"
)) @("epic","domain:chat","P0-critical","enhancement") $ms109

New-Issue "CHAT-1.1.1 - Create ChatService with conversation history and LLM provider" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-2a",
    "",
    "Create ChatService at src/webapp/services/chat-service.ts:",
    "- Manages conversation history (in-memory + DB persistence for session duration)",
    "- Connects to LLM provider (configurable: Azure OpenAI or OpenAI via env var)",
    "- System prompt includes platform context injection",
    "- Returns ChatMessage with citations and proposed actions",
    "",
    "**Acceptance criteria:**",
    "- Service initializes and returns grounded responses to test queries",
    "- Configurable via CHAT_LLM_PROVIDER env var (azureopenai|openai)",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.1.2 - POST /api/v1/chat/message endpoint" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-2a",
    "",
    "New route file: src/webapp/routes/chat.ts",
    "POST /api/v1/chat/message",
    "Input: { message: string, context_hints?: string[] }",
    "Output: ChatMessage { id, role, content, citations, actions, links, grounding_sources }",
    "Auth: scoped to current user session",
    "",
    "**Acceptance criteria:**",
    "- Returns grounded response for 'What is the current session status?'",
    "- Auth-protected (401 without valid session)",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.1.3 - ContextAssembler: pull live session, phase, gate, approval state" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-2a",
    "",
    "Implement ContextAssembler that builds prompt context from deterministic platform state:",
    "- Current session state and phase",
    "- Active gate evaluation results",
    "- Pending approvals",
    "- Recent artifacts",
    "",
    "**Acceptance criteria:**",
    "- Context block accurately reflects live DB state in test scenarios",
    "- Context assembly takes < 200ms",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.1.4 - IntentClassifier: route message to appropriate handler" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-2a",
    "",
    "Implement IntentClassifier that routes messages to one of 10 handler categories:",
    "status_query, gate_explain, command_create, approval_action, artifact_query,",
    "decision_lookup, workspace_query, policy_query, navigation, operator_guide",
    "",
    "Use few-shot prompt classification; fallback to general handler.",
    "",
    "**Acceptance criteria:**",
    "- 8/10 test messages correctly routed in CI classification test",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.1.5 - GET /api/v1/chat/history and DELETE /api/v1/chat/session" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-UX-2a",
    "",
    "GET /api/v1/chat/history: returns last N messages for current user session.",
    "DELETE /api/v1/chat/session: clears chat history for current session.",
    "",
    "**Acceptance criteria:**",
    "- History persisted across page reloads within same platform session",
    "- Delete clears history cleanly",
    "",
    "**Effort:** S (1 day)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

$e12 = New-Issue "Epic: Chat Action Proposal System" (B @(
    "## Epic 1.2 - Action Proposal System",
    "**Milestone:** M-UX-2a - Chat Service Phase 1",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 1)",
    "",
    "Propose and execute platform actions from chat context. Confirmation guard for irreversible actions.",
    "",
    "### Issues",
    "- [ ] ActionProposer: generate ProposedAction[] in response",
    "- [ ] POST /api/v1/chat/action: execute proposed action",
    "- [ ] Confirmation guard for irreversible actions"
)) @("epic","domain:chat","P0-critical","enhancement") $ms109

New-Issue "CHAT-1.2.1 - ActionProposer: generate ProposedAction[] from intent and context" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-2a",
    "",
    "Implement ActionProposer that generates ProposedAction array for each response.",
    "ProposedAction: { id, label, type, payload, requires_confirmation }",
    "Types: create_command, approve, reject, resume, pause, open_screen",
    "",
    "**Acceptance criteria:**",
    "- 'Start a feature run' response includes create_command action with pre-filled payload",
    "- Irreversible actions have requires_confirmation: true",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.2.2 - POST /api/v1/chat/action: execute proposed action by ID" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-2a",
    "",
    "POST /api/v1/chat/action: { actionId: string }",
    "Validates action payload against policy; routes to existing service handlers.",
    "- approve action -> ApprovalsService",
    "- create_command action -> CommandsService",
    "",
    "**Acceptance criteria:**",
    "- Approve action routes to ApprovalsService correctly",
    "- create_command routes to CommandsService correctly",
    "- Replays same context user had when action was proposed",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.2.3 - Confirmation guard for irreversible actions" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-UX-2a",
    "",
    "Actions with requires_confirmation: true must be confirmed before execution.",
    "UI shows confirmation dialog; cancelable.",
    "",
    "**Acceptance criteria:**",
    "- Destructive/irreversible actions show confirmation dialog",
    "- Cancel abandons the action without side effects",
    "",
    "**Effort:** S (1 day)"
)) @("domain:chat","P0-critical","enhancement","ux") $ms109

$e13 = New-Issue "Epic: ChatPanel UI Component" (B @(
    "## Epic 1.3 - Chat UI Component",
    "**Milestone:** M-UX-2a - Chat Service Phase 1",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 1)",
    "",
    "Persistent slide-in chat panel with SSE streaming, citations, and action buttons.",
    "",
    "### Issues",
    "- [ ] ChatPanel React component: slide-in, persistent across routes",
    "- [ ] SSE token streaming via existing sse-manager.ts",
    "- [ ] Citation component with source type, excerpt, deep link"
)) @("epic","domain:chat","P0-critical","enhancement") $ms109

New-Issue "CHAT-1.3.1 - ChatPanel React component: slide-in, persistent across routes" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-2a",
    "",
    "Create ChatPanel React component:",
    "- Persistent slide-in panel accessible from all main routes",
    "- Keyboard shortcut to open/close (e.g., Ctrl+Shift+C)",
    "- Message list with citations and action buttons",
    "- Input bar with send button",
    "",
    "**Acceptance criteria:**",
    "- Panel visible and functional on all main routes",
    "- Opens/closes via keyboard shortcut",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P0-critical","enhancement","ux","ui") $ms109

New-Issue "CHAT-1.3.2 - SSE token streaming via existing sse-manager.ts" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-2a",
    "",
    "Wire chat response to stream tokens to client via existing SSE infrastructure (sse-manager.ts).",
    "Response streams token-by-token without waiting for full LLM response.",
    "",
    "**Acceptance criteria:**",
    "- Tokens appear progressively in chat UI",
    "- No full-response wait for long answers",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P0-critical","enhancement","tech") $ms109

New-Issue "CHAT-1.3.3 - Citation component: source, excerpt, deep link" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-UX-2a",
    "",
    "Implement Citation component showing: source type badge, label text, excerpt snippet, deep link button.",
    "Clicking the citation navigates to the relevant screen or artifact.",
    "",
    "**Acceptance criteria:**",
    "- Clicking citation navigates to relevant screen/artifact",
    "- Source type (artifact|decision|policy|session|rag_chunk) shows distinct badge",
    "",
    "**Effort:** S (1 day)"
)) @("domain:chat","P0-critical","enhancement","ux","ui") $ms109

# ── M-UX-2b ──────────────────────────────────────
Write-Host "`n-- M-UX-2b (Gate Explainer & Operator Flows) --"

$e21 = New-Issue "Epic: Gate Failure Explainer" (B @(
    "## Epic 2.1 - Gate Failure Explainer",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "",
    "Explain gate failures in conversational form with specific unmet criteria and remediation actions.",
    "",
    "### Issues",
    "- [ ] GateExplainerHandler: formatted explanation with unmet criteria + rerun action",
    "- [ ] Proactive gate failure context injection on chat open"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.1.1 - GateExplainerHandler: unmet criteria + rerun action" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-2b",
    "",
    "Implement GateExplainerHandler for intent=gate_explain.",
    "Reads gate evaluation results; formats as conversational explanation.",
    "Returns specific unmet criteria list + a rerun action button.",
    "",
    "**Acceptance criteria:**",
    "- 'Why did the critic gate fail?' returns exact unmet criteria + rerun button",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

New-Issue "CHAT-2.1.2 - Proactive gate failure context on chat open" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-UX-2b",
    "",
    "When active session is at a failed gate, automatically inject gate context when user opens chat.",
    "Appear as an assistant message explaining the current blockage.",
    "",
    "**Acceptance criteria:**",
    "- Proactive message appears when user opens chat with failed gate in session",
    "- Message includes gate failure reason and suggested next step",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","ux") $ms114

$e22 = New-Issue "Epic: Session Copilot (What should I do next?)" (B @(
    "## Epic 2.2 - Session Copilot",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "",
    "Guide operators to their next action based on current session and phase state.",
    "",
    "### Issues",
    "- [ ] Next-action guidance handler (5 session state scenarios)",
    "- [ ] Current session summary handler"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.2.1 - What should I do next? handler for 5 session states" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-UX-2b",
    "",
    "Implement next-action guidance handler. Correct suggestion for 5 scenarios:",
    "1. Phase complete (suggest submitting to next phase)",
    "2. Gate blocked (explain and offer override/fix)",
    "3. Approval pending (show pending approvals)",
    "4. Run paused (offer resume or abandon)",
    "5. No active session (guide to Commands page)",
    "",
    "**Acceptance criteria:**",
    "- Correct next step suggested for all 5 scenarios in CI tests",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

New-Issue "CHAT-2.2.2 - Summarize current session handler with citations" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-UX-2b",
    "",
    "Handle 'Summarize current session' intent.",
    "Produces: phase summary, elapsed time, blocking items, risk flags.",
    "Each section includes citations to artifact files.",
    "",
    "**Acceptance criteria:**",
    "- Summary includes citations to artifact files",
    "- Elapsed time accurate to session start",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

$e23 = New-Issue "Epic: Approval Actions via Chat" (B @(
    "## Epic 2.3 - Approval Actions via Chat",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "",
    "Surface pending approvals and propose approve/reject actions inline in chat.",
    "",
    "### Issues",
    "- [ ] ApprovalActionHandler: show pending approvals with action buttons",
    "- [ ] Override context: policy + similar past approvals in chat"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.3.1 - ApprovalActionHandler: pending approvals list with actions" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-UX-2b",
    "",
    "Implement ApprovalActionHandler for intent=approval_action.",
    "Shows pending approvals in chat with approve/reject action buttons per item.",
    "",
    "**Acceptance criteria:**",
    "- 'What approvals are pending?' returns list with action buttons",
    "- Approve/reject executes via existing ApprovalsService",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

New-Issue "CHAT-2.3.2 - Override context: policy and similar past decisions in proposal" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-UX-2b",
    "**Depends on:** RAG Domain 01 Phase 2",
    "",
    "When proposing an override, surface related policy context and similar past approvals.",
    "Citations include policy rule reference and 2 similar past decisions from RAG decisions collection.",
    "",
    "**Acceptance criteria:**",
    "- Proposed override includes citation to relevant policy",
    "- At least 2 similar past decisions cited (from RAG)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

$e24 = New-Issue "Epic: RAG Grounding in Core Chat Responses" (B @(
    "## Epic 2.4 - RAG Grounding in Core Chat Responses",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "**Depends on:** Domain 01 RAG Phase 2 collections availability",
    "",
    "Ensure POST /api/v1/chat/message is truly RAG-backed (not only chat/query), with enforceable grounding and safe fallbacks.",
    "",
    "### Issues",
    "- [ ] Integrate intent-routed RAG retrieval directly into chat/message response pipeline",
    "- [ ] Enforce citation + confidence thresholds with clarification fallback",
    "- [ ] Add workspace/global collection scoping policy for multi-workspace correctness"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.4.1 - Integrate intent-routed RAG retrieval into POST /api/v1/chat/message" (B @(
    "**Epic:** #$e24",
    "**Milestone:** M-UX-2b",
    "",
    "Wire RagGroundingService into main chat response path:",
    "- Resolve intent -> target collections (decision_lookup/workspace_query/artifact_query)",
    "- Retrieve topK grounded matches before assistant response composition",
    "- Pass citations and snippets into ChatService response generation",
    "",
    "**Acceptance criteria:**",
    "- /api/v1/chat/message returns grounded citations for retrieval-type intents",
    "- /api/v1/chat/query and /api/v1/chat/message produce consistent top matches for same query",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

New-Issue "CHAT-2.4.2 - Citation and confidence enforcement with safe fallback" (B @(
    "**Epic:** #$e24",
    "**Milestone:** M-UX-2b",
    "",
    "Introduce GroundingValidator for main chat responses:",
    "- If intent requires grounding and confidence/citation threshold is not met,",
    "  return clarification prompt (not fabricated answer)",
    "- Block approval/policy recommendations without supporting citations",
    "",
    "**Acceptance criteria:**",
    "- Governance and status test fixtures contain citations in 100% of substantive responses",
    "- Low-confidence retrieval test cases return clarification fallback",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech","security") $ms114

New-Issue "CHAT-2.4.3 - Workspace/global collection scoping policy for chat grounding" (B @(
    "**Epic:** #$e24",
    "**Milestone:** M-UX-2b",
    "",
    "Implement deterministic scoping rules for collection selection:",
    "- Workspace-scoped by default for codebase/sprint artifacts",
    "- Global-scoped for policies/patterns/retrospectives where appropriate",
    "- Enforce scope in citations to prevent cross-workspace leakage",
    "",
    "**Acceptance criteria:**",
    "- Multi-workspace tests prove no cross-workspace citation leakage",
    "- Scope resolution is visible in debug metadata and trace logs",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech","security") $ms114

$e25 = New-Issue "Epic: RAG Index Freshness and Availability for Chat" (B @(
    "## Epic 2.5 - RAG Index Freshness and Availability",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "",
    "Guarantee chat grounding uses fresh and available indexes, with graceful degradation when indexing services are unavailable.",
    "",
    "### Issues",
    "- [ ] Auto-index triggers for high-value artifact changes",
    "- [ ] Incremental re-index scheduler + stale index detection",
    "- [ ] Degraded-mode UX when RAG services are unavailable"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.5.1 - Auto-index high-value artifact updates for chat freshness" (B @(
    "**Epic:** #$e25",
    "**Milestone:** M-UX-2b",
    "",
    "Trigger targeted indexing after updates to:",
    "- decisions and approval artifacts",
    "- phase output documents",
    "- session state and sprint artifacts",
    "",
    "**Acceptance criteria:**",
    "- New/updated decision is queryable by chat within 60 seconds",
    "- Index jobs deduplicate repeated updates during burst writes",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms114

New-Issue "CHAT-2.5.2 - Incremental re-index scheduler with stale index detection" (B @(
    "**Epic:** #$e25",
    "**Milestone:** M-UX-2b",
    "",
    "Add a scheduled health pass that:",
    "- Detects stale/missing collection indexes",
    "- Reconciles via incremental sync",
    "- Emits freshness metrics per collection",
    "",
    "**Acceptance criteria:**",
    "- Scheduler detects stale indexes and self-heals without full reindex by default",
    "- Freshness status is visible in admin/debug endpoint",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech","ops") $ms114

New-Issue "CHAT-2.5.3 - Degraded-mode behavior when RAG services unavailable" (B @(
    "**Epic:** #$e25",
    "**Milestone:** M-UX-2b",
    "",
    "Define and implement degraded behavior for chat when _ragStore/_embeddingProvider is unavailable:",
    "- Explicit non-grounded response banner",
    "- No policy/approval recommendation without grounding",
    "- Recovery hint and retry action",
    "",
    "**Acceptance criteria:**",
    "- RAG service outage scenario yields safe degraded UX, no silent failures",
    "- Error telemetry includes failure reason and fallback path used",
    "",
    "**Effort:** S-M (1-2 days)"
)) @("domain:chat","P1-high","enhancement","tech","ux") $ms114

$e26 = New-Issue "Epic: M-UX-2b Quality Gates and Observability" (B @(
    "## Epic 2.6 - Quality Gates and Observability",
    "**Milestone:** M-UX-2b - Chat Phase 2",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 2)",
    "",
    "Add objective quality and performance gates for RAG-backed chat before milestone close.",
    "",
    "### Issues",
    "- [ ] Retrieval quality evaluation harness for chat intents",
    "- [ ] Grounding and latency metrics instrumentation",
    "- [ ] CI gate for precision and latency regression protection"
)) @("epic","domain:chat","P1-high","enhancement") $ms114

New-Issue "CHAT-2.6.1 - Retrieval quality harness for chat grounding intents" (B @(
    "**Epic:** #$e26",
    "**Milestone:** M-UX-2b",
    "",
    "Build intent-focused retrieval evaluation set for:",
    "- gate_explain",
    "- approval_action",
    "- artifact_query / decision_lookup",
    "",
    "Measure precision@3 and citation validity per fixture.",
    "",
    "**Acceptance criteria:**",
    "- Precision@3 >= 0.75 for M-UX-2b benchmark set",
    "- 100% citation-valid responses in benchmark fixtures",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","test") $ms114

New-Issue "CHAT-2.6.2 - Instrument grounding and latency metrics for chat pipeline" (B @(
    "**Epic:** #$e26",
    "**Milestone:** M-UX-2b",
    "",
    "Emit per-request metrics:",
    "- retrieval latency",
    "- first token latency",
    "- citation count",
    "- fallback rate",
    "- no-match rate",
    "",
    "**Acceptance criteria:**",
    "- Metrics exposed in runtime metrics payload and dashboard endpoints",
    "- P95 retrieval latency and fallback rate visible per environment",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech","ops") $ms114

New-Issue "CHAT-2.6.3 - CI regression gate for grounding quality and latency budgets" (B @(
    "**Epic:** #$e26",
    "**Milestone:** M-UX-2b",
    "",
    "Add CI checks that fail on regression below budget:",
    "- precision@3 < 0.75",
    "- citation validity < 100% for governance fixtures",
    "- chat first-token latency budget exceeded in perf smoke suite",
    "",
    "**Acceptance criteria:**",
    "- CI blocks merge when any M-UX-2b quality gate fails",
    "- Gate outputs actionable failure report",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","test","ci") $ms114

# ── M-UX-3 ──────────────────────────────────────
Write-Host "`n-- M-UX-3 (Multi-agent Chat & RAG Intelligence) --"

$e31 = New-Issue "Epic: RAG-Powered Chat Intelligence" (B @(
    "## Epic 3.1 - RAG-Powered Chat Intel",
    "**Milestone:** M-UX-3 - Multi-agent Chat",
    "**Domain:** Chat / Conversational Interface (Domain 03, Phase 3)",
    "**Depends on:** Domain 01 RAG Phase 2",
    "",
    "Wire RAG collections into chat handlers for decision lookup, workspace knowledge, artifact queries.",
    "",
    "### Issues",
    "- [ ] RAG DecisionLookupHandler (decisions collection)",
    "- [ ] RAG WorkspaceQueryHandler (codebase collection)",
    "- [ ] RAG ArtifactQueryHandler (phase-outputs collection)"
)) @("epic","domain:chat","P1-high","enhancement") $ms117

New-Issue "CHAT-3.1.1 - RAG DecisionLookupHandler: decisions collection" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-UX-3",
    "**Depends on:** RAG-2.1.1 (decisions collection indexed)",
    "",
    "Wire RAG DecisionLookupHandler into chat for intent=decision_lookup.",
    "Queries decisions collection; returns similar past decisions as citations.",
    "",
    "**Acceptance criteria:**",
    "- 'What decisions affect the auth module?' returns relevant decisions with source links",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms117

New-Issue "CHAT-3.1.2 - RAG WorkspaceQueryHandler: codebase collection search" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-UX-3",
    "**Depends on:** RAG-2.1.3 (codebase collection indexed)",
    "",
    "Wire RAG WorkspaceQueryHandler for intent=workspace_query.",
    "Queries codebase collection for pattern and symbol search.",
    "",
    "**Acceptance criteria:**",
    "- 'What patterns exist for error handling?' returns relevant code chunks",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms117

New-Issue "CHAT-3.1.3 - RAG ArtifactQueryHandler: phase-outputs semantic search" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-UX-3",
    "**Depends on:** RAG-2.1.2 (phase-outputs collection indexed)",
    "",
    "Wire RAG ArtifactQueryHandler for intent=artifact_query.",
    "Queries phase-outputs collection for phase artifact content.",
    "",
    "**Acceptance criteria:**",
    "- 'Summarize the architecture review' returns extracted content from Phase 2 output",
    "",
    "**Effort:** M (2 days)"
)) @("domain:chat","P1-high","enhancement","tech") $ms117

Write-Host "`nDomain 03 complete!" -ForegroundColor Cyan
