---
title: Questionnaires API
parent: API Reference
nav_order: 2
description: List questionnaires and save answers.
---

# Questionnaires API

**Module:** `routes/questionnaires.ts`
**Data source:** Markdown files in `BusinessDocs/Phase[N]-*/Questionnaires/*.md`
**Auth required:** No

---

## GET /api/questionnaires

List all questionnaires with their questions and completion statistics.

**Response — 200 OK:**

```json
{
  "questionnaires": [
    {
      "file": "Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md",
      "agent": "Software Architect",
      "phase": "Phase 2",
      "questions": [
        {
          "id": "Q-05-001",
          "required": true,
          "question": "What is the target deployment environment?",
          "answer": "",
          "status": "OPEN"
        },
        {
          "id": "Q-05-002",
          "required": false,
          "question": "What are the latency requirements?",
          "answer": "Sub-100ms for API calls",
          "status": "ANSWERED"
        }
      ]
    }
  ],
  "corruptionWarnings": []
}
```

**Fields:**

| Field                     | Type    | Description                                  |
| ------------------------- | ------- | -------------------------------------------- |
| `questionnaires`          | array   | All parsed questionnaires                    |
| `[].file`                 | string  | Relative path to the Markdown file           |
| `[].agent`                | string  | Agent name extracted from the file header    |
| `[].phase`                | string  | Phase grouping (Phase 1, Phase 2, etc.)      |
| `[].questions`            | array   | All questions with answers and statuses      |
| `[].questions[].id`       | string  | Question identifier (e.g. `Q-05-001`)        |
| `[].questions[].required` | boolean | Whether the question is required             |
| `[].questions[].status`   | string  | `OPEN`, `ANSWERED`, `SKIPPED`, or `DEFERRED` |
| `corruptionWarnings`      | array   | Parse warnings for malformed files (if any)  |

**Example:**

```bash
curl http://localhost:3000/api/questionnaires
```

---

## POST /api/save

Save answers to a questionnaire.

**Request body:**

| Field                  | Type   | Required | Description                                        |
| ---------------------- | ------ | -------- | -------------------------------------------------- |
| `file`                 | string | Yes      | Relative path to the questionnaire (max 500 chars) |
| `updates`              | array  | Yes      | Array of answer updates (1–200 items)              |
| `updates[].questionId` | string | Yes      | Question ID (e.g. `Q-05-001`)                      |
| `updates[].answer`     | string | No       | The answer text                                    |
| `updates[].status`     | string | No       | `OPEN`, `ANSWERED`, or `DEFERRED`                  |

**Example request:**

```bash
curl -X POST http://localhost:3000/api/save \
  -H "Content-Type: application/json" \
  -d '{
    "file": "Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md",
    "updates": [
      {
        "questionId": "Q-05-001",
        "answer": "Azure Kubernetes Service (AKS) with multi-region failover",
        "status": "ANSWERED"
      }
    ]
  }'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "updated": 1,
  "warnings": []
}
```

**Response with secret warnings:**

```json
{
  "ok": true,
  "updated": 1,
  "warnings": ["Detected possible AWS Access Key in answer for Q-05-003"]
}
```

**Error responses:**

| Status | Code             | Condition                         |
| ------ | ---------------- | --------------------------------- |
| 400    | VALIDATION_ERROR | Missing/invalid fields            |
| 400    | FILE_NOT_FOUND   | Questionnaire file does not exist |
| 400    | PATH_TRAVERSAL   | Path traversal attempt detected   |

**Security notes:**

- File paths are validated via `safePath()` to block `..` traversal
- Answer text is scanned by `detectSecrets()` — warnings returned but save not blocked
- Markdown injection characters are neutralized via `sanitizeMarkdown()`
- Q-ID patterns in answers are neutralized via `sanitizeQID()`
- Mutations are logged to the audit trail
- SSE `questionnaire_update` event is broadcast after save
