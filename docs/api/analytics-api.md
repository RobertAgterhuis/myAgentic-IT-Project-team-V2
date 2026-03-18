---
title: Analytics & Metrics API
parent: API Reference
nav_order: 9
description: Event analytics, trend data, agent stats, and metrics dashboards.
---

# Analytics & Metrics API

**Modules:** `routes/misc.ts` (legacy analytics), `routes/analytics.ts` (v1
analytics), `routes/metrics-dashboard.ts`
**Auth required:** No

---

## Legacy Analytics (misc.ts)

### POST /api/analytics

Submit UI analytics events.

**Request body:**

| Field                 | Type   | Required | Description                                     |
| --------------------- | ------ | -------- | ----------------------------------------------- |
| `events`              | array  | Yes      | Array of 1–100 event objects                    |
| `events[].event`      | string | Yes      | Event type (see valid types below)              |
| `events[].properties` | object | No       | Event properties (arbitrary key-value)          |
| `events[].timestamp`  | string | No       | ISO 8601 timestamp (server-assigned if omitted) |

**Valid event types:** `page_view`, `tab_switch`, `command_launch`,
`questionnaire_save`, `decision_update`, `error_displayed`, `feature_usage`,
`session_start`, `session_end`

**Example:**

```bash
curl -X POST http://localhost:3000/api/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event": "page_view",
        "properties": {"page": "questionnaires"},
        "timestamp": "2026-03-18T12:00:00Z"
      },
      {
        "event": "tab_switch",
        "properties": {"from": "questionnaires", "to": "decisions"}
      }
    ]
  }'
```

**Response — 200 OK:**

```json
{ "ok": true, "accepted": 2, "rejected": 0 }
```

---

### GET /api/analytics

Get recorded analytics events with pagination.

**Query parameters:**

| Parameter | Type   | Default | Description              |
| --------- | ------ | ------- | ------------------------ |
| `limit`   | string | —       | Maximum events to return |
| `offset`  | string | —       | Offset for pagination    |

**Response — 200 OK:**

```json
{
  "events": [
    {
      "event": "page_view",
      "properties": { "page": "questionnaires" },
      "timestamp": "2026-03-18T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## v1 Analytics (analytics.ts)

### GET /api/v1/analytics/trends

Get time-series trend data including velocity curves and DORA metrics.

**Response — 200 OK:**

```json
{
  "ok": true,
  "data": {
    "velocity": [],
    "lead_time": [],
    "deploy_frequency": [],
    "failure_rate": [],
    "mttr": []
  }
}
```

---

### GET /api/v1/analytics/agents

Get agent performance statistics.

**Response — 200 OK:**

```json
{
  "ok": true,
  "data": [],
  "count": 0
}
```

---

### GET /api/v1/analytics/metrics

List all available metric series.

**Response — 200 OK:**

```json
{
  "ok": true,
  "data": [
    {
      "name": "response_time_p95",
      "unit": "ms",
      "data_point_count": 1024
    }
  ],
  "count": 5,
  "last_updated": "2026-03-18T12:00:00Z"
}
```

---

### GET /api/v1/analytics/metrics/:name

Query a specific metric series by name with optional date range.

**Path parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| `name`    | string | Metric series name |

**Query parameters:**

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `from`    | string | No       | Start date (ISO 8601) |
| `to`      | string | No       | End date (ISO 8601)   |

**Example:**

```bash
curl "http://localhost:3000/api/v1/analytics/metrics/response_time_p95?from=2026-03-01&to=2026-03-18"
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "data": {
    "name": "response_time_p95",
    "unit": "ms",
    "data_points": [],
    "total_count": 1024,
    "filtered_count": 200
  }
}
```

**Error responses:**

| Status | Code      | Condition             |
| ------ | --------- | --------------------- |
| 404    | NOT_FOUND | Metric name not found |

---

## Metrics Dashboard

### GET /api/metrics/dashboard

Unified metrics and velocity dashboard.

**Response — 200 OK:**

```json
{
  "ok": true,
  "velocity": {
    "trends": [],
    "rolling_average": 0
  },
  "quality": {
    "coverage": 87.4,
    "lint_errors": 0,
    "test_pass_rate": 100
  },
  "sprint_health": {
    "status": "GREEN",
    "score": 85,
    "factors": []
  }
}
```

---

## Server Metrics

### GET /api/metrics

Get server performance metrics.

**Module:** `routes/misc.ts`

**Response — 200 OK:**

```json
{
  "uptime_seconds": 3600,
  "request_count": 150,
  "error_count": 2,
  "error_rate": 0.013,
  "response_time_p50": 5,
  "response_time_p95": 25,
  "response_time_p99": 50,
  "sse_connections": 1,
  "cache_hit_ratio": 0.85,
  "per_endpoint": {
    "GET /api/health": { "count": 50, "avg_ms": 2 }
  }
}
```

---

### POST /api/metrics/flush

Flush accumulated metrics to disk.

**Module:** `routes/misc.ts`

**Response — 200 OK:**

```json
{ "ok": true, "flushed_at": "2026-03-18T12:00:00Z" }
```
