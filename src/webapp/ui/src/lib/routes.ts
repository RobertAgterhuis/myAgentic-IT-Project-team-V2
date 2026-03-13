/**
 * Route definitions — single source of truth for all app routes.
 * Used by the router config, sidebar nav, and breadcrumbs.
 */

export interface RouteEntry {
  path: string;
  label: string;
  icon?: string;
  section: string;
}

export const routes = {
  dashboard: { path: '/', label: 'Dashboard', icon: 'LayoutDashboard', section: 'Overview' },
  commandCenter: { path: '/command-center', label: 'Command Center', icon: 'Terminal', section: 'Operations' },
  pipeline: { path: '/pipeline', label: 'Pipeline', icon: 'GitBranch', section: 'Operations' },
  questionnaires: { path: '/questionnaires', label: 'Questionnaires', icon: 'ClipboardList', section: 'Data' },
  decisions: { path: '/decisions', label: 'Decisions', icon: 'Scale', section: 'Data' },
  metrics: { path: '/metrics', label: 'Metrics', icon: 'BarChart3', section: 'Monitoring' },
} as const satisfies Record<string, RouteEntry>;

/** Build breadcrumb segments from a pathname. */
export function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/' }];

  const match = Object.values(routes).find((r) => r.path === pathname);
  if (match && match.path !== '/') {
    crumbs.push({ label: match.label, path: match.path });
  }

  return crumbs;
}
