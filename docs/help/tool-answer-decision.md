# MCP Tool: answer_decision

## Description

Provide an answer to an existing open question in decisions.md.

## Input

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `id`      | string | Yes      | Decision ID (e.g. `DEC-001`) |
| `answer`  | string | Yes      | The answer text              |

## Output

```json
{
  "ok": true,
  "id": "DEC-001",
  "action": "answered"
}
```

## Usage Example

```
Tool: answer_decision
Arguments: {
  "id": "DEC-001",
  "answer": "We will use PostgreSQL for its ACID compliance and mature ecosystem."
}
```

## Common Errors

- `Missing id` — the decision ID is required.
- `Invalid DEC-ID format` — must match `DEC-NNN` pattern.
- `decisions.md not found` — the file must exist.
