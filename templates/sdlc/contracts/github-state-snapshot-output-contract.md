# GitHub State Snapshot Output Contract

> Version: 1.0 | Defines the mandatory output structure for the GitHub State
> Snapshot captured at Sprint Gate Step 0

---

## PURPOSE

Captures the current state of the GitHub project board (milestones and issues)
as structured JSON for injection into the Orchestrator's Sprint Gate context.
Enables the Reevaluate Agent to compare planned vs actual project state and
detect drift.

---

## PRODUCER

| Producer     | Trigger                        | Tool                               |
| ------------ | ------------------------------ | ---------------------------------- |
| Orchestrator | Sprint Gate Step 0 (automatic) | `scripts/github-state-snapshot.js` |

---

## OUTPUT FILE

**Location:** `BusinessDocs/session/github-state-snapshot.json`
**Format:** JSON

---

## MANDATORY SCHEMA

```json
{
  "repo": "OWNER/REPO",
  "captured_at": "ISO 8601 timestamp",
  "summary": {
    "milestones_open": 0,
    "milestones_closed": 0,
    "issues_open": 0,
    "issues_closed": 0
  },
  "milestones": [
    {
      "number": 1,
      "title": "string",
      "state": "open | closed",
      "open_issues": 0,
      "closed_issues": 0,
      "due_on": "ISO 8601 | null",
      "description": "string (max 200 chars)"
    }
  ],
  "issues": [
    {
      "number": 1,
      "title": "string",
      "state": "open | closed",
      "labels": ["string"],
      "milestone": { "number": 1, "title": "string" },
      "assignees": ["string"],
      "created_at": "ISO 8601",
      "closed_at": "ISO 8601 | null"
    }
  ]
}
```

---

## CONSUMERS

| Consumer                | Usage                                                     |
| ----------------------- | --------------------------------------------------------- |
| Orchestrator (Agent 00) | Sprint Gate Step 0 — injects as `## GITHUB STATE` context |
| Reevaluate Agent (23)   | Compares snapshot against sprint plan for drift detection |

---

## GUARDRAILS

- **G-GLOB-65**: GitHub state snapshot must be captured before Sprint Gate
  proceeds
- Snapshot is **read-only** after capture — agents must not modify it
- A new snapshot replaces the previous one at each Sprint Gate

---

## STALENESS RULES

- A snapshot older than 1 hour at Sprint Gate evaluation time triggers a
  re-capture
- If `gh` CLI is unavailable, the Orchestrator must escalate via
  `HUMAN_ESCALATION_REQUIRED` (do not proceed without snapshot)

---

## VALIDATION

| Check                       | Rule                                            |
| --------------------------- | ----------------------------------------------- |
| `repo` matches project      | Must equal configured `OWNER/REPO`              |
| `captured_at` is recent     | Within 1 hour of Sprint Gate start              |
| `milestones` array present  | May be empty but must exist                     |
| `issues` array present      | May be empty but must exist                     |
| `summary` counts consistent | `issues_open + issues_closed` ≥ `issues.length` |
