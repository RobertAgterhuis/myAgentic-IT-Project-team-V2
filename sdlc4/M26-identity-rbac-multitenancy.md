# M26: Identity, RBAC & Multi-Tenancy

> **Impact:** HIGH | **Breaking changes:** NONE if additive (new auth layer
> wraps existing endpoints — unauthenticated mode preserved as "local" mode) |
> **Blocks:** nothing | **Blocked by:** nothing (benefits from M23 and M25 but
> can start independently)
>
> **Audit reference:** Weakness #1 and Phase 1 recommendation — "Identity, RBAC,
> and audit at workspace/user level." Score: Security posture 7.5/10 — "Good
> local safety measures, scanning, and secret-awareness; not yet enterprise-grade
> IAM/RBAC architecture." Enterprise readiness 6/10.
>
> **Validation:** CONFIRMED. Current auth is API-key guard for non-localhost
> mutations only (single shared key). No user identity, no roles, no
> per-workspace permissions. The audit trail logs IP addresses but not user
> identities. Rate limiting is per-IP, not per-user.

---

## Rationale

A platform used by teams needs to know **who** is doing **what** and whether
they're **allowed to**. The current API-key guard is a good local safety net,
but it's a single shared credential — everyone with the key has the same
permissions. RBAC enables: team leads approve governance gates, developers submit
but don't approve, viewers see dashboards but can't modify.

---

## Issues

### M26-001: Define identity and role model

**Labels:** `architecture`, `security`

Create `platform/schema/identity.schema.json`:

```
User {
  id: string
  name: string
  email: string
  provider: "local" | "entra-id" | "github" | "oidc"
  roles: Role[]
  workspaces: WorkspaceMembership[]
}

Role {
  id: string
  name: "admin" | "lead" | "developer" | "viewer"
  permissions: Permission[]
}

Permission {
  resource: "session" | "decision" | "questionnaire" | "command" |
            "approval" | "artifact" | "policy" | "workspace" | "settings"
  actions: ("read" | "create" | "update" | "delete" | "approve")[]
}

WorkspaceMembership {
  workspaceId: string
  role: string
}
```

**Acceptance criteria:**

- [ ] Identity schema supports multiple auth providers
- [ ] Role model has sensible defaults (admin, lead, developer, viewer)
- [ ] Permissions are granular per resource and action
- [ ] Workspace-scoped roles supported

---

### M26-002: Implement authentication middleware

**Labels:** `backend`, `security`

Create `src/webapp/auth/auth-middleware.ts`:

- Extract user identity from request (token, session cookie, API key)
- Support strategies: `local` (no auth, current behavior), `api-key` (current),
  `jwt` (bearer token), `oidc` (OpenID Connect)
- Strategy selection via `AUTH_STRATEGY` environment variable
- Default: `local` (preserves current zero-auth behavior)
- Attach `req.user` context to every authenticated request

**Acceptance criteria:**

- [ ] `AUTH_STRATEGY=local` — no auth required (current behavior preserved)
- [ ] `AUTH_STRATEGY=api-key` — current API-key behavior
- [ ] `AUTH_STRATEGY=jwt` — validates JWT tokens
- [ ] Middleware attaches user context to request
- [ ] All existing tests pass with `local` strategy

---

### M26-003: Implement authorization middleware

**Labels:** `backend`, `security`

Create `src/webapp/auth/authz-middleware.ts`:

- Check `req.user.roles` against required permissions for the endpoint
- Route-level permission annotation: `requirePermission('decision', 'approve')`
- Return `403 Forbidden` with clear error message on unauthorized access
- Admin role bypasses all permission checks
- Log authorization decisions to audit trail

**Acceptance criteria:**

- [ ] Authorization middleware checks permissions before route handler
- [ ] `403` returned for unauthorized access attempts
- [ ] Admin bypass works
- [ ] Audit trail includes user identity on all operations
- [ ] All routes annotated with required permissions

---

### M26-004: Implement local user management

**Labels:** `backend`, `feature`

Create `src/webapp/auth/user-service.ts`:

- CRUD operations for local users
- Password hashing with `scrypt` (Node.js built-in)
- API key generation per user
- User invitation (create account with temporary password)
- Uses StorageProvider for user data

**Acceptance criteria:**

- [ ] User CRUD operations work
- [ ] Passwords are hashed with `scrypt` (never stored in plaintext)
- [ ] Per-user API keys can be generated and rotated
- [ ] User data is stored via StorageProvider

---

### M26-005: Add OIDC/Entra ID provider

**Labels:** `security`, `integration`

Create `src/webapp/auth/providers/oidc-provider.ts`:

- OpenID Connect authorization code flow
- Configuration: issuer URL, client ID, client secret, redirect URI
- Token validation: signature, expiry, audience, issuer
- Auto-create user on first login (JIT provisioning)
- Map OIDC claims to internal roles (configurable claim mapping)

**Acceptance criteria:**

- [ ] OIDC login flow works end-to-end
- [ ] Token validation is secure (all required checks)
- [ ] JIT user provisioning creates users with default role
- [ ] Claim-to-role mapping is configurable
- [ ] Works with Microsoft Entra ID (Azure AD)

---

### M26-006: Add identity context to audit trail

**Labels:** `security`, `observability`

Update `audit.ts` to include user identity in every audit event:

- `userId`, `userName`, `userRole` fields added to audit entries
- MCP tool invocations include the connected IDE user context
- Audit queries can filter by user
- Dashboard shows "who did what" view

**Acceptance criteria:**

- [ ] All audit events include user identity (or "anonymous" for local mode)
- [ ] MCP invocations are attributed to the connected user
- [ ] Audit query supports user filter
- [ ] No PII beyond user ID and name in audit (no email, no IP in user context)

---

### M26-007: Add user management to UI

**Labels:** `frontend`, `security`

Add admin pages:

- User list with roles and last-activity
- Create/edit user (admin only)
- Role assignment per workspace
- Login page (when auth is not `local`)

**Acceptance criteria:**

- [ ] Admin-only user management pages
- [ ] Login page shows when `AUTH_STRATEGY` is not `local`
- [ ] Role assignment UI per workspace
- [ ] Current user profile page with API key management
