'use strict';

const { registerRoutes } = require('../../src/webapp/routes/artifacts');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createReq(url, method = 'GET', body, params) {
  return {
    url,
    method,
    body,
    params,
    query: Object.fromEntries(new URL(`http://localhost${url}`).searchParams),
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

function parseJson(res) {
  return res.body ? JSON.parse(res.body) : {};
}

describe('routes/artifacts', () => {
  it('registers artifact endpoints', () => {
    const routes = createTestableRoutes(registerRoutes, {});
    expect(routes).toHaveProperty('GET /api/v1/artifacts');
    expect(routes).toHaveProperty('GET /api/v1/artifacts/stats');
    expect(routes).toHaveProperty('GET /api/v1/artifacts/:id');
    expect(routes).toHaveProperty('GET /api/v1/artifacts/:id/lineage');
  });

  it('returns 503 when registry is unavailable', async () => {
    const routes = createTestableRoutes(registerRoutes, { _getEngine: undefined });

    const listRes = createRes();
    await routes['GET /api/v1/artifacts'](createReq('/api/v1/artifacts'), listRes);
    expect(listRes.statusCode).toBe(503);

    const statsRes = createRes();
    await routes['GET /api/v1/artifacts/stats'](createReq('/api/v1/artifacts/stats'), statsRes);
    expect(statsRes.statusCode).toBe(503);

    const detailRes = createRes();
    await routes['GET /api/v1/artifacts/:id'](
      createReq('/api/v1/artifacts/ART-1', 'GET', undefined, { id: 'ART-1' }),
      detailRes
    );
    expect(detailRes.statusCode).toBe(503);
  });

  it('lists artifacts and applies query filters', async () => {
    const list = vi.fn().mockReturnValue([{ id: 'A1' }, { id: 'A2' }]);
    const registry = {
      list,
      get: vi.fn(),
      getLineage: vi.fn(),
      stats: vi.fn(),
    };
    const routes = createTestableRoutes(registerRoutes, {
      _getEngine: () => ({ artifactRegistry: registry }),
    });

    const res = createRes();
    await routes['GET /api/v1/artifacts'](
      createReq('/api/v1/artifacts?stage=IMPLEMENTATION&type=CODE&status=DRAFT'),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = parseJson(res);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(2);
    expect(list).toHaveBeenCalledWith({
      stage: 'IMPLEMENTATION',
      artifact_type: 'CODE',
      status: 'DRAFT',
    });
  });

  it('returns stats payload from registry', async () => {
    const registry = {
      list: vi.fn(),
      get: vi.fn(),
      getLineage: vi.fn(),
      stats: vi.fn().mockReturnValue({ total: 7, byStage: { REQUIREMENTS: 3 } }),
    };
    const routes = createTestableRoutes(registerRoutes, {
      _getEngine: () => ({ artifactRegistry: registry }),
    });

    const res = createRes();
    await routes['GET /api/v1/artifacts/stats'](createReq('/api/v1/artifacts/stats'), res);

    expect(res.statusCode).toBe(200);
    expect(parseJson(res)).toEqual({
      ok: true,
      stats: { total: 7, byStage: { REQUIREMENTS: 3 } },
    });
  });

  it('returns 404 for missing artifact detail and lineage', async () => {
    const registry = {
      list: vi.fn(),
      get: vi.fn().mockReturnValue(undefined),
      getLineage: vi.fn(),
      stats: vi.fn(),
    };
    const routes = createTestableRoutes(registerRoutes, {
      _getEngine: () => ({ artifactRegistry: registry }),
    });

    const detailRes = createRes();
    await routes['GET /api/v1/artifacts/:id'](
      createReq('/api/v1/artifacts/ART-MISSING', 'GET', undefined, { id: 'ART-MISSING' }),
      detailRes
    );
    expect(detailRes.statusCode).toBe(404);

    const lineageRes = createRes();
    await routes['GET /api/v1/artifacts/:id/lineage'](
      createReq('/api/v1/artifacts/ART-MISSING/lineage', 'GET', undefined, { id: 'ART-MISSING' }),
      lineageRes
    );
    expect(lineageRes.statusCode).toBe(404);
  });

  it('returns artifact detail and lineage for known id', async () => {
    const artifact = { id: 'ART-42', name: 'spec.md' };
    const lineage = { upstream: [], downstream: [] };
    const registry = {
      list: vi.fn(),
      get: vi.fn().mockReturnValue(artifact),
      getLineage: vi.fn().mockReturnValue(lineage),
      stats: vi.fn(),
    };
    const routes = createTestableRoutes(registerRoutes, {
      _getEngine: () => ({ artifactRegistry: registry }),
    });

    const detailRes = createRes();
    await routes['GET /api/v1/artifacts/:id'](
      createReq('/api/v1/artifacts/ART-42', 'GET', undefined, { id: 'ART-42' }),
      detailRes
    );
    expect(detailRes.statusCode).toBe(200);
    expect(parseJson(detailRes)).toEqual({ ok: true, artifact });

    const lineageRes = createRes();
    await routes['GET /api/v1/artifacts/:id/lineage'](
      createReq('/api/v1/artifacts/ART-42/lineage', 'GET', undefined, { id: 'ART-42' }),
      lineageRes
    );
    expect(lineageRes.statusCode).toBe(200);
    expect(parseJson(lineageRes)).toEqual({ ok: true, artifact_id: 'ART-42', lineage });
  });
});
