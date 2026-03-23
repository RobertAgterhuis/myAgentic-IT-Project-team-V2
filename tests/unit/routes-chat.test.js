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
  };
}

function createReq(url, body = {}, role = 'operator') {
  return {
    url,
    method: 'POST',
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
    expect(payload.message.role).toBe('assistant');
    expect(Array.isArray(payload.citations)).toBe(true);
    expect(Array.isArray(payload.proposed_actions)).toBe(true);
    expect(payload.proposed_actions.some((entry) => entry.id === 'open-pipeline')).toBe(true);
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
});
