# MCP Tool: list_approvals

## Description

List pending governance approval requests. Returns all approval items that are
awaiting a decision, along with their metadata.

## Input

_No parameters required._

## Output

```json
{
  "approvals": [
    {
      "id": "APR-001",
      "type": "SPRINT_GATE",
      "status": "PENDING",
      "requested_by": "orchestrator",
      "requested_at": "2025-01-15T10:00:00.000Z",
      "description": "Sprint SP-03 gate approval"
    }
  ],
  "count": 1
}
```

## Usage Example

```
Tool: list_approvals
Arguments: {}
```

## Common Errors

- `No governance state found` — the governance engine state file does not exist (returns empty list with a note, not an error).
