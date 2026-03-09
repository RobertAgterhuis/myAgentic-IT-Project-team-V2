# Audit - Localization Specialist (35) - 2026-03-09
Metadata: Mode=AUDIT | Project=myAgentic-IT-Project-team-V2 | Date=2026-03-09

## Executive Summary
Localization readiness is partial: the project has a strong string-centralization base (`STRINGS` in UI and `strings.js` on server), but no localization architecture, no locale-switch path, and no RTL strategy. Current scope is explicitly English-only (`DEC-R2-004`), so full i18n is not a GA blocker today; however, low-cost pre-GA preparation should be completed to avoid expensive rework when market scope changes.

- Mode: AUDIT
- Scope: Phase 3 localization readiness only
- Input dependency check: Content Strategist output present (`.github/docs/phase-3/32-content-strategist-audit.md:1`)
- Step 0 questionnaire context: NOT_INJECTED

## i18n Readiness
### 1) Centralized strings (yes/no)
- UI centralized strings: `YES (mostly)` via `const STRINGS` (`.github/webapp/index.html:1581`)
- Server centralized strings: `YES` via `VALIDATION/RESPONSES/STATIC` (`.github/webapp/strings.js:11`)
- Caveat: not all UI literals are routed through centralized keys.

### 2) Hard-coded UI strings
- `I18N_ISSUE: Hard-coded string outside centralized STRINGS` - `aria-label="Previous page"` (`.github/webapp/index.html:2339`)
- `I18N_ISSUE: Hard-coded string outside centralized STRINGS` - `aria-label="Next page"` (`.github/webapp/index.html:2347`)
- `I18N_ISSUE: Hard-coded string outside centralized STRINGS` - `title="Copy to clipboard"` (`.github/webapp/index.html:3171`)
- `I18N_ISSUE: Dashboard page uses many embedded English literals` (e.g., "Project Health Overview", "Refresh", "Key Metrics") (`.github/webapp/dashboard.html:41`, `.github/webapp/dashboard.html:44`, `.github/webapp/dashboard.html:94`)
- `I18N_ISSUE: Runtime JS literals not keyed` (e.g., "just now", "Page X of Y", "No visible milestones to export") (`.github/webapp/dashboard.js:356`, `.github/webapp/dashboard.js:792`, `.github/webapp/dashboard.js:528`)

### 3) Date/time locale awareness
- Partially locale-aware in one path: `toLocaleTimeString()` exists (`.github/webapp/index.html:2920`)
- Not locale-aware in key user-facing paths: relative-time text is manually concatenated English (`.github/webapp/dashboard.js:356`)
- ISO date strings shown directly in table/detail (YYYY-MM-DD), not localized display (`.github/webapp/dashboard.html:381`, `.github/webapp/dashboard.js:674`)

### 4) Number/currency locale awareness
- No `Intl.NumberFormat` usage detected in webapp (`.github/webapp/index.html:2920` shows only `toLocaleTimeString` match)
- Numbers are rendered as raw values/string templates (e.g., `${row.progress}%`) (`.github/webapp/dashboard.js:539`, `.github/webapp/dashboard.js:673`)
- Currency formatting path: `INSUFFICIENT_DATA` (no currency feature observed in current UI scope)

## Localization Architecture
### Locale switch mechanism
- No locale selector or language-setting workflow found in UI (only theme toggle patterns present) (`.github/webapp/index.html:151`)
- Current product decision is English-only (`.github/docs/decisions/reevaluation.md:13`)

### Translation resource structure
- No translation bundles (`en.json`, `nl.json`, etc.) in webapp; only `test-milestone.json` exists (`.github/webapp/test-milestone.json:1`)
- No i18n message catalog abstraction detected; primary mechanism is in-file object/constants (`.github/webapp/index.html:1581`, `.github/webapp/strings.js:11`)

### Pluralization support
- No ICU/message-format or plural-rule engine detected.
- Manual plural handling exists in JS (English-specific `minute/minutes`, `hour/hours`, `day/days`) (`.github/webapp/dashboard.js:358`)

## RTL/LTR Audit
### RTL capability
- `dir` not dynamically managed; base document is LTR (`<html lang="en">`) (`.github/webapp/index.html:3`)
- No `[dir="rtl"]` CSS branch found in design system (`.github/webapp/design-system.css:1`)

### Left/right hardcoding
- Physical-direction CSS is widely used (not logical properties): `border-left`, `border-right`, `padding-left`, `left`, `right`, `text-align: left/right` (`.github/webapp/design-system.css:71`, `.github/webapp/design-system.css:111`, `.github/webapp/design-system.css:151`, `.github/webapp/design-system.css:158`, `.github/webapp/design-system.css:1102`, `.github/webapp/design-system.css:1177`, `.github/webapp/design-system.css:1270`)
- Inline position styles in HTML also assume LTR (`left:-10000px`, skip-nav `left:0`) (`.github/webapp/dashboard.html:32`, `.github/webapp/dashboard.html:339`)

## Translation Workflow
- No documented engineering workflow for adding/editing locale files (no locale file structure present in webapp).
- No localization glossary/termbase dedicated to translation operations found for product UI.
- Domain/content glossary work exists but is business-domain focused and currently deferred (`BIZ-02`) (`.github/docs/sprints/sprint-plan-recalibrated.md:44`)
- English-only policy currently supersedes localization implementation (`.github/docs/decisions/reevaluation.md:13`)

## Findings
1. `I18N_ISSUE` String centralization exists and is a good foundation, but coverage is incomplete due to hard-coded UI literals.
- Evidence: `.github/webapp/index.html:1581`, `.github/webapp/index.html:2339`, `.github/webapp/dashboard.js:356`
- Severity: Medium
- `OUT_OF_SCOPE: TECH` Normalize all UI text access through a single key-based message layer.

2. `I18N_ISSUE` Locale-aware formatting is inconsistent (time partly localized, dates/numbers mostly not).
- Evidence: `.github/webapp/index.html:2920`, `.github/webapp/dashboard.js:356`, `.github/webapp/dashboard.js:673`
- Severity: Medium
- `OUT_OF_SCOPE: TECH` Introduce a formatting utility wrapping `Intl.DateTimeFormat` and `Intl.NumberFormat`.

3. `I18N_ISSUE` No localization architecture (locale switch, resource bundles, pluralization framework).
- Evidence: `.github/webapp/test-milestone.json:1`, `.github/webapp/index.html:1581`
- Severity: Low (given current English-only decision), High if scope changes.
- `OUT_OF_SCOPE: TECH` Define translation bundle structure and runtime locale resolution.

4. `I18N_ISSUE` RTL readiness is low due to physical-direction CSS and no dir-aware styling.
- Evidence: `.github/webapp/design-system.css:71`, `.github/webapp/design-system.css:1177`, `.github/webapp/dashboard.html:339`
- Severity: Low now, Medium for future Arabic/Hebrew rollout.
- `OUT_OF_SCOPE: TECH` Migrate critical layout rules to logical properties (`margin-inline-start`, `inset-inline-start`, etc.).

5. `INSUFFICIENT_DATA: Target localization markets and expected non-English launch window`
- Missing: geographic user distribution, language roadmap, translation volume forecast
- Consequence: cannot prioritize locale backlog by market impact
- Escalation: `QUESTIONNAIRE_REQUEST` to Product/Business owner

## Recommendations
### Pre-GA minimum (given no current global requirement)
1. Keep English-only policy, but implement low-cost i18n scaffolding now.
- Add `locale` state defaulting to `en` (no UI switch required yet).
- Introduce tiny formatter helpers (`formatDate`, `formatNumber`, `formatRelativeTime`) and route new code through them.

2. Eliminate top-priority hard-coded literals in high-traffic components.
- Start with `dashboard.js` toasts/status labels and `index.html` ARIA/title literals.
- Gate with lint rule or test that flags new hard-coded user-facing strings outside message catalogs.

3. Define translation resource contract without committing to full localization.
- Create `locales/en.json` schema and key naming convention.
- Add contribution notes for string keys and placeholder usage.

4. Apply RTL-safe CSS hygiene incrementally.
- For new/edited components, prefer logical CSS properties over left/right physical properties.
- Document exceptions where physical positioning is intentional.

5. Prepare decision trigger for full i18n activation.
- Trigger condition: any approved non-English market requirement or sustained non-English traffic threshold.
- On trigger, open TECH story for locale routing, bundle loading, and pluralization support.

## Handoff
- Localization audit completed for Phase 3 AUDIT scope.
- Guardrail alignment: `I18N_ISSUE` items documented with `OUT_OF_SCOPE: TECH`.
- Current policy confirmed: English-only (`DEC-R2-004`).
- Pre-GA recommendation: minimal scaffolding only, not full localization rollout.
- `QUESTIONNAIRE_REQUEST`: confirm target markets and timeline for non-English support.
- No code changes requested in this handoff.
- Ready for Critic/Risk validation.

## HANDOFF CHECKLIST
- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated
- [x] All INSUFFICIENT_DATA: items are documented and escalated
- [x] Output complies with the contract in /.github/docs/contracts/
- [x] Guardrails from /.github/docs/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
