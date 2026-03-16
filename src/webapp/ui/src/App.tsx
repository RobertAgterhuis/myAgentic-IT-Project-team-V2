/**
 * App root — configures React Router with lazy-loaded pages.
 * Layout & SSE are handled inside AppLayout.
 */
import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { NotFoundPage } from '@/pages/not-found-page';

const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page'));
const CommandCenterPage = lazy(() => import('@/pages/command-center/command-center-page'));
const PipelinePage = lazy(() => import('@/pages/pipeline/pipeline-page'));
const QuestionnairesPage = lazy(() => import('@/pages/questionnaires/questionnaires-page'));
const DecisionsPage = lazy(() => import('@/pages/decisions/decisions-page'));
const MetricsPage = lazy(() => import('@/pages/metrics/metrics-page'));
const ArtifactBrowserPage = lazy(() => import('@/pages/artifacts/artifact-browser-page'));
const LineagePage = lazy(() => import('@/pages/artifacts/lineage-page'));
const GovernanceDashboardPage = lazy(() => import('@/pages/governance/governance-dashboard-page'));
const AnalyticsTrendsPage = lazy(() => import('@/pages/analytics/analytics-trends-page'));
const TraceabilityExplorerPage = lazy(
  () => import('@/pages/traceability/traceability-explorer-page')
);

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'command-center', element: <CommandCenterPage /> },
      { path: 'pipeline', element: <PipelinePage /> },
      { path: 'questionnaires', element: <QuestionnairesPage /> },
      { path: 'decisions', element: <DecisionsPage /> },
      { path: 'metrics', element: <MetricsPage /> },
      { path: 'artifacts', element: <ArtifactBrowserPage /> },
      { path: 'artifacts/lineage', element: <LineagePage /> },
      { path: 'governance', element: <GovernanceDashboardPage /> },
      { path: 'analytics', element: <AnalyticsTrendsPage /> },
      { path: 'traceability', element: <TraceabilityExplorerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
