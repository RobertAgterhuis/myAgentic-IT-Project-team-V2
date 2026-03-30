# Agency Specialist Playbook

> **Mode:** AGENCY_SPECIALIST | **Companion audit mode:** AGENCY_AUDIT
>
> This playbook governs end-to-end execution when the orchestrator receives an
> `AGENCY_SPECIALIST` or `AGENCY_AUDIT` command targeting the
> `agency-agents-markdown` pack.

---

## OVERVIEW

The agency-agents-markdown pack provides specialized domain agents across
disciplines such as engineering, design, marketing, product, sales, strategy,
and more. This playbook defines the five mandatory stages every agency workflow
MUST traverse: INTAKE → MATCH → DELEGATE → REVIEW → HANDOFF.

**Guardrail reference:** `10-agency-guardrails.md`  
**Contracts:** `agent-handoff-contract.md`, `tooling-contract.md`  
**Decisions:** `agency-pack-topology.md`

---

## STAGE 1 — INTAKE

### Objective

Capture and normalise the incoming task brief before any agent is involved.

### Inputs

- User command (`AGENCY_SPECIALIST` or `AGENCY_AUDIT`)
- Task description (natural language or structured brief)
- Optional: target domain hint (e.g. `domain: engineering`)

### Actions

1. Parse the command payload; extract task description, domain hint, and mode.
2. Normalise the task brief into a structured context object:
   - `task_id` (auto-generated)
   - `command` (AGENCY_SPECIALIST | AGENCY_AUDIT)
   - `domain_hint` (optional, from user input)
   - `description` (verbatim task text)
   - `created_at` (ISO timestamp)
3. Write the context object to the session state (`session-state-contract.md`).
4. If the description is empty or ambiguous, invoke the Questionnaire Agent (36)
   before proceeding.

### Gate: INTAKE_COMPLETE

- [ ] Structured context object persisted to session state
- [ ] No INSUFFICIENT_DATA items outstanding

---

## STAGE 2 — MATCH

### Objective

Identify the best-fit domain agent from the `delegationMap` in the manifest.

### Inputs

- Normalised task context from STAGE 1
- `manifest.json → delegationMap`

### Actions

1. Load `templates/agency-agents-markdown/manifest.json`.
2. Evaluate `delegationMap` entries against the task context (domain_hint,
   keywords in description).
3. Select the highest-confidence domain agent. If confidence < 70%, surface the
   top 3 candidates and escalate to the human operator for selection.
4. Record the matched agent path and confidence score in session state.
5. If no match found → G-AGT-03 applies: escalate to human operator.

### Gate: MATCH_COMPLETE

- [ ] One agent confirmed as target (human-approved if confidence < 70%)
- [ ] Agent path recorded in session state

---

## STAGE 3 — DELEGATE

### Objective

Hand off the task to the matched specialist agent with full context.

### Inputs

- Matched agent from STAGE 2
- Full task context from STAGE 1
- Guardrail reference: `10-agency-guardrails.md` (G-AGT-01, G-AGT-02)

### Actions

1. Read the target agent file (`.md`) and extract its system prompt / role.
2. Build the delegation payload:
   - `task_context` (from session state)
   - `agent_role` (from agent file)
   - `guardrails_in_scope`: `["00-global-guardrails.md", "10-agency-guardrails.md"]`
   - `contracts_in_scope`: `["agent-handoff-contract.md", "tooling-contract.md"]`
3. Invoke the specialist agent with the delegation payload.
4. The specialist MUST NOT start work until it has acknowledged receipt of the
   delegation payload and confirmed scope understanding.

### Gate: DELEGATE_COMPLETE

- [ ] Delegation payload built and logged
- [ ] Specialist agent acknowledged scope

---

## STAGE 4 — REVIEW

### Objective

Validate specialist output against contracts and guardrails before acceptance.

### Inputs

- Specialist agent output
- `agent-handoff-contract.md`
- `10-agency-guardrails.md`

### Actions

1. Check HANDOFF CHECKLIST completeness (G-AGT-05).
2. Verify traceability reference in output (G-AGT-06).
3. For AGENCY_AUDIT outputs: verify PASS/WARN/FAIL structure (G-AGT-13,
   G-AGT-14).
4. If any UNCERTAIN: or INSUFFICIENT_DATA: items remain, route to Questionnaire
   Agent (36) before marking review complete.
5. If output fails the checklist: return to specialist with specific failure
   reasons (MAX 1 retry before human escalation).

### Gate: REVIEW_COMPLETE

- [ ] HANDOFF CHECKLIST fully checked
- [ ] Traceability reference present
- [ ] No outstanding UNCERTAIN / INSUFFICIENT_DATA items
- [ ] Audit outputs structured as PASS/WARN/FAIL (AGENCY_AUDIT mode only)

---

## STAGE 5 — HANDOFF

### Objective

Persist the final output, update session state, and notify downstream consumers.

### Inputs

- Reviewed specialist output from STAGE 4
- Session state

### Actions

1. Write the output artefact to the appropriate `BusinessDocs/` namespace.
2. Update session state: set `status: COMPLETE`, link output artefact path.
3. Emit a handoff event to the Orchestrator with stage trace:
   INTAKE → MATCH → DELEGATE → REVIEW → HANDOFF.
4. If the task was triggered from a sprint story: update the sprint story status
   to DONE and link the output artefact.
5. Trigger CI checks: `check-pack-metadata-completeness.ts` (G-AGT-09).

### Gate: HANDOFF_COMPLETE

- [ ] Output artefact persisted to correct namespace
- [ ] Session state updated to COMPLETE
- [ ] Orchestrator notified with full stage trace
- [ ] CI metadata check passes

---

## AGENCY_AUDIT VARIANT

When the command is `AGENCY_AUDIT`:

1. Skip DELEGATE to a single specialist — instead, run the orchestrator's
   built-in audit agent against the pack `manifest.json`.
2. Collect compliance findings across all domain agent files:
   - Missing `delegationMap` entries (G-AGT-10)
   - Undeclared agent files
   - Manifest schema violations
3. Produce a structured audit report with PASS/WARN/FAIL per finding.
4. Apply STAGE 4 REVIEW and STAGE 5 HANDOFF normally.

---

## ERROR HANDLING MATRIX

| Failure Scenario                          | Guardrail | Action                                           |
| ----------------------------------------- | --------- | ------------------------------------------------ |
| No matching domain agent found            | G-AGT-03  | Escalate to human operator                       |
| Confidence < 70% — multiple candidates    | G-AGT-03  | Surface top 3, await human selection             |
| Specialist output fails HANDOFF CHECKLIST | G-AGT-05  | Return with specific gaps, 1 retry then escalate |
| UNCERTAIN / INSUFFICIENT_DATA in output   | G-AGT-07  | Route to Questionnaire Agent (36)                |
| manifest.json fails completeness check    | G-AGT-09  | Block CI, notify human operator                  |
| Agent file missing from delegationMap     | G-AGT-10  | Log as WARN, trigger manifest update story       |
