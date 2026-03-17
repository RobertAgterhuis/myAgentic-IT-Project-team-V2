/**
 * App root — configures React Router with lazy-loaded pages.
 * Layout & SSE are handled inside AppLayout.
 */
import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';

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
const LineagePage = lazy(() => import('@/pages/artifacts/lineage-page'));
const ObservabilityPage = lazy(() => import('@/pages/observability/observability-page'));
const GovernanceDashboardPage = lazy(() => import('@/pages/governance/governance-dashboard-page'));
const CockpitDashboardPage = lazy(() => import('@/pages/cockpit/cockpit-dashboard-page'));
const ApprovalDetailPage = lazy(() => import('@/pages/cockpit/approval-detail-page'));

const router = createBrowserRouter([
  /* Login — outside the app shell (no sidebar/nav) */
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      /* Runtime */
      { index: true, element: <OverviewPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'sessions/:id', element: <SessionDetailPage /> },
      { path: 'pipeline', element: <PipelinePage /> },

      /* Operations */
      { path: 'commands', element: <CommandsPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'decisions', element: <DecisionsPage /> },

      /* Data */
      { path: 'artifacts', element: <ArtifactBrowserPage /> },
      { path: 'artifacts/lineage', element: <LineagePage /> },
      { path: 'questionnaires', element: <QuestionnairesPage /> },

      /* Observability */
      { path: 'observability', element: <ObservabilityPage /> },
      { path: 'governance', element: <GovernanceDashboardPage /> },

      /* Cockpit — M27 */
      { path: 'cockpit', element: <CockpitDashboardPage /> },
      { path: 'cockpit/approvals/:id', element: <ApprovalDetailPage /> },

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
