# Component Usage Index

This report maps each component file to at least one import in a page or Storybook story. Components with no match are marked UNREFERENCED.

## Usage Table

| Component                                             | File                                         | Evidence (page or story)                                          |
| ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| @/components/artifacts/dag-edge                       | artifacts/dag-edge.tsx                       | src/webapp/ui/src/pages/artifacts/lineage-page.tsx:15             |
| @/components/artifacts/dag-node                       | artifacts/dag-node.tsx                       | src/webapp/ui/src/pages/artifacts/lineage-page.tsx:14             |
| @/components/cockpit/approval-workflow                | cockpit/approval-workflow.tsx                | src/webapp/ui/src/pages/cockpit/approval-detail-page.tsx:10       |
| @/components/cockpit/confidence-indicators            | cockpit/confidence-indicators.tsx            | src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx:15     |
| @/components/cockpit/decision-provenance-view         | cockpit/decision-provenance-view.tsx         | src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx:17     |
| @/components/cockpit/dependency-graph                 | cockpit/dependency-graph.tsx                 | src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx:16     |
| @/components/cockpit/execution-timeline               | cockpit/execution-timeline.tsx               | src/webapp/ui/src/pages/sessions/session-detail-page.tsx:23       |
| @/components/cockpit/interactive-lineage-graph        | cockpit/interactive-lineage-graph.tsx        | src/webapp/ui/src/pages/artifacts/lineage-page.tsx:16             |
| @/components/cockpit/root-cause-view                  | cockpit/root-cause-view.tsx                  | src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx:18     |
| @/components/dashboard/health-card                    | dashboard/health-card.tsx                    | src/webapp/ui/src/pages/dashboard/dashboard-page.tsx:16           |
| @/components/dashboard/quick-links                    | dashboard/quick-links.tsx                    | src/webapp/ui/src/pages/dashboard/dashboard-page.tsx:17           |
| @/components/dashboard/recent-commands                | dashboard/recent-commands.tsx                | src/webapp/ui/src/pages/dashboard/dashboard-page.tsx:18           |
| @/components/dashboard/whats-next-guidance            | dashboard/whats-next-guidance.tsx            | src/webapp/ui/src/pages/overview/overview-page.tsx:22             |
| @/components/decisions/create-decision-dialog         | decisions/create-decision-dialog.tsx         | src/webapp/ui/src/pages/decisions/decisions-page.tsx:19           |
| @/components/decisions/lifecycle-flow                 | decisions/lifecycle-flow.tsx                 | src/webapp/ui/src/pages/decisions/columns.tsx:3                   |
| @/components/help-panel/help-panel                    | help-panel/help-panel.tsx                    | src/webapp/ui/src/components/help-panel/help-panel.stories.tsx:1  |
| @/components/layout/app-layout                        | layout/app-layout.tsx                        | src/webapp/ui/src/components/layout/app-layout.stories.tsx:1      |
| @/components/observability/agent-chart                | observability/agent-chart.tsx                | src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx:15    |
| @/components/observability/velocity-chart             | observability/velocity-chart.tsx             | src/webapp/ui/src/pages/analytics/analytics-trends-page.tsx:14    |
| @/components/onboarding/onboarding-diagnostics-wizard | onboarding/onboarding-diagnostics-wizard.tsx | src/webapp/ui/src/pages/overview/overview-page.tsx:25             |
| @/components/onboarding/welcome-wizard                | onboarding/welcome-wizard.tsx                | src/webapp/ui/src/pages/overview/overview-page.tsx:23             |
| @/components/runtime/agent-activity                   | runtime/agent-activity.tsx                   | src/webapp/ui/src/pages/overview/overview-page.tsx:20             |
| @/components/runtime/agent-card                       | runtime/agent-card.tsx                       | src/webapp/ui/src/components/runtime/agent-card.stories.tsx:1     |
| @/components/runtime/agent-execute-modal              | runtime/agent-execute-modal.tsx              | src/webapp/ui/src/pages/agents/agents-page.tsx:18                 |
| @/components/runtime/agent-list                       | runtime/agent-list.tsx                       | src/webapp/ui/src/components/runtime/agent-list.stories.tsx:1     |
| @/components/runtime/explainability-panel             | runtime/explainability-panel.tsx             | src/webapp/ui/src/pages/agents/agents-page.tsx:17                 |
| @/components/runtime/flow-step                        | runtime/flow-step.tsx                        | src/webapp/ui/src/components/runtime/flow-step.stories.tsx:1      |
| @/components/runtime/flow-timeline                    | runtime/flow-timeline.tsx                    | src/webapp/ui/src/pages/overview/overview-page.tsx:19             |
| @/components/runtime/gate-indicator                   | runtime/gate-indicator.tsx                   | src/webapp/ui/src/components/runtime/gate-indicator.stories.tsx:1 |
| @/components/runtime/gate-status                      | runtime/gate-status.tsx                      | src/webapp/ui/src/components/runtime/gate-status.stories.tsx:1    |
| @/components/runtime/live-status-hero                 | runtime/live-status-hero.tsx                 | src/webapp/ui/src/pages/dashboard/dashboard-page.tsx:15           |
| @/components/runtime/phase-card                       | runtime/phase-card.tsx                       | src/webapp/ui/src/components/runtime/phase-card.stories.tsx:1     |
| @/components/runtime/runtime-event                    | runtime/runtime-event.tsx                    | src/webapp/ui/src/components/runtime/runtime-event.stories.tsx:1  |
| @/components/runtime/runtime-log                      | runtime/runtime-log.tsx                      | src/webapp/ui/src/pages/sessions/session-detail-page.tsx:21       |
| @/components/runtime/session-status                   | runtime/session-status.tsx                   | src/webapp/ui/src/pages/overview/overview-page.tsx:18             |
| @/components/ui/alert                                 | ui/alert.tsx                                 | src/webapp/ui/src/pages/agents/agents-page.tsx:11                 |
| @/components/ui/alert-banner                          | ui/alert-banner.tsx                          | src/webapp/ui/src/pages/agents/agents-page.tsx:11                 |
| @/components/ui/badge                                 | ui/badge.tsx                                 | src/webapp/ui/src/pages/agents/agents-page.tsx:8                  |
| @/components/ui/button                                | ui/button.tsx                                | src/webapp/ui/src/pages/agents/agents-page.tsx:12                 |
| @/components/ui/card                                  | ui/card.tsx                                  | src/webapp/ui/src/pages/agents/agents-page.tsx:7                  |
| @/components/ui/confirm-dialog                        | ui/confirm-dialog.tsx                        | src/webapp/ui/src/components/ui/confirm-dialog.stories.tsx:1      |
| @/components/ui/control-signal                        | ui/control-signal.tsx                        | src/webapp/ui/src/pages/agents/agents-page.tsx:16                 |
| @/components/ui/data-table                            | ui/data-table.tsx                            | src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx:9     |
| @/components/ui/dialog                                | ui/dialog.tsx                                | src/webapp/ui/src/components/ui/dialog.stories.tsx:1              |
| @/components/ui/empty-state                           | ui/empty-state.tsx                           | src/webapp/ui/src/pages/agents/agents-page.tsx:9                  |
| @/components/ui/form-row                              | ui/form-row.tsx                              | src/webapp/ui/src/components/ui/form-row.stories.tsx:1            |
| @/components/ui/input                                 | ui/input.tsx                                 | src/webapp/ui/src/pages/artifacts/lineage-page.tsx:9              |
| @/components/ui/input-field                           | ui/input-field.tsx                           | src/webapp/ui/src/pages/command-center/command-center-page.tsx:11 |
| @/components/ui/label                                 | ui/label.tsx                                 | src/webapp/ui/src/components/ui/label.stories.tsx:1               |
| @/components/ui/metric-card                           | ui/metric-card.tsx                           | src/webapp/ui/src/pages/agents/agents-page.tsx:13                 |
| @/components/ui/mini-bar                              | ui/mini-bar.tsx                              | src/webapp/ui/src/components/ui/mini-bar.stories.tsx:1            |
| @/components/ui/mission-control-hero                  | ui/mission-control-hero.tsx                  | src/webapp/ui/src/pages/agents/agents-page.tsx:14                 |
| @/components/ui/modal-dialog                          | ui/modal-dialog.tsx                          | src/webapp/ui/src/pages/decisions/decisions-page.tsx:14           |
| @/components/ui/page-shell                            | ui/page-shell.tsx                            | src/webapp/ui/src/components/ui/page-shell.stories.tsx:1          |
| @/components/ui/progress                              | ui/progress.tsx                              | src/webapp/ui/src/pages/metrics/metrics-page.tsx:15               |
| @/components/ui/sheet                                 | ui/sheet.tsx                                 | src/webapp/ui/src/components/ui/sheet.stories.tsx:1               |
| @/components/ui/side-panel                            | ui/side-panel.tsx                            | src/webapp/ui/src/pages/questionnaires/questionnaires-page.tsx:12 |
| @/components/ui/skeleton                              | ui/skeleton.tsx                              | src/webapp/ui/src/components/ui/skeleton.stories.tsx:1            |
| @/components/ui/sonner                                | ui/sonner.tsx                                | src/webapp/ui/src/components/ui/sonner.stories.tsx:1              |
| @/components/ui/spinner                               | ui/spinner.tsx                               | src/webapp/ui/src/pages/agents/agents-page.tsx:10                 |
| @/components/ui/status-dot                            | ui/status-dot.tsx                            | src/webapp/ui/src/components/ui/status-dot.stories.tsx:1          |
| @/components/ui/status-motif                          | ui/status-motif.tsx                          | src/webapp/ui/src/pages/agents/agents-page.tsx:15                 |
| @/components/ui/switch                                | ui/switch.tsx                                | src/webapp/ui/src/components/ui/switch.stories.tsx:1              |
| @/components/ui/switch-field                          | ui/switch-field.tsx                          | src/webapp/ui/src/components/ui/switch-field.stories.tsx:1        |
| @/components/ui/table                                 | ui/table.tsx                                 | src/webapp/ui/src/components/ui/table.stories.tsx:1               |
| @/components/ui/theme-provider                        | ui/theme-provider.tsx                        | src/webapp/ui/src/components/ui/theme-provider.stories.tsx:1      |
| @/components/ui/timeline-connector                    | ui/timeline-connector.tsx                    | src/webapp/ui/src/components/ui/timeline-connector.stories.tsx:1  |
| @/components/ui/toast-system                          | ui/toast-system.tsx                          | src/webapp/ui/src/components/ui/toast-system.stories.tsx:1        |
| @/components/ui/top-navigation                        | ui/top-navigation.tsx                        | src/webapp/ui/src/components/ui/top-navigation.stories.tsx:1      |
| @/components/ui/typography                            | ui/typography.tsx                            | src/webapp/ui/src/pages/agents/agents-page.tsx:6                  |
| @/components/ui/user-menu                             | ui/user-menu.tsx                             | src/webapp/ui/src/components/ui/user-menu.stories.tsx:1           |

## Unreferenced Components

None.
