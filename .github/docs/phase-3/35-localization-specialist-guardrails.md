# Localization Specialist Guardrails — CREATE Mode

> **Agent:** 35-localization-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10  
> **Based on analysis:**
> `.github/docs/phase-3/35-localization-specialist-analysis.md`

---

## Metadata

- Agent: Localization Specialist (35)
- Phase: 3
- Date: 2026-03-10
- Based on analysis: `35-localization-specialist-analysis.md`
- Mode: CREATE

---

## Guardrail G-L10N-001

### Title

Hardcoded String Prohibition

### Scope

- Applies to: all UI-bearing components and feature code
- Time horizon: Permanent

### Rule

No hardcoded user-facing strings in production code. All text must be
externalized as translation keys.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-L10N-001`; block PR merge until string is
externalized.

### Rationale

Hardcoded strings prevent localization and increase translation cost through
duplicated manual extraction.

### Verification Method

Automated lint rule for non-translatable text literals in component code.

---

## Guardrail G-L10N-002

### Title

i18n Key Naming Convention Adherence

### Scope

- Applies to: all translation key definitions
- Time horizon: Permanent

### Rule

Translation keys must follow approved naming convention with semantic
namespacing; no positional or arbitrary keys.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-L10N-002`; reject key definition in PR review.

### Rationale

Consistent key semantics prevent translator confusion and translation memory
fragmentation.

### Verification Method

CI lint check for key pattern compliance and semantic namespace validation.

---

## Guardrail G-L10N-003

### Title

Locale-Aware Formatting (Date/Time/Number/Currency)

### Scope

- Applies to: all date/time/number/currency rendering
- Time horizon: Permanent

### Rule

No hardcoded date/time/number/currency formatting. All rendering must use
locale-aware APIs (Intl.\* or equivalent).

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-L10N-003`; block PR and require refactor to locale
API.

### Rationale

Hardcoded formatting breaks in any locale other than the original design.

### Verification Method

Automated lint check for hardcoded format strings and audit of
formatting-related code.

---

## Guardrail G-L10N-004

### Title

Localization Evidence Gate at Release

### Scope

- Applies to: releases to target locales beyond base locale
- Time horizon: Permanent

### Rule

No release candidate for a target locale may deploy without approved
localization evidence per tier threshold.

### Violation Action

Mark `BLOCKED: localization-evidence-incomplete`; escalate to Orchestrator.

### Rationale

Unverified localization can ship critical errors and undermine quality trust.

### Verification Method

Evidence checklist in release sign-off and QA sign-off per locale.

---

## Guardrail G-L10N-005

### Title

Translator Context Metadata Requirements

### Scope

- Applies to: translation key definitions with ambiguous or constrained copy
- Time horizon: Permanent

### Rule

Every externalized key with ambiguous intent, length constraints, or special
terminology must include developer context.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-L10N-005`; reject key definition in PR.

### Rationale

Context prevents mistranslations and accelerates translator review cycles.

### Verification Method

Manual review of high-risk keys before externalization and TMS metadata audit.

---

## Guardrail G-L10N-006

### Title

Locale Tier Strategy Stability

### Scope

- Applies to: agreed-upon locale tiers and market roadmap
- Time horizon: Phase 3 / annual review

### Rule

Locale tier assignments (Tier 1/2/3) may only change via formal ADD/REMOVE
decision gate documented in session/decisions.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-L10N-006`; escalate to Orchestrator for
scope-change process.

### Rationale

Uncontrolled locale changes create unpredictable translation and localization QA
load.

### Verification Method

Session decision log audit and roadmap stability review per sprint.

---

## Guardrail Overview

| ID         | Title                                    | Scope                     | Priority | Verification               |
| ---------- | ---------------------------------------- | ------------------------- | -------- | -------------------------- |
| G-L10N-001 | Hardcoded String Prohibition             | UI-bearing code           | Critical | Lint automation            |
| G-L10N-002 | i18n Key Naming Convention Adherence     | Translation keys          | Critical | CI pattern check           |
| G-L10N-003 | Locale-Aware Formatting                  | Date/time/number/currency | Critical | Lint + code audit          |
| G-L10N-004 | Localization Evidence Gate at Release    | Release candidates        | High     | Release sign-off checklist |
| G-L10N-005 | Translator Context Metadata Requirements | Key definitions           | High     | PR review + TMS audit      |
| G-L10N-006 | Locale Tier Strategy Stability           | Locale roadmap            | Medium   | Decision log audit         |

---

## HANDOFF CHECKLIST

- [x] All guardrails are testable and actionable
- [x] Violation action defined per guardrail
- [x] Verification method defined per guardrail
- [x] Rationale linked to analysis gaps/risks
- [x] No duplicates with global or UX guardrails
- [x] Guardrails protect core localization quality and consistency
- [x] Ready for handoff

**Status:** READY  
**Next Step:** Critic + Risk Agent for Phase 3 combined validation
