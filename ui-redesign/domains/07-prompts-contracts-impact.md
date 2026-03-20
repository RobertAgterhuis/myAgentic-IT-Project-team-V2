# Prompts & Contracts Domain Impact

## Domain Purpose

Provide governance for prompts, contracts, schemas, templates, and change requests. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L58-L105)

## Current State in Codebase

No dedicated route or components exist for prompt/contract governance. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Current Components / Routes / State / Data Dependencies

- No `/prompts` or `/contracts` routes exist; no hooks expose prompt/contract assets. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Gaps vs Target Redesign

- Full domain gap: asset registry, validation, drift, and change request workflows are missing. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)

## Required Code Additions / Changes

- Add `/prompts-contracts` route and navigation entry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Define prompt/contract data contracts and change-request workflows in the API layer. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Add RBAC guard utilities for access to prompt assets. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## Functional Risks

- Introducing this domain will require new data endpoints and change-approval workflows. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## Technical Risks

- Unknown API contracts and RBAC constraints for prompt assets. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)

## UX Risks

- Without prompt/contract visibility, proposal goals of deterministic agent behavior are unmet. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)

## Suggested Migration Approach

- Introduce a new `/prompts-contracts` route behind feature flag, backed by new APIs. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)

## Suggested Component Strategy

- Build asset registry tables, version panels, validation cards, and change request queues as Storybook composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add a dedicated route and navigation entry; keep existing nav stable until data is ready. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Suggested Testing Strategy

- Create integration tests for new asset workflows once API contracts exist. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## Rollout Risk Level

High — new domain with unknown data contracts and governance behaviors. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

## Recommended Sequence

After core shell and operational card primitives plus backend contracts. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
