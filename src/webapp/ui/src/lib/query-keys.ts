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
} as const;
