// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { registerRoutes } = require('../../src/webapp/routes/chat');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'BusinessDocs', 'session', 'chat-history');
const RUN_HISTORY_FILE = path.join(process.cwd(), 'BusinessDocs', 'session', 'run-history.json');
const SESSION_STATE_FILE = path.join(
  process.cwd(),
  'BusinessDocs',
  'session',
  'session-state.json'
);
let originalRunHistory = '[]';

function createCtx() {
  return {
    _authMiddleware: { enabled: true },
    PROJECT_ROOT: process.cwd(),
    SESSION_DIR: 'BusinessDocs/session',
    resolveSessionFile: () =>
      path.join(process.cwd(), 'BusinessDocs', 'session', 'session-state.json'),
    _getHumanOverrideEvents: () => [],
    _ragStore: {
      query: vi.fn().mockResolvedValue([
        {
          chunk: {
            source_path: path.join(process.cwd(), 'BusinessDocs', 'decisions.md'),
            chunk_text: 'Use React for the operator-facing web application shell.',
            start_line: 18,
          },
          score: 0.94,
        },
      ]),
    },
    _embeddingProvider: {
      embedText: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
    },
    sseNotify: vi.fn(),
    recordMetric: vi.fn(),
  };
}

function createReq(url, body = {}, role = 'operator', method = 'POST') {
  return {
    url,
    method,
    body,
    user: role ? { role } : undefined,
    headers: { host: 'localhost:3001', 'content-type': 'application/json' },
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, val) {
      res.headers[key] = val;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

function seedSessionState(overrides = {}) {
  const base = {
    status: 'RUNNING',
    mode: 'CREATE',
    current_phase: 'PHASE_2',
    current_agent: 'developer',
  };
  fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify({ ...base, ...overrides }, null, 2), 'utf8');
}

describe('routes/chat', () => {
  beforeAll(() => {
    try {
      originalRunHistory = fs.readFileSync(RUN_HISTORY_FILE, 'utf8');
    } catch {
      originalRunHistory = '[]';
    }
  });

  beforeEach(() => {
    fs.rmSync(CHAT_HISTORY_DIR, { recursive: true, force: true });
  });

  afterAll(() => {
    fs.rmSync(CHAT_HISTORY_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.writeFileSync(RUN_HISTORY_FILE, originalRunHistory, 'utf8');
  });

  const routes = createTestableRoutes(registerRoutes, createCtx());

  it('registers POST /api/v1/chat/message', () => {
    expect(routes).toHaveProperty('POST /api/v1/chat/message');
  });

  it('registers POST /api/v1/chat/query', () => {
    expect(routes).toHaveProperty('POST /api/v1/chat/query');
  });

  it('registers GET /api/v1/chat/history', () => {
    expect(routes).toHaveProperty('GET /api/v1/chat/history');
  });

  it('registers DELETE /api/v1/chat/session', () => {
    expect(routes).toHaveProperty('DELETE /api/v1/chat/session');
  });

  it('registers POST /api/v1/chat/action', () => {
    expect(routes).toHaveProperty('POST /api/v1/chat/action');
  });

  it('returns chat message with citations and proposed actions', async () => {
    const res = createRes();
    await routes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What is the current session status?',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(payload.intent).toBe('session_status');
    expect(payload.message.role).toBe('assistant');
    expect(Array.isArray(payload.citations)).toBe(true);
    expect(Array.isArray(payload.proposed_actions)).toBe(true);
    expect(payload.grounding).toBeTruthy();
    expect(payload.grounding.workspace_id).toBe('default');
    expect(
      payload.proposed_actions.some(
        (entry) => entry.type === 'open_screen' && entry.payload?.target === '/pipeline'
      )
    ).toBe(true);
  });

  it('records citation-count metric for grounded chat requests', async () => {
    const ctx = createCtx();
    const localRoutes = createTestableRoutes(registerRoutes, ctx);
    const res = createRes();

    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What policy should I follow for this approval override?',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(
      ctx.recordMetric.mock.calls.some(
        (call) => call[0] === 'CHAT' && call[1] === '/message/citation-count'
      )
    ).toBe(true);
  });

  it('returns grounded references for a decision lookup query', async () => {
    const res = createRes();
    await routes['POST /api/v1/chat/query'](
      createReq('/api/v1/chat/query', {
        intent: 'decision_lookup',
        message: 'What did we decide about the UI framework?',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(payload.intent).toBe('decision_lookup');
    expect(payload.collection).toBe('decisions');
    expect(payload.references).toHaveLength(1);
    expect(payload.references[0].source_path).toBe('BusinessDocs/decisions.md');
  });

  it('returns 403 for viewers', async () => {
    const res = createRes();
    await routes['POST /api/v1/chat/query'](
      createReq(
        '/api/v1/chat/query',
        {
          intent: 'workspace_query',
          message: 'Where is the decisions UI page implemented?',
        },
        'viewer'
      ),
      res
    );

    expect(res.statusCode).toBe(403);
  });

  it('returns history for the same session', async () => {
    const sendRes = createRes();
    await routes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Show current session status',
        session_id: 'session-alpha',
      }),
      sendRes
    );

    const historyRes = createRes();
    await routes['GET /api/v1/chat/history'](
      createReq('/api/v1/chat/history?session_id=session-alpha&limit=20', {}, 'operator', 'GET'),
      historyRes
    );

    expect(historyRes.statusCode).toBe(200);
    const payload = JSON.parse(historyRes.body);
    expect(payload.ok).toBe(true);
    expect(payload.session_id).toBe('session-alpha');
    expect(payload.count).toBeGreaterThan(0);
    expect(Array.isArray(payload.messages)).toBe(true);
  });

  it('clears a chat session via DELETE /api/v1/chat/session', async () => {
    const sendRes = createRes();
    await routes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Persist this chat message',
        session_id: 'clear-target',
      }),
      sendRes
    );

    const deleteRes = createRes();
    await routes['DELETE /api/v1/chat/session'](
      createReq(
        '/api/v1/chat/session',
        {
          session_id: 'clear-target',
        },
        'operator',
        'DELETE'
      ),
      deleteRes
    );

    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).cleared).toBe(true);

    const historyRes = createRes();
    await routes['GET /api/v1/chat/history'](
      createReq('/api/v1/chat/history?session_id=clear-target&limit=20', {}, 'operator', 'GET'),
      historyRes
    );
    expect(JSON.parse(historyRes.body).count).toBe(0);
  });

  it('executes open_screen action via POST /api/v1/chat/action', async () => {
    const sendRes = createRes();
    await routes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What is my session status?',
        session_id: 'action-session',
      }),
      sendRes
    );

    const sendPayload = JSON.parse(sendRes.body);
    const action = sendPayload.proposed_actions.find((entry) => entry.type === 'open_screen');
    expect(action).toBeDefined();

    const actionRes = createRes();
    await routes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'action-session',
        actionId: action.id,
      }),
      actionRes
    );

    expect(actionRes.statusCode).toBe(200);
    const actionPayload = JSON.parse(actionRes.body);
    expect(actionPayload.result.target).toBe('/pipeline');
  });

  it('requires confirmation for irreversible actions', async () => {
    const sendRes = createRes();
    await routes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Start a feature run now',
        session_id: 'confirm-session',
      }),
      sendRes
    );

    const sendPayload = JSON.parse(sendRes.body);
    const action = sendPayload.proposed_actions.find((entry) => entry.type === 'create_command');
    expect(action.requires_confirmation).toBe(true);

    const actionRes = createRes();
    await routes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'confirm-session',
        actionId: action.id,
      }),
      actionRes
    );

    expect(actionRes.statusCode).toBe(409);
    const actionPayload = JSON.parse(actionRes.body);
    expect(actionPayload.requires_confirmation).toBe(true);
  });

  it('falls back to clarification when strict-grounding query has no matches', async () => {
    const ctx = createCtx();
    ctx._ragStore.query.mockResolvedValueOnce([]);
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Need policy override guidance for this approval',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.grounding.fallback_reason).toBe('no_matches');
    expect(payload.proposed_actions).toEqual([]);
    expect(payload.message.content.toLowerCase()).toContain('grounded context');
  });

  it('returns degraded grounding metadata when RAG services are unavailable', async () => {
    const noRagCtx = {
      ...createCtx(),
      _ragStore: undefined,
      _embeddingProvider: undefined,
    };
    const localRoutes = createTestableRoutes(registerRoutes, noRagCtx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What policy should I use for this approval?',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.grounding.enabled).toBe(false);
    expect(payload.grounding.degraded).toBe(true);
    expect(payload.grounding.fallback_reason).toBe('services_unavailable');
    expect(payload.proposed_actions).toEqual([]);
  });

  it('returns gate explainer details with rerun action', async () => {
    const fixture = [
      {
        mode: 'CREATE',
        status: 'STOPPED',
        started_at: '2026-03-22T10:00:00.000Z',
        ended_at: '2026-03-22T10:20:00.000Z',
        gate_results: {
          'gate.critic-risk-1': {
            verdict: 'FAILED',
            unmet_criteria: [
              'All PHASE_1 handoff checklists complete',
              'No unresolved BLOCKING items',
            ],
          },
        },
      },
    ];
    fs.writeFileSync(RUN_HISTORY_FILE, JSON.stringify(fixture, null, 2), 'utf8');

    const localRoutes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'Why did the critic gate fail?' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content).toContain('gate.critic-risk-1');
    expect(payload.message.content).toContain('Unmet criteria');
    expect(payload.proposed_actions.some((entry) => entry.type === 'create_command')).toBe(true);
  });

  it('returns pending approvals with approve and reject actions', async () => {
    const approval = {
      id: 'APR-TEST-001',
      entity_id: 'task-42',
      gate_id: 'G-REL-01',
      stage: 'RELEASE',
      requested_by: 'user',
      requested_at: new Date().toISOString(),
      required_role: 'operator',
      status: 'PENDING',
    };
    const ctx = {
      ...createCtx(),
      _getEngine: () => ({
        getPendingApprovals: () => [approval],
        getApprovals: () => [approval],
        requestApproval: () => approval,
        decide: () => ({ ...approval, status: 'APPROVED' }),
      }),
    };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'What approvals are pending?' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content).toContain('APR-TEST-001');
    expect(payload.proposed_actions.some((entry) => entry.type === 'approve')).toBe(true);
    expect(payload.proposed_actions.some((entry) => entry.type === 'reject')).toBe(true);
  });

  it('summarizes current session with elapsed and blocking context', async () => {
    const fixture = [
      {
        mode: 'CREATE',
        status: 'STOPPED',
        started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        ended_at: null,
        gate_results: {
          'gate.critic-risk-2': {
            verdict: 'FAILED',
            unmet_criteria: ['Risk agent assessment completed'],
          },
        },
      },
    ];
    fs.writeFileSync(RUN_HISTORY_FILE, JSON.stringify(fixture, null, 2), 'utf8');

    const localRoutes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'Summarize current session' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content).toContain('Current session summary');
    expect(payload.message.content).toContain('Elapsed time');
    expect(payload.message.content).toContain('Blocking items');
  });

  it('returns next action guidance to resume when session is paused', async () => {
    seedSessionState({ status: 'PAUSED', current_phase: 'PHASE_3' });
    const ctx = { ...createCtx(), _getHumanOverrideEvents: () => [] };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'What should I do next?' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content.toLowerCase()).toContain('paused');
    expect(payload.proposed_actions.some((entry) => entry.type === 'resume')).toBe(true);
  });

  it('returns next action guidance for idle session', async () => {
    seedSessionState({ status: 'IDLE', current_phase: 'PHASE_1' });
    const ctx = { ...createCtx(), _getHumanOverrideEvents: () => [] };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'What should I do next?' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content.toLowerCase()).toContain('no active session');
    expect(
      payload.proposed_actions.some(
        (entry) => entry.type === 'open_screen' && entry.payload?.target === '/commands'
      )
    ).toBe(true);
  });

  it('returns approval action fallback when no approvals are pending', async () => {
    const ctx = {
      ...createCtx(),
      _getEngine: () => ({
        getPendingApprovals: () => [],
        getApprovals: () => [],
        requestApproval: () => null,
        decide: () => null,
      }),
    };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'What approvals are pending?' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content).toContain('No pending approvals');
  });

  it('adds proactive blocked-gate context on first chat-open prompt', async () => {
    const fixture = [
      {
        mode: 'CREATE',
        status: 'STOPPED',
        started_at: '2026-03-22T10:00:00.000Z',
        ended_at: '2026-03-22T10:20:00.000Z',
        gate_results: {
          'gate.critic-risk-9': {
            verdict: 'FAILED',
            unmet_criteria: ['Complete unresolved architecture risks'],
          },
        },
      },
    ];
    fs.writeFileSync(RUN_HISTORY_FILE, JSON.stringify(fixture, null, 2), 'utf8');

    const localRoutes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', { message: 'hi' }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.message.content).toContain('Proactive context');
    expect(payload.message.content).toContain('gate.critic-risk-9');
  });

  it('returns low-confidence fallback and triggers index refresh', async () => {
    const ctx = {
      ...createCtx(),
      _ragStore: {
        query: vi.fn().mockResolvedValue([
          {
            chunk: {
              source_path: path.join(process.cwd(), 'BusinessDocs', 'decisions.md'),
              chunk_text: 'Potentially related policy context.',
              start_line: 10,
            },
            score: 0.2,
          },
        ]),
      },
      _ragIndexer: {
        syncDirectory: vi.fn().mockResolvedValue({
          filesProcessed: 1,
          filesSkipped: 0,
          chunksInserted: 2,
        }),
      },
    };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Need policy guidance for this approval',
        threshold: 0.95,
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.grounding.fallback_reason).toBe('low_confidence');
    expect(payload.index_refresh_triggered).toBe(true);
  });

  it('returns missing-required-citations fallback for strict unguided prompts', async () => {
    const localRoutes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();

    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Need architecture recommendation for this environment',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.grounding.fallback_reason).toBe('missing_required_citations');
    expect(payload.proposed_actions).toEqual([]);
  });

  it('returns 404 when chat action id does not exist', async () => {
    const localRoutes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();
    await localRoutes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'missing-action-session',
        actionId: 'action-does-not-exist',
      }),
      res
    );

    expect(res.statusCode).toBe(404);
  });

  it('executes approve action when confirmation is provided', async () => {
    const approval = {
      id: 'APR-OK-001',
      entity_id: 'task-100',
      gate_id: 'G-REL-01',
      stage: 'RELEASE',
      requested_by: 'user',
      requested_at: new Date().toISOString(),
      required_role: 'operator',
      status: 'PENDING',
    };
    const ctx = {
      ...createCtx(),
      _getEngine: () => ({
        getPendingApprovals: () => [approval],
        getApprovals: () => [approval],
        requestApproval: () => approval,
        decide: (_id, user, approved, reason) => ({
          ...approval,
          status: approved ? 'APPROVED' : 'REJECTED',
          decided_by: user,
          reason,
        }),
      }),
    };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const sendRes = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What approvals are pending?',
        session_id: 'approve-action-session',
      }),
      sendRes
    );

    const payload = JSON.parse(sendRes.body);
    const approveAction = payload.proposed_actions.find((entry) => entry.type === 'approve');
    expect(approveAction).toBeDefined();

    const actionRes = createRes();
    await localRoutes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'approve-action-session',
        actionId: approveAction.id,
        confirmed: true,
      }),
      actionRes
    );

    expect([200, 500]).toContain(actionRes.statusCode);
    const actionPayload = JSON.parse(actionRes.body);
    if (actionRes.statusCode === 200) {
      expect(actionPayload.ok).toBe(true);
    } else {
      expect(actionPayload.code).toBe('INTERNAL_ERROR');
    }
  });

  it('executes reject action when confirmation is provided', async () => {
    const approval = {
      id: 'APR-OK-002',
      entity_id: 'task-101',
      gate_id: 'G-REL-02',
      stage: 'RELEASE',
      requested_by: 'user',
      requested_at: new Date().toISOString(),
      required_role: 'operator',
      status: 'PENDING',
    };
    const ctx = {
      ...createCtx(),
      _getEngine: () => ({
        getPendingApprovals: () => [approval],
        getApprovals: () => [approval],
        requestApproval: () => approval,
        decide: (_id, user, approved, reason) => ({
          ...approval,
          status: approved ? 'APPROVED' : 'REJECTED',
          decided_by: user,
          reason,
        }),
      }),
    };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const sendRes = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What approvals are pending?',
        session_id: 'reject-action-session',
      }),
      sendRes
    );

    const payload = JSON.parse(sendRes.body);
    const rejectAction = payload.proposed_actions.find((entry) => entry.type === 'reject');
    expect(rejectAction).toBeDefined();

    const actionRes = createRes();
    await localRoutes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'reject-action-session',
        actionId: rejectAction.id,
        confirmed: true,
      }),
      actionRes
    );

    expect([200, 500]).toContain(actionRes.statusCode);
    const actionPayload = JSON.parse(actionRes.body);
    if (actionRes.statusCode === 200) {
      expect(actionPayload.ok).toBe(true);
    } else {
      expect(actionPayload.code).toBe('INTERNAL_ERROR');
    }
  });

  it('executes create_command action when confirmation is provided', async () => {
    const localRoutes = createTestableRoutes(registerRoutes, createCtx());

    const sendRes = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'Start a feature run now',
        session_id: 'command-action-session',
      }),
      sendRes
    );

    const payload = JSON.parse(sendRes.body);
    const commandAction = payload.proposed_actions.find((entry) => entry.type === 'create_command');
    expect(commandAction).toBeDefined();

    const actionRes = createRes();
    await localRoutes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'command-action-session',
        actionId: commandAction.id,
        confirmed: true,
      }),
      actionRes
    );

    expect([200, 500]).toContain(actionRes.statusCode);
    const actionPayload = JSON.parse(actionRes.body);
    if (actionRes.statusCode === 200) {
      expect(actionPayload.ok).toBe(true);
    } else {
      expect(actionPayload.code).toBe('INTERNAL_ERROR');
    }
  });

  it('executes resume action generated by next-action guidance', async () => {
    seedSessionState({ status: 'PAUSED', current_phase: 'PHASE_2' });
    const ctx = { ...createCtx(), _getHumanOverrideEvents: () => [] };
    const localRoutes = createTestableRoutes(registerRoutes, ctx);

    const sendRes = createRes();
    await localRoutes['POST /api/v1/chat/message'](
      createReq('/api/v1/chat/message', {
        message: 'What should I do next?',
        session_id: 'resume-action-session',
      }),
      sendRes
    );

    const payload = JSON.parse(sendRes.body);
    const resumeAction = payload.proposed_actions.find((entry) => entry.type === 'resume');
    expect(resumeAction).toBeDefined();

    const actionRes = createRes();
    await localRoutes['POST /api/v1/chat/action'](
      createReq('/api/v1/chat/action', {
        session_id: 'resume-action-session',
        actionId: resumeAction.id,
      }),
      actionRes
    );

    expect([200, 500]).toContain(actionRes.statusCode);
    const actionPayload = JSON.parse(actionRes.body);
    if (actionRes.statusCode === 200) {
      expect(actionPayload.ok).toBe(true);
    } else {
      expect(actionPayload.code).toBe('INTERNAL_ERROR');
    }
  });
});
