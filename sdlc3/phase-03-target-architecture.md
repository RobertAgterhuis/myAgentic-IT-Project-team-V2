# Phase 03 — Target Architecture

> M11: UI Redesign — Target component architecture and UX model

---

## 1. Design Principles

1. **Runtime-first** — The UI answers "what is happening now" before "what happened"
2. **Session-centric** — Every view is anchored to a session context
3. **Progressive disclosure** — Overview → Detail → Deep dive
4. **Component extraction** — Page files compose extracted feature components
5. **Domain-driven folders** — Components organized by platform domain, not by UI type
6. **Storybook-driven** — Every domain component has a story before it's used in a page

---

## 2. Target Navigation Structure

```
Command Center
──────────────

Runtime
├── Overview        (/)                — System status, active session, quick actions
├── Sessions        (/sessions)        — Session list, session detail
├── Pipeline        (/pipeline)        — Flow timeline with phase cards

Operations
├── Command Center  (/commands)        — Project brief, command queue
├── Agents          (/agents)          — Agent activity, agent detail
├── Decisions       (/decisions)       — Decision lifecycle management

Data
├── Artifacts       (/artifacts)       — Artifact browser with lineage
├── Questionnaires  (/questionnaires)  — Intake questions management

Observability
├── Metrics         (/observability)   — KPIs, drift, analytics, trends
├── Governance      (/governance)      — Approvals, compliance, audit log

System
├── Settings        (/settings)        — Configuration (future)
```

### Changes from Current

| Action | Route                           | Reason                    |
| ------ | ------------------------------- | ------------------------- |
| ADD    | `/sessions`                     | Core runtime screen       |
| ADD    | `/agents`                       | Agent visibility          |
| ADD    | `/settings`                     | Configuration placeholder |
| RENAME | `/command-center` → `/commands` | Shorter, consistent       |
| MERGE  | `/analytics` → `/observability` | Consolidate monitoring    |
| MERGE  | `/traceability` → `/governance` | Both governance-related   |
| KEEP   | All other routes                | Already well-structured   |

---

## 3. Target Directory Structure

```
src/
├── App.tsx                             ← Router config only
├── main.tsx                            ← Entry point
├── index.css                           ← Global styles
├── tokens.css                          ← Design tokens
├── vite-env.d.ts
│
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx              ← Shell: TopNav + Sidebar + Outlet
│   │   └── app-layout.test.tsx
│   │
│   ├── ui/                             ← Shared primitives (KEEP AS-IS)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── data-table.tsx
│   │   ├── ... (all existing)
│   │   └── mini-bar.tsx                ← NEW: extracted from analytics
│   │
│   ├── runtime/                        ← NEW: Runtime visualization domain
│   │   ├── flow-timeline.tsx           ← Horizontal step indicator
│   │   ├── flow-step.tsx               ← Individual step in the flow
│   │   ├── session-status.tsx          ← Active session summary card
│   │   ├── agent-card.tsx              ← Live agent status card
│   │   ├── agent-activity.tsx          ← Panel of active agents
│   │   ├── runtime-log.tsx             ← Chronological event stream
│   │   ├── runtime-event.tsx           ← Single event row
│   │   ├── gate-status.tsx             ← Gate pass/fail indicator
│   │   ├── explainability-panel.tsx    ← Why + suggested action
│   │   └── phase-card.tsx              ← Extracted from pipeline page
│   │
│   ├── artifacts/                      ← NEW: Artifact domain
│   │   ├── artifact-card.tsx           ← Compact artifact display
│   │   ├── artifact-graph.tsx          ← Dependency graph (future)
│   │   ├── dag-node.tsx                ← Extracted from lineage page
│   │   └── dag-edge.tsx                ← Extracted from lineage page
│   │
│   ├── decisions/                      ← NEW: Decision domain
│   │   ├── decision-card.tsx           ← Single decision display
│   │   ├── lifecycle-flow.tsx          ← Extracted from decisions page
│   │   └── create-decision-dialog.tsx  ← Extracted from decisions page
│   │
│   ├── governance/                     ← NEW: Governance domain
│   │   ├── policy-status.tsx           ← Policy compliance indicator
│   │   └── audit-log.tsx              ← Governance audit log viewer
│   │
│   ├── observability/                  ← NEW: Observability domain
│   │   ├── velocity-chart.tsx          ← Extracted from analytics page
│   │   ├── agent-chart.tsx             ← Extracted from analytics page
│   │   ├── metrics-panel.tsx           ← Extracted from metrics page
│   │   └── runtime-charts.tsx          ← Combined chart container
│   │
│   ├── onboarding/                     ← NEW: First-time UX
│   │   └── welcome-wizard.tsx          ← Guided first-run experience
│   │
│   └── help-panel/
│       └── help-panel.tsx              ← KEEP AS-IS
│
├── pages/                              ← Page components (composition only)
│   ├── overview/
│   │   └── overview-page.tsx           ← Replaces dashboard-page
│   ├── sessions/
│   │   ├── sessions-page.tsx           ← Session list
│   │   └── session-detail-page.tsx     ← Core runtime screen
│   ├── pipeline/
│   │   └── pipeline-page.tsx           ← Refactored, uses FlowTimeline
│   ├── commands/
│   │   └── commands-page.tsx           ← Refactored command-center
│   ├── agents/
│   │   └── agents-page.tsx             ← Agent activity + detail
│   ├── decisions/
│   │   └── decisions-page.tsx          ← Refactored, uses extracted components
│   ├── artifacts/
│   │   ├── artifact-browser-page.tsx   ← Refactored
│   │   └── lineage-page.tsx            ← Refactored, uses extracted components
│   ├── questionnaires/
│   │   └── questionnaires-page.tsx     ← Refactored
│   ├── observability/
│   │   └── observability-page.tsx      ← Merged metrics + analytics + traceability
│   ├── governance/
│   │   └── governance-page.tsx         ← Refactored, includes traceability
│   ├── settings/
│   │   └── settings-page.tsx           ← Placeholder
│   └── not-found-page.tsx
│
├── hooks/                              ← KEEP structure, add new hooks
│   ├── index.ts
│   ├── use-sessions.ts                 ← NEW
│   ├── use-agents.ts                   ← NEW
│   ├── use-runtime-events.ts           ← NEW: store SSE events for timeline
│   ├── ... (all existing hooks)
│
├── stores/
│   ├── ui-store.ts                     ← KEEP: sidebar, help, connection
│   └── runtime-store.ts               ← NEW: event buffer, active session
│
├── lib/
│   ├── api-client.ts                   ← KEEP AS-IS
│   ├── api-types.ts                    ← Extend with session/agent types
│   ├── query-keys.ts                   ← Extend
│   ├── query-provider.tsx              ← KEEP AS-IS
│   ├── routes.ts                       ← Restructure navigation sections
│   └── utils.ts                        ← KEEP AS-IS
│
└── test/
    └── msw-handlers.ts                 ← Extend with new endpoints
```

---

## 4. Page Composition Pattern

### Current (Anti-Pattern)

```tsx
// decisions-page.tsx — 547 lines
function LifecycleFlow() { ... }      // inline
function CreateDecisionDialog() { ... } // inline
const columns = [ ... ];               // inline
export default function DecisionsPage() {
  // 360 lines of page logic + layout
}
```

### Target (Composition Pattern)

```tsx
// decisions-page.tsx — ~80 lines
import { LifecycleFlow } from '@/components/decisions/lifecycle-flow';
import { CreateDecisionDialog } from '@/components/decisions/create-decision-dialog';
import { decisionColumns } from './columns';

export default function DecisionsPage() {
  // Page orchestration: hooks + layout + composition
}
```

### Rules

1. **Page files ≤ 150 lines** — pages compose, they don't implement
2. **Extracted components** get their own Storybook story
3. **Column definitions** live in a `columns.ts` file next to the page
4. **Constants/mappings** live in a `constants.ts` or at the component level
5. **Helper functions** used by multiple components go to `lib/utils.ts`

---

## 5. New Session Model

### Session Detail Page Layout (The Core Screen)

```
┌──────────────────────────────────────────────────────────────┐
│ TopNavigation                                                │
├──────┬───────────────────────────────────────────────────────┤
│      │ Session: CREATE-2026-03-16                            │
│      │ Project: SaaS Platform                                │
│      │ Flow: CREATE · Phase: Architecture · 38%              │
│ Side │───────────────────────────────────────────────────────│
│ bar  │ FlowTimeline                                          │
│      │ [Discovery ✔] → [Architecture ●] → [Planning ○] → …  │
│      │───────────────────────────────────────────────────────│
│      │        AGENTS          │    ARTIFACTS + DECISIONS     │
│      │  ┌─────────────────┐   │  ┌────────────────────────┐  │
│      │  │ DevOps Agent    │   │  │ architecture.md  ✔     │  │
│      │  │ Generating Bicep│   │  │ api-spec.yaml    ●     │  │
│      │  │ ████████░░ 80%  │   │  │                        │  │
│      │  ├─────────────────┤   │  │ DEC-012 DB choice OPEN │  │
│      │  │ Security Arch   │   │  │ DEC-013 Auth     OPEN  │  │
│      │  │ Threat model    │   │  └────────────────────────┘  │
│      │  └─────────────────┘   │                              │
│      │───────────────────────────────────────────────────────│
│      │ Runtime Timeline                                      │
│      │ 10:00 Session started                                 │
│      │ 10:02 Business Analyst completed discovery            │
│      │ 10:05 Architecture phase started                      │
│      │ 10:08 DevOps agent executing…                         │
└──────┴───────────────────────────────────────────────────────┘
```

This screen uses:

- `FlowTimeline` + `FlowStep` (top)
- `AgentActivity` + `AgentCard` (left center)
- `ArtifactCard` + `DecisionCard` (right center)
- `RuntimeLog` + `RuntimeEvent` (bottom)

---

## 6. Overview Page (Replaces Dashboard)

### Layout Change

```
BEFORE (Dashboard):                    AFTER (Overview):
┌─────────────────────┐               ┌─────────────────────┐
│ Health Cards        │               │ Active Session Hero  │
│ Quality | Coverage  │               │ Session + Flow + %   │
│ Builds | Deploy     │               ├─────────────────────┤
├─────────────────────┤               │ FlowTimeline (mini) │
│ Quick Links Grid    │               ├─────────────────────┤
│ Cmd | Pipe | Q | D  │               │ Agent Activity Strip │
├─────────────────────┤               ├─────────────────────┤
│ Metric Cards        │               │ Open Decisions       │
│ Requests | Errors   │               │ Latest Artifacts     │
├─────────────────────┤               ├─────────────────────┤
│ Activity Feed       │               │ System Health Strip  │
│ (generic)           │               │ Agents | Errors | RT │
└─────────────────────┘               └─────────────────────┘
```

The active session becomes the hero. Health cards move to a compact strip.
Goal: 30-second system understanding.

---

## 7. State Management Extension

### New Zustand Store: `runtime-store.ts`

```typescript
interface RuntimeState {
  // Event buffer for timeline display (ring buffer, max 500 events)
  events: RuntimeEvent[];
  addEvent: (event: RuntimeEvent) => void;
  clearEvents: () => void;

  // Active session tracking
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
}
```

### Existing Store Changes: None

`ui-store.ts` remains unchanged. The separation between UI state (Zustand)
and server state (TanStack Query) is correct and should be maintained.

---

## 8. New API Endpoints Required

| Method | Path                         | Response                | Consumer           |
| ------ | ---------------------------- | ----------------------- | ------------------ |
| GET    | `/api/sessions`              | `SessionListResponse`   | Sessions page      |
| GET    | `/api/sessions/:id`          | `SessionDetailResponse` | Session detail     |
| GET    | `/api/sessions/:id/timeline` | `TimelineResponse`      | Runtime timeline   |
| GET    | `/api/agents`                | `AgentListResponse`     | Agents page        |
| GET    | `/api/agents/:id`            | `AgentDetailResponse`   | Agent detail panel |

### New API Types

```typescript
interface Session {
  id: string;
  project: string;
  flow: OrchestratorCommandName;
  phase: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  progress: number;
  started_at: string;
  completed_at: string | null;
  current_agent: string | null;
}

interface SessionDetailResponse {
  session: Session;
  phases: PhaseEntry[];
  agents: AgentEntry[];
  artifacts: Artifact[];
  decisions: (OpenDecision | DecidedDecision)[];
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  type:
    | 'session_start'
    | 'phase_start'
    | 'phase_complete'
    | 'agent_start'
    | 'agent_complete'
    | 'artifact_created'
    | 'gate_passed'
    | 'gate_failed'
    | 'decision_created'
    | 'error'
    | 'retry';
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifact_id?: string;
  metadata?: Record<string, unknown>;
}

interface AgentDetail extends AgentEntry {
  task_description: string;
  started_at: string;
  duration_ms: number;
  prompt_summary?: string;
  outputs: string[];
  retry_count: number;
}
```

---

## 9. Technology Decisions

| Decision               | Choice                     | Rationale                        |
| ---------------------- | -------------------------- | -------------------------------- |
| Graph visualization    | Deferred to future sprint  | List-based lineage is functional |
| Chart library          | Keep CSS-based bars        | Works well, no heavy dependency  |
| State management       | Zustand + TanStack Query   | Already correct, no change       |
| Animation library      | CSS transitions + Tailwind | Already in use, sufficient       |
| WebSocket vs SSE       | Keep SSE                   | Already working, simpler         |
| Sub-route or tab-based | Tabs for observability     | Reduce top-level route count     |

---

## 10. Backward Compatibility

| Concern            | Mitigation                                            |
| ------------------ | ----------------------------------------------------- |
| Existing bookmarks | `/command-center` redirects to `/commands`            |
| API stability      | All existing endpoints remain unchanged               |
| Test coverage      | Extract components with tests first, then rearrange   |
| Storybook          | Stories for extracted components before page refactor |
| Build output       | Same Vite config, no bundler changes                  |
