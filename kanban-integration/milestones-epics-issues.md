# Kanban Integration — GitHub Milestones, Epics & Issues

> Ready to import into GitHub  
> Format: GitHub-compatible markdown  
> Traceability: all issues reference source files and validation findings

---

## MILESTONES

---

### M1 — Data & API Layer

**Title:** `[Kanban] M1: Data & API Layer`

**Description:**
Verify and extend the backend session API to guarantee all data required by the Kanban board is available, paginated, and filterable. This milestone has zero UI work. Output is a stable, tested backend contract that M2 can consume without surprises.

**Success criteria:**

- `GET /api/v1/sessions` returns all fields required by the card schema (`02-card-schema.md`)
- `blockers` and `open_human_escalations` arrays populated correctly in a running session
- Pagination confirmed working for session list
- `GET /api/v1/approvals?session_id=:id` returns approval entries for a session
- All verified endpoints have integration tests

**Dependencies:** None  
**Blocks:** M2

---

### M2 — Board UI Shell

**Title:** `[Kanban] M2: Board UI Shell`

**Description:**
A static column layout rendered as a new route in the web app. Columns are derived from the FSM state machine. Cards are populated from the session API. No live updates, no write-back, no overrides in this milestone. The goal is a correct, readable board that shows the right sessions in the right columns.

**Success criteria:**

- New route `/kanban` exists in the web app
- 13 columns rendered matching `01-column-schema.md`
- Sessions appear in the correct column based on `current_phase`
- Command-mode filtering hides inapplicable columns
- HOTFIX sessions render only Intake/Executing/Completed columns
- Session cards show: session ID, cycle type, current phase, active agent, started timestamp
- Mobile is not a target for this milestone (desktop-first board layout)

**Dependencies:** M1  
**Blocks:** M3

---

### M3 — Live State + Card Schema + Badges

**Title:** `[Kanban] M3: Live State, Card Schema & Badges`

**Description:**
Add live session data (polling or SSE), full card schema with all fields, and the badge system. After this milestone, a board operator can see blocked sessions, pending escalations, gate failures, and confidence signals at a glance.

**Success criteria:**

- Board auto-refreshes without page reload (polling ≤30s or SSE)
- Cards move between columns as sessions progress through FSM phases
- All badge rules from `03-badge-rules.md` implemented and tested
- BLOCKED, ESCALATION, APPROVAL PENDING badges shown correctly
- ERROR badge routes to cockpit Root-Cause Analysis tab
- Column aggregate badges (escalation count, blocked count) in column headers
- Cards are sortable within a column (last updated, oldest first, escalations first)

**Dependencies:** M2  
**Blocks:** M4

---

### M4 — Write-Back & Governed Overrides

**Title:** `[Kanban] M4: Write-Back & Governed Overrides`

**Description:**
Add the controlled override capability: pause, resume, force gate pass, cancel, and reroute — all with confirmation dialogs, audit trail writes, and role enforcement. After this milestone, the board is an operational control surface, not just a viewer.

**Success criteria:**

- Right-click context menu on cards with role-gated override options
- Confirmation dialog shows current state, target state, required role, mandatory reason
- Pause/resume calls `POST /api/v1/orchestrator/command`
- Forced gate pass calls `POST /api/v1/approvals/:id/approve` with audit reason
- All overrides written to `human-override-events.json` pattern
- OVERRIDE badge displayed on card after override (configurable visibility window)
- Invalid drag targets rejected with tooltip explanation
- Role enforcement tested (read-only cannot access override menu)

**Dependencies:** M3  
**Blocks:** M5

---

### M5 — WIP Limits, Multi-Mode Filtering & Refinements

**Title:** `[Kanban] M5: WIP Limits, Filtering & Refinements`

**Description:**
Production-readiness milestone. Adds configurable WIP limit warnings, advanced filtering by mode/status/team, and any UX refinements identified during M4 testing. This is the final milestone for initial board feature completion.

**Success criteria:**

- Configurable soft WIP limits per column (advisory, not enforced)
- Column header shows WIP status (current / limit)
- Filter bar: by command mode, session status, blocked, awaiting approval
- Saved filter presets per user
- Board header shows alert when any session has been stale > configurable threshold
- Accessibility: keyboard navigation for board columns and cards
- Performance: board loads < 2s for up to 100 concurrent sessions

**Dependencies:** M4  
**Blocks:** (none — board feature complete after M5)

---

---

## EPICS

---

### Epic 1: Session API contract

**Title:** `[Kanban] Epic: Session API contract for board data`

**Description:**
Verify and extend backend API to support full Kanban card schema. All card fields documented in `02-card-schema.md` must be reliably returned from existing or new endpoints. This epic delivers no UI — only a stable, tested API contract.

**Source:** `kanban-integration/02-card-schema.md`, `kanban-integration/05-api-mapping.md`  
**Milestone:** M1  
**Labels:** `kanban`, `backend`, `api`

**Acceptance criteria:**

- [ ] `GET /api/v1/sessions` returns all card-required fields
- [ ] `blockers[]` and `open_human_escalations[]` populated from live session state
- [ ] Pagination working on session list
- [ ] Integration tests cover all card-schema fields

---

### Epic 2: Column layout component

**Title:** `[Kanban] Epic: Column layout component`

**Description:**
Static board layout component with 13 columns derived from the FSM state machine. Column visibility adapts to command mode. HOTFIX sessions render a condensed column set. No live data in this epic.

**Source:** `kanban-integration/01-column-schema.md`  
**Milestone:** M2  
**Labels:** `kanban`, `frontend`, `ui`

**Acceptance criteria:**

- [ ] `KanbanBoard` component renders all 13 columns
- [ ] Column definitions sourced from FSM state enum (not hardcoded strings)
- [ ] HOTFIX column set (3 columns) renders correctly
- [ ] Partial-mode column sets render with visual truncation indicator
- [ ] Gate columns visually distinct from work-phase columns
- [ ] Responsive minimum width enforced (horizontal scroll below breakpoint)

---

### Epic 3: Session card component

**Title:** `[Kanban] Epic: Session card component`

**Description:**
Card component representing one SDLC session. Renders all fields from card schema, handles loading/skeleton state, and navigates to cockpit detail on click.

**Source:** `kanban-integration/02-card-schema.md`  
**Milestone:** M2  
**Labels:** `kanban`, `frontend`, `ui`

**Acceptance criteria:**

- [ ] `SessionCard` renders: session ID (short), cycle type, current phase, active agent, progress bar, timestamps
- [ ] Skeleton state while data loads
- [ ] Click opens cockpit detail view for the session
- [ ] Card handles all `SessionStatus` values correctly (`active`, `paused`, `failed`, `completed`)

---

### Epic 4: Board data layer & polling

**Title:** `[Kanban] Epic: Board data layer & polling`

**Description:**
Data fetching layer for the board: initial load, per-column session grouping, and 30s polling fallback. SSE upgrade path included as an optional follow-on.

**Source:** `kanban-integration/05-api-mapping.md`  
**Milestone:** M3  
**Labels:** `kanban`, `frontend`, `data`

**Acceptance criteria:**

- [ ] Board fetches sessions on mount, groups by `current_phase` into columns
- [ ] 30s polling keeps columns up-to-date without full page reload
- [ ] Sessions visibly move between columns as phase progresses
- [ ] Error state shown if API call fails (no silent failures)
- [ ] SSE integration path documented (even if not implemented in M3)

---

### Epic 5: Badge system

**Title:** `[Kanban] Epic: Badge system`

**Description:**
All card badges from `03-badge-rules.md`: BLOCKED, ESCALATION, APPROVAL PENDING, PAUSED, ERROR, GATE FAILED, HOTFIX MODE, LOW CONFIDENCE, STALE. Priority stacking and column aggregate badges.

**Source:** `kanban-integration/03-badge-rules.md`  
**Milestone:** M3  
**Labels:** `kanban`, `frontend`, `ui`, `governance`

**Acceptance criteria:**

- [ ] All 9 badge types implemented
- [ ] Priority stacking correct (ERROR > ESCALATION > GATE FAILED > BLOCKED > …)
- [ ] Overflow badge shown when > 3 badges apply
- [ ] Column aggregate badges in column headers (escalation count, blocked count)
- [ ] LOW CONFIDENCE badge conditional on confidence field availability (deferred to M3 if field not confirmed)

---

### Epic 6: Governed override system

**Title:** `[Kanban] Epic: Governed override system`

**Description:**
Controlled drag-and-drop and context menu overrides. All overrides require confirmation, audit reason, and role check. Writes back through orchestrator API to preserve governance audit trail.

**Source:** `kanban-integration/04-override-model.md`  
**Milestone:** M4  
**Labels:** `kanban`, `frontend`, `backend`, `governance`, `security`

**Acceptance criteria:**

- [ ] Context menu on card with: Pause, Resume, Force Gate Pass, Cancel, Reroute
- [ ] Confirmation dialog: current state, target state, required role, mandatory reason field
- [ ] All overrides call orchestrator/approvals endpoints (not direct state writes)
- [ ] Override events logged to audit trail
- [ ] Invalid drag targets shown with tooltip explanation
- [ ] Read-only users cannot see override options
- [ ] Operator role can pause/resume
- [ ] Admin role can force gate pass and reroute

---

### Epic 7: WIP limits & advanced filtering

**Title:** `[Kanban] Epic: WIP limits & advanced filtering`

**Description:**
Configurable WIP limit per column (advisory), filter bar by command mode/status/blocked/escalation, saved filter presets, stale session alerts.

**Source:** `kanban-integration/01-column-schema.md` (filtering model section)  
**Milestone:** M5  
**Labels:** `kanban`, `frontend`, `ux`

**Acceptance criteria:**

- [ ] Per-column WIP limit configurable (default from config file)
- [ ] Column header WIP indicator: current / limit, warning color at threshold
- [ ] Filter bar: command mode, status, blocked, awaiting approval
- [ ] Filter presets saved per user (localStorage or user profile)
- [ ] Stale session alert in board header bar

---

---

## ISSUES

---

### Issue 1.1: Audit session API response — verify card schema fields

**Title:** `[Kanban] Audit GET /api/v1/sessions response against card schema`

**Labels:** `kanban`, `backend`, `api`, `M1`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 0.5 day

**Body:**
Verify that `GET /api/v1/sessions` and `GET /api/v1/sessions/:id` return all fields required by the card schema (`kanban-integration/02-card-schema.md`).

**Required fields to verify:**

- `session_id`
- `cycle_type`
- `status` (one of `active | completed | failed | paused`)
- `current_phase` (FSM state name)
- `current_agent`
- `initiated_at`
- `last_updated`
- `blockers[]`
- `open_human_escalations[]`
- `completed_phases[]`

**Acceptance criteria:**

- [ ] Each field present and non-null in a running session response
- [ ] `blockers` and `open_human_escalations` are arrays (not undefined)
- [ ] All findings documented in a PR comment or test file

---

### Issue 1.2: Add pagination to GET /api/v1/sessions

**Title:** `[Kanban] Add pagination support to GET /api/v1/sessions`

**Labels:** `kanban`, `backend`, `api`, `M1`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 1 day

**Body:**
The board may display 50–200 concurrent sessions in larger deployments. `GET /api/v1/sessions` must support pagination to avoid loading all sessions in a single request.

**Proposed API shape:**

```
GET /api/v1/sessions?page=1&pageSize=50&status=active
Response: { data: SessionState[], total: number, page: number, pageSize: number }
```

**Acceptance criteria:**

- [ ] `page` and `pageSize` query params supported
- [ ] `status` filter supported (`active | paused | failed | completed`)
- [ ] Default `pageSize=50`, max `pageSize=200`
- [ ] Integration test covers paginated response
- [ ] Backward compatible (no pagination params = returns first 50)

---

### Issue 1.3: Integration tests for session API fields

**Title:** `[Kanban] Integration tests: session API fields required by board`

**Labels:** `kanban`, `backend`, `testing`, `M1`  
**Milestone:** M1  
**Epic:** Epic 1  
**Estimate:** 1 day

**Body:**
Write integration tests that assert all card-schema fields are present and correctly typed in live API responses.

**Acceptance criteria:**

- [ ] Test file: `tests/integration/sessions-board-contract.test.ts`
- [ ] Tests cover: all fields in card schema, `blockers[]` populated for a session with a known blocker, `open_human_escalations[]` populated for a session with a known escalation
- [ ] Tests run in CI

---

### Issue 2.1: Create /kanban route and KanbanBoard shell

**Title:** `[Kanban] Create /kanban route and KanbanBoard layout shell`

**Labels:** `kanban`, `frontend`, `ui`, `M2`  
**Milestone:** M2  
**Epic:** Epic 2  
**Estimate:** 1 day

**Body:**
Create a new route `/kanban` in the web app that renders a basic `KanbanBoard` component. No data, no real cards — just the column layout.

**Files to create:**

- `src/webapp/ui/src/pages/kanban/kanban-board-page.tsx` — page wrapper
- `src/webapp/ui/src/components/kanban/KanbanBoard.tsx` — board component
- Register route in the router

**Acceptance criteria:**

- [ ] `/kanban` route exists and renders without errors
- [ ] Route link added to main navigation
- [ ] Page passes existing lint and TypeScript checks
- [ ] Unit test: `KanbanBoard` renders without crashing

---

### Issue 2.2: Implement column definitions from FSM state enum

**Title:** `[Kanban] Implement column definitions derived from FSM state enum`

**Labels:** `kanban`, `frontend`, `ui`, `M2`  
**Milestone:** M2  
**Epic:** Epic 2  
**Estimate:** 1 day

**Body:**
Column definitions must be derived from the FSM state machine (`platform/engine/state-machine.ts`), not hardcoded label strings. Create a `useKanbanColumns` hook or `getColumnsForMode(mode)` utility that returns the correct column set for a given command mode.

**Source:** `kanban-integration/01-column-schema.md`

**Acceptance criteria:**

- [ ] `getColumnsForMode('CREATE')` → 13 columns
- [ ] `getColumnsForMode('HOTFIX')` → 3 columns (Intake, Executing, Completed)
- [ ] `getColumnsForMode('CREATE_BUSINESS')` → columns up through Critic Gate 1 (4 columns), remainder hidden with truncation indicator
- [ ] Gate columns visually distinct from work-phase columns (e.g., narrower, different background)
- [ ] Unit tests cover all 9 command modes

---

### Issue 2.3: SessionCard component — basic fields

**Title:** `[Kanban] SessionCard component — basic field rendering`

**Labels:** `kanban`, `frontend`, `ui`, `M2`  
**Milestone:** M2  
**Epic:** Epic 3  
**Estimate:** 1.5 days

**Body:**
Implement the `SessionCard` component rendering the basic card fields. No badges (M3), no live data (M3), no overrides (M4).

**Source:** `kanban-integration/02-card-schema.md` (layout section)

**Acceptance criteria:**

- [ ] Renders: session ID (first 8 chars + copy button), cycle type tag, current phase label, active agent name, phase progress bar, initiated_at, last_updated
- [ ] Skeleton state shown when `isLoading`
- [ ] Click handler calls `onSelect(sessionId)`
- [ ] Different visual treatment for `status: failed` vs `status: paused` vs `status: active`
- [ ] Unit tests with mocked session data for each `SessionStatus` value

---

### Issue 2.4: Board initial data load — group sessions by column

**Title:** `[Kanban] Initial board data load — group sessions by current_phase`

**Labels:** `kanban`, `frontend`, `data`, `M2`  
**Milestone:** M2  
**Epic:** Epic 4  
**Estimate:** 1 day

**Body:**
Fetch session list from `GET /api/v1/sessions` on board mount and distribute cards into the correct columns based on `current_phase`.

**Acceptance criteria:**

- [ ] Board fetches sessions on mount
- [ ] Sessions grouped correctly — a session with `current_phase: 'PHASE_1'` appears in the Business Analysis column
- [ ] Empty columns render a placeholder "No sessions" state, not an error
- [ ] Loading state while fetch is in progress
- [ ] Error state if fetch fails (with retry option)

---

### Issue 3.1: Board polling — 30s keep-alive refresh

**Title:** `[Kanban] Board polling — 30 second session refresh`

**Labels:** `kanban`, `frontend`, `data`, `M3`  
**Milestone:** M3  
**Epic:** Epic 4  
**Estimate:** 0.5 day

**Body:**
After initial load, re-fetch `GET /api/v1/sessions` every 30 seconds. Updated sessions should move to their new column without full page reload.

**Acceptance criteria:**

- [ ] Polling interval: 30 seconds (configurable via env var)
- [ ] Session that moved from PHASE_1 to CRITIC_1 appears in correct column after poll
- [ ] No visible flicker on refresh — smooth card transition
- [ ] Polling stops when board is not visible (tab/window not focused)
- [ ] Polling cleared on component unmount

---

### Issue 3.2: Badge system — BLOCKED, ESCALATION, APPROVAL PENDING

**Title:** `[Kanban] Badge system — BLOCKED, ESCALATION, APPROVAL PENDING`

**Labels:** `kanban`, `frontend`, `ui`, `governance`, `M3`  
**Milestone:** M3  
**Epic:** Epic 5  
**Estimate:** 1.5 days

**Body:**
Implement the three highest-priority badges on `SessionCard`:

- `BLOCKED` — `blockers.length > 0`
- `ESCALATION` — `open_human_escalations.length > 0`
- `APPROVAL PENDING` — pending `ApprovalEntry` for this session

**Source:** `kanban-integration/03-badge-rules.md`

**Acceptance criteria:**

- [ ] All 3 badges rendered with correct color and label
- [ ] Tooltip on BLOCKED shows list of blocker descriptions
- [ ] Tooltip on ESCALATION shows escalation descriptions
- [ ] ESCALATION badge click opens inline approval panel
- [ ] Column aggregate badges in column headers (escalation + blocked counts)
- [ ] Unit tests: badge renders when condition true, does not render when false

---

### Issue 3.3: Badge system — PAUSED, ERROR, GATE FAILED, HOTFIX, STALE

**Title:** `[Kanban] Badge system — PAUSED, ERROR, GATE FAILED, HOTFIX, STALE`

**Labels:** `kanban`, `frontend`, `ui`, `M3`  
**Milestone:** M3  
**Epic:** Epic 5  
**Estimate:** 1.5 days

**Body:**
Remaining badges: `PAUSED`, `ERROR`, `GATE FAILED`, `HOTFIX MODE`, `STALE`.

**Source:** `kanban-integration/03-badge-rules.md`

**Acceptance criteria:**

- [ ] All badges render for their correct trigger conditions
- [ ] Badge priority stacking implemented correctly (ERROR > ESCALATION > GATE FAILED > BLOCKED > PAUSED > …)
- [ ] Overflow badge `+N more` when > 3 conditions apply
- [ ] ERROR badge click routes to cockpit Root-Cause Analysis tab
- [ ] GATE FAILED badge shows which conditions failed (B1-GATE-001, B1-GATE-002, B1-GATE-003)
- [ ] STALE threshold configurable (default 2 hours)

---

### Issue 4.1: Confirmation dialog for overrides

**Title:** `[Kanban] Override confirmation dialog component`

**Labels:** `kanban`, `frontend`, `ui`, `governance`, `M4`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 1 day

**Body:**
Reusable confirmation dialog for all card override actions. Must display current state, target state, required role, mandatory reason text field, and governance warning.

**Source:** `kanban-integration/04-override-model.md`

**Acceptance criteria:**

- [ ] Dialog shows: session ID, current FSM state, target FSM state, required role, reason field (required)
- [ ] Confirm button disabled until reason is entered
- [ ] Warning text: "This action will be logged to the governance audit trail"
- [ ] Cancel closes dialog with no side effects
- [ ] Accessible: focus trap, ESC to close, ARIA labels
- [ ] Unit test: Confirm disabled with empty reason, enabled with non-empty reason

---

### Issue 4.2: Card context menu — Pause and Resume

**Title:** `[Kanban] Card context menu — Pause and Resume actions`

**Labels:** `kanban`, `frontend`, `backend`, `governance`, `M4`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 1 day

**Body:**
Right-click context menu on `SessionCard` with Pause and Resume actions. Both require confirmation dialog with audit reason.

**Acceptance criteria:**

- [ ] Context menu appears on right-click (and long-press on touch)
- [ ] Pause visible only when `status === 'active'`
- [ ] Resume visible only when `status === 'paused'`
- [ ] Both actions open confirmation dialog (`Issue 4.1`)
- [ ] On confirm: `POST /api/v1/orchestrator/command` with `PAUSE` or `RESUME` command
- [ ] On success: card updates status badge without page reload
- [ ] Operator role required (read-only users do not see menu options)

---

### Issue 4.3: Force gate pass override

**Title:** `[Kanban] Force gate pass override for CRITIC_N columns`

**Labels:** `kanban`, `frontend`, `backend`, `governance`, `security`, `M4`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 1.5 days

**Body:**
Allow admin-role users to force-pass a blocked gate from a CRITIC_N column card.

**Acceptance criteria:**

- [ ] "Force gate pass" in context menu for cards in CRITIC_1 through CRITIC_4 columns
- [ ] Admin role required — operator role cannot see this option
- [ ] Confirmation dialog shows which blocking conditions will be overridden
- [ ] Calls `POST /api/v1/approvals/:gate_id/approve` with override reason
- [ ] Audit event written (contains: who, session, gate, reason, timestamp)
- [ ] OVERRIDE badge shown on card for 15 minutes after override

---

### Issue 4.4: Cancel session action

**Title:** `[Kanban] Card context menu — Cancel session`

**Labels:** `kanban`, `frontend`, `backend`, `governance`, `M4`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 0.5 day

**Body:**
Allow admin-role users to cancel a session from the board.

**Acceptance criteria:**

- [ ] "Cancel session" in context menu (admin role only)
- [ ] Confirmation dialog with mandatory reason
- [ ] Calls `POST /api/v1/orchestrator/command` with `CANCEL` command
- [ ] On success: card moves to ERROR/Completed column or is removed from board
- [ ] Audit event logged

---

### Issue 4.5: Invalid drag target enforcement

**Title:** `[Kanban] Enforce valid drag targets for card drag-and-drop`

**Labels:** `kanban`, `frontend`, `governance`, `M4`  
**Milestone:** M4  
**Epic:** Epic 6  
**Estimate:** 1 day

**Body:**
If drag-and-drop is enabled, the board must prevent invalid drops and explain why.

**Source:** `kanban-integration/04-override-model.md` (prohibited actions table)

**Acceptance criteria:**

- [ ] Dragging to the same column is rejected (no-op, card snaps back)
- [ ] Dragging 2+ columns forward shows tooltip: "Cannot skip phases — use Reroute command"
- [ ] Dragging backwards shows tooltip: "Backward transitions require Reroute command"
- [ ] Dragging HOTFIX card to a gate column is rejected with tooltip
- [ ] Valid adjacent column drop triggers confirmation dialog (Issue 4.1) before executing

---

### Issue 5.1: WIP limit configuration and column header display

**Title:** `[Kanban] WIP limits — configuration and column header display`

**Labels:** `kanban`, `frontend`, `ux`, `M5`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 1 day

**Body:**
Add per-column WIP limit configuration and display in column headers.

**Acceptance criteria:**

- [ ] WIP limits configurable in a settings file or admin UI (JSON config acceptable for M5)
- [ ] Column header shows `(current/limit)` — e.g., `PHASE_1 (3/5)`
- [ ] Warning color applied to column header when at or above limit
- [ ] WIP limit is advisory — no enforcement, no blocked drops
- [ ] Default limits: work phases = 5, gate columns = 10 (high, because gates are transitions)

---

### Issue 5.2: Filter bar — command mode and session status

**Title:** `[Kanban] Filter bar — filter by command mode and session status`

**Labels:** `kanban`, `frontend`, `ux`, `M5`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 1 day

**Body:**
Add a filter bar at the top of the board for command-mode and status filtering.

**Acceptance criteria:**

- [ ] Filter by command mode: multi-select (CREATE, AUDIT, HOTFIX, etc.)
- [ ] Filter by session status: Active, Paused, Failed
- [ ] "Blocked only" toggle — shows only sessions with `blockers.length > 0`
- [ ] "Awaiting approval" toggle — shows only sessions with pending approvals
- [ ] Filters update the board in real-time (no reload)
- [ ] Active filters shown as pills with remove button

---

### Issue 5.3: Stale session board-level alert

**Title:** `[Kanban] Stale session board-level alert banner`

**Labels:** `kanban`, `frontend`, `ux`, `M5`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 0.5 day

**Body:**
When any active session has not updated for longer than the STALE threshold (default: 2 hours), show a board-level alert banner.

**Acceptance criteria:**

- [ ] Alert banner: "N session(s) have been inactive for more than Xh. Review recommended."
- [ ] Banner is dismissible per session board render session (reappears after page reload)
- [ ] Threshold configurable (env var or config)
- [ ] Clicking banner scrolls to or highlights the stale cards

---

### Issue 5.4: Keyboard navigation for board

**Title:** `[Kanban] Keyboard navigation for board columns and cards`

**Labels:** `kanban`, `frontend`, `accessibility`, `M5`  
**Milestone:** M5  
**Epic:** Epic 7  
**Estimate:** 1.5 days

**Body:**
Ensure the board is keyboard-navigable to meet basic accessibility requirements.

**Acceptance criteria:**

- [ ] Tab moves focus through column headers
- [ ] Arrow keys navigate between cards within a column
- [ ] Enter/Space on a card opens the cockpit detail view
- [ ] Context menu accessible via keyboard (right-click equivalent key or menu button on card)
- [ ] Focus ring visible on all interactive elements
- [ ] Passes axe or similar automated a11y check with no critical violations
