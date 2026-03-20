# Next.js Routing Impact Analysis

## Current Route Model (Evidence-Based)

- Routing is implemented with React Router `createBrowserRouter`, with a single AppLayout and child routes for runtime, operations, data, observability, and cockpit. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Navigation metadata is centralized in `routes.ts` for sidebar sections and breadcrumb construction. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86)
- Legacy redirects for `command-center`, `metrics`, `analytics`, and `traceability` are currently implemented at the router layer. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)

## Impact of Moving to Next.js

- A Next.js migration is a router-layer rewrite because current routing is fully client-side with React Router and does not map 1:1 to Next.js app/pages routing. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Breadcrumbs and sidebar sections are derived from the custom route registry; a Next.js migration must preserve or replace this registry to keep navigation consistent. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86)

## Safe Routing Strategy (Non-Breaking)

- Maintain existing route paths during early migration by keeping React Router as the source of truth while introducing Next.js routes behind a feature flag or parallel path (e.g., `/v2/*`). [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Preserve redirect behavior for renamed routes to avoid breaking deep links. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)

## Layout Migration Implications

- AppLayout currently encapsulates sidebar, top navigation, and breadcrumbs; this layout should be extracted as a reusable shell before any router change. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Risks

- Any router migration must preserve client-side SSE-driven updates and query invalidation, which rely on the current app shell and hooks running in a browser context. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L104-L126), [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
