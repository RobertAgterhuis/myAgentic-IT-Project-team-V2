# Part A — UI Architecture & Frontend Engineering

## A1. Component Architecture

Score: 8/10 — Strong layered component model with reusable primitives, but some page files are very large and mix orchestration logic with rendering.

Top 3 strengths

1. Clear composition chain: app shell -> layout -> domain pages -> shared UI primitives in [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1), and [src/webapp/ui/src/components/ui](src/webapp/ui/src/components/ui).
2. Reusable variant system via CVA in [src/webapp/ui/src/components/ui/button.tsx](src/webapp/ui/src/components/ui/button.tsx#L6), which is consistently used across pages.
3. Strong typing on API and domain models from [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts) consumed by pages/hooks.

Top 3 weaknesses

1. Several pages are monolithic and carry heavy view+logic concerns, especially [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx#L1), [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx#L1), and [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1).
2. Route-level code splitting exists, but large page modules still concentrate substantial orchestration logic before render in [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L9).
3. Some domain behaviors are duplicated across pages instead of extracted into dedicated feature services/hooks (status mapping, badge logic patterns).

Top 3 actionable improvements

1. Split large page files into page-container + feature sections + local hooks (example target: commands, pipeline, session detail).
2. Introduce feature-folder contracts with explicit view model builders per page area.
3. Add max file/function complexity lint constraints for page modules in [src/webapp/ui/eslint.config.mjs](src/webapp/ui/eslint.config.mjs#L1).

## A2. State Management & Data Flow

Score: 8/10 — Separation is mostly clean: React Query for server state and Zustand for transient UI/runtime state, with SSE-driven cache invalidation.

Top 3 strengths

1. Central API client and normalized errors in [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1).
2. Clear server-state ownership in TanStack Query hooks such as [src/webapp/ui/src/hooks/use-agents.ts](src/webapp/ui/src/hooks/use-agents.ts#L1).
3. Real-time SSE pipeline with reconnect and cache invalidation in [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1) and runtime bridging in [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1).

Top 3 weaknesses

1. Polling + SSE are both active in places, creating possible redundant refresh pressure (for example hooks with refetch intervals in parallel to SSE invalidation).
2. Runtime event dedupe uses event id/timestamp heuristics; edge duplication risk remains under reconnect bursts in [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L57).
3. No single documented state architecture map (what belongs to Query vs Zustand vs component-local) for contributors.

Top 3 actionable improvements

1. Define a formal state ownership matrix in docs and enforce via lint/checklist.
2. Reduce polling for SSE-backed datasets by moving to event-first updates with fallback timers only.
3. Add reconnect-storm and duplicate-event integration tests around SSE hooks.

## A3. Routing, Navigation & Page Structure

Score: 9/10 — Excellent route map, deep-linkable URL structure, role guards, redirects for renamed routes, and persistent shell navigation.

Top 3 strengths

1. Comprehensive lazy route configuration with nested layout in [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L39).
2. Route metadata single source in [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1), reused for sidebar and breadcrumbs.
3. Role-based protection using [src/webapp/ui/src/components/ui/access-guard.tsx](src/webapp/ui/src/components/ui/access-guard.tsx#L1) for operator/admin views.

Top 3 weaknesses

1. A lot of redirect aliases in the router increase long-term maintenance burden in [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L141).
2. Dynamic deep links are supported, but there is limited explicit URL-state persistence for filter-heavy pages.
3. Some route names and domain labels overlap conceptually (observability/cockpit/metrics/analytics), which can confuse navigation semantics.

Top 3 actionable improvements

1. Add route deprecation policy and telemetry to phase out legacy redirects.
2. Persist key page filters in query params for shareable deep links.
3. Publish IA map and naming conventions for route/domain consistency.

## A4. Styling & Theming

Score: 8/10 — Strong tokenized styling and dark/system themes, but mixed ad-hoc utility usage still appears in some forms and pages.

Top 3 strengths

1. Central design tokens in [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1) generated from brand tokens.
2. Robust global semantic styling, typography scale, motion tokens, and dark theme overrides in [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1).
3. Theme provider and persisted theme preference in [src/webapp/ui/src/components/ui/theme-provider.tsx](src/webapp/ui/src/components/ui/theme-provider.tsx#L1) and [src/webapp/ui/src/components/ui/theme-utils.ts](src/webapp/ui/src/components/ui/theme-utils.ts#L1).

Top 3 weaknesses

1. Some pages still include repeated raw utility-heavy input classes instead of fully reused form primitives.
2. Storybook a11y preview disables color-contrast rule in [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L22), reducing safety signal in component review.
3. Styling consistency depends heavily on conventions rather than strict automated token-usage enforcement outside storybook governance checks.

Top 3 actionable improvements

1. Replace repeated inline form class strings with shared field primitives.
2. Re-enable color contrast checks in Storybook and explicitly document exceptions per component.
3. Add static rule/check for hardcoded color literals outside token files.

## A5. Build, Bundle & Frontend Tooling

Score: 8/10 — Tooling is modern and disciplined, with Storybook governance and strong lint/test setup; bundle governance and perf gates are still weak.

Top 3 strengths

1. Vite + React + Tailwind setup is clean in [src/webapp/ui/vite.config.ts](src/webapp/ui/vite.config.ts#L1).
2. Frontend scripts include unit tests, coverage, Storybook, and governance checks in [src/webapp/ui/package.json](src/webapp/ui/package.json#L1).
3. Storybook CI with GitHub Pages deployment exists in [.github/workflows/storybook.yml](.github/workflows/storybook.yml#L1).

Top 3 weaknesses

1. No explicit frontend bundle budget enforcement; built JS artifact is sizeable (largest runtime bundle from dist assets inspection).
2. Vite build uses sourcemap true in [src/webapp/ui/vite.config.ts](src/webapp/ui/vite.config.ts#L11); release profile control is not separated.
3. Frontend env config is minimal and mostly implicit; there is little explicit environment contract documentation for UI runtime.

Top 3 actionable improvements

1. Add bundle-size budget checks (gzip/brotli thresholds) in CI.
2. Split production vs dev build config for sourcemaps and diagnostics artifacts.
3. Add frontend runtime configuration contract doc and validation.
