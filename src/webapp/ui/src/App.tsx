/**
 * App root — configures React Router with lazy-loaded pages.
 * Layout & SSE are handled inside AppLayout.
 */
import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';
import { AccessGuard } from '@/components/ui/access-guard';
import { selectVariant } from '@/lib/feature-flags';

const LoginPage = lazy(() => import('@/pages/login/login-page'));
const OverviewPage = lazy(() => import('@/pages/overview/overview-page'));
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const CommandsPage = lazy(() => import('@/pages/commands/commands-page'));
const PipelinePage = lazy(() => import('@/pages/pipeline/pipeline-page'));
const SessionsPage = lazy(() => import('@/pages/sessions/sessions-page'));
const SessionDetailPage = lazy(() => import('@/pages/sessions/session-detail-page'));
const AgentsPage = lazy(() => import('@/pages/agents/agents-page'));
const QuestionnairesPage = lazy(() => import('@/pages/questionnaires/questionnaires-page'));
const DecisionsPage = lazy(() => import('@/pages/decisions/decisions-page'));
const ArtifactBrowserPage = lazy(() => import('@/pages/artifacts/artifact-browser-page'));
const AuditEvidenceExplorerPage = lazy(() => import('@/pages/audit/audit-evidence-explorer-page'));
const LineagePage = lazy(() => import('@/pages/artifacts/lineage-page'));
const ObservabilityPage = lazy(() => import('@/pages/observability/observability-page'));
const GovernanceDashboardPage = lazy(() => import('@/pages/governance/governance-dashboard-page'));
const ApprovalCenterPage = lazy(() => import('@/pages/approvals/approval-center-page'));
const CockpitDashboardPage = lazy(() => import('@/pages/cockpit/cockpit-dashboard-page'));
const ExecutionHistoryPage = lazy(() => import('@/pages/agents/execution-history-page'));
const ApprovalDetailPage = lazy(() => import('@/pages/cockpit/approval-detail-page'));

const overviewElement = selectVariant('overview-redesign', <DashboardPage />, <OverviewPage />);
const runsElement = selectVariant('runs-redesign', <SessionsPage />, <SessionsPage />);
const agentsElement = selectVariant('agents-redesign', <AgentsPage />, <AgentsPage />);
const policiesElement = selectVariant('policies-redesign', <DecisionsPage />, <DecisionsPage />);
const approvalsElement = selectVariant(
  'approvals-redesign',
  <ApprovalCenterPage />,
  <GovernanceDashboardPage />
);
const observabilityElement = selectVariant(
  'observability-redesign',
  <ObservabilityPage />,
  <ObservabilityPage />
);
const auditElement = selectVariant(
  'audit-redesign',
  <AuditEvidenceExplorerPage />,
  <ArtifactBrowserPage />
);

const router = createBrowserRouter([
  /* Login — outside the app shell (no sidebar/nav) */
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      /* Runtime */
      { index: true, element: overviewElement },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'sessions', element: runsElement },
      { path: 'sessions/:id', element: <SessionDetailPage /> },
      { path: 'pipeline', element: <PipelinePage /> },

      /* Operations */
      { path: 'commands', element: <CommandsPage /> },
      { path: 'agents', element: agentsElement },
      { path: 'agents/executions', element: <ExecutionHistoryPage /> },
      {
        path: 'decisions',
        element: <AccessGuard requiredRole="operator">{policiesElement}</AccessGuard>,
      },

      /* Data */
      { path: 'artifacts', element: auditElement },
      { path: 'artifacts/lineage', element: <LineagePage /> },
      { path: 'audit', element: <AuditEvidenceExplorerPage /> },
      { path: 'questionnaires', element: <QuestionnairesPage /> },

      /* Observability */
      { path: 'observability', element: observabilityElement },
      {
        path: 'governance',
        element: <AccessGuard requiredRole="operator">{approvalsElement}</AccessGuard>,
      },
      {
        path: 'approvals',
        element: (
          <AccessGuard requiredRole="operator">
            <ApprovalCenterPage />
          </AccessGuard>
        ),
      },

      /* Cockpit — M27 */
      { path: 'cockpit', element: <CockpitDashboardPage /> },
      {
        path: 'cockpit/approvals/:id',
        element: (
          <AccessGuard requiredRole="operator">
            <ApprovalDetailPage />
          </AccessGuard>
        ),
      },

      /* Redirects for renamed/merged routes */
      { path: 'command-center', element: <Navigate to="/commands" replace /> },
      { path: 'metrics', element: <Navigate to="/observability" replace /> },
      { path: 'analytics', element: <Navigate to="/observability" replace /> },
      { path: 'traceability', element: <Navigate to="/observability" replace /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
