import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/routes/cockpit';
const { registerRoutes } = __req_0;
import * as __req_1 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_1;
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createReq(url = '/api/v1/cockpit/provenance') {
  return {
    url,
    method: 'GET',
    headers: { host: 'localhost:3001' },
  };
}

function createTmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-routes-'));
  fs.mkdirSync(path.join(root, 'BusinessDocs', 'session'), { recursive: true });
  fs.mkdirSync(path.join(root, 'BusinessDocs', 'audit'), { recursive: true });
  return root;
}

function writeJson(root, relativePath, data) {
  const full = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2), 'utf8');
}

function writeAudit(root, lines) {
  const full = path.join(root, 'BusinessDocs', 'audit', 'audit-log.jsonl');
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join('\n') + '\n', 'utf8');
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

function parsed(res) {
  return JSON.parse(res.body);
}

describe('cockpit provenance route', () => {
  it('registers GET /api/v1/cockpit/provenance', () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [],
    });
    expect(routes).toHaveProperty('GET /api/v1/cockpit/provenance');
  });

  it('returns human override events in provenance feed', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [
        {
          type: 'pause',
          rationale: 'Manual checkpoint requested',
          requested_by: 'qa-user',
          timestamp: '2026-03-20T10:00:00.000Z',
          state: 'PHASE_2',
          mode: 'CREATE',
        },
      ],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/provenance'](createReq(), res);

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.items[0].decision_type).toBe('human_override');
    expect(body.items[0].actor).toBe('qa-user');
  });

  it('filters by actor_type and paginates items', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [
        {
          type: 'pause',
          rationale: 'checkpoint 1',
          requested_by: 'qa-1',
          timestamp: '2026-03-20T10:00:00.000Z',
          state: 'PHASE_2',
          mode: 'CREATE',
        },
        {
          type: 'override',
          rationale: 'checkpoint 2',
          requested_by: 'qa-2',
          timestamp: '2026-03-20T10:01:00.000Z',
          state: 'PHASE_2',
          mode: 'CREATE',
        },
        {
          type: 'resume',
          rationale: 'checkpoint 3',
          requested_by: 'qa-3',
          timestamp: '2026-03-20T10:02:00.000Z',
          state: 'PHASE_2',
          mode: 'CREATE',
        },
      ],
    });

    const filteredRes = createRes();
    await routes['GET /api/v1/cockpit/provenance'](
      createReq('/api/v1/cockpit/provenance?actor_type=machine'),
      filteredRes
    );

    expect(filteredRes.statusCode).toBe(200);
    const filteredBody = parsed(filteredRes);
    expect(filteredBody.ok).toBe(true);
    expect(filteredBody.count).toBe(0);
    expect(filteredBody.total).toBe(0);

    const pagedRes = createRes();
    await routes['GET /api/v1/cockpit/provenance'](
      createReq('/api/v1/cockpit/provenance?page=2&page_size=2'),
      pagedRes
    );

    expect(pagedRes.statusCode).toBe(200);
    const pagedBody = parsed(pagedRes);
    expect(pagedBody.ok).toBe(true);
    expect(pagedBody.page).toBe(2);
    expect(pagedBody.page_size).toBe(2);
    expect(pagedBody.total).toBe(3);
    expect(pagedBody.count).toBe(1);
  });

  it('adds feedback propagation markers to human interventions when downstream machine events exist', async () => {
    const root = createTmpRoot();
    writeAudit(root, [
      JSON.stringify({
        event: 'gate_failed',
        description: 'Gate blocked after review',
        phase: 'PHASE_2',
        timestamp: '2026-03-20T10:10:00.000Z',
      }),
    ]);

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [
        {
          type: 'pause',
          rationale: 'Manual checkpoint requested',
          requested_by: 'qa-user',
          timestamp: '2026-03-20T10:00:00.000Z',
          state: 'PHASE_2',
          mode: 'CREATE',
        },
      ],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/provenance'](createReq(), res);

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    const intervention = body.items.find((item) => item.decision_type === 'human_override');
    expect(intervention.feedback_propagation).toBeTruthy();
    expect(intervention.feedback_propagation.status).toBe('observed');
    expect(intervention.feedback_propagation.impacted_event_count).toBe(1);
    expect(intervention.feedback_propagation.downstream_event_types).toEqual(['gate_failure']);
  });

  it('returns computed health scores from session-state', async () => {
    const root = createTmpRoot();
    writeJson(root, 'BusinessDocs/session/session-state.json', {
      gates_passed: 4,
      gates_total: 5,
      decisions_resolved: 8,
      decisions_total: 10,
      questionnaires_complete: 9,
      questionnaires_total: 10,
      error_count: 1,
      stories_ready: 6,
      stories_total: 8,
      blocking_items: 0,
      uncertain_count: 1,
      insufficient_data_count: 0,
      agents_total: 8,
    });

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/health'](createReq('/api/v1/cockpit/health'), res);

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.session_health.score).toBeGreaterThan(0);
    expect(body.sprint_readiness.score).toBeGreaterThan(0);
    expect(body.agent_confidence.score).toBeGreaterThan(0);
  });

  it('returns dependency graph and marks current critical path', async () => {
    const root = createTmpRoot();
    writeJson(root, 'BusinessDocs/session/session-state.json', {
      current_phase: 'PHASE-3',
    });

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/dependencies'](
      createReq('/api/v1/cockpit/dependencies'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.nodes.length).toBeGreaterThan(0);
    expect(body.critical_path).toContain('gate-PHASE-3');
    expect(body.critical_path).toContain('sprint-PHASE-3');
  });

  it('returns executive dashboard KPI payload with traceability entries', async () => {
    const root = createTmpRoot();
    writeJson(root, 'BusinessDocs/metrics/autonomy-benchmark-results.json', {
      scenarios: [
        { mode: 'CREATE', errorRatePct: 2.5, latencyMs: { p95: 1800 } },
        { mode: 'AUDIT', errorRatePct: 1.2, latencyMs: { p95: 2200 } },
      ],
    });
    writeJson(root, 'tests/load/autonomous-lane-traces/trust-dashboard.json', {
      split: {
        autonomous: {
          successRate: 0.94,
          failedCount: 1,
        },
      },
    });
    writeJson(root, 'coverage/coverage-summary.json', {
      total: {
        lines: { pct: 88.5 },
        branches: { pct: 72.4 },
      },
    });
    writeJson(root, 'BusinessDocs/session/finops-ledger.json', {
      usage: [
        { costUsd: 0.15, totalTokens: 1000 },
        { costUsd: 0.05, totalTokens: 500 },
      ],
    });
    writeJson(root, 'BusinessDocs/metrics/release-readiness-report.json', {
      releaseBlocked: false,
    });
    fs.mkdirSync(path.join(root, 'Gaps'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Gaps', 'security-synthesis.md'), '# security\n', 'utf8');

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/executive-dashboard'](
      createReq('/api/v1/cockpit/executive-dashboard'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.data.kpis.reliability.maxP95Ms).toBe(2200);
    expect(body.data.kpis.cost.totalCostUsd).toBe(0.2);
    expect(body.data.traceability.length).toBe(3);
    expect(
      fs.existsSync(path.join(root, 'BusinessDocs', 'metrics', 'executive-release-dashboard.json'))
    ).toBe(true);
  });

  it('builds root-cause items from audit log and filters by session_id', async () => {
    const root = createTmpRoot();
    writeAudit(root, [
      JSON.stringify({
        event: 'gate_failed',
        session_id: 's-1',
        description: 'Gate failed',
        agent: 'Architect',
        timestamp: '2026-03-20T10:00:00.000Z',
      }),
      JSON.stringify({
        event: 'error',
        session_id: 's-2',
        message: 'Unhandled exception',
        timestamp: '2026-03-20T10:01:00.000Z',
      }),
      '{ malformed json line',
    ]);

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/cockpit/root-cause'](
      createReq('/api/v1/cockpit/root-cause?session_id=s-1'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.session_id).toBe('s-1');
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe('gate_failure');
  });

  it('returns fallback approval detail when engine is unavailable', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/:id/detail'](
      createReq('/api/v1/approvals/apr-1/detail'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.approval.id).toBe('apr-1');
  });

  it('returns 400 for empty approval id', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/:id/detail'](
      {
        url: '/api/v1/approvals//detail',
        method: 'GET',
        params: { id: '' },
        headers: { host: 'localhost:3001' },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(parsed(res).error).toContain('Approval ID is required');
  });

  it('returns 404 when approval id is not found in registry', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [],
      _getEngine: () => ({
        approvalRegistry: {
          get: () => null,
        },
      }),
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/:id/detail'](
      createReq('/api/v1/approvals/apr-missing/detail'),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(parsed(res).code).toBe('NOT_FOUND');
  });

  it('returns approval detail from engine registry', async () => {
    const approval = { id: 'apr-2', status: 'PENDING', gate_id: 'G-1' };
    const routes = createTestableRoutes(registerRoutes, {
      _getHumanOverrideEvents: () => [],
      _getEngine: () => ({
        approvalRegistry: {
          get: () => approval,
        },
      }),
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/:id/detail'](
      createReq('/api/v1/approvals/apr-2/detail'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.approval.id).toBe('apr-2');
  });

  it('adds deliverable quality evidence when a related artifact is available', async () => {
    const root = createTmpRoot();
    const artifactPath = path.join(root, 'BusinessDocs', 'Phase2-Tech', 'quality-check.md');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(
      artifactPath,
      [
        '# Architecture Review',
        '',
        '## Findings',
        '- Source: docs/architecture/system.md',
        '',
        '## HANDOFF CHECKLIST',
        '- [x] All required sections are filled',
        '- [x] All findings include a source reference',
      ].join('\n'),
      'utf8'
    );

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
      _getEngine: () => ({
        approvalRegistry: {
          get: () => ({
            id: 'apr-3',
            status: 'PENDING',
            gate_id: 'G-2',
            related_artifacts: ['BusinessDocs/Phase2-Tech/quality-check.md'],
          }),
        },
      }),
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/:id/detail'](
      createReq('/api/v1/approvals/apr-3/detail'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.approval.deliverable_quality).toBeTruthy();
    expect(body.approval.deliverable_quality.source_artifact).toBe(
      'BusinessDocs/Phase2-Tech/quality-check.md'
    );
  });

  it('returns approvals history from audit log', async () => {
    const root = createTmpRoot();
    writeAudit(root, [
      JSON.stringify({
        event: 'approval_decided',
        approval_id: 'APR-1',
        action: 'APPROVED',
        user: 'reviewer',
        reason: 'Looks good',
        timestamp: '2026-03-20T10:00:00.000Z',
      }),
      JSON.stringify({ event: 'gate_failed', timestamp: '2026-03-20T10:01:00.000Z' }),
    ]);

    const routes = createTestableRoutes(registerRoutes, {
      PROJECT_ROOT: root,
      _getHumanOverrideEvents: () => [],
    });

    const res = createRes();
    await routes['GET /api/v1/approvals/history'](createReq('/api/v1/approvals/history'), res);

    expect(res.statusCode).toBe(200);
    const body = parsed(res);
    expect(body.ok).toBe(true);
    expect(body.history).toHaveLength(1);
    expect(body.history[0].approval_id).toBe('APR-1');
  });
});
