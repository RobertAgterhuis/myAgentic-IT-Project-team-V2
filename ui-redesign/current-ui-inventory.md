# Current UI Inventory

## Stack and Build

- Vite + React build with Tailwind and React Router in the UI package scripts and dependencies. [src/webapp/ui/package.json](src/webapp/ui/package.json#L1-L63)
- Vite config with Tailwind plugin and `/api` proxy to the backend. [src/webapp/ui/vite.config.ts](src/webapp/ui/vite.config.ts#L1-L26)

## Route Map (App.tsx)

| Area          | Route                  | Element                 | Notes                                                                                   |
| ------------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Login         | /login                 | LoginPage               | Outside app shell. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L9-L40)        |
| Runtime       | /                      | OverviewPage            | App shell default. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L23-L43)       |
| Runtime       | /dashboard             | DashboardPage           | Runtime dashboard. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L23-L44)       |
| Runtime       | /sessions              | SessionsPage            | Sessions list. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L23-L44)           |
| Runtime       | /sessions/:id          | SessionDetailPage       | Session detail. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L23-L44)          |
| Runtime       | /pipeline              | PipelinePage            | Pipeline overview. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L23-L44)       |
| Operations    | /commands              | CommandsPage            | Command center. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L31-L52)          |
| Operations    | /agents                | AgentsPage              | Agent registry. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L31-L52)          |
| Operations    | /agents/executions     | ExecutionHistoryPage    | Agent execution history. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L31-L52) |
| Operations    | /decisions             | DecisionsPage           | Decisions list. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L31-L52)          |
| Data          | /artifacts             | ArtifactBrowserPage     | Artifact browser. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L39-L56)        |
| Data          | /artifacts/lineage     | LineagePage             | Artifact lineage. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L39-L56)        |
| Data          | /questionnaires        | QuestionnairesPage      | Questionnaires. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L39-L56)          |
| Observability | /observability         | ObservabilityPage       | Metrics + observability. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L60) |
| Observability | /governance            | GovernanceDashboardPage | Governance dashboard. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L60)    |
| Cockpit       | /cockpit               | CockpitDashboardPage    | Operational cockpit. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L63)     |
| Cockpit       | /cockpit/approvals/:id | ApprovalDetailPage      | Approval detail. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L63)         |
| Redirect      | /command-center        | /commands               | Legacy redirect. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L56-L62)         |
| Redirect      | /metrics               | /observability          | Legacy redirect. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L56-L62)         |
| Redirect      | /analytics             | /observability          | Legacy redirect. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L56-L62)         |
| Redirect      | /traceability          | /observability          | Legacy redirect. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L56-L62)         |

## Routing and Navigation

- React Router `createBrowserRouter` drives routing for login, runtime, operations, data, observability, and cockpit pages. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Navigation metadata (sections, labels, paths) lives in a central routes registry used for sidebar and breadcrumbs. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86)

### Navigation Registry Snapshot

| Section       | Label             | Path               | Icon            |
| ------------- | ----------------- | ------------------ | --------------- |
| Runtime       | Overview          | /                  | LayoutDashboard |
| Runtime       | Sessions          | /sessions          | Activity        |
| Runtime       | Pipeline          | /pipeline          | GitBranch       |
| Operations    | Commands          | /commands          | Terminal        |
| Operations    | Agents            | /agents            | Bot             |
| Operations    | Execution History | /agents/executions | History         |
| Operations    | Decisions         | /decisions         | Scale           |
| Data          | Artifacts         | /artifacts         | Package         |
| Data          | Questionnaires    | /questionnaires    | ClipboardList   |
| Observability | Metrics           | /observability     | BarChart3       |
| Observability | Governance        | /governance        | ShieldCheck     |
| Observability | Cockpit           | /cockpit           | Gauge           |

Source: [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L9-L58)

## Layout and App Shell

- The app shell uses `AppLayout` with `TopNavigation`, `SidePanel`, and breadcrumbs around an `Outlet`. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Top navigation includes project context, search, orchestrator state, connection status, theme toggle, and user menu. [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L73-L193)

### App Shell Behaviors

- Sidebar sections are built dynamically from the routes registry and passed into `SidePanel`. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L32-L85)
- Breadcrumbs are derived from `buildBreadcrumbs`, including sub-routes like `/sessions/:id`. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L87-L140), [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L62-L96)
- Background surfaces include a grid overlay and accent glow elements baked into the layout container. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L117-L151)

## State, Data, and Real-Time

- TanStack Query is configured with centralized retry, stale time, and global error handling. [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L1-L50)
- API access is centralized through a fetch wrapper using `/api` base URL. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- UI state (sidebar, help panel, connection status) is handled by Zustand. [src/webapp/ui/src/stores/ui-store.ts](src/webapp/ui/src/stores/ui-store.ts#L1-L66)
- Runtime event buffering and active session tracking uses a Zustand store. [src/webapp/ui/src/stores/runtime-store.ts](src/webapp/ui/src/stores/runtime-store.ts#L1-L44)
- SSE stream hooks invalidate query caches and forward runtime events into the runtime store. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)

## Styling, Tokens, and Theming

- Global styling uses Tailwind and imports generated design tokens plus font families. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182)
- Semantic tokens are defined via a generated `@theme` block (colors, typography, radii, shadows). [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)

## Design System and Component Library

- UI primitives include a reusable data table and status motif patterns for KPI-style layouts. [src/webapp/ui/src/components/ui/data-table.tsx](src/webapp/ui/src/components/ui/data-table.tsx#L1-L200), [src/webapp/ui/src/components/ui/status-motif.tsx](src/webapp/ui/src/components/ui/status-motif.tsx#L1-L49)
- Cross-page layout helpers include `PageShell` for loading/error/empty states and `MetricCard` for KPI summaries. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120)

### Shared Component Inventory (All Components)

- Layout: `AppLayout`. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Navigation: `TopNavigation`, `SidePanel`, `UserMenu`. [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L1-L220), [src/webapp/ui/src/components/ui/side-panel.tsx](src/webapp/ui/src/components/ui/side-panel.tsx#L1-L210), [src/webapp/ui/src/components/ui/user-menu.tsx](src/webapp/ui/src/components/ui/user-menu.tsx#L1-L200)
- Shell + feedback: `PageShell`, `Spinner`, `Skeleton`, `AlertBanner`, `EmptyState`, `ToastSystem`. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/src/components/ui/spinner.tsx](src/webapp/ui/src/components/ui/spinner.tsx#L1-L120), [src/webapp/ui/src/components/ui/skeleton.tsx](src/webapp/ui/src/components/ui/skeleton.tsx#L1-L120), [src/webapp/ui/src/components/ui/alert-banner.tsx](src/webapp/ui/src/components/ui/alert-banner.tsx#L1-L120), [src/webapp/ui/src/components/ui/empty-state.tsx](src/webapp/ui/src/components/ui/empty-state.tsx#L1-L120), [src/webapp/ui/src/components/ui/toast-system.tsx](src/webapp/ui/src/components/ui/toast-system.tsx#L1-L220)
- Core UI primitives: `Card`, `Badge`, `Button`, `Input`, `InputField`, `Label`, `Switch`, `SwitchField`, `Dialog`, `Sheet`, `Table`. [src/webapp/ui/src/components/ui/card.tsx](src/webapp/ui/src/components/ui/card.tsx#L1-L120), [src/webapp/ui/src/components/ui/badge.tsx](src/webapp/ui/src/components/ui/badge.tsx#L1-L120), [src/webapp/ui/src/components/ui/button.tsx](src/webapp/ui/src/components/ui/button.tsx#L1-L120), [src/webapp/ui/src/components/ui/input.tsx](src/webapp/ui/src/components/ui/input.tsx#L1-L120), [src/webapp/ui/src/components/ui/input-field.tsx](src/webapp/ui/src/components/ui/input-field.tsx#L1-L200), [src/webapp/ui/src/components/ui/label.tsx](src/webapp/ui/src/components/ui/label.tsx#L1-L120), [src/webapp/ui/src/components/ui/switch.tsx](src/webapp/ui/src/components/ui/switch.tsx#L1-L120), [src/webapp/ui/src/components/ui/switch-field.tsx](src/webapp/ui/src/components/ui/switch-field.tsx#L1-L200), [src/webapp/ui/src/components/ui/dialog.tsx](src/webapp/ui/src/components/ui/dialog.tsx#L1-L200), [src/webapp/ui/src/components/ui/sheet.tsx](src/webapp/ui/src/components/ui/sheet.tsx#L1-L200), [src/webapp/ui/src/components/ui/table.tsx](src/webapp/ui/src/components/ui/table.tsx#L1-L200)
- Forms + dialogs: `FormRow`, `ConfirmDialog`, `ModalDialog`. [src/webapp/ui/src/components/ui/form-row.tsx](src/webapp/ui/src/components/ui/form-row.tsx#L1-L160), [src/webapp/ui/src/components/ui/confirm-dialog.tsx](src/webapp/ui/src/components/ui/confirm-dialog.tsx#L1-L200), [src/webapp/ui/src/components/ui/modal-dialog.tsx](src/webapp/ui/src/components/ui/modal-dialog.tsx#L1-L200)
- Data surfaces: `DataTable`, `MetricCard`, `MiniBar`, `ProgressBar`. [src/webapp/ui/src/components/ui/data-table.tsx](src/webapp/ui/src/components/ui/data-table.tsx#L1-L200), [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120), [src/webapp/ui/src/components/ui/mini-bar.tsx](src/webapp/ui/src/components/ui/mini-bar.tsx#L1-L120), [src/webapp/ui/src/components/ui/progress.tsx](src/webapp/ui/src/components/ui/progress.tsx#L1-L120)
- Typography + visuals: `Heading`, `Text`, `InlineCode`, `CodeBlock`, `StatusDot`, `StatusMotif`, `TimelineConnector`. [src/webapp/ui/src/components/ui/typography.tsx](src/webapp/ui/src/components/ui/typography.tsx#L1-L160), [src/webapp/ui/src/components/ui/status-dot.tsx](src/webapp/ui/src/components/ui/status-dot.tsx#L1-L120), [src/webapp/ui/src/components/ui/status-motif.tsx](src/webapp/ui/src/components/ui/status-motif.tsx#L1-L120), [src/webapp/ui/src/components/ui/timeline-connector.tsx](src/webapp/ui/src/components/ui/timeline-connector.tsx#L1-L160)
- Control signal system: `ControlSignalBadge` + config. [src/webapp/ui/src/components/ui/control-signal.tsx](src/webapp/ui/src/components/ui/control-signal.tsx#L1-L200), [src/webapp/ui/src/components/ui/control-signal-config.ts](src/webapp/ui/src/components/ui/control-signal-config.ts#L1-L200)
- Runtime components: `LiveStatusHero`, `FlowTimeline`, `AgentActivity`, `RuntimeLog`, `ExplainabilityPanel`, `GateStatus`, `SessionStatus`, `AgentExecuteModal`. [src/webapp/ui/src/components/runtime/live-status-hero.tsx](src/webapp/ui/src/components/runtime/live-status-hero.tsx#L1-L200), [src/webapp/ui/src/components/runtime/flow-timeline.tsx](src/webapp/ui/src/components/runtime/flow-timeline.tsx#L1-L220), [src/webapp/ui/src/components/runtime/agent-activity.tsx](src/webapp/ui/src/components/runtime/agent-activity.tsx#L1-L200), [src/webapp/ui/src/components/runtime/runtime-log.tsx](src/webapp/ui/src/components/runtime/runtime-log.tsx#L1-L220), [src/webapp/ui/src/components/runtime/explainability-panel.tsx](src/webapp/ui/src/components/runtime/explainability-panel.tsx#L1-L200), [src/webapp/ui/src/components/runtime/gate-status.tsx](src/webapp/ui/src/components/runtime/gate-status.tsx#L1-L200), [src/webapp/ui/src/components/runtime/session-status.tsx](src/webapp/ui/src/components/runtime/session-status.tsx#L1-L160), [src/webapp/ui/src/components/runtime/agent-execute-modal.tsx](src/webapp/ui/src/components/runtime/agent-execute-modal.tsx#L1-L200)
- Dashboard components: `HealthCard`, `QuickLinks`, `RecentCommands`, `WhatsNextGuidance`. [src/webapp/ui/src/components/dashboard/health-card.tsx](src/webapp/ui/src/components/dashboard/health-card.tsx#L1-L200), [src/webapp/ui/src/components/dashboard/quick-links.tsx](src/webapp/ui/src/components/dashboard/quick-links.tsx#L1-L200), [src/webapp/ui/src/components/dashboard/recent-commands.tsx](src/webapp/ui/src/components/dashboard/recent-commands.tsx#L1-L200), [src/webapp/ui/src/components/dashboard/whats-next-guidance.tsx](src/webapp/ui/src/components/dashboard/whats-next-guidance.tsx#L1-L200)
- Cockpit components: `ConfidencePanel`, `DependencyGraph`, `DecisionProvenanceView`, `RootCauseView`, `ApprovalHistoryTimeline`, `ApprovalDetailPanel`, `ExecutionTimeline`, `InteractiveLineageGraph`. [src/webapp/ui/src/components/cockpit/confidence-indicators.tsx](src/webapp/ui/src/components/cockpit/confidence-indicators.tsx#L1-L200), [src/webapp/ui/src/components/cockpit/dependency-graph.tsx](src/webapp/ui/src/components/cockpit/dependency-graph.tsx#L1-L220), [src/webapp/ui/src/components/cockpit/decision-provenance-view.tsx](src/webapp/ui/src/components/cockpit/decision-provenance-view.tsx#L1-L200), [src/webapp/ui/src/components/cockpit/root-cause-view.tsx](src/webapp/ui/src/components/cockpit/root-cause-view.tsx#L1-L200), [src/webapp/ui/src/components/cockpit/approval-workflow.tsx](src/webapp/ui/src/components/cockpit/approval-workflow.tsx#L1-L220), [src/webapp/ui/src/components/cockpit/approval-workflow.tsx](src/webapp/ui/src/components/cockpit/approval-workflow.tsx#L1-L220), [src/webapp/ui/src/components/cockpit/execution-timeline.tsx](src/webapp/ui/src/components/cockpit/execution-timeline.tsx#L1-L200), [src/webapp/ui/src/components/cockpit/interactive-lineage-graph.tsx](src/webapp/ui/src/components/cockpit/interactive-lineage-graph.tsx#L1-L200)
- Decisions components: `LifecycleFlow`, `CreateDecisionDialog`. [src/webapp/ui/src/components/decisions/lifecycle-flow.tsx](src/webapp/ui/src/components/decisions/lifecycle-flow.tsx#L1-L160), [src/webapp/ui/src/components/decisions/create-decision-dialog.tsx](src/webapp/ui/src/components/decisions/create-decision-dialog.tsx#L1-L200)
- Onboarding components: `WelcomeWizard`, `OnboardingDiagnosticsWizard`. [src/webapp/ui/src/components/onboarding/welcome-wizard.tsx](src/webapp/ui/src/components/onboarding/welcome-wizard.tsx#L1-L200), [src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx](src/webapp/ui/src/components/onboarding/onboarding-diagnostics-wizard.tsx#L1-L200)
- Artifact components: `DagNode`, `DagEdge`. [src/webapp/ui/src/components/artifacts/dag-node.tsx](src/webapp/ui/src/components/artifacts/dag-node.tsx#L1-L200), [src/webapp/ui/src/components/artifacts/dag-edge.tsx](src/webapp/ui/src/components/artifacts/dag-edge.tsx#L1-L200)
- Observability components: `VelocityChart`, `AgentChart`. [src/webapp/ui/src/components/observability/velocity-chart.tsx](src/webapp/ui/src/components/observability/velocity-chart.tsx#L1-L200), [src/webapp/ui/src/components/observability/agent-chart.tsx](src/webapp/ui/src/components/observability/agent-chart.tsx#L1-L200)
- Help panel: `HelpPanel`. [src/webapp/ui/src/components/help-panel/help-panel.tsx](src/webapp/ui/src/components/help-panel/help-panel.tsx#L1-L200)

### Component Group → Page Index

| Component Group      | Primary Pages                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout + navigation  | All routed pages (global shell)                    | [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)                                                                                                                                                                                                                                                                            |
| Runtime surfaces     | Overview, Session detail, Dashboard                | [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L18-L23), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L19-L23), [src/webapp/ui/src/pages/dashboard/dashboard-page.tsx](src/webapp/ui/src/pages/dashboard/dashboard-page.tsx#L15-L18)                        |
| Dashboard helpers    | Dashboard, Overview                                | [src/webapp/ui/src/pages/dashboard/dashboard-page.tsx](src/webapp/ui/src/pages/dashboard/dashboard-page.tsx#L15-L19), [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L22-L26)                                                                                                                                                      |
| Cockpit + approvals  | Cockpit dashboard, Approval detail, Session detail | [src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx](src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx#L12-L24), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L7-L13), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L19-L23) |
| Decisions            | Decisions                                          | [src/webapp/ui/src/pages/decisions/decisions-page.tsx](src/webapp/ui/src/pages/decisions/decisions-page.tsx#L13-L20)                                                                                                                                                                                                                                                                        |
| Observability charts | Analytics trends                                   | [src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx](src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx#L11-L16)                                                                                                                                                                                                                                                          |
| Artifacts            | Lineage                                            | [src/webapp/ui/src/pages/artifacts/lineage-page.tsx](src/webapp/ui/src/pages/artifacts/lineage-page.tsx#L11-L16)                                                                                                                                                                                                                                                                            |
| Onboarding           | Overview                                           | [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L21-L26)                                                                                                                                                                                                                                                                            |
| Governance           | Governance dashboard                               | [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L8-L20)                                                                                                                                                                                                                                                 |

### Component Usage Validation (Pages + Storybook)

- Full component usage index: [ui-redesign/component-usage-index.md](ui-redesign/component-usage-index.md)
- Unreferenced components (no page or Storybook usage yet): see [ui-redesign/component-usage-index.md](ui-redesign/component-usage-index.md) for the current list.

## Key Page Component Inventory (Phase 0 Baseline)

### Overview Page

- Core layout + motifs: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `Badge`, `Card`, `Button`, `Heading`, `Text`. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L8-L22)
- Runtime widgets: `SessionStatus`, `FlowTimeline`, `AgentActivity`. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L18-L21)
- Onboarding + guidance: `WelcomeWizard`, `OnboardingDiagnosticsWizard`, `HealthCard`, `WhatsNextGuidance`. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L21-L26)
- Data hooks and UI state: `useSessions`, `useSession`, `useDecisions`, `useDashboardHealth`, `useUIStore`. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L28)

### Sessions Page

- Core layout + status cues: `MissionControlHero`, `StatusMotif`, `Badge`, `Card`, `ProgressBar`, `EmptyState`, `AlertBanner`, `Spinner`, `Button`, `Text`. [src/webapp/ui/src/pages/sessions/sessions-page.tsx](src/webapp/ui/src/pages/sessions/sessions-page.tsx#L6-L15)
- Data hooks: `useSessions`. [src/webapp/ui/src/pages/sessions/sessions-page.tsx](src/webapp/ui/src/pages/sessions/sessions-page.tsx#L16-L16)

### Session Detail Page

- Runtime focus components: `FlowTimeline`, `AgentActivity`, `RuntimeLog`, `ExplainabilityPanel`, `ExecutionTimeline`. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L19-L23)
- Control shell: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `Badge`, `Card`, `Button`, `Heading`, `Text`. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L9-L18)
- Data hooks and stores: `useSession`, `useRuntimeStore`. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L25)

### Observability Page

- Tabbed layout with lazy-loaded subpages: `MetricsPage`, `AnalyticsTrendsPage`, `TraceabilityExplorerPage`. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L11-L15)
- Header + loading affordances: `Heading`, `Text`, `Spinner`. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L7-L8)

### Governance Dashboard Page

- Core governance surfaces: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `MetricCard`, `DataTable`, `DecisionProvenanceView`. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L8-L17)
- Data hooks and actions: `useApprovals`, `useApproveRequest`, `useRejectRequest`, `useDecisionProvenance`. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L20-L20)

### Dashboard Page

- Core layout + status summaries: `MissionControlHero`, `StatusMotif`, `LiveStatusHero`, `HealthCard`, `MetricCard`, `ActivityFeed`, `RecentCommands`. [src/webapp/ui/src/pages/dashboard/dashboard-page.tsx](src/webapp/ui/src/pages/dashboard/dashboard-page.tsx)
- Data hooks: `useDashboardHealth`, `useDashboardMetrics`, `useDashboardActivity`, `useDashboardStats`, `useCockpitHealth`, `useSessions`. [src/webapp/ui/src/pages/dashboard/dashboard-page.tsx](src/webapp/ui/src/pages/dashboard/dashboard-page.tsx)

### Commands Page

- Command intake + queue UI: `InputField`, `Card`, `Badge`, `Button`. [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx)
- Data hooks: `useOrchestratorStatus`, `useOrchestratorQueue`, `useQueueCommand`. [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx)

### Pipeline Page

- Phase swimlane UI: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `ProgressBar`, `Card`, `Badge`. [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx)
- Data hooks: `useOrchestratorStatus`, `useProgress`. [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx)

### Agents Page

- Agent list + detail panel: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `MetricCard`, `ExplainabilityPanel`, `AgentExecuteModal`. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx)
- Data hooks: `useAgents`. [src/webapp/ui/src/pages/agents/agents-page.tsx](src/webapp/ui/src/pages/agents/agents-page.tsx)

### Execution History Page

- Execution table + filters: `Badge`, `Spinner`, `AlertBanner`, `Heading`, `Text`. [src/webapp/ui/src/pages/agents/execution-history-page.tsx](src/webapp/ui/src/pages/agents/execution-history-page.tsx)
- Data hooks: `useExecutionHistory`. [src/webapp/ui/src/pages/agents/execution-history-page.tsx](src/webapp/ui/src/pages/agents/execution-history-page.tsx)

### Decisions Page

- Decision management UI: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `LifecycleFlow`, `CreateDecisionDialog`, `ModalDialog`, `DataTable`. [src/webapp/ui/src/pages/decisions/decisions-page.tsx](src/webapp/ui/src/pages/decisions/decisions-page.tsx)
- Data hooks: `useDecisions`, `useUpdateDecision`, `useDeleteDecision`. [src/webapp/ui/src/pages/decisions/decisions-page.tsx](src/webapp/ui/src/pages/decisions/decisions-page.tsx)

### Questionnaires Page

- Questionnaire workflow UI: `SidePanel`, `InputField`, `ProgressBar`, `Badge`, `Card`. [src/webapp/ui/src/pages/questionnaires/questionnaires-page.tsx](src/webapp/ui/src/pages/questionnaires/questionnaires-page.tsx)
- Data hooks: `useQuestionnaires`, `useQuestionnaire`, `useSaveQuestionnaire`. [src/webapp/ui/src/pages/questionnaires/questionnaires-page.tsx](src/webapp/ui/src/pages/questionnaires/questionnaires-page.tsx)

### Artifact Browser Page

- Registry + filters: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `MetricCard`, `DataTable`. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx)
- Data hooks: `useArtifacts`. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx)

### Lineage Page

- Lineage visualization: `InteractiveLineageGraph`, `DagNode`, `DagEdge`, `Card`, `Input`. [src/webapp/ui/src/pages/artifacts/lineage-page.tsx](src/webapp/ui/src/pages/artifacts/lineage-page.tsx)
- Data hooks: `useArtifacts`, `useArtifactLineage`. [src/webapp/ui/src/pages/artifacts/lineage-page.tsx](src/webapp/ui/src/pages/artifacts/lineage-page.tsx)

### Metrics Page

- Drift + KPI UI: `MetricCard`, `DataTable`, `ProgressBar`, `Card`. [src/webapp/ui/src/pages/metrics/metrics-page.tsx](src/webapp/ui/src/pages/metrics/metrics-page.tsx)
- Data hooks: `useDriftDetection`, `useProgress`, `useDashboardMetrics`, `useAnalyticsTrends`, `useAnalyticsAgents`. [src/webapp/ui/src/pages/metrics/metrics-page.tsx](src/webapp/ui/src/pages/metrics/metrics-page.tsx)

### Analytics Trends Page

- Trend charts + KPIs: `VelocityChart`, `AgentChart`, `MetricCard`, `Card`. [src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx](src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx)
- Data hooks: `useAnalyticsTrends`, `useAnalyticsAgents`. [src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx](src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx)

### Traceability Explorer Page

- Traceability UI: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `TraceChainVisual`, `DataTable`. [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx)
- Data hooks: `useTraceability`. [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx)

### Cockpit Dashboard Page

- Cockpit tabs + diagnostics: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `ConfidencePanel`, `DependencyGraph`, `DecisionProvenanceView`, `RootCauseView`, `ApprovalHistoryTimeline`. [src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx](src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx)
- Data hooks: `useCockpitHealth`, `useDependencyGraph`, `useDecisionProvenance`, `useRootCause`, `useApprovalHistory`. [src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx](src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx)

### Approval Detail Page

- Approval review UI: `MissionControlHero`, `StatusMotif`, `ControlSignalBadge`, `ApprovalDetailPanel`. [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx)
- Data hooks: `useApprovalDetail`. [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx)

### Login Page

- Authentication UI: `Card`, `Button`, `Heading`, `Text`. [src/webapp/ui/src/pages/login/login-page.tsx](src/webapp/ui/src/pages/login/login-page.tsx)
- Data stores: `useAuthStore`. [src/webapp/ui/src/pages/login/login-page.tsx](src/webapp/ui/src/pages/login/login-page.tsx)

## Storybook

- Storybook is configured with React Vite, a11y addon, vitest addon, and MSW loader support. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L26)

## Testing and Quality Signals

- Component unit tests exist for shared UI primitives (example: DataTable tests). [src/webapp/ui/src/components/ui/data-table.test.tsx](src/webapp/ui/src/components/ui/data-table.test.tsx#L1-L80)
