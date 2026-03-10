# Localization Specialist Analysis — CREATE Mode

> **Agent:** 35-localization-specialist  
> **Phase:** 3 — Experience Design  
> **Deliverable:** 1 of 4 (Analysis)  
> **Created:** 2026-03-10T12:30:00Z  
> **Mode:** CREATE

---

## Metadata

- Agent: Localization Specialist (35)
- Phase: 3
- Input received from: Content Strategist (32), UI Designer (12), Accessibility
  Specialist (13), Software Architect (05), Sales Strategist (03), Domain Expert
  (02)
- Date: 2026-03-10
- Software under analysis: MYAGENTIC-IT-PROJECT-TEAM-V2
- Mode: CREATE
- Step 0 questionnaire context: NOT_INJECTED

---

## 1. Solution Design (Localization and i18n Strategy)

### 1.1 Target Locale Strategy (Tiered)

Current strategic direction indicates international expansion intent but no
finalized launch language list.

Proposed tier model:

- Tier 1 (launch-ready architecture + initial localization): `INSUFFICIENT_DATA`
  pending market confirmation
- Tier 2 (post-launch): `INSUFFICIENT_DATA`
- Tier 3 (future): `INSUFFICIENT_DATA`

Interim architecture rule:

- Build for multi-locale readiness immediately even if Tier 1 locales are not
  finalized.

- Source: `.github/docs/phase-1/02-domain-expert-analysis.md`,
  `.github/docs/phase-1/03-sales-strategist-analysis.md`,
  `.github/docs/phase-3/32-content-strategist-analysis.md`
- Impact: High

### 1.2 i18n Architecture Requirements

String externalization:

- All user-facing strings must reside in translation resources
  (`locales/<locale>/<namespace>.json` equivalent structure).
- Prohibit direct UI literals in components except debug-only non-user text.

Key naming convention:

- Domain-scoped semantic keys: `screen.section.intent.variant`
- Example pattern only: `dashboard.phaseStatus.blocked.helper`
- No positional keys like `label_1`, `msg_7`

Context and extractability:

- Every key includes developer comment/context metadata where ambiguity exists.
- Resource extraction must be scriptable in CI and diffable.

Pluralization framework:

- Use ICU MessageFormat-compatible strategy.
- Must support locale-specific plural categories beyond singular/plural.

Formatting:

- Date/time/number/currency formatting via locale-aware APIs (`Intl.*` or
  equivalent).
- UTC storage + locale display policy required.

- Source: `.github/docs/phase-2/05-software-architect-analysis.md`,
  `.github/docs/phase-3/32-content-strategist-analysis.md`
- Impact: High

### 1.3 RTL and Layout Requirements

RTL support status:

- `NOT_REQUIRED_FOR_LAUNCH` is currently unconfirmed; do not assume exclusion.

Requirement baseline:

- Layout system must be compatible with directional attributes (`dir=ltr/rtl`).
- Use logical CSS properties in component specs where feasible.
- Navigation and icon mirroring rules must be documented before RTL locales are
  introduced.

- Source: `.github/docs/phase-3/12-ui-designer-analysis.md`
- Impact: Medium

### 1.4 Cultural Suitability Requirements (Framework)

No market-specific cultural claims are asserted without verified source
evidence.

`L10N_CULTURAL_REQ:`

- Icons and symbols must pass market review for semantic clarity.
- Illustrations with region-specific meaning require review before localization
  release.
- Idioms and colloquialisms are prohibited in core workflow microcopy.

- Source: `.github/docs/guardrails/08-content-guardrails.md` (G-CNT-05)
- Impact: Medium

### 1.5 Translation Workflow Design

Workflow model:

1. Source content freeze for sprint scope
2. String extraction and key diff generation
3. Translation in TMS
4. Linguistic review + in-context review
5. Build validation (missing key checks, fallback checks)
6. Release integration

TMS recommendation (shortlist):

- Phrase, Lokalise, Crowdin, Transifex (selection pending procurement/tooling
  constraints)

Glossary process:

- Content Strategist glossary as source-of-truth
- Locale-specific term decisions documented per release

Release strategy:

- Critical workflow strings should be release-blocking for targeted locales
- Non-critical help/documentation strings may be async with explicit fallback
  behavior

`DEPENDENT_ON: DevOps Engineer (07)` for CI integration.

- Source: `.github/docs/phase-2/07-devops-engineer-analysis.md`,
  `.github/docs/phase-3/32-content-strategist-analysis.md`
- Impact: High

### 1.6 Market Expansion Readiness Model (MVL)

Minimum Viable Localization (MVL) per target market must include:

- Core workflow UI strings localized
- Error/recovery framework localized
- Locale-aware formatting enabled
- Legal and support-critical content localized
- Glossary and terminology validation complete

Readiness states:

- READY: architecture and content package complete
- PARTIAL_ADJUSTMENT: key gaps identified but non-blocking
- BLOCKING: architectural or content prerequisites missing

- Source: `.github/docs/phase-1/03-sales-strategist-analysis.md`
- Impact: High

---

## 2. Requirements Gaps

### 2.1 GAP-L10N-001 — Target Launch Locale List Unconfirmed

- Description: No approved Tier 1 language list is documented.
- Source: cross-phase artifact review
- Risk if unresolved: localization roadmap cannot be prioritized accurately.
- Priority: Critical

### 2.2 GAP-L10N-002 — i18n Key and Namespace Standard Not Published

- Description: naming convention and namespace ownership are not codified in an
  implementation-facing spec.
- Source: architecture requirement review
- Risk if unresolved: inconsistent key structures and translator ambiguity.
- Priority: High

### 2.3 GAP-L10N-003 — TMS Tool Selection and Ownership Unassigned

- Description: translation tooling shortlist exists but no selection, owner, or
  operating model is decided.
- Source: workflow section
- Risk if unresolved: delayed translation throughput and inconsistent QA.
- Priority: High

### 2.4 GAP-L10N-004 — RTL Readiness Decision Not Captured

- Description: no explicit decision record for RTL in MVP and post-MVP roadmap.
- Source: UI architecture review
- Risk if unresolved: late layout retrofits if RTL is added.
- Priority: Medium

### 2.5 GAP-L10N-005 — Localization Evidence and QA Protocol Incomplete

- Description: no standardized artifact checklist for localization quality proof
  at release.
- Source: workflow/governance review
- Risk if unresolved: unverifiable localization quality and compliance risk.
- Priority: High

---

## 3. Risks

### 3.1 RISK-L10N-001 — Market Launch Delay from Locale Ambiguity

- Description: unclear Tier 1 locales block prioritization and scheduling.
- Probability: High
- Impact: High
- Risk score: Critical
- Mitigation options: questionnaire-driven locale confirmation and phased locale
  commitments.
- Source: GAP-L10N-001

### 3.2 RISK-L10N-002 — Translation Rework from Key Instability

- Description: changing key semantics/names across sprints invalidates
  translation memory.
- Probability: Medium
- Impact: High
- Risk score: High
- Mitigation options: key convention freeze and key-change policy.
- Source: GAP-L10N-002

### 3.3 RISK-L10N-003 — Workflow Bottlenecks in Localization Pipeline

- Description: no selected TMS/owner causes manual fragmentation and missed
  SLAs.
- Probability: Medium
- Impact: High
- Risk score: High
- Mitigation options: tooling decision and role ownership assignment.
- Source: GAP-L10N-003

### 3.4 RISK-L10N-004 — Late RTL Retrofit Cost

- Description: if RTL becomes required later without preparation,
  component/layout rework may be significant.
- Probability: Medium
- Impact: Medium
- Risk score: Medium
- Mitigation options: early directional-compatibility constraints in
  design/system components.
- Source: GAP-L10N-004

### 3.5 RISK-L10N-005 — Inconsistent Localization QA

- Description: absence of standard evidence checklist leads to uneven quality
  and confidence.
- Probability: Medium
- Impact: Medium
- Risk score: Medium
- Mitigation options: localization evidence template and release checklist gate.
- Source: GAP-L10N-005

---

## 4. KPI Baseline

| KPI                                      | Current value     | Source                        | Measurement method                                           |
| ---------------------------------------- | ----------------- | ----------------------------- | ------------------------------------------------------------ |
| Externalized user-facing string coverage | INSUFFICIENT_DATA | no i18n scan baseline         | count externalized strings / total user-facing strings       |
| Locale-aware formatting coverage         | INSUFFICIENT_DATA | no implementation baseline    | count date/number/currency renders using locale APIs         |
| Localization handoff completeness        | INSUFFICIENT_DATA | no finalized package baseline | required localization inputs present / required inputs       |
| Translation workflow lead time           | INSUFFICIENT_DATA | tooling not selected          | elapsed time between string freeze and approved localization |

---

## 5. UNCERTAIN Items

- `UNCERTAIN: Specific Tier 1 language and market commitments`  
  Reason: strategy intent present but final locale list absent.  
  Escalation: Product Manager + Sales Strategist decision.

- `UNCERTAIN: Preferred TMS licensing constraints`  
  Reason: procurement/tool governance not documented.  
  Escalation: DevOps Engineer + project owner selection decision.

---

## 6. INSUFFICIENT_DATA Items

- `INSUFFICIENT_DATA: Confirmed list of launch locales`  
  Missing: approved language/region matrix.  
  Consequence: tier planning remains provisional.

- `INSUFFICIENT_DATA: Existing code-level i18n readiness scan results`  
  Missing: hardcoded string and locale formatting inventory from current UI
  code.  
  Consequence: cannot quantify remediation scope precisely.

- `INSUFFICIENT_DATA: Localization budget and throughput assumptions`  
  Missing: translation volume capacity, SLA targets, and tooling budget.  
  Consequence: timeline and staffing risk remains high.

### QUESTIONNAIRE_REQUEST

- `IND-L10N-001`: What languages/regions are mandatory for initial launch?
- `IND-L10N-002`: Is RTL support required for MVP or only post-MVP?
- `IND-L10N-003`: Which translation workflow model is preferred (agency,
  internal, hybrid)?
- `IND-L10N-004`: Which TMS/tooling options are approved by project governance?

---

## Phase 3 Closure Check

- UX Researcher (10): complete
- UX Designer (11): complete
- UI Designer (12): complete
- Accessibility Specialist (13): complete
- Content Strategist (32): complete
- Localization Specialist (35): this analysis in progress toward completion

No cross-phase contradictions identified; localization framework aligns with
content and accessibility outputs.

---

## HANDOFF CHECKLIST

- [x] Target locale strategy framework defined (tiered, pending final locale
      confirmation)
- [x] i18n architecture requirements documented (keys, formatting,
      pluralization, extractability)
- [x] RTL requirement handling documented with uncertainty escalation
- [x] Cultural suitability requirements documented without unsupported claims
- [x] Translation workflow and TMS decision framework documented
- [x] MVL readiness model defined for market expansion planning
- [x] Gaps and risks documented with source references
- [x] UNCERTAIN and INSUFFICIENT_DATA items documented and escalated
- [x] Questionnaire requests prepared
- [x] Scope change section not applicable
- [x] Ready for recommendations handoff

**Status:** READY
