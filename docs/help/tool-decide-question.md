# MCP Tool: decide_question

## Description

Mark an open question as decided with a rationale.

## Input

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `id`      | string | Yes      | Decision ID (e.g. `DEC-001`) |
| `answer`  | string | No       | Final decision text          |
| `reason`  | string | No       | Rationale for the decision   |

## Output

```json
{
  "ok": true,
  "id": "DEC-001",
  "action": "decided"
}
```

## Usage Example

```
Tool: decide_question
Arguments: {
  "id": "DEC-001",
  "answer": "PostgreSQL",
  "reason": "Best fit for ACID compliance and team expertise."
}
```

## Common Errors

- `Missing id` — the decision ID is required.
- `Invalid DEC-ID format` — must match `DEC-NNN` pattern.
