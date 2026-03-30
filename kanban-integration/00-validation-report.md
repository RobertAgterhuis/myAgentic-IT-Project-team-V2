# Kanban Integration — Validation Report

> Source: Internal codebase analysis against consultant recommendation  
> Date: 2026-03-30  
> Status: VALIDATED — Proceed with governed implementation

---

## 1. Consultant claim validation

Each claim from the external consultant was verified against the actual codebase.

---

### Claim: The platform already has orchestration, governance, phases, gates, agents, approvals, and runtime policy

**VERIFIED — fully accurate.**

Sources:

- `platform/engine/state-machine.ts` — 15 discrete FSM states
- `platform/engine/flows.yaml` — linear transition rules per command mode
- `platform/engine/agent-phase-map.ts` — 39 agents mapped to 12 runtime states
- `platform/schema/phase-exit-criteria.json` — 3 blocking gate conditions per critic phase
- `src/webapp/routes/approvals.ts` — Approve/reject API with `gate_id`, `stage`, `required_role`
- `BusinessDocs/session/transition-lease.json` — Live FSM state with `current_phase`, `blockers`, `open_human_escalations`

---

### Claim: The platform is weaker on operational visibility for humans

**VERIFIED — accurate with one important qualification.**

The cockpit page (`src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx`) already provides:

- Health & Confidence tab
- Dependency graph
- Root-Cause Analysis
- Approval History

**However**, that view is session-centric and tabbed — it answers "what is happening inside this run" rather than "where is all work right now across all runs." There is no cross-session phase-flow view. No work-pile-up signal across concurrent sessions. No lane-level WIP visibility.

The consultant's framing is correct: the platform can already diagnose one run deeply; it cannot scan many runs at a glance.

---

### Claim: Board should be a derived view — engine moves board, not vice versa

**VERIFIED — this is the only safe model for this codebase.**

Critical evidence:

- Session status: `active | completed | failed | paused` — 4 values only; a board column is derived from FSM state, not a separate truth
- `CommandQueueEntry.status`: `PENDING | PROCESSING | DONE | ERROR` — all engine-driven
- `transition-lease.json` is the authoritative state record; it already contains `blockers` and `open_human_escalations`
- Any drag-and-drop that writes directly to the board without going through the orchestrator would invalidate this lease record and corrupt audit trail

Verdict: **The engine-first model is not just a preference; it is a structural requirement for this codebase.** The orchestrator owns state. The board can only observe and, for controlled overrides, write back through the orchestrator API.

---

### Claim: Cards can carry phase, agent, artifacts, gate verdicts, approvals, PR/branch links, diagnostics

**VERIFIED — all data already exists in the API layer.**

Sources by card field:
| Card field | Source |
|---|---|
| Current phase/state | `transition-lease.json` → `current_phase` |
| Active agent | `transition-lease.json` → `current_agent` |
| Blockers | `transition-lease.json` → `blockers[]` |
| Open human escalations | `transition-lease.json` → `open_human_escalations[]` |
| Approval status | `GET /api/v1/approvals` → `ApprovalEntry.status` |
| Gate verdicts | `platform/schema/phase-exit-criteria.json` gate evaluations |
| Artifacts | `GET /api/v1/artifacts` already exists |
| Completed phases | `transition-lease.json` → `completed_phases[]` |
| Session age / SLA | `transition-lease.json` → `initiated_at`, `last_updated` |

No new backend fields need to be invented for a basic card schema. All data is live.

---

### Claim: Manual drag-and-drop can exist as a controlled override through audit trail

**CONDITIONALLY VERIFIED — feasible but requires explicit design constraints.**

The approval API already accepts `required_role` and writes to audit trail. An override move would need to:

1. Call `POST /api/v1/orchestrator/command` with an appropriate command intent
2. Log the human override event (pattern already exists: `BusinessDocs/session/human-override-events.json`)
3. Update the transition lease through the orchestrator, not by writing state directly

This is architecturally possible. It is not implemented yet.

---

### Claim: A Kanban board would not replace the orchestrator or improve agent intelligence

**VERIFIED — accurate and important.**

The orchestrator FSM is in `platform/engine/state-machine.ts` and runs server-side. Agent execution is in `platform/engine/engine.ts`. A board is a React page consuming existing API endpoints. It cannot and does not affect agent execution depth or prompt quality.

---

## 2. Where the consultant is correct

| Consultant claim                                    | Verdict                                       |
| --------------------------------------------------- | --------------------------------------------- |
| Platform already strong on orchestration/governance | Correct                                       |
| Operational visibility gap for humans               | Correct                                       |
| Board helps show stuck work                         | Correct                                       |
| Board helps show waiting-on-human work              | Correct                                       |
| Engine-first model is required                      | Correct                                       |
| Card data already exists in API                     | Correct                                       |
| Would aid enterprise adoption                       | Plausible, not verifiable from codebase alone |
| Board would not improve agent intelligence          | Correct                                       |

---

## 3. Where the consultant recommendation needs refinement

### Refinement 1: Column model needs to match the actual FSM states

The consultant proposed generic column names like "Intake" and "Analysis." The actual FSM states are:
`IDLE → ONBOARDING → PHASE_1 → CRITIC_1 → PHASE_2 → CRITIC_2 → PHASE_3 → CRITIC_3 → PHASE_4 → CRITIC_4 → SYNTHESIS → SPRINT_GATE → PHASE_5_EXECUTING → COMPLETED`

The column schema must be derived from these states, not invented independently. Column drift from FSM state names creates ambiguity.

Recommended column mapping:

| Column label           | Mapped FSM states       | Notes                                                             |
| ---------------------- | ----------------------- | ----------------------------------------------------------------- |
| Intake                 | IDLE, ONBOARDING        | Pre-analysis                                                      |
| Business Analysis      | PHASE_1                 | BA, Domain, Sales, Financial, PM agents                           |
| Critic Gate 1          | CRITIC_1                | Critic + Risk agents                                              |
| Technical Architecture | PHASE_2                 | Architect, Dev, DevOps, Security, Data, Legal                     |
| Critic Gate 2          | CRITIC_2                | Critic + Risk agents                                              |
| UX & Design            | PHASE_3                 | UX Researcher, Designer, UI, A11y, Content, Localization          |
| Critic Gate 3          | CRITIC_3                | Critic + Risk agents                                              |
| Marketing & Brand      | PHASE_4                 | Brand, Growth, CRO, Assets, Storybook                             |
| Critic Gate 4          | CRITIC_4                | Critic + Risk agents                                              |
| Synthesis              | SYNTHESIS               | Synthesis Agent                                                   |
| Sprint Gate            | SPRINT_GATE             | Orchestrator review                                               |
| Executing              | PHASE_5_EXECUTING       | Implementation, Test, PR/Review, Docs, GitHub, KPI, Retrospective |
| Completed              | COMPLETED               | Terminal state                                                    |
| Blocked / Error        | ERROR + active blockers | Filterable cross-lane state                                       |

### Refinement 2: Session status is the canonical card status, not column position alone

A session can be `active` in `PHASE_1` but also have `blockers` and `open_human_escalations`. The card needs to express both:

- which column it is in (current FSM phase)
- what its local status is (badge: approval-required, blocked, degraded-confidence, etc.)

### Refinement 3: Command mode filtering is required

`HOTFIX` sessions should not share a standard PHASE_1–4 lane layout, because they bypass gates by design. A board must handle command-mode-specific swimlanes or filters. Mixing a HOTFIX card in the Critic Gate 1 column is misleading.

---

## 4. Net validation verdict

**The consultant recommendation is architecturally sound and internally consistent with this codebase.**

The board:

- uses existing FSM states as columns ✓
- uses existing API data for card content ✓
- does not redefine the orchestrator ✓
- improves cross-session operational visibility ✓
- adds governance-appropriate override path ✓

**Recommend proceeding.** Implementation should be treated as a new UI feature layered over existing API, not a platform redesign.

---

## 5. Implementation constraints (hard requirements)

1. **No direct state mutation from board.** All board actions call orchestrator API endpoints.
2. **No invented lifecycle states.** Columns map 1:1 to FSM states.
3. **HOTFIX mode requires separate rendering path** — it bypasses CRITIC gates.
4. **Partial-mode sessions** (CREATE_BUSINESS = PHASE_1 only) must render with visible lane truncation so operators know which phases are skipped.
5. **WIP limits are advisory only.** The FSM controls concurrency, not the board.
6. **Blocked/Error is a badge, not a separate column.** A session stays in its column; the badge signals the problem.

---

## 6. Files produced

| File                                            | Purpose                                     |
| ----------------------------------------------- | ------------------------------------------- |
| `kanban-integration/00-validation-report.md`    | This file — independent validation          |
| `kanban-integration/01-column-schema.md`        | Column/lane definitions                     |
| `kanban-integration/02-card-schema.md`          | Card field schema with API source mapping   |
| `kanban-integration/03-badge-rules.md`          | Badge/status badge logic                    |
| `kanban-integration/04-override-model.md`       | Controlled drag-and-drop design             |
| `kanban-integration/05-api-mapping.md`          | Which existing endpoints feed the board     |
| `kanban-integration/milestones-epics-issues.md` | GitHub-ready milestone/epic/issue hierarchy |
