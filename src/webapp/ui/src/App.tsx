/**
 * App root — configures React Router with lazy-loaded pages.
 * Layout & SSE are handled inside AppLayout.
 */
import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';
import { AccessGuard } from '@/components/ui/access-guard';
import { EditorShellProvider } from '@/lib/editor/editor-shell';

const LoginPage = lazy(() => import('@/pages/login/login-page'));
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const CommandsPage = lazy(() => import('@/pages/commands/commands-page'));
const PipelinePage = lazy(() => import('@/pages/pipeline/pipeline-page'));
const WorkspacesPage = lazy(() => import('@/pages/workspaces/workspaces-page'));
const SessionsPage = lazy(() => import('@/pages/sessions/sessions-page'));
const SessionDetailPage = lazy(() => import('@/pages/sessions/session-detail-page'));
const AgentsPage = lazy(() => import('@/pages/agents/agents-page'));
const QuestionnairesPage = lazy(() => import('@/pages/questionnaires/questionnaires-page'));
const DecisionsPage = lazy(() => import('@/pages/decisions/decisions-page'));
const ArtifactBrowserPage = lazy(() => import('@/pages/artifacts/artifact-browser-page'));
const LineagePage = lazy(() => import('@/pages/artifacts/lineage-page'));
const ObservabilityPage = lazy(() => import('@/pages/observability/observability-page'));
const ApprovalCenterPage = lazy(() => import('@/pages/approvals/approval-center-page'));
const PromptsContractsPage = lazy(() => import('@/pages/prompts/prompts-contracts-page'));
const AdministrationPage = lazy(() => import('@/pages/administration/administration-page'));
const IdentityConsentPage = lazy(() => import('@/pages/identity/identity-consent-page'));
const McpMatrixPage = lazy(() => import('@/pages/mcp/mcp-matrix-page'));
const McpAgentViewPage = lazy(() => import('@/pages/mcp/mcp-agent-view-page'));
const McpOverridesPage = lazy(() => import('@/pages/mcp/mcp-overrides-page'));
const McpDiagnosticsPage = lazy(() => import('@/pages/mcp/mcp-diagnostics-page'));
const CockpitDashboardPage = lazy(() => import('@/pages/cockpit/cockpit-dashboard-page'));
const ExecutionHistoryPage = lazy(() => import('@/pages/agents/execution-history-page'));
const ApprovalDetailPage = lazy(() => import('@/pages/cockpit/approval-detail-page'));

const router = createBrowserRouter([
  /* Login — outside the app shell (no sidebar/nav) */
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      /* Runtime */
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'workspaces', element: <WorkspacesPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'sessions/:id', element: <SessionDetailPage /> },
      { path: 'pipeline', element: <PipelinePage /> },

      /* Operations */
      { path: 'commands', element: <CommandsPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'agents/executions', element: <ExecutionHistoryPage /> },
      {
        path: 'decisions',
        element: (
          <AccessGuard requiredRole="operator">
            <DecisionsPage />
          </AccessGuard>
        ),
      },

      /* Data */
      { path: 'artifacts', element: <ArtifactBrowserPage /> },
      { path: 'artifacts/lineage', element: <LineagePage /> },
      { path: 'questionnaires', element: <QuestionnairesPage /> },
      { path: 'prompts-contracts', element: <PromptsContractsPage /> },

      /* Observability */
      { path: 'observability', element: <ObservabilityPage /> },
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
        path: 'administration',
        element: (
          <AccessGuard requiredRole="admin">
            <AdministrationPage />
          </AccessGuard>
        ),
      },
      {
        path: 'admin/identity/consent',
        element: (
          <AccessGuard requiredRole="admin">
            <IdentityConsentPage />
          </AccessGuard>
        ),
      },
      {
        path: 'administration/identity/consent',
        element: <Navigate to="/admin/identity/consent" replace />,
      },
      {
        path: 'admin/mcp/matrix',
        element: (
          <AccessGuard requiredRole="admin">
            <McpMatrixPage />
          </AccessGuard>
        ),
      },
      {
        path: 'admin/mcp/agents/:agentId',
        element: (
          <AccessGuard requiredRole="admin">
            <McpAgentViewPage />
          </AccessGuard>
        ),
      },
      {
        path: 'admin/mcp/overrides',
        element: (
          <AccessGuard requiredRole="admin">
            <McpOverridesPage />
          </AccessGuard>
        ),
      },
      {
        path: 'admin/mcp/diagnostics',
        element: (
          <AccessGuard requiredRole="admin">
            <McpDiagnosticsPage />
          </AccessGuard>
        ),
      },
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
      { path: 'governance', element: <Navigate to="/approvals" replace /> },
      { path: 'admin', element: <Navigate to="/administration" replace /> },
      { path: 'audit', element: <Navigate to="/artifacts" replace /> },
      { path: 'overview', element: <Navigate to="/dashboard" replace /> },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return (
    <EditorShellProvider>
      <RouterProvider router={router} />
    </EditorShellProvider>
  );
}

export default App;
