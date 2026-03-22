/**
 * MSW request handlers — mock all API endpoints for tests.
 */
import { http, HttpResponse } from 'msw';
import type {
  QuestionnairesResponse,
  DecisionsResponse,
  MilestonesListResponse,
  MilestoneResponse,
  OrchestratorStatus,
  CommandQueueResponse,
  DriftResponse,
  ProgressResponse,
  TimestampedResponse,
  DashboardHealth,
  DashboardMetrics,
  ActivityEntry,
  DashboardStats,
  SessionsListResponse,
  SessionDetailResponse,
  TimelineResponse,
  GateDiagnosticsResponse,
  OnboardingDiagnosticsResponse,
  AgentsListResponse,
  AgentDetailResponse,
  Session,
  TimelineEvent,
  AgentDetailEntry,
} from '@/lib/api-types';

/* ── Fixtures ── */

export const mockQuestionnaires: QuestionnairesResponse = {
  questionnaires: [
    {
      file: 'BusinessDocs/Phase1-Business/Questionnaires/q1.md',
      agent: 'Business Analyst',
      phase: 'Phase 1',
      generated: '2026-03-01',
      version: '1.0',
      sections: [{ title: 'General', questions: [] }],
      questions: [
        {
          id: 'Q-01-001',
          classification: 'REQUIRED',
          question: 'What is the target market?',
          whyNeeded: 'Market sizing',
          expectedFormat: 'Text',
          example: 'SMB SaaS',
          answer: '',
          section: 'General',
          status: 'OPEN',
          lastUpdated: '2026-03-01',
        },
      ],
    },
  ],
};

export const mockDecisions: DecisionsResponse = {
  open: [
    {
      id: 'DEC-001',
      type: 'OPEN_QUESTION',
      status: 'OPEN',
      priority: 'HIGH',
      scope: 'TECH',
      question: 'Which cloud provider?',
      answer: '',
      date: '2026-03-01',
    },
  ],
  decided: [
    {
      id: 'DEC-002',
      type: 'DECIDED',
      status: 'DECIDED',
      priority: 'MEDIUM',
      scope: 'BUSINESS',
      decision: 'Use React',
      notes: 'Team consensus',
      date: '2026-03-02',
    },
  ],
  deferred: [],
  categories: [],
};

export const mockMilestonesList: MilestonesListResponse = {
  ok: true,
  data: [
    {
      id: 'milestone-20260301-abc',
      name: 'M1: Foundation',
      status: 'in progress',
      progress: 50,
      completion: '2026-04-01',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
      archived: false,
    },
  ],
  count: 1,
  timestamp: new Date().toISOString(),
};

export const mockOrchestratorStatus: OrchestratorStatus = {
  state: 'IDLE',
  mode: 'CREATE',
};

export const mockOnboardingDiagnostics: OnboardingDiagnosticsResponse = {
  ok: true,
  generatedAt: new Date().toISOString(),
  profile: 'local-dev',
  contract: {
    profile: 'local-dev',
    name: 'Local Development',
    description: 'Developer workstation with zero external dependencies.',
    storageProvider: {
      required: false,
      allowedValues: ['file', 'sqlite'],
      recommended: 'file',
    },
    queueProvider: {
      required: false,
      allowedValues: ['memory', 'persistent', 'bullmq'],
      recommended: 'memory',
    },
    sessionStore: {
      required: false,
      allowedValues: ['sqlite', 'redis'],
      recommended: 'sqlite',
    },
    redis: {
      required: false,
      description: 'Optional. Redis-backed features are disabled if omitted.',
    },
    auth: {
      required: false,
      description: 'Optional. GitHub OAuth and API_KEY both optional.',
    },
    trustProxy: {
      required: false,
      description: 'Not required for localhost.',
    },
    startupBehavior: 'Tolerates missing services; continues with fallbacks.',
  },
  validation: {
    valid: true,
    errors: [],
    warnings: [],
  },
  environment: {
    nodeEnv: 'development',
    host: '127.0.0.1',
    storageProvider: 'file',
    queueProvider: 'memory',
    sessionStore: 'sqlite',
    redisConfigured: false,
    authConfigured: false,
    trustProxy: false,
  },
};

export const mockGateDiagnostics: GateDiagnosticsResponse = {
  ok: true,
  sessionId: 'sess-test-001',
  totalFailures: 0,
  latest: null,
  diagnostics: [],
};

export const mockCommandQueue: CommandQueueResponse = {
  command: null,
  queue: [],
};

export const mockDrift: DriftResponse = {
  generated_at: new Date().toISOString(),
  summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
  drifts: [],
  in_sync: { sprints: ['S9A'], stories: 6 },
};

export const mockProgress: ProgressResponse = {
  active: false,
  session: null,
  phases: [
    {
      key: 'ONBOARDING',
      label: 'Onboarding',
      status: 'done',
      agents: [{ id: 'onboarding', name: 'Onboarding Agent', status: 'done' }],
      done: 1,
      total: 1,
    },
  ],
  command: null,
};

export const mockDashboardHealth: TimestampedResponse<DashboardHealth> = {
  ok: true,
  data: {
    quality: { value: 95, label: 'Code Quality', status: 'good', details: '95% lint-free' },
    coverage: { value: 72, label: 'Test Coverage', status: 'ok', details: '72% covered' },
    builds: { value: 'passing', label: 'Build Status', status: 'good', details: 'All green' },
    deployment: { value: 'stable', label: 'Deployment', status: 'good', details: 'v0.1.0' },
  },
  timestamp: new Date().toISOString(),
};

export const mockDashboardMetrics: TimestampedResponse<DashboardMetrics> = {
  ok: true,
  data: {
    http_requests: { value: 1250, label: 'HTTP Requests', period: '24h', trend: 'up' },
    error_rate: { value: 0.02, label: 'Error Rate', period: '24h', trend: 'stable' },
    response_time: { value: 42, label: 'Response Time (ms)', period: '24h', trend: 'down' },
  },
  timestamp: new Date().toISOString(),
};

export const mockDashboardActivity: TimestampedResponse<ActivityEntry[]> = {
  ok: true,
  data: [
    {
      type: 'commit',
      action: 'push',
      details: 'feat: add Sprint 9D',
      timestamp: '2026-03-13T10:00:00Z',
    },
  ],
  timestamp: new Date().toISOString(),
};

export const mockDashboardStats: TimestampedResponse<DashboardStats> = {
  ok: true,
  data: {
    active_files: { value: 142, label: 'Active Files', icon: '📄', details: '142 tracked' },
    team_members: { value: 1, label: 'Team', icon: '👤', details: '1 contributor' },
    sprint_progress: { value: '60%', label: 'Sprint', icon: '🏃', details: 'S9D in progress' },
    github_stars: { value: 0, label: 'Stars', icon: '⭐', details: '0 stars' },
  },
  timestamp: new Date().toISOString(),
};

/* ── Handlers ── */

export const mockSession: Session = {
  id: 'sess-test-001',
  project: 'TestProject',
  flow: 'CREATE',
  phase: 'PHASE-1',
  status: 'active',
  progress: 25,
  started_at: '2026-03-01T10:00:00Z',
  completed_at: null,
  current_agent: '01-business-analyst',
};

export const mockSessionsList: SessionsListResponse = {
  ok: true,
  count: 1,
  sessions: [mockSession],
};

export const mockTimelineEvents: TimelineEvent[] = [
  {
    id: 'evt-001',
    type: 'session_start',
    timestamp: '2026-03-01T10:00:00Z',
    description: 'Session started: CREATE for TestProject',
  },
  {
    id: 'evt-002',
    type: 'phase_start',
    timestamp: '2026-03-01T10:00:01Z',
    description: 'Phase started: PHASE-1',
    phase: 'PHASE-1',
  },
  {
    id: 'evt-003',
    type: 'agent_start',
    timestamp: '2026-03-01T10:00:02Z',
    description: 'Agent started: Business Analyst',
    agent: '01-business-analyst',
    phase: 'PHASE-1',
  },
];

/**
 * Extended timeline including gate_failed and artifact_created events.
 * Used by tests that need richer event data (sprint-5 / M15-036, M15-037).
 */
export const mockTimelineWithGateFailure: TimelineEvent[] = [
  ...mockTimelineEvents,
  {
    id: 'evt-004',
    type: 'artifact_created',
    timestamp: '2026-03-01T10:00:03Z',
    description: 'Artifact created: product-vision.md',
    phase: 'PHASE-1',
    artifact_id: 'art-001',
  },
  {
    id: 'evt-005',
    type: 'gate_failed',
    timestamp: '2026-03-01T10:00:04Z',
    description: 'Gate failed: PHASE-1 has 2 violations',
    phase: 'PHASE-1',
  },
];

export const mockAgentDetail: AgentDetailEntry = {
  id: '01',
  name: 'Business Analyst',
  status: 'running',
  task_description: 'Processing PHASE-1',
  started_at: '2026-03-01T10:00:02Z',
  duration_ms: 0,
  outputs: [],
  retry_count: 0,
  session_id: 'sess-test-001',
  phase: 'PHASE-1',
};

export const mockAgentsList: AgentsListResponse = {
  ok: true,
  count: 1,
  agents: [mockAgentDetail],
};

const mockPageHelpByRoute: Record<
  string,
  {
    routeSlug: string;
    routePath: string;
    pageTitle: string;
    purpose: string;
    coreActions: Array<{ label: string; description: string }>;
    inputsOutputs: string;
    permissions: string;
    relatedPages: Array<{ routeSlug: string; title: string }>;
    keywords: string[];
    topicLinks: Array<{ topicId: string; title: string }>;
  }
> = {
  commands: {
    routeSlug: 'commands',
    routePath: '/commands',
    pageTitle: 'Commands',
    purpose: 'Queue and guide orchestrator commands with clear project intent.',
    coreActions: [
      { label: 'Create', description: 'Start a full delivery cycle from the brief.' },
      { label: 'Audit', description: 'Assess an existing system before changes.' },
      { label: 'Feature', description: 'Run scoped feature delivery.' },
    ],
    inputsOutputs: 'Project name and brief in, queued command out.',
    permissions: 'Operator',
    relatedPages: [{ routeSlug: 'pipeline', title: 'Pipeline' }],
    keywords: ['commands', 'queue', 'brief'],
    topicLinks: [{ topicId: 'commands-overview', title: 'Commands overview' }],
  },
  sessions: {
    routeSlug: 'sessions',
    routePath: '/sessions',
    pageTitle: 'Sessions',
    purpose: 'Track active and historical runs with clear recovery context.',
    coreActions: [
      { label: 'Review active', description: 'Open currently running orchestration sessions.' },
      { label: 'Inspect history', description: 'Check completed runs for evidence and outcomes.' },
      { label: 'Recover', description: 'Prioritize paused or failed runs that need intervention.' },
    ],
    inputsOutputs: 'Session list in, run-level insight out.',
    permissions: 'Operator',
    relatedPages: [{ routeSlug: 'commands', title: 'Commands' }],
    keywords: ['sessions', 'runs', 'history', 'gate'],
    topicLinks: [{ topicId: 'sessions-overview', title: 'Sessions overview' }],
  },
  approvals: {
    routeSlug: 'approvals',
    routePath: '/approvals',
    pageTitle: 'Approval Center',
    purpose: 'Review and decide pending governance approvals in one queue.',
    coreActions: [
      { label: 'Filter', description: 'Narrow approvals by status.' },
      { label: 'Review', description: 'Open a request to inspect context.' },
      { label: 'Decide', description: 'Approve or reject with rationale.' },
    ],
    inputsOutputs: 'Approval requests in, audit-ready decisions out.',
    permissions: 'Operator',
    relatedPages: [{ routeSlug: 'sessions', title: 'Sessions' }],
    keywords: ['approvals', 'governance', 'decisions'],
    topicLinks: [{ topicId: 'approval-workflow', title: 'Approval workflow' }],
  },
  pipeline: {
    routeSlug: 'pipeline',
    routePath: '/pipeline',
    pageTitle: 'Pipeline',
    purpose: 'Track phases, critic/risk gates, and sprint readiness.',
    coreActions: [
      { label: 'Inspect gates', description: 'Review why a gate passed or failed.' },
      { label: 'Track progress', description: 'Monitor run phase transitions.' },
      { label: 'Review readiness', description: 'Confirm sprint gate criteria.' },
    ],
    inputsOutputs: 'Pipeline events in, phase/gate insight out.',
    permissions: 'Operator',
    relatedPages: [{ routeSlug: 'sessions', title: 'Sessions' }],
    keywords: ['pipeline', 'gate', 'progress'],
    topicLinks: [{ topicId: 'quality-gates', title: 'Quality Gates' }],
  },
};

const mockHelpTopicsById: Record<
  string,
  {
    topicId: string;
    title: string;
    description: string;
    markdown: string;
    html: string;
    keywords: string[];
  }
> = {
  'commands-overview': {
    topicId: 'commands-overview',
    title: 'Commands overview',
    description: 'Command modes and expected outcomes.',
    markdown: '# Commands overview\n\n## Queueing\n\nUse CREATE to start a run.',
    html: '<h1>Commands overview</h1><h2>Queueing</h2><p>Use CREATE to start a run.</p>',
    keywords: ['commands', 'create'],
  },
  'sessions-overview': {
    topicId: 'sessions-overview',
    title: 'Sessions overview',
    description: 'Track active and historical sessions.',
    markdown: '# Sessions overview\n\n## Recovery\n\nResume paused work safely.',
    html: '<h1>Sessions overview</h1><h2>Recovery</h2><p>Resume paused work safely.</p>',
    keywords: ['sessions', 'recovery'],
  },
  'approval-workflow': {
    topicId: 'approval-workflow',
    title: 'Approval workflow',
    description: 'How governance approvals progress.',
    markdown: '# Approval workflow\n\n## Decisioning\n\nApprove or reject with rationale.',
    html: '<h1>Approval workflow</h1><h2>Decisioning</h2><p>Approve or reject with rationale.</p>',
    keywords: ['approval', 'governance'],
  },
  'quality-gates': {
    topicId: 'quality-gates',
    title: 'Quality Gates',
    description: 'How phase boundaries and gate outcomes are evaluated.',
    markdown: '# Quality Gates\n\n## Gate outcomes\n\nEach gate may pass, fail, or block progress.',
    html: '<h1>Quality Gates</h1><h2>Gate outcomes</h2><p>Each gate may pass, fail, or block progress.</p>',
    keywords: ['quality', 'gates', 'pipeline'],
  },
};

export const handlers = [
  /* Questionnaires */
  http.get('/api/questionnaires', () => HttpResponse.json(mockQuestionnaires)),
  http.post('/api/save', () => HttpResponse.json({ ok: true, saved: 1 })),

  /* Decisions */
  http.get('/api/decisions', () => HttpResponse.json(mockDecisions)),
  http.post('/api/decisions', () =>
    HttpResponse.json({ ok: true, id: 'DEC-003', action: 'create' })
  ),
  http.post('/api/decisions/activate-category', () =>
    HttpResponse.json({ ok: true, action: 'activated', file: 'cat.md', name: 'Cat', stack: 'tech' })
  ),

  /* Milestones */
  http.get('/api/milestones', () => HttpResponse.json(mockMilestonesList)),
  http.get('/api/milestones/:id', ({ params }) => {
    const ms = mockMilestonesList.data.find((m) => m.id === params.id);
    if (!ms) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const resp: MilestoneResponse = { ok: true, data: ms, timestamp: new Date().toISOString() };
    return HttpResponse.json(resp);
  }),
  http.post('/api/milestones', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const ms = {
      id: 'milestone-new-123',
      name: body.name as string,
      status: body.status as string,
      progress: body.progress as number,
      completion: body.completion as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false,
    };
    return HttpResponse.json({
      ok: true,
      data: ms,
      timestamp: new Date().toISOString(),
      message: 'Created',
    });
  }),
  http.put('/api/milestones/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const ms = { ...mockMilestonesList.data[0], ...body, id: params.id as string };
    return HttpResponse.json({ ok: true, data: ms, timestamp: new Date().toISOString() });
  }),
  http.patch('/api/milestones/:id/archive', ({ params }) => {
    const ms = { ...mockMilestonesList.data[0], id: params.id as string, archived: true };
    return HttpResponse.json({ ok: true, data: ms, timestamp: new Date().toISOString() });
  }),

  /* Milestone Templates */
  http.get('/api/milestone-templates', () =>
    HttpResponse.json({ ok: true, data: [], timestamp: new Date().toISOString() })
  ),
  http.post('/api/milestone-templates', () =>
    HttpResponse.json({
      ok: true,
      data: { id: 'tpl-1', name: 'TPL' },
      timestamp: new Date().toISOString(),
    })
  ),
  http.delete('/api/milestone-templates/:id', () => HttpResponse.json({ ok: true })),
  http.post('/api/milestone-templates/:id/apply', () =>
    HttpResponse.json({
      ok: true,
      data: mockMilestonesList.data[0],
      timestamp: new Date().toISOString(),
    })
  ),

  /* Orchestrator */
  http.get('/api/orchestrator/status', () => HttpResponse.json(mockOrchestratorStatus)),
  http.get('/api/orchestrator/run-history', () => HttpResponse.json([])),
  http.post('/api/orchestrator/advance', () =>
    HttpResponse.json({ ok: true, transition: {}, status: mockOrchestratorStatus })
  ),
  http.post('/api/orchestrator/error', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/recover', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/reset', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/stop', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/validate-gate', () =>
    HttpResponse.json({
      ok: true,
      verdict: 'APPROVED',
      summary: { phase: 'Phase 1', totalViolations: 0 },
    })
  ),
  http.get('/api/orchestrator/onboarding-diagnostics', () =>
    HttpResponse.json(mockOnboardingDiagnostics)
  ),
  http.get('/api/orchestrator/gate-diagnostics/:sessionId', ({ params }) => {
    if (params.sessionId !== mockGateDiagnostics.sessionId) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(mockGateDiagnostics);
  }),
  http.post('/api/orchestrator/command', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/sprint-gate', () =>
    HttpResponse.json({
      ok: true,
      verdict: 'READY',
      summary: { sprintId: 'SP-1', totalBlockers: 0 },
    })
  ),

  /* Cockpit */
  http.get('/api/v1/cockpit/provenance', () =>
    HttpResponse.json({
      ok: true,
      count: 2,
      total: 2,
      page: 1,
      page_size: 20,
      items: [
        {
          id: 'prov-1',
          decision_type: 'human_override',
          actor_type: 'human',
          actor: 'qa-user',
          action: 'pause',
          rationale: 'Need manual validation before continuing',
          source: 'orchestrator-control',
          state: 'PHASE_2',
          mode: 'CREATE',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'prov-2',
          decision_type: 'approval',
          actor_type: 'human',
          actor: 'product-owner',
          action: 'APPROVED',
          rationale: 'Gate reviewed and accepted',
          source: 'governance-approval',
          timestamp: new Date().toISOString(),
        },
      ],
    })
  ),

  /* Command queue */
  http.get('/api/command', () => HttpResponse.json(mockCommandQueue)),
  http.post('/api/command', () =>
    HttpResponse.json({ ok: true, clipboard_text: 'test', brief_saved: false, message: 'Queued' })
  ),

  /* Dashboard */
  http.get('/api/dashboard/health', () => HttpResponse.json(mockDashboardHealth)),
  http.get('/api/dashboard/metrics', () => HttpResponse.json(mockDashboardMetrics)),
  http.get('/api/dashboard/activity', () => HttpResponse.json(mockDashboardActivity)),
  http.get('/api/dashboard/stats', () => HttpResponse.json(mockDashboardStats)),

  /* Drift */
  http.get('/api/drift', () => HttpResponse.json(mockDrift)),

  /* Progress */
  http.get('/api/progress', () => HttpResponse.json(mockProgress)),

  /* Sessions (M15) */
  http.get('/api/sessions', () => HttpResponse.json(mockSessionsList)),
  http.get('/api/sessions/:id', ({ params }) => {
    if (params.id !== mockSession.id) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const resp: SessionDetailResponse = {
      ok: true,
      session: mockSession,
      agents: [mockAgentDetail],
      timeline: mockTimelineEvents,
    };
    return HttpResponse.json(resp);
  }),
  http.get('/api/sessions/:id/timeline', ({ params }) => {
    if (params.id !== mockSession.id) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const resp: TimelineResponse = {
      ok: true,
      session_id: mockSession.id,
      count: mockTimelineEvents.length,
      timeline: mockTimelineEvents,
    };
    return HttpResponse.json(resp);
  }),

  /* Agents (M15) */
  http.get('/api/agents', () => HttpResponse.json(mockAgentsList)),
  http.get('/api/agents/:id', ({ params }) => {
    if (params.id !== mockAgentDetail.id) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const resp: AgentDetailResponse = { ok: true, agent: mockAgentDetail };
    return HttpResponse.json(resp);
  }),

  /* Help */
  http.get('/api/v1/help/page/:routeSlug', ({ params }) => {
    const routeSlug = String(params.routeSlug ?? '').toLowerCase();
    const page = mockPageHelpByRoute[routeSlug];
    if (!page) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(page);
  }),
  http.get('/api/v1/help/topic/:topicId', ({ params }) => {
    const topicId = String(params.topicId ?? '').toLowerCase();
    const topic = mockHelpTopicsById[topicId];
    if (!topic) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(topic);
  }),
  http.get('/api/v1/help/search', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!query) {
      return HttpResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const allPages = Object.values(mockPageHelpByRoute);
    const matchedPages = allPages.filter((page) => {
      const haystack = [
        page.routeSlug,
        page.pageTitle,
        page.purpose,
        page.keywords.join(' '),
        page.coreActions.map((action) => `${action.label} ${action.description}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const allTopics = Object.values(mockHelpTopicsById);
    const matchedTopics = allTopics.filter((topic) => {
      const haystack = [topic.topicId, topic.title, topic.description, topic.keywords.join(' ')]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const results = [
      ...matchedPages.map((page) => ({
        kind: 'page' as const,
        id: page.routeSlug,
        title: page.pageTitle,
        snippet: page.purpose,
        routePath: page.routePath,
        score: 0.85,
      })),
      ...matchedTopics.map((topic) => ({
        kind: 'topic' as const,
        id: topic.topicId,
        topicId: topic.topicId,
        title: topic.title,
        snippet: topic.description,
        score: 0.8,
      })),
    ];

    return HttpResponse.json({
      query,
      count: results.length,
      results,
      pages: matchedPages,
      topics: matchedTopics.map((topic) => ({ topicId: topic.topicId, title: topic.title })),
    });
  }),

  /* SSE — not mockable via MSW HTTP handlers, tested separately */
];
