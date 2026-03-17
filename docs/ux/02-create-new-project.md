# User Journey 2: Create New Project

> "I want to start a CREATE cycle"

## Entry Point

- User navigates to **Commands** page (`/commands`) via sidebar or keyboard shortcut `g c`
- Alternatively: clicks "Go to Commands" CTA from Overview empty state

## Steps

| #   | User Action                            | UI State                                                    | Route       |
| --- | -------------------------------------- | ----------------------------------------------------------- | ----------- |
| 1   | Opens Commands page                    | Quick action buttons (CREATE, AUDIT, FEATURE, HOTFIX) shown | `/commands` |
| 2   | Enters project name in the input field | Project name validated (non-empty)                          | `/commands` |
| 3   | Clicks CREATE quick action             | Command queued; mutation fires `useQueueCommand`            | `/commands` |
| 4   | Sees queue entry appear                | Queue table shows new entry with status PENDING             | `/commands` |
| 5   | Entry transitions to PROCESSING        | Badge changes from warning to info                          | `/commands` |
| 6   | Navigates to Overview                  | Active session displayed with PHASE-1 running               | `/`         |
| 7   | Monitors pipeline progress             | Phase timeline shows progression through phases             | `/pipeline` |

## Expected State Changes

- Orchestrator receives `CREATE` command with project name
- `session-state.json` created with status `ONBOARDING`
- Onboarding Agent activated
- SSE events start flowing: `session_start`, `phase_start`, `agent_start`

## Exit Point

- Session is running; user can monitor via Overview or Pipeline
- Onboarding phase begins; user may receive questionnaires (Journey 4)

## UI Routes & Components Involved

| Component      | Route       | Purpose                       |
| -------------- | ----------- | ----------------------------- |
| `CommandsPage` | `/commands` | Brief input and quick actions |
| `OverviewPage` | `/`         | Session overview              |
| `PipelinePage` | `/pipeline` | Phase-by-phase pipeline view  |
| `SessionsPage` | `/sessions` | Session list                  |
