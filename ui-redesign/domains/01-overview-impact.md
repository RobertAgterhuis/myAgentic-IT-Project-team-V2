# Overview Domain Impact

## Domain Purpose

Provide the executive control surface for system-wide status, decisions, and governance visibility. [ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx](ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx [ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx](ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L168)

## Current State in Codebase

Overview is the index route and uses the existing AppLayout shell. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L39), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Current Components / Routes / State / Data Dependencies

- Route: `/` (index) renders OverviewPage. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L39)
- Data hooks: `useSessions`, `useSession`, `useDecisions`, `useDashboardHealth`. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L90)
- Shared UI: MissionControlHero, StatusMotif, runtime session/flow components. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L15-L24)

## Gaps vs Target Redesign

- Proposal expects page header + context strip patterns and panel grammar that are not standardized in current Overview. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L109-L168)
- Proposal control-surface mockup emphasizes decision queue and workspace portfolio in a single surface; current Overview is more session/health focused. [ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx](ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx#L1), [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L72-L90)

## Required Code Additions / Changes

- Add PageHeader + ContextStrip primitives and refactor Overview to use them. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L195-L239)
- Add decision queue and workspace summary composites to match control-surface layout. [ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx](ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx#L1), [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L72-L90)
- Extend data adapters for decision and workspace portfolio cards so existing hooks can feed new UI. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)

## Functional Risks

- Overview is the landing route; functional regressions would impact primary entry flow. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L39)
- Data dependencies from sessions and decisions must remain intact during redesign. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L90)

## Technical Risks

- SSE-driven updates and global query invalidation must continue to fire through the AppLayout shell. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L104-L126), [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)

## UX Risks

- Without standardized page header/context strip, the overview may not meet the proposal’s operational clarity requirements. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L109-L148)

## Suggested Migration Approach

- Refactor the Overview page to adopt PageHeader + ContextStrip primitives while preserving data hooks and route. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L90), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L195-L239)

## Suggested Component Strategy

- Build/extend KPI cards, decision queue, workspace summary cards as Storybook-first composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Keep `/` as the overview route; use feature flags to swap layout variants without changing paths. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L39)

## Suggested Testing Strategy

- Add characterization tests for Overview data rendering (sessions, decisions, health). [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L90)

## Rollout Risk Level

Medium — landing page depends on core hooks and global navigation. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L27-L90), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Recommended Sequence

After shell primitives and token updates are in place. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L239)
