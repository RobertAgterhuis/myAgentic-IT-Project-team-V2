# MCP Tool: get_questionnaire

## Description

Retrieve the full parsed content of a specific questionnaire file, including
all sections, questions, and their answer status.

## Input

| Parameter | Type   | Required | Description                                                             |
| --------- | ------ | -------- | ----------------------------------------------------------------------- |
| `file`    | string | Yes      | Relative path to the questionnaire .md file (relative to BusinessDocs/) |

## Output

```json
{
  "file": "Phase1-Business/Questionnaires/business-analyst-questionnaire.md",
  "agent": "Business Analyst",
  "phase": "Phase 1",
  "generated": "2026-01-15",
  "version": "1.0",
  "sections": [
    { "title": "Business Context", "questions": [...] }
  ],
  "questions": [
    {
      "id": "Q-01-0001",
      "priority": "REQUIRED",
      "text": "What is the primary business problem?",
      "status": "ANSWERED",
      "answer": "...",
      "lastUpdated": "2026-01-20"
    }
  ]
}
```

## Usage Example

```
Tool: get_questionnaire
Arguments: {
  "file": "Phase1-Business/Questionnaires/business-analyst-questionnaire.md"
}
```

## Common Errors

- `File not found` — the path does not exist.
- `Path traversal blocked` — path contains `..` or escapes BusinessDocs/.
- `Missing required parameter: file` — the file argument was not provided.
