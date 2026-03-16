# Phase 06 — Milestones & GitHub Issues

> M11: UI Redesign — Trackable work items for GitHub Projects

---

## 1. Milestone Definition

**Milestone:** `M15: UI Redesign — Runtime Command Center`

- **Description:** Transform the UI from a dashboard into a runtime visualization
  and operator console. Fix separation of concerns, add session/agent/timeline
  views, restructure navigation.
- **Target Completion:** TBD (6 sprints estimated)
- **Branch:** `feature/m11-ui-redesign`

---

## 2. Epic Structure

```
M15: UI Redesign
├── Epic 1: Component Extraction (Sprint 1)
├── Epic 2: Runtime Design System (Sprint 2)
├── Epic 3: Backend API Extensions (Sprint 3)
├── Epic 4: Navigation & New Pages (Sprint 4)
├── Epic 5: Session Detail & Timeline (Sprint 5)
├── Epic 6: Overview & Onboarding (Sprint 6)
└── Epic 7: Documentation / Implementation Consistency (standalone — any time)
```

---

## 3. Issues

### Epic 1: Component Extraction (Sprint 1)

#### Issue M15-001: Create domain component folder structure

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Create the following folders under `src/webapp/ui/src/components/`:

- `runtime/`
- `artifacts/`
- `decisions/`
- `observability/`
- `dashboard/`
- `onboarding/`

Add barrel `index.ts` files to each.

**Acceptance Criteria:**

- [ ] Folders created
- [ ] Index files present

---

#### Issue M15-002: Extract LiveStatusHero from dashboard-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract the `LiveStatusHero` component (~80 lines) from
`pages/dashboard/dashboard-page.tsx` to `components/runtime/live-status-hero.tsx`.

**Acceptance Criteria:**

- [ ] Component extracted with same props/behavior
- [ ] Storybook story created
- [ ] Unit test created
- [ ] Dashboard page imports from new location
- [ ] Dashboard page line count reduced

---

#### Issue M15-003: Extract HealthCard, QuickLinks, RecentCommands from dashboard-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract from `pages/dashboard/dashboard-page.tsx`:

- `HealthCard` → `components/dashboard/health-card.tsx`
- `QuickLinks` → `components/dashboard/quick-links.tsx`
- `RecentCommands` → `components/dashboard/recent-commands.tsx`

**Acceptance Criteria:**

- [ ] 3 components extracted
- [ ] Story for each component
- [ ] Dashboard page ≤ 150 lines
- [ ] All existing dashboard tests pass

---

#### Issue M15-004: Extract LifecycleFlow and CreateDecisionDialog from decisions-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract from `pages/decisions/decisions-page.tsx`:

- `LifecycleFlow` → `components/decisions/lifecycle-flow.tsx`
- `CreateDecisionDialog` → `components/decisions/create-decision-dialog.tsx`
- Column definitions → `pages/decisions/columns.ts`
- Badge/status mappings → `pages/decisions/constants.ts`

**Acceptance Criteria:**

- [ ] Components extracted
- [ ] Stories created
- [ ] Decisions page ≤ 150 lines
- [ ] All existing decision tests pass

---

#### Issue M15-005: Extract PhaseCard, AgentList, GateIndicator from pipeline-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract from `pages/pipeline/pipeline-page.tsx`:

- `PhaseCard` → `components/runtime/phase-card.tsx`
- `AgentList` → `components/runtime/agent-list.tsx`
- `GateIndicator` → `components/runtime/gate-indicator.tsx`

**Acceptance Criteria:**

- [ ] Components extracted
- [ ] Stories created
- [ ] Pipeline page ≤ 150 lines
- [ ] All existing pipeline tests pass

---

#### Issue M15-006: Extract MiniBar, VelocityChart, AgentChart from analytics page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract from `pages/analytics/analytics-trends-page.tsx`:

- `MiniBar` → `components/ui/mini-bar.tsx` (generic primitive)
- `VelocityChart` → `components/observability/velocity-chart.tsx`
- `AgentChart` → `components/observability/agent-chart.tsx`

**Acceptance Criteria:**

- [ ] Components extracted
- [ ] Stories created (MiniBar with multiple variants)
- [ ] Analytics page ≤ 150 lines

---

#### Issue M15-007: Extract DagNode and DagEdge from lineage-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract from `pages/artifacts/lineage-page.tsx`:

- `DagNode` → `components/artifacts/dag-node.tsx`
- `DagEdge` → `components/artifacts/dag-edge.tsx`

**Acceptance Criteria:**

- [ ] Components extracted
- [ ] Stories created
- [ ] Lineage page ≤ 150 lines

---

#### Issue M15-008: Extract inline components from metrics-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract column definitions and badge mappings from `pages/metrics/metrics-page.tsx`
into separate files. Extract any reusable chart subcomponents.

**Acceptance Criteria:**

- [ ] Column definitions in `pages/metrics/columns.ts`
- [ ] Constants in `pages/metrics/constants.ts`
- [ ] Metrics page ≤ 200 lines (complex page, higher threshold allowed)

---

#### Issue M15-009: Extract inline components from governance-dashboard-page

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

Extract column definitions and action components from governance page.

**Acceptance Criteria:**

- [ ] Column definitions in `pages/governance/columns.ts`
- [ ] Governance page ≤ 200 lines

---

#### Issue M15-010: Deduplicate utility functions

**Labels:** `ui-redesign`, `refactor`, `sprint-1`

`relativeTime()` is defined in both `dashboard-page.tsx` and `metric-card.tsx`.
Consolidate to `lib/utils.ts`.

**Acceptance Criteria:**

- [ ] Single `relativeTime` in `lib/utils.ts`
- [ ] Both consumers import from utils
- [ ] No duplicate implementations

---

### Epic 2: Runtime Design System (Sprint 2)

#### Issue M15-011: Build FlowStep component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/flow-step.tsx` per phase-04 spec.
5 status states, active highlight, click handler.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story with all 5 status variants
- [ ] Unit test
- [ ] Responsive (icon-only on mobile)

---

#### Issue M15-012: Build FlowTimeline component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/flow-timeline.tsx` per phase-04 spec.
Horizontal phase flow with connectors.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (empty, mid-progress, completed, failed)
- [ ] Unit test
- [ ] Responsive: horizontal ≥ md, vertical < md

---

#### Issue M15-013: Build AgentCard component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/agent-card.tsx` per phase-04 spec.
Live agent status with task description, progress bar, animations.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (running, completed, failed, retrying, idle)
- [ ] Unit test
- [ ] Pulse animation for running state

---

#### Issue M15-014: Build AgentActivity panel component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/agent-activity.tsx`.
Renders list of AgentCard components, sorted by status.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (empty, single, multi-agent)
- [ ] Unit test

---

#### Issue M15-015: Build RuntimeEvent and RuntimeLog components

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create:

- `components/runtime/runtime-event.tsx` — single event row with type icon
- `components/runtime/runtime-log.tsx` — scrollable event stream with filtering

**Acceptance Criteria:**

- [ ] Both components implemented
- [ ] Stories for each event type
- [ ] Story for empty, few, many events
- [ ] Auto-scroll behavior
- [ ] Filter by event type

---

#### Issue M15-016: Build GateStatus component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/gate-status.tsx` per phase-04 spec.
Replaces simple `GateIndicator` with richer status + reason display.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (passed, pending, blocked, failed)
- [ ] Unit test

---

#### Issue M15-017: Build ExplainabilityPanel component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/explainability-panel.tsx` per phase-04 spec.
Contextual panel showing reason + suggested action.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (gate failure, agent retry, generic)
- [ ] Unit test
- [ ] Dismissible

---

#### Issue M15-018: Build SessionStatus component

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create `components/runtime/session-status.tsx` per phase-04 spec.
Compact active session summary card.

**Acceptance Criteria:**

- [ ] Component implemented
- [ ] Storybook story (active, idle, error, no-session)
- [ ] Unit test

---

#### Issue M15-019: Build StatusDot and TimelineConnector primitives

**Labels:** `ui-redesign`, `new-component`, `sprint-2`

Create:

- `components/ui/status-dot.tsx` — colored status indicator
- `components/ui/timeline-connector.tsx` — visual connector

**Acceptance Criteria:**

- [ ] Both primitives implemented
- [ ] Storybook stories
- [ ] Used by FlowTimeline and RuntimeLog

---

#### Issue M15-020: Create runtime-store.ts

**Labels:** `ui-redesign`, `state-management`, `sprint-2`

Create `stores/runtime-store.ts` with:

- Event ring buffer (500 events max)
- Active session ID tracking
- `addEvent`, `clearEvents`, `setActiveSession`

**Acceptance Criteria:**

- [ ] Store created
- [ ] Unit test for event buffer (add, overflow, clear)
- [ ] Unit test for session tracking

---

### Epic 3: Backend API Extensions (Sprint 3)

#### Issue M15-021: Add session tracking to orchestrator

**Labels:** `ui-redesign`, `backend`, `sprint-3`

Add session lifecycle tracking to the orchestrator:

- Generate session ID when orchestrator starts
- Track session state (active, completed, failed, paused)
- Store session metadata (project, flow, start time)

**Acceptance Criteria:**

- [ ] Session ID generated on orchestrator start
- [ ] Session state persisted
- [ ] Session metadata accessible

---

#### Issue M15-022: Create sessions API endpoints

**Labels:** `ui-redesign`, `backend`, `sprint-3`

Create `routes/sessions.ts` with:

- `GET /api/sessions` — list sessions
- `GET /api/sessions/:id` — session detail
- `GET /api/sessions/:id/timeline` — event timeline

**Acceptance Criteria:**

- [ ] Endpoints implemented
- [ ] Response types match phase-03 spec
- [ ] Integration tests

---

#### Issue M15-023: Extend agent model with detail fields

**Labels:** `ui-redesign`, `backend`, `sprint-3`

Extend `AgentEntry` to include:

- `task_description: string`
- `started_at: string`
- `duration_ms: number`
- `retry_count: number`

**Acceptance Criteria:**

- [ ] Agent model extended
- [ ] Existing progress endpoint returns extended fields
- [ ] No breaking changes to existing consumers

---

#### Issue M15-024: Create agent detail API endpoint

**Labels:** `ui-redesign`, `backend`, `sprint-3`

Create:

- `GET /api/agents` — list all agents with current status
- `GET /api/agents/:id` — agent detail (prompt summary, outputs, history)

**Acceptance Criteria:**

- [ ] Endpoints implemented
- [ ] Response types match phase-03 spec

---

#### Issue M15-025: Add timeline SSE events

**Labels:** `ui-redesign`, `backend`, `sprint-3`

Emit SSE events for timeline visualization:

- `session_start`, `session_complete`
- `phase_start`, `phase_complete`
- `agent_start`, `agent_complete`
- `artifact_created`
- `gate_passed`, `gate_failed`

**Acceptance Criteria:**

- [ ] All event types emitted at appropriate lifecycle points
- [ ] Events include timestamp, description, metadata
- [ ] `use-sse-events.ts` handles new event types

---

#### Issue M15-026: Create frontend hooks for sessions and agents

**Labels:** `ui-redesign`, `frontend`, `sprint-3`

Create:

- `hooks/use-sessions.ts` — `useSessions()`, `useSession(id)`
- `hooks/use-agents.ts` — `useAgents()`, `useAgent(id)`
- `hooks/use-runtime-events.ts` — connects SSE to runtime-store
- Update `lib/api-types.ts` with new types
- Update `lib/query-keys.ts`
- Update `hooks/index.ts` barrel

**Acceptance Criteria:**

- [ ] Hooks implemented with TanStack Query
- [ ] MSW handlers for testing
- [ ] Unit tests

---

### Epic 4: Navigation & New Pages (Sprint 4)

#### Issue M15-027: Restructure navigation in routes.ts

**Labels:** `ui-redesign`, `navigation`, `sprint-4`

Update `lib/routes.ts` with new navigation structure:

- Runtime section: Overview, Sessions, Pipeline
- Operations section: Commands, Agents, Decisions
- Data section: Artifacts, Questionnaires
- Observability section: Metrics, Governance

**Acceptance Criteria:**

- [ ] Routes updated
- [ ] Sidebar renders new structure
- [ ] Route tests updated

---

#### Issue M15-028: Create Sessions page

**Labels:** `ui-redesign`, `new-page`, `sprint-4`

Create `pages/sessions/sessions-page.tsx`:

- Session list with status, project, flow, progress
- Click to navigate to session detail
- Empty state for no sessions

**Acceptance Criteria:**

- [ ] Page implemented
- [ ] Lazy-loaded in App.tsx
- [ ] Tests with MSW

---

#### Issue M15-029: Create Session Detail page (core runtime screen)

**Labels:** `ui-redesign`, `new-page`, `sprint-4`, `priority-high`

Create `pages/sessions/session-detail-page.tsx`:

- FlowTimeline (top)
- AgentActivity panel (left)
- Artifact + Decision list (right)
- RuntimeLog (bottom)
- ExplainabilityPanel (contextual)

**Acceptance Criteria:**

- [ ] Page implemented per phase-03 layout spec
- [ ] Responsive layout
- [ ] Uses all runtime components from Sprint 2

---

#### Issue M15-030: Create Agents page

**Labels:** `ui-redesign`, `new-page`, `sprint-4`

Create `pages/agents/agents-page.tsx`:

- Agent list with full activity status
- Click to open agent detail panel
- Performance overview (invocations, success rate)

**Acceptance Criteria:**

- [ ] Page implemented
- [ ] Agent detail side panel
- [ ] Lazy-loaded

---

#### Issue M15-031: Rename Command Center to Commands page

**Labels:** `ui-redesign`, `refactor`, `sprint-4`

- Rename `pages/command-center/` to `pages/commands/`
- Update route from `/command-center` to `/commands`
- Add redirect for old URL

**Acceptance Criteria:**

- [ ] Page renamed and route updated
- [ ] `/command-center` redirects to `/commands`
- [ ] All references updated

---

#### Issue M15-032: Create Observability page (merge metrics + analytics)

**Labels:** `ui-redesign`, `new-page`, `sprint-4`

Create `pages/observability/observability-page.tsx`:

- Tabbed interface: Drift | KPIs | Velocity | Agent Performance | Traceability
- Uses extracted components from Sprint 1

**Acceptance Criteria:**

- [ ] Page implemented with tab navigation
- [ ] All data from metrics + analytics + traceability pages accessible
- [ ] Old analytics and traceability routes redirect to observability

---

#### Issue M15-033: Update App.tsx router config

**Labels:** `ui-redesign`, `navigation`, `sprint-4`

Update `App.tsx` with:

- New route entries for sessions, agents, commands, observability
- Lazy imports for new pages
- Redirect routes for renamed paths
- Remove old page imports

**Acceptance Criteria:**

- [ ] All new routes functional
- [ ] All redirects working
- [ ] No dead routes

---

### Epic 5: Session Detail & Runtime Timeline (Sprint 5)

#### Issue M15-034: Wire FlowTimeline to live session data

**Labels:** `ui-redesign`, `integration`, `sprint-5`

Connect `FlowTimeline` in session-detail-page to real session progress data
from `useSession()` hook.

**Acceptance Criteria:**

- [ ] Flow state updates in real-time via SSE
- [ ] Phase transitions animate smoothly
- [ ] Click on phase navigates to phase detail

---

#### Issue M15-035: Wire AgentActivity to live agent data

**Labels:** `ui-redesign`, `integration`, `sprint-5`

Connect `AgentActivity` to real agent data with live status updates.

**Acceptance Criteria:**

- [ ] Agents appear/update in real-time
- [ ] Running agents show animation
- [ ] Click agent shows detail panel

---

#### Issue M15-036: Wire RuntimeLog to SSE event buffer

**Labels:** `ui-redesign`, `integration`, `sprint-5`

Connect `RuntimeLog` to `runtime-store.ts` event buffer.
SSE events flow from server → `use-runtime-events.ts` → store → RuntimeLog.

**Acceptance Criteria:**

- [ ] Events appear in real-time
- [ ] Auto-scroll works
- [ ] Filter by event type works
- [ ] Buffer doesn't grow unbounded (ring buffer)

---

#### Issue M15-037: Wire ExplainabilityPanel to gate failures

**Labels:** `ui-redesign`, `integration`, `sprint-5`

When a gate fails, show ExplainabilityPanel with:

- Failure reason from `ValidateGateResponse`
- Suggested action
- Link to relevant decision/artifact

**Acceptance Criteria:**

- [ ] Panel appears on gate failure
- [ ] Reason is actionable
- [ ] Panel is dismissible

---

#### Issue M15-038: Add live animations for agent states

**Labels:** `ui-redesign`, `polish`, `sprint-5`

Add visual feedback:

- Agent thinking animation (pulsing card border)
- Phase transition animation (dot color + connector fill)
- Progress bar smooth transitions
- Artifact creation flash

**Acceptance Criteria:**

- [ ] Animations implemented with CSS transitions
- [ ] `prefers-reduced-motion` respected
- [ ] Performance: no layout thrashing

---

### Epic 6: Overview & Onboarding (Sprint 6)

#### Issue M15-039: Transform Dashboard into Overview page

**Labels:** `ui-redesign`, `new-page`, `sprint-6`

Replace dashboard-page with overview-page:

- Active session hero (SessionStatus)
- Mini FlowTimeline
- Agent activity strip
- Open decisions
- Latest artifacts
- System health compact strip

**Acceptance Criteria:**

- [ ] Overview answers: what's happening, where, what's next
- [ ] 30-second system understanding test passes (manual)
- [ ] Idle state shows clear call to action

---

#### Issue M15-040: Build WelcomeWizard for first-time users

**Labels:** `ui-redesign`, `new-component`, `sprint-6`

Create `components/onboarding/welcome-wizard.tsx`:

- 5-step guided flow
- Dismissible
- localStorage persistence
- Links to Command Center

**Acceptance Criteria:**

- [ ] Wizard shows on first visit
- [ ] Doesn't show again after dismissal
- [ ] Each step is actionable

---

#### Issue M15-041: Final polish and E2E test suite

**Labels:** `ui-redesign`, `testing`, `sprint-6`

- E2E test: complete session lifecycle (create → observe → complete)
- E2E test: navigation flow through all new pages
- E2E test: first-time user experience
- Visual regression tests for key components
- Accessibility audit on all new components

**Acceptance Criteria:**

- [ ] All E2E tests pass
- [ ] No a11y violations (Storybook a11y addon)
- [ ] All pages responsive (mobile, tablet, desktop)

---

### Epic 7: Documentation / Implementation Consistency (Standalone — no sprint dependency)

> **Context:** The external designer flagged positioning drift and
> documentation/implementation inconsistencies that erode trust in a platform
> repo. Validation against the codebase **confirms all claims** (see findings
> below). This epic can run independently at any time.

#### Validated Findings

| #   | Claim                                                                              | Verdict                   | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Docs reference `node src/webapp/server.js` but source is `.ts`                     | **CONFIRMED**             | `server.js` does not exist. Only `src/webapp/server.ts`. 20+ files still reference `.js`: README.md, quick-start.md, operating-handbook.md, CI pipeline, Dockerfile CMD, playbook, orchestrator agent, tooling contract, decisions.md, src/webapp/README.md, etc.                                                                                                                                                                                                        |
| 2   | Docs say "zero-dependency" but repo has runtime deps                               | **CONFIRMED**             | `package.json` `dependencies`: `@modelcontextprotocol/sdk`, `ajv`, `ajv-formats`, `tsx`. Docker builds a full React UI with `npm ci`. README, CONTRIBUTING, technical-manual, src/webapp/README all claim "zero external runtime dependencies".                                                                                                                                                                                                                          |
| 3   | `/health` vs `/api/health` inconsistency                                           | **PARTIALLY CONFIRMED**   | Both endpoints exist in `routes/misc.ts` (different responses). Docker healthcheck uses `/api/health`. Playwright config uses `/api/health`. But some docs reference only `/health`. The inconsistency is that two endpoints exist for the same purpose with different payloads, and docs don't clarify when to use which.                                                                                                                                               |
| 4   | Positioning drift: "end-to-end agentic SDLC platform" vs actual Copilot chat turns | **CONFIRMED with nuance** | README already says "supervised sprint-by-sprint implementation (human-in-the-loop, CONTINUE-to-proceed)" (fixed per CHANGELOG F-04). However src/webapp/README still says "zero-dependency local web app" (outdated). The orchestrator requires explicit CONTINUE commands between phases. The system is a workflow control layer running inside IDE chat, not an autonomous platform. README positioning is mostly accurate now but several secondary docs lag behind. |
| 5   | src/webapp/README.md architecture section is stale                                 | **CONFIRMED**             | Lists `server.js` + `index.html` (SPA inline CSS+JS, no build step) — actual architecture is `server.ts` + full React build in `ui/` with 60+ source files, Vite, Tailwind, Storybook.                                                                                                                                                                                                                                                                                   |
| 6   | Dockerfile CMD uses `node src/webapp/server.js`                                    | **CONFIRMED**             | Line 51: `CMD ["node", "src/webapp/server.js"]`. Should be `CMD ["node", "--import", "tsx", "src/webapp/server.ts"]` or a compiled JS entrypoint.                                                                                                                                                                                                                                                                                                                        |

---

#### Issue M15-042: Fix server.js → server.ts references across all docs

**Labels:** `doc-consistency`, `priority-high`

Replace all `node src/webapp/server.js` references with the correct command
`tsx src/webapp/server.ts` (matching `package.json` `start` script).

**Files to update (20+ locations):**

- `README.md` (line 79)
- `docs/quick-start.md` (line 36)
- `docs/operating-handbook.md` (lines 24, 68, 105)
- `docs/index.md` (line 43)
- `docs/user-manual.md` (line 48)
- `docs/technical-manual.md` (line 927)
- `docs/help/decisions-architecture.md` (line 267)
- `docs/help/troubleshooting.md` (line 171)
- `src/webapp/README.md` (lines 18, 26)
- `src/webapp/start.ps1` (line 14)
- `templates/sdlc/playbooks/software-creation-playbook.md` (lines 146, 210, 271, 325)
- `templates/sdlc/agents/00-orchestrator.md` (line 842)
- `templates/sdlc/contracts/tooling-contract.md` (line 59)
- `BusinessDocs/decisions.md` (line 9)
- `playwright.config.ts` (line 21)
- `.github/workflows/ci-pipeline.yml` (line 280)

**Acceptance Criteria:**

- [ ] No remaining `server.js` references in any doc or config
- [ ] `npm start` command works as alternative where appropriate
- [ ] Playwright config uses correct start command
- [ ] CI pipeline uses correct start command
- [ ] All grep results for `server.js` return 0 matches (excluding node_modules, dist)

---

#### Issue M15-043: Fix Dockerfile CMD entrypoint

**Labels:** `doc-consistency`, `backend`, `priority-high`

`infra/Dockerfile` line 51 uses `CMD ["node", "src/webapp/server.js"]`.
Either:

- (a) Add a TypeScript compile step and point CMD at the compiled `.js`, or
- (b) Use `CMD ["npx", "tsx", "src/webapp/server.ts"]` (requires tsx in prod deps, which it already is)

**Acceptance Criteria:**

- [ ] Container starts successfully with `docker compose -f infra/docker-compose.webapp.yml up --build`
- [ ] `/api/health` returns 200
- [ ] No `.js` entrypoint assumption in any Dockerfile

---

#### Issue M15-044: Correct "zero-dependency" claims in all documentation

**Labels:** `doc-consistency`, `priority-high`

The repo has 4 runtime dependencies: `@modelcontextprotocol/sdk`, `ajv`,
`ajv-formats`, `tsx`. Documentation must be updated to reflect this accurately.

**Files to update:**

- `README.md` — "Zero external runtime dependencies" bullet + technology table
- `CONTRIBUTING.md` — "Zero runtime dependencies" (line 75) + "No external
  runtime dependencies" (line 110)
- `src/webapp/README.md` — "zero-dependency local web app" (line 3) + "No npm
  install required" (line 11) + architecture section (line 48)
- `docs/technical-manual.md` — "Zero runtime dependencies" (line 80)

**Recommended wording:** "Minimal runtime dependencies (MCP SDK, schema
validation, TypeScript runner). The HTTP server uses only Node.js built-in
modules — no Express or framework dependency."

**Acceptance Criteria:**

- [ ] No "zero dependency" claims remain that contradict package.json
- [ ] Accurate dependency description in README and technical manual
- [ ] CONTRIBUTING guidelines updated for new contributors

---

#### Issue M15-045: Rewrite src/webapp/README.md to reflect current architecture

**Labels:** `doc-consistency`

The `src/webapp/README.md` describes a legacy architecture:

- References `server.js` + `index.html` (SPA inline CSS+JS, no build step)
- Actual state: `server.ts` + full React app in `ui/` with Vite, Tailwind,
  TanStack Query, Zustand, Storybook, 60+ source files

**Acceptance Criteria:**

- [ ] Architecture section shows: `server.ts` (Express-like HTTP), `routes/`
      (14 route modules), `ui/` (React SPA with build step)
- [ ] Prerequisites mention tsx and npm
- [ ] Quick Start shows `npm start` (not `node server.js`)
- [ ] Docker section references correct compose files

---

#### Issue M15-046: Consolidate /health and /api/health endpoints

**Labels:** `doc-consistency`, `backend`

Currently two health endpoints exist:

- `GET /health` — simple `{ status, version, uptime, store_status }`
- `GET /api/health` — detailed with SSE connection count, metrics

**Options:**

- (a) Keep both but document clearly which is for what (liveness vs readiness)
- (b) Deprecate `/health`, standardize on `/api/health`

**Acceptance Criteria:**

- [ ] Decision documented in `BusinessDocs/decisions/`
- [ ] Docker healthcheck, playwright config, and docs all reference the same
      canonical endpoint
- [ ] If both kept: docs explain liveness (`/health`) vs readiness
      (`/api/health`) pattern

---

#### Issue M15-047: Audit and fix positioning language in secondary docs

**Labels:** `doc-consistency`

The README was already corrected (F-04 in CHANGELOG) to say "supervised
sprint-by-sprint implementation (human-in-the-loop, CONTINUE-to-proceed)".
However, secondary documents may still contain outdated positioning language.

**Audit scope:**

- `docs/` — all files
- `templates/sdlc/` — playbooks, agents, contracts
- `BusinessDocs/` — onboarding, synthesis reports
- `src/webapp/` — README, email templates

**Check for:**

- Claims of "autonomous" operation without "supervised" qualifier
- Claims of "zero dependency" (covered by M15-044 but verify no stragglers)
- References to `server.js` (covered by M15-042 but verify completeness)
- Outdated architecture descriptions (e.g., "index.html SPA")

**Acceptance Criteria:**

- [ ] Positioning audit report produced
- [ ] All outdated claims corrected
- [ ] truth-source-policy.md guardrail updated if needed

---

#### Issue M15-048: Add truth-source-policy CI check

**Labels:** `doc-consistency`, `testing`

Create an automated check (shell script or test) that catches future
documentation drift:

- Grep for `server.js` in docs (should be 0)
- Grep for "zero.\*depend" in docs (should match only accurate contexts)
- Verify Dockerfile CMD matches package.json start script
- Verify healthcheck endpoint matches between Docker and Playwright configs

**Acceptance Criteria:**

- [ ] Script in `scripts/` or test in `tests/`
- [ ] Runs in CI pipeline
- [ ] Fails if drift detected
- [ ] README references it in the testing section

---

## 4. Issue Summary

| Epic      | Sprint | Issues      | Count  | Type                  |
| --------- | ------ | ----------- | ------ | --------------------- |
| 1         | 1      | M15-001–010 | 10     | Component extraction  |
| 2         | 2      | M15-011–020 | 10     | New components        |
| 3         | 3      | M15-021–026 | 6      | Backend + hooks       |
| 4         | 4      | M15-027–033 | 7      | Nav + new pages       |
| 5         | 5      | M15-034–038 | 5      | Integration + wire    |
| 6         | 6      | M15-039–041 | 3      | Overview + onboarding |
| 7         | any    | M15-042–048 | 7      | Doc/impl consistency  |
| **Total** |        |             | **48** |                       |

---

## 5. Dependencies

```
Sprint 1 ────────→ Sprint 2 ────────→ Sprint 5
(extract)          (build)            (wire)
                       ↓
Sprint 3 ────────→ Sprint 4 ────────→ Sprint 5
(backend API)      (nav + pages)      (session detail)
                                          ↓
                                     Sprint 6
                                     (overview + onboarding)

Epic 7 (doc consistency) ← runs independently, no sprint dependency
```

- Sprint 1 and Sprint 3 can run **in parallel** (no dependencies)
- Sprint 2 depends on Sprint 1 (uses extracted components as base)
- Sprint 4 depends on Sprint 2 (uses new components) and Sprint 3 (uses new API)
- Sprint 5 depends on Sprint 4 (wires into new pages)
- Sprint 6 depends on Sprint 5 (overview uses session data)
- **Epic 7 has no dependencies** — can start immediately and run in parallel
  with any sprint. Recommended to tackle M15-042 and M15-043 first (high
  priority, quick wins).

---

## 6. Labels for GitHub

Create these labels:

| Label                         | Color     | Description                          |
| ----------------------------- | --------- | ------------------------------------ |
| `ui-redesign`                 | `#7057ff` | M15: UI Redesign epic                |
| `refactor`                    | `#d4c5f9` | Code refactoring / extraction        |
| `new-component`               | `#0e8a16` | New UI component                     |
| `new-page`                    | `#006b75` | New page / route                     |
| `backend`                     | `#e99695` | Backend API changes                  |
| `integration`                 | `#fbca04` | Wiring components to data            |
| `navigation`                  | `#bfd4f2` | Routing / navigation changes         |
| `testing`                     | `#c2e0c6` | Test coverage                        |
| `polish`                      | `#d876e3` | Visual polish / animations           |
| `doc-consistency`             | `#fef2c0` | Documentation / implementation drift |
| `sprint-1` through `sprint-6` | `#f9d0c4` | Sprint assignment                    |
| `priority-high`               | `#b60205` | High priority issue                  |
