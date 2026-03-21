# Migration Plan

## Phased Migration Strategy

1. **Route-safe foundation**: add feature flags, expand navigation registry, introduce RBAC guards, and build adapter layer for legacy data. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57), [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
2. **Design-system baseline**: formalize semantic tokens, Tailwind alignment, and Storybook governance. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46), [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L149)
3. **Shell primitives**: extract AppShell, SidebarNav, PageHeader, Breadcrumb, ContextStrip, then wire them into at least one live route. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
4. **Shared composites + state patterns**: operational cards, queue lists, and standardized empty/loading/no-access states (Storybook-first). [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
5. **Existing-domain upgrades + data contracts**: update Overview, Runs, Approvals, Policies, Agents, Observability, Audit/Evidence while defining audit/telemetry aggregation contracts. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L58), [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
6. **Missing domains**: add Workspaces, Prompts & Contracts, Administration routes once backend contracts and RBAC are defined. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
7. **Parity validation and decommission**: run characterization tests, then remove legacy views after parity proof. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)

## Phase Mapping (Backlog Alignment)

| Phase   | Primary Backlog Items                                  |
| ------- | ------------------------------------------------------ |
| Phase 1 | UI-008, UI-007, UI-024, UI-017                         |
| Phase 2 | UI-003, UI-004, UI-005, UI-006, UI-009                 |
| Phase 3 | UI-010, UI-018, UI-025, UI-026                         |
| Phase 4 | UI-011, UI-012, UI-013, UI-019, UI-020, UI-021, UI-022 |
| Phase 5 | UI-014, UI-015, UI-016                                 |
| Phase 6 | UI-023                                                 |

## Phase 2 Closure Snapshot (2026-03-21)

- UI-003 complete: semantic tokens are documented in Storybook with status/risk, typography, spacing, motion, and explicit contrast requirements. [src/webapp/ui/src/foundations/semantic-tokens.stories.tsx](src/webapp/ui/src/foundations/semantic-tokens.stories.tsx#L1-L170)
- UI-004 complete: token-backed spacing and motion utilities are implemented in shared styles. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L26-L291)
- UI-005 complete: Storybook governance docs, template, addon config, and enforcement test are present and passing. [src/webapp/ui/src/foundations/storybook-governance.mdx](src/webapp/ui/src/foundations/storybook-governance.mdx#L1-L36), [src/webapp/ui/src/foundations/storybook-page-template.mdx](src/webapp/ui/src/foundations/storybook-page-template.mdx#L1-L69), [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L13), [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L30), [src/webapp/ui/src/foundations/storybook-governance.test.ts](src/webapp/ui/src/foundations/storybook-governance.test.ts#L1-L48)
- UI-006 complete: app shell primitives extracted and documented in Storybook. [src/webapp/ui/src/components/layout](src/webapp/ui/src/components/layout)
- UI-009 complete: PageHeader and ContextStrip are now applied across the migrated application pages, including traceability explorer. [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L380)

## Shell-First vs Page-First

- **Shell-first is recommended** because AppLayout already centralizes navigation, breadcrumbs, and SSE hooks; re-skinning it reduces risk across all pages. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Route-Safe Migration Strategy

- Preserve all current paths and redirects to avoid breaking deep links. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Introduce redesigned pages behind feature flags or parallel paths, then swap routing targets when parity is achieved. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)

## App Router / Pages Router Implications

- Current routing is React Router; any Next.js migration requires a dedicated router migration plan separate from the UI redesign. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)

## RSC vs Client Component Implications

- UI relies on client-only SSE and runtime event buffers; preserve client runtime boundaries until a server-rendering plan is explicitly scoped. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [src/webapp/ui/src/stores/runtime-store.ts](src/webapp/ui/src/stores/runtime-store.ts#L1-L44)

## Feature Flag Strategy

- Use flags to toggle between legacy and redesigned components at the route level without changing URL structure. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)

## Storybook-First Design-System Rollout

- Treat Storybook as the primary contract for primitives and composites before wiring into routes. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)

## Testing and Parity Validation Strategy

- Add characterization tests for session detail, approvals, and observability views before swapping UI. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31), [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)

## Rollback Strategy

- Keep legacy routes and redirects in place until parity tests pass and feature flags prove stable. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)

## Decommission Strategy

- Remove legacy components only after feature flags and parity tests confirm equivalence for each domain. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)

## Definition of Done per Phase

- **Phase 1**: feature flags, navigation registry, RBAC guard utilities, and adapter layer available for route-safe swaps. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57), [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- **Phase 2**: tokens and typography documented in Storybook, Tailwind alignment completed, and shell primitives used in at least one live route. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46), [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
- **Phase 3**: operational cards, queue lists, and shared state patterns implemented; audit/telemetry contracts defined. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- **Phase 4**: existing domains migrated with parity tests passing. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- **Phase 5**: missing domains implemented after backend contracts are ready. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- **Phase 6**: legacy routes removed after parity proof. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
