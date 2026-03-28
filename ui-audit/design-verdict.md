# UI Design Verdict

## Scope of Scan

- repositories / folders / screens reviewed:
  - src/webapp/ui/src/app shell and route composition
  - src/webapp/ui/src/components/ui, components/layout, components/runtime, components/cockpit
  - src/webapp/ui/src/pages including dashboard, commands, pipeline, sessions, session detail, observability, approvals, workspaces, login
  - src/webapp/brand token and brand guideline assets
  - src/webapp/ui/.storybook governance and preview configuration
  - tests/e2e accessibility audit coverage
- components reviewed:
  - buttons, inputs, cards, tables, badges, dialogs, tabs usage, top navigation, side panel, page shell, empty/loading/error patterns
- design assets reviewed:
  - src/webapp/brand/design-tokens.json
  - src/webapp/brand/brand-guidelines.md
  - src/webapp/ui/src/tokens.css
  - src/webapp/ui/src/index.css
  - Storybook governance docs/tests
- constraints or missing evidence:
  - No runtime visual capture was executed in this audit run (code and docs were used as source evidence).
  - Manual contrast calculations for each component state were not re-run in this pass; relied on existing test/governance artifacts and code inspection.

## Executive Verdict

The product UI is solidly past prototype stage and already demonstrates a coherent visual language, substantial shared primitives, and meaningful accessibility/testing investment. However, the design system is not yet fully enforced: token drift, micro-typography drift, semantic interaction gaps (notably sortable tables and tab keyboard behavior), and widescreen layout inconsistency introduce medium-to-high long-term risk for desktop scalability. This is a normalize-and-harden phase, not a greenfield redesign phase.

## Overall Score

- Visual Consistency: 6/10
- Accessibility: 6/10
- Component Reusability: 7/10
- Desktop Layout Quality: 6/10
- Design System Maturity: 6/10
- Developer Handoff Readiness: 7/10
- Scalability: 6/10
- Overall UI Health: 6/10

## Strengths

- S-001: Strong token and brand foundation exists with generated token pipeline and explicit brand standards.
- S-002: Broad component inventory and Storybook coverage are in place, including governance checks for story quality.
- S-003: Accessibility quality culture exists (skip link, focus-ring patterns, Storybook a11y checks, Playwright/axe audits).
- S-004: Desktop information architecture is already oriented toward operator workbench usage with persistent shell + role-aware navigation.

## Findings

### F-001 — Token Discipline Drift in Production Components

- Severity: High
- Area: design system / cockpit visualization
- Observation: Raw hex and fallback color literals are used directly in production visualization components.
- Evidence: src/webapp/ui/src/components/cockpit/interactive-lineage-graph.tsx includes multiple hardcoded values such as #22c55e, #60a5fa, #fbbf24, #f87171, #94a3b8 and fallback var() colors.
- Impact: Semantic color consistency and theme portability degrade; dark mode and brand governance become harder to maintain.
- Why it matters: Token discipline is a prerequisite for predictable scaling across many pages and states.

### F-002 — Typography Drift via Arbitrary Micro-Text Classes

- Severity: High
- Area: typography system
- Observation: Extensive usage of text-[9px], text-[10px], text-[11px], and ad-hoc tracking values appears across cockpit, observability, runtime, tables, and badges.
- Evidence: Multiple matches in components and pages, including src/webapp/ui/src/components/ui/table.tsx, src/webapp/ui/src/components/cockpit/_.tsx, src/webapp/ui/src/pages/_.
- Impact: Visual rhythm fragments, readability drops on dense desktop surfaces, and scale governance weakens.
- Why it matters: Enterprise desktop UIs require consistent legible hierarchy under high information density.

### F-003 — Inconsistent Table Interaction Semantics

- Severity: Critical
- Area: accessibility / data tables
- Observation: Sortable headers are implemented with clickable div wrappers instead of explicit button semantics.
- Evidence: src/webapp/ui/src/components/ui/data-table.tsx uses onClick on a div for sort toggling.
- Impact: Keyboard and assistive-technology users may not discover or operate sorting reliably.
- Why it matters: Tables are core enterprise workflow surfaces and must be first-class accessible.

### F-004 — Tab Accessibility Behavior Is Not Standardized

- Severity: High
- Area: accessibility / navigation patterns
- Observation: Cockpit and Observability define custom tablists/buttons but do not implement a shared keyboard contract (arrow keys, Home/End, focus movement).
- Evidence: src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx and src/webapp/ui/src/pages/observability/observability-page.tsx contain custom role=tablist and role=tab implementations.
- Impact: Inconsistent keyboard behavior across pages; increased regressions and usability friction.
- Why it matters: Repeated analytical tabbed surfaces need one accessible primitive.

### F-005 — Navigation Semantics and Desktop Collapse Behavior Are Fragile

- Severity: Medium
- Area: shell navigation
- Observation: Sidebar items are buttons with role=link and collapse behavior includes breakpoint-dependent hide logic that can create desktop inconsistency.
- Evidence: src/webapp/ui/src/components/ui/side-panel.tsx uses role=link button pattern; src/webapp/ui/src/components/layout/sidebar-nav.tsx toggles hidden/md behavior.
- Impact: Semantics and predictability suffer, especially in keyboard and browser navigation contexts.
- Why it matters: Enterprise desktop navigation must be stable and semantically trustworthy.

### F-006 — Page-State Handling Is Partially Standardized, Not Universal

- Severity: Medium
- Area: screen-level coherence
- Observation: Many pages use PageShell for loading/error/empty, while others still implement bespoke state handling.
- Evidence: src/webapp/ui/src/components/ui/page-shell.tsx exists and is used by workspaces/sessions/observability/approvals/session-detail, but dashboard/commands/pipeline include custom handling patterns.
- Impact: Inconsistent behavior and duplication in UX and engineering implementation.
- Why it matters: Shared state treatment reduces cognitive load and bug surface.

### F-007 — Primitive Bypass in Forms and Action Panels

- Severity: Medium
- Area: component reusability
- Observation: Some pages handcraft input/textarea styling rather than using shared field primitives.
- Evidence: src/webapp/ui/src/pages/approvals/approval-center-page.tsx defines local textarea class block.
- Impact: Validation, accessibility, and visual consistency drift across workflows.
- Why it matters: Form fields are high-risk interaction points requiring standardized behavior.

### F-008 — Widescreen Desktop Rhythm Is Inconsistent

- Severity: High
- Area: desktop layout behavior
- Observation: Pages rely on ad-hoc grid templates and full-width containers without unified max-width/partition rules.
- Evidence: Diverse grid patterns across pages (commands, pipeline, sessions, approvals, dashboard, observability) with no global widescreen container contract.
- Impact: On large monitors, some views feel stretched or unevenly balanced.
- Why it matters: Desktop-first enterprise interfaces must preserve scanability at 1440p to 4k widths.

### F-009 — Radius and Surface Style Drift

- Severity: Medium
- Area: visual consistency
- Observation: Multiple arbitrary radii and decorative treatments coexist alongside tokenized radius system.
- Evidence: rounded-[26px], rounded-[28px], and custom gradients in src/webapp/ui/src/components/ui/table.tsx, empty-state.tsx, mission-control-hero.tsx, explainability-panel.tsx.
- Impact: Component family resemblance weakens across modules.
- Why it matters: Consistent geometry is key to perceived system quality.

### F-010 — Design System Documentation Is Distributed, Not Centralized

- Severity: Medium
- Area: developer handoff readiness
- Observation: Storybook governance and token sources exist, but no single operational master reference defines canonical usage rules across product pages.
- Evidence: Storybook governance files are present, yet no system-wide master design specification existed before this audit.
- Impact: New contributors may reproduce local patterns instead of system patterns.
- Why it matters: Scaling teams need one source of truth with enforcement mapping.

### F-011 — Contrast Governance Has Exception Risk in Dense UI

- Severity: Medium
- Area: accessibility
- Observation: A11y config explicitly allows 3:1 for large text/components while the product also uses numerous tiny text labels in semantic contexts.
- Evidence: src/webapp/ui/.storybook/preview.ts (contrast rule configuration) plus widespread micro-text classes.
- Impact: Some dense metadata and badge combinations may underperform for low-vision users.
- Why it matters: Dense operational dashboards should exceed, not barely meet, readability requirements.

### F-012 — Strong Foundations but Inconsistent Enforcement Layer

- Severity: Medium
- Area: scalability and maintainability
- Observation: Token pipeline, Storybook, and tests are mature, but automated checks do not yet fully block token/typography drift in application pages.
- Evidence: Existing governance checks focus on story exports/docs, while drift patterns are still present in production code.
- Impact: Design debt accumulates as feature velocity increases.
- Why it matters: Enforcement, not only guidance, keeps desktop systems coherent over time.

## Recommendations

### R-001 — Enforce Token-Only Color Usage in App UI

- Linked Findings: F-001, F-012
- Priority: P0
- Proposal: Add lint/style rule set to block raw hex and non-token color usage in component/page code, with explicit exception list for visualization adapters.
- Expected Outcome: Color semantics become consistent across themes and modules.
- Design/System Impact: High positive impact on brand consistency and theming resilience.
- Implementation Notes: Extend existing token lint gate (scripts/check-ui-token-typography.mjs) to include color checks and exception annotations.

### R-002 — Standardize Typography Scale and Micro-Text Policy

- Linked Findings: F-002, F-011
- Priority: P0
- Proposal: Introduce strict typography utility policy (minimum default body/caption sizes, limited micro-text contexts) and codemod hot spots using ad-hoc text-[10px]/text-[11px].
- Expected Outcome: Improved readability and consistent visual hierarchy.
- Design/System Impact: High impact on scanability and cognitive load.
- Implementation Notes: Add linting for disallowed arbitrary text sizes outside approved component wrappers.

### R-003 — Ship Accessible Sortable Table Header Primitive

- Linked Findings: F-003
- Priority: P0
- Proposal: Replace clickable div header sorting with button-based sortable header subcomponent including aria-sort and keyboard behavior.
- Expected Outcome: WCAG-compliant table interactions across all sortable views.
- Design/System Impact: High accessibility and enterprise usability improvement.
- Implementation Notes: Update data-table primitive once, then migrate all consumers.

### R-004 — Consolidate Tabs into One Accessible Primitive

- Linked Findings: F-004, F-012
- Priority: P0
- Proposal: Create shared Tabs primitive (or adopt Radix tabs wrapper) with complete keyboard interactions and visual variants for analytic pages.
- Expected Outcome: Consistent navigation behavior in cockpit/observability and future pages.
- Design/System Impact: High consistency and lower regression risk.
- Implementation Notes: Replace custom tab implementations incrementally page by page.

### R-005 — Normalize Sidebar Link Semantics and Collapse Rules

- Linked Findings: F-005
- Priority: P1
- Proposal: Use true link semantics for route nav items and stabilize collapsed/expanded behavior for desktop breakpoints.
- Expected Outcome: Better keyboard/browser behavior and more predictable navigation model.
- Design/System Impact: Medium-high for desktop workflow confidence.
- Implementation Notes: Align with router link primitives and preserve current role-based route logic.

### R-006 — Enforce PageShell State Contract Across Data Pages

- Linked Findings: F-006
- Priority: P1
- Proposal: Require loading/error/empty/no-access handling through PageShell contract for route-level pages with data fetching.
- Expected Outcome: Consistent state UX and reduced duplicate logic.
- Design/System Impact: Medium system quality uplift.
- Implementation Notes: Add architectural guideline and route-level test checklist.

### R-007 — Introduce Shared Textarea/Field Group Primitives

- Linked Findings: F-007
- Priority: P1
- Proposal: Add standardized textarea and field-group components with labels, descriptions, validation, and density variants.
- Expected Outcome: Form consistency and accessibility reliability.
- Design/System Impact: Medium across approval/admin flows.
- Implementation Notes: Migrate high-risk forms first (approvals, commands, admin).

### R-008 — Define Desktop Container and Widescreen Partition Rules

- Linked Findings: F-008
- Priority: P1
- Proposal: Add shell-level and page-level container tokens/classes for laptop and widescreen behavior, including max-width and split-panel standards.
- Expected Outcome: Better widescreen coherence and reduced stretched layouts.
- Design/System Impact: High for desktop-first quality.
- Implementation Notes: Introduce reusable layout utilities in app shell/page scaffold.

### R-009 — Normalize Radius/Surface Tokens and Remove Arbitrary Geometry

- Linked Findings: F-009
- Priority: P2
- Proposal: Rationalize surface radii and decorative treatment into a small set of approved variants.
- Expected Outcome: Stronger visual family resemblance and easier theming.
- Design/System Impact: Medium visual consistency gain.
- Implementation Notes: Start with table, empty state, hero, and explainability components.

### R-010 — Operationalize Design System Governance in CI

- Linked Findings: F-010, F-012
- Priority: P1
- Proposal: Introduce CI checks mapping design rules (token use, typography policy, tabs/table semantics, required state stories) to failing gates.
- Expected Outcome: Prevent recurrence of current design debt.
- Design/System Impact: High maintainability and handoff confidence.
- Implementation Notes: Extend existing storybook governance test and lint gates.

### R-011 — Run Focused Contrast and Readability Audit on Dense Metadata Surfaces

- Linked Findings: F-002, F-011
- Priority: P1
- Proposal: Perform targeted contrast pass on badges, telemetry labels, tables, and dark-mode semantic surfaces with explicit remediation thresholds.
- Expected Outcome: Improved readability and reduced accessibility risk in dense dashboards.
- Design/System Impact: Medium-high on accessibility maturity.
- Implementation Notes: Add regression snapshots for dense components in Storybook and Playwright.

## Strategic Conclusion

- what must be fixed immediately:
  - table sort accessibility semantics, tab keyboard standardization, token/typography drift enforcement.
- what must be standardized next:
  - desktop container rules, PageShell adoption contract, form field primitives, nav semantics.
- what can be deferred:
  - non-critical decorative radius/surface normalization after core semantics and readability are stable.
- what should be preserved:
  - current brand tone, generated token pipeline, strong component inventory, Storybook and accessibility testing culture, and desktop control-surface orientation.
