---
title: Orchestrator API
parent: API Reference
nav_order: 5
description: State machine engine — templates, advance, reset, gate validation.
---

# Orchestrator API

**Module:** `routes/orchestrator.ts`
**Auth required:** No

The orchestrator manages the SDLC state machine — advancing through phases,
validating gates, and executing commands across agent platforms.

---

## GET /api/orchestrator/templates

List available orchestrator templates.

**Response — 200 OK:**

```json
{
  "ok": true,
  "templates": [
    {
      "id": "full-create",
      "name": "Full Create",
      "description": "Complete SDLC cycle",
      "phases": [
        "ONBOARDING",
        "PHASE-1",
        "PHASE-2",
        "PHASE-3",
        "PHASE-4",
        "SYNTHESIS",
        "PHASE-5"
      ]
    }
  ]
}
```

---

## GET /api/orchestrator/status

Get the current engine state.

**Response — 200 OK:**

```json
{
  "ok": true,
  "status": {
    "state": "RUNNING",
    "mode": "FULL_CREATE",
    "phase": "PHASE-2",
    "agent": "05-software-architect",
    "phase_outputs": {},
    "completed_phases": ["ONBOARDING", "PHASE-1"],
    "error": null
  }
}
```

---

## POST /api/orchestrator/advance

Advance the state machine to the next state.

**Request body:**

| Field        | Type   | Required | Description                     |
| ------------ | ------ | -------- | ------------------------------- |
| `gateResult` | object | No       | Gate validation result to apply |

**Example:**

```bash
curl -X POST http://localhost:3000/api/orchestrator/advance \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "transition": {
    "from": "PHASE-2",
    "to": "PHASE-3",
    "agent": "10-ux-designer"
  },
  "status": { "state": "RUNNING", "phase": "PHASE-3" }
}
```

---

## POST /api/orchestrator/error

Force the engine into ERROR state.

**Request body:**

| Field    | Type   | Required | Description                 |
| -------- | ------ | -------- | --------------------------- |
| `reason` | string | Yes      | Error reason (1–2000 chars) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/orchestrator/error \
  -H "Content-Type: application/json" \
  -d '{"reason": "Gate validation failed: missing deliverables"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "status": {
    "state": "ERROR",
    "error": "Gate validation failed: missing deliverables"
  }
}
```

---

## POST /api/orchestrator/recover

Recover from ERROR state back to the previous running state.

**Request body:** None

**Response — 200 OK:**

```json
{
  "ok": true,
  "recoveredState": "PHASE-2",
  "status": { "state": "RUNNING", "phase": "PHASE-2" }
}
```

---

## POST /api/orchestrator/reset

Reset the engine with a new mode and phase configuration.

**Request body:**

| Field      | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| `mode`     | string | Yes      | Cycle mode (1–50 chars)              |
| `phases`   | array  | No       | Array of phase keys to include       |
| `template` | string | No       | Template ID to apply (max 100 chars) |

**Example:**

```bash
curl -X POST http://localhost:3000/api/orchestrator/reset \
  -H "Content-Type: application/json" \
  -d '{"mode": "COMBO_AUDIT", "template": "audit-only"}'
```

**Response — 200 OK:**

```json
{
  "ok": true,
  "status": { "state": "IDLE", "mode": "COMBO_AUDIT", "phase": null }
}
```

---

## POST /api/orchestrator/validate-gate

Validate deliverables against gate policies.

**Request body:**

| Field          | Type  | Required | Description                  |
| -------------- | ----- | -------- | ---------------------------- |
| `deliverables` | array | Yes      | Array of deliverable objects |

**Response — 200 OK:**

```json
{
  "ok": true,
  "verdict": "PASS",
  "summary": {
    "phase": "PHASE-2",
    "violations": 0,
    "descriptions": []
  }
}
```

---

## POST /api/orchestrator/command

Execute an orchestrator command.

**Request body:**

| Field      | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `command`  | string | Yes      | Command string                                   |
| `platform` | string | No       | Target platform: `copilot`, `claude`, or `codex` |

**Response — 200 OK:**

```json
{ "ok": true, "result": { "command": "CREATE", "status": "EXECUTED" } }
```

---

## GET /api/orchestrator/run-history

Get the history of orchestrator runs.

**Response — 200 OK:**

```json
{ "ok": true, "runs": [] }
```

---

## POST /api/orchestrator/stop

Stop the currently running orchestrator.

**Response — 200 OK:**

```json
{ "ok": true }
```

---

## POST /api/orchestrator/sprint-gate

Trigger a sprint gate evaluation.

**Response — 200 OK:**

```json
{ "ok": true }
```
