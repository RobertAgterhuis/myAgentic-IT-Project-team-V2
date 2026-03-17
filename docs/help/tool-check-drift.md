# MCP Tool: check_drift

## Description

Detect drift between session-state sprint statuses and GitHub board sync
reports. Returns a drift report with severity levels (CRITICAL, WARNING, INFO)
and recommendations for resolution.

## Input

_No parameters required._

## Output

```json
{
  "driftItems": [
    {
      "severity": "WARNING",
      "area": "sprint-status",
      "message": "Sprint SP-02 status IN_PROGRESS in session but COMPLETED on board",
      "recommendation": "Update session-state.json to reflect board status"
    }
  ],
  "summary": { "critical": 0, "warning": 1, "info": 0 }
}
```

## Usage Example

```
Tool: check_drift
Arguments: {}
```

## Common Errors

- `Failed to check drift` — drift detection module could not be loaded or session state is missing.
