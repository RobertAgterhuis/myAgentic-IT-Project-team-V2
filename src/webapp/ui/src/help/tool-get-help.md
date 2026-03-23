# MCP Tool: get_help

## Description

Get help on commands, concepts, and workflows. Omit the `topic` parameter to
receive a table of contents listing all available help topics.

## Input

| Parameter | Type   | Required | Description                                                                                                  |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| `topic`   | string | No       | Help topic slug (e.g. `commands`, `phases`, `decisions`, `tool-save-answers`). Omit for a table of contents. |

## Output (table of contents)

```json
{
  "topics": [
    { "slug": "commands", "title": "commands" },
    { "slug": "decisions", "title": "decisions" },
    { "slug": "tool-get-help", "title": "tool-get-help" }
  ]
}
```

## Output (single topic)

```json
{
  "slug": "commands",
  "content": "# Commands\n\nAvailable commands: CREATE, AUDIT, ..."
}
```

## Usage Example

```
Tool: get_help
Arguments: {}
```

```
Tool: get_help
Arguments: { "topic": "commands" }
```

## Common Errors

- `Help directory not found` — the src/webapp/ui/src/help directory is missing.
- `Help topic not found: <topic>` — no file matching that slug exists in src/webapp/ui/src/help.
