---
layout: default
title: API Reference
nav_order: 8
has_children: true
description: REST API documentation for the Agentic SDLC Platform server endpoints.
---

# API Reference

REST API documentation for the platform's HTTP endpoints.

**Base URL:** `http://127.0.0.1:3000`
**Content-Type:** All endpoints accept and return `application/json` unless noted.
**OpenAPI spec:** [openapi.yaml](openapi.yaml)

---

## Authentication

Most endpoints are public (no auth required). The platform supports optional
GitHub OAuth 2.0 authentication with RBAC. When auth is enabled:

- Sessions are stored in SQLite with 24-hour TTL
- CSRF tokens protect state-changing operations
- Three roles: **admin** (full access), **operator** (operational access),
  **viewer** (read-only)
- Admin-only endpoints: `/api/admin/users`, `/api/admin/users/:id/role`

See [Authentication](auth-api.md) for login flow details.

---

## Common Response Format

All endpoints return JSON with a standard envelope:

```json
{ "ok": true, "data": { ... }, "message": "..." }
```

Error responses use structured error codes:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Human-readable message",
  "recovery": "Suggestion to fix the issue",
  "details": ["field-level errors"]
}
```

**Common HTTP status codes:** 200 (success), 201 (created), 400 (validation
error), 401 (unauthorized), 403 (forbidden), 404 (not found), 405 (method not
allowed), 409 (conflict), 429 (rate limited), 500 (internal error).

---

## Endpoint Groups

| Group               | Prefix                                                    | Documentation                                          |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Authentication      | `/api/auth/*`, `/api/admin/*`                             | [auth-api.md](auth-api.md)                             |
| Questionnaires      | `/api/questionnaires`, `/api/save`                        | [questionnaires-api.md](questionnaires-api.md)         |
| Decisions           | `/api/decisions/*`                                        | [decisions-api.md](decisions-api.md)                   |
| Commands            | `/api/command`                                            | [commands-api.md](commands-api.md)                     |
| Orchestrator        | `/api/orchestrator/*`                                     | [orchestrator-api.md](orchestrator-api.md)             |
| Milestones          | `/api/milestones/*`, `/api/milestone-templates/*`         | [milestones-api.md](milestones-api.md)                 |
| Sessions & Progress | `/api/session`, `/api/progress`, `/api/sessions/*`        | [sessions-api.md](sessions-api.md)                     |
| Governance          | `/api/v1/approvals/*`, `/api/v1/policies/*`               | [governance-api.md](governance-api.md)                 |
| Analytics & Metrics | `/api/analytics`, `/api/v1/analytics/*`, `/api/metrics/*` | [analytics-api.md](analytics-api.md)                   |
| Agents              | `/api/agents/*`                                           | [agents-api.md](agents-api.md)                         |
| Artifacts           | `/api/v1/artifacts/*`                                     | [artifacts-api.md](artifacts-api.md)                   |
| Workspaces          | `/api/workspaces/*`                                       | [workspaces-api.md](workspaces-api.md)                 |
| Dashboard & Cockpit | `/api/dashboard/*`, `/api/v1/cockpit/*`                   | [dashboard-api.md](dashboard-api.md)                   |
| Jobs                | `/api/jobs/*`                                             | [jobs-api.md](jobs-api.md)                             |
| System              | `/api/health`, `/api/help`, `/api/audit`, etc.            | [system-api.md](system-api.md)                         |
| Newsletter          | `/api/subscribe`                                          | [subscribe-api.md](subscribe-api.md)                   |
| MCP Parity          | —                                                         | [mcp-http-parity-matrix.md](mcp-http-parity-matrix.md) |
