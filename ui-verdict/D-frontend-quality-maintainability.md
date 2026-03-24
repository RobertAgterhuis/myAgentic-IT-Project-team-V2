# Part D — Frontend Quality, Performance & Maintainability

## D1. Frontend Performance (Web + App Responsiveness)

Score: 7/10 — Runtime behavior is generally solid with sensible caching/invalidation and event streaming, but bundle/runtime optimization evidence is mixed.

Top 3 strengths

1. React Query cache/stale policies and invalidation are explicit in [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L5) and [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L170).
2. SSE pipeline reduces brute-force polling for high-frequency runtime changes in [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1).
3. Route-level lazy loading is used in [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L32).

Top 3 weaknesses

1. Dist inspection indicates a relatively large primary JS artifact in [src/webapp/ui/dist/assets](src/webapp/ui/dist/assets), suggesting remaining split/opportunity.
2. No explicit web-vitals or RUM instrumentation path is apparent in frontend runtime code.
3. Polling remains in selected surfaces (for example cockpit hook) and can spike request load under long sessions.

Top 3 actionable improvements

1. Add performance budgets (bundle + chunk thresholds) and fail CI on regressions.
2. Instrument Core Web Vitals/RUM and expose dashboard alerts for regressions.
3. Replace residual polling with event-driven updates where feasible.

## D2. Code Quality & Architecture (Frontend)

Score: 8/10 — The architecture is modular and predictable with typed hooks, route-driven composition, and clear app shell boundaries.

Top 3 strengths

1. Strong separation of concerns: layout, pages, hooks, API client, stores in [src/webapp/ui/src](src/webapp/ui/src).
2. Typed API surface and normalized request layer in [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1).
3. Route metadata model used by nav/breadcrumbs improves maintainability in [src/webapp/ui/src/routes.ts](src/webapp/ui/src/routes.ts#L1).

Top 3 weaknesses

1. Some pages are approaching high component complexity due to mixed query + render + control logic.
2. State ownership boundaries (query cache vs Zustand vs local state) are good but not always formally documented.
3. Frontend architecture decision records for UI-specific conventions are limited.

Top 3 actionable improvements

1. Extract controller hooks for dense pages (pipeline/session/approval details).
2. Publish frontend architecture ADRs for state ownership and mutation patterns.
3. Set complexity thresholds and enforce via lint metrics.

## D3. Testability & QA Automation

Score: 8/10 — Test strategy spans unit, Storybook browser tests, e2e accessibility, and visual regression.

Top 3 strengths

1. Multi-project Vitest setup (unit + storybook browser) in [vitest.config.mjs](vitest.config.mjs#L1) and [src/webapp/ui/vitest.config.ts](src/webapp/ui/vitest.config.ts#L1).
2. Playwright coverage includes accessibility gates in [tests/e2e/s9h-accessibility.spec.ts](tests/e2e/s9h-accessibility.spec.ts#L1).
3. Visual regression baseline testing is active in [tests/e2e/visual-regression.spec.ts](tests/e2e/visual-regression.spec.ts#L1).

Top 3 weaknesses

1. No readily available frontend-only coverage summary artifact in [src/webapp/ui/coverage](src/webapp/ui/coverage), reducing quick confidence read.
2. Mobile viewport test matrix is not explicitly defined in Playwright projects.
3. Mutation/resilience tests for flaky real-time events are limited.

Top 3 actionable improvements

1. Generate and publish per-package coverage dashboards in CI artifacts.
2. Add mobile/tablet e2e projects and key scenario parity checks.
3. Introduce fault-injection tests for SSE disconnect/reconnect and delayed events.

## D4. DevEx & Maintainability

Score: 8/10 — Local and CI workflows are mature, with Storybook CI, typed codebase, and clear structure.

Top 3 strengths

1. Storybook CI automation is configured in [.github/workflows/storybook.yml](.github/workflows/storybook.yml#L1).
2. TypeScript strictness and modern build setup are present in [tsconfig.json](tsconfig.json#L1) and [src/webapp/ui/vite.config.ts](src/webapp/ui/vite.config.ts#L1).
3. UI folder conventions are discoverable and consistent across components/pages/hooks.

Top 3 weaknesses

1. New contributor onboarding for frontend architecture patterns could be more explicit in docs.
2. Shared mocks/fixtures for complex UI states are not centrally surfaced in docs.
3. Design token generation workflow dependencies are not obvious to first-time contributors.

Top 3 actionable improvements

1. Add frontend maintainers guide (state model, event model, testing pyramid).
2. Add scenario fixture library for loading/error/empty/realtime states.
3. Add a one-command local QA script for lint + unit + a11y smoke + visual smoke.

## D5. Security & UX Reliability

Score: 7/10 — Baseline reliability/safety controls are present, but client-side hardening and reliability observability can improve.

Top 3 strengths

1. Auth-aware route protection and session checks in [src/webapp/ui/src/components/ui/access-guard.tsx](src/webapp/ui/src/components/ui/access-guard.tsx#L1) and [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1).
2. API client centralizes auth header and error handling in [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L58).
3. Error boundary and user-safe fallback behavior are implemented in [src/webapp/ui/src/components/ui/error-boundary.tsx](src/webapp/ui/src/components/ui/error-boundary.tsx#L1).

Top 3 weaknesses

1. Frontend runtime telemetry for auth failures and repeated API errors is not strongly surfaced to operators.
2. UI-level security headers/CSP validation is mostly infra-owned and not visible in frontend package tests.
3. Token/session expiry user messaging can be uneven across pages.

Top 3 actionable improvements

1. Add client telemetry hooks for auth/API failure rates and surface in ops dashboards.
2. Add security smoke checks in e2e for critical protected routes and session-expiry scenarios.
3. Standardize session-expiry UX pattern with consistent re-auth recovery flow.
