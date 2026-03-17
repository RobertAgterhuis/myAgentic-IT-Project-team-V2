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
  /* Runtime */
  dashboard: { path: '/', label: 'Overview', icon: 'LayoutDashboard', section: 'Runtime' },
  sessions: { path: '/sessions', label: 'Sessions', icon: 'Activity', section: 'Runtime' },
  pipeline: { path: '/pipeline', label: 'Pipeline', icon: 'GitBranch', section: 'Runtime' },

  /* Operations */
  commands: { path: '/commands', label: 'Commands', icon: 'Terminal', section: 'Operations' },
  agents: { path: '/agents', label: 'Agents', icon: 'Bot', section: 'Operations' },
  decisions: { path: '/decisions', label: 'Decisions', icon: 'Scale', section: 'Operations' },

  /* Data */
  artifacts: { path: '/artifacts', label: 'Artifacts', icon: 'Package', section: 'Data' },
  questionnaires: {
    path: '/questionnaires',
    label: 'Questionnaires',
    icon: 'ClipboardList',
    section: 'Data',
  },

  /* Observability */
  observability: {
    path: '/observability',
    label: 'Metrics',
    icon: 'BarChart3',
    section: 'Observability',
  },
  governance: {
    path: '/governance',
    label: 'Governance',
    icon: 'ShieldCheck',
    section: 'Observability',
  },
  cockpit: {
    path: '/cockpit',
    label: 'Cockpit',
    icon: 'Gauge',
    section: 'Observability',
  },
} as const satisfies Record<string, RouteEntry>;

/** Build breadcrumb segments from a pathname. */
export function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/' }];

  const match = Object.values(routes).find((r) => r.path === pathname);
  if (match && match.path !== '/') {
    crumbs.push({ label: match.section, path: match.path });
    crumbs.push({ label: match.label, path: match.path });
    return crumbs;
  }

  // Handle sub-routes like /sessions/:id
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const parentPath = `/${segments[0]}`;
    const parentMatch = Object.values(routes).find((r) => r.path === parentPath);
    if (parentMatch) {
      crumbs.push({ label: parentMatch.section, path: parentMatch.path });
      crumbs.push({ label: parentMatch.label, path: parentPath });
      if (segments.length >= 2) {
        crumbs.push({ label: segments[1], path: pathname });
      }
    }
  }

  return crumbs;
}
