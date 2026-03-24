# Part C — Visual Design & Polish

## C1. Visual Consistency & Design System

Score: 8/10 — Visual language is coherent and token-driven, with reusable primitives and consistent iconography; occasional local styling divergence remains.

Top 3 strengths

1. Centralized semantic token model in [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1) and global style semantics in [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1).
2. Shared reusable primitives (button, badge, card, input, table, dialogs) under [src/webapp/ui/src/components/ui](src/webapp/ui/src/components/ui).
3. Consistent icon set with Lucide used throughout layouts/pages in examples like [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L1).

Top 3 weaknesses

1. Some screens still contain page-local utility-heavy blocks that bypass reusable visual primitives.
2. Storybook preview currently disables color-contrast rule in [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L22), reducing design-system guardrails.
3. Typography hierarchy is strong globally but can vary in local page sections due to ad-hoc class usage.

Top 3 actionable improvements

1. Enforce primitive-first styling for forms and action bars.
2. Re-enable color-contrast checks in Storybook and manage exceptions explicitly.
3. Add visual consistency lint rules for typography and spacing token usage.

## C2. Responsiveness & Layout

Score: 7/10 — Responsive utility patterns exist and are used broadly, but mobile validation evidence is weaker than desktop.

Top 3 strengths

1. Mobile-first grids and breakpoint usage appear across pages and cards (for example [src/webapp/ui/src/pages/dashboard/dashboard-page.tsx](src/webapp/ui/src/pages/dashboard/dashboard-page.tsx#L232)).
2. Sidebar adapts with hidden/collapsed behavior in [src/webapp/ui/src/components/layout/sidebar-nav.tsx](src/webapp/ui/src/components/layout/sidebar-nav.tsx#L31).
3. Shell and content surfaces use flex/grid layouts instead of absolute positioning hacks in [src/webapp/ui/src/components/layout/app-shell.tsx](src/webapp/ui/src/components/layout/app-shell.tsx#L1).

Top 3 weaknesses

1. E2E viewport coverage is desktop-focused in [playwright.config.ts](playwright.config.ts#L1), with no explicit small-screen project.
2. Some complex pages (pipeline/session/approvals) are dense and may degrade usability on narrow viewports.
3. No explicit minimum supported viewport policy is documented in frontend docs.

Top 3 actionable improvements

1. Add mobile/tablet Playwright projects with snapshot and interaction coverage.
2. Introduce compact-mode variants for dense operational cards/tables on <=768px.
3. Publish supported viewport matrix and responsive acceptance criteria.

## C3. Accessibility

Score: 8/10 — Accessibility work is materially implemented with automated e2e checks, keyboard tests, landmarks, and focus handling.

Top 3 strengths

1. Dedicated WCAG e2e suite with axe-core in [tests/e2e/s9h-accessibility.spec.ts](tests/e2e/s9h-accessibility.spec.ts#L1).
2. Live-region and alert semantics in UI components such as [src/webapp/ui/src/components/ui/alert-banner.tsx](src/webapp/ui/src/components/ui/alert-banner.tsx) and field error alerts in [src/webapp/ui/src/components/ui/input-field.tsx](src/webapp/ui/src/components/ui/input-field.tsx#L66).
3. Keyboard/focus handling is explicitly implemented in nav and controls, for example [src/webapp/ui/src/components/ui/side-panel.tsx](src/webapp/ui/src/components/ui/side-panel.tsx#L166).

Top 3 weaknesses

1. Storybook a11y config disables contrast rule, reducing early detection quality in component dev.
2. Skip-link pattern is not evident in shell navigation for direct main-content jump.
3. Accessibility coverage is strong for core pages but not all edge interaction states are represented in e2e.

Top 3 actionable improvements

1. Add skip-link and test it in e2e keyboard flow.
2. Restore contrast checks in Storybook and fix remaining token/component contrast debt.
3. Expand accessibility test matrix for modals, drawers, and long-table navigation states.

## C4. Micro-interactions & Feedback

Score: 8/10 — Feedback states are deliberate and mostly consistent, with loading/error/success pathways and motion controls.

Top 3 strengths

1. Reusable loading/error/no-access shell behavior in [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1).
2. SSE-driven connection and runtime feedback via top nav badges and toasts in [src/webapp/ui/src/components/ui/top-navigation.tsx](src/webapp/ui/src/components/ui/top-navigation.tsx#L58) and [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L92).
3. Motion tokens and reduced-motion support in [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L296).

Top 3 weaknesses

1. Some micro-feedback patterns are page-specific and not fully standardized across all modules.
2. Optimistic UI updates are limited; many flows rely on polling/refetch confirmation.
3. Long-running task perceived performance still depends on manual page-level messaging quality.

Top 3 actionable improvements

1. Standardize async UX pattern kit (pending/success/failure/retry) for all data mutations.
2. Add optimistic update patterns where safe (queue actions, local annotations).
3. Add user-visible reconnect/backoff status component for SSE disruptions.
