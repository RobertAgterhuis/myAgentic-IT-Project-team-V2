# Phase 01 — Current State Analysis: UI Architecture

> M11: UI Redesign — Validated assessment of the existing frontend

---

## 1. Technology Stack (Current)

| Layer        | Technology                            | Version | Status  |
| ------------ | ------------------------------------- | ------- | ------- |
| Framework    | React                                 | 18.3    | Current |
| Language     | TypeScript                            | 5.x     | Current |
| Build        | Vite                                  | Latest  | Current |
| Styling      | Tailwind CSS 4 + CVA + tailwind-merge | 4.2     | Current |
| Server State | TanStack Query                        | 5.90    | Current |
| Client State | Zustand                               | 5.0     | Current |
| Routing      | React Router                          | 7.13    | Current |
| Table        | TanStack Table                        | 8.21    | Current |
| Icons        | Lucide React                          | 0.577   | Current |
| Components   | Radix UI                              | 1.4     | Current |
| Toasts       | Sonner                                | 2.0     | Current |
| Storybook    | Storybook                             | 10.x    | Current |
| Testing      | Vitest + Testing Library + MSW        | Latest  | Current |

**Verdict:** The tech stack is modern and well-chosen. No technology changes needed.

---

## 2. Architectural Patterns (Current)

### 2.1 Positive Patterns Already In Place

| Pattern                      | Implementation                          | Quality |
| ---------------------------- | --------------------------------------- | ------- |
| Lazy-loaded routes           | `React.lazy()` in `App.tsx`             | Good    |
| Centralized API client       | `api-client.ts` with typed methods      | Good    |
| Typed API contracts          | `api-types.ts` (674 lines)              | Good    |
| Custom hooks per domain      | `hooks/use-*.ts` (15 hooks)             | Good    |
| UI/server state separation   | Zustand for UI, TanStack for server     | Good    |
| Real-time SSE                | `use-sse-events.ts` with auto-reconnect | Good    |
| Route single source of truth | `routes.ts` with typed entries          | Good    |
| Error boundaries             | `ErrorBoundary` wrapping `<Outlet>`     | Good    |
| Design system primitives     | 20+ primitives in `components/ui/`      | Good    |
| Storybook stories            | Stories for most UI primitives          | Good    |
| Design tokens                | `tokens.css` present                    | Good    |
| Breadcrumb navigation        | Derived from route definitions          | Good    |
| Keyboard shortcuts           | `use-keyboard-shortcuts.ts`             | Good    |

### 2.2 Problematic Patterns

| Problem                     | Evidence                                                        | Severity |
| --------------------------- | --------------------------------------------------------------- | -------- |
| Monolithic page components  | 6 pages > 300 lines, largest 547 lines                          | HIGH     |
| Inline sub-components       | All helpers, cards, charts defined inside page files            | HIGH     |
| Dashboard-oriented UX       | Landing page shows health cards, not runtime state              | HIGH     |
| No feature folder structure | All pages are single-file with no extracted components          | MEDIUM   |
| Duplicate utility functions | `relativeTime()` defined in both dashboard-page and metric-card | LOW      |
| No session/flow navigation  | UI has no concept of sessions or flows                          | HIGH     |
| Limited agent visibility    | Agents shown as status badges only, not as live entities        | HIGH     |
| No runtime event timeline   | SSE events trigger cache invalidation but are not visualized    | MEDIUM   |

---

## 3. File Size Audit (Non-Test Source Files)

| File                                  | Lines | Assessment                                  |
| ------------------------------------- | ----- | ------------------------------------------- |
| `lib/api-types.ts`                    | 674   | Acceptable (type definitions)               |
| `pages/decisions/decisions-page`      | 547   | **TOO LARGE** — 5+ inline components        |
| `pages/metrics/metrics-page`          | 508   | **TOO LARGE** — charts + tables inline      |
| `pages/dashboard/dashboard-page`      | 494   | **TOO LARGE** — hero + cards + feeds inline |
| `pages/analytics/analytics-trends`    | 334   | **BORDERLINE** — 3 chart components inline  |
| `pages/traceability/traceability`     | 333   | **BORDERLINE** — entity/gap tables inline   |
| `pages/questionnaires/questionnaires` | 286   | **BORDERLINE** — form + table inline        |
| `pages/governance/governance`         | 273   | **BORDERLINE** — approval table inline      |
| `pages/artifacts/artifact-browser`    | 231   | Acceptable                                  |
| `pages/artifacts/lineage-page`        | 221   | Acceptable                                  |
| `pages/pipeline/pipeline-page`        | 209   | Acceptable                                  |
| `pages/command-center/command-center` | 207   | Acceptable                                  |

**Monolith Threshold:** Pages above 300 lines with inline sub-components violate
separation of concerns. The top 4 pages each contain 3–7 private components that
should be extracted.

---

## 4. Navigation Structure (Current)

```
Overview
├── Dashboard (/)

Operations
├── Command Center (/command-center)
├── Pipeline (/pipeline)

Data
├── Questionnaires (/questionnaires)
├── Decisions (/decisions)

Monitoring
├── Metrics (/metrics)

Platform
├── Artifacts (/artifacts)
├── Artifacts/Lineage (/artifacts/lineage)
├── Governance (/governance)
├── Traceability (/traceability)
```

**Assessment:**

- 9 top-level routes + 1 sub-route (lineage)
- Routes organized by type (Operations, Data, Monitoring, Platform)
- Missing: Sessions, Flows, Agents, Observability
- Navigation categories are data-oriented, not workflow-oriented

---

## 5. Component Inventory

### 5.1 Shared UI Primitives (components/ui/)

| Component     | Stories | Tests | Quality |
| ------------- | ------- | ----- | ------- |
| AlertBanner   | ✓       | ✓     | Good    |
| Badge         | ✓       | ✓     | Good    |
| Button        | ✓       | ✓     | Good    |
| Card          | ✓       | ✓     | Good    |
| ConfirmDialog | ✓       | ✓     | Good    |
| DataTable     | ✓       | ✓     | Good    |
| EmptyState    | ✓       | ✓     | Good    |
| FormRow       | ✓       | ✓     | Good    |
| InputField    | ✓       | ✓     | Good    |
| MetricCard    | ✓       | ✓     | Good    |
| ModalDialog   | ✓       | ✓     | Good    |
| Progress      | ✓       | ✓     | Good    |
| SidePanel     | ✓       | ✓     | Good    |
| Skeleton      | ✓       | —     | OK      |
| Spinner       | ✓       | —     | OK      |
| SwitchField   | ✓       | ✓     | Good    |
| ToastSystem   | ✓       | ✓     | Good    |
| TopNavigation | ✓       | ✓     | Good    |
| Typography    | ✓       | ✓     | Good    |

**Total:** 19 primitives. Good coverage. Missing runtime-specific primitives
(FlowStep, AgentCard, RuntimeEvent, GateStatus).

### 5.2 Feature Components (embedded in pages, NOT extracted)

These components exist but are defined _inside_ page files, making them
non-reusable:

| Component            | Defined In            | Lines | Should Be                        |
| -------------------- | --------------------- | ----- | -------------------------------- |
| LiveStatusHero       | dashboard-page.tsx    | ~80   | `runtime/LiveStatusHero`         |
| HealthCard           | dashboard-page.tsx    | ~20   | `dashboard/HealthCard`           |
| QuickLinks           | dashboard-page.tsx    | ~40   | `dashboard/QuickLinks`           |
| RecentCommands       | dashboard-page.tsx    | ~30   | `dashboard/RecentCommands`       |
| LifecycleFlow        | decisions-page.tsx    | ~20   | `decisions/LifecycleFlow`        |
| CreateDecisionDialog | decisions-page.tsx    | ~60   | `decisions/CreateDecisionDialog` |
| PhaseCard            | pipeline-page.tsx     | ~40   | `runtime/PhaseCard`              |
| AgentList            | pipeline-page.tsx     | ~15   | `runtime/AgentList`              |
| GateIndicator        | pipeline-page.tsx     | ~10   | `runtime/GateIndicator`          |
| MiniBar              | analytics-trends-page | ~15   | `ui/MiniBar`                     |
| VelocityChart        | analytics-trends-page | ~30   | `observability/VelocityChart`    |
| AgentChart           | analytics-trends-page | ~40   | `observability/AgentChart`       |
| DagNode              | lineage-page.tsx      | ~30   | `artifacts/DagNode`              |
| DagEdge              | lineage-page.tsx      | ~15   | `artifacts/DagEdge`              |

**14 components** that should be extracted to feature folders.

---

## 6. Data Flow Architecture (Current)

```
Backend API (Express)
  ↓ /api/*
API Client (api-client.ts)
  ↓ typed fetch
Custom Hooks (use-*.ts)
  ↓ TanStack Query
Page Components
  ↓ render
UI Primitives (components/ui/)

SSE Stream (/api/events)
  → use-sse-events.ts
  → TanStack Query cache invalidation
  → Zustand connectionStatus
```

**Assessment:** Data flow is clean and follows best practices. SSE integration
is correct (invalidation, not duplicate state). No changes needed at this layer.

---

## 7. Backend API Surface

| Route File          | Endpoints                     | UI Consumer              |
| ------------------- | ----------------------------- | ------------------------ |
| `dashboard.ts`      | Health, metrics, activity     | Dashboard page           |
| `orchestrator.ts`   | Status, advance, gates, queue | Command Center, Pipeline |
| `decisions.ts`      | CRUD, categories              | Decisions page           |
| `questionnaires.ts` | List, save                    | Questionnaires page      |
| `milestones.ts`     | CRUD, templates               | (Dashboard stats)        |
| `artifacts.ts`      | List, lineage, stats          | Artifacts pages          |
| `approvals.ts`      | List, approve, reject         | Governance page          |
| `drift.ts`          | Detection                     | Metrics page             |
| `progress.ts`       | Pipeline progress             | Pipeline, Dashboard      |
| `analytics.ts`      | Trends, agents, metrics       | Analytics page           |
| `commands.ts`       | Queue management              | Command Center           |
| `subscribe.ts`      | SSE event stream              | SSE hook                 |

**Assessment:** Backend API is well-structured and segmented. No major changes
needed. New pages (Sessions, Agents activity) will need new API endpoints.

---

## 8. Overall Verdict

| Dimension            | Score    | Notes                                       |
| -------------------- | -------- | ------------------------------------------- |
| Tech stack           | 9/10     | Modern, no changes needed                   |
| Data management      | 9/10     | TanStack Query + Zustand, correct split     |
| API architecture     | 8/10     | Clean, typed, SSE integrated                |
| Component library    | 7/10     | Good primitives, missing runtime components |
| Page architecture    | 4/10     | Monolithic, poor SoC                        |
| Navigation/UX model  | 4/10     | Dashboard-oriented, not runtime-oriented    |
| Feature completeness | 5/10     | Missing sessions, flows, agents, timeline   |
| Code organization    | 5/10     | Flat pages, no feature folders              |
| **Overall**          | **6/10** | **Confirms audit assessment**               |

The platform backend maturity significantly exceeds the UI maturity.
The foundation (tech stack, state management, API layer) is excellent.
The problems are in component architecture and UX mental model.
