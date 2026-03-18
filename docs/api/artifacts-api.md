---
title: Artifacts API
parent: API Reference
nav_order: 11
description: Artifact browsing, statistics, and lineage tracking.
---

# Artifacts API

**Module:** `routes/artifacts.ts`
**Auth required:** No

---

## GET /api/v1/artifacts

List artifacts with optional filtering.

**Query parameters:**

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `stage`   | string | No       | Filter by SDLC stage    |
| `type`    | string | No       | Filter by artifact type |
| `status`  | string | No       | Filter by status        |

**Example:**

```bash
curl "http://localhost:3000/api/v1/artifacts?stage=PHASE-2&type=document"
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 15,
  "artifacts": [
    {
      "id": "art-001",
      "name": "Architecture Decision Record",
      "type": "document",
      "stage": "PHASE-2",
      "status": "approved",
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

## GET /api/v1/artifacts/stats

Get aggregate statistics across all artifacts.

**Response — 200 OK:**

```json
{
  "ok": true,
  "stats": {
    "total": 45,
    "by_stage": { "PHASE-1": 10, "PHASE-2": 20, "PHASE-3": 15 },
    "by_type": { "document": 30, "diagram": 10, "code": 5 },
    "by_status": { "approved": 35, "draft": 8, "rejected": 2 }
  }
}
```

---

## GET /api/v1/artifacts/:id

Get a single artifact's details.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Artifact ID |

**Response — 200 OK:**

```json
{
  "ok": true,
  "artifact": {
    "id": "art-001",
    "name": "Architecture Decision Record",
    "type": "document",
    "stage": "PHASE-2",
    "status": "approved",
    "content": "...",
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-16T14:00:00Z"
  }
}
```

**Error responses:**

| Status | Code      | Condition          |
| ------ | --------- | ------------------ |
| 404    | NOT_FOUND | Artifact not found |

---

## GET /api/v1/artifacts/:id/lineage

Get the dependency and lineage graph for an artifact.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Artifact ID |

**Response — 200 OK:**

```json
{
  "ok": true,
  "artifact_id": "art-001",
  "lineage": {
    "parents": [],
    "children": ["art-005", "art-006"],
    "related": ["art-003"]
  }
}
```
