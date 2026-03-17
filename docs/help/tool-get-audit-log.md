# MCP Tool: get_audit_log

## Description

Get recent entries from the mutation audit trail. This is an append-only log of
all data changes (decisions, answers, commands, state transitions).

## Input

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `limit`   | number | No       | Maximum entries to return (default: 50, max: 1000) |

## Output

```json
[
  {
    "ts": "2025-01-15T10:30:00.000Z",
    "action": "decision.create",
    "agent": "mcp",
    "detail": { "id": "DEC-001", "type": "TECHNICAL" }
  },
  {
    "ts": "2025-01-15T10:25:00.000Z",
    "action": "answers.save",
    "agent": "mcp",
    "detail": { "questionnaire": "Phase1-Business/requirements.md" }
  }
]
```

## Usage Example

```
Tool: get_audit_log
Arguments: { "limit": 20 }
```

## Common Errors

- `Failed to read audit log` — the audit log file could not be read or parsed.
