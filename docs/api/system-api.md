---
title: System API
parent: API Reference
nav_order: 15
description: Health checks, help topics, audit trail, SSE events, drift detection, and data export.
---

# System API

**Modules:** `routes/misc.ts`, `routes/drift.ts`
**Auth required:** No

---

## Health Checks

### GET /api/health

Readiness probe — confirms the server is ready to handle requests.

Used by Docker HEALTHCHECK and Playwright `webServer.url`.

**Response — 200 OK:**

```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600,
  "store_status": "healthy",
  "sse_connections": 1,
  "timestamp": "2026-03-18T12:00:00Z"
}
```

---

### GET /health

Lightweight liveness probe — confirms the process is running.

**Response — 200 OK:**

```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600,
  "store_status": "healthy",
  "storage_provider": "FileStore"
}
```

---

## Help

### GET /api/help

Get the help table of contents or a specific topic.

**Query parameters:**

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `topic`   | string | No       | Help topic slug (lowercase, hyphens, digits) |

**Example — table of contents:**

```bash
curl http://localhost:3000/api/help
```

**Response — 200 OK:**

```json
{
  "toc": [
    { "slug": "getting-started", "title": "Getting Started" },
    { "slug": "decisions-architecture", "title": "Decisions Architecture" },
    { "slug": "commands", "title": "Commands Reference" }
  ]
}
```

**Example — specific topic:**

```bash
curl "http://localhost:3000/api/help?topic=getting-started"
```

**Response — 200 OK:**

```json
{
  "slug": "getting-started",
  "title": "Getting Started",
  "content": "# Getting Started\n\nWelcome to the Agentic SDLC Platform..."
}
```

**Error responses:**

| Status | Code             | Condition                             |
| ------ | ---------------- | ------------------------------------- |
| 400    | VALIDATION_ERROR | Invalid slug (path traversal attempt) |
| 404    | NOT_FOUND        | Topic not found                       |

---

## Audit Trail

### GET /api/audit

Get mutation audit trail entries.

**Query parameters:**

| Parameter | Type   | Default | Description                  |
| --------- | ------ | ------- | ---------------------------- |
| `limit`   | string | `50`    | Number of entries (max 1000) |

**Example:**

```bash
curl "http://localhost:3000/api/audit?limit=10"
```

**Response — 200 OK:**

```json
{
  "entries": [
    {
      "timestamp": "2026-03-18T12:00:00Z",
      "operation": "UPDATE_ANSWER",
      "entity_type": "questionnaire",
      "entity_id": "Q-05-001",
      "user": "webapp",
      "summary": "Updated answer for Q-05-001 in 05-software-architect-questionnaire.md"
    },
    {
      "timestamp": "2026-03-18T11:30:00Z",
      "operation": "CREATE_DECISION",
      "entity_type": "decision",
      "entity_id": "DEC-R2-011",
      "user": "webapp",
      "summary": "Created open question DEC-R2-011"
    }
  ],
  "total": 42,
  "limit": 10
}
```

---

## Drift Detection

### GET /api/drift

Detect deviation from expected session state.

**Module:** `routes/drift.ts`

**Response — 200 OK:**

```json
{
  "ok": true,
  "report": {
    "drift_detected": true,
    "uncertainties": [],
    "insufficiencies": [
      {
        "area": "PHASE-2",
        "description": "3 required questionnaires unanswered",
        "severity": "high"
      }
    ],
    "markers": []
  }
}
```

---

## SSE Events

### GET /api/events

Server-Sent Events stream for real-time updates. Maximum 50 concurrent
connections.

**Event types:**

| Event                  | Description                  |
| ---------------------- | ---------------------------- |
| `questionnaire_update` | Questionnaire answer changed |
| `decision_update`      | Decision created/modified    |
| `command_queued`       | New command added to queue   |
| `reevaluate_trigger`   | Reevaluation triggered       |

**Example:**

```bash
curl -N http://localhost:3000/api/events
```

**Event stream format:**

```
event: questionnaire_update
data: {"file":"Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md"}

event: decision_update
data: {"id":"DEC-R2-011","action":"create"}

event: command_queued
data: {"command":"CREATE MyProject"}
```

---

## Reevaluate

### POST /api/reevaluate

Trigger a reevaluation of one or more scopes.

**Request body:**

| Field   | Type   | Required | Description                                                      |
| ------- | ------ | -------- | ---------------------------------------------------------------- |
| `scope` | string | No       | `ALL`, `BUSINESS`, `TECH`, `UX`, or `MARKETING` (default: `ALL`) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/reevaluate \
  -H "Content-Type: application/json" \
  -d '{"scope": "TECH"}'
```

**Response — 200 OK:**

```json
{ "ok": true, "scope": "TECH", "message": "Reevaluation triggered for TECH" }
```

---

## Export

### GET /api/export

Export the full project state as a single JSON object.

**Response — 200 OK:**

```json
{
  "exported_at": "2026-03-18T12:00:00Z",
  "session": {
    "session_id": "sess-20260318-abc123",
    "status": "PHASE-2-IN-PROGRESS"
  },
  "command_queue": [],
  "decisions": {
    "open": [],
    "decided": [],
    "deferred": []
  },
  "questionnaires": [],
  "phase_outputs": {}
}
```

Size limited to 10 MB.
