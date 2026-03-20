# GitHub-Ready Backlog (UI Redesign)

## Backlog Items

### UI-008 — Feature Flags and Route-Safe Coexistence

- Summary: Add feature flags to swap legacy vs redesign routes without path changes. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Problem: Big-bang swaps risk breaking existing user flows. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Target Outcome: Safe route coexistence strategy. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Scope: Routing layer and layout toggles. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Acceptance Criteria: Feature flag toggles page variants at route level. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Dependencies: None.
- Risks: Incomplete parity could confuse users. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Suggested Labels: migration, feature-flags
- Suggested Priority: P0
- Suggested Phase/Sprint: Phase 1 / Sprint 1

### UI-007 — Navigation Model Migration

- Summary: Align navigation labels and domain ordering to the proposal’s 10-domain IA. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Problem: Current route registry groups by Runtime/Operations/Data/Observability. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Target Outcome: New navigation mapping with route-safe coexistence. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Scope: Update route registry, sidebar sections, breadcrumbs, and labels. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L86)
- Acceptance Criteria: Sidebar reflects 10 domains without breaking existing routes. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L32-L105)
- Dependencies: UI-008
- Risks: Breaking deep links and navigation expectations. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Suggested Labels: navigation, migration
- Suggested Priority: P0
- Suggested Phase/Sprint: Phase 1 / Sprint 1

### UI-006 — App Shell Primitive Extraction

- Summary: Extract AppShell, SidebarNav, PageHeader, Breadcrumb, ContextStrip primitives from AppLayout. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Problem: AppLayout currently bundles navigation and content but lacks reusable primitives. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Target Outcome: Reusable shell primitives matching proposal. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
- Scope: Component extraction + Storybook stories. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Acceptance Criteria: App shell components documented in Storybook with variants. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L153-L239)
- Dependencies: UI-008
- Risks: Shell refactor could impact navigation and SSE hookup. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L104-L126)
- Suggested Labels: design-system, navigation
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 2 / Sprint 2

### UI-024 — RBAC/Permission Guarding

- Summary: Add role-aware guards and no-access states for admin, approvals, and governance routes. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Problem: Current auth hook is present but no centralized guard for role gating. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Target Outcome: Shared permission guard utilities used across sensitive routes. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Scope: Guard utilities, routing integration, and consistent no-access UI. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
- Acceptance Criteria: Admin/approval routes show guard behavior without crashes. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)
- Dependencies: UI-008
- Risks: Missing guards create policy and compliance gaps. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Suggested Labels: rbac, security
- Suggested Priority: P0
- Suggested Phase/Sprint: Phase 1 / Sprint 1

### UI-017 — Route-Safe Adapter Layer

- Summary: Build adapters/shims to map legacy data models to new components. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Problem: Redesign components will expect richer data than current API types. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Target Outcome: Adapter functions that preserve old contracts. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Scope: Adapter functions and tests. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Acceptance Criteria: New components can render with existing API responses. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Dependencies: UI-006
- Risks: Adapter drift if backend changes. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Suggested Labels: adapters, migration
- Suggested Priority: P0
- Suggested Phase/Sprint: Phase 1 / Sprint 2

### UI-003 — Semantic Token System Alignment

- Summary: Extend tokens to meet semantic color, typography, spacing, and motion requirements. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L79-L149)
- Problem: Current tokens do not fully encode semantic status/risk requirements from the backlog. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)
- Target Outcome: Tokens cover semantic status/risk variants and typography roles. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L86-L149)
- Scope: Tokens, CSS variables, Storybook token stories. [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)
- Acceptance Criteria: Token story shows semantic usage and contrast requirements. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L86-L104)
- Dependencies: UI-008
- Risks: Token change impacts all pages; require visual regression plan. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182)
- Suggested Labels: design-system, tokens
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 2 / Sprint 2

### UI-004 — Tailwind Foundation Alignment

- Summary: Align Tailwind usage with semantic tokens and add missing motion utilities. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L145-L173)
- Problem: Current Tailwind config uses tokens but lacks formal motion token alignment. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L145-L173)
- Target Outcome: Tailwind utilities reflect tokenized motion/spacing rules. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L137-L149)
- Scope: Tailwind + CSS tokens; no route changes. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L1-L182)
- Acceptance Criteria: Motion tokens and spacing utilities documented in Storybook. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L137-L149)
- Dependencies: UI-003
- Risks: Changes could alter visual density and layout. [src/webapp/ui/src/index.css](src/webapp/ui/src/index.css#L92-L139)
- Suggested Labels: design-system, tailwind
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 2 / Sprint 2

### UI-005 — Storybook Structure and Governance

- Summary: Enforce Storybook-first documentation and story coverage rules. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Problem: Storybook exists but lacks backlog-driven coverage requirements. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)
- Target Outcome: Story templates with states, variants, and usage guidance. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Scope: Story templates, documentation standards, a11y checks. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L1-L26)
- Acceptance Criteria: New primitives ship with complete Storybook docs. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Dependencies: UI-003
- Risks: Incomplete stories lead to inconsistent UI adoption. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Suggested Labels: storybook, design-system
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 2 / Sprint 2

### UI-009 — PageHeader + ContextStrip Primitives

- Summary: Implement PageHeader and ContextStrip as reusable primitives. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L195-L239)
- Problem: Current pages use ad-hoc headers without consistent context strips. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L78-L156)
- Target Outcome: Consistent page header + context strip across domains. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L109-L148)
- Scope: New primitives + Storybook stories. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L195-L239)
- Acceptance Criteria: At least Overview and Runs pages use new header/strip. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L72-L90), [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)
- Dependencies: UI-006
- Risks: Requires consistent data for context strip. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)
- Suggested Labels: design-system, layout
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 2 / Sprint 3

### UI-010 — Operational Cards and Queue/Triage Lists

- Summary: Build operational card and queue list components. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
- Problem: Proposal expects triage and operational cards; current UI is card-heavy but not standardized. [src/webapp/ui/src/components/ui/metric-card.tsx](src/webapp/ui/src/components/ui/metric-card.tsx#L1-L120)
- Target Outcome: Standard components for approvals, runs, policies. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L150-L168)
- Scope: New components + Storybook stories. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
- Acceptance Criteria: Storybook includes queue list and operational card variants. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L61-L75)
- Dependencies: UI-003, UI-005
- Risks: Without a common card pattern, pages diverge. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L150-L168)
- Suggested Labels: design-system, components
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 3 / Sprint 3

### UI-018 — Empty/Loading/Error/No-Access States

- Summary: Standardize empty, loading, error, and no-access states across domains. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
- Problem: Proposal expects consistent operational clarity, but state handling is uneven. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L312-L368)
- Target Outcome: Shared state patterns with guidance messages. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
- Scope: PageShell enhancements and Storybook stories. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
- Acceptance Criteria: All redesigned pages use the standardized state patterns. [src/webapp/ui/src/components/ui/page-shell.tsx](src/webapp/ui/src/components/ui/page-shell.tsx#L1-L76)
- Dependencies: UI-009
- Risks: Inconsistent messaging can undermine governance clarity. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L312-L368)
- Suggested Labels: ux, states
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 3 / Sprint 3

### UI-011 — Approval Center Page (Dedicated)

- Summary: Create a dedicated Approval Center page aligned with proposal. [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)
- Problem: Approvals are split between Governance and Cockpit. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32), [src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx](src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx#L1-L33)
- Target Outcome: Single approval queue + decision context panel. [ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx](ui-proposal/agentic_sdlc_page_04_approval_center_mockup.jsx#L1)
- Scope: New route, new layout, reuse approval data hooks. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)
- Acceptance Criteria: Approval list and decision panel in one page, no regressions in approval actions. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)
- Dependencies: UI-010, UI-007
- Risks: Approval workflows are sensitive to RBAC and audit side effects. [src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx](src/webapp/ui/src/pages/governance/governance-dashboard-page.tsx#L1-L32)
- Suggested Labels: approvals, redesign
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-025 — Audit/Evidence Data Aggregation

- Summary: Define data aggregation strategy for evidence timeline and cross-domain audit packs. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Problem: Evidence is split across artifacts and traceability with no unified contract. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)
- Target Outcome: Defined API contract or client-side aggregation plan for unified audit timeline. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Scope: Data contract definition, adapter shape, and sample payloads. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Acceptance Criteria: Audit explorer can render with defined data shape. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Dependencies: UI-017
- Risks: Without aggregation, audit explorer remains mock-only. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Suggested Labels: data, audit
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 3 / Sprint 3

### UI-012 — Audit & Evidence Unification

- Summary: Combine artifacts and traceability into an audit/evidence explorer. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Problem: Evidence is split between artifact registry and traceability explorer. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20), [src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx](src/webapp/ui/src/pages/traceability/traceability-explorer-page.tsx#L1-L20)
- Target Outcome: Unified audit timeline with evidence packs. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Scope: New composite page with shared audit components. [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx#L1-L20)
- Acceptance Criteria: Evidence view links artifacts, traceability, and approvals. [ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx](ui-proposal/agentic_sdlc_page_08_audit_trail_evidence_explorer_mockup.jsx#L1)
- Dependencies: UI-025, UI-010
- Risks: Requires new backend aggregation endpoints. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Suggested Labels: audit, evidence
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-026 — Observability Telemetry Data Contracts

- Summary: Define alert/telemetry data contracts for the observability console. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Problem: Current observability page lacks alert/stream data sources. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)
- Target Outcome: Defined contract for alert queues and telemetry streams. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Scope: Contract definition, adapter mapping, sample payloads. [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts#L1-L120)
- Acceptance Criteria: Observability console can render alerts/streams from defined data shape. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Dependencies: UI-017
- Risks: Console panels remain placeholders without defined data. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Suggested Labels: data, observability
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 3 / Sprint 3

### UI-013 — Observability Console Expansion

- Summary: Expand Observability to include alert triage and telemetry streams. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Problem: Current observability uses light tabs without console-level telemetry. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)
- Target Outcome: Observability console with alerts, streams, and correlation panels. [ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx](ui-proposal/agentic_sdlc_page_09_observability_telemetry_center_mockup.jsx#L1)
- Scope: New composites built on metrics/analytics/traceability data. [src/webapp/ui/src/pages/metrics/metrics-page.tsx](src/webapp/ui/src/pages/metrics/metrics-page.tsx#L1-L24), [src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx](src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx#L1-L17)
- Acceptance Criteria: Alert panels and telemetry streams added without breaking existing tabs. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)
- Dependencies: UI-026, UI-010
- Risks: Requires new alerting data sources. [src/webapp/ui/src/lib/api-client.ts](src/webapp/ui/src/lib/api-client.ts#L1-L83)
- Suggested Labels: observability, redesign
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-014 — Workspaces Domain (New)

- Summary: Introduce Workspaces domain with routes, navigation, and data contracts. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)
- Problem: No workspace routes exist in current nav registry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Target Outcome: Workspace overview, tabs, and metadata panels. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)
- Scope: New routes + data hooks. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Acceptance Criteria: Workspace list/detail surfaces with nav integration. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L40-L85)
- Dependencies: Backend workspace APIs (unknown).
- Risks: Missing RBAC data. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)
- Suggested Labels: workspaces, new-domain
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 5 / Sprint 5

### UI-015 — Prompts & Contracts Domain (New)

- Summary: Build prompt and contract management domain. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Problem: No UI for prompt/contract assets in current routes. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Target Outcome: Asset registry, validation, and change requests views. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Scope: New routes and data hooks. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Acceptance Criteria: All prompt/contract assets are reviewable with governance status. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Dependencies: Backend prompt/contract APIs (unknown).
- Risks: Requires governance workflow alignment. [ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx](ui-proposal/agentic_sdlc_page_07_prompt_contract_management_mockup.jsx#L1)
- Suggested Labels: prompts, contracts, new-domain
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 5 / Sprint 5

### UI-016 — Administration/RBAC/Integrations Domain (New)

- Summary: Build admin console for roles, permissions, integrations. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)
- Problem: No admin route exists in current nav registry. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L13-L58)
- Target Outcome: Admin views for RBAC, integrations, access reviews. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)
- Scope: New routes, permission-aware guards, and data hooks. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Acceptance Criteria: Admin UI respects auth state and is gated by roles. [ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx](ui-proposal/agentic_sdlc_page_10_administration_rbac_integrations_mockup.jsx#L1)
- Dependencies: UI-024, RBAC data contracts (unknown).
- Risks: Security and privacy risks if role checks are incomplete. [src/webapp/ui/src/hooks/use-auth.ts](src/webapp/ui/src/hooks/use-auth.ts#L1-L57)
- Suggested Labels: admin, rbac, new-domain
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 5 / Sprint 5

### UI-019 — Query/Mutation Parity Validation

- Summary: Validate that redesigned pages preserve existing query/mutation semantics. [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L1-L50)
- Problem: New UI could alter cache invalidation or retry behavior. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
- Target Outcome: Parity tests for data hooks and cache invalidation. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
- Scope: Test harnesses for key hooks. [src/webapp/ui/src/lib/query-provider.tsx](src/webapp/ui/src/lib/query-provider.tsx#L1-L50)
- Acceptance Criteria: Parity tests pass before feature-flag swap. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
- Dependencies: UI-008
- Risks: SSE invalidation regressions break real-time UI. [src/webapp/ui/src/hooks/use-sse-events.ts](src/webapp/ui/src/hooks/use-sse-events.ts#L1-L120)
- Suggested Labels: testing, data
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-020 — Accessibility Hardening

- Summary: Enforce a11y coverage for new components and domains. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L16-L23)
- Problem: Proposal requires high-trust enterprise UX; a11y gaps reduce trust. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L175-L233)
- Target Outcome: a11y checks integrated into Storybook and key pages. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L16-L23)
- Scope: Storybook a11y rules, component fixes, accessibility checklist. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L16-L23)
- Acceptance Criteria: a11y violations addressed for core components. [src/webapp/ui/.storybook/preview.ts](src/webapp/ui/.storybook/preview.ts#L16-L23)
- Dependencies: UI-005
- Risks: Accessibility regressions harm usability for enterprise operators. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L175-L233)
- Suggested Labels: accessibility, quality
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-021 — Regression Test Harness Updates

- Summary: Add characterization tests for key pages before UI swaps. [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx#L1-L31)
- Problem: Without baseline tests, redesign can regress functional flows. [src/webapp/ui/src/pages/overview/overview-page.tsx](src/webapp/ui/src/pages/overview/overview-page.tsx#L1-L90)
- Target Outcome: Snapshot/interaction tests for sessions, approvals, observability. [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx#L1-L35)
- Scope: Tests and fixtures; no UI changes. [src/webapp/ui/src/components/ui/data-table.test.tsx](src/webapp/ui/src/components/ui/data-table.test.tsx#L1-L80)
- Acceptance Criteria: Tests fail on UI regressions and pass on parity. [src/webapp/ui/src/components/ui/data-table.test.tsx](src/webapp/ui/src/components/ui/data-table.test.tsx#L1-L80)
- Dependencies: UI-008
- Risks: Test gaps hide parity regressions. [src/webapp/ui/src/components/ui/data-table.test.tsx](src/webapp/ui/src/components/ui/data-table.test.tsx#L1-L80)
- Suggested Labels: testing, regression
- Suggested Priority: P1
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-022 — Visual Regression Feasibility Study

- Summary: Evaluate and enable visual regression for design-system components. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)
- Problem: Major visual redesign requires regression detection. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Target Outcome: Decide on Chromatic or Playwright snapshots. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)
- Scope: CI integration and baseline capture. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)
- Acceptance Criteria: Visual diffs surfaced for core primitives. [src/webapp/ui/.storybook/main.ts](src/webapp/ui/.storybook/main.ts#L1-L14)
- Dependencies: UI-005
- Risks: Visual regressions slip into production. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Suggested Labels: testing, storybook
- Suggested Priority: P3
- Suggested Phase/Sprint: Phase 4 / Sprint 4

### UI-001 — Current UI Inventory Baseline

- Summary: Capture the current UI architecture, routes, and design-system primitives as a baseline. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Problem: Migration planning requires an evidence-backed baseline. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Target Outcome: A documented inventory of routes, layout, state, data hooks, and primitives. [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Scope: Documentation only; no code changes. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75)
- Acceptance Criteria: Inventory includes routing map, layout components, data/state dependencies, and token system. [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86), [src/webapp/ui/src/tokens.css](src/webapp/ui/src/tokens.css#L1-L46)
- Dependencies: None.
- Risks: Missing a route or hook creates migration blind spots. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L28-L66)
- Suggested Labels: documentation, audit
- Suggested Priority: P3
- Suggested Phase/Sprint: Phase 0 / Sprint 0

### UI-002 — UI Proposal Inventory Baseline

- Summary: Catalog all ui-proposal artifacts and map them to domains. [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L1-L400)
- Problem: Redesign scope cannot be mapped without a complete inventory. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L1-L239)
- Target Outcome: Inventory table with file type, purpose, and mapped domain. [ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx](ui-proposal/agentic_sdlc_page_01_control_surface_mockup.jsx#L1)
- Scope: Documentation only; no code changes. [ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx](ui-proposal/agentic_sdlc_page_02_workspace_overview_mockup.jsx#L1)
- Acceptance Criteria: All 12 proposal files are cataloged with classification. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L1-L239)
- Dependencies: None.
- Risks: Missing artifacts will cause gaps in design system coverage. [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L18-L58)
- Suggested Labels: documentation, design
- Suggested Priority: P3
- Suggested Phase/Sprint: Phase 0 / Sprint 0

### UI-023 — Legacy Cleanup After Parity Proof

- Summary: Remove legacy pages after parity and feature-flag validation. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Problem: Dual implementations increase maintenance cost. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Target Outcome: Legacy routes removed after parity matrix sign-off. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Scope: Remove legacy components, update redirects. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Acceptance Criteria: No broken routes; redirects still functional as needed. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Dependencies: UI-021
- Risks: Removing legacy too early breaks workflows. [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L60-L64)
- Suggested Labels: cleanup, migration
- Suggested Priority: P2
- Suggested Phase/Sprint: Phase 6 / Sprint 6
