# MCP Tool: list_questionnaires

## Description

Discover all questionnaire files under BusinessDocs/ and return summary
metadata including question counts and answer progress.

## Input

No parameters required.

## Output

```json
{
  "questionnaires": [
    {
      "file": "Phase1-Business/Questionnaires/business-analyst-questionnaire.md",
      "phase": "Phase 1",
      "title": "Business Analyst",
      "total": 15,
      "answered": 8,
      "unanswered": 5,
      "deferred": 2
    }
  ]
}
```

## Usage Example

```
Tool: list_questionnaires
Arguments: {}
```

Use this to see which questionnaires exist and their completion status before
deciding which one to work on via `get_questionnaire`.

## Common Errors

- Returns empty array when no BusinessDocs/ directory exists.
- Files that fail to parse are silently skipped.
