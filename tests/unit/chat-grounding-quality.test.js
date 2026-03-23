// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerRoutes } = require('../../src/webapp/routes/chat');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

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

function vectorCode(text) {
  const normalized = String(text || '').toLowerCase();
  if (/(policy|approval|override|decision)/.test(normalized)) return 1;
  if (/(workspace|codebase|module|repo|repository)/.test(normalized)) return 2;
  return 3;
}

function createCtx() {
  return {
    _authMiddleware: { enabled: true },
    PROJECT_ROOT: process.cwd(),
    SESSION_DIR: 'BusinessDocs/session',
    resolveSessionFile: () =>
      require('node:path').join(process.cwd(), 'BusinessDocs/session/session-state.json'),
    _getHumanOverrideEvents: () => [{ state: 'OPEN' }],
    _ragStore: {
      query: vi.fn().mockImplementation(async (collectionId, vector, topK) => {
        const code = Array.isArray(vector) ? Number(vector[0] || 0) : 0;
        const rows = [];
        if (code === 1) {
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/decisions/security-overrides.md',
              chunk_text: 'Policy override requires reviewer approval and rationale.',
              start_line: 22,
            },
            score: 0.93,
          });
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/decisions.md',
              chunk_text: 'Decision records establish policy precedents.',
              start_line: 10,
            },
            score: 0.88,
          });
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/Phase2-Tech/analysis.md',
              chunk_text: 'Security controls summary for approval workflow.',
              start_line: 40,
            },
            score: 0.66,
          });
        } else if (code === 2) {
          rows.push({
            chunk: {
              source_path: 'src/webapp/routes/chat.ts',
              chunk_text: 'Chat routes register message and query endpoints.',
              start_line: 120,
            },
            score: 0.91,
          });
          rows.push({
            chunk: {
              source_path: 'src/webapp/services/chat-service.ts',
              chunk_text: 'ChatService persists history and proposes actions.',
              start_line: 130,
            },
            score: 0.84,
          });
          rows.push({
            chunk: {
              source_path: 'src/webapp/services/rag-grounding-service.ts',
              chunk_text: 'RAG grounding service resolves collection queries.',
              start_line: 300,
            },
            score: 0.77,
          });
        } else {
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/Phase2-Tech/recommendations.md',
              chunk_text: 'Architecture review recommends phased runtime hardening.',
              start_line: 14,
            },
            score: 0.9,
          });
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/synthesis/final-report-tech.md',
              chunk_text: 'Synthesis captures cross-phase technical blockers.',
              start_line: 50,
            },
            score: 0.81,
          });
          rows.push({
            chunk: {
              source_path: 'BusinessDocs/session/session-state.json',
              chunk_text: 'Current phase and agent execution metadata.',
              start_line: 1,
            },
            score: 0.72,
          });
        }
        return rows.slice(0, Math.max(1, Math.min(topK || 3, 3)));
      }),
    },
    _embeddingProvider: {
      embedText: vi.fn().mockImplementation(async (text) => [vectorCode(text), 0.1, 0.2]),
    },
    sseNotify: vi.fn(),
    recordMetric: vi.fn(),
  };
}

describe('chat grounding quality gate', () => {
  const ctx = createCtx();
  const routes = createTestableRoutes(registerRoutes, ctx);

  const fixtures = [
    {
      message: 'What policy should I follow for this approval override?',
      expectedSourceHint: 'BusinessDocs/decisions',
      governance: true,
    },
    {
      message: 'Where in the workspace is the chat message route implemented?',
      expectedSourceHint: 'src/webapp',
      governance: false,
    },
    {
      message: 'Summarize the architecture review artifacts for this run.',
      expectedSourceHint: 'BusinessDocs',
      governance: false,
    },
    {
      message: 'Need guidance on decision precedent for a policy exception.',
      expectedSourceHint: 'BusinessDocs/decisions',
      governance: true,
    },
  ];

  it('keeps precision@3 above threshold and governance citations valid', async () => {
    let relevantHits = 0;
    let totalRetrieved = 0;

    for (const fixture of fixtures) {
      const res = createRes();
      await routes['POST /api/v1/chat/message'](
        createReq('/api/v1/chat/message', {
          message: fixture.message,
          topK: 3,
          threshold: 0.12,
          workspace_id: 'quality-gate',
        }),
        res
      );

      expect(res.statusCode).toBe(200);
      const payload = JSON.parse(res.body);
      expect(payload.grounding.fallback_reason).toBeNull();

      const citations = Array.isArray(payload.citations) ? payload.citations : [];
      const groundedOnly = citations.filter(
        (entry) => String(entry.source_type || '').toLowerCase() !== 'session'
      );
      const topThree = groundedOnly.slice(0, 3);
      const relevant = topThree.filter((entry) =>
        String(entry.source_path || '').includes(fixture.expectedSourceHint)
      ).length;

      relevantHits += relevant;
      totalRetrieved += 3;

      if (fixture.governance) {
        expect(citations.length).toBeGreaterThan(0);
        expect(
          citations.some((entry) =>
            /(decision|policy|artifact)/.test(String(entry.source_type || '').toLowerCase())
          )
        ).toBe(true);
      }
    }

    const precisionAt3 = relevantHits / totalRetrieved;
    expect(precisionAt3).toBeGreaterThanOrEqual(0.75);
  });
});
