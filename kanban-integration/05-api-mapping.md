# Kanban Integration — API Mapping

> Source: `src/webapp/routes/`, `src/webapp/types/api-types.ts`  
> Status: CANONICAL

---

## Existing endpoints (no new backend work needed for M1–M2)

| Purpose                   | Method | Endpoint                           | Response fields used                                                                              |
| ------------------------- | ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| List all sessions         | `GET`  | `/api/v1/sessions`                 | `session_id, cycle_type, status, current_phase, initiated_at, last_updated`                       |
| Get session detail        | `GET`  | `/api/v1/sessions/:id`             | Full `SessionState` including `blockers, open_human_escalations, completed_phases, current_agent` |
| Get approvals for session | `GET`  | `/api/v1/approvals?session_id=:id` | `ApprovalEntry: { id, gate_id, status, required_role, created_at }`                               |
| Approve a gate            | `POST` | `/api/v1/approvals/:id/approve`    | Used for forced gate pass override                                                                |
| Reject a gate             | `POST` | `/api/v1/approvals/:id/reject`     | Available                                                                                         |
| Get artifacts             | `GET`  | `/api/v1/artifacts`                | Used in card detail expand (phase outputs)                                                        |
| Post orchestrator command | `POST` | `/api/v1/orchestrator/command`     | Used for pause/resume/cancel overrides                                                            |

---

## Endpoints that may need to be created or extended (M3–M4)

| Purpose                           | Method | Endpoint                                           | Notes                                                                                                                     |
| --------------------------------- | ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Session health / confidence score | `GET`  | `/api/v1/sessions/:id/health`                      | UNCERTAIN: confirm whether this endpoint exists or needs to be created. Confidence score source unknown from exploration. |
| Session list with filter          | `GET`  | `/api/v1/sessions?status=active&phase=PHASE_1`     | May need query param filter support if not already present                                                                |
| Reroute command                   | `POST` | `/api/v1/orchestrator/command` with `REROUTE` type | UNCERTAIN: confirm REROUTE command type is implemented in orchestrator                                                    |
| SSE / live session events         | `GET`  | `/api/v1/sessions/events` (SSE stream)             | UNCERTAIN: SSE endpoint may not exist; polling fallback is acceptable for M2                                              |

---

## Board data flow

```
Board component
    │
    ├── On mount: GET /api/v1/sessions
    │       → Populate all columns with session cards
    │
    ├── Per-card expand: GET /api/v1/sessions/:id
    │       → Load full session detail for card overlay
    │
    ├── Per-card approvals: GET /api/v1/approvals?session_id=:id
    │       → Show APPROVAL PENDING badge and approval actions
    │
    ├── Polling (30s): GET /api/v1/sessions (or SSE if available)
    │       → Live updates — cards move columns as phases progress
    │
    └── Override action: POST /api/v1/orchestrator/command OR approvals endpoint
            → After success, re-fetch affected session
```

---

## Backend work priority by milestone

### M1: Data & API layer

Must verify / create:

- `GET /api/v1/sessions` returns all fields needed for card rendering (listed above)
- `GET /api/v1/sessions` supports pagination (board may show 50+ concurrent sessions in large deployments)
- `blockers` and `open_human_escalations` arrays are present and populated in `SessionState`

### M2: Board UI shell

Consumes:

- `GET /api/v1/sessions` — for column population
- No new endpoints required

### M3: Live state + card schema

Consumes:

- SSE or polling endpoint
- Session health / confidence endpoint (new or verified)

### M4: Write-back + overrides

Consumes:

- `POST /api/v1/orchestrator/command` — pause/resume/cancel/reroute
- `POST /api/v1/approvals/:id/approve` — forced gate pass

---

## Polling vs SSE recommendation

Polling (30s interval) is acceptable for M2 and carries no new backend requirements. SSE provides a better operator experience but requires a server-side event stream endpoint.

Recommend starting with polling in M2, adding SSE in M3 if latency is a concern.
