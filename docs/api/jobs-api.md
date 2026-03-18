---
title: Jobs API
parent: API Reference
nav_order: 14
description: Background job queue management.
---

# Jobs API

**Module:** `routes/jobs.ts`
**Auth required:** No

---

## GET /api/jobs

List background jobs with optional filtering.

**Query parameters:**

| Parameter | Type   | Required | Description                                              |
| --------- | ------ | -------- | -------------------------------------------------------- |
| `status`  | string | No       | Filter by status (e.g. `running`, `completed`, `failed`) |
| `type`    | string | No       | Filter by job type                                       |
| `limit`   | string | No       | Maximum number of results                                |

**Example:**

```bash
curl "http://localhost:3000/api/jobs?status=running&limit=10"
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "total": 5,
  "jobs": [
    {
      "id": "job-001",
      "type": "gate-validation",
      "status": "running",
      "progress": 60,
      "created_at": "2026-03-18T11:00:00Z",
      "started_at": "2026-03-18T11:00:05Z"
    }
  ]
}
```

---

## GET /api/jobs/:id

Get status and details for a single job.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Job ID      |

**Response — 200 OK:**

```json
{
  "ok": true,
  "job": {
    "id": "job-001",
    "type": "gate-validation",
    "status": "running",
    "progress": 60,
    "created_at": "2026-03-18T11:00:00Z",
    "started_at": "2026-03-18T11:00:05Z",
    "result": null
  }
}
```

**Error responses:**

| Status | Code      | Condition     |
| ------ | --------- | ------------- |
| 404    | NOT_FOUND | Job not found |

---

## POST /api/jobs/cancel

Cancel a running or queued job.

**Request body:**

| Field    | Type   | Required | Description      |
| -------- | ------ | -------- | ---------------- |
| `job_id` | string | Yes      | Job ID to cancel |

**Example:**

```bash
curl -X POST http://localhost:3000/api/jobs/cancel \
  -H "Content-Type: application/json" \
  -d '{"job_id": "job-001"}'
```

**Response — 200 OK:**

```json
{ "ok": true, "message": "Job job-001 cancelled" }
```
