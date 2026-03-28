# UI Improvement Roadmap

## Roadmap Logic

Findings were clustered by systemic risk and implementation leverage:

1. Foundation risks that can break accessibility, token integrity, or baseline readability were mapped to P0 recommendations and grouped into Milestone M-001.
2. Desktop workflow coherence and screen-architecture consistency issues were mapped to P1/P2 recommendations and grouped into Milestone M-002.
3. Enforcement and long-term maintainability gaps were grouped into Milestone M-003 to prevent regression.

Each issue below maps directly to one recommendation and one primary finding, while milestones and epics provide release-level grouping.

## Traceability Matrix

| Finding ID | Recommendation ID | Milestone ID | Epic ID | Issue ID(s) | Area                |
| ---------- | ----------------- | ------------ | ------- | ----------- | ------------------- |
| F-001      | R-001             | M-001        | E-001   | I-001       | Design System       |
| F-001      | R-001             | M-001        | E-001   | I-002       | Component           |
| F-002      | R-002             | M-001        | E-001   | I-003       | Typography          |
| F-002      | R-002             | M-001        | E-001   | I-004       | Screen Architecture |
| F-003      | R-003             | M-001        | E-002   | I-005       | Accessibility       |
| F-003      | R-003             | M-001        | E-002   | I-006       | Component           |
| F-004      | R-004             | M-001        | E-002   | I-007       | Accessibility       |
| F-004      | R-004             | M-001        | E-002   | I-008       | Navigation          |
| F-005      | R-005             | M-002        | E-003   | I-009       | Navigation          |
| F-006      | R-006             | M-002        | E-004   | I-010       | Screen Architecture |
| F-007      | R-007             | M-002        | E-004   | I-011       | Component           |
| F-008      | R-008             | M-002        | E-003   | I-012       | Desktop Layout      |
| F-009      | R-009             | M-002        | E-005   | I-013       | UX Polish           |
| F-010      | R-010             | M-003        | E-006   | I-014       | Design System       |
| F-011      | R-011             | M-003        | E-006   | I-015       | Accessibility       |
| F-012      | R-010             | M-003        | E-006   | I-014       | Scalability         |

## Milestones

### M-001 — Foundation Accessibility and Token Integrity

**Goal**: Remove critical accessibility and token-governance risks from core primitives before further UI expansion.
**Linked Recommendations**: R-001, R-002, R-003, R-004
**Success Criteria**:

- No raw color literals in production UI files outside approved visualization exceptions.
- Sortable tables and tab interfaces pass keyboard and screen-reader checks.
- Typography drift hotspots are reduced to approved scale usage.

### M-002 — Desktop Workflow Coherence and Component Normalization

**Goal**: Normalize desktop layout behavior and component usage patterns across high-traffic workbench pages.
**Linked Recommendations**: R-005, R-006, R-007, R-008, R-009
**Success Criteria**:

- Sidebar semantics and collapse behavior are stable and predictable on desktop breakpoints.
- Route-level pages follow consistent state handling and shared form primitives.
- Widescreen layouts maintain readable hierarchy without overstretch.

### M-003 — Governance Automation and Scalability Guardrails

**Goal**: Convert design standards into CI-enforced quality gates to keep debt from reappearing.
**Linked Recommendations**: R-010, R-011
**Success Criteria**:

- CI blocks regressions in token usage, typography policy, and accessibility primitives.
- Dense-surface contrast checks are automated for key components.
- Design-system adoption can be tracked through measurable gating outcomes.

## Epics

### E-001 — Token and Typography Enforcement

**Milestone**: M-001
**Linked Recommendations**: R-001, R-002
**Outcome**: Production UI follows tokenized color and typography scale rules with minimal exceptions.
**Scope**:

- Implement lint and validation rules.
- Migrate hardcoded-color and arbitrary-font-size hotspots.
- Add exception documentation for approved visualization adapters.

### E-002 — Accessible Interaction Primitives

**Milestone**: M-001
**Linked Recommendations**: R-003, R-004
**Outcome**: Tables and tabs become fully accessible, reusable building blocks.
**Scope**:

- Build accessible sortable header primitive.
- Build shared tabs primitive with keyboard contract.
- Migrate cockpit and observability implementations.

### E-003 — Desktop Layout and Navigation Stability

**Milestone**: M-002
**Linked Recommendations**: R-005, R-008
**Outcome**: Navigation and desktop layout behavior become predictable across laptop and widescreen contexts.
**Scope**:

- Stabilize sidebar semantics and collapse behavior.
- Add desktop container and partition utilities.
- Validate critical pages at desktop breakpoint set.

### E-004 — Page-State and Form Architecture Standardization

**Milestone**: M-002
**Linked Recommendations**: R-006, R-007
**Outcome**: All major pages use consistent loading/error/empty/no-access patterns and field primitives.
**Scope**:

- Expand PageShell adoption to remaining route pages.
- Add Textarea/FieldGroup primitives.
- Migrate action-critical forms.

### E-005 — Visual Surface Harmonization

**Milestone**: M-002
**Linked Recommendations**: R-009
**Outcome**: Surface geometry and elevation language become cohesive across modules.
**Scope**:

- Normalize radius/elevation variants.
- Reduce arbitrary geometry classes.
- Preserve brand expression while improving consistency.

### E-006 — Design Governance in CI

**Milestone**: M-003
**Linked Recommendations**: R-010, R-011
**Outcome**: Design-system quality standards are enforced continuously, not manually.
**Scope**:

- Extend existing governance tests.
- Add dense-surface contrast checks.
- Publish pass/fail criteria for UI quality gates.

## Issues

### I-001 — Add Token Color Lint Gate

- Epic: E-001
- Recommendation: R-001
- Finding: F-001
- Priority: P0
- Type: Design System
- Area: Token governance
- Description: Extend UI lint tooling to reject raw hex/non-token color usage in production components and pages.
- Acceptance Criteria:
  - [ ] Lint fails on non-approved raw color literals in src/webapp/ui/src.
  - [ ] Approved exception paths are explicitly whitelisted.
  - [ ] Documentation explains how to add new semantic colors via token pipeline.

### I-002 — Tokenize Cockpit Lineage Graph Colors

- Epic: E-001
- Recommendation: R-001
- Finding: F-001
- Priority: P0
- Type: Component
- Area: cockpit/interactive-lineage-graph
- Description: Replace hardcoded status and edge colors with semantic token mappings and controlled fallback behavior.
- Acceptance Criteria:
  - [ ] No hardcoded hex values remain in interactive-lineage-graph component.
  - [ ] Visual semantics match existing status meanings in light and dark themes.
  - [ ] Storybook stories validate expected status color mappings.

### I-003 — Enforce Typography Utility Policy

- Epic: E-001
- Recommendation: R-002
- Finding: F-002
- Priority: P0
- Type: Design System
- Area: Typography
- Description: Add lint checks and utility policy to restrict arbitrary micro-text classes outside approved metadata contexts.
- Acceptance Criteria:
  - [ ] Disallowed arbitrary font-size utilities are blocked by lint.
  - [ ] Approved metadata exceptions are documented.
  - [ ] CI reports typography policy violations clearly.

### I-004 — Refactor Micro-Text Hotspots in Dense Surfaces

- Epic: E-001
- Recommendation: R-002
- Finding: F-002
- Priority: P1
- Type: UX Polish
- Area: cockpit/observability/runtime/table labels
- Description: Migrate high-frequency tiny text labels to approved caption/body utilities and improve spacing rhythm.
- Acceptance Criteria:
  - [ ] Priority hotspot components use approved text utilities.
  - [ ] Readability review at 100% and 125% zoom is signed off.
  - [ ] No regressions in component snapshot tests.

### I-005 — Build Accessible Sortable Header Subcomponent

- Epic: E-002
- Recommendation: R-003
- Finding: F-003
- Priority: P0
- Type: Accessibility
- Area: data-table primitive
- Description: Implement keyboard-accessible sortable header controls with button semantics and aria-sort updates.
- Acceptance Criteria:
  - [ ] Sorting control is focusable and operable by keyboard.
  - [ ] Correct aria-sort state is exposed per sorted column.
  - [ ] Axe checks pass for sortable table stories.

### I-006 — Migrate Data Table Consumers to New Sort Header

- Epic: E-002
- Recommendation: R-003
- Finding: F-003
- Priority: P1
- Type: Component
- Area: all pages using data-table
- Description: Replace legacy sortable header usage in table consumers with new accessible primitive.
- Acceptance Criteria:
  - [ ] All sortable table pages use updated data-table behavior.
  - [ ] Keyboard sort interaction is covered in e2e test updates.
  - [ ] No visual regressions in existing table stories.

### I-007 — Create Shared Tabs Primitive with Keyboard Contract

- Epic: E-002
- Recommendation: R-004
- Finding: F-004
- Priority: P0
- Type: Accessibility
- Area: ui tabs primitive
- Description: Build one tabs primitive covering arrow navigation, Home/End, selected state management, and ARIA wiring.
- Acceptance Criteria:
  - [ ] Primitive supports full WAI-ARIA tab keyboard pattern.
  - [ ] Focus management and panel associations are validated in tests.
  - [ ] Primitive has Storybook docs for default, dense, and constrained layouts.

### I-008 — Migrate Cockpit and Observability Tabs

- Epic: E-002
- Recommendation: R-004
- Finding: F-004
- Priority: P1
- Type: Navigation
- Area: cockpit and observability pages
- Description: Replace custom tab bars with shared tabs primitive without losing existing routing/state behavior.
- Acceptance Criteria:
  - [ ] Cockpit and observability use shared tabs component.
  - [ ] Keyboard behavior is consistent between both pages.
  - [ ] Visual style remains aligned with page context.

### I-009 — Normalize Sidebar Link Semantics and Collapse Behavior

- Epic: E-003
- Recommendation: R-005
- Finding: F-005
- Priority: P1
- Type: Navigation
- Area: side-panel and sidebar-nav
- Description: Convert nav item interactions to link semantics and stabilize collapse/expand behavior at desktop breakpoints.
- Acceptance Criteria:
  - [ ] Route nav items expose link semantics and current-page state correctly.
  - [ ] Desktop collapse behavior is consistent at md/lg breakpoints.
  - [ ] Keyboard navigation across sections/items remains predictable.

### I-010 — Adopt PageShell Contract on Remaining Core Pages

- Epic: E-004
- Recommendation: R-006
- Finding: F-006
- Priority: P1
- Type: Screen Architecture
- Area: dashboard, commands, pipeline
- Description: Refactor core pages with bespoke loading/error/empty handling to use PageShell contract.
- Acceptance Criteria:
  - [ ] Dashboard, commands, and pipeline implement PageShell states.
  - [ ] Retry and empty state patterns are consistent with system components.
  - [ ] Existing behavior and tests remain intact.

### I-011 — Introduce Textarea/FieldGroup Primitive and Migrate Approval Form

- Epic: E-004
- Recommendation: R-007
- Finding: F-007
- Priority: P1
- Type: Component
- Area: ui form primitives and approvals detail panel
- Description: Add shared textarea and field-group components and migrate approval rejection reason input to use them.
- Acceptance Criteria:
  - [ ] New primitives provide label, helper text, error state, and disabled/loading handling.
  - [ ] Approval rejection flow uses shared primitives.
  - [ ] Form accessibility checks pass for labels and error announcements.

### I-012 — Add Desktop Container and Widescreen Layout Utilities

- Epic: E-003
- Recommendation: R-008
- Finding: F-008
- Priority: P1
- Type: Desktop Layout
- Area: app shell/page layout utilities
- Description: Define and apply reusable container and split-panel utilities to control widescreen stretching.
- Acceptance Criteria:
  - [ ] Shared container utility classes are documented and available.
  - [ ] At least top desktop pages adopt standardized widescreen partitioning.
  - [ ] Layout validation at 1366px, 1536px, and 1920px shows improved consistency.

### I-013 — Harmonize Radius and Surface Variants

- Epic: E-005
- Recommendation: R-009
- Finding: F-009
- Priority: P2
- Type: UX Polish
- Area: cards, tables, hero/empty surfaces
- Description: Replace arbitrary radius and decorative surface variants with approved geometry/elevation tokens.
- Acceptance Criteria:
  - [ ] Arbitrary radius classes are reduced in targeted components.
  - [ ] Surface variants map to documented system tiers.
  - [ ] Visual snapshots show stronger family resemblance.

### I-014 — Extend CI Design Governance and Contrast Regression Suite

- Epic: E-006
- Recommendation: R-010
- Finding: F-010
- Priority: P1
- Type: Design System
- Area: lint/tests/storybook governance
- Description: Expand governance checks to enforce token/typography/accessibility rules and add targeted dense-surface contrast regression tests.
- Acceptance Criteria:
  - [ ] CI fails when design-system governance rules are violated.
  - [ ] Governance documentation links each gate to recommendation and finding IDs.

### I-015 — Implement Dense-Surface Contrast and Readability Regression Checks

- Epic: E-006
- Recommendation: R-011
- Finding: F-011
- Priority: P1
- Type: Accessibility
- Area: badges, metadata labels, dense tables, dark-mode semantic surfaces
- Description: Add targeted contrast/readability test coverage for dense UI surfaces and enforce remediation thresholds.
- Acceptance Criteria:
  - [ ] Automated checks validate contrast in dense metadata/badge/table contexts.
  - [ ] Dark-mode semantic surfaces meet documented readability thresholds.
  - [ ] Failing snapshots or checks point to exact component/state combinations.
