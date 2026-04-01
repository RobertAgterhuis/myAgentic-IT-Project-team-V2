# Security Sweep 10: Auth, Session, and CSRF

## Scope

- Session establishment and cookie behavior
- CSRF controls for state-changing routes
- Fallback API protection paths

## Findings

### 1) Strong CSRF enforcement present for mutating authenticated requests

- Severity: DEFENSE
- Evidence:
  - src/webapp/auth.ts:1378
  - src/webapp/auth.ts:1475
  - src/webapp/auth.ts:1476
- Detail:
  - CSRF token is validated for non-GET/HEAD/OPTIONS methods.

### 2) OAuth state validation present on callback

- Severity: DEFENSE
- Evidence:
  - src/webapp/routes/auth.ts:284
- Detail:
  - OAuth callback verifies state to mitigate CSRF in login flow.

### 3) API-key fallback mode is coarse-grained when auth middleware is absent

- Severity: MODERATE
- Evidence:
  - src/webapp/app.ts:186
  - src/webapp/app.ts:189
- Detail:
  - Non-local API routes fall back to a shared `x-api-key` check if full auth middleware is not active.
- Risk:
  - Single static key can become an operational single point of compromise.

## Recommended Fixes

1. Remove or tightly scope API-key fallback mode in production.
2. Require auth middleware as a startup invariant for non-local bindings.
3. Rotate API keys automatically and attach per-client identity claims where fallback is unavoidable.

## Verdict for this area

- Core auth and CSRF controls are solid; the main weakness is coarse fallback protection semantics outside full auth mode.
