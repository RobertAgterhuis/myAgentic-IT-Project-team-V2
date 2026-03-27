---
title: Incident Runbooks
parent: Operations
nav_order: 8
permalink: /runbooks/
description: >
  Operational runbooks for Redis outage, provider outage, queue backlog, and
  schema mismatch. Each runbook is testable and links to alert payloads.
---

# Incident Runbooks

| Field             | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| **Document**      | Incident Runbooks                                           |
| **Version**       | 1.0                                                         |
| **Created**       | 2026-03-20                                                  |
| **Audit Finding** | E-C5 (S-C5-2) — Incident runbooks for degraded dependencies |
| **Issue**         | #725 (I-C5-002)                                             |

---

## Alert Payload Reference

Every alert emitted by the platform includes a `runbook` field that links
directly to the relevant section of this document.

```json
{
  "level": "error",
  "event": "alert",
  "code": "REDIS_UNREACHABLE",
  "runbook": "docs/operations/runbooks.md#runbook-rb-001-redis-outage",
  "ts": "2026-03-20T10:00:00.000Z"
}
```

Alert codes and their runbook anchors:

| Alert code             | Runbook anchor                                                     |
| ---------------------- | ------------------------------------------------------------------ |
| `REDIS_UNREACHABLE`    | [#runbook-rb-001-redis-outage](#runbook-rb-001-redis-outage)       |
| `PROVIDER_UNAVAILABLE` | [#runbook-rb-002-provider-outage](#runbook-rb-002-provider-outage) |
| `QUEUE_BACKLOG_HIGH`   | [#runbook-rb-003-queue-backlog](#runbook-rb-003-queue-backlog)     |
| `SCHEMA_MISMATCH`      | [#runbook-rb-004-schema-mismatch](#runbook-rb-004-schema-mismatch) |

---

## Orchestrator Control-Plane Incident Commands {#orchestrator-control-plane-incident-commands}

Use this command set when `GET /api/orchestrator/dependencies/health` reports
`overall_status = degraded` or `overall_status = unavailable`.

### Command Quick Reference

1. Pause orchestrator transitions (stabilize before triage):

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/pause \
     -H "Content-Type: application/json" \
     -d '{"rationale":"Control-plane SLO breach","requested_by":"oncall"}'
   ```

2. Verify dependency health and capture the alert payload:

   ```bash
   curl -s http://127.0.0.1:3000/api/orchestrator/dependencies/health | jq .
   ```

3. Resume orchestrator after mitigation:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/resume \
     -H "Content-Type: application/json" \
     -d '{"rationale":"Dependencies restored","requested_by":"oncall"}'
   ```

4. Roll back to a known-safe command mode if degradation persists:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/reset \
     -H "Content-Type: application/json" \
     -d '{"mode":"AUDIT"}'
   ```

### Escalation Matrix

| Condition                                                       | Escalate to                              | SLA        |
| --------------------------------------------------------------- | ---------------------------------------- | ---------- |
| `CP_PROBE_LATENCY_BREACH` warning persists > 15 minutes         | Platform engineer on-call                | 15 minutes |
| `CP_DEGRADED_DEPENDENCIES_BREACH` warning persists > 10 minutes | Platform engineer + release manager      | 10 minutes |
| `CP_UNAVAILABLE_DEPENDENCIES_BREACH` critical                   | Incident commander + engineering manager | Immediate  |

When escalating, include:

- `overall_status`
- `dependencies` block from the health payload
- `slos.alerts` array
- Current orchestrator mode/state from `GET /api/orchestrator/status`

---

## Runbook RB-001 — Redis Outage {#runbook-rb-001-redis-outage}

**Alert code:** `REDIS_UNREACHABLE`  
**Severity:** CRITICAL (production-distributed) / WARNING (production-single-node)  
**Profile impact:** `production-distributed` — platform fails fast at startup; `production-single-node` / `local-dev` — warning only, platform continues with in-process queue and memory store.

### Symptoms

- Server logs: `"event":"redis_connection_failed"` or `"event":"alert","code":"REDIS_UNREACHABLE"`
- BullMQ workers not processing jobs
- SSE pub/sub events missing across instances (distributed profile only)
- `GET /health/live` returns `200` but `GET /health/ready` returns `503`

### Immediate Response (< 5 min)

1. Confirm Redis is unreachable:

   ```bash
   redis-cli -u "$REDIS_URL" ping
   # Expected: PONG — if timeout or error, Redis is down
   ```

2. Check Docker container status:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml ps redis
   docker compose -f docker-compose.yml -f docker-compose.scale.yml logs redis --tail=50
   ```

3. If the container is stopped, restart it:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d redis
   # Wait for health check to pass (~30 s):
   docker compose -f docker-compose.yml -f docker-compose.scale.yml ps redis
   ```

### Mitigation (5–30 min)

4. If Redis is corrupt or OOM-killed, inspect memory usage:

   ```bash
   redis-cli -u "$REDIS_URL" info memory | grep used_memory_human
   ```

5. If the `maxmemory-policy allkeys-lru` policy has evicted required keys,
   flush the queue and restart workers:

   ```bash
   redis-cli -u "$REDIS_URL" FLUSHDB
   docker compose -f docker-compose.yml -f docker-compose.scale.yml restart command-center
   ```

   > **Warning:** FLUSHDB discards all pending BullMQ jobs. Re-queue any
   > in-flight agent tasks via the Command Center dashboard.

6. Verify platform recovery:

   ```bash
   node scripts/post-deploy-check.mjs --profile production-distributed
   ```

### Rollback (> 30 min, unresolved)

7. Downgrade to `production-single-node` profile until Redis is stable:

   ```bash
   docker compose down
   docker compose up --build
   ```

   In-flight sessions are preserved on the filesystem. Operators can resume
   by typing `CONTINUE` in Copilot Chat.

### Post-Incident

- [ ] Root cause documented in `BusinessDocs/decisions/` (decision ADR format)
- [ ] Redis `maxmemory` limit reviewed and adjusted if needed
- [ ] Alert threshold (`QUEUE_BACKLOG_HIGH`) reviewed
- [ ] Runbook updated if steps were insufficient

---

## Runbook RB-002 — Provider Outage {#runbook-rb-002-provider-outage}

**Alert code:** `PROVIDER_UNAVAILABLE`  
**Severity:** HIGH  
**Profile impact:** All profiles — orchestration stalls; no agent completions; existing session state is preserved.

### Symptoms

- Server logs: `"event":"alert","code":"PROVIDER_UNAVAILABLE"`
- Agent invocations timing out; `POST /api/agents/:id/execute` responds `503`
- Pipeline status shows agents stuck in `running` state
- No new `agent_completion` SSE events

### Immediate Response (< 5 min)

1. Identify which provider is failing (check logs for provider name):

   ```bash
   docker compose logs command-center --tail=100 | grep PROVIDER
   ```

2. Confirm external reachability (example for OpenAI-compatible providers):

   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   # Expected: 200 — any other code confirms outage
   ```

3. Check provider status page (bookmark these):

   | Provider     | Status page                          |
   | ------------ | ------------------------------------ |
   | OpenAI       | <https://status.openai.com>          |
   | Azure OpenAI | <https://azure.status.microsoft.com> |

### Mitigation (5–30 min)

4. If the outage is partial (rate-limited), reduce concurrency:

   Decrease `DISPATCHER_CONCURRENCY_CAP` environment variable and restart:

   ```bash
   # Edit docker-compose override or .env, then:
   docker compose restart command-center
   ```

5. If the outage is total, pause the orchestrator to prevent queue build-up:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/pause \
     -H "Content-Type: application/json" \
     -d '{"reason":"Provider outage — pending recovery"}'
   ```

6. Monitor provider status; resume when stable:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/resume
   ```

### Rollback

7. If the provider is unrecoverable, use the human override to advance with a
   manual completion:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/override \
     -H "Content-Type: application/json" \
     -d '{"agentId":"<id>","rationale":"Provider outage — manual override","result":{"status":"skipped"}}'
   ```

### Post-Incident

- [ ] Outage duration and affected agents logged
- [ ] Consider adding a fallback provider adapter (Out-of-scope for GA; log as
      improvement item in GitHub Issues)
- [ ] Runbook updated if steps were insufficient

---

## Runbook RB-003 — Queue Backlog {#runbook-rb-003-queue-backlog}

**Alert code:** `QUEUE_BACKLOG_HIGH`  
**Severity:** MEDIUM  
**Profile impact:** `production-distributed` (BullMQ) — new agent tasks stall; `production-single-node` / `local-dev` (in-process) — unlikely; check for blocking synchronous operations.

### Symptoms

- Server logs: `"event":"alert","code":"QUEUE_BACKLOG_HIGH"`
- `GET /api/metrics` shows `queue_depth` > threshold (default: 100)
- New agent tasks submitted but not starting for > 60 s
- `concurrencyHighWaterMark` in dispatcher metrics near or at cap

### Immediate Response (< 5 min)

1. Check queue depth and worker concurrency:

   ```bash
   redis-cli -u "$REDIS_URL" LLEN "bull:agent-tasks:wait"
   redis-cli -u "$REDIS_URL" LLEN "bull:agent-tasks:active"
   ```

2. Check dispatcher concurrency metrics:

   ```bash
   curl http://127.0.0.1:3000/api/metrics | node -e \
     "process.stdin.on('data',d=>console.log(JSON.parse(d).dispatcher))"
   ```

3. Check for stalled workers:

   ```bash
   redis-cli -u "$REDIS_URL" LLEN "bull:agent-tasks:stalled"
   ```

### Mitigation (5–30 min)

4. If workers are stalled, force-reset them:

   ```bash
   # Drain stalled jobs back to waiting:
   redis-cli -u "$REDIS_URL" DEL "bull:agent-tasks:stalled"
   docker compose restart command-center
   ```

5. If backlog is due to concurrency cap, scale out:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml \
     up --scale command-center=3 -d
   ```

6. If backlog is due to slow provider responses, pause non-critical tasks:

   Use the orchestrator pause API (see [RB-002 step 5](#runbook-rb-002-provider-outage)).

### Rollback

7. If backlog is undrainable, flush the queue and re-submit tasks manually:

   ```bash
   redis-cli -u "$REDIS_URL" DEL "bull:agent-tasks:wait"
   redis-cli -u "$REDIS_URL" DEL "bull:agent-tasks:active"
   redis-cli -u "$REDIS_URL" DEL "bull:agent-tasks:stalled"
   ```

   > Notify the operator to re-submit affected tasks from the Command Center.

### Post-Incident

- [ ] Root cause documented (provider slowness, capacity, stalled consumer)
- [ ] Concurrency cap tuned in profile configuration
- [ ] Autoscaling policy reviewed
- [ ] Runbook updated if steps were insufficient

---

## Runbook RB-004 — Schema Mismatch {#runbook-rb-004-schema-mismatch}

**Alert code:** `SCHEMA_MISMATCH`  
**Severity:** HIGH  
**Profile impact:** All profiles — session state may fail to load or parse; agent execution blocked until resolved.

### Symptoms

- Server logs: `"event":"alert","code":"SCHEMA_MISMATCH"` with `field` and `expected`/`actual` values
- `GET /api/orchestrator/status` returns `500` or `422`
- Session state file fails to parse on startup
- Backup `.bak` file created by server before overwrite attempt

### When Schema Mismatches Occur

Schema mismatches are most common after:

1. Rolling back to a previous release while session state was written by a newer
   version
2. Manual edits to `docs/session/session-state.json`
3. Upgrading across a breaking schema change (major version bump)
4. A partial write that left the JSON file in a corrupted state

### Immediate Response (< 5 min)

1. Identify the affected file and field:

   ```bash
   docker compose logs command-center --tail=50 | grep SCHEMA_MISMATCH
   ```

2. Inspect the current session state:

   ```bash
   cat docs/session/session-state.json | node -e \
     "process.stdin.on('data',d=>{ try{ JSON.parse(d); console.log('JSON valid'); } catch(e){ console.error('INVALID JSON:', e.message); } })"
   ```

3. Check for a backup:

   ```bash
   # Windows:
   Get-ChildItem docs/session/ -Filter *.bak | Sort-Object LastWriteTime -Descending | Select-Object -First 5
   # Linux/macOS:
   ls -lt docs/session/*.bak | head -5
   ```

### Mitigation (5–30 min)

4. If a valid backup exists, restore it:

   ```bash
   # Identify the last good backup, e.g. session-state.json.bak
   cp docs/session/session-state.json.bak docs/session/session-state.json
   ```

5. Restart the server and verify:

   ```bash
   docker compose restart command-center
   curl http://127.0.0.1:3000/health/live
   curl http://127.0.0.1:3000/api/orchestrator/status
   ```

6. If no backup exists and the JSON is corrupt, reset session state:

   ```bash
   rm docs/session/session-state.json
   docker compose restart command-center
   ```

   The Orchestrator will initialize a fresh session. Type `CONTINUE` in Copilot
   Chat to resume from the last phase outputs.

### Migration Path (Breaking Schema Change)

7. When upgrading across a major version bump that changes the session schema:

   a. Back up the current state:

   ```bash
   cp docs/session/session-state.json docs/session/session-state.json.pre-vX.bak
   ```

   b. Run the migration script (when available):

   ```bash
   npx tsx scripts/migrate-storage.ts
   ```

   c. Validate the migrated file:

   ```bash
   node -e "JSON.parse(require('fs').readFileSync('docs/session/session-state.json','utf8')); console.log('OK')"
   ```

### Post-Incident

- [ ] Schema version field added to `session-state.json` if not present
- [ ] Migration script created or updated for the breaking change
- [ ] Release notes updated with migration instructions
- [ ] Runbook updated if steps were insufficient

---

## Testing These Runbooks

All runbooks are designed to be rehearsed without a real production incident.
Use the following test commands to validate each runbook:

### Test RB-001 (Redis Outage Simulation)

```bash
# Stop Redis and confirm platform response
docker compose -f docker-compose.yml -f docker-compose.scale.yml stop redis
docker compose logs command-center --tail=20 | grep "REDIS\|alert"
# Expected: REDIS_UNREACHABLE alert emitted, platform falls back or fails fast per profile
docker compose -f docker-compose.yml -f docker-compose.scale.yml start redis
```

### Test RB-002 (Provider Outage Simulation)

```bash
# Pause orchestrator (simulates provider block)
curl -X POST http://127.0.0.1:3000/api/orchestrator/pause \
  -H "Content-Type: application/json" \
  -d '{"reason":"Runbook test RB-002"}'
# Verify status
curl http://127.0.0.1:3000/api/orchestrator/status | node -e \
  "process.stdin.on('data',d=>console.log(JSON.parse(d).status))"
# Expected: paused
curl -X POST http://127.0.0.1:3000/api/orchestrator/resume
```

### Test RB-003 (Queue Backlog Simulation)

```bash
# Check current queue depth
redis-cli -u "${REDIS_URL:-redis://127.0.0.1:6379}" LLEN "bull:agent-tasks:wait"
# Submit several rapid tasks via the API and observe queue_depth in metrics
curl http://127.0.0.1:3000/api/metrics | node -e \
  "process.stdin.on('data',d=>{ const m=JSON.parse(d); console.log('queue_depth:', m.queue?.depth); })"
```

### Test RB-004 (Schema Mismatch Simulation)

```bash
# Corrupt a field in session state (safe test: edit a non-critical field)
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('docs/session/session-state.json','utf8'));
s.__test_schema_field = { unexpected: true };
fs.writeFileSync('docs/session/session-state.json.test', JSON.stringify(s));
console.log('Test file written — restore from .bak after test');
"
```

---

## Related Documents

| Document                                                       | Purpose                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| [Release Topology and Environment Contracts](release-topology) | Profile definitions and promotion gates |
| [Post-Deploy Health Gates](post-deploy-health-gates)           | Health gate script and rollback hooks   |
| [Operating Handbook](operating-handbook)                       | Day-to-day operations                   |
| [CI Health Review](ci-health-review)                           | Pipeline health monitoring              |
| `src/webapp/runtime-profiles.ts`                               | Profile contracts in code               |
| `platform/engine/dispatcher.ts`                                | Dispatcher concurrency implementation   |
