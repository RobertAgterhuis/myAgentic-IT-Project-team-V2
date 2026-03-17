# MCP Tool: approve_request

## Description

Approve a pending governance approval request. Records the approving user and
an optional reason.

## Input

| Parameter     | Type   | Required | Description                                          |
| ------------- | ------ | -------- | ---------------------------------------------------- |
| `approval_id` | string | Yes      | The approval request ID (e.g. `APR-001`)             |
| `user`        | string | Yes      | User performing the approval                         |
| `reason`      | string | No       | Reason for approval (defaults to "Approved via MCP") |

## Output

```json
{
  "ok": true,
  "id": "APR-001",
  "action": "approved"
}
```

## Usage Example

```
Tool: approve_request
Arguments: {
  "approval_id": "APR-001",
  "user": "lead-engineer",
  "reason": "All sprint gate criteria met."
}
```

## Common Errors

- `No governance state found` — the governance engine state file does not exist.
- `Approval not found` — the given approval_id does not match any pending request.
