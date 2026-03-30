# Kanban Integration — Column Schema

> Status: CANONICAL  
> Source: `platform/engine/state-machine.ts`, `platform/engine/flows.yaml`

---

## Column definitions

Each column maps directly to one or more FSM states. Column label is human-readable. FSM states are the authoritative key.

---

### Column 1: Intake

| Property             | Value                             |
| -------------------- | --------------------------------- |
| Label                | Intake                            |
| FSM states           | `IDLE`, `ONBOARDING`              |
| Position             | 1                                 |
| Gate-blocked         | No                                |
| Can accept drag-drop | No — only created by orchestrator |

**Description:** Sessions waiting to begin or completing onboarding setup. Cards in `ONBOARDING` state are running the onboarding agent and collecting project context.

---

### Column 2: Business Analysis

| Property             | Value             |
| -------------------- | ----------------- |
| Label                | Business Analysis |
| FSM states           | `PHASE_1`         |
| Position             | 2                 |
| Gate-blocked         | No                |
| Can accept drag-drop | No                |

**Description:** Agents 01–04 and 34 active (Business Analyst, Domain Expert, Sales Strategist, Financial Analyst, Product Manager). Command modes `CREATE_BUSINESS` terminate here if the mode is `CREATE_BUSINESS`.

**Not rendered for modes:** `CREATE_TECH`, `CREATE_UX`, `CREATE_MARKETING`, `HOTFIX`

---

### Column 3: Critic Gate 1

| Property             | Value                       |
| -------------------- | --------------------------- |
| Label                | Critic Gate 1               |
| FSM states           | `CRITIC_1`                  |
| Position             | 3                           |
| Gate-blocked         | Yes — 3 blocking conditions |
| Can accept drag-drop | No                          |

**Description:** Gate between PHASE_1 and PHASE_2. Critic agent (18) and Risk agent (19) evaluate PHASE_1 output. Gate passes only when:

- B1-GATE-001: No critical violations
- B1-GATE-002: No major violations
- B1-GATE-003: All PHASE_1 handoff checklists complete

**Not rendered for modes:** `CREATE_TECH`, `CREATE_UX`, `CREATE_MARKETING`, `HOTFIX`

---

### Column 4: Technical Architecture

| Property             | Value                  |
| -------------------- | ---------------------- |
| Label                | Technical Architecture |
| FSM states           | `PHASE_2`              |
| Position             | 4                      |
| Gate-blocked         | No                     |
| Can accept drag-drop | No                     |

**Description:** Agents 05–09 and 33 active (Software Architect, Senior Developer, DevOps Engineer, Security Architect, Data Architect, Legal/Privacy Counsel).

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_UX`, `CREATE_MARKETING`  
**Hotfix note:** May render but may skip gate (see HOTFIX mode section)

---

### Column 5: Critic Gate 2

| Property             | Value                       |
| -------------------- | --------------------------- |
| Label                | Critic Gate 2               |
| FSM states           | `CRITIC_2`                  |
| Position             | 5                           |
| Gate-blocked         | Yes — 3 blocking conditions |
| Can accept drag-drop | No                          |

**Same blocking conditions as Critic Gate 1** applied to PHASE_2 outputs.

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_UX`, `CREATE_MARKETING`, `HOTFIX`

---

### Column 6: UX & Design

| Property             | Value       |
| -------------------- | ----------- |
| Label                | UX & Design |
| FSM states           | `PHASE_3`   |
| Position             | 6           |
| Gate-blocked         | No          |
| Can accept drag-drop | No          |

**Description:** Agents 10–13, 32, 35 active (UX Researcher, UX Designer, UI Designer, Accessibility Specialist, Content Strategist, Localization Specialist).

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_TECH`, `CREATE_MARKETING`, `HOTFIX`

---

### Column 7: Critic Gate 3

| Property             | Value                       |
| -------------------- | --------------------------- |
| Label                | Critic Gate 3               |
| FSM states           | `CRITIC_3`                  |
| Position             | 7                           |
| Gate-blocked         | Yes — 3 blocking conditions |
| Can accept drag-drop | No                          |

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_TECH`, `CREATE_MARKETING`, `HOTFIX`

---

### Column 8: Marketing & Brand

| Property             | Value             |
| -------------------- | ----------------- |
| Label                | Marketing & Brand |
| FSM states           | `PHASE_4`         |
| Position             | 8                 |
| Gate-blocked         | No                |
| Can accept drag-drop | No                |

**Description:** Agents 14–16, 30–31 active (Brand Strategist, Growth Marketer, CRO Specialist, Brand & Assets Agent, Storybook Agent).

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_TECH`, `CREATE_UX`, `HOTFIX`

---

### Column 9: Critic Gate 4

| Property             | Value                       |
| -------------------- | --------------------------- |
| Label                | Critic Gate 4               |
| FSM states           | `CRITIC_4`                  |
| Position             | 9                           |
| Gate-blocked         | Yes — 3 blocking conditions |
| Can accept drag-drop | No                          |

**Not rendered for modes:** `CREATE_BUSINESS`, `CREATE_TECH`, `CREATE_UX`, `HOTFIX`

---

### Column 10: Synthesis

| Property             | Value                                |
| -------------------- | ------------------------------------ |
| Label                | Synthesis                            |
| FSM states           | `SYNTHESIS`                          |
| Position             | 10                                   |
| Gate-blocked         | No (pending gate.synthesis-approval) |
| Can accept drag-drop | No                                   |

**Description:** Agent 17 (Synthesis Agent) aggregates all phase outputs into sprint-ready documents. Followed by synthesis-approval gate.

---

### Column 11: Sprint Gate

| Property             | Value                        |
| -------------------- | ---------------------------- |
| Label                | Sprint Gate                  |
| FSM states           | `SPRINT_GATE`                |
| Position             | 11                           |
| Gate-blocked         | Yes (sprint-gate conditions) |
| Can accept drag-drop | No                           |

**Description:** Orchestrator (agent 00) reviews sprint backlog, validates Definition of Ready, injects lessons-learned. All approval items must be resolved.

---

### Column 12: Executing

| Property             | Value               |
| -------------------- | ------------------- |
| Label                | Executing           |
| FSM states           | `PHASE_5_EXECUTING` |
| Position             | 12                  |
| Gate-blocked         | No                  |
| Can accept drag-drop | No                  |

**Description:** Implementation agents active (20–22, 26–29, 38). Includes Implementation Agent, Test Agent, PR/Review Agent, Documentation Agent, GitHub Integration Agent, Sprint Retrospective Agent, KPI/Metrics Agent, Architecture Compliance Reviewer.

---

### Column 13: Completed

| Property             | Value       |
| -------------------- | ----------- |
| Label                | Completed   |
| FSM states           | `COMPLETED` |
| Position             | 13          |
| Gate-blocked         | No          |
| Can accept drag-drop | No          |

**Description:** Terminal success state. All phases complete, sprint retrospective done.

---

## Blocked / Error state (cross-lane badge, not a column)

| Property   | Value                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------- |
| Label      | Blocked / Error                                                                           |
| FSM states | `ERROR`, or any session with `blockers.length > 0` or `open_human_escalations.length > 0` |
| Position   | N/A — badge overlaid on card in its current column                                        |

**Design rule:** A blocked session stays in its current column. It does not move to a separate "Blocked" column. The board renders a `BLOCKED` badge on the card. A filter toggle "Show only blocked" is available.

---

## HOTFIX mode column rendering

HOTFIX bypasses all CRITIC_N gate columns. Board renders only:

- Intake → Executing → Completed

Gate columns are hidden for HOTFIX sessions. The board header shows a `HOTFIX MODE` indicator when any visible session is HOTFIX.

---

## Column width guidance

Gate columns (CRITIC_1–4) are expected to have low dwell time. They may be rendered narrower (e.g., 120px vs 200px) to visually distinguish them as transition gates rather than work zones.

Executing (PHASE_5_EXECUTING) is the highest-occupancy column in typical sprints. It should have wider card area to accommodate sub-agent progress.

---

## Filtering model

All column visibility is mode-aware. Board supports:

| Filter                       | Method                                         |
| ---------------------------- | ---------------------------------------------- |
| By cycle type / command mode | Column set adapts, swimlane or filter toggle   |
| Blocked only                 | `blockers.length > 0 OR status === 'paused'`   |
| Awaiting approval            | `open_human_escalations.length > 0`            |
| Active only                  | `status === 'active'`                          |
| Error state                  | `status === 'failed' OR fsm_state === 'ERROR'` |
