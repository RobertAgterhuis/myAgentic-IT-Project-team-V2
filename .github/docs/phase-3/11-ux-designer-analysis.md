# UX Designer Analysis — CREATE Mode

> **Agent:** 11-ux-designer  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 1 of 4 (Analysis)  
> **Created:** 2026-03-10T06:45:00Z  
> **Mode:** CREATE  
> **Project:** MYAGENTIC-IT-PROJECT-TEAM-V2

---

## EXECUTIVE SUMMARY

This UX Designer analysis translates the UX Researcher's behavioral insights
into concrete interaction design patterns, information architecture, and
low-fidelity wireframes for the Agentic SDLC Platform Command Center.

**Key Design Decisions:**

1. **3-column layout** for persistent context (command menu, main canvas,
   insights panel)
2. **Progressive disclosure** for complexity management (3 layers: sprint,
   agent, detail)
3. **Real-time updates** via WebSocket for all status changes
4. **Contextual actions** embedded in each entity card/row
5. **Unified design language** across all 8 screens with consistent navigation
   patterns

**Primary Design Goal:** Enable solo founders and small technical teams to
orchestrate complex multi-agent workflows without requiring extensive training
or documentation lookup.

**Design Artifacts Produced:**

- Information Architecture (IA) hierarchy for all 8 screens
- Wireframe specifications (ASCII + annotations) for all core workflows
- Interaction patterns library (12 patterns)
- Navigation model with breadcrumb strategy
- State management for asynchronous agent operations

---

## 1. INFORMATION ARCHITECTURE

### 1.1 Global IA Hierarchy

```
Command Center (root)
├── Dashboard (main entry)
│   ├── Active Sprint Overview
│   ├── Phase Status Cards (4)
│   ├── Recent Activity Feed
│   └── Quick Actions Menu
├── Questionnaires TAB
│   ├── Questionnaire List (by phase)
│   ├── Questionnaire Detail View
│   │   ├── Question Groups
│   │   ├── Answer Input Forms
│   │   └── Validation Feedback
│   └── Answer History Log
├── Decisions TAB
│   ├── Decision Timeline (chronological)
│   ├── Decision Detail Modal
│   │   ├── Context & Rationale
│   │   ├── Impact Analysis
│   │   └── Edit/Archive Controls
│   └── Create Decision Form
├── Synthesis TAB
│   ├── Master Report Viewer
│   ├── Department Report Selector (4)
│   ├── Cross-Team Blocker Matrix
│   └── Export Options
├── Analytics TAB
│   ├── Velocity Chart (sprint completion)
│   ├── Agent Performance Table
│   ├── Error Rate Graph
│   └── Time-to-Complete Metrics
├── Official Documents TAB
│   ├── Document Registry Table
│   ├── Document Detail Viewer
│   │   ├── Completeness Progress Bar
│   │   ├── Source Questionnaires Link
│   │   └── Version History
│   └── Download/Export Controls
├── Session State TAB
│   ├── JSON Viewer (formatted)
│   ├── Phase Progress Visualization
│   ├── Agent Status Table
│   └── Edit/Recover Controls
└── Help TAB
    ├── Help Article Browser
    ├── Search Interface
    ├── Article Detail Viewer
    └── Feedback Form
```

**Source:** UX Researcher journey mapping (sec 3.2), Software Architect UI
requirements (phase-2/05)

### 1.2 Screen-Level IA

#### Screen 1: Dashboard

**Purpose:** Single-pane-of-glass overview; primary entry point after
login/navigation  
**Layout:** 3-column responsive grid  
**Content Zones:**

1. **Left Sidebar (20% width):**
   - Project name + mode badge (CREATE/AUDIT)
   - Tab navigation (8 tabs)
   - Active sprint indicator
   - Command queue status (polling)

2. **Main Canvas (55% width):**
   - Sprint status card (current sprint, progress, ETA)
   - Phase cards (4 cards in 2x2 grid):
     - Phase name + agent count
     - Status icon (not_started, in_progress, completed, blocked)
     - Completed agents / total agents
     - Next agent name + ETA
     - CTA: "View Details"
   - Recent activity feed (last 10 events, real-time)
     - Event type icon
     - Timestamp (relative: "2 min ago")
     - Agent name
     - Action summary
     - Link to artifact

3. **Right Insights Panel (25% width):**
   - Quick actions menu (6 buttons):
     - CREATE [scope]
     - REEVALUATE
     - FEATURE
     - SCOPE CHANGE
     - Refresh Onboarding
     - HALT
   - Open blocker count (filterable by severity)
   - Questionnaire completion %
   - Official docs completeness %
   - Link to session-state.json

**Interaction Pattern:** Dashboard is READ-ONLY; all mutation actions open
modals or navigate to dedicated tabs.

**Source:** UX Researcher Rec-01 (single pane), Software Architect screen spec
(phase-2/05 sec 5.1)

---

#### Screen 2: Questionnaires Tab

**Purpose:** Answer required questions, review existing answers, track
questionnaire completion  
**Layout:** Master-detail with collapsible sidebar  
**Content Zones:**

1. **Master List (30% width, collapsible):**
   - Group by phase (accordion):
     - Phase 1 — Business (N questionnaires)
     - Phase 2 — Tech (N questionnaires)
     - Phase 3 — UX (N questionnaires)
     - Phase 4 — Marketing (N questionnaires)
   - Per questionnaire:
     - Filename (clickable)
     - Status badge (COMPLETE / PARTIAL / OPEN)
     - Required question count
     - Answered count
     - Last updated timestamp
   - Filter controls:
     - Show only incomplete
     - Show only REQUIRED questions

2. **Detail View (70% width):**
   - Questionnaire header:
     - Full filename
     - Generated date
     - Completeness progress bar (answered / total)
   - Question list (vertical stack):
     - Question ID (Q-PH1-BA-001)
     - Question text (markdown rendered)
     - Priority badge (REQUIRED / OPTIONAL)
     - Answer status icon (✓ answered, ⚠ insufficient, ✗ unanswered)
     - Answer input field:
       - For unanswered: Textarea with Save button
       - For answered: Read-only text with Edit button
     - Validation feedback (real-time for secrets detection)
     - Source agent link (which agent requested this)
   - Sticky footer:
     - "Mark as Complete" button (disabled if REQUIRED unanswered)
     - "Export Answers" button (CSV/JSON)

**Interaction Pattern:**

- Click question ID → expand/collapse answer area
- Type in answer → auto-save after 2s debounce
- Secret detected → red warning + auto-clear recommendation
- Save → POST /api/questionnaires/answer → SSE event → Dashboard activity feed
  update

**Source:** Questionnaire Guardrail G-QUEST-20 (no secrets), UX Researcher
Rec-02 (visibility of progress)

---

#### Screen 3: Decisions Tab

**Purpose:** Create, review, and archive architectural/strategic decisions with
full context  
**Layout:** Timeline + modal overlay  
**Content Zones:**

1. **Main Timeline (100% width when no modal):**
   - Chronological descending (newest first)
   - Per decision card:
     - Decision ID (DEC-001)
     - Title (one-liner summary)
     - Status badge (PROPOSED / DECIDED / DEFERRED / REVERTED)
     - Date (ISO 8601, formatted as "Mar 10, 2026")
     - Scope (e.g., "Phase 2 — Architecture")
     - Abstracted impact (one sentence)
     - Tags (auto-extracted from scope + referenced sprint)
     - Action buttons: View Details, Edit, Archive
   - Filter controls (top):
     - Status multi-select
     - Scope dropdown (All / Phase 1-4 / Sprint SP-N)
     - Search by keyword
   - Create Decision button (sticky top-right)

2. **Decision Detail Modal (overlay, 60% viewport width):**
   - Header:
     - Decision ID + Title (editable)
     - Status dropdown (editable)
     - Close X
   - Body (scrollable):
     - **Context:** Markdown editor, 500 char min
     - **Reason:** Markdown editor, 200 char min
     - **Referenced story/PR:** Searchable dropdown (from sprint plan)
     - **Impact on future sprints:** Markdown editor, 300 char min
     - **Tags:** Tag input (comma-separated, auto-suggest)
   - Footer:
     - Save button (disabled if validation fails)
     - Delete button (confirmation required)
     - Cancel button

**Interaction Pattern:**

- Click "View Details" → open modal with pre-filled data (read-only if DECIDED,
  editable if PROPOSED)
- Click "Edit" → open modal in edit mode
- Click "Create Decision" → open blank modal
- Save → POST /api/decisions → write to decisions.md → SSE event → refresh
  timeline
- Archive → soft delete (status = ARCHIVED, not deleted from decisions.md)

**Validation Rules:**

- Title: 10-100 chars
- Context: 500 char min
- Reason: 200 char min
- Impact: 300 char min
- No secrets detected in any field

**Source:** Legal Counsel guardrail (phase-2/33 sec 6), Orchestrator ORC-21
(breaking change doc)

---

#### Screen 4: Synthesis Tab

**Purpose:** View final synthesis reports, blocker matrix, and export
consolidated deliverables  
**Layout:** Tabbed content viewer with sidebar navigation  
**Content Zones:**

1. **Report Selector Sidebar (25% width):**
   - Radio button list:
     - ● Master Report
     - ○ Business Department Report
     - ○ Tech Department Report
     - ○ UX Department Report
     - ○ Marketing Department Report
     - ○ Cross-Team Blocker Matrix
   - Export All button (ZIP)
   - Refresh Synthesis button (re-run Synthesis Agent)

2. **Report Viewer (75% width):**
   - For markdown reports:
     - Rendered markdown with syntax highlighting
     - Table of contents (sticky left, generated from ## headers)
     - Anchor links for all sections
     - Copy-to-clipboard button per code block
   - For blocker matrix:
     - Filterable table:
       - Columns: Blocker ID, Owning Team, Dependent Team, Type
         (BLOCKING/ADVISORY), Status, Sprint Linked
       - Row actions: Link to Sprint, Mark Resolved
     - Group by: Owning Team / Dependent Team / Type
   - Footer:
     - Download as PDF (if available)
     - Download as Markdown (raw file)
     - Last generated timestamp

**Interaction Pattern:**

- Click report in sidebar → load and render in viewer
- Click TOC anchor → scroll to section
- Filter blocker matrix → client-side JS filter (no reload)
- Export All → GET /api/synthesis/export → download ZIP
- Refresh Synthesis → confirm modal → POST /api/synthesis/regenerate → SSE
  progress → reload on complete

**Conditional Rendering:**

- If `session-state.json.synthesis === null` → show placeholder: "Synthesis not
  yet available. Complete all 4 phases first."
- If partial cycle (BUSINESS only) → show only Business Department Report
- If blocker matrix empty → show success message: "No cross-team blockers
  detected."

**Source:** Synthesis Agent contract (synthesis-output-contract.md), UX
Researcher Rec-03 (export)

---

#### Screen 5: Analytics Tab

**Purpose:** Visualize sprint velocity, agent performance, error rates, and
time-to-complete metrics  
**Layout:** Dashboard grid (2x2 chart layout)  
**Content Zones:**

1. **Velocity Chart (top-left, 50% width):**
   - Line chart: X = sprint ID, Y = stories completed
   - Data points: completed stories per sprint (from retrospectives)
   - Trend line (linear regression)
   - Tooltip on hover: sprint ID, completed count, blocked count, duration in
     days
   - Download CSV button

2. **Agent Performance Table (top-right, 50% width):**
   - Sortable table:
     - Columns: Agent Name, Total Runs, Avg Duration (sec), Error Count, Last
       Run
   - Data source: analytics-events.json → filter by agent_name
   - Pagination (20 rows per page)
   - Click agent name → drill-down modal with event timeline

3. **Error Rate Graph (bottom-left, 50% width):**
   - Bar chart: X = date (daily buckets), Y = error count
   - Data source: analytics-events.json → filter event_type = "error"
   - Color-coded by severity (if available)
   - Click bar → show error detail modal (error message, stack trace, timestamp)

4. **Time-to-Complete Metrics (bottom-right, 50% width):**
   - KPI cards (3 cards stacked):
     - Avg sprint duration (days)
     - Avg phase duration (days)
     - Total project duration so far (days)
   - Data source: session-state.json + retrospectives
   - Comparison to previous sprint (% change, up/down arrow)

**Interaction Pattern:**

- All charts auto-refresh every 60s via polling GET /api/analytics
- Click chart element → drill-down modal
- Download CSV → client-side export from chart data

**Data Integrity Note:**

- If analytics-events.json is missing/empty → show placeholder: "No analytics
  data yet. Start a sprint to collect metrics."
- If < 2 sprints completed → velocity trend line not shown (insufficient data)

**Source:** KPI Agent contract (kpi-output-contract.md), UX Researcher Rec-04
(progress visibility)

---

#### Screen 6: Official Documents Tab

**Purpose:** Track completeness of 8 core official documents, view content,
export for stakeholders  
**Layout:** Table + detail viewer side-by-side  
**Content Zones:**

1. **Document Registry Table ( 40% width):**
   - Columns:
     - Document Name (clickable)
     - Completeness % (progress bar)
     - Last Updated (relative timestamp)
     - Source Questionnaires (count, clickable)
     - Status badge (COMPLETE / IN_PROGRESS / NOT_STARTED)
   - Sort by: Name, Completeness %, Last Updated
   - Filter by: Status
   - Total completeness % (weighted average) in header

2. **Document Detail Viewer (60% width):**
   - Header:
     - Document filename
     - Completeness progress bar
     - Download Markdown button
     - Link to source questionnaires (opens Questionnaires tab pre-filtered)
   - Body:
     - Rendered markdown content
     - Sections with completeness indicator:
       - ✓ Section complete
       - ⚠ Section partial (has INSUFFICIENT_DATA markers)
       - ✗ Section empty
   - Version history (collapsible):
     - List of git commits affecting this file
     - Commit hash (short), author, date, message
     - Click commit → diff view

**Interaction Pattern:**

- Click document name in table → load in detail viewer
- Click source questionnaires count → navigate to Questionnaires tab with filter
  applied
- Download → GET /api/documents/{filename} → save as .md
- If document not yet created → show placeholder: "This document will be
  generated after Phase N is complete."

**Document List (8 total):**

1. `product-vision.md` (Phase 1)
2. `financial-model-overview.md` (Phase 1)
3. `technical-overview.md` (Phase 2)
4. `legal-compliance-overview.md` (Phase 2)
5. `ux-design-brief.md` (Phase 3)
6. `content-strategy-brief.md` (Phase 3)
7. `brand-brief.md` (Phase 4)
8. `market-positioning.md` (Phase 4)

**Completeness Calculation:**

- Parse markdown for `INSUFFICIENT_DATA:` markers
- Count sections (## headers)
- Completeness % = (sections without INSUFFICIENT_DATA / total sections) \* 100

**Source:** Questionnaire Guardrail G-QUEST-40 (official doc gate),
Questionnaire Agent contract (questionnaire-output-contract.md sec 4)

---

#### Screen 7: Session State Tab

**Purpose:** Inspect, edit (power users), and recover session-state.json;
visualize phase/agent progress  
**Layout:** Split view (JSON editor + visual progress)  
**Content Zones:**

1. **JSON Editor (50% width):**
   - Syntax-highlighted JSON viewer
   - Collapsible sections (phases, agents, sprint_backlog)
   - Edit mode toggle (disabled by default, requires confirmation)
   - Validation feedback:
     - Schema errors highlighted inline
     - Required fields missing → red underline
     - Invalid enum values → yellow warning
   - Save button (POST /api/session/update)
   - Revert button (reload from file)
   - Download button (save current JSON to disk)

2. **Visual Progress (50% width):**
   - **Phase Progress:**
     - 4 vertical swimlanes (Phase 1-4)
     - Per phase:
       - Phase status badge
       - Agent list (vertical stack):
         - Agent name
         - Status icon (✓ completed, ⏳ in-progress, ⏸ not-started)
         - Duration (if completed)
   - **Sprint Progress:**
     - Horizontal timeline (if Phase 5 started)
     - Per sprint:
       - Sprint ID
       - Status (COMPLETE / IN_PROGRESS / PLANNED / BLOCKED)
       - Story count (completed / total)
       - Duration (planned vs actual)
   - **Escalations & Blockers:**
     - Count badges
     - Click → expand list with details

**Interaction Pattern:**

- Load page → GET /api/session → render JSON + visual
- Toggle edit mode → confirm modal ("Editing session state can break the
  workflow. Proceed?")
- Edit JSON → validate on blur → show errors inline
- Save → POST /api/session/update → validate schema server-side → write to file
  → git commit → SSE event
- If validation fails → rollback + show error modal

**Power User Features:**

- Manual phase override (change `current_phase`, `current_agent`)
- Add custom `blocking_items`
- Modify `questionnaire_answer_summary` (danger: can cause inconsistency)

**Safety Rails:**

- Read-only mode by default
- Confirm modal on edit toggle
- Server-side schema validation (session-state-contract.md)
- Git commit on every save (audit trail)
- SSE broadcast to all connected clients (so Dashboard updates immediately)

**Source:** Session State Contract (session-state-contract.md), Orchestrator
ORC-09 (session recovery)

---

#### Screen 8: Help Tab

**Purpose:** Searchable help documentation, playbook explanations, escalation
contact  
**Layout:** Sidebar + article viewer  
**Content Zones:**

1. **Help Sidebar (30% width):**
   - Search input (full-text search across all .md files in .github/help/)
   - Category tree (collapsible):
     - Getting Started
     - Phase Guides (1-5)
     - Agent Reference
     - Troubleshooting
     - FAQ
   - Per article in category:
     - Article title
     - Last updated date
     - Click → load in viewer

2. **Article Viewer (70% width):**
   - Rendered markdown
   - Breadcrumb nav (Category > Article)
   - Table of contents (sticky left, auto-generated)
   - Copy-to-clipboard for code blocks
   - "Was this helpful?" feedback buttons (Yes/No)
   - "Report a problem" link (opens feedback form)

3. **Feedback Form Modal:**
   - What were you trying to do? (textarea)
   - What went wrong? (textarea)
   - Current screen (auto-filled from context)
   - Session ID (auto-filled from session-state.json)
   - Submit → POST /api/help/feedback → write to
     .github/docs/feedback/[timestamp].md

**Interaction Pattern:**

- Search → client-side filter of help article metadata (title + first paragraph)
- Click article → GET /api/help/{article-id} → render markdown
- Click feedback Yes → log event to analytics
- Click feedback No → open feedback form
- Submit feedback → write to file → SSE event → thank you confirmation

**Help Article List (seed content):**

1. "What is CREATE vs AUDIT mode?"
2. "How do I answer a questionnaire?"
3. "What does INSUFFICIENT_DATA mean?"
4. "How to resolve a BLOCKING item?"
5. "Understanding the Critic + Risk validation"
6. "What is a scope change?"
7. "How to execute a HOTFIX?"
8. "Sprint Gate: Definition of Ready checklist"
9. "How to interpret the Cross-Team Blocker Matrix?"
10. "Troubleshooting: Agent stuck in IN_PROGRESS"

**Source:** UX Researcher Rec-06 (help + search), Software Architect UI spec
(phase-2/05 sec 5.8)

---

## 2. WIREFRAME SPECIFICATIONS

### 2.1 Dashboard Wireframe (Screen 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [ AGENTIC SDLC PLATFORM ]          [CREATE MODE]       [User: Solo Founder] │
├──────────────┬──────────────────────────────────────────┬───────────────────┤
│              │                                          │                   │
│  PROJECT     │  CURRENT SPRINT: SP-1                    │  QUICK ACTIONS    │
│  MyAgentic   │  ████████░░░░░░░░ 45% (5/11 stories)     │                   │
│              │  ETA: Mar 15, 2026                       │  [CREATE]         │
│  📊 Dashboard│                                          │  [REEVALUATE]     │
│  📋 Question │  PHASE STATUS                            │  [FEATURE]        │
│  ⚖️ Decisions│  ┌──────────┐ ┌──────────┐              │  [SCOPE CHANGE]   │
│  📄 Synthesi │  │ PHASE 1  │ │ PHASE 2  │              │  [REFRESH ONBRD]  │
│  📈 Analytic │  │ Business │ │ Tech     │              │  [HALT]           │
│  📚 Official │  │ ✓ DONE   │ │ ✓ DONE   │              │                   │
│  ⚙️ Session  │  │ 5/5 agnt │ │ 6/6 agnt │              │  BLOCKERS         │
│  ❓ Help     │  └──────────┘ └──────────┘              │  🔴 Critical: 0   │
│              │  ┌──────────┐ ┌──────────┐              │  🟡 Warning: 2    │
│              │  │ PHASE 3  │ │ PHASE 4  │              │                   │
│     SP-1 ●   │  │ UX       │ │ Marketing│              │  QUESTIONNAIRES   │
│              │  │ ⏳ IN-PR │ │ ⏸ WAIT   │              │  ██████████ 100%  │
│              │  │ 2/6 agnt │ │ 0/3 agnt │              │  9/9 answered     │
│              │  └──────────┘ └──────────┘              │                   │
│              │                                          │  OFFICIAL DOCS    │
│              │  RECENT ACTIVITY                         │  ████░░░░░░ 52%   │
│              │  ┌────────────────────────────────────┐  │  4/8 complete     │
│              │  │ ⏰ 2 min ago                        │  │                   │
│              │  │ 🎨 UX Designer completed wireframes │  │  [Session State]  │
│              │  │ 📄 View: 11-ux-designer-analysis.md │  │                   │
│              │  ├────────────────────────────────────┤  │                   │
│              │  │ ⏰ 15 min ago                       │  │                   │
│              │  │ 🔍 UX Researcher found 5 gaps       │  │                   │
│              │  │ 📄 View: 10-ux-researcher-analysis  │  │                   │
│              │  ├────────────────────────────────────┤  │                   │
│              │  │ ⏰ 1 hour ago                       │  │                   │
│              │  │ ✅ Phase 2 validation passed        │  │                   │
│              │  │ 📄 View: critic-risk-validation.md  │  │                   │
│              │  └────────────────────────────────────┘  │                   │
│              │                                          │                   │
└──────────────┴──────────────────────────────────────────┴───────────────────┘
```

**Annotations:**

- **Header:** Fixed, always visible; project name left, mode badge center, user
  profile right
- **Left Sidebar:** Sticky scroll; tab icons + labels; active sprint indicator
  at bottom
- **Phase Cards:** Hover → show tooltip with next agent name + ETA
- **Activity Feed:** Real-time SSE updates; click item → navigate to file/tab
- **Quick Actions:** Buttons trigger modals (except HALT → confirm modal +
  immediate action)
- **Progress Bars:** Animated on change; click → navigate to detail view

**Responsive Behavior:**

- < 1024px: Right panel collapses to bottom
- < 768px: Tabs move to hamburger menu

**Source:** UX Researcher journey step 1 (entry & orientation)

---

### 2.2 Questionnaires Detail Wireframe (Screen 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QUESTIONNAIRES                               [Filter: ☐ Only Incomplete]     │
├────────────────────┬────────────────────────────────────────────────────────┤
│                    │                                                        │
│ Phase 1 — Business │ QUESTIONNAIRE: phase1-business-questionnaire-answers.md│
│ ▼ (2 files)        │ Generated: 2026-03-09  Completeness: ████████████ 100%│
│  ✓ phase1-business │                                                        │
│  ⚠ phase1-finance  │ ┌──────────────────────────────────────────────────┐  │
│                    │ │ Q-PH1-BA-001 [REQUIRED]                         ✓│  │
│ Phase 2 — Tech     │ │ What is the primary revenue model?               │  │
│ ▶ (3 files)        │ │                                                  │  │
│                    │ │ Answer (locked):                                 │  │
│ Phase 3 — UX       │ │ "Freemium SaaS with usage-based pricing tiers." │  │
│ ▶ (1 file)         │ │ Answered: 2026-03-09T10:30:00Z                   │  │
│                    │ │ Source: Business Analyst (01)                    │  │
│ Phase 4 — Marketin │ │ [Edit]                                           │  │
│ ▶ (0 files)        │ └──────────────────────────────────────────────────┘  │
│                    │                                                        │
│ [Collapse All]     │ ┌──────────────────────────────────────────────────┐  │
│                    │ │ Q-PH1-BA-002 [OPTIONAL]                         ✓│  │
│                    │ │ What is the expected customer lifetime value?   │  │
│                    │ │                                                  │  │
│                    │ │ Answer (locked):                                 │  │
│                    │ │ "$2400 over 24 months (based on $100/mo avg)"   │  │
│                    │ │ [Edit]                                           │  │
│                    │ └──────────────────────────────────────────────────┘  │
│                    │                                                        │
│                    │ ┌──────────────────────────────────────────────────┐  │
│                    │ │ Q-PH1-BA-003 [REQUIRED]                         ✗│  │
│                    │ │ What compliance requirements apply?              │  │
│                    │ │                                                  │  │
│                    │ │ ┌──────────────────────────────────────────────┐ │  │
│                    │ │ │ Type your answer here...                     │ │  │
│                    │ │ │                                              │ │  │
│                    │ │ │                                              │ │  │
│                    │ │ └──────────────────────────────────────────────┘ │  │
│                    │ │ [Save Answer]                                    │  │
│                    │ └──────────────────────────────────────────────────┘  │
│                    │                                                        │
├────────────────────┴────────────────────────────────────────────────────────┤
│ [Mark as Complete] (disabled)  [Export Answers ↓]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**

- **Master List:** Accordion by phase; badge shows completeness status
- **Question Cards:** Expandable; REQUIRED badge is red, OPTIONAL is gray
- **Answer Input:** Auto-save 2s after typing stops; validation feedback below
  textarea
- **Edit Button:** Unlocks locked answer for editing
- **Footer:** Sticky; "Mark as Complete" enabled only when all REQUIRED answered
- **Secret Detection:** If answer contains "password", "api_key" etc → red
  warning: "⚠ Secret detected. Remove before saving."

**Source:** Questionnaire Guardrail G-QUEST-20 (no secrets), UX Researcher
journey step 2 (answer questions)

---

### 2.3 Decisions Timeline Wireframe (Screen 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DECISIONS                    [+ Create Decision]                            │
│ [Status: All ▼] [Scope: All ▼] [Search: _____________]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ DEC-003  |  DECIDED  |  Mar 10, 2026  |  Phase 3 — UX                │   │
│ │ Use React + TypeScript for Command Center UI                          │   │
│ │ Impact: Requires TypeScript skill in Implementation Agent             │   │
│ │ Tags: tech-stack, frontend, typescript                                │   │
│ │ [View Details] [Edit]                                                 │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ DEC-002  |  DECIDED  |  Mar 09, 2026  |  Phase 2 — Architecture       │   │
│ │ WebSocket for real-time updates instead of polling                    │   │
│ │ Impact: Implementation Agent must implement WS server + client        │   │
│ │ Tags: real-time, websocket, architecture                              │   │
│ │ [View Details] [Edit]                                                 │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ DEC-001  |  PROPOSED  |  Mar 08, 2026  |  Phase 1 — Business          │   │
│ │ Target developer experience (DX) as primary metric                    │   │
│ │ Impact: UX decisions prioritize DX over visual polish                │   │
│ │ Tags: strategy, dx, metrics                                           │   │
│ │ [View Details] [Edit] [Archive]                                       │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Decision Detail Modal (triggered by "View Details"):**

```
┌─────────────────────────────────────────────────────────────────────┐
│ DECISION DETAIL                                              [X]    │
├─────────────────────────────────────────────────────────────────────┤
│ DEC-003: Use React + TypeScript for Command Center UI              │
│ Status: [DECIDED ▼]                                                 │
│                                                                     │
│ Context:                                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ The UX Designer and UI Designer both recommend React for its   │ │
│ │ component reusability and ecosystem maturity. TypeScript is     │ │
│ │ chosen for type safety in a multi-agent codebase where agents   │ │
│ │ may generate code independently.                                │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Reason:                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Type safety prevents runtime errors in SSE handling and API     │ │
│ │ integration. React's declarative model simplifies state mgmt.   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Referenced Story/PR: [SP-1-003 ▼]                                   │
│                                                                     │
│ Impact on Future Sprints:                                           │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Implementation Agent MUST use TypeScript. No plain JS files.    │ │
│ │ All new components must follow React 18 patterns (hooks).       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Tags: tech-stack, frontend, typescript                             │
│                                                                     │
│ [Save] [Delete] [Cancel]                                            │
└─────────────────────────────────────────────────────────────────────┘
```

**Source:** Orchestrator ORC-21 (breaking change doc), Legal Counsel audit trail
requirement (phase-2/33)

---

### 2.4 Synthesis Report Viewer Wireframe (Screen 4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SYNTHESIS REPORTS                                [Export All ↓]  [Refresh] │
├────────────────┬────────────────────────────────────────────────────────────┤
│                │                                                            │
│ ● Master Report│ # FINAL REPORT — MASTER (EXECUTIVE SUMMARY)               │
│ ○ Business     │                                                            │
│ ○ Tech         │ ## 1. Solution Blueprint Heatmap                           │
│ ○ UX           │                                                            │
│ ○ Marketing    │ | Dimension | Maturity | Risks | Blockers | Readiness |   │
│ ○ Blocker Matr │ |-----------|----------|-------|----------|-----------|   │
│                │ | Business  | HIGH     | 2     | 0        | ✓ READY   |   │
│ [Download PDF] │ | Tech      | HIGH     | 3     | 0        | ✓ READY   |   │
│ [Download MD]  │ | UX        | MEDIUM   | 6     | 2        | ⚠ RISKS   |   │
│                │ | Marketing | LOW      | 4     | 0        | ✓ READY   |   │
│                │                                                            │
│                │ ## 2. Risk Matrix                                          │
│                │                                                            │
│                │ ### 2.1 CRITICAL Risks                                     │
│                │                                                            │
│                │ - **RISK-UX-001:** User testing not conducted              │
│                │   - Mitigation: Schedule usability testing in Sprint 2     │
│                │   - Owner: UX Researcher                                   │
│                │   - Linked Story: SP-2-004                                 │
│                │                                                            │
│ TABLE OF       │ ### 2.2 HIGH Risks                                         │
│ CONTENTS       │                                                            │
│ ─────────      │ - **RISK-SEC-002:** Third-party dependencies unaudited     │
│ 1. Blueprint   │   - Mitigation: Run npm audit + Snyk scan in Sprint 1      │
│ 2. Risk Matrix │   - Owner: Security Architect                              │
│ 3. Roadmap     │   - Linked Story: SP-1-008                                 │
│ 4. Guardrails  │                                                            │
│ 5. KPIs        │ ## 3. Roadmap                                              │
│ 6. Open Items  │                                                            │
│                │ Sprint 1 (Mar 10-17): Foundation setup (11 stories)        │
│                │ Sprint 2 (Mar 18-25): Core features (9 stories)            │
│                │ Sprint 3 (Mar 26-Apr 2): Polish + testing (7 stories)      │
│                │                                                            │
│                │ [Scroll for more...]                                       │
│                │                                                            │
├────────────────┴────────────────────────────────────────────────────────────┤
│ Last Generated: 2026-03-10T06:30:00Z  |  Source: Synthesis Agent (17)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cross-Team Blocker Matrix View (when selected):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CROSS-TEAM BLOCKER MATRIX                           [Group by: Type ▼]     │
│ [Filter: All ▼]  [Status: All ▼]                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Blocker ID  Owning Team  Dependent Team  Type      Status      Sprint      │
│ ───────────────────────────────────────────────────────────────────────────│
│ BLK-001     Tech         UX              BLOCKING   OPEN        SP-1-003    │
│   "API schema must be finalized before wireframes can be validated"        │
│   [Link to Sprint] [Mark Resolved]                                         │
│                                                                             │
│ BLK-002     UX           Marketing       ADVISORY   OPEN        SP-2-001    │
│   "Brand colors should align with accessibility guidelines"                │
│   [Link to Sprint] [Mark Resolved]                                         │
│                                                                             │
│ ───────────────────────────────────────────────────────────────────────────│
│ Showing 2 of 2 blockers                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Source:** Synthesis output contract (synthesis-output-contract.md), UX
Researcher Rec-03 (export)

---

### 2.5 Analytics Dashboard Wireframe (Screen 5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ANALYTICS                                          [Auto-refresh: ON • 60s] │
├──────────────────────────────────────┬──────────────────────────────────────┤
│                                      │                                      │
│  VELOCITY CHART                      │  AGENT PERFORMANCE                   │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ 15 ┤                        ●  │  │  │ Agent          Runs  Avg  Err  │ │
│  │ 12 ┤                  ●        │  │  │ ─────────────────────────────── │ │
│  │  9 ┤            ●              │  │  │ Business Analy  1   45s   0    │ │
│  │  6 ┤      ●                    │  │  │ UX Researcher   1   120s  0    │ │
│  │  3 ┤ ●                         │  │  │ UX Designer     1   180s  0    │ │
│  │  0 └┬────┬────┬────┬────┬────┐ │  │  │ Critic Agent    2   30s   0    │ │
│  │     SP-1 SP-2 SP-3 SP-4 SP-5  │  │  │ Risk Agent      2   25s   0    │ │
│  │                                │  │  │ [Sort by Runs ▼]               │ │
│  │  [Download CSV]                │  │  │ Page 1 of 2                    │ │
│  └────────────────────────────────┘  │  └────────────────────────────────┘ │
│                                      │                                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│                                      │                                      │
│  ERROR RATE GRAPH                    │  TIME-TO-COMPLETE METRICS            │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐ │
│  │  8 ┤                           │  │  │ AVG SPRINT DURATION              │ │
│  │  6 ┤  █                        │  │  │ 7.2 days  ▼ 5% vs last sprint   │ │
│  │  4 ┤  █  █                     │  │  ├────────────────────────────────┤ │
│  │  2 ┤  █  █     █               │  │  │ AVG PHASE DURATION               │ │
│  │  0 └┬───┬───┬───┬───┬───┬─────┐ │  │  │ 2.1 days  ▲ 10% vs last phase  │ │
│  │    3/8 3/9 3/10 3/11 3/12      │  │  ├────────────────────────────────┤ │
│  │                                │  │  │ TOTAL PROJECT DURATION           │ │
│  │  Click bar for details         │  │  │ 14 days (ongoing)                │ │
│  └────────────────────────────────┘  │  └────────────────────────────────┘ │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

**Source:** KPI Agent contract, UX Researcher Rec-04 (progress visibility)

---

### 2.6 Official Documents Wireframe (Screen 6)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OFFICIAL DOCUMENTS                       Total Completeness: ██████ 62%    │
│ [Sort: Completeness ▼]  [Filter: All ▼]                                     │
├──────────────────────┬──────────────────────────────────────────────────────┤
│                      │                                                      │
│ Document Name        │ DOCUMENT: product-vision.md                          │
│ ─────────────────    │ Completeness: ██████████ 100%  Last Updated: 3/9    │
│                      │                                                      │
│ ✓ product-vision.md  │ # PRODUCT VISION                                     │
│   ██████████ 100%    │                                                      │
│   3/9 · 4 sources    │ ## 1. Purpose                                        │
│                      │ ✓ [COMPLETE]                                         │
│ ✓ financial-model... │ Enable solo founders and small technical teams to... │
│   ██████████ 100%    │                                                      │
│                      │ ## 2. Target Customer                                │
│ ⚠ technical-overview │ ✓ [COMPLETE]                                         │
│   ████░░░░░░ 45%     │ - Solo technical founders (ICP)                      │
│                      │ - Small dev teams (2-5 people)                       │
│ ✗ legal-compliance.. │                                                      │
│   ░░░░░░░░░░ 0%      │ ## 3. Core Value Proposition                         │
│                      │ ✓ [COMPLETE]                                         │
│ ⚠ ux-design-brief.md │ Reduce time-to-production for greenfield projects...│
│   ██████░░░░ 68%     │                                                      │
│                      │ ## 4. Success Metrics                                │
│ ✗ content-strategy.. │ ⚠ [PARTIAL - INSUFFICIENT_DATA]                      │
│   ░░░░░░░░░░ 0%      │ - Adoption rate: INSUFFICIENT_DATA: market research  │
│                      │ - Revenue target: $50k MRR by month 6                │
│ ✗ brand-brief.md     │                                                      │
│   ░░░░░░░░░░ 0%      │ [Source Questionnaires: 4 files] [Download MD]      │
│                      │                                                      │
│ ✗ market-positioning │ ┌────────────────────────────────────────────────┐   │
│   ░░░░░░░░░░ 0%      │ │ VERSION HISTORY                                │   │
│                      │ │ a3f4c21  Robert  3/9  "Add product vision doc" │   │
│ [Download All]       │ │ b7e8d32  Robert  3/8  "Initial commit"         │   │
│                      │ └────────────────────────────────────────────────┘   │
│                      │                                                      │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

**Source:** Questionnaire Agent contract, Guardrail G-QUEST-40 (official doc
gate)

---

### 2.7 Session State Wireframe (Screen 7)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SESSION STATE                        [Edit Mode: OFF]  [Download]  [Revert]│
├──────────────────────────────────────┬──────────────────────────────────────┤
│                                      │                                      │
│ {                                    │ PHASE PROGRESS                       │
│   "session_id": "2026-03-09...",     │                                      │
│   "project_name": "MYAGENTIC...",    │ PHASE 1 ────────────── ✓ COMPLETE   │
│   "mode": "CREATE",                  │  ✓ Business Analyst (45s)            │
│   "status": "PHASE-3",               │  ✓ Domain Expert (60s)               │
│   "current_phase": "PHASE-3",        │  ✓ Financial Analyst (50s)           │
│   "current_agent": "11-ux-designer", │  ✓ Product Manager (55s)             │
│   "completed_phases": [              │  ✓ Critic + Risk (30s)               │
│     "ONBOARDING",                    │                                      │
│     "PHASE-1",                       │ PHASE 2 ────────────── ✓ COMPLETE   │
│     "PHASE-2"                        │  ✓ Software Architect (120s)         │
│   ],                                 │  ✓ Senior Developer (90s)            │
│   "completed_agents": [              │  ✓ DevOps Engineer (75s)             │
│     "25-onboarding-agent",           │  ✓ Security Architect (80s)          │
│     "01-business-analyst",           │  ✓ Data Architect (70s)              │
│     "10-ux-researcher"               │  ✓ Legal Counsel (65s)               │
│   ],                                 │  ✓ Critic + Risk (35s)               │
│   "phase_outputs": {                 │                                      │
│     "phase-3": {                     │ PHASE 3 ────────────── ⏳ IN-PROGR  │
│       "10": ".github/docs/...",      │  ✓ UX Researcher (120s)              │
│       "11": null,                    │  ⏳ UX Designer (in progress)        │
│       ...                            │  ⏸ UI Designer                       │
│     }                                │  ⏸ Accessibility Specialist          │
│   },                                 │  ⏸ Content Strategist                │
│   "blocking_items": [],              │  ⏸ Localization Specialist           │
│   "open_human_escalations": []       │                                      │
│ }                                    │ PHASE 4 ────────────── ⏸ NOT-STARTE│
│                                      │  ⏸ Brand Strategist                  │
│ [Save] (disabled in read-only mode)  │  ⏸ Growth Marketer                   │
│                                      │  ⏸ CRO Specialist                    │
│                                      │                                      │
│                                      │ ESCALATIONS & BLOCKERS               │
│                                      │  🔴 Critical: 0   🟡 Warning: 0      │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

**Source:** Session State Contract, Orchestrator ORC-09 (session recovery)

---

### 2.8 Help Article Viewer Wireframe (Screen 8)

````
┌─────────────────────────────────────────────────────────────────────────────┐
│ HELP & DOCUMENTATION                                                        │
│ [Search: ____________________________________________]  🔍                  │
├────────────────────┬────────────────────────────────────────────────────────┤
│                    │                                                        │
│ Getting Started    │ Home > Troubleshooting > Agent stuck in IN_PROGRESS    │
│ ▼                  │                                                        │
│  Welcome           │ # TROUBLESHOOTING: Agent Stuck in IN_PROGRESS          │
│  Quick Start       │                                                        │
│                    │ **Last Updated:** Mar 10, 2026                         │
│ Phase Guides       │                                                        │
│ ▶                  │ ## Symptoms                                            │
│                    │                                                        │
│ Agent Reference    │ - `session-state.json` shows `current_agent` with no   │
│ ▶                  │   corresponding output file after 10+ minutes          │
│                    │ - Dashboard shows agent "in progress" indefinitely     │
│ Troubleshooting    │ - No error in Recent Activity feed                     │
│ ▼                  │                                                        │
│  Agent stuck       │ ## Root Causes                                         │
│  INSUFFICIENT_DATA │                                                        │
│  Validation fails  │ 1. **Agent encountered unhandled error**               │
│  Secret scan error │    - Check terminal output for stack traces            │
│                    │    - Look for Node.js crash or OOM errors              │
│ FAQ                │                                                        │
│ ▶                  │ 2. **File lock deadlock**                              │
│                    │    - Multiple processes trying to write same file      │
│ [Feedback]         │    - Check for stale .lock files in .github/docs/      │
│                    │                                                        │
│                    │ 3. **Infinite loop in agent logic**                    │
│                    │    - Rare but possible with malformed input            │
│                    │                                                        │
│                    │ ## Resolution Steps                                    │
│                    │                                                        │
│                    │ ### Step 1: Check Terminal Output                      │
│                    │ ```bash                                                │
│                    │ # Look for the last console.log from the agent       │
│                    │ tail -n 50 terminal.log                                │
│                    │ ```                                                    │
│                    │                                                        │
│                    │ ### Step 2: Manual Recovery                            │
│                    │ 1. Open Session State tab                              │
│                    │ 2. Enable Edit Mode (confirm warning)                  │
│                    │ 3. Set `current_agent` to next agent in sequence       │
│                    │ 4. Save and commit                                     │
│                    │                                                        │
│                    │ ### Step 3: Escalate if Unresolved                     │
│                    │ Use HALT command and report to maintainers.            │
│                    │                                                        │
│                    │ ───────────────────────────────────────────────────    │
│                    │ Was this helpful?  [👍 Yes]  [👎 No]                  │
│                    │                                                        │
└────────────────────┴────────────────────────────────────────────────────────┘
````

**Source:** UX Researcher Rec-06 (help + search), Guardrail G-GLOB-60
(escalation protocol)

---

## 3. INTERACTION PATTERN LIBRARY

### Pattern 1: Real-Time Status Updates (SSE)

**Pattern Name:** Live Status Sync  
**Used In:** Dashboard, Questionnaires, Analytics  
**Behavior:**

- Client establishes SSE connection to `/api/events` on page load
- Server pushes events:
  `{ type: 'agent_complete', agent_id: '10', timestamp: '...' }`
- Client updates UI without page reload
- Heartbeat every 30s to keep connection alive
- Reconnect with exponential backoff on disconnect

**Source:** Senior Developer real-time requirement (phase-2/06 sec 4.2)

---

### Pattern 2: Contextual Actions

**Pattern Name:** Embedded Action Buttons  
**Used In:** All tabs with entity lists (questionnaires, decisions, documents)  
**Behavior:**

- Primary action on entity name (click to view detail)
- Secondary actions as buttons in card/row (Edit, Delete, Archive, Download)
- Dangerous actions (Delete, Archive) require confirmation modal
- Action success/failure shown via toast notification (top-right, auto-dismiss
  3s)

**Source:** UX Researcher Rec-05 (reduce clicks)

---

### Pattern 3: Progressive Disclosure

**Pattern Name:** Expand on Demand  
**Used In:** Questionnaires (answer fields), Session State (JSON sections), Help
(categories)  
**Behavior:**

- Collapsed by default; show summary only
- Click to expand (accordion or modal)
- Max 3 levels deep to avoid overwhelming users
- Persist expand state in sessionStorage (not localStorage, to reset per
  session)

**Source:** UX Researcher journey step 3 (sprint execution)

---

### Pattern 4: Validation Feedback

**Pattern Name:** Inline + Summary Validation  
**Used In:** Questionnaires (answer input), Decisions (create/edit modal),
Session State (JSON editor)  
**Behavior:**

- Validate on blur (not on every keystroke)
- Show error inline below field (red text + icon)
- Summary of all errors at top of form (sticky, dismissible)
- Disable submit button while errors exist
- Secret detection: immediate feedback (on keystroke debounced 500ms)

**Validation Rules:**

- Required fields: "This field is required"
- Min length: "Minimum N characters required"
- Secret detected: "Remove sensitive data (API keys, passwords, tokens)"
- Invalid JSON: "Syntax error at line N"

**Source:** Questionnaire Guardrail G-QUEST-20 (no secrets), Security Architect
input validation (phase-2/08)

---

### Pattern 5: Breadcrumb Navigation

**Pattern Name:** Context Breadcrumbs  
**Used In:** Help tab (article viewer), Synthesis tab (report sections)  
**Behavior:**

- Show path: Home > Category > Article
- Each segment clickable (navigate up hierarchy)
- Max 4 segments; collapse middle if deeper
- Auto-update on navigation

**Source:** UX Researcher Rec-07 (navigation clarity)

---

### Pattern 6: Sticky Controls

**Pattern Name:** Fixed Action Bar  
**Used In:** Questionnaires (footer), Modal (header + footer), Session State
(save/revert)  
**Behavior:**

- Footer sticks to bottom on scroll
- Header sticks to top (only for modals)
- CTA buttons always visible
- Z-index: 100 (above content, below toasts)

**Source:** UX Researcher Rec-05 (reduce clicks)

---

### Pattern 7: Loading States

**Pattern Name:** Skeleton + Spinner  
**Used In:** All data-fetching scenarios  
**Behavior:**

- For tables/lists: show skeleton rows (gray rectangles pulsing)
- For single items: show spinner (centered, with "Loading..." text)
- For background operations (e.g., Export All): show progress toast with spinner
- Timeout after 30s → show error message "Operation timed out. Please try
  again."

**Source:** UX Researcher Rec-08 (feedback on async operations)

---

### Pattern 8: Toast Notifications

**Pattern Name:** Non-Blocking Alerts  
**Used In:** All mutation actions (save, delete, create, update)  
**Behavior:**

- Position: top-right, stacked vertically
- Types: success (green), error (red), warning (yellow), info (blue)
- Auto-dismiss after 3s (success/info), 5s (warning), manual dismiss (error)
- Max 3 toasts visible at once; queue older ones

**Message Examples:**

- Success: "✓ Answer saved successfully"
- Error: "✗ Failed to save answer. Check network connection."
- Warning: "⚠ Secret detected and removed from answer"
- Info: "ℹ Synthesis report generation started. Check back in 2 min."

**Source:** UX Researcher Rec-08 (feedback on async operations)

---

### Pattern 9: Confirmation Modals

**Pattern Name:** Destructive Action Guard  
**Used In:** Delete decision, archive decision, edit session state, HALT
command  
**Behavior:**

- Show modal overlay (blur background)
- Title: "Confirm [Action]"
- Message: Explain consequence clearly ("This will delete the decision
  permanently. This cannot be undone.")
- Two buttons: "Cancel" (default focus, Escape key), "Confirm" (Enter key)
- For very dangerous actions (HALT, edit session state): require typing
  "CONFIRM" in input field

**Source:** Security Architect guardrail (phase-2/08 sec 6.3)

---

### Pattern 10: Search with Filters

**Pattern Name:** Faceted Search  
**Used In:** Decisions (timeline), Official Documents (table), Help (article
list)  
**Behavior:**

- Search input debounced 300ms
- Filters applied client-side (if < 100 items) or server-side (if > 100 items)
- Show result count: "Showing N of M results"
- Clear all filters button
- Preserve filter state in URL query params (so deep-linking works)

**Source:** UX Researcher Rec-09 (findability)

---

### Pattern 11: Export Options

**Pattern Name:** Multi-Format Export  
**Used In:** Questionnaires, Synthesis, Analytics, Official Documents  
**Behavior:**

- Dropdown menu: JSON, CSV, Markdown, PDF (if available)
- For single-item export: download immediately
- For multi-item export (e.g., Export All): show progress toast → download ZIP
- Filename format: `[entity]-[date]-[time].ext` (e.g.,
  `synthesis-2026-03-10-0645.zip`)

**Source:** UX Researcher Rec-03 (export)

---

### Pattern 12: Help Context Button

**Pattern Name:** Inline Help Link  
**Used In:** All screens with complex workflows (Questionnaires, Session State,
Decisions)  
**Behavior:**

- "?" icon button next to section header
- Click → open Help tab with pre-filtered article for that section
- Or: inline tooltip (hover for 1s → show 200 char summary + "Learn more" link)

**Source:** UX Researcher Rec-06 (help + search)

---

## 4. NAVIGATION MODEL

### 4.1 Tab-Based Navigation

**Primary Navigation:** 8 tabs in left sidebar (always visible)

- Dashboard (home icon)
- Questionnaires (clipboard icon)
- Decisions (scale icon)
- Synthesis (document icon)
- Analytics (chart icon)
- Official Documents (folder icon)
- Session State (gear icon)
- Help (question mark icon)

**Active Tab Indicator:** Background color change + bold text  
**Keyboard Shortcut:** Cmd/Ctrl + 1-8 (navigate to tab N)

**Source:** UX Researcher Rec-10 (tab-based nav for 8 screens)

---

### 4.2 Cross-Tab Navigation

**Scenario:** User clicks "Source Questionnaires: 4 files" in Official Documents
tab  
**Behavior:**

1. Navigate to Questionnaires tab
2. Pre-filter list to show only those 4 questionnaires
3. Show toast: "Showing questionnaires for product-vision.md"
4. User can clear filter to see all

**Implementation:**

- URL query param: `?tab=questionnaires&filter=doc:product-vision.md`
- JavaScript reads query param on mount → apply filter

**Source:** UX Researcher journey step 2 (cross-linking)

---

### 4.3 Deep Linking

**Supported URL Patterns:**

- `/dashboard`
- `/questionnaires?phase=1&status=incomplete`
- `/decisions?status=DECIDED`
- `/synthesis?report=master`
- `/analytics`
- `/documents?doc=product-vision.md`
- `/session`
- `/help?article=troubleshoot-agent-stuck`

**Behavior:**

- On app load, parse URL → navigate to tab + apply filters
- On navigation, update URL (without page reload)
- Copy URL button in header (for sharing state with team)

**Source:** UX Researcher Rec-09 (findability)

---

## 5. STATE MANAGEMENT STRATEGY

### 5.1 Client-Side State

**Library:** React Context API (no Redux for v1; consider Redux Toolkit if
complexity grows)  
**State Slices:**

1. **SessionState:** Mirrors `session-state.json`; updated via SSE
2. **UI State:** Active tab, modals open/closed, filters, sorts
3. **User Preferences:** (future) Theme, default filters, collapsed sections

**Update Flow:**

1. User action (e.g., save answer) → POST to API
2. Server writes file → git commit → broadcasts SSE event
3. Client receives SSE → updates SessionState context → React re-renders

**Source:** Senior Developer architecture (phase-2/06 sec 4.3)

---

### 5.2 Server-Side State

**Canonical State:** File-system based (session-state.json,
questionnaire-index.md, decisions.md)  
**In-Memory Cache:** `FileCache` class (invalidated on file write)  
**Concurrency:** File locks (`file-lock.js` module) prevent write conflicts

**Source:** Data Architect state management (phase-2/09 sec 3)

---

### 5.3 Async Operation State

**Pattern:** Optimistic UI updates  
**Example:**

1. User clicks "Save Answer" → UI shows "Saving..." spinner
2. POST /api/questionnaires/answer
3. If success (200) → spinner → "Saved ✓"
4. If error (500) → spinner → "Failed ✗" + revert UI to previous state

**Error Handling:**

- Network errors: show "Connection lost. Retrying..." (auto-retry 3x with
  exponential backoff)
- Validation errors: show inline error messages (no retry)
- Server errors (500): show toast "Server error. Contact support if problem
  persists."

**Source:** Senior Developer error handling (phase-2/06 sec 5)

---

## 6. RESPONSIVE BEHAVIOR

### Breakpoints:

- Desktop: ≥ 1024px (3-column layout)
- Tablet: 768px - 1023px (2-column; right panel collapses to bottom)
- Mobile: < 768px (1-column; tabs move to hamburger menu)

### Mobile-Specific Changes:

- Dashboard: Phase cards stack vertically (no 2x2 grid)
- Questionnaires: Master list hidden by default; show toggle button
- Decisions: Timeline cards full-width; modal becomes full-screen
- Synthesis: Report selector becomes dropdown at top
- Analytics: Charts stack vertically (no 2x2 grid)
- Official Documents: Table becomes card list
- Session State: JSON editor full-width; visual progress hidden (accessible via
  toggle)
- Help: Sidebar hidden by default; show toggle button

**Touch Interactions:**

- All clickable elements min 44x44px (WCAG AAA touch target size)
- Swipe to dismiss toasts
- Swipe left/right on cards for secondary actions (Edit, Delete)

**Source:** UX Researcher Rec-11 (responsive design for tablet/mobile)

---

## 7. ACCESSIBILITY BASELINE

(Deferred to Accessibility Specialist deliverable; UX Designer provides semantic
structure)

**Semantic HTML:**

- Use `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>` appropriately
- Headings in logical order (h1 → h2 → h3, no skips)
- Form labels with `for` attribute
- Buttons are `<button>` (not `<div onclick>`)
- Links are `<a href>` (not `<span onclick>`)

**ARIA Labels:**

- Tab nav: `role="tablist"`, `aria-label="Main navigation"`
- Modal: `role="dialog"`, `aria-labelledby="modal-title"`, `aria-modal="true"`
- Toast: `role="alert"`, `aria-live="polite"`
- Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`,
  `aria-valuemax`

**Keyboard Navigation:**

- All interactive elements reachable via Tab
- Focus visible (outline: 2px solid blue)
- Escape closes modals
- Enter activates buttons
- Arrow keys navigate within lists (where applicable)

**Source:** UX Researcher RISK-UX-005 (accessibility not yet validated)

---

## 8. DESIGN GAPS & UNCERTAINTIES

### GAP-UXD-001: No Visual Design Tokens Yet

**Description:** This analysis defines layout and interaction, but not colors,
typography, spacing units, or icons.  
**Impact:** UI Designer and Brand Strategist must define these before
implementation.  
**Resolution:** Deferred to Agent 12 (UI Designer) and Agent 30 (Brand & Assets
Agent).  
**Source:** This is intentional per phase sequence; UX Designer focuses on
structure, not visual style.

---

### GAP-UXD-002: No Animation Specifications

**Description:** Transitions (modal open/close, tab switch, toast slide-in) not
specified.  
**Impact:** Implementation Agent may use inconsistent animation timing/easing.  
**Resolution:** UI Designer (Agent 12) will define motion design tokens
(duration, easing curves).  
**Recommendation:** Use CSS transitions for simple states; Framer Motion for
complex animations.

---

### GAP-UXD-003: Mobile Gesture Library Undefined

**Description:** Swipe-to-dismiss, pull-to-refresh not specified in detail.  
**Impact:** Mobile UX may feel incomplete or unpolished.  
**Resolution:** UI Designer (Agent 12) will specify gesture thresholds and
feedback.  
**Recommendation:** Use Hammer.js or native touch events with 50px swipe
threshold.

---

### GAP-UXD-004: Error Recovery Workflows Incomplete

**Description:** What happens when SSE connection fails permanently? When file
writes fail due to permissions?  
**Impact:** Users may be stuck without obvious next steps.  
**Resolution:** Senior Developer (Agent 06) and UX Designer (this agent) must
collaborate on error recovery modals.  
**Recommendation:** Add "Retry", "Report Issue", "Continue Offline" options in
error modal.

---

### UNCERTAIN-UXD-001: Pagination vs Infinite Scroll

**Description:** For long lists (e.g., analytics events, decision timeline),
should we use pagination or infinite scroll?  
**Trade-offs:**

- Pagination: Better for keyboard nav, accessibility, deep linking
- Infinite scroll: Better for exploration, mobile UX **Current Decision:** Use
  pagination for tables (Analytics, Official Docs), infinite scroll for feeds
  (Dashboard activity).  
  **Source:** UX Researcher Rec-12 (findability) favors pagination for
  structured data.

---

### UNCERTAIN-UXD-002: Real-Time Collaboration

**Description:** If two users edit the same questionnaire answer simultaneously,
should we show conflict resolution UI?  
**Assumption:** v1 assumes single-user (solo founder). Multi-user is future
scope.  
**Current Decision:** Last-write-wins (no conflict resolution UI in v1).  
**Future Consideration:** Add operational transform (OT) or CRDT for multi-user
if user research validates need.  
**Source:** Onboarding output sec 2.1 (solo founder as primary ICP).

---

## 9. RECOMMENDATIONS FOR NEXT AGENTS

### For UI Designer (Agent 12):

1. Define design tokens (colors, typography, spacing, shadows, borders)
2. Create high-fidelity mockups for Dashboard, Questionnaires, Decisions
   (priority order)
3. Specify icon library (recommend: Lucide React or Heroicons)
4. Define animation/motion tokens (durations, easing curves)
5. Validate contrast ratios for accessibility (WCAG AA minimum, AAA target)

---

### For Accessibility Specialist (Agent 13):

1. Audit wireframes for WCAG 2.1 AA compliance
2. Define skip links, focus management for modals
3. Specify screen reader announcements for SSE updates
4. Test keyboard-only navigation flows
5. Validate touch target sizes for mobile

---

### For Content Strategist (Agent 32):

1. Write microcopy for all UI labels, buttons, error messages
2. Create help article content (10 seed articles listed in sec 2.8)
3. Define tone of voice (technical but friendly, not corporate)
4. Specify empty states (e.g., "No questionnaires yet. Complete Phase 1 to
   generate questions.")
5. Review and improve validation error messages

---

### For Implementation Agent (Agent 20):

1. Build component library BEFORE implementing screens (Storybook-first
   approach)
2. Implement SSE client with reconnection logic (exponential backoff)
3. Use semantic HTML and ARIA labels as specified in sec 7
4. Implement file-lock retry logic for concurrent writes
5. Add feature flags for progressive rollout (if multi-user support is added
   later)

---

## 10. RISKS & ASSUMPTIONS

### RISK-UXD-001: Complexity Overwhelms Solo Founder

**Severity:** MEDIUM  
**Description:** 8 tabs with deep hierarchies may confuse users unfamiliar with
multi-agent workflows.  
**Mitigation:**

- Add onboarding tour (tooltips on first visit)
- Provide "Quick Start" help article
- Default to Dashboard (simplest view) on login **Owner:** UX Researcher +
  Content Strategist  
  **Source:** UX Researcher RISK-UX-002 (learning curve for orchestration)

---

### RISK-UXD-002: Real-Time Updates Cause UI Flicker

**Severity:** LOW  
**Description:** SSE events trigger React re-renders; if poorly optimized, may
cause visual jank.  
**Mitigation:**

- Use React.memo for expensive components
- Debounce SSE event handling (batch updates every 500ms)
- Test on low-end devices (Lighthouse performance score > 90) **Owner:** Senior
  Developer (Agent 06)  
  **Source:** Senior Developer performance requirement (phase-2/06 sec 6)

---

### RISK-UXD-003: Browser Compatibility Issues

**Severity:** LOW  
**Description:** SSE not supported in IE11; file download APIs vary across
browsers.  
**Mitigation:**

- Target modern browsers only (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Document browser requirements in README
- Polyfill EventSource if needed (but unlikely for target audience) **Owner:**
  Senior Developer (Agent 06)  
  **Source:** Target audience is technical (Onboarding sec 2.1); assume modern
  browser usage.

---

### ASSUMPTION-UXD-001: Single User Per Session

**Description:** UI does not handle concurrent edits by multiple users.  
**Validation:** Onboarding output confirms solo founder as ICP.  
**Impact if Wrong:** Would need to add conflict resolution UI, operational
transform, or lock indicators.  
**Source:** Onboarding output sec 2.1

---

### ASSUMPTION-UXD-002: Desktop-First Usage

**Description:** Wireframes prioritize desktop (1024px+); mobile is secondary.  
**Validation:** UX Researcher persona analysis (sec 2) shows "works from laptop
90% of time".  
**Impact if Wrong:** Would need to redesign for mobile-first (simplified flows,
fewer columns).  
**Source:** UX Researcher persona 1 (sec 2.1)

---

### ASSUMPTION-UXD-003: English-Only for v1

**Description:** No i18n (internationalization) in wireframes; all text in
English.  
**Validation:** Localization Specialist (Agent 35) will assess i18n
requirements.  
**Impact if Wrong:** Would need to externalize all strings, add language
switcher.  
**Source:** Deferred to Agent 35 per phase sequence.

---

## 11. HANDOFF CHECKLIST

- [x] All 8 screens have wireframe specifications with ASCII diagrams +
      annotations
- [x] Information architecture defined (3-level hierarchy documented in sec 1)
- [x] Interaction pattern library created (12 patterns documented in sec 3)
- [x] Navigation model specified (tab-based + deep linking in sec 4)
- [x] State management strategy defined (client + server state in sec 5)
- [x] Responsive behavior documented (3 breakpoints in sec 6)
- [x] Accessibility baseline provided (semantic HTML + ARIA in sec 7)
- [x] Design gaps explicitly documented (4 gaps in sec 8)
- [x] Uncertainties flagged with trade-off analysis (2 uncertain items in sec 8)
- [x] Recommendations for next agents provided (sec 9)
- [x] Risks and assumptions documented (3 risks, 3 assumptions in sec 10)
- [x] All findings sourced (Phase 1, Phase 2, UX Researcher outputs)
- [x] No contradictory statements
- [x] Output complies with analysis-output-contract.md
- [x] Deliverable written to file
      `.github/docs/phase-3/11-ux-designer-analysis.md`

**Status:** READY  
**Next Agent:** 11-ux-designer-recommendations (same agent, deliverable 2 of 4)

---

**SOURCE CITATIONS:**

- Phase 1 outputs: `.github/docs/phase-1/01-business-analyst-analysis.md` (ICP),
  `.github/docs/phase-1/34-product-manager-analysis.md` (MVP scope)
- Phase 2 outputs: `.github/docs/phase-2/05-software-architect-analysis.md` (UI
  screen list), `.github/docs/phase-2/06-senior-developer-analysis.md`
  (WebSocket real-time)
- UX Researcher: `.github/docs/phase-3/10-ux-researcher-analysis.md` (personas,
  journey, gaps, risks)
- Contracts: `.github/docs/contracts/analysis-output-contract.md`
- Guardrails: `.github/docs/guardrails/04-ux-guardrails.md`,
  `.github/docs/guardrails/00-global-guardrails.md`
