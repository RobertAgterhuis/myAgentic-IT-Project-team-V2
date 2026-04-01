# UX Audit Master Traceability Map

> Issue #1565 — tracks all UX audit milestones, EPICs, issues, and PRs.

## Overview

The UX audit was conducted across six milestones, each targeting a specific quality dimension. Every milestone follows the pattern: EPIC → sub-issues → feature branch → PR → squash merge to `main`.

## Milestone 1: UX Day-1 Blockers

| Item           | Reference                               |
| -------------- | --------------------------------------- |
| **EPIC**       | #1535 — UX-E3: Day-1 Usability Blockers |
| **Branch**     | `feature/ux-audit-day1-blockers`        |
| **PR**         | #1571                                   |
| **Sub-issues** | #1536, #1537, #1538, #1539, #1540       |
| **Status**     | Merged                                  |

## Milestone 2: UX Core Workflow Polish

| Item           | Reference                                       |
| -------------- | ----------------------------------------------- |
| **EPIC**       | #1541 — UX-E4: Core Workflow Polish             |
| **Branch**     | `feature/ux-audit-core-workflow-polish`         |
| **PR**         | #1572                                           |
| **Sub-issues** | #1542, #1543, #1544, #1545, #1546, #1547, #1548 |
| **Status**     | Merged                                          |

## Milestone 3: UX Agent Interaction & Transparency

| Item           | Reference                                         |
| -------------- | ------------------------------------------------- |
| **EPIC**       | #1549 — UX-E5: Agent Interaction & Transparency   |
| **Branch**     | `feature/ux-audit-agent-interaction-transparency` |
| **PR**         | #1573                                             |
| **Sub-issues** | #1550, #1551, #1552, #1553                        |
| **Status**     | Merged (commit `a93b4a6`)                         |

## Milestone 4: UX Visual Design & Consistency

| Item           | Reference                                    |
| -------------- | -------------------------------------------- |
| **EPIC**       | #1554 — UX-E6: Visual Design & Consistency   |
| **Branch**     | `feature/ux-audit-visual-design-consistency` |
| **PR**         | #1574                                        |
| **Sub-issues** | #1555, #1556                                 |
| **Status**     | Merged (commit `182894a`)                    |

## Milestone 5: UX Accessibility & Inclusivity

| Item           | Reference                                    |
| -------------- | -------------------------------------------- |
| **EPIC**       | #1557 — UX-E7: Accessibility & Inclusivity   |
| **Branch**     | `feature/ux-audit-accessibility-inclusivity` |
| **PR**         | #1575                                        |
| **Sub-issues** | #1558, #1566, #1567                          |
| **Status**     | Merged (commit `09b69f5`)                    |

## Milestone 6: UX Missing Essentials

| Item           | Reference                                   |
| -------------- | ------------------------------------------- |
| **EPIC**       | #1561 — UX-E8: Product Readiness Essentials |
| **Branch**     | `feature/ux-audit-missing-essentials`       |
| **PR**         | TBD                                         |
| **Sub-issues** | #1565, #1568, #1569, #1570                  |
| **Status**     | In progress                                 |

### Sub-issue Details (Milestone 6)

| Issue | Title                                                               | Priority | Status      |
| ----- | ------------------------------------------------------------------- | -------- | ----------- |
| #1570 | Setup wizard with skip/resume for GitHub and Entra                  | critical | Implemented |
| #1568 | Persistent notification center for approvals, failures, escalations | high     | Implemented |
| #1569 | User preferences surface beyond theme toggle                        | medium   | Implemented |
| #1565 | UX Audit Master Traceability Map (this document)                    | high     | Implemented |

## Audit Source

All milestones originate from the UX audit verdict documents in `verdict/`:

- `verdict/01-gulli-pattern-audit.md` and subsequent findings
- Issues were created from audit findings and organized into EPICs by quality dimension

## File Impact Summary

### Milestone 6 files created/modified:

- `src/webapp/ui/src/components/onboarding/setup-wizard.tsx` (new)
- `src/webapp/ui/src/components/onboarding/use-setup-wizard.ts` (new)
- `src/webapp/ui/src/components/notifications/notification-center.tsx` (new)
- `src/webapp/ui/src/pages/preferences/preferences-page.tsx` (new)
- `src/webapp/ui/src/components/layout/app-layout.tsx` (modified)
- `src/webapp/ui/src/components/ui/top-navigation.tsx` (modified)
- `src/webapp/ui/src/components/ui/user-menu.tsx` (modified)
- `src/webapp/ui/src/stores/ui-store.ts` (modified)
- `src/webapp/ui/src/lib/routes.ts` (modified)
- `src/webapp/ui/src/App.tsx` (modified)
- `docs/ux/ux-audit-traceability-map.md` (this document)
