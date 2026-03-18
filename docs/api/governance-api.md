---
title: Governance API
parent: API Reference
nav_order: 8
description: Approval workflows and policy management.
---

# Governance API

**Modules:** `routes/approvals.ts`, `routes/policies.ts`
**Auth required:** No

---

## Approvals

### GET /api/v1/approvals

List all pending and completed approvals.

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 2,
  "approvals": [
    {
      "id": "appr-001",
      "entity_type": "gate",
      "entity_id": "PHASE-2-GATE",
      "status": "pending",
      "required_role": "admin",
      "created_at": "2026-03-18T10:00:00Z"
    }
  ]
}
```

---

### POST /api/v1/approvals/:id/approve

Approve a pending approval request.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Approval ID |

**Request body:**

| Field    | Type   | Required | Description                                |
| -------- | ------ | -------- | ------------------------------------------ |
| `reason` | string | No       | Approval reason (max 1000 chars)           |
| `user`   | string | No       | User performing the action (max 200 chars) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/v1/approvals/appr-001/approve \
  -H "Content-Type: application/json" \
  -d '{"reason": "All deliverables verified", "user": "jane@example.com"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "id": "appr-001",
  "status": "approved",
  "decided_by": "jane@example.com",
  "decided_at": "2026-03-18T12:00:00Z"
}
```

**Error responses:**

| Status | Code             | Condition             |
| ------ | ---------------- | --------------------- |
| 400    | VALIDATION_ERROR | Invalid input         |
| 404    | NOT_FOUND        | Approval ID not found |

---

### POST /api/v1/approvals/:id/reject

Reject a pending approval request.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Approval ID |

**Request body:**

| Field    | Type   | Required | Description                                |
| -------- | ------ | -------- | ------------------------------------------ |
| `reason` | string | Yes      | Rejection reason (1–1000 chars)            |
| `user`   | string | No       | User performing the action (max 200 chars) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/v1/approvals/appr-001/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "Missing security review", "user": "admin@example.com"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "id": "appr-001",
  "status": "rejected",
  "decided_by": "admin@example.com",
  "decided_at": "2026-03-18T12:00:00Z"
}
```

---

### GET /api/v1/approvals/:id/detail

Get approval detail with full context.

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Approval ID |

**Response — 200 OK:**

```json
{
  "ok": true,
  "approval": {
    "id": "appr-001",
    "entity_type": "gate",
    "entity_id": "PHASE-2-GATE",
    "status": "pending",
    "stage": "PHASE-2",
    "required_role": "admin",
    "context": {}
  }
}
```

---

### GET /api/v1/approvals/history

Get historical approval decisions.

**Response — 200 OK:**

```json
{
  "ok": true,
  "history": []
}
```

---

## Policies

### GET /api/v1/policies

List all governance policies.

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 5,
  "policies": [
    {
      "id": "pol-001",
      "name": "Gate Deliverables Check",
      "context_type": "gate",
      "scope": "global",
      "enabled": true,
      "severity": "blocking"
    }
  ]
}
```

---

### POST /api/v1/policies/evaluate

Evaluate policies against a given context.

**Request body:**

| Field          | Type   | Required | Description                                       |
| -------------- | ------ | -------- | ------------------------------------------------- |
| `context_type` | string | Yes      | `gate`, `pr`, `deploy`, `artifact`, or `schedule` |
| `scope`        | string | Yes      | `global`, `org`, `team`, `repo`, or `sprint`      |
| `checks`       | object | No       | Additional check data to evaluate                 |

**Example:**

```bash
curl -X POST http://localhost:3000/api/v1/policies/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context_type": "gate",
    "scope": "sprint",
    "checks": {"coverage": 85, "tests_passing": true}
  }'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "result": {
    "verdict": "PASS",
    "summary": {
      "total": 3,
      "blocking_failures": 0,
      "warnings": 1
    },
    "evaluations": []
  }
}
```

---

### POST /api/v1/policies/exceptions

Create a policy exception (temporary override).

**Request body:**

| Field            | Type   | Required | Description                    |
| ---------------- | ------ | -------- | ------------------------------ |
| `policy_id`      | string | Yes      | Policy to create exception for |
| `reason`         | string | Yes      | Justification for exception    |
| `approved_by`    | string | Yes      | Person approving the exception |
| `expires`        | string | No       | Expiration date (ISO 8601)     |
| `scope_override` | string | No       | Scope to restrict exception to |

**Example:**

```bash
curl -X POST http://localhost:3000/api/v1/policies/exceptions \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "pol-001",
    "reason": "Hotfix deployment - coverage temporarily below threshold",
    "approved_by": "admin@example.com",
    "expires": "2026-03-25T00:00:00Z"
  }'
```

**Response — 201 Created:**

```json
{
  "ok": true,
  "exception": {
    "id": "exc-001",
    "policy_id": "pol-001",
    "reason": "Hotfix deployment - coverage temporarily below threshold",
    "approved_by": "admin@example.com",
    "expires": "2026-03-25T00:00:00Z",
    "created_at": "2026-03-18T12:00:00Z"
  }
}
```
