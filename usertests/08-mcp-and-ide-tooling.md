# 08. MCP And IDE Tooling

This file validates whether the repository works well from inside the IDE, which is critical for a cloned solution intended for project use.

## Scenario 1: Verify MCP Configuration Is Discoverable

### Objective

Confirm that IDE integration is present and understandable.

### Steps

1. Open the repository in VS Code.
2. Verify that `.vscode/mcp.json` exists.
3. Open Copilot tools or MCP-related UI in VS Code.
4. Check whether the repository-provided MCP server is visible.

### Expected Outcome

- The tester can find the MCP setup without extra manual configuration.
- The MCP server is discoverable from the workspace.

### Result

| Item                  | Notes |
| --------------------- | ----- |
| Pass / Partial / Fail |       |
| MCP discoverability   |       |
| Setup friction        |       |

### User Feedback

```

```

## Scenario 2: Test A Read-Only MCP Query

### Objective

Confirm that the IDE can use the project tools successfully.

### Steps

1. In Copilot Chat, ask a status-oriented question such as `What is the current project status?`
2. Observe whether Copilot invokes MCP tools from the repository.
3. Record whether the answer is useful and grounded in the current project state.

### Expected Outcome

- The IDE can call the repository MCP server.
- The response reflects project data rather than a generic answer.

### Result

| Item                    | Notes |
| ----------------------- | ----- |
| Pass / Partial / Fail   |       |
| Tool invocation quality |       |
| Answer quality          |       |

### User Feedback

```

```

## Scenario 3: Test A Workflow-Oriented MCP Interaction

### Objective

Validate that a user can drive part of the workflow from the IDE.

### Steps

1. Ask Copilot to list questionnaires, decisions, or command queue state.
2. If appropriate, ask Copilot to help queue a command or answer a questionnaire.
3. Compare the result with the web UI to confirm consistency.

### Expected Outcome

- IDE-driven interactions feel connected to the same system state as the browser.
- The user can switch between UI and IDE without losing context.

### Result

| Item                      | Notes |
| ------------------------- | ----- |
| Pass / Partial / Fail     |       |
| Consistency with web UI   |       |
| Context switching quality |       |

### User Feedback

```

```
