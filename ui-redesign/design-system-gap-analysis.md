# Design System Gap Analysis

## Current Shared Component Maturity

- Existing primitives include DataTable, MetricCard, PageShell, and status motif patterns with Storybook coverage. [src/webapp/ui/src/components/ui/data-table.tsx](src/webapp/ui/src/components/ui/data-table.tsx#L1-L200), [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/src/components/ui/status-motif.tsx](src/webapp/ui/src/components/ui/status-motif.tsx#L1-L49)
- Shell/navigation primitives exist as TopNavigation and SidePanel, assembled in AppLayout. [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L73-L193), [src/webapp/ui/src/components/ui/side-panel.tsx](src/webapp/ui/src/components/ui/side-panel.tsx#L1-L175), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Current Tailwind/Token Maturity

- Tailwind and generated tokens are wired globally, with semantic CSS variables and typography tokens. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182), [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)
- Dark mode color overrides are defined in CSS, not through a design-system layer. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L15-L45)

## Storybook Maturity

- Storybook uses React Vite with a11y and docs addons plus MSW loader. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L26)

## Missing Primitives vs Proposal

- Proposed foundations (semantic color, typography scale, spacing, motion tokens) are defined as backlog items and are only partially expressed in current tokens. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149), [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)
- Proposed AppShell, SidebarNav, PageHeader, Breadcrumb/ContextPath, ContextStrip are not present as explicit, reusable primitives in the current component list. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Missing Composite Components vs Proposal

- Proposed operational cards (queue/triage lists, evidence cards, decision panels) are listed as design system backlog epics but are not represented as dedicated shared composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
- Proposed context strip and breadcrumb patterns in IA spec are not implemented as consistent primitives (breadcrumbs exist but no context strip). [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L109-L148), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L78-L156)

## Story Coverage Gaps

- Existing stories exist for primitives but proposed Storybook-first backlog requires full coverage for status/risk badges, operational cards, decision components, and domain composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L63-L239)

## Recommended Design-System Implementation Order

1. Formalize foundation tokens (semantic colors, typography, spacing, motion) aligned to backlog epics. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149)
2. Extract explicit shell primitives (AppShell, SidebarNav, PageHeader, Breadcrumb, ContextStrip). [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
3. Add status/risk system and operational cards, then domain composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
