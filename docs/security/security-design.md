---
title: Security Design
parent: Security
nav_order: 1
description: Security architecture, threat model, and middleware controls.
---

# Security Design — Agentic SDLC Platform

| Field             | Value                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| **Document**      | Security Design and Threat Model                                            |
| **Version**       | 1.0                                                                         |
| **Status**        | DRAFT                                                                       |
| **Created**       | 2026-03-12                                                                  |
| **Owner**         | Robert Agterhuis                                                            |
| **Audit Finding** | F-02 (CRITICAL) — Security hardening beyond localhost is not fully designed |
| **Issue**         | #138                                                                        |
| **Depends on**    | `docs/ga-definition.md` (F-01 — deployment profiles)                        |

---

## 1. Deployment Profiles

Three deployment tiers are defined. v1 GA targets **Profile 1** only.

### Profile 1 — Localhost (v1 GA)

| Attribute                   | Requirement                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Network binding**         | `127.0.0.1` only (Node.js server)                                                |
| **Authentication**          | None — implicit trust (single local operator)                                    |
| **Authorization**           | N/A — single user has full access                                                |
| **Transport encryption**    | Not required (loopback only)                                                     |
| **Data-at-rest encryption** | OS-level (BitLocker/FileVault); no application-level encryption                  |
| **Secret handling**         | `.env` file (gitignored); no production secrets in tracked files                 |
| **Session isolation**       | Single session; file-locked writes via `withFileLock()`                          |
| **Logging**                 | Structured JSON logs to stdout; `session-state-audit.json` for mutation trail    |
| **Backup**                  | Git history serves as backup; no automated backup process                        |
| **Container posture**       | Docker for analytics only (Matomo); command-center Docker available but optional |

**Current implementation status:** ✅ Fully implemented. Server binds to
`127.0.0.1` by default. `.env` is gitignored. Security headers are set via
`setSecurityHeaders()` middleware.

### Profile 2 — Internal Team (v1.1+, post-GA)

| Attribute                   | Requirement                                             |
| --------------------------- | ------------------------------------------------------- |
| **Network binding**         | LAN IP or `0.0.0.0` (behind firewall)                   |
| **Authentication**          | Token-based (shared secret or JWT)                      |
| **Authorization**           | Role-based: operator (read/write), reviewer (read-only) |
| **Transport encryption**    | HTTPS required (self-signed cert or reverse proxy)      |
| **Data-at-rest encryption** | Application-level encryption for session state          |
| **Secret handling**         | Environment variables via container orchestrator        |
| **Session isolation**       | Per-user session directories; file-lock per user        |
| **Logging**                 | Centralized structured logs with user attribution       |
| **Backup**                  | Automated daily backup of session/data directories      |

**Current implementation status:** ❌ Not implemented. Requires: auth
middleware, user context, HTTPS support, session isolation.

### Profile 3 — Internet-Exposed (v2.0+, post-GA)

| Attribute                   | Requirement                                                 |
| --------------------------- | ----------------------------------------------------------- |
| **Network binding**         | Public IP / cloud deployment                                |
| **Authentication**          | OAuth 2.0 / OIDC (Microsoft Entra ID recommended)           |
| **Authorization**           | RBAC with per-resource permissions                          |
| **Transport encryption**    | TLS 1.2+ mandatory (managed cert)                           |
| **Data-at-rest encryption** | AES-256 for all persisted data; secrets in Key Vault        |
| **Secret handling**         | Azure Key Vault / AWS Secrets Manager                       |
| **Session isolation**       | Database-backed sessions; tenant isolation                  |
| **Logging**                 | SIEM integration; audit trail with tamper detection         |
| **Backup**                  | Geo-redundant automated backups with point-in-time recovery |
| **Additional**              | Rate limiting, WAF, DDoS protection, CSP hardening          |

**Current implementation status:** ❌ Not implemented. Requires: full auth
stack, database layer, cloud infrastructure, compliance certification.

---

## 2. STRIDE Threat Model

Threat analysis for the **current attack surface** (webapp + MCP server +
Docker).

### 2.1 Attack Surface Inventory

| Component                  | Port         | Protocol | Binding        | Exposure               |
| -------------------------- | ------------ | -------- | -------------- | ---------------------- |
| Command Center (server.js) | 3000         | HTTP     | 127.0.0.1      | Localhost only         |
| Command Center (Docker)    | 3000         | HTTP     | 0.0.0.0        | ⚠️ All interfaces      |
| Matomo Analytics           | 8080         | HTTP     | via Docker     | Container network      |
| Matomo MariaDB             | 3306         | MySQL    | Container-only | Not host-exposed       |
| MCP Server                 | stdin/stdout | JSON-RPC | Process-local  | VS Code extension only |

### 2.2 Threat Analysis

#### S — Spoofing (Identity)

| Threat                              | Profile 1 Risk             | Mitigation                                                                                                                                                                                             |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Attacker impersonates operator      | LOW — localhost only       | OS-level user session provides identity                                                                                                                                                                |
| Forged API requests                 | LOW — no network exposure  | Bind to 127.0.0.1; not reachable from LAN                                                                                                                                                              |
| Docker container reachable from LAN | MEDIUM — `0.0.0.0` binding | ⚠️ **FINDING:** Docker binds to `0.0.0.0` in Dockerfile/docker-compose. Mitigate: document that Docker deployment is for local development only; add `127.0.0.1:3000:3000` port mapping recommendation |

#### T — Tampering (Data Integrity)

| Threat                                       | Profile 1 Risk | Mitigation                                                                             |
| -------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| File system modification by other processes  | LOW            | OS file permissions; single-user machine                                               |
| Session state corruption                     | LOW            | `withFileLock()` prevents concurrent writes; audit trail in `session-state-audit.json` |
| Markdown injection in questionnaire answers  | LOW            | `sanitizeMarkdown()` strips dangerous patterns                                         |
| Path traversal to read/write outside project | LOW            | `safePath()` blocks traversal; validated with tests                                    |

#### R — Repudiation (Accountability)

| Threat                       | Profile 1 Risk              | Mitigation                                                              |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| Operator denies action       | LOW — single operator model | `session-state-audit.json` logs all mutations with timestamps           |
| No audit trail for API calls | LOW                         | Structured JSON logging to stdout includes request path, method, timing |

#### I — Information Disclosure

| Threat                                         | Profile 1 Risk | Mitigation                                                                                      |
| ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| Secrets in repository                          | HIGH           | `detectSecrets()` middleware scans inputs; `.env` is gitignored; GitHub secret scanning enabled |
| Error stack traces leak internal paths         | LOW            | Error handler returns sanitized error responses (no stack in production)                        |
| Matomo database password in `.env`             | LOW            | `.env` is gitignored; password is `localdev-matomo-db-2026` (local-only)                        |
| Session data readable by other local processes | LOW            | Accepted risk for localhost profile; OS user isolation sufficient                               |

#### D — Denial of Service

| Threat                               | Profile 1 Risk | Mitigation                                                                                |
| ------------------------------------ | -------------- | ----------------------------------------------------------------------------------------- |
| Large request payload fills disk     | LOW            | Input length validation (`assertString` maxLen); file-backed store is operator-controlled |
| SSE connection exhaustion            | LOW            | Localhost only; single operator won't exhaust connections                                 |
| Docker container resource exhaustion | LOW            | `infra/docker-compose.yml` sets resource limits (512M memory, 1 CPU)                      |

#### E — Elevation of Privilege

| Threat                                 | Profile 1 Risk | Mitigation                                                                      |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| API endpoint accesses unintended files | LOW            | `safePath()` constrains all file operations to project directory                |
| Command injection via user input       | LOW            | No shell execution from user input; all file operations use Node.js `fs` module |
| Container escape                       | LOW            | Alpine-based image; non-root recommended (not enforced)                         |

### 2.3 Summary Risk Matrix

| Category               | Profile 1 (Localhost) | Profile 2 (Team) | Profile 3 (Internet) |
| ---------------------- | --------------------- | ---------------- | -------------------- |
| Spoofing               | LOW                   | HIGH             | CRITICAL             |
| Tampering              | LOW                   | MEDIUM           | HIGH                 |
| Repudiation            | LOW                   | MEDIUM           | HIGH                 |
| Info Disclosure        | LOW\*                 | HIGH             | CRITICAL             |
| Denial of Service      | LOW                   | MEDIUM           | HIGH                 |
| Elevation of Privilege | LOW                   | MEDIUM           | HIGH                 |

_\* LOW assumes `.env` is gitignored and Docker is not exposed to network._

---

## 3. Hardening Checklist

### Profile 1 — Localhost (v1 GA)

| #   | Check                                   | Status      | Pass/Fail Criteria                                                     |
| --- | --------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| H1  | Server binds to `127.0.0.1`             | ✅ PASS     | `HOST` defaults to `'127.0.0.1'` in server.js                          |
| H2  | `.env` is in `.gitignore`               | ✅ PASS     | Verified in `.gitignore`                                               |
| H3  | No hardcoded secrets in tracked files   | ✅ PASS     | `detectSecrets()` scans inputs; manual review confirms                 |
| H4  | Security headers set on all responses   | ✅ PASS     | `setSecurityHeaders()` applies CSP, X-Frame-Options, etc.              |
| H5  | Path traversal blocked                  | ✅ PASS     | `safePath()` with test coverage                                        |
| H6  | Input sanitization                      | ✅ PASS     | `sanitizeMarkdown()`, `sanitizeQID()`, `assertString()`                |
| H7  | File-lock prevents race conditions      | ✅ PASS     | `withFileLock()` on all write operations                               |
| H8  | Audit trail for state mutations         | ✅ PASS     | `session-state-audit.json` logs all changes                            |
| H9  | Error responses don't leak internals    | ✅ PASS     | `errorResponse()` returns sanitized errors                             |
| H10 | Docker port binding documented          | ⚠️ ADVISORY | Dockerfile uses `0.0.0.0`; document that this is for local Docker only |
| H11 | GitHub secret scanning enabled          | ✅ PASS     | Security tab shows 0 findings                                          |
| H12 | npm audit clean                         | ⚠️ CHECK    | Run `npm audit` and document status in release notes                   |
| H13 | No `eval()` or `Function()` calls       | ✅ PASS     | Server uses `JSON.parse()` only                                        |
| H14 | CSP blocks inline scripts from external | ✅ PASS     | CSP: `default-src 'self'`                                              |
| H15 | HTTPS not required (localhost)          | ✅ N/A      | Loopback traffic; encryption not needed                                |

### Profile 2 — Internal Team (post-GA)

| #   | Check                                                   | Pass/Fail Criteria           |
| --- | ------------------------------------------------------- | ---------------------------- |
| H16 | Auth middleware validates bearer token on every request | Token required               |
| H17 | HTTPS enabled (TLS 1.2+)                                | Certificate configured       |
| H18 | Session isolation per user                              | Separate session directories |
| H19 | Rate limiting (100 req/min per IP)                      | Middleware added             |
| H20 | Access logs include authenticated user ID               | User attribution in logs     |

### Profile 3 — Internet-Exposed (post-GA)

| #   | Check                              | Pass/Fail Criteria          |
| --- | ---------------------------------- | --------------------------- |
| H21 | OAuth/OIDC (Entra ID) configured   | Redirect flow working       |
| H22 | RBAC enforced per route            | Role check middleware       |
| H23 | Secrets in Key Vault (no env vars) | Zero secrets in environment |
| H24 | WAF/DDoS protection active         | Cloud provider WAF enabled  |
| H25 | Penetration test passed            | Third-party pen test report |

---

## 4. Docker Security Notes

### Current State

The `infra/Dockerfile` and `infra/docker-compose.yml` set `HOST=0.0.0.0`, which exposes the
server to all network interfaces. This is by design for Docker container
networking but creates a potential exposure if the host machine is on a network.

### Recommendations for v1 GA Documentation

1. Document that Docker deployment is **optional** and intended for **local
   development only**
2. Recommend port mapping with localhost binding: `127.0.0.1:3000:3000` instead
   of `3000:3000`
3. Add a security note to README that the Docker container should not be exposed
   to untrusted networks without additional hardening (Profile 2/3)
4. Matomo container is analytics-only; no sensitive platform data flows through
   it

### Future Hardening (Post-GA)

- Run container as non-root user (`USER node` in Dockerfile) — ✅ implemented
- Add resource limits in docker-compose.yml — ✅ implemented
- Add health check endpoint for container orchestration
- Separate network segments for app and database containers

---

## 5. Existing Security Controls

| Control                   | Implementation                                                                                 | File                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| Security response headers | `setSecurityHeaders()` — CSP, X-Frame-Options, COOP, COEP, Referrer-Policy, Permissions-Policy | `src/webapp/middleware.js:48`  |
| Path traversal prevention | `safePath()` — resolves and validates paths stay within base directory                         | `src/webapp/middleware.js:72`  |
| Input sanitization        | `sanitizeMarkdown()`, `sanitizeQID()`, `assertString()`                                        | `src/webapp/middleware.js`     |
| Secret detection          | `detectSecrets()` — regex-based scan for API keys, tokens, passwords in user input             | `src/webapp/middleware.js:224` |
| File locking              | `withFileLock()` — prevents concurrent write corruption                                        | `src/webapp/file-lock.js`      |
| Audit trail               | `AuditTrail` class — logs all state mutations with timestamp                                   | `src/webapp/audit.js`          |
| Structured logging        | `structuredLog()` — JSON format with level, event, details                                     | `src/webapp/middleware.js`     |
| Method validation         | `handleMethodNotAllowed()` — rejects unexpected HTTP methods per route                         | `src/webapp/middleware.js`     |
| Error boundary            | `handleRouteError()` — catches and sanitizes all route errors                                  | `src/webapp/middleware.js`     |
| Security policy           | `SECURITY.md` — vulnerability disclosure process                                               | `SECURITY.md`                  |

---

## 6. Cross-References

| Finding                 | Section                                                   | Status                               |
| ----------------------- | --------------------------------------------------------- | ------------------------------------ |
| F-02 (CRITICAL)         | Entire document                                           | ADDRESSED                            |
| F-01 (GA definition)    | Section 1 deployment profiles align with ga-definition.md | CONSISTENT                           |
| F-03 (Privacy)          | Data-at-rest encryption in profiles                       | SCOPED — detail in data-inventory.md |
| #21 (Docker deployment) | Section 4 Docker security notes                           | CROSS-REFERENCED                     |

---

_This document defines the security boundaries for each deployment profile. v1
GA operates within Profile 1 (localhost/single-operator). Profile 2 and 3
security requirements are documented for planning but are NOT implemented and
NOT in v1 GA scope._
