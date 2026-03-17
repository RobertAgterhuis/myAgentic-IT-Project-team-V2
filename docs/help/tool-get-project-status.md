# MCP Tool: get_project_status

## Description

Get the current project status including session state, pipeline progress,
active command, and command queue summary.

## Input

No parameters required.

## Output

```json
{
  "session": {
    "projectName": "MyProject",
    "mode": "CREATE",
    "status": "IN_PROGRESS",
    "currentPhase": "Phase 2",
    "currentAgent": "Software Architect"
  },
  "pipeline": {
    "projectName": "MyProject",
    "mode": "CREATE",
    "currentPhase": "Phase 2",
    "currentAgent": "Software Architect",
    "phases": [...],
    "activeSprint": null
  },
  "activeCommand": { "command": "CREATE", "status": "PENDING", ... },
  "commandQueueLength": 1
}
```

## Usage Example

```
Tool: get_project_status
Arguments: {}
```

Returns a combined view of session state, pipeline progress, latest pending
command, and queue depth. Useful as a first call to orient yourself in a project.

## Common Errors

- Returns null session fields when no `session-state.json` exists yet (not an error).
- Pipeline progress may show empty phases if the project hasn't started.
