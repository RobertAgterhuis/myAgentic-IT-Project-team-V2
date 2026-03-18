---
title: Sessions & Progress API
parent: API Reference
nav_order: 7
description: Session state, progress tracking, and session history.
---

# Sessions & Progress API

**Modules:** `routes/misc.ts`, `routes/progress.ts`, `routes/sessions.ts`
**Auth required:** No

---

## GET /api/session

Get the current session state.

**Module:** `routes/misc.ts`
**Data source:** `BusinessDocs/session/session-state.json`

**Response — 200 OK:**

```json
{
  "session": {
    "session_id": "sess-20260318-abc123",
    "cycle_type": "FULL_CREATE",
    "status": "PHASE-2-IN-PROGRESS",
    "current_phase": "PHASE-2",
    "current_agent": "05-software-architect",
    "current_step": "Architecture Assessment",
    "initiated_at": "2026-03-10T09:00:00Z",
    "last_updated": "2026-03-18T12:00:00Z",
    "completed_phases": ["ONBOARDING", "PHASE-1"],
    "completed_agents": ["01-onboarding-agent", "02-stakeholder-analyst"],
    "phase_outputs": {},
    "sprint_backlog": {}
  }
}
```

Returns `{ "session": null }` when no session state file exists.

---

## GET /api/progress

Get pipeline progress across all phase groups.

**Module:** `routes/progress.ts`

**Response — 200 OK:**

```json
{
  "active": true,
  "phases": [
    {
      "key": "ONBOARDING",
      "label": "Onboarding",
      "status": "COMPLETE",
      "agents": [
        {
          "id": "01-onboarding-agent",
          "label": "Onboarding Agent",
          "status": "COMPLETE"
        }
      ]
    },
    {
      "key": "PHASE-2",
      "label": "Architecture & Design",
      "status": "IN_PROGRESS",
      "agents": [
        {
          "id": "05-software-architect",
          "label": "Software Architect",
          "status": "ACTIVE"
        },
        {
          "id": "06-data-architect",
          "label": "Data Architect",
          "status": "PENDING"
        }
      ]
    }
  ],
  "session": {
    "session_id": "sess-20260318-abc123",
    "status": "PHASE-2-IN-PROGRESS"
  },
  "sprints": {},
  "command": null
}
```

**Example:**

```bash
curl http://localhost:3000/api/progress
```

---

## GET /api/sessions

List all tracked sessions.

**Module:** `routes/sessions.ts`

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 3,
  "sessions": [
    {
      "id": "sess-20260318-abc123",
      "status": "PHASE-2-IN-PROGRESS",
      "cycle_type": "FULL_CREATE",
      "initiated_at": "2026-03-10T09:00:00Z",
      "last_updated": "2026-03-18T12:00:00Z"
    }
  ]
}
```

---

## GET /api/sessions/:id

Get detailed session information.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Session ID  |

**Response — 200 OK:**

```json
{
  "ok": true,
  "session": {
    "id": "sess-20260318-abc123",
    "status": "PHASE-2-IN-PROGRESS",
    "cycle_type": "FULL_CREATE"
  },
  "agents": [{ "id": "01-onboarding-agent", "status": "COMPLETE" }],
  "timeline": [
    {
      "event": "PHASE_START",
      "phase": "PHASE-2",
      "timestamp": "2026-03-15T10:00:00Z"
    }
  ]
}
```

**Error responses:**

| Status | Code      | Condition         |
| ------ | --------- | ----------------- |
| 404    | NOT_FOUND | Session not found |

---

## GET /api/sessions/:id/timeline

Get the event timeline for a specific session.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Session ID  |

**Response — 200 OK:**

```json
{
  "ok": true,
  "session_id": "sess-20260318-abc123",
  "count": 15,
  "timeline": [
    {
      "event": "SESSION_START",
      "timestamp": "2026-03-10T09:00:00Z",
      "details": {}
    },
    {
      "event": "AGENT_COMPLETE",
      "agent": "01-onboarding-agent",
      "timestamp": "2026-03-10T10:30:00Z"
    }
  ]
}
```

**Error responses:**

| Status | Code      | Condition         |
| ------ | --------- | ----------------- |
| 404    | NOT_FOUND | Session not found |
