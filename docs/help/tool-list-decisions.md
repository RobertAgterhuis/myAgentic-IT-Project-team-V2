# MCP Tool: list_decisions

## Description

List all decisions grouped by status: open questions, decided items, and
deferred items. Also discovers decision category files if present.

## Input

No parameters required.

## Output

```json
{
  "open": [
    {
      "id": "DEC-001",
      "type": "OPEN_QUESTION",
      "status": "OPEN",
      "priority": "HIGH",
      "scope": "TECH",
      "question": "Which database to use?"
    }
  ],
  "decided": [
    {
      "id": "DEC-002",
      "type": "DECIDED",
      "status": "DECIDED",
      "priority": "MEDIUM",
      "scope": "BUSINESS",
      "question": "Freemium or paid?",
      "answer": "Freemium with premium tier."
    }
  ],
  "deferred": [],
  "categories": [
    { "name": "accessibility", "file": "decisions/accessibility.md" }
  ]
}
```

## Usage Example

```
Tool: list_decisions
Arguments: {}
```

## Common Errors

- Returns empty arrays when `decisions.md` does not exist yet.
