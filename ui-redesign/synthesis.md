# UI Redesign Synthesis

## Executive Summary

- Current UI is a client-rendered React + Vite app with React Router and a shared AppLayout shell; redesign must be layered on top of this architecture or it becomes a platform migration. [src/webapp/ui/package.json](src/webapp/ui/package.json#L1-L63), [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- The redesign targets a 10-domain IA with explicit approvals, governance, audit, and admin surfaces that are only partially represented in the current route map. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105), [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- A non-breaking migration must preserve current data hooks, SSE-driven updates, and existing route paths while introducing new shells and design-system primitives first. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120), [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)

## Current UI Strengths Worth Preserving

- AppLayout already centralizes navigation, breadcrumbs, and real-time status, which aligns with the proposal’s requirement for persistent global navigation and breadcrumb context. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L64-L105)
- There is a functioning set of runtime/observability pages (Overview, Sessions, Observability) with data hooks and SSE integration that can be restyled rather than rewritten. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L1-L90), [src/webapp/ui/src/pages/sessions/sessions-page.tsx](src/webapp/ui/src/pages/sessions/sessions-page.tsx#L1-L18), [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35), [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
- The UI already has reusable primitives (MetricCard, DataTable, PageShell) and Storybook scaffolding. [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120), [src/webapp/ui/src/components/ui/data-table.tsx](src/webapp/ui/src/components/ui/data-table.tsx#L1-L200), [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76), [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)

## Current UI Weaknesses

- IA mismatch: current navigation groups routes by Runtime/Operations/Data/Observability rather than the 10-domain product IA. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Missing domains: Workspaces, Prompts & Contracts, and Administration routes are not present in current routing. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Design-system primitives expected by the proposal (PageHeader, ContextStrip, explicit AppShell primitives) are not formalized as dedicated components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)

## Redesign Goals Extracted from /ui-proposal

- Adopt a control-plane IA with 10 top-level domains and three navigation layers. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Standardize page shell grammar (header, context strip, panel types) and enforce operational clarity. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L109-L168)
- Deliver a Storybook-first design system with a defined backlog and sequencing of primitives to composites. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L239)

## Top Architectural Mismatches

- Current router is React Router with client-side routing, while the request assumes Next.js; this is a platform-level difference that must be treated as a separate migration track. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75), [src/webapp/ui/package.json](src/webapp/ui/package.json#L1-L63)
- Approval workflows are split between Governance and Cockpit; proposal expects a centralized Approval Center. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33), [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)
- Audit/evidence is split across artifacts and traceability; proposal expects a unified audit trail with evidence packs. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20), [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)

## Biggest Next.js/Tailwind/Storybook Implications

- Any Next.js migration is not incremental because current UI relies on Vite and React Router; must be planned as a router/platform track. [src/webapp/ui/package.json](src/webapp/ui/package.json#L1-L63), [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Tailwind tokens exist but need formal semantic token and motion systems per the backlog. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149)
- Storybook is configured, but backlog requires broader coverage and documentation discipline. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)

## Highest Migration Risks

- Route churn risk: replacing or renaming existing routes without preserving redirects will break deep links. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Data coupling risk: session detail views merge live SSE data with query results; refactors must preserve this behavior. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L24-L31), [src/webapp/ui/src/hooks/use-runtime-events.ts](src/webapp/ui/src/hooks/use-runtime-events.ts#L1-L76)
- Missing-domain risk: Workspaces, Prompts & Contracts, and Administration need new API contracts before UI work can be finished. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)

## Required Code Additions and Changes (Top Priority)

- Add a feature-flag system for route-safe coexistence so redesigned pages can ship without changing URLs. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Introduce explicit shell primitives (AppShell, PageHeader, ContextStrip, Breadcrumb component) to enforce the proposal’s layout grammar across routes. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
- Expand the navigation registry to represent the 10-domain IA while preserving existing route paths. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Add RBAC/permission-aware rendering guards for admin, approvals, and policy surfaces. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Implement data adapters to map current API types into the richer composites required by the proposal. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Define audit/evidence aggregation endpoints or client-side composition strategy before building the unified audit trail. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20), [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Define alert/telemetry data sources to power observability console panels (alerts, streams). [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35), [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Formalize Storybook coverage rules and ensure new primitives/composites are documented before page swaps. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)

## Foundational Code Additions Required Before Frontend Redesign

- Feature-flag infrastructure for route-level swaps and component toggles. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Shell primitives (AppShell, PageHeader, ContextStrip, Breadcrumb) extracted from AppLayout for consistent layout composition. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Navigation registry overhaul to represent proposal domains without breaking existing URLs. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Semantic token expansion (status/risk, typography roles, motion tokens). [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149)
- RBAC/permission-aware rendering utilities and guards. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Adapter layer for mapping current API types into domain composites. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)

## Domain-Specific Code Additions Required

- Workspaces: new routes, data hooks, and backend endpoints for workspace summaries, repos, runs, agents, policies. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Approvals: a dedicated Approval Center route using existing approval hooks and new queue/detail composites. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)
- Policies: separate policy center route and policy exception/evaluation UI components. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx](ui-proposal/agentic_sdlc_page_05_policy_governance_center_mockup.jsx#L1)
- Prompts & Contracts: new assets registry, validation views, and change-request workflows plus APIs. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58), [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Audit & Evidence: unified audit trail composition across artifacts and traceability. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)
- Observability: alert/telemetry panels, stream rows, and correlation views. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35), [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Administration: RBAC/integration views plus auth-guarded routes. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57), [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)

## Recommended Strategy

- Prioritize code-readiness additions (feature flags, navigation registry, shell primitives, adapters) before any page redesign. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Keep React Router and existing routes stable while introducing new design-system primitives and a redesigned shell. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Use Storybook-first delivery for tokens, navigation, and operational cards before domain pages. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L75)
- Introduce missing domains via parallel routes and feature flags to avoid breaking current flows. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)

## Preserve vs Refactor vs Replace vs Add vs Defer

| Category             | Preserve                                 | Refactor                                                      | Replace | Add                                                             | Defer                    |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- | ------- | --------------------------------------------------------------- | ------------------------ |
| App shell            | AppLayout structure and router wiring    | Extract shell primitives (PageHeader/ContextStrip/Breadcrumb) | N/A     | Feature flags, navigation registry update                       | N/A                      |
| Runtime flows        | Sessions list/detail and SSE integration | Storytelling layout and evidence panels                       | N/A     | Decision/evidence composites                                    | N/A                      |
| Governance/Approvals | Approval data hooks                      | Approval UI layout into a dedicated Approval Center           | N/A     | Approval queue composites                                       | N/A                      |
| Observability        | Metrics/analytics/traceability tabs      | Add telemetry center panels (alerts, streams)                 | N/A     | Alert/stream components                                         | N/A                      |
| Missing domains      | N/A                                      | N/A                                                           | N/A     | Workspaces, Prompts & Contracts, Administration routes and APIs | Defer until APIs defined |

## Recommended Sequence

1. Feature flags + navigation registry update + shell primitive extraction. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
2. Token expansion and Storybook coverage requirements. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46), [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L149)
3. Operational card and queue primitives. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
4. Domain upgrades on existing routes (Overview, Runs, Approvals, Policies, Agents, Observability, Audit/Evidence). [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L58)
5. Missing domains once APIs are defined (Workspaces, Prompts & Contracts, Administration). [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)

Evidence: AppLayout and routing. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168), [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)

## INSUFFICIENT_DATA

- INSUFFICIENT_DATA: Workspaces domain backend endpoints and data models are not visible in the UI codebase; required for domain delivery. QUESTIONNAIRE_REQUEST
- INSUFFICIENT_DATA: Prompt/contract management APIs and data contracts are not visible in the UI codebase. QUESTIONNAIRE_REQUEST
- INSUFFICIENT_DATA: Administration/RBAC/integrations APIs and permission model are not visible in the UI codebase. QUESTIONNAIRE_REQUEST

## HANDOFF CHECKLIST

- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated
- [x] All INSUFFICIENT_DATA: items are documented and escalated
- [x] Output complies with the contract in /templates/sdlc/contracts/
- [x] Guardrails from /templates/sdlc/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
