---
title: Post-Deploy Health Gates and Rollback Hooks
parent: Operations
nav_order: 9
permalink: /post-deploy-health-gates/
description: >
  Automated health gate script and rollback automation hooks for every
  deployment. Covers single-node and distributed profiles.
---

# Post-Deploy Health Gates and Rollback Automation Hooks

| Field             | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| **Document**      | Post-Deploy Health Gates and Rollback Automation Hooks      |
| **Version**       | 1.0                                                         |
| **Created**       | 2026-03-20                                                  |
| **Audit Finding** | E-C5 (S-C5-3) — Deployment verification and rollback checks |
| **Issue**         | #726 (I-C5-003)                                             |

---

## 1. Overview

After every deployment the health gate script `scripts/post-deploy-check.mjs`
must be run before the deployment is declared stable. If any gate fails, the
script exits non-zero and the rollback sequence is triggered automatically.

```
Deploy  ──▶  Health Gate Script  ──▶  PASS ──▶  Mark deployment stable
                    │
                  FAIL
                    │
                    ▼
             Rollback Hook  ──▶  Restore previous image / tag  ──▶  Notify operator
```

---

## 2. Health Gate Script — `scripts/post-deploy-check.mjs`

Location: [`scripts/post-deploy-check.mjs`](../../scripts/post-deploy-check.mjs)

### Usage

```bash
# Basic health check (defaults to localhost:3000):
node scripts/post-deploy-check.mjs

# With explicit profile and base URL:
node scripts/post-deploy-check.mjs --profile production-distributed --base-url http://127.0.0.1:8080

# Exit code 0 = all gates passed; non-zero = failure
```

### Gates Executed

| Gate | ID   | Endpoint / Check                 | Pass Criteria                                                      |
| ---- | ---- | -------------------------------- | ------------------------------------------------------------------ |
| 1    | G-01 | `GET /health/live`               | HTTP 200 within 5 s                                                |
| 2    | G-02 | `GET /health/ready`              | HTTP 200 within 10 s                                               |
| 3    | G-03 | `GET /api/orchestrator/status`   | HTTP 200, `status` field present                                   |
| 4    | G-04 | `GET /api/metrics`               | HTTP 200, `dispatcher` field present                               |
| 5    | G-05 | Redis connectivity (distributed) | `redis-cli ping` returns PONG (skipped if not distributed)         |
| 6    | G-06 | Session state readable           | `docs/session/session-state.json` is valid JSON (single-node only) |

---

## 3. Rollback Automation Hooks

### 3.1 Docker-based rollback (recommended)

The recommended rollback strategy uses Docker image tags. Before every
deployment, tag the current running image:

```bash
# Tag current image as rollback target (run before deploying new version):
docker tag myagentic-command-center:latest myagentic-command-center:rollback

# After a failed health gate, execute rollback:
docker compose down
docker tag myagentic-command-center:rollback myagentic-command-center:latest
docker compose up -d
node scripts/post-deploy-check.mjs
```

### 3.2 Git-tag rollback

For source-based deployments (no pre-built image):

```bash
# Find the previous stable tag:
git tag --sort=-version:refname | head -5

# Roll back to that tag:
git checkout vX.Y.Z-previous
npm install
npm run build
npm start &
node scripts/post-deploy-check.mjs
```

### 3.3 Distributed profile rollback sequence

When running `production-distributed` with multiple instances and nginx:

1. Drain the load balancer before rolling back:

   ```bash
   # Remove all command-center instances from rotation:
   docker compose -f docker-compose.yml -f docker-compose.scale.yml \
     up --scale command-center=0 -d
   ```

2. Restore the previous image tag (see 3.1 above).

3. Bring back one instance and verify health gates:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml \
     up --scale command-center=1 -d
   node scripts/post-deploy-check.mjs --profile production-distributed
   ```

4. Scale back to full capacity if health gates pass:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml \
     up --scale command-center=3 -d
   ```

---

## 4. Integrating Health Gates into CI/CD

Add the following step to your GitHub Actions workflow after the Docker
build-and-push step:

```yaml
- name: Post-deploy health gate
  run: |
    # Wait for container to be ready
    sleep 10
    node scripts/post-deploy-check.mjs --base-url http://127.0.0.1:3000
  env:
    REDIS_URL: ${{ secrets.REDIS_URL }}
```

If this step fails, the workflow exits non-zero and GitHub Actions prevents
the deployment from being merged.

---

## 5. Manual Health Gate Checklist

When the automated script is not available, use this manual checklist:

### After single-node deployment

- [ ] `GET http://127.0.0.1:3000/health/live` returns `200`
- [ ] `GET http://127.0.0.1:3000/health/ready` returns `200`
- [ ] `GET http://127.0.0.1:3000/api/orchestrator/status` returns `200` with `status` field
- [ ] `GET http://127.0.0.1:3000/api/metrics` returns `200` with `dispatcher` field
- [ ] `docs/session/session-state.json` is valid JSON
- [ ] No `ERROR` level events in `docker compose logs` or terminal output
- [ ] Browser opens Command Center at `http://127.0.0.1:3000` without errors

### After distributed deployment

All single-node checks plus:

- [ ] `redis-cli -u "$REDIS_URL" ping` returns `PONG`
- [ ] `GET http://127.0.0.1:8080/health/live` (nginx) returns `200`
- [ ] SSE events flowing to browser (Pipeline tab shows live updates)
- [ ] Multiple instances visible: `docker compose ps | grep command-center`
- [ ] `GET /api/metrics` shows `queue_depth: 0` or expected value

---

## 6. Rollback Decision Matrix

| Scenario                           | Action                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| G-01 (liveness) fails              | Hard rollback immediately                                                                    |
| G-02 (readiness) fails within 60 s | Wait 30 s, retry; rollback if still failing                                                  |
| G-03 (orchestrator status) fails   | Check logs; rollback if schema mismatch found                                                |
| G-04 (metrics) fails               | Log but continue (non-blocking for GA)                                                       |
| G-05 (Redis) fails                 | Execute [RB-001 Redis Outage](runbooks#runbook-rb-001-redis-outage) before rollback decision |
| G-06 (session state) fails         | Execute [RB-004 Schema Mismatch](runbooks#runbook-rb-004-schema-mismatch)                    |

---

## 7. Related Documents

| Document                                                       | Purpose                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| [Release Topology and Environment Contracts](release-topology) | Environment promotion strategy          |
| [Incident Runbooks](runbooks)                                  | Runbooks for specific failure scenarios |
| [Release Checklist](release-checklist)                         | Full pre/post release steps             |
| [Operating Handbook](operating-handbook)                       | Day-to-day operations and recovery      |
| `scripts/post-deploy-check.mjs`                                | Automated health gate script            |
