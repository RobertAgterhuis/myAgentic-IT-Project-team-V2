# User Journey 1: First-Time Onboarding

> "I just installed this, what do I do?"

## Entry Point

- User opens the app for the first time → lands on **Overview** (`/`)
- The `WelcomeWizard` component is displayed (persisted via `useWelcomeWizard`)

## Steps

| #   | User Action                              | UI State                                                         | Route       |
| --- | ---------------------------------------- | ---------------------------------------------------------------- | ----------- |
| 1   | Opens app                                | Overview page loads; WelcomeWizard overlay shown                 | `/`         |
| 2   | Reads wizard intro, clicks "Get Started" | Wizard advances to step 2 (project overview)                     | `/`         |
| 3   | Completes wizard steps                   | Wizard dismissed; "What's Next" guidance section becomes visible | `/`         |
| 4   | Clicks "Create your first project" CTA   | Navigates to Commands page                                       | `/commands` |
| 5   | Enters project name and selects CREATE   | Command queued; orchestrator starts                              | `/commands` |
| 6   | Returns to Overview                      | Active session hero appears; phase timeline shows PHASE-1        | `/`         |

## Expected State Changes

- `WelcomeWizard` dismissed flag stored in localStorage
- Orchestrator transitions from `idle` → `running`
- Session created with status `active`
- SSE connection established for real-time updates

## Exit Point

- User sees the active session on Overview with live progress
- They can now follow Journey 3 (Monitor Active Sprint) or Journey 4 (Answer Questionnaire)

## UI Routes & Components Involved

| Component           | Route       | Purpose                    |
| ------------------- | ----------- | -------------------------- |
| `OverviewPage`      | `/`         | Landing page with guidance |
| `WelcomeWizard`     | `/`         | First-time onboarding flow |
| `WhatsNextGuidance` | `/`         | Contextual next actions    |
| `CommandsPage`      | `/commands` | Project creation           |
| `SessionStatus`     | `/`         | Active session hero        |
| `FlowTimeline`      | `/`         | Phase progress             |
