---
title: Decisions API
parent: API Reference
nav_order: 3
description: Decision management — create, answer, decide, defer, and manage categories.
---

# Decisions API

**Module:** `routes/decisions.ts`
**Data source:** `docs/decisions.md` and `docs/decisions/*.md` (category files)
**Auth required:** No

---

## GET /api/decisions

List all decisions grouped by status.

**Response — 200 OK:**

```json
{
  "open": [
    {
      "id": "DEC-R2-010",
      "priority": "HIGH",
      "scope": "Phase 2",
      "text": "Which database should we use?",
      "notes": "",
      "date": "2026-03-10"
    }
  ],
  "decided": [
    {
      "id": "DEC-R2-001",
      "priority": "HIGH",
      "scope": "Phase 2",
      "text": "Use PostgreSQL for primary data store",
      "notes": "Selected for JSONB support and managed service availability",
      "date": "2026-03-05"
    }
  ],
  "deferred": []
}
```

**Fields:**

| Field         | Type   | Description                                 |
| ------------- | ------ | ------------------------------------------- |
| `open`        | array  | Questions awaiting answers                  |
| `decided`     | array  | Finalized decisions                         |
| `deferred`    | array  | Items deferred for later                    |
| `[].id`       | string | Unique decision ID (e.g. `DEC-R2-010`)      |
| `[].priority` | string | `HIGH`, `MEDIUM`, or `LOW`                  |
| `[].scope`    | string | Scope context (max 200 chars)               |
| `[].text`     | string | Decision text or question (max 2000 chars)  |
| `[].notes`    | string | Additional notes or answer (max 2000 chars) |
| `[].date`     | string | Date of last modification                   |

---

## POST /api/decisions

Create or mutate a decision. The `action` field determines the operation.

**Request body (common):**

| Field      | Type   | Required      | Description                               |
| ---------- | ------ | ------------- | ----------------------------------------- |
| `action`   | string | Yes           | Operation to perform (see below)          |
| `id`       | string | Varies        | Decision ID for mutations                 |
| `type`     | string | Create        | `OPEN_QUESTION` or `OPERATIONAL_DECISION` |
| `priority` | string | Create        | `HIGH`, `MEDIUM`, or `LOW`                |
| `scope`    | string | Create        | Scope context (max 200 chars)             |
| `text`     | string | Create        | Decision text (max 2000 chars)            |
| `notes`    | string | No            | Additional notes (max 2000 chars)         |
| `answer`   | string | Answer/Decide | The answer text (max 2000 chars)          |
| `reason`   | string | Defer         | Deferral reason (max 2000 chars)          |

### Action: `create`

Create a new open question or operational decision.

```bash
curl -X POST http://localhost:3000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "type": "OPEN_QUESTION",
    "priority": "HIGH",
    "scope": "Phase 2",
    "text": "Which database should we use?"
  }'
```

**Response — 200 OK:**

```json
{ "ok": true, "id": "DEC-R2-011" }
```

### Action: `answer`

Provide an answer to an open question.

```bash
curl -X POST http://localhost:3000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "answer",
    "id": "DEC-R2-010",
    "answer": "PostgreSQL — excellent JSONB support"
  }'
```

**Response — 200 OK:**

```json
{ "ok": true, "id": "DEC-R2-010" }
```

### Action: `decide`

Finalize an answered question as a decided item.

```bash
curl -X POST http://localhost:3000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "decide",
    "id": "DEC-R2-010",
    "answer": "PostgreSQL — final decision"
  }'
```

### Action: `defer`

Defer a decision for later consideration.

```bash
curl -X POST http://localhost:3000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "defer",
    "id": "DEC-R2-010",
    "reason": "Need input from DBA team"
  }'
```

### Other actions

Additional supported actions: `expire`, `reopen`, `edit`.

**Error responses:**

| Status | Code             | Condition                 |
| ------ | ---------------- | ------------------------- |
| 400    | VALIDATION_ERROR | Missing or invalid fields |
| 400    | INVALID_ACTION   | Unknown action value      |
| 404    | NOT_FOUND        | Decision ID not found     |

---

## POST /api/decisions/activate-category

Activate a decision category file.

**Request body:**

| Field  | Type   | Required | Description                                           |
| ------ | ------ | -------- | ----------------------------------------------------- |
| `file` | string | Yes      | Category filename (e.g. `database.md`, max 100 chars) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/decisions/activate-category \
  -H "Content-Type: application/json" \
  -d '{"file": "database.md"}'
```

**Response — 200 OK:**

```json
{ "ok": true, "action": "activated", "name": "database" }
```

---

## POST /api/decisions/promote-lesson

Promote a lesson-learned entry to a decision record.

**Request body:**

| Field      | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| `lessonId` | string | Yes      | Lesson ID to promote |
| `priority` | string | No       | Priority override    |
| `scope`    | string | No       | Scope override       |

**Example:**

```bash
curl -X POST http://localhost:3000/api/decisions/promote-lesson \
  -H "Content-Type: application/json" \
  -d '{"lessonId": "LL-001", "priority": "HIGH"}'
```

**Response — 200 OK:**

```json
{ "ok": true, "id": "DEC-R2-012" }
```
