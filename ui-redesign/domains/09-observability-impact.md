# Observability Domain Impact

## Domain Purpose

Provide telemetry center with operational health, alerts, and runtime signals. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L58-L105)

## Current State in Codebase

Observability is a tabbed page combining metrics, analytics, and traceability. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Current Components / Routes / State / Data Dependencies

- Route: `/observability`. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L54)
- Data hooks in subpages: drift/metrics, analytics trends, traceability. [src/webapp/ui/src/pages/metrics/metrics-page.tsx](src/webapp/ui/src/pages/metrics/metrics-page.tsx#L1-L24), [src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx](src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx#L1-L17), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)

## Gaps vs Target Redesign

- Proposal expects alerts, telemetry streams, and correlation narratives that are not present in the current tabbed layout. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1), [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Required Code Additions / Changes

- Define alert and telemetry stream data contracts to power new panels. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Add alert/stream panels and correlation composites while preserving existing tabs. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35), [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Extend adapters to blend new telemetry data with existing metrics/analytics views. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)

## Functional Risks

- Observability depends on multiple data sources; introducing new alert panels must not regress existing analytics tabs. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Technical Risks

- Telemetry stream and alert data require new API endpoints beyond current analytics/metrics hooks. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)

## UX Risks

- Without alert triage and telemetry context, operators cannot reach the proposal’s “operational console” expectations. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)

## Suggested Migration Approach

- Layer alert/telemetry panels on top of existing metrics/analytics tabs to preserve current data views. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Suggested Component Strategy

- Build alert cards, telemetry stream rows, and correlation panels as Storybook composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Keep `/observability` route; migrate internal tabs to new composites rather than new routes. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L53-L54)

## Suggested Testing Strategy

- Add tests for metrics/analytics/traceability tab rendering plus alert panels. [src/webapp/ui/src/pages/metrics/metrics-page.tsx](src/webapp/ui/src/pages/metrics/metrics-page.tsx#L1-L24)

## Rollout Risk Level

Medium — core operational UI but can be incrementally enhanced. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Recommended Sequence

After operational card primitives and alert components are ready. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
