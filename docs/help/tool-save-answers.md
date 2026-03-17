# MCP Tool: save_answers

## Description

Save one or more answers to a questionnaire file. Each update targets a specific
question by its Q-ID. Uses file locking to prevent concurrent writes. Invalid
Q-IDs are skipped with warnings (lenient mode).

## Input

| Parameter | Type   | Required | Description                                 |
| --------- | ------ | -------- | ------------------------------------------- |
| `file`    | string | Yes      | Relative path to the questionnaire .md file |
| `updates` | array  | Yes      | Array of answer updates (max 200 per call)  |

Each update object:

| Field        | Type   | Required | Description                         |
| ------------ | ------ | -------- | ----------------------------------- |
| `questionId` | string | Yes      | Question ID in Q-XX-XXXX format     |
| `answer`     | string | Yes      | Answer text (max 50 000 characters) |
| `status`     | string | Yes      | ANSWERED, DEFERRED, or OPEN         |

## Output

```json
{
  "saved": true,
  "file": "Phase1-Business/Questionnaires/business-analyst-questionnaire.md",
  "applied": 2,
  "total": 2,
  "warnings": []
}
```

## Usage Example

```text
Tool: save_answers
Arguments: {
  "file": "Phase1-Business/Questionnaires/business-analyst-questionnaire.md",
  "updates": [
    {
      "questionId": "Q-01-0001",
      "answer": "The primary business problem is customer retention.",
      "status": "ANSWERED"
    },
    {
      "questionId": "Q-01-0003",
      "answer": "Deferred pending market research.",
      "status": "DEFERRED"
    }
  ]
}
```

## Common Errors

- `Missing required parameters: file and updates` — both are required.
- `Updates array must not be empty` — at least one update needed.
- `Too many updates` — maximum 200 per call.
- `Path traversal blocked` — file path contains `..` or escapes BusinessDocs/.
- Invalid Q-ID format results in `applied: 0` with a warning (not a hard error).
- Secret-like content (API keys, tokens) is automatically rejected.
