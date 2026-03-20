# Workspaces Domain Impact

## Domain Purpose

Provide a governed workspace overview with repositories, runs, agents, policies, integrations, and audit context. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L40-L105)

## Current State in Codebase

No workspace route exists in the current navigation registry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Current Components / Routes / State / Data Dependencies

- No `/workspaces` route or components present; closest analogs are Sessions and Overview pages. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L39)

## Gaps vs Target Redesign

- Full domain gap: proposal expects a workspace header, tabs, repository list, active runs, agents, policies, and audit panels. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)

## Required Code Additions / Changes

- Add `/workspaces` and `/workspaces/:id` routes plus navigation registry entries. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Define workspace data contracts and hooks for repositories, runs, agents, policies, and audit panels. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)
- Add RBAC guard rails for workspace access and role-sensitive panels. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Functional Risks

- Introducing this domain requires new data contracts and route additions that can impact navigation structure. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Technical Risks

- Workspace domain will need new API endpoints and state synchronization not currently present. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## UX Risks

- Without a workspace context strip and tabs, the proposal’s governance boundary framing cannot be met. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L77-L148)

## Suggested Migration Approach

- Create workspace routes behind a feature flag and align layout to new PageHeader + ContextStrip primitives. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L195-L239)

## Suggested Component Strategy

- Build workspace-specific composites (repository cards, run lists, policy panels) as Storybook-first components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add `/workspaces` and `/workspaces/:id` while preserving existing routes; update route registry accordingly. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Suggested Testing Strategy

- Create characterization tests for new workspace list/detail flows before enabling flags. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)

## Rollout Risk Level

High — new domain with unknown backend contracts and navigation implications. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Recommended Sequence

After shell primitives and navigation mapping are in place. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
