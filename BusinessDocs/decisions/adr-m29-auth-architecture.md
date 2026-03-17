# ADR-M29-001: Authentication & RBAC Implementation Architecture

> Status: **DECIDED** | Date: 2026-03-17
> Source: Security GAP-1 (No Auth), GAP-2 (No CSRF), GAP-4 (Localhost bypass), Product GAP-2 (No User Management)

## Context

The platform currently uses an IP-based trust bypass (localhost) and a simple API key guard
for non-localhost hosts. This is insufficient for production multi-user deployment.

## Decisions

### 1. Provider: GitHub OAuth 2.0 Authorization Code Flow

- All platform users already have GitHub accounts (SDLC tool)
- Standard OAuth 2.0 Authorization Code flow (server-side, not PKCE/SPA)
- Aligns with DEC-331 (OAuth 2.0 mandatory)

### 2. Session Strategy: Server-side Cookie Sessions in SQLite

- HttpOnly + Secure + SameSite=Strict cookies (aligns with DEC-334)
- SQLite session store using existing better-sqlite3 infrastructure
- 24-hour absolute TTL, sliding renewal on activity
- Immediate revocation support via session table

### 3. RBAC: Three-tier Role Hierarchy

- Roles: `admin` > `operator` > `viewer` (aligns with DEC-333)
- Enforced at API middleware layer
- Default role on first login: `viewer`

### 4. CSRF: Double-Submit Cookie Pattern

- CSRF token bound to session, verified on POST/PUT/DELETE
- SameSite=Strict on all cookies (aligns with DEC-332)

### Authentication Flow

```
User → GET /login → "Login with GitHub" button
  → Redirect to GitHub authorize URL (with state param)
  → GitHub authenticates, redirects to /api/auth/callback?code=X&state=Y
  → Server verifies state, exchanges code for access_token
  → Server fetches GitHub user profile
  → Server creates/updates user in SQLite users table
  → Server creates session (new session ID), sets HttpOnly cookie
  → Redirect to original page (or /)
```

### Public Endpoints (No Auth Required)

- `GET /api/health`
- `GET /api/auth/login`, `GET /api/auth/callback`, `POST /api/auth/logout`
- `GET /login` (static login page)

### Threat Model

| Threat            | Mitigation                                  |
| ----------------- | ------------------------------------------- |
| Session hijacking | HttpOnly + Secure + SameSite=Strict cookies |
| CSRF              | Double-submit cookie + SameSite=Strict      |
| XSS token theft   | No tokens in browser storage                |
| Session fixation  | New session ID on login                     |
| OAuth CSRF        | HMAC-signed `state` parameter               |
| Token leakage     | Access tokens server-side only              |
| Open redirect     | Allowlist redirect validation               |
