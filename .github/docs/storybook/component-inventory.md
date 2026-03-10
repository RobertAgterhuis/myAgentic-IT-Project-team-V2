# Component Inventory

## 1. Component Inventory Header

- Date generated: 2026-03-10
- Agent: 31-storybook-agent
- Design tokens source: `.github/docs/brand/design-tokens.json`
- Brand guidelines source: `.github/docs/brand/brand-guidelines.md`
- Scope: Agentic SDLC platform UI baseline for implementation teams

## 2. Component Catalog

### Component: Button
- Category: ATOM
- Description: Core action control for primary, secondary, and destructive actions.
- Props / Variants:
  - `variant`: `primary | secondary | accent | danger | ghost`
  - `size`: `sm | md | lg`
  - `disabled`: boolean
  - `loading`: boolean
- Design Token References:
  - `colors.primary`, `colors.secondary`, `colors.accent`, `colors.error`, `colors.textInverse`
  - `typography.fontFamilies.body`, `typography.fontSizes.sm`, `typography.fontWeights.semibold`
  - `spacing.scale.2`, `spacing.scale.3`, `borders.radius.md`, `shadows.sm`
- Accessibility Requirements:
  - Native `button` element only.
  - Visible focus indicator using `colors.focusRing`.
  - `aria-busy="true"` when loading.
- States:
  - default, hover, focus, active, disabled, loading

### Component: InputField
- Category: ATOM
- Description: Text entry control for forms and filters.
- Props / Variants:
  - `type`: `text | email | password | search`
  - `label`, `placeholder`, `required`, `invalid`, `helpText`
- Design Token References:
  - `colors.surface`, `colors.text`, `colors.border`, `colors.focusRing`, `colors.error`
  - `typography.fontFamilies.body`, `typography.fontSizes.md`
  - `spacing.scale.2`, `spacing.scale.3`, `borders.radius.md`
- Accessibility Requirements:
  - Label association with `for/id`.
  - `aria-invalid` and `aria-describedby` for errors.
  - Error text must be announced with `role="alert"`.
- States:
  - default, hover, focus, active, disabled, error

### Component: Badge
- Category: ATOM
- Description: Compact status marker for risk, phase, and workflow state.
- Props / Variants:
  - `variant`: `success | warning | error | info | neutral`
  - `size`: `sm | md`
- Design Token References:
  - `colors.success`, `colors.warning`, `colors.error`, `colors.info`, `colors.textInverse`
  - `typography.fontSizes.xs`, `typography.fontWeights.bold`
  - `spacing.scale.1`, `spacing.scale.2`, `borders.radius.pill`
- Accessibility Requirements:
  - Never convey meaning by color alone.
  - Pair with text or icon label.
- States:
  - default, hover, focus, active, disabled

### Component: Card
- Category: MOLECULE
- Description: Structured content container for recommendations, risks, and sprint stories.
- Props / Variants:
  - `elevation`: `flat | raised`
  - `tone`: `default | warning | error | success`
  - Optional `title`, `meta`, `actions`
- Design Token References:
  - `colors.surface`, `colors.border`, `colors.text`, `colors.textSecondary`
  - `spacing.scale.4`, `spacing.scale.6`, `borders.radius.lg`, `shadows.sm`, `shadows.md`
- Accessibility Requirements:
  - Semantic heading hierarchy inside card.
  - Action controls reachable by keyboard.
- States:
  - default, hover, focus, active, disabled, loading

### Component: AlertBanner
- Category: MOLECULE
- Description: Inline notification for success, warning, error, and informational events.
- Props / Variants:
  - `variant`: `success | warning | error | info`
  - `dismissible`: boolean
  - `title`, `description`
- Design Token References:
  - `colors.success`, `colors.warning`, `colors.error`, `colors.info`
  - `colors.surface`, `colors.text`
  - `spacing.scale.3`, `spacing.scale.4`, `borders.radius.md`
- Accessibility Requirements:
  - `role="status"` for info/success and `role="alert"` for warnings/errors.
  - Dismiss button labeled for screen readers.
- States:
  - default, hover, focus, active, disabled

### Component: FormRow
- Category: MOLECULE
- Description: Label, helper, input/control, and validation block used in all forms.
- Props / Variants:
  - `required`, `optionalLabel`, `errorText`, `helperText`
- Design Token References:
  - `typography.fontSizes.sm`, `typography.fontSizes.xs`, `colors.textSecondary`
  - `spacing.scale.2`, `spacing.scale.3`
- Accessibility Requirements:
  - Required status must be text-based, not color-only.
  - Error and helper IDs linked via `aria-describedby`.
- States:
  - default, focus, error, disabled

### Component: TopNavigation
- Category: ORGANISM
- Description: Global navigation shell with project context, search, and primary actions.
- Props / Variants:
  - `items`, `activeItem`, `actions`, `status`
- Design Token References:
  - `colors.primary`, `colors.textInverse`, `colors.background`, `colors.border`
  - `typography.fontSizes.sm`, `typography.fontWeights.medium`
  - `spacing.scale.3`, `spacing.scale.4`, `shadows.sm`
- Accessibility Requirements:
  - Landmarks: `role="navigation"` with clear label.
  - Keyboard focus order follows visual order.
- States:
  - default, hover, focus, active, disabled

### Component: SidePanel
- Category: ORGANISM
- Description: Left navigation panel for phase and agent context with progress indicators.
- Props / Variants:
  - `collapsed`, `items`, `progressMap`
- Design Token References:
  - `colors.surface`, `colors.border`, `colors.text`, `colors.textSecondary`, `colors.primary`
  - `spacing.scale.3`, `spacing.scale.4`, `borders.radius.md`
- Accessibility Requirements:
  - Interactive entries are keyboard reachable.
  - Current item exposed with `aria-current="page"`.
- States:
  - default, hover, focus, active, disabled

### Component: ModalDialog
- Category: ORGANISM
- Description: Dialog for confirmations, escalations, and detail edits.
- Props / Variants:
  - `size`: `sm | md | lg`
  - `dismissible`: boolean
  - `title`, `body`, `actions`
- Design Token References:
  - `colors.surface`, `colors.text`, `colors.border`, `shadows.lg`, `borders.radius.xl`
  - `spacing.scale.4`, `spacing.scale.6`
- Accessibility Requirements:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  - Focus trap and return-focus on close.
- States:
  - default, hover, focus, active, disabled, loading

### Component: SprintBoardTemplate
- Category: TEMPLATE
- Description: Two-column planning layout for backlog and active sprint execution.
- Props / Variants:
  - `filters`, `backlogItems`, `sprintItems`, `metrics`
- Design Token References:
  - `colors.background`, `colors.surface`, `colors.border`, `colors.text`
  - `spacing.scale.4`, `spacing.scale.6`, `breakpoints.tablet`, `breakpoints.desktop`
- Accessibility Requirements:
  - Heading regions map to landmarks.
  - Drag-and-drop alternatives available via keyboard actions.
- States:
  - default, hover, focus, active, disabled

### Component: RiskDashboardPage
- Category: PAGE
- Description: Full page composition for risk inventory, severity matrix, and mitigation actions.
- Props / Variants:
  - `riskItems`, `filters`, `summaryCards`, `selectedRisk`
- Design Token References:
  - Full token system including `colors`, `typography`, `spacing`, `borders`, `shadows`, `breakpoints`
- Accessibility Requirements:
  - Table headers associated with cells.
  - Sort/filter controls keyboard and screen-reader accessible.
  - Status color always paired with text labels.
- States:
  - default, hover, focus, active, disabled, loading, error

## 3. Implementation Agent Guardrail

Implementation Guardrail (MANDATORY):
- This component inventory is the leading reference for UI implementation.
- Deviations require explicit written justification in PR description and reviewer approval.
- All components must consume design tokens from `.github/docs/brand/design-tokens.json`; hardcoded visual values are prohibited.
- Accessibility requirements in this inventory are mandatory release criteria, not optional enhancements.
- Component naming convention: `PascalCase` for component names and `camelCase` for props.

## 4. Handoff Checklist

- [x] Header includes date and source references
- [x] Component catalog includes category, description, variants/props, token references, a11y requirements, and states
- [x] Implementation Agent Guardrail section present
- [x] Every listed component includes accessibility requirements
- [x] All components reference design tokens
- [x] Taxonomy follows ATOM/MOLECULE/ORGANISM/TEMPLATE/PAGE
- [x] Output is ready for implementation handoff

Handoff status: COMPLETE
