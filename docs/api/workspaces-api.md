---
title: Workspaces API
parent: API Reference
nav_order: 12
description: Workspace, repository, and project management.
---

# Workspaces API

**Module:** `routes/workspaces.ts`
**Auth required:** No

---

## GET /api/workspaces

List all workspaces.

**Response — 200 OK:**

```json
{
  "ok": true,
  "count": 2,
  "workspaces": [
    {
      "id": "ws-001",
      "name": "My Team Workspace",
      "owner": "jane@example.com",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

## POST /api/workspaces

Create a new workspace.

**Request body:**

| Field   | Type   | Required | Description         |
| ------- | ------ | -------- | ------------------- |
| `id`    | string | Yes      | Unique workspace ID |
| `name`  | string | Yes      | Display name        |
| `owner` | string | Yes      | Owner identifier    |

**Example:**

```bash
curl -X POST http://localhost:3000/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{"id": "ws-002", "name": "Backend Team", "owner": "john@example.com"}'
```

**Response — 201 Created:**

```json
{
  "ok": true,
  "workspace": {
    "id": "ws-002",
    "name": "Backend Team",
    "owner": "john@example.com",
    "repositories": [],
    "projects": [],
    "created_at": "2026-03-18T12:00:00Z"
  }
}
```

---

## GET /api/workspaces/:id

Get workspace details including projects.

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Response — 200 OK:**

```json
{
  "ok": true,
  "workspace": {
    "id": "ws-001",
    "name": "My Team Workspace",
    "owner": "jane@example.com",
    "repositories": [],
    "created_at": "2026-03-01T10:00:00Z"
  },
  "projects": []
}
```

---

## PUT /api/workspaces/:id

Update workspace properties.

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Request body:**

| Field   | Type   | Required | Description      |
| ------- | ------ | -------- | ---------------- |
| `name`  | string | No       | New display name |
| `owner` | string | No       | New owner        |

**Response — 200 OK:**

```json
{ "ok": true, "workspace": { "id": "ws-001", "name": "Updated Name" } }
```

**Error responses:**

| Status | Code      | Condition           |
| ------ | --------- | ------------------- |
| 404    | NOT_FOUND | Workspace not found |

---

## DELETE /api/workspaces/:id

Delete a workspace and all its projects (cascade).

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Response — 200 OK:**

```json
{ "ok": true, "deleted": "ws-001" }
```

---

## POST /api/workspaces/:id/repositories

Add a repository to a workspace.

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Request body:**

| Field           | Type   | Required | Description                                    |
| --------------- | ------ | -------- | ---------------------------------------------- |
| `id`            | string | Yes      | Repository identifier                          |
| `name`          | string | Yes      | Repository display name                        |
| `provider`      | string | Yes      | `github`, `azure-devops`, `gitlab`, or `local` |
| `url`           | string | Yes      | Repository URL                                 |
| `defaultBranch` | string | Yes      | Default branch name                            |
| `tags`          | array  | No       | Array of string tags                           |

**Example:**

```bash
curl -X POST http://localhost:3000/api/workspaces/ws-001/repositories \
  -H "Content-Type: application/json" \
  -d '{
    "id": "repo-001",
    "name": "Backend Service",
    "provider": "github",
    "url": "https://github.com/org/backend",
    "defaultBranch": "main",
    "tags": ["backend", "api"]
  }'
```

**Response — 200 OK:**

```json
{ "ok": true, "workspace": { "id": "ws-001", "repositories": ["repo-001"] } }
```

---

## DELETE /api/workspaces/:id/repositories/:repoId

Remove a repository from a workspace.

**Path parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Workspace ID  |
| `repoId`  | string | Repository ID |

**Response — 200 OK:**

```json
{ "ok": true, "workspace": { "id": "ws-001", "repositories": [] } }
```

---

## GET /api/workspaces/:id/projects

List projects in a workspace.

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Response — 200 OK:**

```json
{ "ok": true, "projects": [] }
```

---

## POST /api/workspaces/:id/projects

Create a project within a workspace.

**Path parameters:**

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Workspace ID |

**Request body:**

| Field          | Type   | Required | Description             |
| -------------- | ------ | -------- | ----------------------- |
| `id`           | string | Yes      | Project identifier      |
| `name`         | string | Yes      | Project display name    |
| `repositories` | array  | No       | Array of repository IDs |

**Response — 201 Created:**

```json
{
  "ok": true,
  "project": {
    "id": "proj-001",
    "name": "API Service",
    "repositories": ["repo-001"]
  }
}
```
