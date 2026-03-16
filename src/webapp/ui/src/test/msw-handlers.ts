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
  http.post('/api/orchestrator/command', () => HttpResponse.json({ ok: true })),
  http.post('/api/orchestrator/sprint-gate', () =>
    HttpResponse.json({
      ok: true,
      verdict: 'READY',
      summary: { sprintId: 'SP-1', totalBlockers: 0 },
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

  /* SSE — not mockable via MSW HTTP handlers, tested separately */
];
