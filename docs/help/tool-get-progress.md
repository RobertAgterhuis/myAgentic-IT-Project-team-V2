# MCP Tool: get_progress

## Description

Get the current pipeline progress summary derived from session state.

## Input

No parameters required.

## Output

```json
{
  "projectName": "MyProject",
  "mode": "CREATE",
  "currentPhase": "Phase 2",
  "currentAgent": "Software Architect",
  "phases": [
    { "id": "phase-1", "name": "Requirements & Strategy", "status": "done" }
  ],
  "activeSprint": null
}
```

## Usage Example

```
Tool: get_progress
Arguments: {}
```

Returns a focused view of pipeline progress. Lighter weight than
`get_project_status` — use when you only need phase/agent info.

## Common Errors

- Returns null fields when no session state exists (this is normal for new projects).
