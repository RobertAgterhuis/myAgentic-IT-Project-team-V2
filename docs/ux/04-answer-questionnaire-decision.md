# User Journey 4: Answer Questionnaire / Decision

> "The system needs my input"

## Entry Point

- **Overview page** shows "What's Next" guidance: "X questionnaires need your input" or "X critical decisions awaiting your input"
- Alternatively: sidebar navigation to Questionnaires (`/questionnaires`) or Decisions (`/decisions`)
- Keyboard shortcut: `g q` for Questionnaires, `g e` for Decisions

## Steps — Questionnaire Path

| #   | User Action                                    | UI State                                                        | Route             |
| --- | ---------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| 1   | Sees "X questionnaires need input" on Overview | Badge count shown in What's Next section                        | `/`               |
| 2   | Clicks the guidance link                       | Navigates to Questionnaires page                                | `/questionnaires` |
| 3   | Browses sidebar by phase                       | Phase-grouped questionnaire list with progress bars             | `/questionnaires` |
| 4   | Selects a questionnaire                        | Questions panel shown with current answers and status badges    | `/questionnaires` |
| 5   | Fills in answers for REQUIRED questions        | Draft state tracked locally; status badges update               | `/questionnaires` |
| 6   | Clicks Save                                    | Optimistic update; answers persisted via `useSaveQuestionnaire` | `/questionnaires` |

## Steps — Decision Path

| #   | User Action                                | UI State                                                  | Route        |
| --- | ------------------------------------------ | --------------------------------------------------------- | ------------ |
| 1   | Sees "X critical decisions awaiting input" | HIGH priority decisions highlighted in What's Next        | `/`          |
| 2   | Clicks the guidance link                   | Navigates to Decisions page                               | `/decisions` |
| 3   | Filters by status (OPEN)                   | Data table shows open decisions                           | `/decisions` |
| 4   | Clicks a decision row                      | Detail dialog opens with status, priority, lifecycle flow | `/decisions` |
| 5   | Provides answer/decision                   | Mutation fires via `useUpdateDecision`                    | `/decisions` |
| 6   | Decision status transitions                | Optimistic update; decision moves to DECIDED list         | `/decisions` |

## Expected State Changes

- Questionnaire: question status transitions `OPEN` → `ANSWERED`
- Decision: status transitions `OPEN` → `DECIDED`
- Phase agents may receive resolved `INSUFFICIENT_DATA:` items
- Synthesis may unblock if decisions resolve cross-team blockers

## Exit Point

- All REQUIRED questionnaire questions answered OR all HIGH decisions resolved
- User returns to Overview to see updated guidance

## UI Routes & Components Involved

| Component            | Route             | Purpose                      |
| -------------------- | ----------------- | ---------------------------- |
| `OverviewPage`       | `/`               | What's Next guidance         |
| `QuestionnairesPage` | `/questionnaires` | Browse and answer questions  |
| `DecisionsPage`      | `/decisions`      | Review and decide            |
| `LifecycleFlow`      | `/decisions`      | Decision state visualization |
