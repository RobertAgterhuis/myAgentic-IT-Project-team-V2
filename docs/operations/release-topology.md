---
title: Release Topology and Environment Contracts
parent: Operations
nav_order: 7
permalink: /release-topology/
description: >
  Environment promotion strategy, runtime profile contracts, and the
  configuration requirements for each deployment tier.
---

# Release Topology and Environment Contracts

| Field             | Value                                          |
| ----------------- | ---------------------------------------------- |
| **Document**      | Release Topology and Environment Contracts     |
| **Version**       | 1.0                                            |
| **Created**       | 2026-03-20                                     |
| **Audit Finding** | E-C5 (S-C5-1) — Environment promotion strategy |
| **Issue**         | #724 (I-C5-001)                                |

---

## 1. Promotion Pipeline

The platform uses a three-tier promotion path. Every change travels left to
right. No bypass is permitted.

```
local-dev  ──▶  ci-test (PR gate)  ──▶  production-single-node  ──▶  production-distributed
    │                  │                          │                            │
 Developer         GitHub CI                 Tag release                 Scaled deploy
 workstation      (automated)              vX.Y.Z on main               (Redis + nginx)
```

### Promotion gates

| From → To                                       | Gate                                                         |
| ----------------------------------------------- | ------------------------------------------------------------ |
| local-dev → ci-test                             | `npm test` + `npm run lint` pass locally before opening PR   |
| ci-test → production-single-node                | All CI checks green; PR squash-merged to `main`; tag created |
| production-single-node → production-distributed | Manual approval; scale pre-requisite script passes           |

---

## 2. Environment Definitions

### 2.1 `local-dev`

| Parameter         | Value / Requirement                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **NODE_ENV**      | `development`                                                                                    |
| **Storage**       | `filesystem` (default) — writes to `docs/session/`                                               |
| **Queue**         | `in-process` (BullMQ in-memory)                                                                  |
| **Session store** | `memory`                                                                                         |
| **Redis**         | Optional — if `REDIS_URL` is set, a connection warning is emitted on failure; platform continues |
| **Auth**          | Not required                                                                                     |
| **Trust proxy**   | Not required                                                                                     |
| **Start command** | `npm start`                                                                                      |
| **Health check**  | `GET http://127.0.0.1:3000/health/live`                                                          |

**Purpose:** Feature development and exploratory testing on a developer
workstation. Services are intentionally permissive; failures are surfaced as
warnings, not hard stops.

### 2.2 `ci-test`

| Parameter         | Value / Requirement                                           |
| ----------------- | ------------------------------------------------------------- |
| **NODE_ENV**      | `test`                                                        |
| **Storage**       | `filesystem` (temp dir, cleaned between runs)                 |
| **Queue**         | `in-process`                                                  |
| **Session store** | `memory`                                                      |
| **Redis**         | Not used                                                      |
| **Auth**          | Not required                                                  |
| **Trust proxy**   | Not required                                                  |
| **Start command** | `npm test` / `npm run test:integration`                       |
| **Coverage gate** | 75 % lines / 75 % statements / 75 % functions / 60 % branches |

**Purpose:** Automated validation in GitHub Actions. All infrastructure is
in-process; no external services. Deterministic and hermetic.

### 2.3 `production-single-node`

| Parameter         | Value / Requirement                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **NODE_ENV**      | `production`                                                                                     |
| **Storage**       | `filesystem` — persistent volume required                                                        |
| **Queue**         | `in-process` (acceptable for single instance)                                                    |
| **Session store** | `memory`                                                                                         |
| **Redis**         | Optional — if `REDIS_URL` is set, a connection warning is emitted on failure; platform continues |
| **Auth**          | Recommended — `AUTH_SECRET` should be set                                                        |
| **Trust proxy**   | Required if behind a reverse proxy                                                               |
| **Start command** | `npm start` or `docker compose up --build`                                                       |
| **Health check**  | `GET http://127.0.0.1:3000/health/live`                                                          |
| **Memory limit**  | 512 MB (see `infra/docker-compose.yml`)                                                          |

**Purpose:** Production deployment for a single operator. A persistent volume
keeps session state across restarts. No horizontal scaling.

### 2.4 `production-distributed`

| Parameter         | Value / Requirement                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **NODE_ENV**      | `production`                                                                                   |
| **Storage**       | `filesystem` — shared volume or Redis-backed store required                                    |
| **Queue**         | `bullmq` (requires Redis)                                                                      |
| **Session store** | `redis`                                                                                        |
| **Redis**         | **Required** — startup fails fast if unreachable                                               |
| **Auth**          | Required                                                                                       |
| **Trust proxy**   | Required                                                                                       |
| **Start command** | `docker compose -f docker-compose.yml -f docker-compose.scale.yml up --scale command-center=N` |
| **Health check**  | `GET http://127.0.0.1:8080/health/live` (via nginx)                                            |
| **Memory limit**  | 512 MB per instance (see `infra/docker-compose.scale.yml`)                                     |

**Purpose:** Multi-instance deployment with Redis message broker and nginx
reverse proxy. Requires `assertScalePrerequisites()` to pass before startup
(`src/webapp/runtime-profiles.ts`).

---

## 3. Configuration Contract

The following environment variables govern profile selection:

| Variable          | Required | Default       | Notes                                   |
| ----------------- | -------- | ------------- | --------------------------------------- |
| `NODE_ENV`        | Yes      | `development` | Controls profile selection              |
| `RUNTIME_PROFILE` | No       | auto-detected | Override auto-detection                 |
| `PORT`            | No       | `3000`        |                                         |
| `HOST`            | No       | `127.0.0.1`   | Set to `0.0.0.0` inside Docker          |
| `REDIS_URL`       | Cond.    | —             | Required for `production-distributed`   |
| `QUEUE_PROVIDER`  | No       | `in-process`  | `in-process` \| `bullmq`                |
| `SESSION_STORE`   | No       | `memory`      | `memory` \| `redis`                     |
| `AUTH_SECRET`     | Cond.    | —             | Required in production                  |
| `TRUST_PROXY`     | No       | `false`       | Set to `true` if behind a reverse proxy |

---

## 4. Promotion Checklist

Use the [Release Checklist](release-checklist) for step-by-step pre/post
release tasks. The items below are specific to enviroment promotion.

### Promoting to `production-single-node`

- [ ] `npm run build` passes
- [ ] All CI checks green on PR
- [ ] `npm audit` shows no critical/high findings
- [ ] `docker compose up --build` starts, `GET /health/live` returns `200`
- [ ] `CHANGELOG.md` updated, version bumped in `package.json`
- [ ] Git tag created and pushed

### Promoting to `production-distributed`

- [ ] All single-node promotion checks above
- [ ] Redis 7+ instance is reachable at `REDIS_URL`
- [ ] Scale prerequisite script passes: `node scripts/post-deploy-check.mjs --profile production-distributed`
- [ ] `docker compose -f docker-compose.yml -f docker-compose.scale.yml up --scale command-center=2` starts without errors
- [ ] nginx load-balancer health check returns `200` at `GET /health/live`
- [ ] Rollback plan documented (see [Post-Deploy Health Gates](post-deploy-health-gates))

---

## 5. Related Documents

| Document                                             | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| [Release Checklist](release-checklist)               | Full pre/post release steps                       |
| [Post-Deploy Health Gates](post-deploy-health-gates) | Health gate script and rollback automation        |
| [Incident Runbooks](runbooks)                        | Runbooks for Redis outage, provider failure, etc. |
| [Operating Handbook](operating-handbook)             | Day-to-day operations                             |
| `src/webapp/runtime-profiles.ts`                     | Profile contracts in code                         |
| `infra/docker-compose.scale.yml`                     | Distributed deployment configuration              |
