# Kanban Integration — Override Model

> Source: `src/webapp/routes/approvals.ts`, `BusinessDocs/session/human-override-events.json`  
> Status: CANONICAL

---

## Design principle

The board is a read-mostly view. The orchestrator FSM owns all state. An operator cannot drag a card to an arbitrary column and have it take effect — that would corrupt the governance audit trail.

Override moves are implemented as controlled orchestrator API calls, not direct state writes.

---

## What is an "override move"?

An override move is when a human with sufficient authority wants to:

1. **Force-transition** a session past a gate it is stuck at (override gate failure)
2. **Pause** a session that is running
3. **Resume** a session that is paused
4. **Reroute** a session to a different phase (e.g., skip a phase, re-run a phase)
5. **Cancel** a session (move to a terminal state)

---

## Override move design

### Step 1: User initiates

- User right-clicks card → context menu
- Or user drags card to an adjacent column

For drag-and-drop: the drop target column must be a valid transition destination for the session's current state. Invalid drops are rejected by the UI with a descriptive tooltip.

### Step 2: Confirmation dialog

Before any override, the UI shows a confirmation dialog with:

- Session ID
- Current state
- Target state
- Required role (pulled from approval configuration)
- Mandatory override reason (free text, required field)
- Warning: "This action will be logged to the governance audit trail."

The "Confirm" button is disabled until a reason is entered.

### Step 3: API call

The override calls the appropriate orchestrator endpoint:

| Override type   | Endpoint                                  | Payload                                                                                                                   |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pause session   | `POST /api/v1/orchestrator/command`       | `{ command: "PAUSE", session_id, reason }`                                                                                |
| Resume session  | `POST /api/v1/orchestrator/command`       | `{ command: "RESUME", session_id, reason }`                                                                               |
| Force gate pass | `POST /api/v1/approvals/:gate_id/approve` | `{ approved: true, notes: reason }`                                                                                       |
| Cancel session  | `POST /api/v1/orchestrator/command`       | `{ command: "CANCEL", session_id, reason }`                                                                               |
| Reroute session | `POST /api/v1/orchestrator/command`       | `{ command: "REROUTE", session_id, target_phase, reason }` — INSUFFICIENT_DATA: verify this endpoint exists or is planned |

### Step 4: Audit trail write

The orchestrator writes to `human-override-events.json` (pattern already established). Event record:

```json
{
  "event_id": "uuid",
  "session_id": "uuid",
  "override_type": "FORCE_GATE_PASS | PAUSE | RESUME | CANCEL | REROUTE",
  "operator": "user identity from auth context",
  "reason": "free text from confirmation dialog",
  "from_state": "CRITIC_1",
  "to_state": "PHASE_2",
  "timestamp": "ISO-8601"
}
```

### Step 5: Board updates

On API success, the session's `current_phase` updates. The board re-fetches (or receives SSE event) and moves the card to the new column. The override badge is shown on the card for a configurable period (e.g., 15 minutes) as a visual signal to other team members.

---

## Role enforcement

The board enforces role requirements **before** showing the override option:

- Read-only users: no context menu override options visible
- Operator role: pause/resume available
- Senior operator / admin: all overrides including force gate pass and reroute

Role is checked against the existing auth context (the platform already has role-based approval routing).

---

## What drag-and-drop is NOT allowed to do

| Action                                    | Permitted               | Reason                                            |
| ----------------------------------------- | ----------------------- | ------------------------------------------------- |
| Move card to same column                  | No                      | No-op                                             |
| Move card 2+ columns forward              | No                      | Skipping phases requires explicit reroute command |
| Move card backwards                       | No (except via reroute) | Backward transitions not in FSM                   |
| Move to COMPLETED from non-terminal state | No                      | Terminal states only reachable from FSM           |
| Move HOTFIX card to gate column           | No                      | Hotfix mode bypasses gates by design              |

---

## Override audit in board UI

A toggle in the board toolbar: "Show override events."

When on: cards that have been overridden in the last N hours show an `OVERRIDE` badge. Hovering the badge shows: who overrode, when, and reason.

This allows managers to see which sessions received manual intervention without accessing the raw JSON logs.
