# Kanban Integration — Badge Rules

> Source: `src/webapp/types/api-types.ts`, `platform/schema/phase-exit-criteria.json`  
> Status: CANONICAL

---

## Badge system overview

Badges appear on a card to signal conditions beyond column position. They are computed at render time from live session data. They are **not stored** — they are always derived from the canonical state.

---

## Badge definitions

### BLOCKED

| Property | Value                 |
| -------- | --------------------- |
| Trigger  | `blockers.length > 0` |
| Color    | Orange                |
| Position | Card top-right        |
| Priority | High                  |

**Display:** `⚠ BLOCKED (N)` where N = count

**Tooltip content:** List of `blockers[]` items for the session.

**Related action:** None from badge — user opens cockpit detail to resolve.

---

### ESCALATION

| Property | Value                               |
| -------- | ----------------------------------- |
| Trigger  | `open_human_escalations.length > 0` |
| Color    | Red                                 |
| Position | Card top-right                      |
| Priority | Critical                            |

**Display:** `🔔 ESCALATION (N)` where N = count

**Tooltip content:** List of escalation descriptions.

**Related action:** Clicking badge opens inline approval panel for the session.

---

### APPROVAL PENDING

| Property | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Trigger  | Any `ApprovalEntry` with `status === 'pending'` for this session |
| Color    | Yellow                                                           |
| Position | Card secondary area                                              |
| Priority | Medium                                                           |

**Display:** `⏳ APPROVAL PENDING`

**Tooltip content:** Gate name, required role, time waiting.

**Related action:** Clicking routes to approval detail view.

---

### PAUSED

| Property | Value                              |
| -------- | ---------------------------------- |
| Trigger  | `SessionState.status === 'paused'` |
| Color    | Yellow                             |
| Position | Card top                           |
| Priority | Medium                             |

**Display:** `⏸ PAUSED`

**Tooltip content:** Time since paused, who paused it (from `human-override-events.json` if available).

**Related action:** Authorized users see Resume button in card context menu.

---

### ERROR

| Property | Value                                                             |
| -------- | ----------------------------------------------------------------- |
| Trigger  | `SessionState.status === 'failed'` OR `current_phase === 'ERROR'` |
| Color    | Red                                                               |
| Position | Card top                                                          |
| Priority | Critical                                                          |

**Display:** `✗ ERROR`

**Tooltip content:** Last known state before error, last agent, crash recovery event if present.

**Related action:** Opens Root-Cause Analysis tab in cockpit.

---

### GATE FAILED

| Property | Value                                                                                    |
| -------- | ---------------------------------------------------------------------------------------- |
| Trigger  | Current phase is `CRITIC_N` AND gate evaluation returned at least one blocking condition |
| Color    | Red                                                                                      |
| Position | Card secondary area                                                                      |
| Priority | High                                                                                     |

**Display:** `✗ GATE FAILED (N conditions)`

**Tooltip content:** Which blocking conditions failed (B1-GATE-001, B1-GATE-002, B1-GATE-003).

**Related action:** Opens gate evaluation detail in cockpit.

---

### HOTFIX MODE

| Property | Value                     |
| -------- | ------------------------- |
| Trigger  | `cycle_type === 'HOTFIX'` |
| Color    | Red-dark                  |
| Position | Card top-left             |
| Priority | Informational             |

**Display:** `🔥 HOTFIX`

**Tooltip content:** "This session bypasses all Critic gates."

**Related action:** None.

---

### LOW CONFIDENCE

| Property | Value                                             |
| -------- | ------------------------------------------------- |
| Trigger  | `confidence_score < 0.6` (threshold configurable) |
| Color    | Orange                                            |
| Position | Card secondary area                               |
| Priority | Medium                                            |

**Display:** `↓ LOW CONFIDENCE (58%)`

**Note:** INSUFFICIENT_DATA: confidence_score field path in API response was not confirmed during codebase exploration. Verify field name before implementing this badge. If no confidence field exists at the session level, badge is deferred to M3.

---

### STALE

| Property | Value                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------ |
| Trigger  | `last_updated` is older than configurable threshold (default: 2 hours) AND `status === 'active'` |
| Color    | Gray                                                                                             |
| Position | Card bottom                                                                                      |
| Priority | Low                                                                                              |

**Display:** `⏰ STALE (Xh inactive)`

**Tooltip content:** Time since last activity.

**Related action:** None — informational only.

---

## Badge priority and stacking

When multiple badges apply, they render in priority order:

1. ERROR (critical, overrides most others)
2. ESCALATION (critical, human action required)
3. GATE FAILED (high, gate is blocking progression)
4. BLOCKED (high)
5. PAUSED (medium)
6. APPROVAL PENDING (medium)
7. LOW CONFIDENCE (medium)
8. HOTFIX MODE (informational, always visible if applicable)
9. STALE (low, only shown when no higher-priority badge present)

Maximum 3 badges visible on collapsed card. Overflow badge: `+N more`.

---

## Column-level aggregate badges

Column headers show aggregate signals:

| Signal                | Trigger                                  | Display                 |
| --------------------- | ---------------------------------------- | ----------------------- |
| Escalations in column | Any card with ESCALATION badge           | `🔔 N` in column header |
| Blocked in column     | Any card with BLOCKED badge              | `⚠ N` in column header  |
| Gate failures         | Any card in gate column with GATE FAILED | `✗ N` in column header  |

These allow operators to scan the board header row for systemic problems without reading each card.
