# Milestones REST API Reference

**Module**: `routes/milestones.js`  
**Base URI**: `http://127.0.0.1:3000/api/milestones`  
**Data Storage**: `.github/data/milestones.json` (file-based)  
**Audit Trail**: `.github/docs/audit/*.jsonl` (event logs)  

---

## Overview

The Milestones API provides full CRUD (Create-Read-Update-Delete) operations for project milestone management. Implements soft-delete (archived flag) for audit trail preservation and supports filtering by status and date range.

**Implementation Timeline**:
- **SP-9.1**: POST (create), GET (list), GET (single — read-only until SP-9.2)
- **SP-9.2**: PUT (update)
- **SP-9.3**: PATCH (soft-delete/archive)

---

## Data Model

### Milestone Object

```json
{
  "id": "milestone-20260309-abc123",
  "name": "FEAT-02 Enterprise UI Redesign",
  "status": "complete",
  "progress": 100,
  "completion": "2026-03-09",
  "created_at": "2026-02-15T09:00:00Z",
  "updated_at": "2026-03-09T17:00:00Z",
  "archived": false
}
```

**Field Definitions**:

| Field | Type | Description | Validation |
|-------|------|-------------|-----------|
| `id` | string | Unique milestone identifier (auto-generated) | Format: `milestone-YYYYMMDD-RANDOMHEX` |
| `name` | string | Milestone display name | Required, 1-255 characters, unique (case-insensitive) |
| `status` | string | Milestone state | One of: `not started`, `in progress`, `complete`, `blocked` |
| `progress` | number | Completion percentage | Required, integer 0-100 |
| `completion` | string | Expected completion date | ISO 8601 format: `YYYY-MM-DD` |
| `created_at` | string | Timestamp of creation | ISO 8601 UTC datetime |
| `updated_at` | string | Timestamp of last modification | ISO 8601 UTC datetime |
| `archived` | boolean | Soft-delete flag | `false` (active) or `true` (archived/deleted) |

---

## Endpoints

### 1. POST /api/milestones
**Create a new milestone (SP-9.1)**

**Request**:
```http
POST /api/milestones HTTP/1.1
Content-Type: application/json

{
  "name": "FEAT-03 Mobile Optimization",
  "status": "not started",
  "progress": 0,
  "completion": "2026-04-15"
}
```

**Response — Success (201 Created)**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "ok": true,
  "data": {
    "id": "milestone-20260309-abc456",
    "name": "FEAT-03 Mobile Optimization",
    "status": "not started",
    "progress": 0,
    "completion": "2026-04-15",
    "created_at": "2026-03-09T15:30:00Z",
    "updated_at": "2026-03-09T15:30:00Z",
    "archived": false
  },
  "message": "Milestone \"FEAT-03 Mobile Optimization\" created successfully",
  "timestamp": "2026-03-09T15:30:00Z"
}
```

**Response — Validation Error (400 Bad Request)**:
```json
{
  "ok": false,
  "error": "Validation failed",
  "details": [
    "name: required string field",
    "progress: must be between 0 and 100"
  ]
}
```

**Response — Duplicate Name (409 Conflict)**:
```json
{
  "ok": false,
  "error": "Milestone already exists",
  "details": ["Milestone with name \"FEAT-03 Mobile Optimization\" already exists"]
}
```

**Validation Rules**:
- `name`: Required, string, 1-255 characters, unique (case-insensitive)
- `status`: Required, one of: `not started`, `in progress`, `complete`, `blocked`
- `progress`: Required, integer 0-100
- `completion`: Required, ISO 8601 date format (YYYY-MM-DD)

**Side Effects**:
- Milestone ID auto-generated
- Timestamps auto-set to current UTC time
- Audit event: `milestone_created` logged with all field changes
- Entry written to `.github/data/milestones.json`

---

### 2. GET /api/milestones
**List all active milestones (or all if archived included)**

**Request**:
```http
GET /api/milestones HTTP/1.1
Accept: application/json
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_archived` | boolean | `false` | If `true`, include archived milestones in response |

**Response — Success (200 OK)**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "milestone-20260305-001",
      "name": "FEAT-01 Metrics Dashboard",
      "status": "complete",
      "progress": 100,
      "completion": "2026-03-05",
      "created_at": "2026-02-01T08:00:00Z",
      "updated_at": "2026-03-05T16:30:00Z",
      "archived": false
    },
    {
      "id": "milestone-20260309-002",
      "name": "FEAT-02 Enterprise UI Redesign",
      "status": "complete",
      "progress": 100,
      "completion": "2026-03-09",
      "created_at": "2026-02-15T09:00:00Z",
      "updated_at": "2026-03-09T17:00:00Z",
      "archived": false
    }
  ],
  "count": 2,
  "timestamp": "2026-03-09T15:35:00Z"
}
```

**Examples**:
```bash
# List active milestones only
curl -H "Accept: application/json" \
  http://127.0.0.1:3000/api/milestones

# List all milestones (including archived)
curl -H "Accept: application/json" \
  "http://127.0.0.1:3000/api/milestones?include_archived=true"
```

---

### 3. GET /api/milestones/:id
**Get a single milestone by ID**

**Request**:
```http
GET /api/milestones/milestone-20260309-002 HTTP/1.1
Accept: application/json
```

**Response — Success (200 OK)**:
```json
{
  "ok": true,
  "data": {
    "id": "milestone-20260309-002",
    "name": "FEAT-02 Enterprise UI Redesign",
    "status": "complete",
    "progress": 100,
    "completion": "2026-03-09",
    "created_at": "2026-02-15T09:00:00Z",
    "updated_at": "2026-03-09T17:00:00Z",
    "archived": false
  },
  "timestamp": "2026-03-09T15:35:00Z"
}
```

**Response — Not Found (404 Not Found)**:
```json
{
  "ok": false,
  "error": "Milestone not found",
  "details": ["Milestone with ID \"milestone-invalid\" does not exist"]
}
```

**Example**:
```bash
curl -H "Accept: application/json" \
  http://127.0.0.1:3000/api/milestones/milestone-20260309-002
```

---

### 4. PUT /api/milestones/:id
**Update milestone fields (SP-9.2 — Not yet implemented)**

**Status**: 501 Not Implemented (scaffold provided)  
**Expected in**: Sprint 9 Phase 2 (SP-9.2)

**Planned Features**:
- Partial updates (send only fields to change)
- Full field validation matching POST rules
- Immutable fields: `id`, `created_at` (cannot be changed)
- Auto-update: `updated_at` timestamp
- Audit event: `milestone_updated` with before/after values

---

### 5. PATCH /api/milestones/:id/archive
**Soft-delete milestone (mark as archived)**

**Status**: 501 Not Implemented (scaffold provided)  
**Expected in**: Sprint 9 Phase 3 (SP-9.3)

**Planned Features**:
- Mark milestone as `archived: true`
- Excludes from standard GET list (unless `?include_archived=true`)
- Preserves all data for audit/recovery
- Audit event: `milestone_archived` with timestamp
- Recovery: Clear archived flag to restore to active list

---

## Error Handling

All error responses follow this format:

```json
{
  "ok": false,
  "error": "Error category",
  "details": ["Specific error message 1", "Specific error message 2"],
  "timestamp": "2026-03-09T15:35:00Z"
}
```

**HTTP Status Codes**:

| Status | Meaning | Cause |
|--------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Invalid JSON, missing required field, validation error |
| 404 | Not Found | Milestone ID does not exist |
| 409 | Conflict | Duplicate milestone name |
| 500 | Server Error | Unexpected error (file I/O, parsing, etc.) |
| 501 | Not Implemented | Endpoint not yet implemented (SP-9.2, SP-9.3) |

---

## Audit Trail

Every milestone change is logged to `.github/docs/audit/milestones.jsonl` for compliance and audit purposes.

**Audit Entry Format**:

```json
{
  "id": "audit-20260309-123456",
  "event_type": "milestone_created",
  "milestone_id": "milestone-20260309-002",
  "timestamp": "2026-03-09T15:30:00Z",
  "changes": {
    "name": { "before": null, "after": "FEAT-03 Mobile Optimization" },
    "status": { "before": null, "after": "not started" },
    "progress": { "before": null, "after": 0 },
    "completion": { "before": null, "after": "2026-04-15" }
  },
  "user": "system"
}
```

**Event Types**:
- `milestone_created` — New milestone created (SP-9.1)
- `milestone_updated` — Existing milestone modified (SP-9.2)
- `milestone_archived` — Milestone soft-deleted (SP-9.3)

---

## Usage Examples

### Create a Milestone
```bash
curl -X POST http://127.0.0.1:3000/api/milestones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FEAT-03 Mobile Optimization",
    "status": "not started",
    "progress": 0,
    "completion": "2026-04-15"
  }'
```

### List All Active Milestones
```bash
curl -H "Accept: application/json" \
  http://127.0.0.1:3000/api/milestones
```

### Get a Specific Milestone
```bash
curl -H "Accept: application/json" \
  http://127.0.0.1:3000/api/milestones/milestone-20260309-002
```

### List Including Archived Milestones (Future)
```bash
curl -H "Accept: application/json" \
  "http://127.0.0.1:3000/api/milestones?include_archived=true"
```

### Update a Milestone (Future — SP-9.2)
```bash
curl -X PUT http://127.0.0.1:3000/api/milestones/milestone-20260309-002 \
  -H "Content-Type: application/json" \
  -d '{"progress": 50}'
```

### Archive a Milestone (Future — SP-9.3)
```bash
curl -X PATCH http://127.0.0.1:3000/api/milestones/milestone-20260309-002/archive
```

---

## Limitations & Future Work

**Current (SP-9.1)**:
- File-based storage (JSON)
- No concurrency locking (last-write-wins)
- No user authentication/authorization
- No pagination for large milestone lists

**Planned (SP-9.2+)**:
- Database migration (SQLite or PostgreSQL)
- Optimistic locking for concurrent edits
- User authentication & audit trail user tracking
- Pagination & filtering (by status, date range, progress)
- Batch operations (update multiple milestones)
- Webhooks for milestone state changes

**Recommended (SP-10+)**:
- Full-text search across milestone names/descriptions
- Milestone templates for faster creation
- Integration with GitHub Issues & Projects
- Timeline/Gantt chart views
- Milestone dependencies & critical path analysis

---

## Implementation Notes

### SP-9.1 (Completed)
- POST /api/milestones (create)
- GET /api/milestones (list active)
- GET /api/milestones/:id (read single)
- Input validation (name, status, progress, completion)
- Duplicate name detection
- Audit trail logging
- Error handling with detailed messages

### SP-9.2 (Planned)
- PUT /api/milestones/:id (update with validation)
- Partial update support
- Field validation matching creation rules
- Preserve immutable fields (id, created_at)
- Audit trail with before/after values

### SP-9.3 (Planned)
- PATCH /api/milestones/:id/archive (soft-delete)
- Recovery via clearing archived flag
- Exclusion from default list

### SP-9.9 (Planned — Optional)
- GET /api/milestone-templates
- Predefined templates for common milestones
- Auto-fill form in create modal

---

**Last Updated**: 2026-03-09  
**Document Version**: 1.0  
**API Version**: 1.0  
**Sprint**: SP-9.1
