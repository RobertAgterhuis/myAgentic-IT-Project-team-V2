# Approvals Domain Impact

## Domain Purpose

Provide a centralized approval queue with full decision context and evidence before action. [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L371-L394)

## Current State in Codebase

Approvals are handled in the Governance dashboard and approval detail is in Cockpit. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33)

## Current Components / Routes / State / Data Dependencies

- Routes: `/governance` and `/cockpit/approvals/:id`. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L58)
- Data hooks: `useApprovals`, `useApproveRequest`, `useRejectRequest`, `useApprovalDetail`. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33)

## Gaps vs Target Redesign

- Proposal expects a dedicated Approval Center with queue + decision context in one surface; current approach splits list vs detail across routes. [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1), [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Required Code Additions / Changes

- Add `/approvals` route and navigation entry for Approval Center. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L58)
- Refactor approval detail into shared composites for queue + decision context. [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33), [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)
- Add RBAC guard and no-access state handling for approval actions. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)

## Functional Risks

- Approval actions must continue to use existing mutations to preserve policy enforcement. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Technical Risks

- Approval detail relies on Cockpit approval panel; reusing it requires safe refactor into shared components. [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33)

## UX Risks

- Approval context may remain fragmented if queue and decision details are not co-located. [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)

## Suggested Migration Approach

- Build a new Approval Center route using existing hooks and approval detail components as shared modules. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33)

## Suggested Component Strategy

- Implement decision queue and evidence panels as Storybook composites aligned with proposal. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add `/approvals` route and keep `/governance` as legacy during transition. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L58)

## Suggested Testing Strategy

- Add parity tests to confirm approval status changes and decision comments persist. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Rollout Risk Level

Medium — approval actions are governance-critical and must retain mutation semantics. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)

## Recommended Sequence

After shell and operational card primitives are in place. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
