# Security Remediation

## Current Assessment

Security is the most urgent gap between current state and production-grade claims.

The repository has meaningful security tooling and some runtime controls, but the runtime defaults still assume a trusted environment more than an adversarial one.

## Validated Findings

- In `src/webapp/app.ts`, when auth middleware is absent, fallback protection only applies to non-GET API requests outside localhost.
- That means GET `/api/**` routes remain available without the same fallback guard when auth is disabled.
- `src/webapp/plugins/security-headers.ts` still allows `'unsafe-inline'` for both scripts and styles in the default CSP.
- `src/webapp/app.ts` enables `trustProxy: true` globally.
- `src/webapp/plugins/rate-limit.ts` exempts GET requests and uses `req.ip` as the key.
- `.github/workflows/ci.yml` still uses `aquasecurity/trivy-action@master`.
- `.github/workflows/storybook.yml` still uses floating `@v4` tags.

## My Opinion

This is the dimension where the repository is most clearly not production-ready.

The most important issue is not missing scanners or missing documentation. Those already exist. The real issue is that the live runtime can still expose API surface in degraded auth mode when running outside localhost. That is a fail-open posture for a platform that claims production readiness.

## Target State

Outside localhost, the system should fail closed.

That means:

- every `/api` route requires authenticated access or an explicitly supported hardened machine-to-machine mode
- startup rejects insecure non-local runtime modes
- CSP avoids `'unsafe-inline'`
- proxy trust is bounded and documented
- rate limiting protects read-heavy abuse paths as well as mutating paths
- GitHub Actions are pinned by SHA

## How I Would Fix It

### Fix 1: Fail closed on non-local auth

In non-local environments:

- require configured auth for all `/api` routes
- if auth is not configured, refuse startup
- if an API-key-only machine mode is allowed, define it explicitly and apply it uniformly, not only to mutation routes

This is the single highest-priority engineering change in the repository.

### Fix 2: Harden browser policy

Replace CSP `'unsafe-inline'` with one of:

- nonces
- hashes
- framework-compatible script and style handling that avoids inline execution

Also review whether `X-Frame-Options` and `frame-ancestors` should align more tightly with the actual embedding policy.

### Fix 3: Bound proxy trust and improve rate limiting

- replace blanket `trustProxy: true` with explicit trusted proxy configuration
- rate limit at least selected GET API routes, not only mutations
- separate health and metrics endpoints from user-facing API rate policy

### Fix 4: Pin the remaining GitHub Actions

Replace floating action references with SHA-pinned versions across all workflows.

## Milestone Candidate

Milestone: Security Boundary Hardening

## Epic Candidates

### Epic: Fail-closed API security model

Suggested issues:

- Reject startup when non-local auth is unconfigured
- Enforce auth on all `/api` routes outside localhost
- Define and document any approved machine-to-machine exception path

### Epic: Browser and edge hardening

Suggested issues:

- Remove `'unsafe-inline'` from CSP
- Bound trusted proxies explicitly
- Expand GET route rate limiting strategy

### Epic: Supply-chain hardening

Suggested issues:

- Pin all GitHub Actions by SHA
- audit workflow permissions and action provenance
- standardize security scan behavior across workflows

## Acceptance Criteria

- Non-local startup fails when secure auth prerequisites are absent.
- All API routes are protected according to one explicit security model.
- CSP no longer relies on `'unsafe-inline'`.
- Proxy trust and rate limiting are explicitly bounded.
- All workflows use pinned actions.
