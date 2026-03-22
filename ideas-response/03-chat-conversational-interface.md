# Domain 03 — Built-in Chat / Conversational Interface

> Source: `ideas/ideas.md` — Section "Chat Solution"  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

---

## 1. Executive Summary

The consultant's verdict: **"A built-in chat would make the platform feel like a real control plane instead of a UI that still depends on an external chat client."**

The current platform interaction model has a fundamental friction point: the README explicitly instructs users to paste commands into **Copilot Chat**, type `CONTINUE` between agents, and manage workflow externally. This means the platform's most critical control surface — agent orchestration — lives _outside_ the product.

The recommended solution is a **governed operator console**, not a generic AI chat widget. Every response must be grounded in deterministic platform state (sessions, artifacts, approvals, policies) and must produce actionable outputs (buttons, workflow transitions, links, citation sources). Ungrounded hallucination would catastrophically undermine trust in a governance-heavy platform.

The chat feature synergizes directly with:

- **RAG** (Domain 01) — chat is the user-visible surface for semantic retrieval
- **Identity** (Domain 02) — chat must be role-aware and Entra-scoped
- **MCP Architecture** (Domain 06) — chat orchestrates MCP-backed actions

---

## 2. Current State Analysis

### What exists today

| Component             | Location                                             | Notes                                  |
| --------------------- | ---------------------------------------------------- | -------------------------------------- |
| Orchestrator commands | `src/webapp/routes/commands.ts`                      | Command queue; `POST /api/v1/commands` |
| Session state         | `src/webapp/routes/sessions.ts`                      | Session lifecycle API                  |
| Approvals             | `src/webapp/routes/approvals.ts`                     | HITL approval workflow                 |
| Artifact browse       | `src/webapp/routes/artifacts.ts`                     | Artifact lineage                       |
| Decision records      | `src/webapp/routes/decisions.ts`                     | Governance decisions                   |
| MCP help              | `src/webapp/mcp-server.ts`                           | `get_help` topic retrieval             |
| SSE (real-time)       | `src/webapp/sse-manager.ts` / `sse-manager-redis.ts` | Server-Sent Events for live updates    |

### Current interaction model problems

1. Commands are submitted via UI form — no conversational intent parsing
2. Gate failures require navigating to multiple UI screens to understand why
3. "CONTINUE" workflow still relies on external chat clients
4. No natural language query for session status or artifact content
5. Approvals require screen navigation; no inline contextual explanation
6. No cross-page surface for operator questions

### Gap Score: FULL — no chat capability exists today

---

## 3. Architecture Design

### Chat System Components

```text
┌─────────────────────────────────────────────────────────────┐
│  CHAT FRONTEND (React component in existing UI)              │
│  ChatPanel — persistent, slide-in/expandable                 │
│  MessageList — grounded answers with citations + action btns │
│  InputBar — natural language input                           │
└─────────────────────────────────────────────────────────────┘
                              │ POST /api/v1/chat/message
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CHAT API (new endpoint group in existing router)            │
│  POST /api/v1/chat/message  — process user message           │
│  GET  /api/v1/chat/history  — conversation history           │
│  POST /api/v1/chat/action   — execute a proposed action      │
│  DELETE /api/v1/chat/session — clear chat history            │
└─────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┼──────────────────┐
               ▼              ▼                   ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
    │  Intent     │  │  Context     │  │  Action          │
    │  Classifier │  │  Assembler   │  │  Executor        │
    └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘
           │                │                    │
           ▼                ▼                    ▼
    Intent routing   Deterministic state    Propose/submit
    (operations,     + RAG retrieval        commands,
    reasoning,       + artifact content     approvals,
    governance,      + policy context       scope changes
    workspace)
```

### Response Data Model

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[]; // Links to source artifacts/decisions/policies
  actions: ProposedAction[]; // Buttons the user can execute
  links: PageLink[]; // Deep links into the UI
  timestamp: string;
  grounding_sources: string[]; // Which data sources were used
}

interface Citation {
  label: string;
  type:
    | 'artifact'
    | 'decision'
    | 'policy'
    | 'phase_output'
    | 'session'
    | 'rag_chunk';
  source_id: string;
  url?: string; // Deep link into the artifact/decision screen
  excerpt?: string;
}

interface ProposedAction {
  id: string;
  label: string;
  type:
    | 'create_command'
    | 'approve'
    | 'reject'
    | 'resume'
    | 'pause'
    | 'open_screen';
  payload: Record<string, unknown>;
  requires_confirmation: boolean;
}
```

### Chat Context Sources (Priority)

| Source                | Priority | Provides                                  |
| --------------------- | -------- | ----------------------------------------- |
| Current session state | P0       | Run status, current phase, gate results   |
| Active approvals      | P0       | Pending decisions, blocking items         |
| Artifact store        | P0       | Phase outputs, code artifacts             |
| Decision records      | P1       | Governance decisions, exceptions          |
| Policies              | P1       | Active policy rules                       |
| RAG retrieval         | P1       | Semantic matches from workspace knowledge |
| Execution history     | P2       | Prior runs, outcomes                      |
| Retrospectives        | P2       | Lessons learned                           |

### What Chat Must NOT Do (Hard Constraints)

1. **Must not** become system of record — session state, approvals, policy outcomes stay deterministic
2. **Must not** replace structured UI flows (approval forms, artifact browsers, admin screens)
3. **Must not** answer without grounding in platform data — every substantive claim must have a citation
4. **Must not** execute irreversible production actions without approval prompt
5. **Must not** expose raw database contents or secrets in responses

### Grounding Protocol

Chat needs a formal response protocol so the operator console stays deterministic even when LLM-backed reasoning is used.

- Every non-trivial response must declare grounding sources before actions are rendered.
- If confidence is low or citations are missing, the assistant must fall back to clarification, navigation help, or a refusal to answer.
- Proposed actions must only be emitted when the cited platform state supports them.
- Gate explanations, approvals, and policy answers must prefer structured platform records over free-form summaries.

The detailed contract is documented in [chat-grounding-protocol.md](chat-grounding-protocol.md).

---

## 4. Intent Classification Model

The chat system must route messages to the correct handler based on intent category:

| Intent Category   | Examples                                                                   | Handler                     |
| ----------------- | -------------------------------------------------------------------------- | --------------------------- |
| `status_query`    | "Where are we?", "What is blocking?", "Is the current phase complete?"     | SessionStateHandler         |
| `gate_explain`    | "Why did the critic gate fail?", "What are the unmet criteria?"            | GateExplainerHandler        |
| `command_create`  | "Start a feature run for dashboard redesign", "Create a scope change"      | CommandCreatorHandler       |
| `approval_action` | "Approve this override", "Reject the exception request"                    | ApprovalActionHandler       |
| `artifact_query`  | "Summarize the architecture review", "Show the risk log"                   | ArtifactQueryHandler        |
| `decision_lookup` | "What decisions apply to the auth module?", "Find related past decisions"  | DecisionLookupHandler (RAG) |
| `workspace_query` | "What repos are in this workspace?", "What patterns exist across repos?"   | WorkspaceQueryHandler       |
| `policy_query`    | "What policies affect this sprint?", "Can the DevOps agent write to prod?" | PolicyQueryHandler          |
| `navigation`      | "Take me to the approvals page", "Open the session artifact"               | NavigationHandler           |
| `operator_guide`  | "What should I do next?", "How do I resume a paused run?"                  | OperatorGuideHandler        |

---

## 5. Phased Implementation Plan

### Phase 1 — Chat API Foundation (Milestone: M-UX-2a)

**Goal:** Backend chat API with session-grounded responses. No RAG yet. Basic UI panel.

#### Epic 1.1 — Chat Backend

- **Issue 1.1.1** — Create `ChatService` in `src/webapp/services/chat-service.ts`
  - Manages conversation history (in-memory + DB persistence for session duration)
  - Connects to LLM provider (configurable: Azure OpenAI or OpenAI)
  - Implements system prompt with platform context injection
  - Acceptance: service initializes; returns grounded responses to test queries
  - Effort: L (3–4 days)

- **Issue 1.1.2** — Implement `POST /api/v1/chat/message` endpoint in `src/webapp/routes/chat.ts`
  - Auth-protected; scoped to current user session
  - Input: `{ message: string, context_hints?: string[] }`
  - Output: `ChatMessage` with citations and proposed actions
  - Acceptance: returns grounded response for "What is the current session status?"
  - Effort: M (2–3 days)

- **Issue 1.1.3** — Implement `ContextAssembler`: pulls current session, phase, gate results, and pending approvals into prompt context
  - Acceptance: context block accurately reflects live DB state in test scenarios
  - Effort: M (2–3 days)

- **Issue 1.1.4** — Implement `IntentClassifier`: routes message to appropriate handler
  - Use few-shot prompt or lightweight classification; fallback to general handler
  - Acceptance: 8/10 test messages correctly routed in CI classification test
  - Effort: M (2 days)

- **Issue 1.1.5** — Add `GET /api/v1/chat/history` (returns last N messages for current session) and `DELETE /api/v1/chat/session`
  - Acceptance: history persisted across page reloads within same platform session
  - Effort: S (1 day)

- **Issue 1.1.6** — Implement grounding validator and low-confidence fallback rules
  - Enforce citation presence for substantive claims, block unsupported actions, and require clarification prompts when intent classification or grounding confidence is low
  - Acceptance: unsupported responses downgrade to clarification or refusal; grounded responses include citations in 100% of governance and status-query test fixtures
  - Effort: M (2 days)

#### Epic 1.2 — Action Proposal System

- **Issue 1.2.1** — Implement `ActionProposer`: given intent and context, generate `ProposedAction[]` in response
  - Acceptance: "Start a feature run" response includes a `create_command` action button with pre-filled payload
  - Effort: M (2 days)

- **Issue 1.2.2** — Implement `POST /api/v1/chat/action` to execute a proposed action by action ID
  - Validates action payload against policy; routes to existing service handlers
  - Acceptance: executing `approve` action routes to `ApprovalsService`; `create_command` routes to `CommandsService`
  - Effort: M (2–3 days)

- **Issue 1.2.3** — Add confirmation guard: actions with `requires_confirmation: true` must be confirmed before execution
  - Acceptance: irreversible actions show confirmation dialog; cancelable
  - Effort: S (1 day)

#### Epic 1.3 — Chat UI Component

- **Issue 1.3.1** — Create `ChatPanel` React component: slide-in panel, persistent across routes
  - Accepts messages, renders citations with links, renders action buttons
  - Acceptance: panel visible on all main routes; keyboard shortcut to open/close
  - Effort: M (2–3 days)

- **Issue 1.3.2** — Add real-time streaming using existing SSE infrastructure (`sse-manager.ts`)
  - Acceptance: response streams token-by-token; no waiting for full response
  - Effort: M (2 days)

- **Issue 1.3.3** — Citation component: each citation shows source type, label, excerpt, and deep link
  - Acceptance: clicking citation navigates to relevant screen/artifact
  - Effort: S (1 day)

---

### Phase 2 — Gate Explainer & Operator Flows (Milestone: M-UX-2b)

**Goal:** The three highest-value use cases: gate failure explanation, status summary, and approval actions via chat.

#### Epic 2.1 — Gate Failure Explainer

- **Issue 2.1.1** — Implement `GateExplainerHandler`: reads gate evaluation results, formats as conversational explanation with specific unmet criteria and recommended remediation actions
  - Acceptance: "Why did the critic gate fail?" returns exact unmet criteria list + a `rerun` action button
  - Effort: M (2–3 days)

- **Issue 2.1.2** — Add gate failure summary to chat context: when active session is at a failed gate, automatically inject gate context
  - Acceptance: proactive message appears when user opens chat with failed gate in session
  - Effort: M (2 days)

#### Epic 2.2 — Session Copilot

- **Issue 2.2.1** — Implement "What should I do next?" handler: reads phase/gate state, suggests next action with command creation
  - Acceptance: correct next step suggested for 5 test scenarios (phase complete, gate blocked, approval pending, run paused, no active session)
  - Effort: M (2 days)

- **Issue 2.2.2** — Add "Summarize current session" handler: produces phase summary, elapsed time, blocking items, risk flags
  - Acceptance: summary includes citations to artifact files
  - Effort: M (2 days)

#### Epic 2.3 — Approval Actions via Chat

- **Issue 2.3.1** — Implement `ApprovalActionHandler`: show pending approvals in chat; propose approve/reject actions
  - Acceptance: "What approvals are pending?" returns list with action buttons
  - Effort: M (2 days)

- **Issue 2.3.2** — Add override context: when proposing an override, chat surfaces related past approvals and policy context
  - Acceptance: proposed override includes citation to relevant policy and 2 similar past decisions
  - Effort: M (2 days) — depends on RAG from Domain 01

---

### Phase 3 — RAG-Backed Intelligence (Milestone: M-UX-3)

**Goal:** Integrate RAG retrieval into chat for decision lookup, workspace knowledge, and cross-phase traceability. Depends on Domain 01 Phase 2.

#### Epic 3.1 — RAG-Powered Chat

- **Issue 3.1.1** — Wire RAG `DecisionLookupHandler` into chat: queries `decisions` collection; returns similar past decisions as citations
  - Acceptance: "What decisions affect the auth module?" returns relevant decisions with source links
  - Effort: M (2 days)

- **Issue 3.1.2** — Wire RAG `WorkspaceQueryHandler`: queries `codebase` collection for pattern/symbol search
  - Acceptance: "What patterns exist for error handling?" returns relevant code chunks
  - Effort: M (2 days)

- **Issue 3.1.3** — Wire RAG `ArtifactQueryHandler`: semantic search over phase outputs
  - Acceptance: "Summarize the architecture review" returns extracted content from Phase 2 output
  - Effort: M (2 days)

#### Epic 3.2 — Workspace Intelligence

- **Issue 3.2.1** — Add cross-repo query: "Has this approach been used elsewhere in the workspace?"
  - Acceptance: queries workspace-scoped `codebase` collection; returns cross-repo matches
  - Effort: M (2 days)

- **Issue 3.2.2** — Add "Architecture drift" query: uses drift detector result + RAG to explain gap between design and implementation
  - Acceptance: integrates with `drift-detector.ts` output
  - Effort: L (3 days)

---

## 6. Milestones

### M-UX-2a — Chat Foundation

- **Deliverables:** Chat API, ChatPanel UI, session-grounded responses, action proposal system, SSE streaming
- **Exit criteria:** End-to-end: user asks status question; grounded response with session context; action button executes command; low-confidence cases fall back safely without unsupported claims

### M-UX-2b — Operator Console

- **Deliverables:** Gate explainer, session copilot, approval actions via chat
- **Exit criteria:** Three primary use cases demonstrated: gate failure explanation, next-step guidance, approval from chat

### M-UX-3 — RAG-Backed Intelligence

- **Deliverables:** Decision lookup in chat, workspace knowledge queries, cross-phase artifact retrieval
- **Exit criteria:** Chat returns cited decisions for a governance question; no hallucination on retrieval test suite

---

## 7. LLM Provider Strategy

| Option                      | Suitability                                   | Notes                                                   |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Azure OpenAI (`gpt-4o`)     | Best for enterprise/Entra-aligned deployments | Requires Azure subscription; complements Entra identity |
| OpenAI (`gpt-4o`)           | Good fallback                                 | External API dependency                                 |
| Local model (Ollama/llama3) | Dev/offline scenarios only                    | Quality too limited for complex intent classification   |

Recommended: **Azure OpenAI as primary** (aligns with the Microsoft-first direction), **configurable** via `CHAT_LLM_PROVIDER` environment variable.

---

## 8. Risks

| Risk                                                     | Likelihood | Impact   | Mitigation                                                                                               |
| -------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------- |
| LLM hallucinations eroding operator trust                | High       | Critical | Strict grounding requirement; every substantive claim requires citation; grounding coverage metric in CI |
| Chat becomes "answer machine" bypassing governance flows | Medium     | High     | Action proposal system routes to existing governed endpoints; no direct DB mutations from chat           |
| LLM API costs at scale                                   | Medium     | Medium   | Context window management; aggressive context pruning; response caching for repeat queries               |
| SSE streaming unreliable under load                      | Low        | Medium   | Redis-backed SSE manager already exists; load test streaming path                                        |
| Security: chat leaks RBAC-restricted data                | Medium     | Critical | ContextAssembler respects RBAC; all queries pass through policy middleware                               |
| Weak intent confidence causes wrong handler selection    | Medium     | High     | Grounding validator forces clarification when confidence or citation support is low                      |

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] Architecture design with component model documented
- [x] Intent classification model complete (10 categories)
- [x] Grounding constraints documented
- [x] Grounding protocol support document linked
- [x] Response data model specified with TypeScript types
- [x] RAG dependency on Domain 01 explicitly flagged
- [x] LLM provider strategy documented
- [x] Phased plan actionable with effort estimates
- [x] Deliverable written to file
