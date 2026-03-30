# Kanban Integration — Card Schema

> Source: `src/webapp/types/api-types.ts`, `BusinessDocs/session/transition-lease.json`  
> Status: CANONICAL

---

## Card = one session

Each Kanban card represents exactly one SDLC session. A session is identified by `session_id` and has a 1:1 relationship with a run of the orchestrator FSM.

---

## Card field schema

| Field                    | Display label     | Source field                            | API endpoint                           |
| ------------------------ | ----------------- | --------------------------------------- | -------------------------------------- |
| `session_id`             | Session ID        | `SessionState.session_id`               | `GET /api/v1/sessions/:id`             |
| `cycle_type`             | Command mode      | `SessionState.cycle_type`               | `GET /api/v1/sessions/:id`             |
| `status`                 | Session status    | `SessionState.status`                   | `GET /api/v1/sessions/:id`             |
| `current_phase`          | Phase             | `SessionState.current_phase`            | `GET /api/v1/sessions/:id`             |
| `current_agent`          | Active agent      | `SessionState.current_agent`            | `GET /api/v1/sessions/:id`             |
| `initiated_at`           | Started           | `SessionState.initiated_at`             | `GET /api/v1/sessions/:id`             |
| `last_updated`           | Last activity     | `SessionState.last_updated`             | `GET /api/v1/sessions/:id`             |
| `blockers`               | Blockers count    | `SessionState.blockers[]`               | `GET /api/v1/sessions/:id`             |
| `open_human_escalations` | Escalations       | `SessionState.open_human_escalations[]` | `GET /api/v1/sessions/:id`             |
| `completed_phases`       | Progress          | `SessionState.completed_phases[]`       | `GET /api/v1/sessions/:id`             |
| `approval_status`        | Pending approvals | `ApprovalEntry.status`                  | `GET /api/v1/approvals?session_id=:id` |
| `confidence_score`       | Confidence        | Health endpoint or phase outputs        | `GET /api/v1/sessions/:id/health`      |

---

## Card layout

```
┌─────────────────────────────────────────┐
│ [HOTFIX]  session-id-short   [BLOCKED]  │  ← badges
│                                         │
│ Feature: User Auth Redesign             │  ← project/session name
│ cycle_type: CREATE                      │  ← command mode
│                                         │
│ Phase: PHASE_1              PHASE_1/4   │  ← current phase + progress
│ Agent: Business Analyst     ████░░░░    │  ← active agent + progress bar
│                                         │
│ Escalations: 2   Blockers: 1           │  ← warning badges
│ Approvals pending: 1                    │
│                                         │
│ Started: 2h ago   Last active: 12m ago  │  ← timestamps
└─────────────────────────────────────────┘
```

---

## Field type definitions

### `session_id`

- Type: `string` (UUID)
- Display: shortened (first 8 chars) with copy-to-clipboard action
- Navigation: clicking session ID opens cockpit detail view for that session

### `cycle_type`

- Type: `string` enum
- Values: `CREATE | AUDIT | CREATE_BUSINESS | CREATE_TECH | CREATE_UX | CREATE_MARKETING | FEATURE | SCOPE_CHANGE | HOTFIX`
- Display: colored tag. HOTFIX renders red. CREATE renders primary. AUDIT renders neutral.

### `status`

- Type: `string` enum
- Values: `active | completed | failed | paused`
- Rendering:
  - `active` → green indicator dot
  - `paused` → yellow indicator dot + `PAUSED` badge
  - `failed` → red indicator dot + `ERROR` badge
  - `completed` → gray (card only shown for a configurable retention window)

### `current_phase`

- Type: `string` — maps to column
- This is the primary field determining which column the card sits in
- Value is the FSM state name (e.g., `PHASE_1`, `CRITIC_2`, `PHASE_5_EXECUTING`)

### `current_agent`

- Type: `string` — agent name
- Display: human-readable agent name from agent-phase-map
- Only shown when session is `active`

### `blockers`

- Type: `string[]`
- Display: count badge in orange (`⚠ 2 blockers`) when count > 0
- Expanding card shows list of blocker descriptions

### `open_human_escalations`

- Type: `string[]`
- Display: count badge in red (`🔔 1 escalation`) when count > 0
- These are approvals or intervention requests pending human action

### `completed_phases`

- Type: `string[]`
- Display: progress bar showing completed phases / total expected phases (based on command mode)
- Example: `CREATE` mode has 4 phases (PHASE_1–4), so 2 completed = 50%

### `approval_status`

- Type: derived from `ApprovalEntry.status`
- Values: `pending | approved | rejected`
- Display: badge on card when there are pending approvals

### `confidence_score`

- Type: `number` (0–1 range assumed)
- Display: percentage or colored confidence bar
- Source: `phase_outputs` or a dedicated health endpoint
- INSUFFICIENT_DATA: exact confidence field name in `phase_outputs` was not confirmed in exploration — verify against `GET /api/v1/sessions/:id` response shape before implementing

---

## Card interaction model

| Interaction                  | Action                                           | Permitted             |
| ---------------------------- | ------------------------------------------------ | --------------------- |
| Click card                   | Open cockpit detail (session view)               | Yes                   |
| Hover column header          | Show WIP count                                   | Yes                   |
| Drag card to adjacent column | Controlled override (see `04-override-model.md`) | Restricted            |
| Right-click card             | Context menu: Pause, Escalate, View log          | Yes (with role check) |
| Click escalation badge       | Open approval panel inline                       | Yes                   |
| Click blocker badge          | Expand blocker list                              | Yes (read only)       |

---

## Card skeleton state (loading)

While live data loads, cards render as skeletons matching the layout above. Session list is fetched from `GET /api/v1/sessions` (paginated). Board subscribes to session update events (SSE or polling on 30s interval) to keep cards live without full page reload.

---

## Card sort order within a column

Default sort: `last_updated DESC` (most recently active at top).

Alternative sorts (user configurable):

- `initiated_at ASC` — oldest first (FIFO queue view)
- `open_human_escalations DESC` — escalations first
- `blockers DESC` — most blocked first

---

## WIP limit display

Each column header shows:

- Current count of active sessions in that column
- Configurable soft WIP limit (visual warning at threshold, not enforcement)
- Example: `PHASE_1 (3/5)` — 3 of 5 WIP limit used

WIP limit is advisory. The FSM controls session concurrency, not the board.
