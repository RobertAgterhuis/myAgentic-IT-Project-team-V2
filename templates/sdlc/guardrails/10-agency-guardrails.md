# Guardrails: Agency Specialist Pack

> Version 1.0 | Applies to: Agency Orchestrator, all domain agent delegates,
> Orchestrator (00) when operating in AGENCY_SPECIALIST or AGENCY_AUDIT mode

---

## PURPOSE

These guardrails govern the agency-agents-markdown pack: agent discovery,
domain delegation, specialty output quality, and traceability. They are
supplementary to the global guardrails (`00-global-guardrails.md`) and apply
whenever an AGENCY_SPECIALIST or AGENCY_AUDIT command is active.

---

## ENFORCEMENT & CONTRACT REFERENCE

| Rule Range  | Primary Enforcer   | Verification Agent | Related Contract            | Default Violation Action |
| ----------- | ------------------ | ------------------ | --------------------------- | ------------------------ |
| G-AGT-01–04 | Orchestrator (00)  | Orchestrator (00)  | `agent-handoff-contract.md` | BLOCK delegation         |
| G-AGT-05–08 | Domain Agent (any) | Critic Agent (18)  | `agent-handoff-contract.md` | BLOCK handoff            |
| G-AGT-09–12 | Orchestrator (00)  | Orchestrator (00)  | `session-state-contract.md` | BLOCK phase transition   |
| G-AGT-13–15 | Domain Agent (any) | Orchestrator (00)  | `tooling-contract.md`       | WARN + document          |

---

## SECTION 1: DELEGATION RULES

**G-AGT-01 (CRITICAL):** The orchestrator MUST resolve the target domain agent
from `manifest.json → delegationMap` before invoking any agency specialist.
Hard-coded agent paths bypassing the manifest are prohibited.

**G-AGT-02 (CRITICAL):** A delegation MUST carry the original task context
(mode, command, phase, sprint ID) in the handoff payload so the specialist can
enforce scope discipline without re-prompting.

**G-AGT-03:** When no matching domain agent is found in the `delegationMap`,
the orchestrator MUST escalate to the human operator — NEVER fall back to a
generic agent silently.

**G-AGT-04:** Domain boundaries are non-negotiable. An agent matched to domain
`"engineering"` MUST NOT produce marketing artifacts, and vice versa, unless
explicitly authorised by an `UNCERTAIN: cross-domain` escalation.

---

## SECTION 2: AGENT OUTPUT QUALITY

**G-AGT-05 (CRITICAL):** Every domain agent MUST complete the standard
HANDOFF CHECKLIST before handing off. Agency specialists are not exempt from
global handoff rules.

**G-AGT-06:** Agency agent outputs MUST include a traceability reference to the
originating command (`AGENCY_SPECIALIST` or `AGENCY_AUDIT`) and the delegating
stage (INTAKE → MATCH → DELEGATE → REVIEW → HANDOFF).

**G-AGT-07:** Outputs that contain `UNCERTAIN:` or `INSUFFICIENT_DATA:` MUST be
escalated via the Questionnaire Agent (36). A domain agent MUST NOT close its
own uncertainties by assumption.

**G-AGT-08:** Specialist playbook references (`agency-specialist-playbook.md`)
MUST be consulted before the DELEGATE stage. Skipping the playbook lookup is a
G-AGT-08 violation and blocks the DELEGATE stage gate.

---

## SECTION 3: PACK METADATA INTEGRITY

**G-AGT-09 (CRITICAL):** The `manifest.json` at the pack root MUST pass the
`check-pack-metadata-completeness` script on every CI run. A failing check
blocks merge to the main branch.

**G-AGT-10:** New domain agent files added to the pack root MUST be accompanied
by a corresponding entry in `manifest.json → delegationMap`. Undeclared agent
files are treated as inactive and will not be discovered by the orchestrator.

**G-AGT-11:** The `modes`, `commands`, and `stages` arrays in the manifest MUST
reflect all officially supported agency operations. Deprecated commands MUST be
removed, not left as dead entries.

**G-AGT-12:** Changes to manifest schema structure MUST be validated against
`schemaVersion` and the `check-pack-metadata-completeness` script. Bumping
`schemaVersion` requires a corresponding changelog entry.

---

## SECTION 4: AUDIT MODE RULES

**G-AGT-13:** In `AGENCY_AUDIT` mode the domain agent MUST produce a
structured capability-and-readiness report. Free-form prose without structured
findings is a G-AGT-13 violation.

**G-AGT-14:** Audit findings MUST be categorised as PASS / WARN / FAIL. Every
FAIL MUST include a remediation recommendation and an estimated effort.

**G-AGT-15:** Audit outputs MUST NOT be committed to the main branch without a
human approval step (PR with at least one reviewer). Automated audit commits
directly to main are blocked by CI.

---

## VIOLATION HANDLING RESPONSE TABLE

| Rule     | Severity | Auto-block? | Escalation Target   | Recovery Path                                      |
| -------- | -------- | ----------- | ------------------- | -------------------------------------------------- |
| G-AGT-01 | CRITICAL | YES         | Human Operator      | Fix `delegationMap`, re-run orchestrator           |
| G-AGT-02 | CRITICAL | YES         | Orchestrator (00)   | Rebuild delegation payload, retry handoff          |
| G-AGT-03 | HIGH     | YES         | Human Operator      | Add missing domain entry to `delegationMap`        |
| G-AGT-04 | HIGH     | YES         | Orchestrator (00)   | Scope correction, re-delegation                    |
| G-AGT-05 | CRITICAL | YES         | Critic Agent (18)   | Complete checklist, re-submit handoff              |
| G-AGT-06 | MEDIUM   | NO          | Orchestrator (00)   | Add traceability block to output                   |
| G-AGT-07 | HIGH     | YES         | Questionnaire Agent | Escalate INSUFFICIENT_DATA items                   |
| G-AGT-08 | MEDIUM   | YES         | Orchestrator (00)   | Read playbook, retry DELEGATE stage                |
| G-AGT-09 | CRITICAL | YES         | CI / Human Operator | Fix manifest violations, re-run completeness check |
| G-AGT-10 | HIGH     | NO          | Orchestrator (00)   | Add `delegationMap` entry, trigger re-discovery    |
| G-AGT-11 | MEDIUM   | NO          | Orchestrator (00)   | Prune dead entries, bump manifest version          |
| G-AGT-12 | MEDIUM   | NO          | Human Operator      | Update schemaVersion, add changelog entry          |
| G-AGT-13 | MEDIUM   | NO          | Critic Agent (18)   | Reformat output with structured findings           |
| G-AGT-14 | MEDIUM   | NO          | Human Operator      | Add PASS/WARN/FAIL categorisation to each finding  |
| G-AGT-15 | HIGH     | YES         | CI                  | Open PR with reviewer, await approval before merge |
