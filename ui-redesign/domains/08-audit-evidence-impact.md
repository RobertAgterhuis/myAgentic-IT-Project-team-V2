# Audit & Evidence Domain Impact

## Domain Purpose

Provide audit trail, evidence packs, and reconstructible event history. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L345-L367)

## Current State in Codebase

Audit/evidence is split between Artifact Browser and Traceability Explorer (within Observability). [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20), [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Current Components / Routes / State / Data Dependencies

- Routes: `/artifacts` and `/observability` (traceability tab). [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L54), [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L11-L23)
- Data hooks: `useArtifacts` and `useTraceability`. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L17-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L19-L20)

## Gaps vs Target Redesign

- Proposal expects a unified audit event stream with evidence pack context and chain-of-custody. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)

## Required Code Additions / Changes

- Define an audit aggregation contract to unify artifacts and traceability data. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Add an `/audit` (or `/evidence`) route and navigation entry for the unified explorer. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L54)
- Build evidence cards and chain-of-custody components as shared composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Functional Risks

- Splitting audit data across artifacts and traceability can hide evidence context for approvals. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L345-L367)

## Technical Risks

- Audit trail likely requires new API aggregation beyond current artifact and traceability endpoints. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## UX Risks

- Operators may lose audit context when navigating between artifacts and traceability views. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)

## Suggested Migration Approach

- Build a unified audit/evidence explorer that composes artifacts and traceability data. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)

## Suggested Component Strategy

- Create evidence cards, audit event list, and chain-of-custody components as Storybook composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Add `/audit` or `/evidence` route and keep `/artifacts` as legacy during transition. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L47-L54)

## Suggested Testing Strategy

- Add tests that validate audit event linking to artifacts and traceability gaps. [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)

## Rollout Risk Level

Medium — depends on new aggregation and evidence linking. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## Recommended Sequence

After observability and approval center foundations are stable. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
