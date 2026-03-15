````markdown
# Contract: Architecture Compliance Output

> Version 1.0 | Phase 5 – Architecture Compliance Gate

---

## PURPOSE OF THIS CONTRACT

This contract defines the required output of the **Architecture Compliance
Reviewer** (agent 38). The compliance gate runs AFTER the Test Agent approves
all stories and BEFORE the PR/Review Agent creates the sprint PR. Its purpose
is to externally verify that implemented code conforms to Phase 1–4 design
decisions.

---

## INPUT (MANDATORY PRESENT BEFORE REVIEW STARTS)

| Field                          | Source                                               | Required |
| ------------------------------ | ---------------------------------------------------- | -------- |
| Test-approved stories          | Test Agent Sprint Test Summary (all stories APPROVED) | YES      |
| IMPL-OUTPUT-A per story        | Implementation Agent (changed files)                  | YES      |
| IMPL-OUTPUT-C per story        | Implementation Agent (guardrail self-check)            | YES      |
| IMPL-OUTPUT-D per story        | Implementation Agent (story completion declaration)    | YES      |
| Phase 2 architecture output    | Software Architect + Senior Developer + DevOps + Security + Data Architect | YES (T1) |
| Phase 3 UX/design output       | UX Designer + UI Designer + Accessibility Specialist + Storybook Agent | CONDITIONAL (T2) |
| Phase 1 business rules output  | Business Analyst + Domain Expert + Financial Analyst + Product Manager | CONDITIONAL (T3) |
| Decision register              | `BusinessDocs/decisions.md` + active category files   | YES      |

**HALT:** If Test Agent has not APPROVED all stories, or if a required authority
document for an active tier is missing → do NOT start review. Escalate to
Orchestrator.

---

## TIER ACTIVATION RULES

| Tier | Name                    | Activation condition                                                        |
| ---- | ----------------------- | --------------------------------------------------------------------------- |
| T1   | Architecture Conformance | **Always active** for every sprint                                          |
| T2   | UX/Design Conformance   | Active when ANY story modifies UI files (`.css`, `.scss`, `.tsx`, `.jsx`, `.vue`, `.svelte`, component files, design token references) |
| T3   | Business Rules Conformance | Active when ANY story implements business validation, financial calculations, workflow rules, or domain logic |

---

## OUTPUT PER STORY (MANDATORY)

**Output file path:** `BusinessDocs/phase-5/sprint-[SP-N]/compliance-[STORY-ID].md`

### Compliance Verdict

```
COMPLIANCE-VERDICT: [STORY-ID]
  Review date: [ISO 8601]
  Active tiers: [T1, T2, T3]
  T1 (Architecture): COMPLIANT | NON_COMPLIANT ([n] violations)
  T2 (UX/Design):    COMPLIANT | NON_COMPLIANT ([n] violations) | N/A
  T3 (Business):     COMPLIANT | NON_COMPLIANT ([n] violations) | N/A
  Overall: COMPLIANT | NON_COMPLIANT
  Rework iteration: [0–3]
```

### Violation Detail (per violation)

```
VIOLATION: [VIOLATION-ID]
  Tier: T1 | T2 | T3
  Severity: CRITICAL | MAJOR | MINOR | ADVISORY
  Design decision ref: [document path + section/ID]
  Code location: [file path + line number or function name]
  Description: [clear description of discrepancy]
  Required remediation: [specific action the Implementation Agent must take]
```

---

## OUTPUT PER SPRINT (MANDATORY)

### Sprint Compliance Summary

**Output file path:** `BusinessDocs/phase-5/sprint-[SP-N]/compliance-summary.json`

```json
{
  "sprint_id": "SP-N",
  "compliance_gate_status": "PASSED | FAILED",
  "review_date": "ISO 8601",
  "active_tiers": ["T1", "T2", "T3"],
  "stories_reviewed": [
    {
      "story_id": "SP-N-NNN",
      "t1_status": "COMPLIANT | NON_COMPLIANT",
      "t2_status": "COMPLIANT | NON_COMPLIANT | N/A",
      "t3_status": "COMPLIANT | NON_COMPLIANT | N/A",
      "overall": "COMPLIANT | NON_COMPLIANT",
      "violations_found": 0,
      "violations_resolved": 0,
      "rework_iterations": 0
    }
  ],
  "total_violations_found": 0,
  "total_violations_resolved": 0,
  "rework_iterations_total": 0,
  "escalations": [],
  "authority_documents_used": []
}
```

---

## REWORK LOOP RULES

1. On `NON_COMPLIANT`: return story to Implementation Agent with full violation
   detail and remediation instructions
2. Implementation Agent fixes violations → re-submits through Test Agent →
   compliance review re-runs for reworked stories only
3. **Maximum 3 rework iterations** per story per sprint
4. After 3 failures: `ESCALATE: COMPLIANCE_LOOP_EXCEEDED` → Orchestrator
   decides: `ACCEPT_WITH_WAIVER`, `REVISE_DESIGN_DECISION`, or
   `MANUAL_OVERRIDE`
5. Waivers are documented as `DECIDED` items in `BusinessDocs/decisions.md`

---

## SEVERITY DEFINITIONS

| Severity   | Definition                                                          | Blocks PR |
| ---------- | ------------------------------------------------------------------- | --------- |
| `CRITICAL` | Code contradicts a core architecture decision or security pattern   | YES       |
| `MAJOR`    | Code deviates from design patterns or introduces unapproved choices | YES       |
| `MINOR`    | Stylistic deviation from design system or naming mismatch           | NO (with Orchestrator approval) |
| `ADVISORY` | Potential improvement, not a violation                               | NO        |

---

## DEFINITION OF DONE (PER STORY)

A story passes the compliance gate when:

- [ ] All applicable tiers have been reviewed
- [ ] No `CRITICAL` or `MAJOR` violations remain unresolved
- [ ] All `MINOR` violations are either resolved or waived by Orchestrator
- [ ] Violation detail is documented with full traceability
- [ ] Rework iterations are documented (if any)

## DEFINITION OF DONE (PER SPRINT)

The compliance gate is PASSED when:

- [ ] All stories in the sprint have overall status `COMPLIANT`
- [ ] Sprint Compliance Summary JSON is present and machine-readable
- [ ] No escalations remain unresolved
- [ ] `compliance_gate_status` is `PASSED`

---

## JSON Export

The Sprint Compliance Summary JSON (see "OUTPUT PER SPRINT" section above)
serves as the JSON export for this contract.

---

## HANDOFF CHECKLIST (COMPLIANCE REVIEWER → PR/REVIEW AGENT)

```
## COMPLIANCE HANDOFF CHECKLIST – [Sprint ID] – [Date]
- [ ] Compliance report present per story
- [ ] Sprint Compliance Summary JSON present and valid
- [ ] All stories: overall status COMPLIANT
- [ ] No CRITICAL or MAJOR violations unresolved
- [ ] Rework iterations documented
- [ ] Authority documents used are listed
- [ ] Escalations forwarded to Orchestrator (if any)
```

---

## VALIDATION CRITERIA (AUTOMATIC REJECT)

An output is automatically rejected if:

1. Any story has an unresolved `CRITICAL` or `MAJOR` violation
2. Sprint Compliance Summary JSON is missing or malformed
3. A required authority document was not loaded for an active tier
4. Rework loop limit exceeded without escalation
5. Violation detail lacks traceability (missing design decision ref OR code
   location)

### Cross-reference: ORC-35

**ORC-35**: If this contract's output fails validation 3 consecutive times in
the same session, the Orchestrator escalates to the user with options:
ACCEPT_PARTIAL, RETRY_SIMPLIFIED, or MANUAL_OVERRIDE.
````
