# Current UI Inventory

## Stack and Build

- Vite + React build with Tailwind and React Router in the UI package scripts and dependencies. [src/webapp/ui/package.json](src/webapp/ui/package.json#L1-L63)
- Vite config with Tailwind plugin and `/api` proxy to the backend. [src/webapp/ui/vite.config.ts](src/webapp/ui/vite.config.ts#L1-L26)

## Routing and Navigation

- React Router `createBrowserRouter` drives routing for login, runtime, operations, data, observability, and cockpit pages. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Navigation metadata (sections, labels, paths) lives in a central routes registry used for sidebar and breadcrumbs. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86)

## Layout and App Shell

- The app shell uses `AppLayout` with `TopNavigation`, `SidePanel`, and breadcrumbs around an `Outlet`. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Top navigation includes project context, search, orchestrator state, connection status, theme toggle, and user menu. [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L73-L193)

## State, Data, and Real-Time

- TanStack Query is configured with centralized retry, stale time, and global error handling. [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L1-L50)
- API access is centralized through a fetch wrapper using `/api` base URL. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- UI state (sidebar, help panel, connection status) is handled by Zustand. [src/webapp/ui/src/stores/ui-store.ts](src/webapp/ui/src/stores/ui-store.ts#L1-L66)
- Runtime event buffering and active session tracking uses a Zustand store. [src/webapp/ui/src/stores/runtime-store.ts](src/webapp/ui/src/stores/runtime-store.ts#L1-L44)
- SSE stream hooks invalidate query caches and forward runtime events into the runtime store. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)

## Styling, Tokens, and Theming

- Global styling uses Tailwind and imports generated design tokens plus font families. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182)
- Semantic tokens are defined via a generated `@theme` block (colors, typography, radii, shadows). [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)

## Design System and Component Library

- UI primitives include a reusable data table and status motif patterns for KPI-style layouts. [src/webapp/ui/src/components/ui/data-table.tsx](src/webapp/ui/src/components/ui/data-table.tsx#L1-L200), [src/webapp/ui/src/components/ui/status-motif.tsx](src/webapp/ui/src/components/ui/status-motif.tsx#L1-L49)
- Cross-page layout helpers include `PageShell` for loading/error/empty states and `MetricCard` for KPI summaries. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120)

## Storybook

- Storybook is configured with React Vite, a11y addon, vitest addon, and MSW loader support. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L26)

## Testing and Quality Signals

- Component unit tests exist for shared UI primitives (example: DataTable tests). [src/webapp/ui/src/components/ui/data-table.test.tsx](src/webapp/ui/src/components/ui/data-table.test.tsx#L1-L80)
