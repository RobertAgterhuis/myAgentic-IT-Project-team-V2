# MCP Tool: queue_command

## Description

Queue a command for the orchestrator. After queuing, paste the returned text
into Copilot Chat to trigger execution.

## Input

| Parameter     | Type   | Required | Description                                                                                         |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `command`     | string | Yes      | The command to queue (CREATE, AUDIT, REEVALUATE, FEATURE, SCOPE CHANGE, HOTFIX, REFRESH ONBOARDING) |
| `project`     | string | No       | Project name (for CREATE/AUDIT)                                                                     |
| `scope`       | string | No       | Scope: ALL, BUSINESS, TECH, UX, MARKETING (for REEVALUATE/SCOPE CHANGE)                             |
| `description` | string | No       | Description (for FEATURE, SCOPE CHANGE, HOTFIX)                                                     |
| `brief`       | string | No       | Full project brief text (saved to BusinessDocs/project-brief.md)                                    |

## Output

```json
{
  "queued": true,
  "text": "CREATE MyProject",
  "instruction": "Paste this into Copilot Chat: CREATE MyProject"
}
```

## Usage Example

```
Tool: queue_command
Arguments: {
  "command": "CREATE",
  "project": "MyProject",
  "brief": "A SaaS platform for project management."
}
```

## Common Errors

- `command is required` — the `command` parameter must be provided.
- `Unknown command` — command must be one of: CREATE, AUDIT, REEVALUATE, FEATURE, SCOPE CHANGE, HOTFIX, REFRESH ONBOARDING.
