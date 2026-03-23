// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { registerRoutes } = require('../../src/webapp/routes/chat');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'BusinessDocs', 'session', 'chat-history');

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

describe('routes/chat', () => {
  beforeEach(() => {
    fs.rmSync(CHAT_HISTORY_DIR, { recursive: true, force: true });
  });

  afterAll(() => {
    fs.rmSync(CHAT_HISTORY_DIR, { recursive: true, force: true });
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
    expect(
      payload.proposed_actions.some(
        (entry) => entry.type === 'open_screen' && entry.payload?.target === '/pipeline'
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
    expect(actionPayload.ok).toBe(true);
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
});
