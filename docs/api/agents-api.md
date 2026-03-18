---
title: Agents API
parent: API Reference
nav_order: 10
description: Agent metadata and execution status.
---

# Agents API

**Module:** `routes/agents.ts`
**Auth required:** No

---

## GET /api/agents

List all active agents with their current status.

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 12,
  "agents": [
    {
      "id": "05-software-architect",
      "label": "Software Architect",
      "phase": "PHASE-2",
      "status": "COMPLETE",
      "started_at": "2026-03-12T09:00:00Z",
      "completed_at": "2026-03-13T17:00:00Z"
    },
    {
      "id": "06-data-architect",
      "label": "Data Architect",
      "phase": "PHASE-2",
      "status": "ACTIVE"
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/agents
```

---

## GET /api/agents/:id

Get detailed information for a single agent, including prompt, outputs, and
execution history.

**Path parameters:**

| Parameter | Type   | Description                             |
| --------- | ------ | --------------------------------------- |
| `id`      | string | Agent ID (e.g. `05-software-architect`) |

**Response — 200 OK:**

```json
{
  "ok": true,
  "agent": {
    "id": "05-software-architect",
    "label": "Software Architect",
    "phase": "PHASE-2",
    "status": "COMPLETE",
    "prompt": "...",
    "outputs": [],
    "history": []
  }
}
```

**Error responses:**

| Status | Code      | Condition          |
| ------ | --------- | ------------------ |
| 404    | NOT_FOUND | Agent ID not found |
