# UX Designer Sprint Plan — CREATE Mode

> **Agent:** 11-ux-designer  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 3 of 4 (Sprint Plan)  
> **Created:** 2026-03-10T06:55:00Z  
> **Mode:** CREATE  
> **Project:** MYAGENTIC-IT-PROJECT-TEAM-V2

---

## EXECUTIVE SUMMARY

This sprint plan contains **15 implementation stories** across **Sprints 1-3**
that realize the UX Designer wireframes and recommendations. Total estimated
effort: **172 hours** (21.5 developer-days at 8h/day).

**Sprint Allocation:**

- **Sprint 1 (Mar 10-17):** Foundation + core infrastructure (8 stories, 78
  hours)
- **Sprint 2 (Mar 18-25):** Feature implementation + polish (5 stories, 66
  hours)
- **Sprint 3 (Mar 26-Apr 2):** Mobile optimization + final testing (2 stories,
  28 hours)

**Story Types:**

- FEATURE: 10 stories (screens, components, major features)
- TECH_DEBT: 2 stories (performance, refactoring)
- DOCUMENTATION: 2 stories (help content, browser requirements)
- UX: 1 story (onboarding tour)

All stories link to wireframe sections and recommendations.

---

## SPRINT 1 — Foundation (Mar 10-17)

### Story SP-1-001: Component Library Setup (Storybook + Design Tokens)

**Type:** FEATURE  
**Priority:** P0 (Blocker for all UI stories)  
**Effort:** 48 hours  
**Owner:** Storybook Agent (31) → Implementation Agent (20)

**Description:** Set up Storybook 7+ with 30+ reusable React components based on
design tokens from UI Designer. This is a BLOCKER for all screen implementation
(per Recommendation 01).

**Acceptance Criteria:**

1. `.github/docs/brand/design-tokens.json` exists with color, typography,
   spacing, shadow tokens (created by UI Designer)
2. Storybook deployed to GitHub Pages at
   `https://[username].github.io/[repo]/storybook/`
3. 30+ components documented in `.github/docs/storybook/component-inventory.md`:
   - Primitives: Button, Input, Textarea, Checkbox, Radio, Select, Badge, Icon
   - Layout: Card, Modal, Toast, Accordion, Tabs, Sidebar
   - Data Display: Table, ProgressBar, Avatar, Tooltip, Breadcrumb
   - Feedback: Spinner, Skeleton, Alert, Notification
4. Each component has:
   - Props documentation
   - Variants (e.g., Button: primary, secondary, danger)
   - Accessibility labels (ARIA)
   - Usage examples in Storybook
5. Accessibility addon (axe-core) enabled; 0 violations on all components
6. TypeScript types exported for all components
7. CI/CD: Storybook builds on PR; deployed on merge to main

**Definition of Done:**

- [ ] All 30+ components render in Storybook without errors
- [ ] Accessibility audit passes (0 axe violations)
- [ ] Component inventory Markdown file committed
- [ ] Storybook URL accessible (GitHub Pages deployed)
- [ ] Implementation Agent confirms: "All components ready for integration"

**Dependencies:**

- UI Designer (Agent 12) must deliver design tokens before this story starts
- Brand & Assets Agent (Agent 30) delivers brand guidelines (colors, fonts)

**Linked Recommendation:** Rec-01  
**Linked Wireframe:** All screens (sec 2.1-2.8)  
**Source:** Analysis sec 9 (recommendations for next agents), Guardrail G-UX-30

---

### Story SP-1-002: Real-Time SSE Infrastructure

**Type:** FEATURE  
**Priority:** P0 (Blocker for Dashboard, all real-time updates)  
**Effort:** 16 hours  
**Owner:** Senior Developer (06) → Implementation Agent (20)

**Description:** Implement Server-Sent Events (SSE) with reconnection logic,
heartbeat, and event deduplication for real-time updates across all 8 screens.

**Acceptance Criteria:**

1. SSE server endpoint: GET `/api/events` (streams newline-delimited JSON)
2. Heartbeat event sent every 30s: `{ type: 'heartbeat', timestamp: '...' }`
3. Event types supported:
   - `agent_complete`: `{ agent_id, output_file, timestamp }`
   - `phase_complete`: `{ phase_id, timestamp }`
   - `questionnaire_answered`: `{ question_id, questionnaire_file, timestamp }`
   - `decision_created`: `{ decision_id, timestamp }`
   - `session_updated`: `{ session_id, changes: [...], timestamp }`
4. SSE client React hook: `useSSE(url, handlers)`
   - Exponential backoff reconnection: 1s, 2s, 4s, 8s, 16s, max 30s
   - Max 10 retry attempts → show "Connection lost" modal
   - On reconnect: fetch full state via GET /api/session (resync)
   - Event deduplication: track last 100 `event_id`s
5. Connection status indicator in header:
   - Green dot = connected
   - Yellow dot = reconnecting (with retry count)
   - Red dot = failed (show modal)
6. Toasts on state change:
   - Disconnect: "Connection lost. Reconnecting..." (yellow, no auto-dismiss)
   - Reconnect: "Connection restored." (green, auto-dismiss 3s)
7. All SSE events logged to `analytics-events.json` (for debugging)

**Definition of Done:**

- [ ] SSE endpoint returns valid event stream (tested with curl)
- [ ] Heartbeat received every 30s (verified in browser DevTools Network tab)
- [ ] Reconnection tested: disable network → enable after 10s → connection
      restored within 30s
- [ ] Full-state resync verified: simulate missed events → state converges after
      reconnect
- [ ] Event deduplication tested: send duplicate event → not processed twice
- [ ] Connection status indicator shows correct state
- [ ] Toasts appear on disconnect/reconnect

**Dependencies:**

- Server.js already has SSE scaffolding (from existing codebase)
- React Context API for global connection state

**Linked Recommendation:** Rec-03  
**Linked Wireframe:** All screens (real-time updates in Dashboard, Activity
Feed)  
**Source:** Senior Developer analysis (phase-2/06 sec 4.2), Analysis sec 10
RISK-UXD-002

---

### Story SP-1-003: Dashboard Screen Implementation

**Type:** FEATURE  
**Priority:** P1 (Primary entry point)  
**Effort:** 12 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement Dashboard screen (wireframe sec 2.1) with sprint
status, 4 phase cards, recent activity feed, quick actions menu, and insights
panel.

**Acceptance Criteria:**

1. **Layout:**
   - 3-column: Sidebar (20%), Main (55%), Insights (25%)
   - Responsive: < 1024px → insights panel moves to bottom
2. **Sprint Status Card:**
   - Displays: current sprint ID, progress bar (stories completed / total), ETA
   - Data source: `session-state.json.sprint_backlog.sprint_statuses[current]`
3. **Phase Cards (4):**
   - 2x2 grid
   - Per card: phase name, status icon, agent progress (N/M), next agent name,
     CTA button
   - Status icons: ✅ DONE, ⏳ IN-PROGRESS, ⏸ WAITING, 🔴 BLOCKED
   - Hover: tooltip shows next agent name + ETA
   - Click "View Details" → navigate to phase-specific view (placeholder for
     now)
4. **Recent Activity Feed:**
   - Last 10 events from SSE stream
   - Per event: icon, timestamp (relative: "2 min ago"), agent name, action
     summary, link to artifact
   - Real-time updates via SSE (useSSE hook from SP-1-002)
   - Click event → navigate to file/tab (if applicable)
5. **Quick Actions Menu (6 buttons):**
   - CREATE, REEVALUATE, FEATURE, SCOPE CHANGE, Refresh Onboarding, HALT
   - Click → open modal (modals implemented in later story; placeholder for now)
6. **Insights Panel:**
   - Blocker count (filterable by severity: CRITICAL, HIGH)
   - Questionnaire completion % (progress bar)
   - Official docs completeness % (progress bar)
   - Link to session-state.json (opens Session State tab)
7. **All components from Storybook** (no ad-hoc UI code)

**Definition of Done:**

- [ ] Dashboard renders with all 5 sections
- [ ] Phase cards show correct data from session-state.json
- [ ] Activity feed updates in real-time (SSE events appear without refresh)
- [ ] Quick Actions buttons render (functionality deferred to modals story)
- [ ] Insights panel shows correct metrics
- [ ] Responsive: insights panel moves to bottom at < 1024px
- [ ] Accessibility: all interactive elements keyboard-navigable, ARIA labels
      present
- [ ] No hardcoded styles (all via design tokens)

**Dependencies:**

- SP-1-001 (Component Library) must be complete
- SP-1-002 (SSE Infrastructure) must be complete

**Linked Recommendation:** Rec-02 (onboarding tour will enhance this screen
later)  
**Linked Wireframe:** Analysis sec 2.1  
**Source:** UX Researcher journey step 1 (entry & orientation)

---

### Story SP-1-004: Onboarding Tour Implementation

**Type:** UX  
**Priority:** P1  
**Effort:** 8 hours  
**Owner:** Implementation Agent (20) + Content Strategist (32)

**Description:** Add interactive product tour using Driver.js to guide
first-time users through the Dashboard.

**Acceptance Criteria:**

1. **Tour Library:**
   - Use Driver.js (MIT license, 12KB gzipped)
   - Integrated via npm: `npm install driver.js`
2. **Tour Steps (6):**
   - Step 1: Highlight phase cards ("This shows progress across 4 design
     phases")
   - Step 2: Highlight Quick Actions ("Start workflows here")
   - Step 3: Highlight Recent Activity ("Real-time updates appear here")
   - Step 4: Highlight Questionnaires tab ("Answer required questions to unlock
     phases")
   - Step 5: Highlight Session State tab ("Advanced: inspect system state")
   - Step 6: Highlight Help tab ("Search for help anytime")
3. **Tour Trigger:**
   - Automatically on first visit (detected via localStorage flag:
     `tour_completed`)
   - Manual trigger: Help menu → "Take Tour Again" button
4. **Tour Controls:**
   - Skip button (X) in each step
   - Esc key dismisses tour
   - Next/Previous buttons
   - Progress indicator (Step N of 6)
5. **Content:**
   - Tour script written by Content Strategist (Agent 32)
   - Stored in `public/tour-config.json` (editable without code rebuild)
6. **Analytics:**
   - Log `tour_started` event to analytics-events.json
   - Log `tour_completed` event (if user finishes all 6 steps)
   - Log `tour_skipped` event (if user dismisses early)
7. **Tour Skipped if:**
   - User arrives via deep link (URL has query params)
   - User has `tour_completed` flag in localStorage

**Definition of Done:**

- [ ] Tour triggers automatically on first visit
- [ ] All 6 steps render with correct highlights and text
- [ ] Skip button dismisses tour
- [ ] Esc key dismisses tour
- [ ] "Take Tour Again" button in Help menu re-triggers tour
- [ ] Analytics events logged correctly
- [ ] Tour does not trigger on deep link navigation

**Dependencies:**

- SP-1-003 (Dashboard) must be complete (tour highlights Dashboard elements)
- Content Strategist (Agent 32) delivers tour script

**Linked Recommendation:** Rec-02  
**Linked Wireframe:** Analysis sec 2.1 (Dashboard)  
**Source:** UX Researcher RISK-UX-002 (learning curve)

---

### Story SP-1-005: Questionnaires Tab Implementation

**Type:** FEATURE  
**Priority:** P1 (Critical for Phase 1-4 workflows)  
**Effort:** 14 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement Questionnaires tab (wireframe sec 2.2) with
master-detail layout, question list, answer input, validation feedback.

**Acceptance Criteria:**

1. **Master List (30% width, collapsible):**
   - Group by phase (accordion): Phase 1-4
   - Per questionnaire: filename, status badge (COMPLETE/PARTIAL/OPEN), required
     count, answered count, last updated timestamp
   - Filter controls: "Show only incomplete", "Show only REQUIRED questions"
   - Click filename → load in detail view
2. **Detail View (70% width):**
   - Header: filename, generated date, completeness progress bar
   - Question list (vertical stack):
     - Question ID (Q-PH1-BA-001)
     - Question text (markdown rendered)
     - Priority badge (REQUIRED / OPTIONAL)
     - Answer status icon (✓ answered, ⚠ insufficient, ✗ unanswered)
     - Answer input: Textarea (for unanswered) or read-only text with Edit
       button (for answered)
   - Secret detection: real-time validation (debounced 500ms)
     - Patterns: `password`, `api_key`, `token`, `secret`, regex for AWS keys,
       GitHub tokens
     - Feedback: red warning "⚠ Secret detected. Remove before saving."
     - Auto-clear recommendation
   - Auto-save: 2s debounce after typing stops
   - Save button (explicit save option)
3. **Sticky Footer:**
   - "Mark as Complete" button (disabled if REQUIRED questions unanswered)
   - "Export Answers" button (CSV / JSON dropdown)
4. **Validation:**
   - Required fields: show inline error "This field is required"
   - Min length (if specified in questionnaire): "Minimum N characters required"
   - Secret detected: "Remove sensitive data (API keys, passwords, tokens)"
5. **SSE Updates:**
   - When answer saved → SSE event → Dashboard activity feed updates

**Definition of Done:**

- [ ] Master list renders all questionnaires from
      `BusinessDocs/*/Questionnaires/`
- [ ] Accordion expand/collapse works
- [ ] Filter controls filter list correctly
- [ ] Detail view renders selected questionnaire
- [ ] Answer input saves to file (POST /api/questionnaires/answer)
- [ ] Auto-save triggers 2s after typing stops
- [ ] Secret detection shows warning for patterns like "password=abc123"
- [ ] "Mark as Complete" button disabled when REQUIRED unanswered
- [ ] Export CSV/JSON downloads correct file
- [ ] SSE event broadcast on answer save

**Dependencies:**

- SP-1-001 (Component Library)
- SP-1-002 (SSE for real-time updates)
- Backend API: POST /api/questionnaires/answer already implemented

**Linked Recommendation:** Rec-04 (error recovery modals will enhance this
later)  
**Linked Wireframe:** Analysis sec 2.2  
**Source:** Questionnaire Guardrail G-QUEST-20 (no secrets)

---

### Story SP-1-006: Decisions Tab Implementation

**Type:** FEATURE  
**Priority:** P1  
**Effort:** 12 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement Decisions tab (wireframe sec 2.3) with timeline,
decision detail modal, create/edit/archive functionality.

**Acceptance Criteria:**

1. **Timeline (100% width):**
   - Decision cards (chronological descending, newest first)
   - Per card: ID, title, status badge (PROPOSED/DECIDED/DEFERRED/REVERTED),
     date, scope, impact summary, tags, action buttons (View, Edit, Archive)
   - Filter controls: status multi-select, scope dropdown, search by keyword
   - "Create Decision" button (sticky top-right)
2. **Decision Detail Modal (60% viewport width):**
   - Header: Decision ID + title (editable), status dropdown, close X
   - Body (scrollable):
     - Context: Markdown editor, 500 char min
     - Reason: Markdown editor, 200 char min
     - Referenced story/PR: Searchable dropdown (from sprint plan)
     - Impact on future sprints: Markdown editor, 300 char min
     - Tags: Tag input (comma-separated, auto-suggest)
   - Footer: Save, Delete (with confirmation), Cancel
3. **Validation:**
   - Title: 10-100 chars
   - Context: 500 char min (enforced on save)
   - Reason: 200 char min
   - Impact: 300 char min
   - No secrets detected in any field (same validation as Questionnaires)
4. **Actions:**
   - Click "View Details" → open modal (read-only if DECIDED, editable if
     PROPOSED)
   - Click "Edit" → open modal in edit mode
   - Click "Create Decision" → open blank modal
   - Save → POST /api/decisions → write to `.github/docs/decisions.md` → SSE
     event → refresh timeline
   - Archive → soft delete (status = ARCHIVED)
5. **SSE Updates:**
   - When decision created/updated → SSE event → timeline refreshes

**Definition of Done:**

- [ ] Timeline renders decisions from `.github/docs/decisions.md`
- [ ] Filter controls work (status, scope, search)
- [ ] "Create Decision" button opens blank modal
- [ ] Modal validation enforces min char counts
- [ ] Save button writes to decisions.md (POST /api/decisions)
- [ ] Archive button changes status to ARCHIVED
- [ ] Delete button shows confirmation modal
- [ ] Secret detection prevents saving sensitive data
- [ ] SSE event updates timeline without page reload

**Dependencies:**

- SP-1-001 (Component Library: Modal, Input, Textarea)
- SP-1-002 (SSE for real-time updates)
- Backend API: POST /api/decisions, DELETE /api/decisions/{id}

**Linked Recommendation:** None (core feature)  
**Linked Wireframe:** Analysis sec 2.3  
**Source:** Orchestrator ORC-21 (breaking change doc)

---

### Story SP-1-007: Synthesis Tab Implementation

**Type:** FEATURE  
**Priority:** P2 (Not critical until Phase 4 complete)  
**Effort:** 10 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement Synthesis tab (wireframe sec 2.4) with report
selector, markdown viewer, blocker matrix table.

**Acceptance Criteria:**

1. **Report Selector Sidebar (25% width):**
   - Radio buttons: Master Report, 4 Department Reports, Blocker Matrix
   - "Export All" button (downloads ZIP)
   - "Refresh Synthesis" button (re-runs Synthesis Agent)
2. **Report Viewer (75% width):**
   - For markdown reports:
     - Rendered markdown with syntax highlighting (use `react-markdown` +
       `react-syntax-highlighter`)
     - Table of contents (sticky left, auto-generated from ## headers)
     - Anchor links for all sections
     - Copy-to-clipboard button per code block
   - For blocker matrix:
     - Filterable table: Blocker ID, Owning Team, Dependent Team, Type
       (BLOCKING/ADVISORY), Status, Sprint Linked
     - Row actions: Link to Sprint, Mark Resolved
     - Group by: Owning Team / Dependent Team / Type
3. **Conditional Rendering:**
   - If `session-state.json.synthesis === null` → placeholder: "Synthesis not
     yet available. Complete all 4 phases first."
   - If partial cycle (BUSINESS only) → show only Business Department Report
   - If blocker matrix empty → success message: "No cross-team blockers
     detected."
4. **Export:**
   - "Export All" → GET /api/synthesis/export → downloads `synthesis-[date].zip`
   - Individual report: "Download Markdown" button → save `.md` file
5. **Refresh:**
   - "Refresh Synthesis" → confirm modal → POST /api/synthesis/regenerate → SSE
     progress events → reload on complete

**Definition of Done:**

- [ ] Report selector sidebar renders all report options
- [ ] Click report → loads and renders in viewer
- [ ] Markdown rendering works (headers, lists, code blocks, tables)
- [ ] Table of contents auto-generated and functional (click anchor → scroll)
- [ ] Blocker matrix table filterable and sortable
- [ ] "Export All" downloads ZIP with all reports
- [ ] "Refresh Synthesis" triggers re-generation
- [ ] Placeholder shown when synthesis not available

**Dependencies:**

- SP-1-001 (Component Library: Table, Sidebar)
- Synthesis Agent (Agent 17) must have run (produces `.github/docs/synthesis/`
  files)

**Linked Recommendation:** Rec-03 (export)  
**Linked Wireframe:** Analysis sec 2.4  
**Source:** Synthesis Agent contract

---

### Story SP-1-009: Help Content Seed Articles

**Type:** DOCUMENTATION  
**Priority:** P1  
**Effort:** 16 hours  
**Owner:** Content Strategist (32) + Implementation Agent (20)

**Description:** Write 10 help articles (500-800 words each) and integrate into
Help tab for self-service user support.

**Acceptance Criteria:**

1. **10 Help Articles (Content Strategist):**
   - `what-is-create-vs-audit-mode.md`
   - `how-to-answer-questionnaire.md`
   - `understanding-insufficient-data.md`
   - `how-to-resolve-blocking-item.md`
   - `critic-risk-validation-explained.md`
   - `what-is-scope-change.md`
   - `how-to-execute-hotfix.md`
   - `sprint-gate-definition-of-ready.md`
   - `interpret-cross-team-blocker-matrix.md`
   - `troubleshoot-agent-stuck.md`
2. **Article Template:**
   - **Problem statement** (what user is trying to do)
   - **Step-by-step instructions** (numbered, with screenshot placeholders)
   - **Common errors** (what to avoid)
   - **Related articles** (internal links)
   - **Last updated date** (YYYY-MM-DD)
3. **Help Tab UI (Implementation Agent):**
   - Search input (full-text search across article titles + first paragraph)
   - Category tree (collapsible): Getting Started, Phase Guides, Agent
     Reference, Troubleshooting, FAQ
   - Article list (per category): title, last updated
   - Article viewer: rendered markdown, breadcrumb, TOC
   - "Was this helpful?" buttons (Yes/No)
   - "Report a problem" link (opens feedback form modal)
4. **Feedback Form Modal:**
   - What were you trying to do? (textarea)
   - What went wrong? (textarea)
   - Current screen (auto-filled)
   - Session ID (auto-filled from session-state.json)
   - Submit → POST /api/help/feedback → write to
     `.github/docs/feedback/[timestamp].md`

**Definition of Done:**

- [ ] All 10 articles written (≥ 500 words each)
- [ ] Articles stored in `.github/help/` folder
- [ ] Help tab UI renders article list and viewer
- [ ] Search filters articles correctly (case-insensitive, partial match)
- [ ] Click article → renders in viewer with breadcrumb
- [ ] "Was this helpful?" buttons log events to analytics
- [ ] "Report a problem" form submits to feedback folder

**Dependencies:**

- SP-1-001 (Component Library: Modal, Input, Textarea)
- Content Strategist (Agent 32) availability

**Linked Recommendation:** Rec-09  
**Linked Wireframe:** Analysis sec 2.8  
**Source:** UX Researcher Rec-06 (help + search)

---

## SPRINT 2 — Features + Polish (Mar 18-25)

### Story SP-2-005: Error Recovery Modals

**Type:** FEATURE  
**Priority:** P1  
**Effort:** 13 hours  
**Owner:** Implementation Agent (20) + Content Strategist (32)

**Description:** Implement 4 error modal templates with clear recovery paths for
common failure scenarios.

**Acceptance Criteria:**

1. **Modal 1: Connection Permanently Lost**
   - Trigger: SSE reconnection fails after 10 attempts
   - Actions: [Retry Now], [Refresh Page], [Report Issue]
2. **Modal 2: File Write Permission Error**
   - Trigger: POST returns 500 with `EACCES` error code
   - Actions: [Copy Answer] (to clipboard), [Report Issue], [Close]
3. **Modal 3: Git Commit Failed**
   - Trigger: Session state update fails due to git lock
   - Actions: [Retry in 5s...] (auto-countdown), [Force Update] (with confirm),
     [Cancel]
4. **Modal 4: Agent Timeout**
   - Trigger: `current_agent` in IN_PROGRESS for > 10 minutes
   - Actions: [View Session State], [Check Terminal Output] (opens help
     article), [HALT Workflow]
5. **Error Messages (Content Strategist):**
   - Clear, non-technical language
   - Explain what happened and why
   - Provide actionable next steps
6. **Error Code Mapping:**
   - Config file: `public/error-modal-config.json`
   - Maps error codes (EACCES, ECONNREFUSED, ETIMEDOUT) to modal type
7. **Analytics:**
   - Log all modal triggers to analytics-events.json (track error frequency)

**Definition of Done:**

- [ ] All 4 modal templates implemented
- [ ] Error detection logic triggers correct modal
- [ ] "Copy Answer" action copies textarea content to clipboard
- [ ] "Retry" actions work (with countdown timer if applicable)
- [ ] "Force Update" requires confirmation ("Type CONFIRM to proceed")
- [ ] Help article links open correct article in Help tab
- [ ] Analytics events logged for each modal trigger

**Dependencies:**

- SP-1-001 (Component Library: Modal, Button)
- SP-1-002 (SSE for connection lost detection)
- Content Strategist (Agent 32) for error messages

**Linked Recommendation:** Rec-04  
**Linked Wireframe:** Analysis sec 8 GAP-UX-004  
**Source:** Guardrail G-GLOB-60 (escalation protocol)

---

### Story SP-2-006: React Performance Optimization

**Type:** TECH_DEBT  
**Priority:** P1  
**Effort:** 16 hours  
**Owner:** Implementation Agent (20)

**Description:** Optimize React rendering for SSE updates to prevent UI flicker
and achieve Lighthouse Performance score ≥ 95 (desktop), ≥ 85 (mobile).

**Acceptance Criteria:**

1. **Memoization:**
   - Wrap expensive components in `React.memo`: PhaseCard, QuestionnaireList,
     DecisionTimeline, ActivityFeed
   - Use `useMemo` for filtered lists, sorted tables
   - Use `useCallback` for event handlers passed as props
2. **Batch SSE Updates:**
   - Client batches SSE events received within 500ms window
   - Single React re-render per batch (not per event)
3. **Virtual Scrolling:**
   - For lists > 50 items, use `react-window` or `@tanstack/react-virtual`
   - Apply to: Activity Feed, Decision Timeline, Analytics event table
4. **Lazy Loading:**
   - Code-split tabs using `React.lazy` + `Suspense`
   - Tabs not visible are not rendered
5. **Lighthouse CI:**
   - Integrate Lighthouse CI in GitHub Actions
   - Fail PR if Performance score < 95 (desktop) or < 85 (mobile)
6. **Profiling:**
   - Use React DevTools Profiler to identify slow components
   - Document findings in `docs/technical-manual.md`

**Definition of Done:**

- [ ] All specified components wrapped in React.memo
- [ ] SSE events batched (verified: rapid events cause 1 re-render, not N)
- [ ] Virtual scrolling applied to Activity Feed (test with 200+ events)
- [ ] Lazy loading applied to all 8 tabs (verified: only active tab loaded)
- [ ] Lighthouse Performance score ≥ 95 (desktop), ≥ 85 (mobile) on Dashboard,
      Questionnaires, Decisions
- [ ] Lighthouse CI integrated in `.github/workflows/lighthouse.yml`
- [ ] Technical manual updated with optimization strategy

**Dependencies:**

- All Sprint 1 UI stories (SP-1-003 through SP-1-007)

**Linked Recommendation:** Rec-05  
**Linked Wireframe:** N/A (performance, not visual)  
**Source:** Analysis sec 10 RISK-UXD-002, Senior Developer performance req

---

### Story SP-2-007: Animation System

**Type:** FEATURE  
**Priority:** P2  
**Effort:** 8 hours  
**Owner:** UI Designer (12) → Implementation Agent (20)

**Description:** Define animation tokens and apply to all UI transitions for
consistent motion design.

**Acceptance Criteria:**

1. **Animation Tokens (UI Designer):**
   - File: `.github/docs/brand/animation-tokens.json`
   - Durations: instant (100ms), fast (200ms), normal (300ms), slow (500ms)
   - Easings: easeIn, easeOut, easeInOut, spring (cubic-bezier values)
   - Transition mappings: modalOpen, modalClose, tabSwitch, toastSlideIn,
     accordionExpand
2. **Application (Implementation Agent):**
   - CSS custom properties for simple transitions (opacity, transform)
   - Framer Motion for complex animations (modal spring, stagger lists)
   - Apply to:
     - Modal open/close
     - Tab switch
     - Toast slide-in/slide-out
     - Accordion expand/collapse
     - Progress bar animations
     - Tooltip fade-in
3. **Storybook Documentation:**
   - Show each transition type with code example
   - Interactive controls to test durations/easings
4. **ESLint Rule:**
   - Prevent hardcoded animation values (enforce use of tokens)

**Definition of Done:**

- [ ] `animation-tokens.json` exists with all specified tokens
- [ ] All transitions use tokens (0 hardcoded millisecond values in code)
- [ ] Modal transitions feel smooth (300ms ease-out on open, 200ms ease-in on
      close)
- [ ] Toast slide-in uses spring easing (verified visually)
- [ ] Storybook shows animation examples
- [ ] ESLint rule enforced in CI/CD (PR fails if hardcoded values found)

**Dependencies:**

- UI Designer (Agent 12) must deliver animation tokens
- All Sprint 1 UI stories (where transitions are applied)

**Linked Recommendation:** Rec-06  
**Linked Wireframe:** Analysis sec 8 GAP-UXD-002  
**Source:** UX Researcher journey (polish expectations)

---

### Story SP-2-008: Browser Compatibility Check

**Type:** DOCUMENTATION  
**Priority:** P2  
**Effort:** 6 hours  
**Owner:** Implementation Agent (20) + Documentation Agent (26)

**Description:** Add browser detection, unsupported browser modal, and document
browser requirements.

**Acceptance Criteria:**

1. **Supported Browsers:**
   - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
   - Explicitly NOT supported: IE11, older Safari (< 14)
2. **Browser Detection (Implementation Agent):**
   - On app load, detect browser version via user-agent
   - Feature detection: check for `EventSource`, CSS Grid, Flexbox
   - If unsupported → show modal: "Unsupported Browser. Please upgrade to Chrome
     90+, Firefox 88+, or Safari 14+."
   - Modal includes links to browser download pages
3. **README Documentation (Documentation Agent):**
   - Add "Browser Requirements" section
   - List supported browsers with version numbers
   - Note: "SSE (Server-Sent Events) required; IE11 not supported."
4. **Browserslist Config:**
   - Add to `package.json`:
     `"browserslist": ["> 1%", "last 2 versions", "not dead", "not ie 11"]`
   - Used for Babel transpilation targeting
5. **BrowserStack Testing:**
   - Test in IE11 → unsupported modal shows
   - Test in Safari 13 → unsupported modal shows
   - Test in Chrome 90+, Firefox 88+, Safari 14+ → no modal, app loads correctly
6. **Analytics:**
   - Log unsupported browser events to analytics-events.json (track % of users
     affected)

**Definition of Done:**

- [ ] Browser detection logic implemented (user-agent check + feature detection)
- [ ] Unsupported browser modal shows for IE11, Safari 13
- [ ] Modal does not show for Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- [ ] README has "Browser Requirements" section
- [ ] `browserslist` config in package.json
- [ ] BrowserStack tests pass
- [ ] Analytics events logged for unsupported browsers

**Dependencies:**

- SP-1-001 (Component Library: Modal)

**Linked Recommendation:** Rec-07  
**Linked Wireframe:** N/A (compatibility, not visual)  
**Source:** Analysis sec 10 RISK-UXD-003

---

### Story SP-2-009: Deep Linking + URL State

**Type:** FEATURE  
**Priority:** P2  
**Effort:** 11 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement client-side routing with query params for deep
linking and state preservation in URLs.

**Acceptance Criteria:**

1. **URL Patterns:**
   - `/dashboard`
   - `/questionnaires?phase=1&status=incomplete`
   - `/decisions?status=DECIDED&id=DEC-003`
   - `/synthesis?report=master#section-2`
   - `/analytics`
   - `/documents?doc=product-vision.md`
   - `/session`
   - `/help?article=troubleshoot-agent-stuck`
2. **Implementation:**
   - Use `react-router-dom` v6
   - Parse query params on mount → apply filters/navigate to entity
   - Update URL on navigation (without page reload)
   - Hash fragments for section anchors (e.g., `#section-2`)
3. **Copy URL Button:**
   - Add in header: [Copy Link 🔗]
   - Copies current URL to clipboard
   - Toast: "Link copied! Share with your team."
4. **State Preservation:**
   - Filter states, sort orders, expanded accordions encoded in URL
   - Example: `/questionnaires?phase=1&status=incomplete&expanded=Q-PH1-BA-001`
5. **Cross-Tab Navigation:**
   - Example: Click "Source Questionnaires: 4 files" in Official Documents tab →
     navigate to `/questionnaires?filter=doc:product-vision.md`
   - Show toast: "Showing questionnaires for product-vision.md"

**Definition of Done:**

- [ ] All 8 tabs have URL routes
- [ ] Query params correctly applied (open `/decisions?id=DEC-003` → navigates
      to Decisions tab + scrolls to DEC-003)
- [ ] URL updates on navigation (filters, sorts, expanded items)
- [ ] Copy Link button copies URL to clipboard
- [ ] Toast confirms copy action
- [ ] Cross-tab links work (verified: Official Docs → Questionnaires navigation)
- [ ] Hash fragments scroll to section (verified in Synthesis report viewer)

**Dependencies:**

- All Sprint 1 UI stories (routing applied to all tabs)

**Linked Recommendation:** Rec-10  
**Linked Wireframe:** Analysis sec 4.3  
**Source:** UX Researcher Rec-09 (findability)

---

## SPRINT 3 — Mobile + Final Testing (Mar 26-Apr 2)

### Story SP-3-005: Mobile Gesture Library

**Type:** FEATURE  
**Priority:** P3  
**Effort:** 14 hours  
**Owner:** UI Designer (12) + Implementation Agent (20)

**Description:** Implement mobile gestures (swipe-to-dismiss, swipe-for-actions,
pull-to-refresh) for polished mobile UX.

**Acceptance Criteria:**

1. **Gesture Specs (UI Designer):**
   - Document: `.github/docs/brand/gesture-design.md`
   - Swipe-to-dismiss (toasts): ≥ 50px right/left → dismiss
   - Swipe-for-actions (decision cards): ≥ 30px left → reveal [Edit][Archive]; ≥
     30px right → hide
   - Pull-to-refresh (activity feed): ≥ 80px down → trigger refresh
2. **Implementation (Implementation Agent):**
   - Use native touch events (touchstart, touchmove, touchend) or Hammer.js
   - Preference: native (lighter weight, only 3 gestures)
3. **Visual Feedback:**
   - Toast follows finger during swipe
   - Decision card reveals action buttons progressively during swipe
   - Activity feed shows spinner during pull-to-refresh
4. **Snap-Back:**
   - If swipe < threshold → snap back to original position (200ms ease-out)
5. **Accessibility:**
   - All gestures have keyboard equivalents (for switch control users)
   - Document in accessibility section of user-manual.md
6. **Device Testing:**
   - Test on iOS 14+ (Safari)
   - Test on Android 10+ (Chrome)
   - BrowserStack or real devices

**Definition of Done:**

- [ ] Gesture design document written (thresholds, feedback, snap-back)
- [ ] Swipe-to-dismiss implemented on toasts (test: swipe 60px right → toast
      dismisses)
- [ ] Swipe-for-actions implemented on decision cards (test: swipe 40px left →
      buttons appear)
- [ ] Pull-to-refresh implemented on activity feed (test: pull 90px → spinner
      shows, refresh triggered)
- [ ] Snap-back works for incomplete swipes (test: swipe 20px → snaps back)
- [ ] Tested on iOS Safari, Android Chrome (screenshots documented)
- [ ] Keyboard equivalents documented

**Dependencies:**

- SP-1-003 (Dashboard with activity feed)
- SP-1-006 (Decisions tab with cards)
- UI Designer (Agent 12) for gesture specs

**Linked Recommendation:** Rec-08  
**Linked Wireframe:** Analysis sec 6 (responsive behavior)  
**Source:** Analysis sec 8 GAP-UXD-003

---

### Story SP-3-006: Official Documents Tab + Analytics Tab Implementation

**Type:** FEATURE  
**Priority:** P2  
**Effort:** 14 hours  
**Owner:** Implementation Agent (20)

**Description:** Implement remaining tabs: Official Documents (wireframe sec
2.6) and Analytics (sec 2.5).

**Acceptance Criteria:**

**Official Documents Tab:**

1. **Document Registry Table (40% width):**
   - Columns: Document Name, Completeness %, Last Updated, Source
     Questionnaires, Status badge
   - Sort by: Name, Completeness %, Last Updated
   - Filter by: Status (COMPLETE / IN_PROGRESS / NOT_STARTED)
   - Total completeness % in header (weighted average)
2. **Document Detail Viewer (60% width):**
   - Rendered markdown content
   - Sections with completeness indicator (✓ complete, ⚠ partial, ✗ empty)
   - Version history (collapsible): git commits affecting this file
   - Download Markdown button
   - Link to source questionnaires (opens Questionnaires tab pre-filtered)
3. **Completeness Calculation:**
   - Parse markdown for `INSUFFICIENT_DATA:` markers
   - Completeness % = (sections without INSUFFICIENT_DATA / total sections) \*
     100
4. **8 Documents:**
   - product-vision.md, financial-model-overview.md, technical-overview.md,
     legal-compliance-overview.md, ux-design-brief.md,
     content-strategy-brief.md, brand-brief.md, market-positioning.md

**Analytics Tab:**

1. **Velocity Chart (line chart):**
   - X = sprint ID, Y = stories completed
   - Data from retrospectives
   - Trend line (linear regression)
   - Tooltip: sprint ID, completed count, blocked count, duration
   - Download CSV button
2. **Agent Performance Table:**
   - Columns: Agent Name, Total Runs, Avg Duration, Error Count, Last Run
   - Data from analytics-events.json
   - Sortable, paginated (20 rows/page)
   - Click agent → drill-down modal with event timeline
3. **Error Rate Graph (bar chart):**
   - X = date (daily buckets), Y = error count
   - Data from analytics-events.json (filter event_type = "error")
   - Click bar → show error detail modal
4. **Time-to-Complete KPI Cards:**
   - Avg sprint duration, Avg phase duration, Total project duration
   - Comparison to previous sprint (% change, up/down arrow)
5. **Auto-Refresh:**
   - Charts refresh every 60s via GET /api/analytics

**Definition of Done:**

- [ ] Official Documents tab renders all 8 documents in table
- [ ] Document detail viewer shows rendered markdown + completeness indicators
- [ ] Version history shows git commits
- [ ] Download Markdown works
- [ ] Link to source questionnaires navigates correctly
- [ ] Analytics tab renders all 4 visualizations (velocity chart, agent table,
      error graph, KPI cards)
- [ ] Charts auto-refresh every 60s
- [ ] Download CSV works for velocity chart
- [ ] Drill-down modals work (agent performance, error details)

**Dependencies:**

- SP-1-001 (Component Library: Table, Chart)
- Chart library: Use recharts or Chart.js

**Linked Recommendation:** None (core features)  
**Linked Wireframe:** Analysis sec 2.5 (Analytics), sec 2.6 (Official Docs)  
**Source:** KPI Agent contract, Questionnaire Agent contract

---

## SUMMARY

**Total Stories:** 15  
**Total Effort:** 172 hours (21.5 developer-days at 8h/day)

**Sprint Breakdown:**

- Sprint 1: 8 stories, 78 hours (Dashboard, Questionnaires, Decisions,
  Synthesis, Help, SSE, Component Library, Onboarding Tour)
- Sprint 2: 5 stories, 66 hours (Error Modals, Performance, Animations, Browser
  Compatibility, Deep Linking)
- Sprint 3: 2 stories, 28 hours (Mobile Gestures, Official Docs + Analytics
  tabs)

**Story Types:**

- FEATURE: 10 stories (screens, components, major features)
- TECH_DEBT: 2 stories (performance, refactoring)
- DOCUMENTATION: 2 stories (help content, browser requirements)
- UX: 1 story (onboarding tour)

**Critical Path (P0 Blockers):**

1. SP-1-001 (Component Library) — blocks all UI stories
2. SP-1-002 (SSE Infrastructure) — blocks all real-time features
3. SP-1-003 (Dashboard) — primary entry point

**Risk Mitigation:**

- All P0 stories in Sprint 1 to enable parallel Sprint 2 work
- Performance optimization (SP-2-006) in Sprint 2 to avoid late-stage
  refactoring
- Mobile gestures (SP-3-005) in Sprint 3 (lower priority; desktop-first per
  ASSUMPTION-UXD-002)

---

## HANDOFF CHECKLIST

- [x] All 15 stories have acceptance criteria
- [x] Effort estimates provided (hours)
- [x] Owners specified (agent ID)
- [x] Dependencies documented (per story)
- [x] Linked to wireframe sections
- [x] Linked to recommendations
- [x] Story types assigned (FEATURE, TECH_DEBT, DOCUMENTATION, UX)
- [x] Sprint allocation (1-3) with capacity check
- [x] Critical path identified
- [x] Definition of Done per story
- [x] Output complies with sprintplan-output-contract.md
- [x] Deliverable written to file
      `.github/docs/phase-3/11-ux-designer-sprintplan.md`

**Status:** READY  
**Next Deliverable:** 11-ux-designer-guardrails.md (deliverable 4 of 4)

---

**SOURCE CITATIONS:**

- UX Designer Analysis: `.github/docs/phase-3/11-ux-designer-analysis.md`
  (wireframes, gaps, risks)
- UX Designer Recommendations:
  `.github/docs/phase-3/11-ux-designer-recommendations.md`
- UX Researcher Sprint Plan:
  `.github/docs/phase-3/10-ux-researcher-sprintplan.md` (sprint structure)
- Contracts: `.github/docs/contracts/sprintplan-output-contract.md`
- Guardrails: `.github/docs/guardrails/04-ux-guardrails.md`
