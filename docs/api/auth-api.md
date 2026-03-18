---
title: Authentication API
parent: API Reference
nav_order: 1
description: GitHub OAuth 2.0 login, session management, and user administration.
---

# Authentication API

**Module:** `routes/auth.ts`
**Auth method:** GitHub OAuth 2.0 with HMAC-signed state parameter
**Session storage:** SQLite (better-sqlite3), 24-hour TTL
**Roles:** `admin`, `operator`, `viewer`

---

## GET /api/auth/login

Redirect the user to GitHub's OAuth authorization page.

**Auth required:** No

**Query parameters:**

| Parameter  | Type   | Required | Description                                |
| ---------- | ------ | -------- | ------------------------------------------ |
| `redirect` | string | No       | URL to redirect to after login (validated) |

**Response:** `302 Found` redirect to `https://github.com/login/oauth/authorize`
with CSRF-protected `state` parameter.

**Example:**

```http
GET /api/auth/login?redirect=/dashboard HTTP/1.1
Host: localhost:3000
```

---

## GET /api/auth/callback

Handle the OAuth callback from GitHub after user authorization.

**Auth required:** No

**Query parameters:**

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `code`    | string | Yes      | Authorization code from GitHub |
| `state`   | string | Yes      | HMAC-signed state for CSRF     |

**Response:** `302 Found` redirect to the originally requested page. Sets
`session` and `csrf` cookies.

**Behavior:**

- Exchanges `code` for an access token via GitHub API
- Creates or updates the user record in SQLite
- First user automatically receives `admin` role; subsequent users get `viewer`
- Creates a session with a CSRF token

---

## POST /api/auth/logout

Destroy the current session and clear cookies.

**Auth required:** No (idempotent)

**Request body:** None

**Response:**

```json
{ "ok": true, "message": "Logged out" }
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: session=<session_id>"
```

---

## GET /api/auth/me

Get the currently authenticated user's profile.

**Auth required:** Yes (valid session cookie)

**Response — 200 OK:**

```json
{
  "id": "user-abc123",
  "email": "developer@example.com",
  "name": "Jane Developer",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345",
  "role": "admin",
  "csrf_token": "tok_abc123xyz"
}
```

**Response — 401 Unauthorized:**

```json
{ "error": "UNAUTHORIZED", "message": "Not authenticated" }
```

---

## GET /api/admin/users

List all registered users.

**Auth required:** Yes — `admin` role only

**Response — 200 OK:**

```json
[
  {
    "id": "user-abc123",
    "github_id": 12345,
    "email": "developer@example.com",
    "name": "Jane Developer",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345",
    "role": "admin",
    "created_at": "2026-03-01T10:00:00Z",
    "last_login": "2026-03-18T08:30:00Z"
  }
]
```

**Response — 403 Forbidden:**

```json
{ "error": "FORBIDDEN", "message": "Admin role required" }
```

---

## PUT /api/admin/users/:id/role

Update a user's role.

**Auth required:** Yes — `admin` role only

**Path parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | User ID     |

**Request body:**

| Field  | Type   | Required | Values                           |
| ------ | ------ | -------- | -------------------------------- |
| `role` | string | Yes      | `admin`, `operator`, or `viewer` |

**Example request:**

```bash
curl -X PUT http://localhost:3000/api/admin/users/user-abc123/role \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<admin_session>" \
  -d '{"role": "operator"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "data": {
    "id": "user-abc123",
    "role": "operator"
  }
}
```

**Error responses:**

| Status | Code             | Condition          |
| ------ | ---------------- | ------------------ |
| 400    | VALIDATION_ERROR | Invalid role value |
| 403    | FORBIDDEN        | Not admin          |
| 404    | NOT_FOUND        | User not found     |
