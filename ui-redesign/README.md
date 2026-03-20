# UI Redesign Migration Documentation

## Purpose

This folder captures the current UI inventory, the ui-proposal inventory, and a non-breaking migration plan that maps the proposed redesign to the existing React UI without assuming a greenfield rewrite. Source inputs include the current UI routes/layout and the ui-proposal redesign artifacts.

## Document List

- README.md
- synthesis.md
- migration-plan.md
- backlog-github.md
- current-ui-inventory.md
- ui-proposal-inventory.md
- proposal-to-current-mapping.md
- design-system-gap-analysis.md
- storybook-adoption-plan.md
- parity-matrix.md
- nextjs-routing-impact-analysis.md
- rsc-client-boundary-analysis.md
- domains/01-overview-impact.md
- domains/02-workspaces-impact.md
- domains/03-runs-impact.md
- domains/04-approvals-impact.md
- domains/05-policies-impact.md
- domains/06-agents-impact.md
- domains/07-prompts-contracts-impact.md
- domains/08-audit-evidence-impact.md
- domains/09-observability-impact.md
- domains/10-administration-impact.md

## Recommended Reading Order

1. current-ui-inventory.md
2. ui-proposal-inventory.md
3. proposal-to-current-mapping.md
4. design-system-gap-analysis.md
5. storybook-adoption-plan.md
6. nextjs-routing-impact-analysis.md
7. rsc-client-boundary-analysis.md
8. synthesis.md
9. migration-plan.md
10. backlog-github.md
11. domains/\*

## Source Baselines

- Current UI routes and layout: [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx#L1-L75), [src/webapp/ui/src/components/layout/app-layout.tsx](src/webapp/ui/src/components/layout/app-layout.tsx#L1-L168)
- Current UI navigation metadata: [src/webapp/ui/src/lib/routes.ts](src/webapp/ui/src/lib/routes.ts#L1-L86)
- Redesign IA and design-system direction: [ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md](ui-proposal/agentic_sdlc_navigation_design_system_and_user_journeys.md#L1-L400)
- Redesign Storybook backlog: [ui-proposal/agentic_sdlc_storybook_design_system_backlog.md](ui-proposal/agentic_sdlc_storybook_design_system_backlog.md#L1-L239)

## Evidence Tags

- Current code review findings are always sourced from src/webapp/ui or related files.
- Redesign requirements are always sourced from ui-proposal.
