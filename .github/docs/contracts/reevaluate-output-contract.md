# Reevaluate Agent Output Contract

> Version: 1.0 | Defines the mandatory output structure for the Reevaluate Agent
> (Agent 23)

---

## PURPOSE

Ensures that when questionnaire answers arrive, decisions change, or scope
adjustments occur, a structured re-evaluation is performed against affected
phase outputs. The Reevaluate Agent produces a delta analysis with impact flags
that feed into Sprint Gate reconciliation and, if needed, triggers brand asset
refresh.

---

## INPUT SOURCES

The Reevaluate Agent consumes the following inputs (provided by the
Orchestrator):

- Previous phase outputs (analysis findings per scope)
- Questionnaire answers (injected as `## QUESTIONNAIRE INPUT` context block)
- **GitHub state snapshot** (`## GITHUB STATE` context block, generated from
  `.github/docs/session/github-state-snapshot.json` at Sprint Gate Step 0a) —
  provides milestone statuses, open/closed issue counts, and label distribution
- **GitHub sync metadata** (`session-state.json` → `github_sync`) — provides
  `last_synced`, counters, and `drift_findings[]`
- Reevaluate trigger file (`.github/docs/session/reevaluate-trigger.json`, when
  present)
- Decisions file (`.github/docs/decisions.md`)

---

## OUTPUT FILE

**Location:** `.github/docs/reevaluate/reevaluation-report-[N].md` **Format:**
Markdown

---

## MANDATORY SECTIONS

### 1. Reevaluation Header

- Report number (sequential N)
- Trigger: `QUESTIONNAIRE_ANSWER` | `DECISION_CHANGE` | `SCOPE_ADJUSTMENT` |
  `MANUAL`
- Date of reevaluation
- Scope of reevaluation (which phases/agents/documents are affected)
- Trigger source reference (file path, question ID, or decision ID)

### 2. Delta Analysis

For each affected item:

- **Item ID:** Reference to original finding, recommendation, or data point
- **Original Value:** What the item stated before
- **New Value:** What the item should state now (based on new input)
- **Source:** Questionnaire answer ID, decision ID, or change description
- **Affected Document:** File path of the document to be updated

### 3. Impact Assessment

- Phases impacted: list of phase identifiers
- Agents impacted: list of agent names whose output changes
- Sprint items impacted: list of Story IDs / Sprint IDs affected
- **Sprint Impact Flag:** `IN_PROGRESS` items that require Sprint Gate hold
- **BRAND_REFRESH_REQUIRED:** `YES` | `NO` — set to YES if design tokens, brand
  guidelines, or visual identity are affected
- **GITHUB_STATE:** `CONSUMED` | `UNAVAILABLE` | `STALE` — indicates whether the
  GitHub state snapshot was successfully consumed, unavailable (Step 0a failed),
  or stale (older than 24 hours)

### 3b. GitHub Board Drift (CONDITIONAL)

Present when `## GITHUB STATE` was consumed and drift was detected between
session-state and the GitHub board:

- **Drift findings count:** Number of drift items from
  `github_sync.drift_findings[]` plus any detected during milestone
  cross-reference
- **Milestone mismatches:** List of sprints where `session-state.json` status
  differs from GitHub milestone state
- **Issue state mismatches:** List of stories where session status differs from
  GitHub issue state
- **Orphaned issues:** GitHub issues not referenced in the sprint plan
- **Missing issues:** Sprint plan stories without corresponding GitHub issues

If no drift detected: `GITHUB_BOARD_DRIFT: NONE`

### 4. Recommendations

- Items that require re-execution of a phase agent
- Items that can be patched in-place
- Items deferred to next sprint

### 5. Critic + Risk Validation Reference

- Confirm that Critic + Risk validation has been triggered for affected outputs
- Reference to updated critic-risk-validation.md (if available)

### 6. Handoff Checklist

Standard handoff checklist per Universal Agent Rules.

---

## VALIDATION CRITERIA

The Orchestrator checks (per ORC-35):

- [ ] Trigger type is explicitly stated
- [ ] Delta Analysis contains at least one item (otherwise reevaluation is
      unnecessary)
- [ ] Every delta item has original value, new value, and source reference
- [ ] Impact Assessment covers phases, agents, and sprint items
- [ ] BRAND_REFRESH_REQUIRED flag is present (YES or NO)
- [ ] GITHUB_STATE flag is present (CONSUMED, UNAVAILABLE, or STALE)
- [ ] If GITHUB_STATE is CONSUMED: Section 3b (GitHub Board Drift) is present
      with findings or explicit NONE
- [ ] Sprint Impact Flags are set for any `IN_PROGRESS` items
- [ ] Critic + Risk validation is referenced or scheduled

### Cross-reference: ORC-35

**ORC-35**: If this contract's output fails validation 3 consecutive times in
the same session, the Orchestrator escalates to the user with options:
ACCEPT_PARTIAL, RETRY_SIMPLIFIED, or MANUAL_OVERRIDE.

---

## DELTA-ONLY SCOPE

When scope is `DELTA-ONLY`, the Reevaluate Agent analyzes ONLY the changed/new
inputs since the last evaluation. Pre-existing approved findings are not
re-analyzed. The output includes a delta section clearly separating new findings
from carried-forward findings.

In DELTA-ONLY mode:

- Section 2 (Delta Analysis) contains ONLY items changed since last evaluation
- A "Carried-Forward Findings" sub-section lists previously approved items by
  reference (ID only, no re-analysis)
- Section 3 (Impact Assessment) reflects only the delta impact, not cumulative
  impact

---

## JSON Export

> No standalone JSON export for this contract. The Reevaluate Agent's output is
> Markdown-only; delta items are consumed by the Orchestrator from the
> structured Markdown sections.

---

## HANDOFF STATUS VALUES

- `COMPLETE` — All sections filled, all checks passed
- `PARTIAL` — Some sections filled, documented gaps
- `BLOCKED` — Cannot produce output, escalation raised
