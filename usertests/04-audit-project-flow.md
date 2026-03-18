# 04. AUDIT Project Flow

This file validates the workflow for auditing an existing software solution.

## Scenario 1: Start An AUDIT Command

### Objective

Confirm that a user can start the audit workflow with an existing project context.

### Preconditions

- The application is running.
- The tester has a target project description or repository context to audit.

### Steps

1. Open the Commands page.
2. Choose the AUDIT option.
3. Enter the project name.
4. Provide a short description of the system to be audited.
5. Queue the AUDIT command.

### Expected Outcome

- The AUDIT path is clearly distinct from CREATE.
- The user understands what information is needed.
- A usable audit command is generated.

### Result

| Item                               | Notes |
| ---------------------------------- | ----- |
| Pass / Partial / Fail              |       |
| Setup friction                     |       |
| Missing fields or unclear guidance |       |

### User Feedback

```

```

## Scenario 2: Run The AUDIT Workflow In Copilot Chat

### Objective

Validate the IDE handoff for audit mode.

### Steps

1. Copy the generated AUDIT command.
2. Paste it into Copilot Chat.
3. Submit the command.
4. Use `CONTINUE` to advance through at least two audit steps.

### Expected Outcome

- The handoff from UI to IDE works the same way as CREATE.
- The user can tell that the system is now analyzing an existing solution rather than designing a new one.

### Result

| Item                            | Notes |
| ------------------------------- | ----- |
| Pass / Partial / Fail           |       |
| Handoff clarity                 |       |
| Audit-specific guidance quality |       |

### User Feedback

```

```

## Scenario 3: Confirm Audit Progress And Evidence In The UI

### Objective

Check whether the audit workflow produces visible runtime feedback.

### Steps

1. Open Sessions, Pipeline, and Agents while the audit is in progress.
2. Review whether the active phase, recent agent activity, or status updates are visible.
3. Check whether new documents, artifacts, or status markers appear.

### Expected Outcome

- The user can see that the audit is progressing.
- Status indicators reflect the current work state.
- The system does not look idle or stuck while work is happening.

### Result

| Item                           | Notes |
| ------------------------------ | ----- |
| Pass / Partial / Fail          |       |
| Visibility issues              |       |
| Confidence level while waiting |       |

### User Feedback

```

```

## Scenario 4: Compare CREATE And AUDIT Understandability

### Objective

Capture whether the distinction between CREATE and AUDIT is clear enough for real users.

### Steps

1. Compare the CREATE and AUDIT setup experiences.
2. Note whether the UI makes their difference obvious.
3. Record which one was easier to understand.

### Expected Outcome

- The tester can explain the difference between CREATE and AUDIT after using both.

### User Feedback

```

```
