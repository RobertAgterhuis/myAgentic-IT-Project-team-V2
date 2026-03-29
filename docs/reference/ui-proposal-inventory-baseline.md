---
title: UI Proposal Inventory Baseline
parent: Reference
nav_order: 22
permalink: /ui-proposal-inventory-baseline/
description: Baseline inventory of current UI proposal-equivalent artifacts mapped by domain and purpose.
---

# UI Proposal Inventory Baseline

This inventory replaces the legacy `ui-proposal/*` references with current, repository-backed proposal-equivalent artifacts.

## Inventory Table

| #   | Artifact                                                       | Type            | Domain           | Purpose                                                                      |
| --- | -------------------------------------------------------------- | --------------- | ---------------- | ---------------------------------------------------------------------------- |
| 1   | `src/webapp/ui/src/components/layout/app-shell.tsx`            | Component       | Shell            | App shell primitive for top nav, sidebar, and workspace content framing.     |
| 2   | `src/webapp/ui/src/components/layout/sidebar-nav.tsx`          | Component       | Navigation       | Sidebar navigation primitive with domain sections and active-route behavior. |
| 3   | `src/webapp/ui/src/components/layout/page-header.tsx`          | Component       | Shell            | Shared page header contract for title, subtitle, and status chips.           |
| 4   | `src/webapp/ui/src/components/layout/breadcrumb-nav.tsx`       | Component       | Navigation       | Breadcrumb primitive for predictable route hierarchy context.                |
| 5   | `src/webapp/ui/src/components/layout/context-strip.tsx`        | Component       | UX telemetry     | Dense operational metrics strip used across pages.                           |
| 6   | `src/webapp/ui/src/components/layout/app-shell.stories.tsx`    | Storybook story | Design system    | Documents shell variants and rendering contract in Storybook.                |
| 7   | `src/webapp/ui/src/components/layout/sidebar-nav.stories.tsx`  | Storybook story | Design system    | Documents sidebar variants and states in Storybook.                          |
| 8   | `src/webapp/ui/src/components/layout/page-header.stories.tsx`  | Storybook story | Design system    | Documents page header variants and control-signal usage.                     |
| 9   | `src/webapp/ui/src/pages/dashboard/dashboard-page.tsx`         | Page            | Runtime overview | Canonical control-surface overview page for orchestration status.            |
| 10  | `src/webapp/ui/src/pages/workspaces/workspaces-page.tsx`       | Page            | Workspace        | Workspace/project inventory and ownership views.                             |
| 11  | `src/webapp/ui/src/pages/observability/observability-page.tsx` | Page            | Observability    | Alerts/streams/traceability observability console composition.               |
| 12  | `src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx`  | Page            | Audit & evidence | Unified artifact browser with evidence-aware drilldown and diff.             |

## Notes

- Scope remains documentation-only; no runtime behavior is changed by this artifact.
- This inventory provides file type, purpose, and mapped domain for all 12 baseline artifacts.
