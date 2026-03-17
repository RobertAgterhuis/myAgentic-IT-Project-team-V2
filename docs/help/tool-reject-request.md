# MCP Tool: reject_request

## Description

Reject a pending governance approval request. A reason is required for all
rejections.

## Input

| Parameter     | Type   | Required | Description                              |
| ------------- | ------ | -------- | ---------------------------------------- |
| `approval_id` | string | Yes      | The approval request ID (e.g. `APR-001`) |
| `user`        | string | Yes      | User performing the rejection            |
| `reason`      | string | Yes      | Reason for rejection (required)          |

## Output

```json
{
  "ok": true,
  "id": "APR-001",
  "action": "rejected"
}
```

## Usage Example

```text
Tool: reject_request
Arguments: {
  "approval_id": "APR-001",
  "user": "lead-engineer",
  "reason": "Test coverage below 80% threshold."
}
```

## Common Errors

- `Reason is required for rejection` — the `reason` parameter must be provided and non-empty.
- `No governance state found` — the governance engine state file does not exist.
- `Approval not found` — the given approval_id does not match any pending request.
