# 05. Questionnaires And REEVALUATE

This file validates the workflow for answering agent questions and re-running analysis with better information.

## Scenario 1: Open And Review A Questionnaire

### Objective

Confirm that a user can find and understand a questionnaire raised by the system.

### Preconditions

- A session exists with at least one questionnaire.

### Steps

1. Open the Questionnaires page.
2. Select an available questionnaire.
3. Review the sections, questions, and status indicators.
4. Identify whether it is obvious why the questionnaire exists.

### Expected Outcome

- Questionnaires are easy to find.
- Questions are readable and grouped logically.
- The user understands what information is being requested.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Readability issues    |       |
| Missing context       |       |

### User Feedback

```

```

## Scenario 2: Answer Questions And Save

### Objective

Confirm that answers can be entered and saved reliably.

### Steps

1. Enter answers for at least three questions.
2. Save the answers.
3. Refresh the page.
4. Reopen the same questionnaire.

### Expected Outcome

- Answers save without error.
- Saved answers remain visible after refresh.
- Question status changes appropriately.

### Result

| Item                    | Notes |
| ----------------------- | ----- |
| Pass / Partial / Fail   |       |
| Save behavior           |       |
| Data persistence issues |       |

### User Feedback

```

```

## Scenario 3: Test Secret Or Unsafe Input Warnings

### Objective

Validate that the application warns users when they enter sensitive information.

### Steps

1. In a non-production test answer, enter text that resembles a token, secret, or private key.
2. Attempt to save the answer.
3. Record whether the UI warns you clearly.
4. Remove the test secret-like value after the check.

### Expected Outcome

- The system warns the user about secret-like input.
- The warning is understandable and visible.

### Result

| Item                                      | Notes |
| ----------------------------------------- | ----- |
| Pass / Partial / Fail                     |       |
| Warning clarity                           |       |
| False positive or false negative concerns |       |

### User Feedback

```

```

## Scenario 4: Reevaluate After Updating Answers

### Objective

Confirm that the workflow from questionnaire completion back into agent execution is clear.

### Steps

1. After saving answers, open Copilot Chat.
2. Submit a `REEVALUATE [scope]` command that matches the questionnaire context.
3. Use `CONTINUE` if the system requires it.
4. Observe whether the session resumes with the new information.

### Expected Outcome

- The tester understands that answering is not the final step.
- The reevaluation command is easy to invoke.
- The session continues using the updated information.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| Workflow clarity      |       |
| Reevaluate behavior   |       |

### User Feedback

```

```
