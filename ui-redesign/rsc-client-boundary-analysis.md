# RSC / Client Boundary Analysis

## Current Execution Model

- UI renders entirely in the browser via `createRoot` and a client-side router; the app shell and providers are mounted in `main.tsx`. [src/webapp/ui/src/main.tsx](src/webapp/ui/src/main.tsx#L1-L21)
- Data access is client-side via a fetch wrapper and TanStack Query. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83), [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L1-L50)

## Client-Side Real-Time Requirements

- SSE is browser-only and tied to the client runtime, with EventSource and toast notifications inside the UI shell lifecycle. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L104-L126)
- Runtime events are buffered in Zustand and read by session detail views to merge live events. [src/webapp/ui/src/stores/runtime-store.ts](src/webapp/ui/src/stores/runtime-store.ts#L1-L44), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31)

## Redesign Pressure Points

- Proposed domains emphasize evidence, approvals, and telemetry, all of which currently depend on client-side hooks and SSE updates. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L312-L368)

## Boundary Strategy (Non-Breaking)

- Preserve client-side data hooks and SSE for early redesign iterations; treat any server-rendering initiative as a separate refactor to avoid breaking live updates. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
