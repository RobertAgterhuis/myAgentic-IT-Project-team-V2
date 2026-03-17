# MCP Tool: get_command_queue

## Description

Get the full command queue with all queued, active, and completed commands.
Returns the entire queue array including historical entries.

## Input

_No parameters required._

## Output

```json
[
  {
    "id": "CMD-001",
    "command": "CREATE",
    "project": "MyProject",
    "status": "PENDING",
    "queued_at": "2025-01-15T10:00:00.000Z",
    "source": "mcp"
  }
]
```

## Usage Example

```
Tool: get_command_queue
Arguments: {}
```

## Common Errors

- `Failed to read command queue` — the command-queue.json file could not be read or parsed.
