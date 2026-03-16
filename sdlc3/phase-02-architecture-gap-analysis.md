# Phase 02 — Architecture Gap Analysis

> M11: UI Redesign — What's missing vs. the audit recommendations

---

## 1. Gap Classification

Each gap is classified:

- **CONFIRMED** — Audit finding validated against code
- **PARTIALLY_MET** — Some implementation exists but incomplete
- **NOT_APPLICABLE** — Recommendation doesn't apply to current platform state

---

## 2. UX Mental Model Gap

### Audit Recommendation

Transform from Dashboard to Runtime Visualization / Operator Console.
Users should always know: What is happening, Why, Where in the flow, What next.

### Current State

- Landing page is a traditional dashboard with health cards, metric summaries,
  quick links, and activity feed
- Pipeline page shows phases as expandable cards but not as a continuous flow
- No concept of "active session" as the primary UI focus
- No runtime event stream visible to users
- SSE events trigger data refresh but are not surfaced as a timeline

### Gap Severity: **HIGH**

### Evidence

- `dashboard-page.tsx` renders `HealthCard`, `MetricCard`, `QuickLinks` — classic dashboard pattern
- `pipeline-page.tsx` renders `PhaseCard` list — static representation, not live flow
- No component renders a chronological event stream
- No "what's happening right now" panel exists

---

## 3. Navigation Structure Gap

### Audit Recommendation

```
Overview | Sessions | Flows | Agents | Artifacts | Decisions | Repositories | Governance | Observability | Settings
```

### Current Navigation

```
Dashboard | Command Center | Pipeline | Questionnaires | Decisions | Metrics | Artifacts | Governance | Traceability
```

### Gap Analysis

| Audit Nav Item | Current Equivalent       | Status                          |
| -------------- | ------------------------ | ------------------------------- |
| Overview       | Dashboard (/)            | PARTIALLY_MET                   |
| Sessions       | —                        | **MISSING**                     |
| Flows          | Pipeline (/pipeline)     | PARTIALLY_MET                   |
| Agents         | —                        | **MISSING**                     |
| Artifacts      | Artifacts (/artifacts)   | PARTIALLY_MET                   |
| Decisions      | Decisions (/decisions)   | EXISTS                          |
| Repositories   | —                        | NOT_APPLICABLE (future feature) |
| Governance     | Governance (/governance) | EXISTS                          |
| Observability  | Metrics + Analytics      | PARTIALLY_MET                   |
| Settings       | —                        | **MISSING**                     |

### Additional Current Pages Not in Audit

| Current Page     | Audit Equivalent          | Action                   |
| ---------------- | ------------------------- | ------------------------ |
| Command Center   | Part of Session View      | Merge into Sessions      |
| Questionnaires   | Not mentioned             | Keep (platform-specific) |
| Traceability     | Part of Governance/Observ | Merge into Governance    |
| Analytics Trends | Part of Observability     | Merge into Observability |

### Gap Severity: **HIGH**

---

## 4. Session Management Gap

### Audit Recommendation

Session View is the "most important screen" — showing project, session ID, flow,
phase, flow timeline, agent panel, current output, artifacts, decisions, and
runtime timeline in a unified view.

### Current State

- No session model in the frontend at all
- `OrchestratorStatus` has `state` and `mode` but no session ID
- `useProgress` returns phases and a session object with `current_agent`
- No session list, no session detail view, no session picker

### Required API Changes

- New endpoint: `GET /api/sessions` — list of sessions
- New endpoint: `GET /api/sessions/:id` — session detail with flow state
- New endpoint: `GET /api/sessions/:id/timeline` — chronological events
- Extend `GET /api/progress` to include session context

### Gap Severity: **HIGH**

---

## 5. Agent Visibility Gap

### Audit Recommendation

Agents must "feel alive" — showing name, current task, status. Clicking an agent
shows prompt, context, and outputs.

### Current State

- `AgentList` in `pipeline-page.tsx` renders agents as badge + name list items
- `useProgress` returns `AgentEntry` with `{ id, name, status }` only
- No agent detail view, no agent activity panel
- Dashboard shows `current_agent` name in the hero section but no detail

### Required Components

- `AgentCard` — live status card with name, task description, thinking animation
- `AgentDetailPanel` — prompt, context, outputs, execution history
- `AgentActivity` — real-time panel showing all active agents

### Required API Changes

- Extend `AgentEntry` to include: `task_description`, `started_at`, `duration_ms`
- New endpoint: `GET /api/agents/:id` — agent detail with prompt/context/outputs

### Gap Severity: **HIGH**

---

## 6. Flow Visualization Gap

### Audit Recommendation

Flow state should always be visible as a horizontal timeline with states:
✔ completed, ● running, ○ pending, ✖ failed, ⏸ paused.

### Current State

- `pipeline-page.tsx` renders phases as vertical card list (expandable)
- Dashboard hero shows progress bar and active phase name
- No horizontal flow timeline component
- No visual flow representation in session context

### Required Components

- `FlowTimeline` — horizontal step indicator with state icons
- `FlowStep` — individual step component with status, label, click handler

### Gap Severity: **MEDIUM** (pipeline page exists as a partial solution)

---

## 7. Runtime Timeline Gap

### Audit Recommendation

Chronological event stream showing all system events (session started, agent
completed, artifact generated, gate passed, etc.)

### Current State

- `ActivityFeed` component exists in `metric-card.tsx` (generic)
- Dashboard has a `useDashboardActivity` hook that returns activity entries
- SSE events are received but only used for cache invalidation
- No dedicated timeline view, no event persistence in UI

### Required Components

- `RuntimeLog` — scrollable event stream with filtering
- `RuntimeEvent` — individual event row with type icon, timestamp, description

### Required Changes

- Store SSE events in Zustand or a ring buffer for timeline display
- Add filtering by event type, phase, agent

### Gap Severity: **HIGH**

---

## 8. Explainability Gap

### Audit Recommendation

Users need to know WHY something happened — especially gate failures, retries,
and agent decisions.

### Current State

- `GateIndicator` in pipeline shows passed/pending/blocked icons
- No explanation for why a gate failed
- No retry information visible
- No "suggested action" component

### Required Components

- `ExplainabilityPanel` — contextual panel showing reason + suggested action
- Integrate with gate validation responses (`ValidateGateResponse`)

### Gap Severity: **MEDIUM**

---

## 9. Artifact Dependency Graph Gap

### Audit Recommendation

Artifacts should show relationships as a visual graph
(Architecture → API Design, Infra Design, Security Model).

### Current State

- `lineage-page.tsx` renders a list-based DAG with `DagNode` and `DagEdge`
- No actual graph layout (no SVG, no canvas, no force-directed graph)
- Lineage is navigable but not visual

### Required Changes

- Replace list-based DAG with a proper graph visualization
- Consider: `@xyflow/react` (React Flow) or `dagre` + SVG

### Gap Severity: **LOW** (lineage page is functional, graph is enhancement)

---

## 10. Separation of Concerns Gap

### Audit Recommendation

Monolithic code with no separation of concerns must be fixed.

### Current State — Validated Evidence

#### Pattern: Inline Sub-Components

Every page > 200 lines contains private components defined in the same file.
These cannot be tested independently, reused, or documented in Storybook.

**Example: `decisions-page.tsx` (547 lines)**

```
File contains:
- LifecycleFlow component (~20 lines)
- CreateDecisionDialog component (~60 lines)
- 2 column definition objects (~80 lines)
- Badge/status mapping constants (~15 lines)
- TypeScript type aliases (~10 lines)
- Main page component (~360 lines)
```

All in a single file. The dialog alone should be a separate module.

#### Pattern: Constants Co-located with Components

Status badge mappings, icon mappings, and column definitions are defined inside
page files instead of being shared or co-located with their feature.

#### Pattern: No Feature Folder Structure

```
Current:
  pages/decisions/
    decisions-page.tsx          ← 547 lines, everything

Target:
  pages/decisions/
    decisions-page.tsx          ← ~100 lines, composition only
    components/
      lifecycle-flow.tsx
      create-decision-dialog.tsx
      decision-columns.tsx
    constants.ts
```

### Gap Severity: **HIGH**

---

## 11. First-Time User Experience Gap

### Audit Recommendation

New users need guided onboarding with clear steps:
Define project → Run CREATE → Answer questions → Review → Approve.

### Current State

- `EmptyState` components exist (good)
- Dashboard IDLE state shows: "No active pipeline. Use the Command Center…"
- No onboarding wizard, no step-by-step guide, no welcome screen
- Help panel exists but is generic

### Gap Severity: **MEDIUM**

---

## 12. Real-Time Update Gap

### Audit Recommendation

Use SSE/WebSockets for live progress (agent execution, artifact creation, gate
results, logs).

### Current State

- SSE is implemented and working (`use-sse-events.ts`)
- Events trigger TanStack Query cache invalidation
- Connection status shown in top navigation
- Toast notifications for orchestrator state changes and command completion

### Gap Assessment

SSE infrastructure is **COMPLETE**. The gap is in _visualization_, not
_transport_. Events are received but not displayed as a timeline.

### Gap Severity: **LOW** (infrastructure exists, visualization needed)

---

## 13. Observability Consolidation Gap

### Audit Recommendation

Single Observability page with: agent performance, retry rate, execution time,
gate failures, artifacts generated, charts.

### Current State

- Metrics page: drift detection + KPI charts + time range selector
- Analytics trends page: velocity charts + agent performance bars
- Traceability page: requirement → design → code → test chain explorer
- These are 3 separate pages that partially overlap

### Required Changes

- Consolidate into a single Observability page with tabs/sections
- Or: keep as sub-routes under `/observability/*`

### Gap Severity: **MEDIUM**

---

## 14. Design System Gap

### Audit Recommendation

Define Storybook components: FlowStep, AgentCard, ArtifactCard, DecisionCard,
GateStatus, RuntimeEvent, MetricTile.

### Current State

- 19 UI primitives with Storybook stories
- No runtime-domain components in Storybook
- No `AgentCard`, `FlowStep`, `GateStatus`, `RuntimeEvent` components

### Gap Severity: **MEDIUM**

---

## 15. Gap Priority Matrix

| Gap                         | Severity | Effort | Dependencies         |
| --------------------------- | -------- | ------ | -------------------- |
| Monolithic page refactor    | HIGH     | Medium | None                 |
| Session management          | HIGH     | Large  | Backend API          |
| Agent visibility            | HIGH     | Medium | Backend API          |
| Runtime timeline            | HIGH     | Medium | SSE (exists)         |
| Navigation restructure      | HIGH     | Medium | Session + Agent      |
| UX mental model shift       | HIGH     | Large  | All above            |
| Flow visualization          | MEDIUM   | Small  | None                 |
| Explainability panel        | MEDIUM   | Small  | Gate API             |
| First-time UX               | MEDIUM   | Small  | None                 |
| Observability consolidation | MEDIUM   | Medium | None                 |
| Design system components    | MEDIUM   | Medium | Component extraction |
| Artifact dependency graph   | LOW      | Medium | Graph library        |
| Real-time visualization     | LOW      | Small  | Runtime timeline     |
