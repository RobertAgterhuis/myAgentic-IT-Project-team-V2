# Decisions Output Contract

> Version: 1.0 | Defines the schema, lifecycle, and ownership of
> `BusinessDocs/decisions.md`

---

## PURPOSE

Ensures the project decisions register is consistently maintained across all
agents and phases. Decisions drive Sprint Gate behavior, agent constraints, and
scope management. This contract defines:

1. The file format and column schema
2. Which agents produce and consume decisions
3. The decision lifecycle (OPEN → DECIDED / DEFERRED / EXPIRED)
4. Sprint Gate integration rules

---

## OUTPUT FILE

**Location:** `BusinessDocs/decisions.md`

**Format:** Markdown tables organized by section

**Owner:** The Orchestrator (Agent 00) is the sole writer for operational
decisions. The Questionnaire & Decisions Manager web UI writes decisions from
human stakeholders directly to this file.

---

## INITIALIZATION

The Orchestrator creates `BusinessDocs/decisions.md` during the Onboarding
phase if it does not already exist. The file is initialized with:

1. Usage instructions header
2. Column schema documentation
3. Empty section tables (Open Questions, Decided Items, Deferred Items,
   Operational Decisions)

---

## COLUMN SCHEMA

| Column                | Type     | Description                                                    |
| --------------------- | -------- | -------------------------------------------------------------- |
| `ID`                  | string   | Unique identifier, format `DEC-NNN` (sequential)               |
| `Type`                | enum     | `DECIDED` or `OPEN_QUESTION`                                   |
| `Status`              | enum     | `OPEN` · `DECIDED` · `DEFERRED` · `EXPIRED`                    |
| `Priority`            | enum     | `HIGH` · `MEDIUM` · `LOW`                                      |
| `Scope`               | string   | Affected phase, agent, sprint, or `All sprints`                |
| `Decision / Question` | string   | The decision statement or question text                        |
| `Your answer / Notes` | string   | Stakeholder answer (for OPEN_QUESTION) or implementation notes |
| `Date`                | ISO 8601 | Date of entry or last update                                   |

---

## SECTIONS

| Section                   | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| **Open Questions**        | Unresolved questions awaiting stakeholder input            |
| **Decided Items**         | Questions answered with a binding decision                 |
| **Deferred Items**        | Questions explicitly postponed (with reason, revisit date) |
| **Operational Decisions** | Runtime/process decisions made by Orchestrator or agents   |

---

## PRODUCERS

| Agent / Source                        | When                                                       |
| ------------------------------------- | ---------------------------------------------------------- |
| Orchestrator (Agent 00)               | Operational decisions at Sprint Gate, HOTFIX, SCOPE CHANGE |
| Questionnaire Agent (Agent 36)        | Converts INSUFFICIENT_DATA items to OPEN_QUESTION entries  |
| Architecture Compliance Reviewer (38) | Waivers after COMPLIANCE_LOOP_EXCEEDED (Type: DECIDED)     |
| Reevaluate Agent                      | Decisions from re-evaluation findings                      |
| Human stakeholder (via web UI)        | Direct answers to OPEN_QUESTION items                      |

---

## CONSUMERS

| Agent / Phase              | How decisions are consumed                                      |
| -------------------------- | --------------------------------------------------------------- |
| Orchestrator — Sprint Gate | Step 0: reads all DECIDED items, injects as constraints         |
| Implementation Agent (20)  | Reads DECIDED + active category files before coding (G-IMPL-32) |
| Test Agent (21)            | Verifies decision compliance in test validation                 |
| PR/Review Agent (22)       | Independently verifies decision compliance at review            |
| Reevaluate Agent           | Reads current decisions as context for re-evaluation            |
| Scope Change Agent         | Reads decisions to assess impact of scope change                |

---

## DECISION LIFECYCLE

```
OPEN_QUESTION (Status: OPEN)
  ↓ stakeholder answers via web UI or direct edit
DECIDED (Status: DECIDED)
  ↓ optional: conditions change
DEFERRED (Status: DEFERRED) — with revisit trigger
  ↓ trigger fires
Back to OPEN or DECIDED
  ↓ no longer relevant
EXPIRED (Status: EXPIRED)
```

---

## SPRINT GATE INTEGRATION

1. `OPEN` + Priority `HIGH` + sprint touches scope → **Sprint Gate BLOCKS**
2. `OPEN` + Priority `MEDIUM` / `LOW` → Orchestrator reports, does not block
3. `DECIDED` → Orchestrator injects as hard constraint into relevant agents
4. `DEFERRED` → Ignored until date or scope trigger fires
5. `EXPIRED` → Ignored entirely

---

## RELATIONSHIP TO QUESTIONNAIRE Q-IDs

- Each questionnaire question has a `Q-ID` (e.g., `Q-P1-003`)
- When a questionnaire answer leads to a binding decision, the Questionnaire
  Agent creates a DECIDED entry with `Source: Q-ID` in the decision text
- The Orchestrator picks up decisions at Sprint Gate Step 0

---

## RELATIONSHIP TO CATEGORY DECISION FILES

Active and deferred category decision files in `BusinessDocs/decisions/` are
separate from `decisions.md`. They contain technology-specific decisions
(e.g., `docker.md`, `bicep-iac.md`). The Implementation Agent reads both
`decisions.md` and active category files per G-IMPL-32.

---

## VALIDATION

- All entries MUST have a unique `DEC-NNN` ID
- Status transitions MUST follow the lifecycle above
- Priority MUST be one of `HIGH`, `MEDIUM`, `LOW`
- Date MUST be valid ISO 8601
- Decided Items MUST have a non-empty `Decision / Question` AND
  `Your answer / Notes` column
