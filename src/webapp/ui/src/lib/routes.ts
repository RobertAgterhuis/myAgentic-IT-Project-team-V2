/**
 * Route definitions — single source of truth for all app routes.
 * Used by the router config, sidebar nav, and breadcrumbs.
 */

export const DOMAIN_ORDER = [
  'Overview',
  'Workspaces',
  'Runs',
  'Approvals',
  'Policies',
  'Agents',
  'Prompts & Contracts',
  'Audit & Evidence',
  'Observability',
  'Administration',
] as const;

export type DomainSection = (typeof DOMAIN_ORDER)[number];

export interface RouteEntry {
  path: string;
  label: string;
  icon?: string;
  section: DomainSection;
}

export const routes = {
  /* Overview */
  dashboard: { path: '/', label: 'Overview', icon: 'LayoutDashboard', section: 'Overview' },

  /* Workspaces */
  workspaces: {
    path: '/workspaces',
    label: 'Workspaces',
    icon: 'FolderKanban',
    section: 'Workspaces',
  },

  /* Runs */
  sessions: { path: '/sessions', label: 'Runs', icon: 'Activity', section: 'Runs' },
  pipeline: { path: '/pipeline', label: 'Pipeline', icon: 'GitBranch', section: 'Runs' },
  commands: { path: '/commands', label: 'Commands', icon: 'Terminal', section: 'Runs' },

  /* Approvals */
  approvals: {
    path: '/approvals',
    label: 'Approval Center',
    icon: 'ShieldCheck',
    section: 'Approvals',
  },

  /* Policies */
  decisions: { path: '/decisions', label: 'Decisions', icon: 'Scale', section: 'Policies' },

  /* Agents */
  agents: { path: '/agents', label: 'Agents', icon: 'Bot', section: 'Agents' },
  executionHistory: {
    path: '/agents/executions',
    label: 'Execution History',
    icon: 'History',
    section: 'Agents',
  },

  /* Prompts & Contracts */
  questionnaires: {
    path: '/questionnaires',
    label: 'Questionnaires',
    icon: 'ClipboardList',
    section: 'Prompts & Contracts',
  },
  promptsContracts: {
    path: '/prompts-contracts',
    label: 'Prompt & Contract Registry',
    icon: 'FileCode2',
    section: 'Prompts & Contracts',
  },

  /* Audit & Evidence */
  artifacts: {
    path: '/artifacts',
    label: 'Artifacts',
    icon: 'Package',
    section: 'Audit & Evidence',
  },

  /* Observability */
  observability: {
    path: '/observability',
    label: 'Observability',
    icon: 'BarChart3',
    section: 'Observability',
  },
  cockpit: {
    path: '/cockpit',
    label: 'Cockpit',
    icon: 'Gauge',
    section: 'Observability',
  },

  /* Administration */
  administration: {
    path: '/administration',
    label: 'Administration',
    icon: 'Settings2',
    section: 'Administration',
  },
  identityConsent: {
    path: '/admin/identity/consent',
    label: 'Identity Consent Center',
    icon: 'ShieldCheck',
    section: 'Administration',
  },
  mcpMatrix: {
    path: '/admin/mcp/matrix',
    label: 'Agent Permission Matrix',
    icon: 'Grid3X3',
    section: 'Administration',
  },
  mcpOverrides: {
    path: '/admin/mcp/overrides',
    label: 'Override Console',
    icon: 'ShieldAlert',
    section: 'Administration',
  },
  mcpDiagnostics: {
    path: '/admin/mcp/diagnostics',
    label: 'MCP Diagnostics',
    icon: 'Activity',
    section: 'Administration',
  },
} as const satisfies Record<string, RouteEntry>;

/** Build breadcrumb segments from a pathname. */
export function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: 'Home', path: '/' }];

  const match = Object.values(routes).find((r) => r.path === pathname);
  if (match && match.path !== '/') {
    crumbs.push({ label: match.section, path: match.path });
    if (match.label !== match.section) {
      crumbs.push({ label: match.label, path: match.path });
    }
    return crumbs;
  }

  // Handle sub-routes like /sessions/:id
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const parentPath = `/${segments[0]}`;
    const parentMatch = Object.values(routes).find((r) => r.path === parentPath);
    if (parentMatch) {
      crumbs.push({ label: parentMatch.section, path: parentMatch.path });
      if (parentMatch.label !== parentMatch.section) {
        crumbs.push({ label: parentMatch.label, path: parentPath });
      }
      if (segments.length >= 2) {
        crumbs.push({ label: segments[1], path: pathname });
      }
    }
  }

  return crumbs;
}
