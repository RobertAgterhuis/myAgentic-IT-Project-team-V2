# Domain 05 — Internal Help System (Per-Page)

> Source: `ideas/ideas.md` — Section "Internal Help System"  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

---

## 1. Executive Summary

The consultant's verdict: **"Yes — the system would strongly benefit from an internal help system per page."**

The platform is conceptually dense — spanning phases, agents, gates, approvals, policies, artifacts, sessions, commands, workspaces, questionnaires, governance, and administration. Without contextual guidance, users must already know how everything works before they can effectively operate it. The README still relies on external documentation and manual continuation steps. Per-page contextual help is the **highest-leverage UX improvement** that can be shipped independently of the larger Chat and RAG features.

Critically, the platform already has a help foundation. The MCP layer exposes `get_help`, a topic listing system, and a help directory. This work is **productization of an existing capability**, not a net-new feature.

The correct design is **two layers**:

- **Layer 1:** Inline page help — short, contextual, always visible or one-click away
- **Layer 2:** Expandable detailed help — longer explanations, examples, workflows, glossary

---

## 2. Current State Analysis

### What exists today

| Component              | Location                   | Notes                       |
| ---------------------- | -------------------------- | --------------------------- |
| MCP `get_help` tool    | `src/webapp/mcp-server.ts` | Returns help topics by name |
| Help directory         | `docs/help/`               | Existing help topic files   |
| Docs index             | `docs/index.md`            | General documentation root  |
| UI routing             | `src/webapp/ui/src/`       | React routes per page       |
| MCP `list_help_topics` | `src/webapp/mcp-server.ts` | Topic discovery via MCP     |

### Current help gaps

| Page / Area               | Help Status               | Gap Severity |
| ------------------------- | ------------------------- | ------------ |
| Commands page             | Implicit from README only | Critical     |
| Pipeline / Orchestrator   | None                      | Critical     |
| Sessions / Session detail | None                      | Critical     |
| Agents page               | None                      | High         |
| Governance / Approvals    | None                      | Critical     |
| Policies                  | None                      | High         |
| Artifacts / Audit         | None                      | High         |
| Questionnaires            | None                      | High         |
| Workspaces                | None                      | Medium       |
| Dashboard                 | Partial (metrics labels)  | Medium       |
| Administration            | None                      | High         |

### Help-Relevant UI Routes (from services/routes)

Based on `src/webapp/routes/` analysis:

- `/commands` — command creation and queue
- `/sessions` — session list and detail
- `/agents` — agent catalog and execution history
- `/approvals` — HITL approval workflows
- `/policies` — policy administration
- `/artifacts` — artifact browser and lineage
- `/audit` — audit trail
- `/questionnaires` — questionnaire editing and review
- `/workspaces` — workspace management
- `/governance` — governance overview
- `/cockpit` — operator cockpit / observability
- `/dashboard` — main dashboard

---

## 3. Architecture Design

### Two-Layer Help System

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1 — Inline Page Help (always accessible)           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Help Icon (?) or Help Strip at top of each page   │  │
│  │  Answers: Purpose / Actions / Inputs-Outputs /     │  │
│  │           Permissions / Related pages              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  LAYER 2 — Detailed Help (expandable panel / drawer)       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Longer topic content from help directory          │  │
│  │  Examples, workflows, glossary, troubleshooting    │  │
│  │  Deep links to related pages                       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Help Content Model

```typescript
interface PageHelp {
  routePath: string; // e.g., '/commands'
  pageTitle: string; // e.g., 'Commands'
  purpose: string; // One sentence: why this page exists
  coreActions: HelpAction[]; // What user can do here (max 5)
  inputsOutputs: string; // What page consumes and changes
  permissions: string; // Role/approval requirements
  relatedPages: RelatedPage[]; // Where to go next
  keywords: string[]; // For search
  topicLinks: HelpTopicLink[]; // Links to Layer 2 topics
  stateVariants?: HelpStateVariant[]; // Optional: content varies by page state
}

interface HelpStateVariant {
  condition: string; // e.g., "has_pending_approvals"
  additionalContent: string; // State-specific guidance
}
```

### Help API

```typescript
// New endpoints under /api/v1/help
GET  /api/v1/help/page/:routeSlug      // Returns PageHelp for a route
GET  /api/v1/help/topic/:topicId       // Returns full topic content (Layer 2)
GET  /api/v1/help/search?q=...         // Full-text search across all help content
GET  /api/v1/help/index                // All pages and topics with metadata
```

### State-Aware Help (Phase 2+)

Some pages should adapt their help content based on current state:

| Page      | State Condition       | Adaptive Content                                                                     |
| --------- | --------------------- | ------------------------------------------------------------------------------------ |
| Commands  | No active session     | "You need an active workspace and project before submitting a command"               |
| Pipeline  | Gate failed           | "Your current run is blocked at a gate. Here is why and what to do."                 |
| Approvals | Pending approvals > 0 | "There are N pending approvals. Each requires your review before the run continues." |
| Sessions  | No sessions           | "You haven't run any sessions yet. Start on the Commands page."                      |
| Agents    | Agent has error       | "One or more agents have execution errors. Review the timeline for details."         |

---

## 4. Help Content Specification Per Page

### Commands Page

**Purpose:** Submit a new orchestration run in one of the supported command modes (CREATE, AUDIT, FEATURE, SCOPE_CHANGE, HOTFIX). Manage the active command queue.

**Core Actions:**

1. Submit a new command (with mode selection, project binding, and options)
2. View the current command queue
3. Cancel a queued command
4. View command history
5. Understand what each command mode does

**Key help topics to create:**

- "Command modes explained: CREATE vs AUDIT vs FEATURE vs SCOPE_CHANGE vs HOTFIX"
- "What happens after I submit a command?"
- "Why is my command queued rather than running?"
- "Prerequisites: workspace, project, and session state"

---

### Pipeline / Orchestrator Page

**Purpose:** Monitor and control the active orchestration run — phases, gates, agent transitions, and blocking conditions.

**Core Actions:**

1. View current phase and agent status
2. Pause or resume a run
3. Request an override for a failed gate
4. Understand what a gate is and why it failed

**Key help topics to create:**

- "Phases explained: PHASE_1 through PHASE_5"
- "What is a gate and how does it pass or fail?"
- "How to interpret agent confidence scores"
- "Pause vs. override vs. abandon"

---

### Sessions Page

**Purpose:** View all platform sessions — active and historical. A session is the complete lifecycle record for one orchestration run.

**Core Actions:**

1. Open a session to view its full timeline
2. Filter sessions by status, date, workspace
3. Export session artifacts
4. Resume an interrupted session

**Key help topics to create:**

- "Session lifecycle: created → running → completed/failed"
- "How sessions differ from commands"
- "Reading the session timeline"

---

### Agents Page

**Purpose:** View the agent catalog, current execution state, confidence history, and per-agent execution log.

**Core Actions:**

1. View agent phase assignment
2. Review execution history for a specific agent
3. Understand agent RBAC and tool permissions
4. Trigger a manual agent rerun (where allowed)

---

### Governance / Approvals Page

**Purpose:** Review, approve, or reject pending human-in-the-loop items: overrides, policy exceptions, gate bypass requests.

**Core Actions:**

1. See all pending approval items
2. Approve or reject with required justification
3. View related policy and risk context
4. See historical override decisions

**Key help topics to create:**

- "Why approvals exist and when they're required"
- "What happens if I reject an override?"
- "Emergency hotfix bypass: when should I use it?"
- "Audit implications of an approval decision"

---

## 5. Phased Implementation Plan

### Phase 1 — Infrastructure & Core Pages (Milestone: M-UX-1a)

**Goal:** Help API, help content data model, UI components, and content for the 5 most critical pages.

#### Epic 1.1 — Help Backend

- **Issue 1.1.1** — Create `HelpService` in `src/webapp/services/help-service.ts`
  - Loads `PageHelp` objects from static JSON/YAML config at startup
  - Methods: `getPageHelp(routeSlug)`, `getTopic(topicId)`, `search(query)`
  - Acceptance: service loads and returns help for 5 test pages
  - Effort: M (2 days)

- **Issue 1.1.2** — Implement `GET /api/v1/help/page/:routeSlug` in new `src/webapp/routes/help.ts`
  - Returns `PageHelp` JSON; 404 for unknown route
  - Acceptance: returns correct help for `/commands`, `/sessions`, `/approvals`
  - Effort: S (1 day)

- **Issue 1.1.3** — Implement `GET /api/v1/help/topic/:topicId` — serves full topic markdown as HTML
  - Renders content from `docs/help/` topic files
  - Acceptance: topic renders correctly; XSS-sanitized markdown output
  - Effort: S (1 day)

- **Issue 1.1.4** — Implement `GET /api/v1/help/search?q=...` — full-text search over all help content
  - Uses existing in-memory text index (no vector store needed for search at this stage)
  - Acceptance: "approval" returns Commands, Approvals, and Governance pages
  - Effort: M (2 days)

#### Epic 1.2 — Help UI Components

- **Issue 1.2.1** — Create `PageHelpStrip` React component: compact bar at top of page with purpose + action list
  - Collapsible, state stored in localStorage per page
  - Acceptance: renders on Commands, Sessions, Approvals pages; dismissible
  - Effort: M (2 days)

- **Issue 1.2.2** — Create `HelpDrawer` React component: slide-in panel with Layer 2 topic content
  - Triggered from "Learn more" link in `PageHelpStrip`
  - Renders topic markdown with table of contents
  - Acceptance: opens with correct topic; renders markdown correctly
  - Effort: M (2 days)

- **Issue 1.2.3** — Add help trigger to page layout: `?` icon in top navigation bar; tooltip "Help for this page"
  - Acceptance: globally mounted; works on all routes
  - Effort: S (1 day)

- **Issue 1.2.4** — Create `HelpSearch` component: search bar in `HelpDrawer` opened to search mode
  - Acceptance: typing "gate" returns matching pages and topics
  - Effort: S (1 day)

#### Epic 1.3 — Content: Priority 5 Pages

- **Issue 1.3.1** — Write help content: Commands page (`pageHelp.commands.json` + `docs/help/commands-modes.md`)
  - Effort: S (1 day)
- **Issue 1.3.2** — Write help content: Pipeline/Orchestrator page
  - Effort: S (1 day)
- **Issue 1.3.3** — Write help content: Sessions page
  - Effort: S (1 day)
- **Issue 1.3.4** — Write help content: Approvals/Governance page
  - Effort: M (1–2 days) — highest conceptual complexity
- **Issue 1.3.5** — Write help content: Agents page
  - Effort: S (1 day)

---

### Phase 2 — Full Coverage & State-Aware Help (Milestone: M-UX-1b)

**Goal:** Complete help content for all routes; add state-aware help variants.

#### Epic 2.1 — Remaining Pages

- **Issue 2.1.1** — Write help content: Policies page
- **Issue 2.1.2** — Write help content: Artifacts page
- **Issue 2.1.3** — Write help content: Audit Trail page
- **Issue 2.1.4** — Write help content: Questionnaires page
- **Issue 2.1.5** — Write help content: Workspaces page
- **Issue 2.1.6** — Write help content: Dashboard page
- **Issue 2.1.7** — Write help content: Administration page
- **Issue 2.1.8** — Write help content: Cockpit / Observability page
  - Effort per issue: S (0.5–1 day each)

#### Epic 2.2 — State-Aware Help

- **Issue 2.2.1** — Add `StateEvaluator` to `HelpService`: evaluates `HelpStateVariant` conditions against current session state
  - Acceptance: Commands page shows "no active workspace" warning when appropriate
  - Effort: M (2 days)

- **Issue 2.2.2** — Add state-aware variants for: Commands (no workspace), Pipeline (gate failed), Approvals (N pending), Agents (error state)
  - Acceptance: each variant tested with mocked state condition
  - Effort: M (2 days)

---

### Phase 3 — Chat Integration (Milestone: M-UX-3, after Domain 03)

**Goal:** Integrate help system with built-in chat: "Explain this page" button in ChatPanel.

- **Issue 3.1** — Add "Explain this page" button to `ChatPanel` that pre-fills a help query for the current route
  - Acceptance: chat responds with grounded page explanation drawn from `PageHelp` + topic content
  - Effort: S (1 day) — depends on Domain 03 Phase 1

- **Issue 3.2** — Link help topic content into RAG `help-topics` collection
  - Acceptance: chat queries can retrieve relevant help excerpts via semantic search
  - Effort: S (1 day) — depends on Domain 01 Phase 1

---

## 6. Milestones

### M-UX-1a — Help Foundation

- **Deliverables:** `HelpService`; help API endpoints; `PageHelpStrip` + `HelpDrawer` UI; help content for 5 priority pages
- **Exit criteria:** All 5 critical pages have contextual help; help is visible and functional in staging

### M-UX-1b — Full Help Coverage

- **Deliverables:** Help content for all 12 routes; state-aware help variants; full-text search
- **Exit criteria:** Every route returns a non-empty `PageHelp` from the API; state-aware help tested

---

## 7. Content Quality Standards

All help content must:

1. **Be concise** — Purpose: max 2 sentences; Core Actions: max 5 items
2. **Be specific** — reference actual platform terms (phases, gates, agents by name)
3. **Be role-aware** — note when admin/operator approval is required for an action
4. **Not duplicate** the full docs — help content is a guide, not a copy of documentation
5. **Stay current** — help content must be reviewed on every major UI change

---

## 8. Risks

| Risk                                         | Likelihood | Impact | Mitigation                                                   |
| -------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Help content becomes stale after UI changes  | High       | Medium | Add help content review to PR checklist for UI route changes |
| State-aware help produces incorrect guidance | Medium     | High   | State evaluation tests in CI; conservative conditions        |
| Users ignore inline help                     | Medium     | Low    | User testing; A/B test expanded vs collapsed default state   |
| XSS in markdown rendering                    | Low        | High   | Sanitize markdown output with DOMPurify before rendering     |

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] Two-layer help architecture documented
- [x] Content model with TypeScript types defined
- [x] Per-page content specification for 5 priority pages
- [x] State-aware help variants designed
- [x] Chat integration dependency on Domain 03 documented
- [x] Content quality standards explicit
- [x] Security: XSS risk for markdown rendering noted
- [x] Deliverable written to file
