---
title: Dashboard & Cockpit API
parent: API Reference
nav_order: 13
description: Dashboard health, metrics, activity, and operational cockpit.
---

# Dashboard & Cockpit API

**Modules:** `routes/dashboard.ts`, `routes/cockpit.ts`
**Auth required:** No

---

## Dashboard

### GET /api/dashboard/health

Get project health indicators for the Dashboard UI.

> **Note:** This is _not_ a server health endpoint. For server health, use
> `GET /api/health` or `GET /health`.

**Response — 200 OK:**

```json
{
  "ok": true,
  "code_quality": {
    "score": 92,
    "lint_errors": 0,
    "lint_warnings": 3
  },
  "test_coverage": {
    "statements": 87.4,
    "branches": 76.5,
    "functions": 92.2,
    "lines": 88.9
  },
  "build_status": "passing",
  "deployment_status": "healthy"
}
```

---

### GET /api/dashboard/metrics

Get key operational metrics for the dashboard.

**Response — 200 OK:**

```json
{
  "ok": true,
  "http_requests": 1500,
  "error_rate": 1.3,
  "avg_response_time_ms": 12
}
```

---

### GET /api/dashboard/activity

Get the recent activity timeline.

**Response — 200 OK:**

```json
{
  "ok": true,
  "activity": [
    {
      "type": "milestone",
      "user": "pipeline",
      "action": "completed",
      "details": "FEAT-02 Enterprise UI Redesign",
      "timestamp": "2026-03-18T10:00:00Z"
    },
    {
      "type": "commit",
      "user": "jane@example.com",
      "action": "pushed",
      "details": "feat(M30): migrate to Fastify",
      "timestamp": "2026-03-18T09:30:00Z"
    }
  ]
}
```

---

### GET /api/dashboard/stats

Get quick statistics for the dashboard header.

**Response — 200 OK:**

```json
{
  "ok": true,
  "active_files": 245,
  "team_members": 3,
  "sprint_progress": 72,
  "github_stars": 12
}
```

---

## Operational Cockpit

### GET /api/v1/cockpit/health

Get confidence scores for session health, sprint readiness, and agent
confidence.

**Response — 200 OK:**

```json
{
  "ok": true,
  "session_health": {
    "score": 85,
    "factors": [
      { "name": "phase_progress", "weight": 0.4, "value": 90 },
      { "name": "open_decisions", "weight": 0.3, "value": 75 }
    ]
  },
  "sprint_readiness": {
    "score": 78,
    "factors": []
  },
  "agent_confidence": {
    "score": 92,
    "factors": []
  }
}
```

---

### GET /api/v1/cockpit/dependencies

Get the dependency graph showing decision → gate → sprint relationships.

**Response — 200 OK:**

```json
{
  "ok": true,
  "nodes": [
    { "id": "sprint-1", "type": "sprint", "label": "Sprint 1" },
    { "id": "gate-phase2", "type": "gate", "label": "Phase 2 Gate" }
  ],
  "edges": [{ "from": "gate-phase2", "to": "sprint-1", "type": "blocks" }],
  "critical_path": ["gate-phase2", "sprint-1"]
}
```

---

### GET /api/v1/cockpit/root-cause

Get root-cause analysis items from the audit log.

**Query parameters:**

| Parameter    | Type   | Required | Description          |
| ------------ | ------ | -------- | -------------------- |
| `session_id` | string | No       | Filter by session ID |

**Response — 200 OK:**

```json
{
  "ok": true,
  "items": [
    {
      "type": "gate_failure",
      "description": "Phase 2 gate failed: missing security review",
      "cause_chain": [
        "Missing deliverable: security-review.md",
        "Agent 05-software-architect did not produce output"
      ],
      "actionable_links": []
    }
  ]
}
```
