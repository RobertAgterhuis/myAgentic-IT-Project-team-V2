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
  const firstTokenP95BudgetMs = Number(process.env.CHAT_FIRST_TOKEN_P95_BUDGET_MS || 250);
  const retrievalP95BudgetMs = Number(process.env.CHAT_RETRIEVAL_P95_BUDGET_MS || 250);
  const fallbackRateBudget = Number(process.env.CHAT_FALLBACK_RATE_BUDGET || 0.1);
  const noMatchRateBudget = Number(process.env.CHAT_NO_MATCH_RATE_BUDGET || 0.1);

  const fixtures = [
    {
      message: 'What policy should I follow for this approval override?',
      expectedSourceHint: 'BusinessDocs/decisions',
      requiredCitationTypes: ['decision', 'policy', 'artifact'],
    },
    {
      message: 'Where in the workspace is the chat message route implemented?',
      expectedSourceHint: 'src/webapp',
      requiredCitationTypes: ['rag_chunk', 'artifact'],
    },
    {
      message: 'Why did the gate fail in the current run?',
      expectedSourceHint: 'BusinessDocs',
      requiredCitationTypes: ['artifact'],
    },
    {
      message: 'What approvals are pending right now?',
      expectedSourceHint: 'BusinessDocs/decisions',
      requiredCitationTypes: ['decision', 'policy', 'artifact'],
    },
  ];

  it('enforces precision, citation validity, and latency budgets for M-UX-2b benchmark fixtures', async () => {
    let relevantHits = 0;
    let totalRetrieved = 0;
    let fallbackCount = 0;
    let noMatchCount = 0;
    const failures = [];

    const isCitationStructurallyValid = (entry) => {
      const sourcePath = String(entry.source_path || '');
      const deepLink = String(entry.deep_link || '');
      const sourceType = String(entry.source_type || '').toLowerCase();
      return (
        sourcePath.length > 0 &&
        deepLink.startsWith('/') &&
        ['artifact', 'decision', 'policy', 'session', 'rag_chunk'].includes(sourceType)
      );
    };

    for (const [index, fixture] of fixtures.entries()) {
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
      if (payload.grounding.fallback_reason !== null) {
        fallbackCount += 1;
        if (payload.grounding.fallback_reason === 'no_matches') {
          noMatchCount += 1;
        }
      }

      const citations = Array.isArray(payload.citations) ? payload.citations : [];
      const invalidCitations = citations.filter((entry) => !isCitationStructurallyValid(entry));
      if (invalidCitations.length > 0) {
        failures.push(
          `fixture#${index + 1} invalid citations: ${invalidCitations
            .map((entry) => JSON.stringify(entry))
            .join('; ')}`
        );
      }

      const groundedOnly = citations.filter(
        (entry) => String(entry.source_type || '').toLowerCase() !== 'session'
      );
      const topThree = groundedOnly.slice(0, 3);
      const relevant = topThree.filter((entry) =>
        String(entry.source_path || '').includes(fixture.expectedSourceHint)
      ).length;

      relevantHits += relevant;
      totalRetrieved += 3;

      if (citations.length === 0) {
        failures.push(
          `fixture#${index + 1} returned zero citations for message: ${fixture.message}`
        );
      }

      if (
        !citations.some((entry) =>
          fixture.requiredCitationTypes.includes(String(entry.source_type || '').toLowerCase())
        )
      ) {
        failures.push(
          `fixture#${index + 1} missing required citation type(s): ${fixture.requiredCitationTypes.join(', ')}`
        );
      }
    }

    const precisionAt3 = relevantHits / totalRetrieved;
    const chatMetricCalls = ctx.recordMetric.mock.calls.filter(
      (call) => call[0] === 'CHAT' && typeof call[1] === 'string'
    );
    const firstTokenDurations = chatMetricCalls
      .filter((call) => call[1] === '/message/first-token-latency')
      .map((call) => Number(call[2]))
      .filter((value) => Number.isFinite(value));
    const retrievalDurations = chatMetricCalls
      .filter((call) => call[1] === '/grounding/retrieval')
      .map((call) => Number(call[2]))
      .filter((value) => Number.isFinite(value));

    const percentile = (values, p) => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
      return sorted[index];
    };

    const firstTokenP95 = percentile(firstTokenDurations, 95);
    const retrievalP95 = percentile(retrievalDurations, 95);
    const fallbackRate = fixtures.length > 0 ? fallbackCount / fixtures.length : 0;
    const noMatchRate = fixtures.length > 0 ? noMatchCount / fixtures.length : 0;

    if (precisionAt3 < 0.75) {
      failures.push(`precision@3 regression: expected >= 0.75, got ${precisionAt3.toFixed(3)}`);
    }
    if (firstTokenP95 > firstTokenP95BudgetMs) {
      failures.push(
        `first-token latency budget exceeded: p95=${firstTokenP95.toFixed(2)}ms budget=${firstTokenP95BudgetMs}ms`
      );
    }
    if (retrievalP95 > retrievalP95BudgetMs) {
      failures.push(
        `retrieval latency budget exceeded: p95=${retrievalP95.toFixed(2)}ms budget=${retrievalP95BudgetMs}ms`
      );
    }
    if (fallbackRate > fallbackRateBudget) {
      failures.push(
        `fallback rate budget exceeded: rate=${fallbackRate.toFixed(3)} budget=${fallbackRateBudget}`
      );
    }
    if (noMatchRate > noMatchRateBudget) {
      failures.push(
        `no-match rate budget exceeded: rate=${noMatchRate.toFixed(3)} budget=${noMatchRateBudget}`
      );
    }

    if (failures.length > 0) {
      throw new Error(`M-UX-2b quality gate failed:\n- ${failures.join('\n- ')}`);
    }
  });
});
