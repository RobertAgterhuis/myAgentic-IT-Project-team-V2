---
title: Framework-Decoupling Migration Runbook
parent: Operations
nav_order: 9
permalink: /framework-decoupling-migration-runbook/
description: >
  Operational migration and rollback procedures for framework-decoupling
  rollout, including pack switch validation, go/no-go criteria, and
  recovery steps.
---

# Framework-Decoupling Migration Runbook

| Field        | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| **Document** | Framework-Decoupling Migration Runbook                                       |
| **Version**  | 1.0                                                                          |
| **Created**  | 2026-03-29                                                                   |
| **Issue**    | #1326 (I-FD-071)                                                             |
| **Scope**    | Runtime pack migration (SDLC compatibility adapter retirement and hardening) |

---

## Purpose

Provide a safe, repeatable procedure to migrate runtime operations from legacy
compatibility behavior to pack-native behavior, with explicit rollback hooks
for service continuity.

## When To Use This Runbook

- During planned framework-decoupling rollout windows.
- When promoting a pack-aware runtime change from staging to production.
- When post-deploy checks indicate regression after migration.

## Preconditions

Before migration, confirm all checks below are green:

1. `npm run build` succeeds in the target release branch.
2. `npm run test` passes in CI for the same commit SHA.
3. `GET /api/orchestrator/templates` returns expected template set and validity.
4. `GET /api/orchestrator/pack-metadata` returns command/stage/gate metadata.
5. `GET /api/orchestrator/dependencies/health` reports `overall_status = healthy`.

If any check fails, stop and use existing release controls in
[Post-Deploy Health Gates](post-deploy-health-gates).

---

## Migration Procedure

### Step 1: Baseline Capture

Capture operational baseline before switching behavior:

1. Export current orchestrator status:

   ```bash
   curl -s http://127.0.0.1:3000/api/orchestrator/status | jq .
   ```

2. Export active pack state:

   ```bash
   curl -s http://127.0.0.1:3000/api/orchestrator/active-pack | jq .
   ```

3. Snapshot command queue and history:

   ```bash
   curl -s http://127.0.0.1:3000/api/orchestrator/run-history | jq .
   curl -s http://127.0.0.1:3000/api/command | jq .
   ```

Store outputs with deployment evidence artifacts.

### Step 2: Controlled Pack Switch Validation

Validate pack switching without kernel code changes:

1. Switch to reference pack:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/active-pack \
     -H "Content-Type: application/json" \
     -d '{"template":"ops-command-center"}'
   ```

2. Queue pack-specific command:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/command \
     -H "Content-Type: application/json" \
     -d '{"command":"TRIAGE","platform":"copilot","project":"migration-validation"}'
   ```

3. Switch back to SDLC pack:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/active-pack \
     -H "Content-Type: application/json" \
     -d '{"template":"sdlc"}'
   ```

4. Queue SDLC command:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/command \
     -H "Content-Type: application/json" \
     -d '{"command":"AUDIT","platform":"copilot","project":"migration-validation"}'
   ```

Expected result: all four calls return success and mode/template stay consistent.

### Step 3: Production Readiness Gate

Proceed only if all criteria pass:

- No `ACTIVE_PACK_SWITCH_ERROR` or mode-compatibility errors.
- Command queue remains readable and consistent.
- Dependency health remains `healthy` through the switch.
- No new control-plane SLO alerts during validation window.

---

## Rollback Procedures

Use rollback when migration validation fails or post-deploy checks regress.

### Rollback Trigger Conditions

Execute rollback immediately if any of the following occurs:

- Repeated `5xx` on `/api/orchestrator/active-pack`.
- Command acceptance mismatch for pack-declared commands.
- Dependency health transitions to `degraded` or `unavailable` and does not recover.
- Operator cannot recover normal command execution within 10 minutes.

### Rollback Actions

1. Pause orchestrator transitions:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/pause \
     -H "Content-Type: application/json" \
     -d '{"rationale":"Rollback initiated after migration regression","requested_by":"oncall"}'
   ```

2. Force active pack to stable baseline (`sdlc`):

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/active-pack \
     -H "Content-Type: application/json" \
     -d '{"template":"sdlc"}'
   ```

3. Reset to stable mode if needed:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/reset \
     -H "Content-Type: application/json" \
     -d '{"mode":"AUDIT"}'
   ```

4. Verify health and status:

   ```bash
   curl -s http://127.0.0.1:3000/api/orchestrator/status | jq .
   curl -s http://127.0.0.1:3000/api/orchestrator/dependencies/health | jq .
   ```

5. Resume orchestrator when stable:

   ```bash
   curl -X POST http://127.0.0.1:3000/api/orchestrator/resume \
     -H "Content-Type: application/json" \
     -d '{"rationale":"Rollback complete; baseline restored","requested_by":"oncall"}'
   ```

---

## Communication Checklist

During migration and rollback windows, publish updates to the incident channel:

1. Start of migration window and target commit SHA.
2. Pack switch validation results.
3. Any rollback trigger hit and mitigation ETA.
4. Recovery confirmation with health/status evidence links.

## Post-Rollback Follow-Up

- Open or update a decision record in `BusinessDocs/decisions/`.
- Attach baseline, failure, and restored-state payloads.
- Capture root cause and required guardrail/test updates.
- Create follow-up issue for remediation before re-attempting migration.
