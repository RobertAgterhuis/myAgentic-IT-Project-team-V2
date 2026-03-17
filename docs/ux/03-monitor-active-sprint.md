# User Journey 3: Monitor Active Sprint

> "What's happening right now?"

## Entry Point

- User lands on **Overview** (`/`) — the default landing page
- Active session hero card is visible with live progress

## Steps

| #   | User Action                  | UI State                                             | Route            |
| --- | ---------------------------- | ---------------------------------------------------- | ---------------- |
| 1   | Views Overview page          | Session hero shows current phase, agent, progress %  | `/`              |
| 2   | Checks phase timeline        | FlowTimeline shows completed/running/pending phases  | `/`              |
| 3   | Reviews agent activity strip | Active agents listed with status/retry info          | `/`              |
| 4   | Clicks "View all" on agents  | Navigates to Agents page                             | `/agents`        |
| 5   | Clicks phase in timeline     | Navigates to Session Detail with phase context       | `/sessions/:id`  |
| 6   | Reviews session detail       | Timeline events, agent list, phase breakdown visible | `/sessions/:id`  |
| 7   | Checks governance status     | Gate status, pending approvals shown                 | `/governance`    |
| 8   | Reviews metrics              | Observability dashboard with live metrics            | `/observability` |

## Expected State Changes

- No state changes — this is a read-only monitoring journey
- SSE events update the UI in real-time (agent progress, phase transitions, errors)
- Connection status indicator reflects SSE health

## Exit Point

- User has a clear picture of sprint progress
- If blocked items exist → transitions to Journey 4 or 5

## UI Routes & Components Involved

| Component                 | Route            | Purpose                |
| ------------------------- | ---------------- | ---------------------- |
| `OverviewPage`            | `/`              | High-level status      |
| `SessionStatus`           | `/`              | Active session hero    |
| `FlowTimeline`            | `/`              | Phase progression      |
| `AgentActivity`           | `/`              | Live agent status      |
| `SessionDetailPage`       | `/sessions/:id`  | Deep-dive into session |
| `AgentsPage`              | `/agents`        | All agents overview    |
| `GovernanceDashboardPage` | `/governance`    | Gates and approvals    |
| `ObservabilityPage`       | `/observability` | Metrics and traces     |
