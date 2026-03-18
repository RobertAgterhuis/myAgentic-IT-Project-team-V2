---
title: Commands API
parent: API Reference
nav_order: 4
description: Queue and retrieve orchestrator commands.
---

# Commands API

**Module:** `routes/commands.ts`
**Data source:** `BusinessDocs/session/command-queue.json`
**Auth required:** No

---

## POST /api/command

Queue a command for the agent pipeline.

**Request body:**

| Field         | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `command`     | string | Yes      | Command string (1–100 chars)         |
| `project`     | string | No       | Project name (max 200 chars)         |
| `description` | string | No       | Command description (max 2000 chars) |
| `scope`       | string | No       | Scope context (max 200 chars)        |
| `brief`       | string | No       | Project brief content (max 200 KB)   |

**Supported commands:** `CREATE`, `AUDIT`, `FEATURE`, `REEVALUATE`,
`SCOPE CHANGE`, `HOTFIX`, `CONTINUE`, `REFRESH ONBOARDING`, and partial/combo
variants.

**Example request:**

```bash
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{"command": "CREATE MyProject", "description": "New SaaS platform"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "clipboard_text": "CREATE MyProject",
  "brief_saved": false,
  "entry": {
    "command": "CREATE MyProject",
    "project": "MyProject",
    "description": "New SaaS platform",
    "requested_at": "2026-03-18T12:00:00Z",
    "status": "PENDING"
  }
}
```

**Error responses:**

| Status | Code             | Condition                         |
| ------ | ---------------- | --------------------------------- |
| 400    | VALIDATION_ERROR | Missing or invalid command string |
| 400    | UNKNOWN_COMMAND  | Command not recognized            |

---

## GET /api/command

Get the current command and full queue history.

**Response — 200 OK:**

```json
{
  "command": {
    "command": "CREATE MyProject",
    "project": "MyProject",
    "requested_at": "2026-03-18T12:00:00Z",
    "status": "PENDING"
  },
  "queue": [
    {
      "command": "CREATE MyProject",
      "project": "MyProject",
      "requested_at": "2026-03-18T12:00:00Z",
      "status": "PENDING"
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/command
```
