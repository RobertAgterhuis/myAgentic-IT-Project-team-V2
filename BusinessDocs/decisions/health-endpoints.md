# Decision: Health Endpoint Strategy

**ID:** DEC-T-046  
**Status:** DECIDED  
**Date:** 2025-07-20  
**Scope:** M15-046  
**Priority:** LOW

## Context

The server exposes three health-related endpoints:

| Endpoint                    | Purpose                                            | Response                                                                |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /health`               | Liveness probe — is the process running?           | `{ status, version, uptime, store_status }`                             |
| `GET /api/health`           | Readiness probe — is the server ready to serve?    | `{ status, version, uptime, store_status, sse_connections, timestamp }` |
| `GET /api/dashboard/health` | Project health indicators (code quality, coverage) | `{ ok, data: { codeQuality, testCoverage, ... }, timestamp }`           |

## Decision

**Keep all three endpoints.** They serve distinct purposes:

- `/health` — lightweight **liveness** check (no auth prefix, minimal response).
  Used by simple uptime monitors or manual quick-checks.
- `/api/health` — **readiness** check with operational details (SSE connection
  count, timestamp). Used by Docker HEALTHCHECK and Playwright `webServer.url`.
- `/api/dashboard/health` — **project** health metrics (not server health).
  Consumed by the Dashboard UI.

## Canonical References

- **Docker HEALTHCHECK:** `GET /api/health` (`infra/Dockerfile`)
- **Playwright webServer:** `GET /api/health` (`playwright.config.ts`)
- **CI pipeline:** `GET /api/health` (`.github/workflows/ci-pipeline.yml`)

## Notes

No code changes required. This decision documents the intentional design.
