# Administration Domain Impact

## Domain Purpose

Provide RBAC, integrations, access reviews, and trust boundary controls. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L40-L105)

## Current State in Codebase

No administration route exists in the current UI routing registry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Current Components / Routes / State / Data Dependencies

- Auth hooks exist for current user and logout, but no admin surfaces consume RBAC data. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Gaps vs Target Redesign

- Full domain gap: proposal expects roles, permissions, integrations, access review panels. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)

## Required Code Additions / Changes

- Add `/administration` route and navigation entry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Define RBAC and integration data contracts for admin panels. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Add permission guards and no-access states for admin workflows. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)

## Functional Risks

- Admin domain likely impacts security and governance; must preserve auth/session behaviors. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Technical Risks

- RBAC and integration data contracts are not visible in the current UI API layer. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## UX Risks

- Without explicit admin panels, operators lack trust-boundary visibility required by proposal. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)

## Suggested Migration Approach

- Introduce a new `/administration` route behind feature flags with strict RBAC checks. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Suggested Component Strategy

- Build role cards, permission matrices, and integration tiles as Storybook composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add `/administration` route and nav entry only after RBAC data contracts are in place. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Suggested Testing Strategy

- Add access-control tests to ensure admin views are gated by current user roles. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Rollout Risk Level

High — security-sensitive domain with missing backend integration. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Recommended Sequence

After core navigation and auth/RBAC contracts are defined. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
