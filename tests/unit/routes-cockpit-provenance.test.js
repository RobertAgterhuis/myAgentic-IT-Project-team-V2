// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerRoutes } = require('../../src/webapp/routes/cockpit');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createReq(url = '/api/v1/cockpit/provenance') {
  return {
    url,
    method: 'GET',
    headers: { host: 'localhost:3001' },
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
});
