/**
 * Route definitions — single source of truth for all app routes.
 * Used by the router config, sidebar nav, and breadcrumbs.
 */

export const DOMAIN_ORDER = [
  'Dashboard',
  'Workspaces',
  'Sessions',
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

export type PersonaRole = 'admin' | 'operator' | 'viewer' | null | undefined;

interface PersonaPreset {
  landingPath: string;
  prioritizedPaths: string[];
}

export const routes = {
  /* Dashboard */
  dashboard: { path: '/', label: 'Dashboard', icon: 'LayoutDashboard', section: 'Dashboard' },

  /* Workspaces */
  workspaces: {
    path: '/workspaces',
    label: 'Workspaces',
    icon: 'FolderKanban',
    section: 'Workspaces',
  },

  /* Sessions */
  sessions: { path: '/sessions', label: 'Sessions', icon: 'Activity', section: 'Sessions' },
  pipeline: { path: '/pipeline', label: 'Pipeline', icon: 'GitBranch', section: 'Sessions' },
  commands: { path: '/commands', label: 'Commands', icon: 'Terminal', section: 'Sessions' },

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

const PERSONA_PRESETS: Record<'admin' | 'operator' | 'viewer', PersonaPreset> = {
  admin: {
    landingPath: '/administration',
    prioritizedPaths: ['/administration', '/admin/mcp/diagnostics', '/approvals'],
  },
  operator: {
    landingPath: '/cockpit',
    prioritizedPaths: ['/cockpit', '/approvals', '/sessions'],
  },
  viewer: {
    landingPath: '/',
    prioritizedPaths: ['/observability', '/artifacts', '/workspaces'],
  },
};

export function getPersonaPreset(role: PersonaRole): PersonaPreset {
  if (!role) return { landingPath: '/', prioritizedPaths: [] };
  return PERSONA_PRESETS[role];
}

export function prioritizeNavSections<
  T extends { id: string; title: string; items: Array<{ id: string }> },
>(sections: T[], role: PersonaRole): T[] {
  const preset = getPersonaPreset(role);
  if (preset.prioritizedPaths.length === 0) return sections;

  const prioritizedItems = sections
    .flatMap((section) => section.items)
    .filter((item) => preset.prioritizedPaths.includes(item.id));

  if (prioritizedItems.length === 0) return sections;

  const trimmedSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !preset.prioritizedPaths.includes(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  return [
    {
      id: 'persona-priority',
      title: role === 'viewer' ? 'Reviewer focus' : `${role} priority`,
      items: prioritizedItems,
    } as T,
    ...trimmedSections,
  ];
}

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
