# Runs Domain Impact

## Domain Purpose

Provide a governed run detail narrative with phase timeline, decisions, evidence, and human blockers. [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1)

## Proposal Reference Files

- ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1)
- ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L371-L400)

## Current State in Codebase

Runs are represented as Sessions list and Session Detail, with pipeline visualization for phase progression. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L40), [src/webapp/ui/src/pages/sessions/sessions-page.tsx](src/webapp/ui/src/pages/sessions/sessions-page.tsx#L1-L18), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31), [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx#L1-L18)

## Current Components / Routes / State / Data Dependencies

- Routes: `/sessions`, `/sessions/:id`, `/pipeline`. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L40)
- Data hooks: `useSessions` for list, `useSession` for detail, `useProgress` for pipeline. [src/webapp/ui/src/pages/sessions/sessions-page.tsx](src/webapp/ui/src/pages/sessions/sessions-page.tsx#L1-L18), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31), [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx#L1-L18)
- Runtime event buffering via Zustand and SSE for live timeline merge. [src/webapp/ui/src/stores/runtime-store.ts](src/webapp/ui/src/stores/runtime-store.ts#L1-L44), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)

## Gaps vs Target Redesign

- Proposal run detail expects explicit decision queue, evidence panel, and narrative timeline; current session detail is more execution-telemetry focused. [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)

## Required Code Additions / Changes

- Add decision queue, evidence panel, and narrative timeline composites to Session Detail. [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)
- Extend data adapters to merge SSE runtime events with decision/evidence data. [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76), [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Add deep-link subviews for evidence and approvals within the run detail flow. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L40)

## Functional Risks

- Session detail merges live SSE events with server timeline; redesign must preserve merged timeline semantics. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)

## Technical Risks

- Pipeline and session views depend on consistent phase data from `useProgress` and `useSession`. [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx#L1-L18), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31)

## UX Risks

- Without proposal-style narrative framing, operators may still need to reconstruct run story manually. [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1)

## Suggested Migration Approach

- Enhance Session Detail with decision/evidence panels first, then align Session list to proposal’s run list patterns. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31), [ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx](ui-proposal/agentic_sdlc_page_03_run_detail_mockup.jsx#L1)

## Suggested Component Strategy

- Introduce run timeline, decision queue, evidence cards as Storybook composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)

## Suggested Routing Strategy

- Keep `/sessions/:id` as the canonical run detail route; introduce deep links to evidence and approvals as subviews. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L35-L40)

## Suggested Testing Strategy

- Add characterization tests for timeline and decision rendering before UI swap. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)

## Rollout Risk Level

Medium — session detail is central to runtime workflows and uses live updates. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)

## Recommended Sequence

After shell and operational card primitives are available. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
