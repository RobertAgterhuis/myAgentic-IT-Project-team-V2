# Content Strategist Guardrails — CREATE Mode

> **Agent:** 32-content-strategist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10  
> **Based on analysis:**
> `.github/docs/phase-3/32-content-strategist-analysis.md`

---

## Metadata

- Agent: Content Strategist / UX Writer (32)
- Phase: 3
- Date: 2026-03-10
- Based on analysis: `32-content-strategist-analysis.md`
- Mode: CREATE

---

## Guardrail G-CS-001

### Title

No Production-Ready Copy in Strategy Outputs

### Scope

- Applies to: all Content Strategist deliverables
- Time horizon: Permanent

### Rule

Content Strategist outputs must contain frameworks, patterns, and illustrative
examples only. Final product copy is prohibited.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-CS-001`; reject deliverable and require rewrite.

### Rationale

Maintains contract boundaries and avoids premature copy lock before
brand/localization phases.

### Verification Method

Manual review for final-sounding slogans, definitive UI labels, or campaign
claims.

---

## Guardrail G-CS-002

### Title

Canonical Terminology Enforcement

### Scope

- Applies to: style guide, glossary, UI content framework reviews
- Time horizon: Permanent

### Rule

Every core product concept must have one canonical term; synonym swapping in
workflow-critical labels is prohibited.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-CS-002`; block content approval until glossary
alignment is complete.

### Rationale

Prevents terminology drift that increases cognitive load and support overhead.

### Verification Method

Terminology audit checklist on each sprint-end content review.

---

## Guardrail G-CS-003

### Title

Error Message Actionability Minimum

### Scope

- Applies to: error and validation content frameworks
- Time horizon: Permanent

### Rule

All error frameworks must include both issue description and corrective next
action; generic failure text without recovery guidance is prohibited.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-CS-003`; return framework for revision.

### Rationale

Mitigates high-risk confusion in failure states.

### Verification Method

Error framework audit against required fields template.

---

## Guardrail G-CS-004

### Title

Readability and Jargon Control

### Scope

- Applies to: UI/help content framework standards
- Time horizon: Permanent

### Rule

Content frameworks must define readability thresholds and acronym/jargon
policies; unexplained acronyms in user-facing guidance are prohibited.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-CS-004`; content guideline cannot be approved.

### Rationale

Prevents gradual readability regression and accessibility conflicts.

### Verification Method

Readability rubric check in content governance review.

---

## Guardrail G-CS-005

### Title

Localization-Ready Handoff Gate

### Scope

- Applies to: handoff from Content Strategist (32) to Localization Specialist
  (35)
- Time horizon: Phase 3 completion

### Rule

Localization work may not start until style guide, glossary, content map, and
tone framework are versioned and handed off.

### Violation Action

Mark `BLOCKED: localization-handoff-incomplete`; escalate to Orchestrator.

### Rationale

Avoids localization churn from incomplete source-content guidance.

### Verification Method

Handoff checklist requiring all mandatory artifacts.

---

## Guardrail G-CS-006

### Title

Content-Accessibility Consistency Check

### Scope

- Applies to: content frameworks touching forms, errors, onboarding, help
- Time horizon: Permanent

### Rule

Content frameworks must be reviewed for consistency with Accessibility
Specialist requirements before final approval.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-CS-006`; hold approval until accessibility review
completed.

### Rationale

Prevents conflicts between clarity guidance and WCAG-aligned communication
requirements.

### Verification Method

Cross-review signoff by Accessibility Specialist (13) in content review
workflow.

---

## Guardrail Overview

| ID       | Title                                        | Scope                              | Priority | Verification                    |
| -------- | -------------------------------------------- | ---------------------------------- | -------- | ------------------------------- |
| G-CS-001 | No Production-Ready Copy in Strategy Outputs | Content strategist deliverables    | Critical | Manual compliance review        |
| G-CS-002 | Canonical Terminology Enforcement            | Glossary and UI framework language | Critical | Terminology audit checklist     |
| G-CS-003 | Error Message Actionability Minimum          | Error/validation frameworks        | High     | Framework field audit           |
| G-CS-004 | Readability and Jargon Control               | UI/help content standards          | High     | Readability rubric review       |
| G-CS-005 | Localization-Ready Handoff Gate              | Agent 32 -> Agent 35 handoff       | Critical | Handoff artifact checklist      |
| G-CS-006 | Content-Accessibility Consistency Check      | Form/help/error content frameworks | High     | Accessibility co-review signoff |

---

## HANDOFF CHECKLIST

- [x] Guardrails are testable and actionable
- [x] Violation action defined per guardrail
- [x] Verification method defined per guardrail
- [x] Rationale linked to analysis gaps/risks
- [x] No duplicate IDs with global guardrails set
- [x] No production-ready copy included
- [x] Localization handoff dependency explicitly protected
- [x] Ready for handoff

**Status:** READY  
**Next Agent:** 35-localization-specialist
