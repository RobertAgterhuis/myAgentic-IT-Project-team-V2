# Guardrails: Implementation (Phase 5)

> Version 1.0 | Applies to: Implementation Agent, Test Agent, PR/Review Agent

---

## PURPOSE

These guardrails safeguard the quality, security, and traceability of every
autonomous code implementation. They are supplementary to the global guardrails
(`00-global-guardrails.md`) and the phase-specific guardrails from the analysis
period.

---

## ENFORCEMENT & CONTRACT REFERENCE

| Rule Range   | Primary Enforcer          | Verification Agent            | Related Contract                             | Default Violation Action |
| ------------ | ------------------------- | ----------------------------- | -------------------------------------------- | ------------------------ |
| G-IMPL-01–04 | Implementation Agent (20) | Compliance Reviewer (38) — T1 | `implementation-output-contract.md`          | BLOCK + rework           |
| G-IMPL-05–08 | Implementation Agent (20) | Test Agent (21)               | `test-output-contract.md`                    | BLOCK + rework           |
| G-IMPL-09–12 | Implementation Agent (20) | Compliance Reviewer (38) — T1 | `architecture-compliance-output-contract.md` | BLOCK + rework           |
| G-IMPL-13–15 | Implementation Agent (20) | Compliance Reviewer (38) — T2 | `implementation-output-contract.md`          | BLOCK + rework           |
| G-IMPL-16–20 | Implementation Agent (20) | PR/Review Agent (22)          | `pr-review-output-contract.md`               | BLOCK merge              |
| G-IMPL-21–24 | Test Agent (21)           | Compliance Reviewer (38) — T1 | `test-output-contract.md`                    | BLOCK + rework           |
| G-IMPL-25–28 | PR/Review Agent (22)      | Orchestrator (00)             | `pr-review-output-contract.md`               | BLOCK merge              |
| G-IMPL-29–32 | Implementation Agent (20) | Compliance Reviewer (38) — T3 | `implementation-output-contract.md`          | WARN + document          |
| G-IMPL-33–36 | All Phase 5 Agents        | Orchestrator (00)             | `agent-handoff-contract.md`                  | BLOCK handoff            |

See also the **Violation Handling Response Table** at the end of this file for per-rule actions.

---

## SECTION 1: SCOPE DISCIPLINE

**G-IMPL-01 (CRITICAL):** An Implementation Agent implements EXCLUSIVELY the
sprint story for which it has been activated (SP-N-NNN). Changes outside the
story scope require an explicit `SCOPE_EXTENSION:` notification with approval
from the Orchestrator.

**G-IMPL-02 (CRITICAL):** The implementation MUST be traceable to an
approved recommendation (REC-NNN) via the sprint plan. No code without a
recommendation reference.

**G-IMPL-03:** When in doubt about scope: HALT, document as
`UNCERTAIN: scope`, escalate to Orchestrator. NEVER expand the scope
independently.

---

## SECTION 2: ARCHITECTURE INTEGRITY

**G-IMPL-04 (CRITICAL):** Every architecture choice in the implementation
MUST be consistent with the decisions in the Phase 2 output (Software
Architect + Senior Developer). On conflict: HALT +
`ARCH_CONFLICT: [description]` + escalate. This guardrail is **externally
verified** by the Architecture Compliance Reviewer (agent 38, skill:
`38-architecture-compliance-reviewer.md`) as part of the Phase 5 compliance
gate. The Implementation Agent performs initial self-check; the Compliance
Reviewer provides authoritative validation before PR merge.

**G-IMPL-05:** Do not introduce new external dependencies without:

- Explicit mention in the sprint story or architecture decision
- `DEPENDENCY_ADDED: [name, version, reason]` notification in the output

**G-IMPL-06:** Existing API contracts (internal and external) may NOT be
broken by implementation. Breaking changes require
`BREAKING_CHANGE: [description, impact, migration path]`. See ORC-21 for the
authoritative definition of 'breaking change'.

**G-IMPL-07:** Database schema changes require:

- Forward compatibility (migration up)
- Backward compatibility (migration down) UNLESS explicitly exempted by Data
  Architect output
- `SCHEMA_CHANGE: [table, column/index, reason]` documentation

---

## SECTION 3: CODE QUALITY

**G-IMPL-08:** The implementation MUST follow the existing code conventions
identified in the Phase 2 Senior Developer analysis. No deviating style without
`STYLE_EXCEPTION: [reason]`.

**G-IMPL-09:** No hardcoded credentials, API keys, tokens, or secrets in
code. Upon detection: HALT, `SECURITY_VIOLATION: hardcoded secret`, escalate
immediately to Security Architect.

**G-IMPL-10:** No `TODO`, `FIXME`, `HACK`, or `XXX` comments in implemented
code unless accompanied by a story reference and estimated resolution date.

**G-IMPL-11:** Dead code (unreachable code, unused variables, unused
imports) may not be introduced.

---

## SECTION 4: TEST REQUIREMENTS

**G-IMPL-12 (CRITICAL):** Every acceptance criterion of the sprint story
MUST be covered by at least one automated test. No exceptions.

**G-IMPL-13 (CRITICAL):** Regression is NOT allowed. If existing tests fail
after implementation: HALT, analyze root cause, fix BEFORE handoff.

**G-IMPL-14:** Test types per acceptance criterion:

- Unit test: for isolated logic
- Integration test: for interaction between components
- End-to-end test: for user flows (where applicable)
- Choose the most appropriate type — document the choice

**G-IMPL-15:** Test coverage may not decrease relative to the baseline.
`COVERAGE_DELTA` in IMPL-OUTPUT-B MUST be ≥ 0.

---

## SECTION 5: SECURITY

**G-IMPL-16 (CRITICAL):** All input from outside the system boundary (user
input, API responses, file uploads) MUST be validated and sanitized.

**G-IMPL-17 (CRITICAL):** No SQL string concatenation with user input.
Always use parameterized queries or ORM.

**G-IMPL-18:** Authentication and authorization checks may not be bypassed
or disabled, not even in test/debug code.

**G-IMPL-19:** Logging may NEVER contain personally identifiable information
(PII), passwords, or tokens.

**G-IMPL-20:** Security findings from Phase 2 (Security Architect)
classified as P1 or P2 are NOT ignored when touching related code. Document
`SEC_FINDING_PRESENT: [id]` when the story modifies adjacent code.

---

## SECTION 6: TRACEABILITY AND DOCUMENTATION

**G-IMPL-21:** Every commit MUST contain a clear conventional commit message
with story reference:

- Format: `[type](scope): description [SP-N-NNN]`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**G-IMPL-22:** Public API changes (endpoints, SDK interfaces, events)
require updated documentation in the same commit.

**G-IMPL-23:** The Sprint Completion Report JSON MUST be machine-readable
and valid for transfer to the Final Report.

---

## SECTION 7: AUTONOMOUS DECISION LIMITS

**G-IMPL-24 (CRITICAL):** The Implementation Agent may decide INDEPENDENTLY
on:

- Choice of algorithmic implementation within the story scope
- Internal structure of new files
- Test naming and test structure
- Refactoring of code WITHIN the modified files (no scope extension)

**G-IMPL-25 (CRITICAL):** The Implementation Agent MUST ALWAYS escalate
when:

- Architecture choices contradict Phase 2 decisions
- Discovery of a new CRITICAL_FINDING (security, data, architecture)
- Conflict between two guardrails
- Ambiguity about acceptance criteria
- A blocker arises during implementation

**G-IMPL-26:** Escalation format:

```
ESCALATE:
  Type: ARCH_CONFLICT | CRITICAL_FINDING | GUARDRAIL_CONFLICT | AC_UNCLEAR | NEW_BLOCKER
  Story: SP-N-NNN
  Description: [exactly what was discovered]
  Impact estimate: [which other stories/systems are affected]
  Recommended action: [what the agent thinks should happen]
  Status: HALT — awaiting Orchestrator decision
```

---

## SECTION 8: KPI AND MEASUREMENT

**G-IMPL-27:** After completion of a sprint the Sprint KPI MUST be measured
per the SMART goals from the sprint plan. No estimation — actual measurement or
`MEASUREMENT_IMPOSSIBLE: [reason]` with escalation.

**G-IMPL-28:** If a KPI target is NOT met after sprint: document as
`KPI_MISS: [id, target, realized, analysis]` in the Sprint Completion Report. No
cover-up actions.

---

## GUARD 29–30: TRACK INDEPENDENCE (CRITICAL)

**G-IMPL-29 (CRITICAL):** The Implementation Agent processes EXCLUSIVELY
stories with `story_type` `CODE` or `INFRA`. Upon receiving a story with type
`DESIGN`, `CONTENT`, `ANALYSIS`, `DOCS`, or `CONFIG`: **HALT**,
`ROUTING_ERROR: story_type [type] does not belong in the implementation pipeline`,
escalate to Orchestrator.

**G-IMPL-30 (CRITICAL):** A blocker on a DESIGN-, CONTENT-, or
ANALYSIS-story may NEVER be registered as a blocker on a CODE- or INFRA-story.
Upon detection:
`CROSS_TRACK_BLOCKER: [story-id of blocker source] has type [type] and may not block story [code-story-id]`,
escalate to Orchestrator.

**G-IMPL-31 (CRITICAL):** Feature Implementation Isolation — Implementation
Agents running under a FEATURE cycle scope MUST NOT modify files outside
`Workitems/[FEATURENAME]/` and the project source directories. Cross-boundary
changes require `SCOPE_EXTENSION:` + Orchestrator approval.

**G-IMPL-32 (CRITICAL):** Decision Compliance — Before handoff, the
Implementation Agent MUST verify that its code changes do not contradict any
active `DECIDED` item. Read `BusinessDocs/decisions.md` (uncategorized) and all
ACTIVE/PARTIAL category files in `BusinessDocs/decisions/`. Skip DEFERRED
category files. For each applicable decision, confirm compliance. On violation:
`DEC-VIOLATION: [DEC-ID] — [description]`, remediate before handoff. The Test
Agent (Step 6b) and PR/Review Agent (Step 2g) independently verify this —
violations caught at review are treated as Implementation Agent failures.

**G-IMPL-33 (CRITICAL):** Deferred Technology Introduction — When a story
requires introducing a technology that matches a DEFERRED decision category in
`BusinessDocs/decisions/` (Docker, Bicep/IaC, .NET, Azure DevOps, Vite, NextJS),
the Implementation Agent MUST **HALT** before writing code and escalate:
`DEFERRED_TECH_REQUIRED: [category]`. The Orchestrator will **auto-activate**
the category (RULE ORC-45) by editing the file headers and index, then resume
the agent. No user intervention is required. Violation:
`GUARDRAIL_VIOLATION: G-IMPL-33 — technology introduced without activating deferred decisions`.

---

## VIOLATED? THEN DO THIS:

| Guard code   | On violation                                                                             |
| ------------ | ---------------------------------------------------------------------------------------- |
| G-IMPL-01/02 | HALT, document, await Orchestrator                                                       |
| G-IMPL-04    | HALT, `ARCH_CONFLICT:`, escalate (externally verified by Compliance Reviewer)            |
| G-IMPL-09    | HALT, `SECURITY_VIOLATION:`, escalate immediately                                        |
| G-IMPL-12    | Story is NOT done, write test                                                            |
| G-IMPL-13    | HALT, fix regression BEFORE handoff                                                      |
| G-IMPL-25    | HALT, escalate per G-IMPL-26 format                                                      |
| G-IMPL-29    | HALT, `ROUTING_ERROR:`, escalate to Orchestrator                                         |
| G-IMPL-30    | HALT, `CROSS_TRACK_BLOCKER:`, escalate to Orchestrator                                   |
| G-IMPL-32    | `DEC-VIOLATION:`, remediate before handoff; repeat violations → escalate to Orchestrator |
| G-IMPL-33    | HALT, `DEFERRED_TECH_REQUIRED:`, escalate to Orchestrator for category activation        |
| G-IMPL-34    | `COMPLIANCE_REWORK:`, fix violations, re-submit through Test Agent                       |
| G-IMPL-35    | `COMPLIANCE_LOOP_EXCEEDED:`, escalate to Orchestrator                                    |
| G-IMPL-36    | `DESIGN_REVISION_NEEDED:`, escalate to Orchestrator                                      |

---

## SECTION 10: ARCHITECTURE COMPLIANCE GATE

**G-IMPL-34 (CRITICAL):** After the Test Agent approves all stories in a
sprint, the **Architecture Compliance Reviewer** (agent 38) MUST review the
implementation against Phase 1–4 design decisions before the PR/Review Agent
creates the sprint PR. The compliance gate operates in three tiers:

- **T1 (Architecture Conformance):** Always active. Code vs Phase 2 decisions.
- **T2 (UX/Design Conformance):** Active when the sprint modifies UI files. Code
  vs Phase 3 design system and component inventory.
- **T3 (Business Rules Conformance):** Active when the sprint modifies business
  logic. Code vs Phase 1 business rules and financial models.

On `NON_COMPLIANT` verdict: the story is returned to the Implementation Agent
with `COMPLIANCE_REWORK: [STORY-ID]` + full violation detail. The Implementation
Agent MUST fix all violations, re-submit through the Test Agent, and pass the
compliance review before the story can proceed.

**G-IMPL-35 (CRITICAL):** The compliance rework loop is limited to
**3 iterations** per story per sprint. After 3 failed compliance reviews for the
same story, the Architecture Compliance Reviewer escalates:
`COMPLIANCE_LOOP_EXCEEDED: [STORY-ID]`. The Orchestrator decides:
`ACCEPT_WITH_WAIVER`, `REVISE_DESIGN_DECISION`, or `MANUAL_OVERRIDE`. Waivers
are documented as `DECIDED` items in `BusinessDocs/decisions.md`.

**G-IMPL-36:** When the Architecture Compliance Reviewer discovers that a
Phase 1–4 design decision is **outdated or incorrect** based on implementation
reality, it escalates: `DESIGN_REVISION_NEEDED: [decision-ref] — [reason]`. The
Orchestrator triggers a targeted REEVALUATE for the affected Phase. The
compliance gate is paused until the design decision is updated.

**PROHIBITION:** A sprint PR may NOT be created by the PR/Review Agent until the
Architecture Compliance Reviewer has issued `compliance_gate_status: "PASSED"`
for the sprint.
