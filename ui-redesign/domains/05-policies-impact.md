# Policies Domain Impact

## Domain Purpose

Provide a policy/governance center with rules, exceptions, evaluations, drift, and ownership. [ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx](ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx [ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx](ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L390-L399)

## Current State in Codebase

Policy compliance is a tab inside the Governance dashboard. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Current Components / Routes / State / Data Dependencies

- Route: `/governance`. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L55)
- Data hooks: approvals and decision provenance are used; policy compliance panel is lazy-loaded. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Gaps vs Target Redesign

- Proposal expects a dedicated policy center with exceptions, evaluations, and drift; current UI nests policy compliance under Governance approvals. [ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx](ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx#L1), [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Required Code Additions / Changes

- Add `/policies` route and navigation entry separate from governance approvals. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L55)
- Define policy exception, evaluation, and drift data contracts. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Build policy center composites (exception lists, evaluation tables) for the new route. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Functional Risks

- Policy actions must remain tied to governance workflows and approval flows. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Technical Risks

- Policy exceptions and drift require API support not visible in current UI hooks. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## UX Risks

- Without a dedicated policy center, operators must switch between approvals and policy context manually. [ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx](ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx#L1)

## Suggested Migration Approach

- Extract policy compliance into a standalone Policy Center route while keeping Governance approvals intact. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Suggested Component Strategy

- Build policy cards, exception lists, and evaluation tables as shared components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add `/policies` route and map to new policy center; retain `/governance` during migration. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L55)

## Suggested Testing Strategy

- Add tests for policy compliance and exception views before replacing Governance tab. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Rollout Risk Level

Medium — policy domain is governance-critical and likely requires backend augmentation. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Recommended Sequence

After approvals center and shell primitives are stable. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
