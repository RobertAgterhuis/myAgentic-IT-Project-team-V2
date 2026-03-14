# Brand Strategist Guardrails — CREATE Mode

> **Agent:** 14-brand-strategist  
> **Phase:** 4 — Brand & Growth  
> **Deliverable:** 4 of 4 (Guardrails)  
> **Date:** 2026-03-10T14:20:00Z  
> **Mode:** CREATE  
> **Based on analysis:** `14-brand-strategist-analysis.md`

---

## Metadata

- Agent: Brand Strategist (14)
- Phase: 4
- Date: 2026-03-10
- Based on: Brand Strategist Analysis + Recommendations

---

## Guardrail G-BS-001

### Title

Brand Values in All Internal Communication

### Scope

- Applies to: All internal messaging (team meetings, standups, retrospectives,
  decision communications)
- Time horizon: Permanent

### Rule

No major team decision (product pivot, feature prioritization, team structure
change, roadmap shift) may be communicated or implemented without explicit
reference to how it aligns with 3 or more brand core values.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-BS-001`; escalate to Brand Steward and Product
Manager for re-communication with values alignment.

### Rationale

Brand values are not just external marketing; they guide internal culture and
decision-making. If internal decisions contradict espoused brand values,
organization will be perceived as inauthentic once values are externalized in
marketing. Source: GAP-BS-001 (brand values define culture), RISK-BS-003
(positioning credibility requires internal alignment).

### Verification Method

Quarterly brand audit: Review major decisions made last quarter → verify each
references values alignment in decision documentation (decisions.md or meeting
notes).

---

## Guardrail G-BS-002

### Title

Design Token Naming Must Be Brand-Semantically Justified

### Scope

- Applies to: All new design tokens added to design token system (Agent 31
  component library, Agent 30 brand assets)
- Time horizon: Permanent

### Rule

Every design token must satisfy TWO criteria: (1) Technical naming convention
(semantic, not visual), AND (2) Brand psychology justification (token name must
map to explicit brand color psychology or personality attribute).

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-BS-002`; reject token definition in PR until both
naming convention and brand mapping are documented.

### Rationale

Tokens are visual language; must serve both technical consistency (Agent 12, 31)
and brand authenticity (Agent 14). Tokens named only for technical reasons
(color-neutral-600) may not reflect brand personality. Source: RISK-BS-002
(token-first system may conflict with brand-first vision) — guardrail prevents
conflict.

### Verification Method

Design system CI check: Verify color-\* tokens include brand mapping
documentation (comment in design-tokens.json or companion mapping doc).

---

## Guardrail G-BS-003

### Title

Voice Consistency Across Channels Audit Enforcement

### Scope

- Applies to: All customer-facing communications across product UI, marketing
  site, support, documentation, social media
- Time horizon: Quarterly (audit frequency) + permanent (rule)

### Rule

All customer-facing copy, regardless of channel, must pass voice consistency
audit per quarterly schedule. Failure to pass audit delays feature launch,
marketing campaign, or documentation publication.

### Violation Action

Mark `AUDIT_FAILURE: [channel] – voice inconsistency detected`; escalate to
Marketing Lead and Content Strategist (Agent 32) for remediation.
Launch/publication blocked until re-audit passes.

### Rationale

Voice is most human element of brand. Inconsistent voice erodes user trust and
brand perception. Source: RISK-BS-005 (voice & tone alignment at risk),
REC-BS-003 (unified voice guide required). Guardrail enforces ongoing
consistency, not one-time correctness.

### Verification Method

Quarterly brand voice audit: Sample 5-10 pieces of content per channel (product
UI copy, marketing website pages, support articles, documentation section) →
compare against voice guide on 4 attributes (precise, calm, action-oriented,
transparent) → score pass/fail per channel.

---

## Guardrail G-BS-004

### Title

Brand Governance Approval Required for Out-of-Brand Decisions

### Scope

- Applies to: New marketing campaigns, feature launches with naming, pricing
  tier naming, design system extensions, social media strategy changes
- Time horizon: Permanent

### Rule

Any marketing campaign, feature launch, or design system extension that deviates
from published brand guidelines must receive Brand Steward written approval 2
weeks before launch. Deviations include: new color introduction, tone shift,
messaging reframe, naming convention change, or asset style change. If approval
not obtained, launch is blocked.

### Violation Action

Mark `ESCALATION: Brand governance approval required`; escalate to Brand
Steward. Launch blocked until approval documented.

### Rationale

Governance is enabler, not constraint. Clear rules allow Product and Marketing
to move fast without creating brand chaos. Without enforcement, brand dilutes
over time. Source: RISK-BS-004 (brand consistency governance not yet
established). Guardrail operationalizes governance.

### Verification Method

Brand governance committee: PR submission for campaigns/launches must include
brand governance approval checklist. Marketing team confirms "brand steward
approval obtained: YES/NO" before merge.

---

## Guardrail G-BS-005

### Title

Brand Personality Consistency in Feature Naming & Messaging

### Scope

- Applies to: All new feature names, product tier names, agent names, and
  associated messaging
- Time horizon: Permanent

### Rule

Feature naming and associated messaging must authentically express brand
personality (Sage: rigorous, evidence-based, educational; Creator: innovative,
empowering, ambitious) OR be explicitly flagged as experimental/beta. Features
with conflicting personality (e.g., overly casual humor in enterprise product)
are rejected.

### Violation Action

Mark
`PERSONALITY_MISMATCH: [feature name] – messaging conflicts with [Primary/Secondary] archetype`;
escalate to Brand Strategist and Product Manager for re-messaging.

### Rationale

Brand personality drives user expectations. If feature messaging doesn't match
brand personality, users perceive inconsistency or inauthenticity. Source:
RISK-BS-001 (Sage personality may undersell innovation) — guardrail ensures
features reinforce personality coherence, not undermine it.

### Verification Method

Brand Strategist review of feature messaging during product design review: Does
feature messaging align with Sage (rigorous) and Creator (innovative)
archetypes? If conflict, request revision before feature greenlight.

---

## Guardrail G-BS-006

### Title

Brand Architecture Decision Adherence for Product Extensions

### Scope

- Applies to: All new products, product tiers, agent types, industry-specific
  offerings launched post-Phase 5
- Time horizon: Permanent; applies only when new products/tiers are being
  considered

### Rule

Any new product, tier, or offering must follow the Brand Architecture decision
rules documented in REC-BS-005 (Branded House decision table). Deviations from
agreed architecture rules require explicit Product Manager + Brand Steward
decision and documentation in decisions.md before launch.

### Violation Action

Mark
`ARCHITECTURE_VIOLATION: [product/tier] – does not follow Brand Architecture decision rules`;
escalate to Product Manager + Brand Steward for decision documentation.

### Rationale

Brand architecture prevents fragmentation as organization scales. If each new
product makes independent branding decisions, brand family becomes confused.
Source: GAP-BS-005 (brand architecture not scoped), REC-BS-005 (brand
architecture documentation required). Guardrail enforces architecture
consistency.

### Verification Method

Pre-launch review: Product manager must reference brand architecture decision
table and document that new offering follows approved rule. Deviation requires
new decision in decisions.md (DEC-NNN format).

---

## Guardrail G-BS-007

### Title

Color Psychology Fidelity In Semantic Token Usage

### Scope

- Applies to: All usage of semantic color tokens in components, pages, and
  features
- Time horizon: Permanent

### Rule

Semantic color tokens must be used consistent with their brand-defined
psychological meaning. Example: `color-semantic-success` (green) must ONLY be
used to indicate positive outcomes / successful completion. Misuse (e.g., green
for warning) violates color psychology consistency.

### Violation Action

Mark `GUARDRAIL_VIOLATION: G-BS-007 – semantic token misuse`; reject PR and
require developer to use correct token per color psychology specification.

### Rationale

Color has psychological meaning. When used inconsistently across product, users
experience cognitive friction (green means go, but product uses it for warning =
confusion). Source: RISK-BS-002 (token-first design system must integrate brand
color psychology). Guardrail enforces alignment.

### Verification Method

Design system CI check or component library documentation: For each semantic
token, document correct usage (success for positive outcomes, error for
failures, warning for caution, info for information). Component usage audit:
review all instances of semantic tokens — verify usage matches psychology spec.

---

## Guardrails Overview

| ID       | Title                                                         | Scope                       | Category           | Verification      |
| -------- | ------------------------------------------------------------- | --------------------------- | ------------------ | ----------------- |
| G-BS-001 | Brand Values in All Internal Communication                    | Internal decisions          | Culture            | Quarterly audit   |
| G-BS-002 | Design Token Naming Must Be Brand-Semantically Justified      | Design system               | Design system      | CI check          |
| G-BS-003 | Voice Consistency Across Channels Audit Enforcement           | All channels                | Brand consistency  | Quarterly audit   |
| G-BS-004 | Brand Governance Approval Required for Out-of-Brand Decisions | Marketing, features, design | Governance         | PR checklist      |
| G-BS-005 | Brand Personality Consistency in Feature Naming & Messaging   | Feature launches            | Brand personality  | Design review     |
| G-BS-006 | Brand Architecture Decision Adherence for Product Extensions  | Product roadmap             | Brand architecture | Pre-launch review |
| G-BS-007 | Color Psychology Fidelity In Semantic Token Usage             | Component usage             | Design system      | CI + audit        |

---

## HANDOFF CHECKLIST

- [x] All guardrails are testable and actionable
- [x] Violation action defined per guardrail
- [x] Verification method defined per guardrail
- [x] Rationale linked to analysis gaps/risks
- [x] No duplicates with global or Phase 3 guardrails (G-UID, G-A11Y, G-CS,
      G-L10N are different scope)
- [x] Guardrails protect core brand identity, consistency, and extensibility
- [x] Ready for handoff to implementation teams (Phase 5)

**Status:** COMPLETE  
**Next Step:** Update session state and commit all Agent 14 deliverables
