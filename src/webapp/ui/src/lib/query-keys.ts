/**
 * Query key factory — all TanStack Query keys in one place.
 * Convention: [domain, ...specifiers]
 */
export const queryKeys = {
  /* Questionnaires */
  questionnaires: {
    all: ['questionnaires'] as const,
  },

  /* Decisions */
  decisions: {
    all: ['decisions'] as const,
    similar: (query: string) => ['decisions', 'similar', query] as const,
  },

  /* Milestones */
  milestones: {
    all: ['milestones'] as const,
    detail: (id: string) => ['milestones', id] as const,
    templates: ['milestones', 'templates'] as const,
  },

  /* Orchestrator */
  orchestrator: {
    status: ['orchestrator', 'status'] as const,
    runHistory: ['orchestrator', 'run-history'] as const,
    queue: ['command', 'queue'] as const,
    gateDiagnosticsRoot: ['orchestrator', 'gate-diagnostics'] as const,
    gateDiagnostics: (sessionId: string) =>
      ['orchestrator', 'gate-diagnostics', sessionId] as const,
  },

  /* Onboarding */
  onboarding: {
    diagnostics: ['onboarding', 'diagnostics'] as const,
  },

  /* Dashboard */
  dashboard: {
    health: ['dashboard', 'health'] as const,
    metrics: ['dashboard', 'metrics'] as const,
    activity: ['dashboard', 'activity'] as const,
    stats: ['dashboard', 'stats'] as const,
  },

  /* Drift */
  drift: {
    all: ['drift'] as const,
  },

  /* Progress */
  progress: {
    all: ['progress'] as const,
  },

  /* Session */
  session: {
    current: ['session'] as const,
  },

  /* Server metrics */
  serverMetrics: {
    all: ['server-metrics'] as const,
  },

  /* Analytics (M7) */
  analytics: {
    trends: ['analytics', 'trends'] as const,
    agents: ['analytics', 'agents'] as const,
    metrics: ['analytics', 'metrics'] as const,
    metric: (name: string) => ['analytics', 'metrics', name] as const,
  },

  /* Artifacts (M10) */
  artifacts: {
    all: ['artifacts'] as const,
    detail: (id: string) => ['artifacts', id] as const,
    lineage: (id: string) => ['artifacts', id, 'lineage'] as const,
    stats: ['artifacts', 'stats'] as const,
  },

  /* Governance / Approvals (M10) */
  governance: {
    approvals: ['governance', 'approvals'] as const,
    policies: ['governance', 'policies'] as const,
    policyPacks: ['governance', 'policy-packs'] as const,
    policySignals: ['governance', 'policy-signals'] as const,
    policyEvaluation: ['governance', 'policy-evaluation'] as const,
  },

  /* Help (M-UX-1a) */
  help: {
    page: (routeSlug: string) => ['help', 'page', routeSlug] as const,
    topic: (topicId: string) => ['help', 'topic', topicId] as const,
    search: (query: string) => ['help', 'search', query] as const,
  },

  /* Workspaces (UI-014) */
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
  },

  /* Prompts & Contracts (UI-015) */
  promptsContracts: {
    assets: ['prompts-contracts', 'assets'] as const,
  },

  /* Administration (UI-016) */
  administration: {
    users: ['administration', 'users'] as const,
    integrations: ['administration', 'integrations'] as const,
  },

  /* Traceability (M10) */
  traceability: {
    chains: ['traceability', 'chains'] as const,
  },

  /* Audit/Evidence aggregation (UI-025) */
  audit: {
    evidence: ['audit', 'evidence'] as const,
  },

  /* Observability telemetry contracts (UI-026) */
  observability: {
    contracts: ['observability', 'contracts'] as const,
  },

  /* Sessions (M15) */
  sessions: {
    all: ['sessions'] as const,
    detail: (id: string) => ['sessions', id] as const,
    timeline: (id: string) => ['sessions', id, 'timeline'] as const,
  },

  /* Agents (M15) */
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => ['agents', id] as const,
  },

  /* Cockpit (M27) */
  cockpit: {
    health: ['cockpit', 'health'] as const,
    dependencies: ['cockpit', 'dependencies'] as const,
    provenance: (params?: {
      actorType?: string;
      decisionType?: string;
      source?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    }) =>
      params
        ? ([
            'cockpit',
            'provenance',
            params.actorType ?? 'all',
            params.decisionType ?? 'all',
            params.source ?? 'all',
            params.from ?? 'all',
            params.to ?? 'all',
            params.page ?? 1,
            params.pageSize ?? 25,
          ] as const)
        : (['cockpit', 'provenance'] as const),
    rootCause: (sessionId?: string) =>
      sessionId
        ? (['cockpit', 'root-cause', sessionId] as const)
        : (['cockpit', 'root-cause'] as const),
    approvalDetail: (id: string) => ['cockpit', 'approval', id] as const,
    approvalHistory: ['cockpit', 'approval-history'] as const,
  },
} as const;
