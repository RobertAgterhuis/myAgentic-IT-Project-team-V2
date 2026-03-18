# 03. CREATE Project Flow

This file validates the primary user journey for creating a new software solution from scratch.

## Scenario 1: Start A CREATE Command

### Objective

Confirm that a new user can start a CREATE workflow from the Commands page.

### Preconditions

- The application is running.
- GitHub Copilot is available in the tester's IDE if the full flow is being validated.

### Steps

1. Open the Commands page.
2. Choose the CREATE option for a new solution.
3. Enter a project name.
4. Add a short project brief.
5. Queue the command.
6. Observe whether a command string is generated or copied for IDE use.

### Expected Outcome

- The user can clearly select CREATE.
- The project name and brief can be entered without validation problems.
- Queueing the command produces a clear next step for the user.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Friction during setup |       |
| Validation issues     |       |

### User Feedback

```

```

## Scenario 2: Send The CREATE Command To Copilot Chat

### Objective

Confirm that the handoff from web UI to IDE is understandable.

### Steps

1. Copy the generated CREATE command.
2. Open Copilot Chat in VS Code.
3. Paste the command into chat.
4. Submit the command.
5. Observe whether the orchestration flow starts.

### Expected Outcome

- The generated command is easy to locate and copy.
- The tester understands where to paste it.
- The first agent or orchestration step begins without ambiguity.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Handoff clarity       |       |
| Missing instructions  |       |

### User Feedback

```

```

## Scenario 3: Continue The Pipeline

### Objective

Confirm that the CONTINUE-based workflow is usable for a new user.

### Steps

1. After the first agent completes, type `CONTINUE` in Copilot Chat.
2. Repeat for at least two more steps.
3. If the workflow reaches a phase boundary, start a new chat and send `CONTINUE` again.
4. Observe whether progress is preserved and visible in the web UI.

### Expected Outcome

- The user understands when and how to use `CONTINUE`.
- The workflow moves to the next agent correctly.
- Progress remains visible in the application.

### Result

| Item                    | Notes |
| ----------------------- | ----- |
| Pass / Partial / Fail   |       |
| Confusion points        |       |
| Phase transition issues |       |

### User Feedback

```

```

## Scenario 4: Verify Session And Pipeline Visibility

### Objective

Confirm that CREATE progress is understandable in the UI.

### Steps

1. Open the Sessions page.
2. Open the Pipeline page.
3. Verify that the current project, mode, and progress are visible.
4. Open the current session detail if available.

### Expected Outcome

- The newly started CREATE session is visible.
- The user can tell which phase is active and what already completed.
- Session detail pages provide useful context rather than raw internal data only.

### Result

| Item                     | Notes |
| ------------------------ | ----- |
| Pass / Partial / Fail    |       |
| Missing progress signals |       |
| Session clarity          |       |

### User Feedback

```

```

## Scenario 5: Judge Whether CREATE Is Usable For A Real Project

### Objective

Capture the tester's opinion on whether the workflow is practical for real adoption.

### Steps

1. Reflect on the full CREATE flow so far.
2. Record whether the process feels guided, confusing, too manual, or appropriately controlled.

### Expected Outcome

- The tester can clearly state whether the CREATE flow is understandable and credible for real work.

### User Feedback

```

```
