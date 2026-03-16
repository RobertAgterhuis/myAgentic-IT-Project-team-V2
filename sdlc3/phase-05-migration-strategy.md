# Phase 05 — Migration Strategy

> M11: UI Redesign — How to get from current state to target architecture

---

## 1. Migration Principles

1. **No big bang rewrite** — Incremental refactoring, always shippable
2. **Extract before create** — Pull existing inline components out before building new ones
3. **Tests travel with components** — When extracting, move/create tests simultaneously
4. **Stories before pages** — Every component gets a Storybook story before wiring into a page
5. **Backend API first** — New pages requiring API endpoints get backend work first
6. **Feature flagging** — New navigation structure introduced alongside old, switched atomically

---

## 2. Sprint Execution Order

### Sprint 1: Foundation — Component Extraction & SoC Fix

**Goal:** Fix separation of concerns without changing user-visible behavior.

1. Create domain component folders: `runtime/`, `artifacts/`, `decisions/`, `observability/`
2. Extract 14 inline components from page files to domain folders:
   - From `dashboard-page.tsx`: LiveStatusHero, HealthCard, QuickLinks, RecentCommands
   - From `decisions-page.tsx`: LifecycleFlow, CreateDecisionDialog
   - From `pipeline-page.tsx`: PhaseCard, AgentList, GateIndicator
   - From `analytics-trends-page.tsx`: MiniBar, VelocityChart, AgentChart
   - From `lineage-page.tsx`: DagNode, DagEdge
3. Add Storybook stories for all extracted components
4. Verify all existing tests still pass
5. Page line counts should drop below 150 lines each

**Risk:** Low — pure refactoring, no behavior changes.
**Verification:** All existing tests pass, Storybook builds, UI unchanged.

### Sprint 2: Runtime Components — Design System Extension

**Goal:** Build new runtime-domain components in Storybook before wiring them.

1. Build `FlowStep` component + story
2. Build `FlowTimeline` component + story
3. Build `AgentCard` component + story
4. Build `AgentActivity` component + story
5. Build `RuntimeEvent` component + story
6. Build `RuntimeLog` component + story
7. Build `GateStatus` component + story
8. Build `ExplainabilityPanel` component + story
9. Build `SessionStatus` component + story
10. Build `StatusDot` and `TimelineConnector` primitives + stories
11. Create `runtime-store.ts` for event buffer

**Risk:** Low — components built in isolation, not wired to pages yet.
**Verification:** Storybook review, component unit tests.

### Sprint 3: Backend API Extensions

**Goal:** Add API endpoints needed for Sessions and Agent detail pages.

1. Add session tracking to the orchestrator (session ID, lifecycle)
2. Create `GET /api/sessions` endpoint
3. Create `GET /api/sessions/:id` endpoint
4. Create `GET /api/sessions/:id/timeline` endpoint
5. Extend `AgentEntry` with `task_description`, `started_at`, `duration_ms`
6. Create `GET /api/agents` endpoint
7. Create `GET /api/agents/:id` endpoint
8. Add SSE events for timeline: `session_start`, `phase_start`, `agent_start`, etc.
9. Create hooks: `use-sessions.ts`, `use-agents.ts`, `use-runtime-events.ts`
10. Update `api-types.ts` with new types
11. Extend MSW handlers for testing

**Risk:** Medium — backend changes, but additive (no breaking changes).
**Verification:** API integration tests, MSW mock coverage.

### Sprint 4: Navigation Restructure + New Pages

**Goal:** Restructure navigation and create new pages.

1. Update `routes.ts` with new navigation structure
2. Create `overview-page.tsx` (replaces dashboard, uses SessionStatus + FlowTimeline)
3. Create `sessions-page.tsx` (session list)
4. Create `session-detail-page.tsx` (the core runtime screen)
5. Create `agents-page.tsx` (agent activity)
6. Create `commands-page.tsx` (renamed from command-center)
7. Merge `analytics-trends-page` + `traceability-explorer-page` into `observability-page.tsx`
8. Update `App.tsx` router with new routes
9. Add redirect: `/command-center` → `/commands`
10. Update sidebar sections from data-oriented to workflow-oriented
11. Update breadcrumbs

**Risk:** Medium — user-visible changes, navigation restructure.
**Verification:** E2E tests, manual walkthrough, URL redirects verified.

### Sprint 5: Session Detail & Runtime Timeline

**Goal:** Build the core session detail experience.

1. Wire `FlowTimeline` into session-detail-page
2. Wire `AgentActivity` with live data
3. Wire `RuntimeLog` with SSE event buffer
4. Wire `ExplainabilityPanel` to gate failures
5. Wire artifact and decision lists in session context
6. Connect SSE events to `runtime-store.ts` event buffer
7. Add live animations (agent thinking state, progress transitions)

**Risk:** Medium — integration of many new components.
**Verification:** E2E test of full session lifecycle, SSE integration test.

### Sprint 6: Overview Page & First-Time UX

**Goal:** Complete the overview transformation and onboarding.

1. Refactor overview-page from dashboard to runtime-first
2. Build `WelcomeWizard` component
3. Add first-time detection (localStorage)
4. Add quick actions that navigate to session creation
5. Polish animations and transitions

**Risk:** Low — mostly UI polish.
**Verification:** Manual UX review, first-run scenario test.

---

## 3. File Change Map

### Sprint 1: Files Modified

| File                                              | Action | Change Description            |
| ------------------------------------------------- | ------ | ----------------------------- |
| `components/runtime/phase-card.tsx`               | CREATE | Extracted from pipeline-page  |
| `components/runtime/agent-list.tsx`               | CREATE | Extracted from pipeline-page  |
| `components/runtime/gate-indicator.tsx`           | CREATE | Extracted from pipeline-page  |
| `components/decisions/lifecycle-flow.tsx`         | CREATE | Extracted from decisions-page |
| `components/decisions/create-decision-dialog.tsx` | CREATE | Extracted                     |
| `components/artifacts/dag-node.tsx`               | CREATE | Extracted from lineage-page   |
| `components/artifacts/dag-edge.tsx`               | CREATE | Extracted from lineage-page   |
| `components/observability/velocity-chart.tsx`     | CREATE | Extracted from analytics      |
| `components/observability/agent-chart.tsx`        | CREATE | Extracted from analytics      |
| `components/ui/mini-bar.tsx`                      | CREATE | Extracted from analytics      |
| `components/dashboard/health-card.tsx`            | CREATE | Extracted from dashboard-page |
| `components/dashboard/quick-links.tsx`            | CREATE | Extracted from dashboard-page |
| `components/dashboard/recent-commands.tsx`        | CREATE | Extracted from dashboard      |
| `components/runtime/live-status-hero.tsx`         | CREATE | Extracted from dashboard      |
| `pages/dashboard/dashboard-page.tsx`              | MODIFY | Import extracted components   |
| `pages/decisions/decisions-page.tsx`              | MODIFY | Import extracted components   |
| `pages/pipeline/pipeline-page.tsx`                | MODIFY | Import extracted components   |
| `pages/analytics/analytics-trends-page.tsx`       | MODIFY | Import extracted components   |
| `pages/artifacts/lineage-page.tsx`                | MODIFY | Import extracted components   |

### Sprint 2: Files Created

| File                                          | Description                             |
| --------------------------------------------- | --------------------------------------- |
| `components/runtime/flow-step.tsx`            | New component                           |
| `components/runtime/flow-timeline.tsx`        | New component                           |
| `components/runtime/agent-card.tsx`           | New component                           |
| `components/runtime/agent-activity.tsx`       | New component                           |
| `components/runtime/runtime-event.tsx`        | New component                           |
| `components/runtime/runtime-log.tsx`          | New component                           |
| `components/runtime/gate-status.tsx`          | New component (replaces gate-indicator) |
| `components/runtime/explainability-panel.tsx` | New component                           |
| `components/runtime/session-status.tsx`       | New component                           |
| `components/ui/status-dot.tsx`                | New primitive                           |
| `components/ui/timeline-connector.tsx`        | New primitive                           |
| `stores/runtime-store.ts`                     | New store                               |

### Sprint 3: Files Created/Modified

| File                           | Action | Description                      |
| ------------------------------ | ------ | -------------------------------- |
| `routes/sessions.ts` (backend) | CREATE | Session API endpoints            |
| `routes/agents-detail.ts` (bk) | CREATE | Agent detail API endpoint        |
| `hooks/use-sessions.ts`        | CREATE | Session data hooks               |
| `hooks/use-agents.ts`          | CREATE | Agent detail hooks               |
| `hooks/use-runtime-events.ts`  | CREATE | Runtime event stream hook        |
| `lib/api-types.ts`             | MODIFY | Add Session, TimelineEvent types |
| `lib/query-keys.ts`            | MODIFY | Add session, agent-detail keys   |
| `hooks/index.ts`               | MODIFY | Export new hooks                 |
| `test/msw-handlers.ts`         | MODIFY | Add session/agent mock handlers  |

### Sprint 4: Files Created/Modified

| File                                         | Action | Description              |
| -------------------------------------------- | ------ | ------------------------ |
| `pages/overview/overview-page.tsx`           | CREATE | New overview page        |
| `pages/sessions/sessions-page.tsx`           | CREATE | New sessions list page   |
| `pages/sessions/session-detail-page.tsx`     | CREATE | Core runtime screen      |
| `pages/agents/agents-page.tsx`               | CREATE | New agents page          |
| `pages/commands/commands-page.tsx`           | CREATE | Renamed command-center   |
| `pages/observability/observability-page.tsx` | CREATE | Merged metrics+analytics |
| `lib/routes.ts`                              | MODIFY | New nav structure        |
| `App.tsx`                                    | MODIFY | New route config         |
| `components/layout/app-layout.tsx`           | MODIFY | Updated sidebar sections |

---

## 4. Rollback Strategy

Each sprint is independently shippable. If issues arise:

- **Sprint 1:** Revert component extractions (git revert). No user-visible change.
- **Sprint 2:** Components exist in Storybook only, not wired. No rollback needed.
- **Sprint 3:** API endpoints are additive. Disable by removing routes.
- **Sprint 4:** Feature flag new navigation. Revert to old routes config.
- **Sprint 5:** Session detail is a new page. Remove route to disable.
- **Sprint 6:** Overview change is the highest risk. Keep old dashboard as fallback.

---

## 5. Testing Strategy

| Layer            | Tool                     | Coverage Target       |
| ---------------- | ------------------------ | --------------------- |
| Component unit   | Vitest + Testing Library | All extracted + new   |
| Storybook visual | Storybook + a11y addon   | All domain components |
| Hook unit        | Vitest + MSW             | All new hooks         |
| API integration  | Vitest                   | All new endpoints     |
| E2E              | Playwright               | Session lifecycle     |
| Accessibility    | Storybook a11y addon     | All new components    |

---

## 6. Definition of Done (Per Sprint)

- [ ] All code changes committed to `feature/m11-ui-redesign` branch
- [ ] All existing tests pass (zero regressions)
- [ ] New components have unit tests
- [ ] New components have Storybook stories
- [ ] Page line counts ≤ 150 lines (after extraction)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Storybook builds successfully
- [ ] PR created with description linking to this design doc
