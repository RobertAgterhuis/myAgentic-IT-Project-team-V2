# Design System Master

## Design System Intent

- Product type: desktop-first enterprise control plane for orchestrated SDLC operations, governance, and traceability.
- Current UI intent: high-signal operational console with visible state, guided next actions, and evidence-centric workflows.
- Recommended direction: preserve current visual identity and component richness, but normalize token usage, accessibility semantics, and desktop layout rules into enforceable standards.

## Brand / Product Expression

- Tone: rigorous, calm, evidence-forward, operator-grade.
- Trust goals: make status, risk, and accountability visible without visual noise.
- Energy goals: use accent and gradients sparingly for guidance and hierarchy, not decoration.
- Density goals: support dense dashboards and triage views while preserving scanability.
- Clarity goals: consistent component affordances and predictable page structure.
- Anti-patterns to avoid:
  - Arbitrary micro-typography (9px/10px labels) as default text.
  - Per-page color inventions and hardcoded hex values.
  - Multiple tab and list interaction patterns with different keyboard behavior.
  - Widescreen layouts that stretch content with weak hierarchy anchors.

## Color System

- Primary: `--color-primary` for primary actions and active selection emphasis.
- Secondary: `--color-secondary` for supporting action emphasis and cooperative status.
- Accent / CTA: `--color-accent` for rare momentum cues and key highlights.
- Success / Warning / Error / Info: `--color-success`, `--color-warning`, `--color-destructive`, `--color-info`.
- Neutral palette: `--color-background`, `--color-card`, `--color-muted`, `--color-border`, `--color-foreground`, `--color-muted-foreground`.
- Contrast guidance:
  - WCAG AA minimum for body text: 4.5:1.
  - Large text and large UI labels: 3:1 minimum, only where size/weight qualifies.
  - Never pair tiny text (`< 12px`) with low-contrast semantic fills.
- Semantic usage rules:
  - Do not use raw hex in components/pages except in token source files and controlled data visualization fallback layers.
  - Status/risk semantics use token aliases (`--status-*`, `--risk-*`) and component variants.
  - New semantic colors must be added to token pipeline before component adoption.

## Typography System

- Font families:
  - Heading: `--font-family-heading` (Sora).
  - Body: `--font-family-sans` (Manrope).
  - Mono: `--font-family-mono` (JetBrains Mono).
- Type scale:
  - Display/Page: `text-heading-xl`, `text-heading-lg`, `text-heading-md`.
  - Body: `text-body-md`, `text-body-sm`.
  - Caption: `text-caption-sm`.
- Weights:
  - Body: 400/500.
  - Labels and controls: 500/600.
  - Headings: 600/700.
- Line heights:
  - Heading: 1.16 to 1.26.
  - Body: 1.42 to 1.48.
  - Caption: 1.32.
- Hierarchy rules:
  - One `h1` per page (usually within PageHeader).
  - Section titles use heading level 2 or 3 consistently.
  - Metadata labels use caption scale, not ad-hoc `text-[10px]`.
- Usage rules:
  - Headings: navigation and section structure.
  - Body: instructions, descriptions, and data summaries.
  - Captions: table labels, compact telemetry metadata, badge support text.

## Spacing System

- Base unit: 4px.
- Spacing scale:
  - `--space-2xs` 2px, `--space-xs` 4px, `--space-sm` 8px, `--space-md` 12px, `--space-lg` 16px, `--space-xl` 24px, `--space-2xl` 32px.
- Layout rhythm rules:
  - Page vertical rhythm defaults to 24px section gaps.
  - In dense cards and tables, prefer 12px internal spacing.
  - Cross-page shell padding defaults to 24px (`p-6`) unless explicit page override exists.

## Radius / Border / Elevation System

- Radius rules:
  - Base control radius: `--radius-md` (14px) for major interactive surfaces.
  - Compact control radius: `--radius-sm` (4px).
  - Pill radius only for chips/badges.
  - Avoid arbitrary radii (`rounded-[26px]`, `rounded-[28px]`) in new work.
- Border usage:
  - Default border token: `--color-border` with opacity variants.
  - Active/focus states must use semantic ring/border tokens.
- Shadow/elevation rules:
  - Use `--shadow-sm` through `--shadow-xl` by tier.
  - Elevated surfaces must keep border + shadow pairing for clear depth hierarchy.

## Motion System

- Core transitions:
  - Fast: `--motion-duration-fast`.
  - Base: `--motion-duration-base`.
  - Slow: `--motion-duration-slow`.
- Easing:
  - Standard: `--motion-ease-standard`.
  - Emphasis: `--motion-ease-emphasis`.
- Interaction behavior:
  - Hover: subtle border/background lift and minimal translation.
  - Focus: visible ring via `focus-visible:ring` and `--color-ring`.
  - Pressed: reduce elevation/brightness briefly.
- Reduced motion:
  - Respect `prefers-reduced-motion` for all non-essential animations.
  - No state-critical information should depend on animation.

## Layout System

- Container rules:
  - App shell owns full viewport with persistent top nav and side panel.
  - Primary content in `main` scroll region.
- Desktop content width rules:
  - Standard pages: constrain content sections to 1280-1440 max where readability declines.
  - Dense analytic surfaces may use full width with defined column partitions.
- Standard laptop rules:
  - Target 1366x768 to 1536x864 without horizontal overflow.
  - Preserve side navigation readability and page action discoverability.
- Widescreen behavior:
  - At >= 1600px, prevent single-column stretches by introducing multi-column or max-width wrappers.
- Grid behavior:
  - Use consistent templates for split workbench views: `minmax(0,1.5fr)_minmax(18rem,1fr)`.
- Page width rules:
  - Header, context strip, and primary content should align to a shared horizontal rhythm.
- Section spacing:
  - Keep `space-y-6` for major vertical blocks; use `space-y-4` for nested operational blocks.
- Dense data layout guidance:
  - Prefer compact table rows and grouped metadata chips.
  - Keep key action controls pinned within visible scan area.

## Component Standards

### Buttons

- Intent: trigger actions with clear hierarchy.
- Variants: default, outline, secondary, destructive, ghost, link.
- States: default, hover, focus-visible, active, disabled, loading.
- Accessibility notes: preserve native `button`; provide `aria-busy` for loading.
- Desktop usage notes: keep primary actions near section headers and right rails.
- Implementation notes: continue CVA + Tailwind classes; avoid inline style overrides.

### Inputs

- Intent: structured text entry.
- Variants: default, invalid, disabled, dense (future).
- States: placeholder, focus ring, error, disabled.
- Accessibility notes: explicit labels and `aria-invalid` when needed.
- Desktop usage notes: align field widths to form columns; avoid full-width in dense dialogs unless needed.
- Implementation notes: use shared `Input` and `InputField` components.

### Selects

- Intent: controlled choice for bounded options.
- Variants: default, invalid, disabled.
- States: closed, open, highlighted option, selected option.
- Accessibility notes: keyboard arrows, enter, escape, proper role semantics.
- Desktop usage notes: surface summary values in table filters and control panels.
- Implementation notes: standardize on Radix-based select primitive.

### Checkboxes

- Intent: multiple independent toggles.
- Variants: default, indeterminate, error.
- States: checked, unchecked, mixed, disabled, focus-visible.
- Accessibility notes: label association and group legends.
- Desktop usage notes: use for table bulk selection and settings forms.
- Implementation notes: centralize via shared primitive.

### Radios

- Intent: single selection in a group.
- Variants: default, error, disabled.
- States: selected/unselected/focus.
- Accessibility notes: radio group labels and keyboard navigation.
- Desktop usage notes: use for mutually exclusive workflow modes.
- Implementation notes: avoid custom ad-hoc radio markup.

### Textareas

- Intent: multi-line justification/context entry.
- Variants: default, invalid, disabled.
- States: resize, focus, error.
- Accessibility notes: label required, helper/error text linked with `aria-describedby`.
- Desktop usage notes: reserve for rationale, rejection reasons, long prompts.
- Implementation notes: add standardized `Textarea` primitive; do not handcraft styles per page.

### Cards

- Intent: grouped operational content.
- Variants: elevation (`flat`, `raised`, `outlined`) and tone (`default`, `info`, `warning`, `error`, `success`).
- States: static, hover, clickable, selected.
- Accessibility notes: clickable cards must be keyboard focusable and semantically actionable.
- Desktop usage notes: use cards as modular lanes/blocks; avoid random radius variants.
- Implementation notes: preserve current Card API and phase out one-off card shells.

### Tables

- Intent: high-density, scan-efficient structured data.
- Variants: static table, sortable table, paginated data table.
- States: loading skeleton, empty, sorted asc/desc, selected rows.
- Accessibility notes: sort controls must be keyboard-accessible buttons with `aria-sort` updates.
- Desktop usage notes: enable horizontal overflow inside container only, keep headers sticky in future enhancement.
- Implementation notes: standardize through `Table` + `DataTable`; remove ad-hoc raw table markup.

### Tabs

- Intent: switch between related analytical views.
- Variants: underline tabs, segmented tabs (single canonical primitive required).
- States: default, active, hover, disabled, focus-visible.
- Accessibility notes: implement arrow key navigation, home/end, and proper tabpanel focus management.
- Desktop usage notes: use tabs for broad content lenses; avoid too many same-level tab groups.
- Implementation notes: create shared Tabs primitive and migrate cockpit/observability.

### Breadcrumbs

- Intent: route context and hierarchy recall.
- Variants: standard path trail.
- States: current item, hover, focus.
- Accessibility notes: `nav` landmark with `aria-label` and current page marker.
- Desktop usage notes: keep above page content, below top navigation.
- Implementation notes: retain centralized breadcrumb builder.

### Modals

- Intent: focused interaction without route change.
- Variants: confirm, form, detail modal.
- States: open, closing, validation error, busy submit.
- Accessibility notes: focus trap, escape close, initial focus, labelled title/description.
- Desktop usage notes: constrain width by complexity tier.
- Implementation notes: continue Radix dialog; migrate custom modal-like blocks to primitive.

### Drawers

- Intent: secondary context without leaving current page.
- Variants: right-side detail, command/help panel.
- States: open/closed, pinned (future), loading.
- Accessibility notes: focus containment and close affordance.
- Desktop usage notes: keep drawer widths consistent (for example 420px detail rail).
- Implementation notes: align help/chat/detail panels to one drawer contract.

### Alerts

- Intent: communicate success/info/warning/error system state.
- Variants: info, success, warning, error.
- States: static, dismissible, actionable.
- Accessibility notes: use role `status` or `alert` based on urgency.
- Desktop usage notes: place near page top for blocking load errors.
- Implementation notes: continue `AlertBanner` and remove bespoke error blocks.

### Toasts

- Intent: transient feedback for non-blocking actions.
- Variants: success/info/warning/error.
- States: queued, visible, dismissed.
- Accessibility notes: live region announcements and focus-safe behavior.
- Desktop usage notes: avoid replacing inline validation with toasts.
- Implementation notes: keep Sonner wrapper with semantic helper API.

### Badges

- Intent: compact status tags and metadata.
- Variants: default, secondary, outline, info, success, warning, error, neutral.
- States: static, removable.
- Accessibility notes: removable badges need labeled remove button.
- Desktop usage notes: use for concise signals, not full sentence content.
- Implementation notes: map success/warning/error to tokenized semantic palette only.

### Nav Items

- Intent: route navigation and section switching.
- Variants: default, active, disabled, collapsed-icon.
- States: hover, active, focus-visible.
- Accessibility notes: use true links for navigation where possible.
- Desktop usage notes: maintain consistent icon alignment and label truncation.
- Implementation notes: remove `role="link"` on buttons and prefer anchor semantics or router links.

### Topbar / Sidebar Patterns

- Intent: persistent global navigation and context controls.
- Variants: expanded and collapsed sidebar.
- States: connected/disconnected indicators, role-filtered menus.
- Accessibility notes: landmarks, skip-link support, keyboard toggles.
- Desktop usage notes: maintain stable widths and avoid hiding nav unexpectedly at desktop breakpoints.
- Implementation notes: unify sidebar collapse behavior across md/lg breakpoints.

### Empty States

- Intent: explain no-data/no-access conditions with next action.
- Variants: no data, no access, not found.
- States: with/without CTA.
- Accessibility notes: clear heading and actionable button text.
- Desktop usage notes: avoid oversized empty blocks in dense contexts.
- Implementation notes: continue shared `EmptyState` + `PageShell` integration.

### Loading States

- Intent: communicate in-progress operations.
- Variants: full-page spinner, section skeleton, inline loading indicator.
- States: initial load, refresh, mutation pending.
- Accessibility notes: aria-busy and descriptive labels.
- Desktop usage notes: preserve layout stability with skeletons for dense tables/cards.
- Implementation notes: prefer `PageShell` and local skeleton components.

### Error States

- Intent: communicate failures and provide recovery.
- Variants: page-load error, section error, action error.
- States: retry available, no retry, escalated/system outage.
- Accessibility notes: urgent errors as `alert`, actionable retry control.
- Desktop usage notes: keep error context near affected module.
- Implementation notes: standardize on `AlertBanner` + retry action pattern.

## Accessibility Requirements

- Contrast:
  - Meet WCAG AA for text and controls.
  - Re-verify semantic badges and warning surfaces in dark mode.
- Focus visibility:
  - Every interactive element must have visible `focus-visible` ring/outline.
- Keyboard navigation:
  - Complete keyboard support for tabs, table sorting, dialogs, side navigation, and menu actions.
- Form labeling:
  - Every input/select/textarea must have associated label and helper/error text IDs.
- ARIA expectations:
  - Correct roles for tablist/tab/tabpanel, alert/status regions, and dialogs.
  - Avoid role spoofing when native semantics exist.
- Touch target sizing:
  - Maintain minimum actionable sizes where controls are compact; desktop priority still applies.
- Reduced motion:
  - All non-essential motion disabled under reduced-motion preference.

## Desktop Layout Rules

- Desktop-first behavior:
  - Assume shell + sidebar + content on all primary routes.
- Standard laptop behavior:
  - Preserve readable two-column workbench layouts from 1280px upward.
- Widescreen behavior:
  - Introduce bounded containers or structured multi-column partitions above 1600px.
- Smaller-width resilience:
  - Maintain functional navigation and content readability; mobile-optimized redesign is out of scope.
- Dense forms/dashboards/tables/admin surfaces:
  - Maintain consistent section headers, context strip, and data blocks.
  - Keep table controls and row actions discoverable without excessive whitespace.

## Anti-Patterns To Avoid

- Hardcoded hex colors or fallback color constants in page/components.
- Uncontrolled typography drift (`text-[9px]`, `text-[10px]`) for normal-readable UI text.
- Multiple ad-hoc tab implementations with inconsistent keyboard support.
- Page-specific textarea/input styling instead of primitives.
- Duplicate loading/error/empty logic outside `PageShell` unless justified.
- Inconsistent desktop panel widths for equivalent workflows.
- Content stretches that reduce scanability on widescreens.

## Pre-Delivery Checklist

- [ ] No raw hex usage in UI implementation outside token source and approved visualization adapters.
- [ ] Typography uses approved scale utilities/components.
- [ ] New/updated pages implement consistent PageHeader + ContextStrip + PageShell patterns.
- [ ] Tabs support full keyboard interaction and ARIA contracts.
- [ ] Table sorting controls are keyboard-operable and screen-reader-friendly.
- [ ] Dialogs pass focus trap, escape close, and labeled-title checks.
- [ ] Error/loading/empty states are complete for data-fetching surfaces.
- [ ] Desktop layouts validated at 1366px, 1536px, and >= 1920px widths.
- [ ] Storybook stories updated for default, dense, and constrained states.
- [ ] Axe/Playwright accessibility checks pass with no critical or serious violations.
