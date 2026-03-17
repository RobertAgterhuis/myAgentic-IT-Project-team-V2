# MCP Tool: create_decision

## Description

Create a new open question or operational decision in decisions.md.

## Input

| Parameter  | Type   | Required | Description                                               |
| ---------- | ------ | -------- | --------------------------------------------------------- |
| `type`     | string | Yes      | `question`, `operational`, or `OPEN_QUESTION`             |
| `priority` | string | Yes      | `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`                    |
| `scope`    | string | Yes      | Domain scope (e.g. `TECH`, `BUSINESS`, `UX`, `MARKETING`) |
| `text`     | string | Yes      | The question or decision text                             |
| `notes`    | string | No       | Additional context notes                                  |

## Output

```json
{
  "ok": true,
  "id": "DEC-003",
  "action": "created_open_question"
}
```

## Usage Example

```
Tool: create_decision
Arguments: {
  "type": "question",
  "priority": "HIGH",
  "scope": "TECH",
  "text": "Should we use PostgreSQL or MongoDB for the persistence layer?"
}
```

## Common Errors

- `Invalid type` — must be `question`, `operational`, or `OPEN_QUESTION`.
- `Invalid priority` — must be CRITICAL, HIGH, MEDIUM, or LOW.
- `Missing scope` — scope is required.
- `decisions.md not found` — the file must exist before creating entries.
