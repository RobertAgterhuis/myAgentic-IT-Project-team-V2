// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/routes/policies';
const { registerRoutes } = __req_0;
import * as __req_1 from '../../src/webapp/services';
const { PolicyService, PolicyValidationError, PolicyNotFoundError } = __req_1;
import * as __req_2 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_2;

function createReq(url, method = 'GET', body) {
  return {
    url,
    method,
    body,
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

function parsed(res) {
  return JSON.parse(res.body);
}

function createRoutes(ctxOverrides = {}) {
  return createTestableRoutes(registerRoutes, {
    projectRoot: process.cwd(),
    sseNotify: vi.fn(),
    ...ctxOverrides,
  });
}

describe('routes/policies', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers policy endpoints', () => {
    const routes = createRoutes();
    expect(routes).toHaveProperty('GET /api/v1/policies');
    expect(routes).toHaveProperty('GET /api/v1/policies/packs');
    expect(routes).toHaveProperty('GET /api/v1/policies/signals');
    expect(routes).toHaveProperty('POST /api/v1/policies/evaluate');
    expect(routes).toHaveProperty('POST /api/v1/policies/update');
    expect(routes).toHaveProperty('POST /api/v1/policies/exceptions');
  });

  it('returns policies list and handles list failures', async () => {
    vi.spyOn(PolicyService.prototype, 'listPolicies').mockReturnValue({ policies: [], count: 0 });
    const routes = createRoutes();

    const okRes = createRes();
    await routes['GET /api/v1/policies'](createReq('/api/v1/policies'), okRes);
    expect(okRes.statusCode).toBe(200);
    expect(parsed(okRes).count).toBe(0);

    vi.spyOn(PolicyService.prototype, 'listPolicies').mockImplementation(() => {
      throw new Error('list failed');
    });
    const failRoutes = createRoutes();
    const failRes = createRes();
    await failRoutes['GET /api/v1/policies'](createReq('/api/v1/policies'), failRes);
    expect(failRes.statusCode).toBe(500);
    expect(parsed(failRes).code).toBe('INTERNAL_ERROR');
  });

  it('returns policy packs and signals', async () => {
    vi.spyOn(PolicyService.prototype, 'listPolicyPacks').mockReturnValue({ packs: [], count: 0 });
    vi.spyOn(PolicyService.prototype, 'listPolicySignals').mockReturnValue({
      checks: { coverage_threshold: true },
      signals: [
        {
          check: 'coverage_threshold',
          passed: true,
          source: 'coverage-summary.json',
        },
      ],
      missing: [],
      generated_at: new Date().toISOString(),
    });

    const routes = createRoutes();

    const packsRes = createRes();
    await routes['GET /api/v1/policies/packs'](createReq('/api/v1/policies/packs'), packsRes);
    expect(packsRes.statusCode).toBe(200);
    expect(parsed(packsRes).count).toBe(0);

    const signalsRes = createRes();
    await routes['GET /api/v1/policies/signals'](createReq('/api/v1/policies/signals'), signalsRes);
    expect(signalsRes.statusCode).toBe(200);
    expect(parsed(signalsRes).signals.length).toBe(1);
  });

  it('maps packs/signals endpoint failures to 500', async () => {
    vi.spyOn(PolicyService.prototype, 'listPolicyPacks').mockImplementation(() => {
      throw new Error('packs unavailable');
    });
    vi.spyOn(PolicyService.prototype, 'listPolicySignals').mockImplementation(() => {
      throw new Error('signals unavailable');
    });

    const routes = createRoutes();

    const packsRes = createRes();
    await routes['GET /api/v1/policies/packs'](createReq('/api/v1/policies/packs'), packsRes);
    expect(packsRes.statusCode).toBe(500);
    expect(parsed(packsRes).code).toBe('INTERNAL_ERROR');

    const signalsRes = createRes();
    await routes['GET /api/v1/policies/signals'](createReq('/api/v1/policies/signals'), signalsRes);
    expect(signalsRes.statusCode).toBe(500);
    expect(parsed(signalsRes).code).toBe('INTERNAL_ERROR');
  });

  it('evaluates policies using provided checks and inferred checks', async () => {
    const evaluateSpy = vi.spyOn(PolicyService.prototype, 'evaluatePolicies').mockReturnValue({
      evaluation: {
        verdict: 'PASS',
        summary: { total: 1, passed: 1, failed: 0, blocking_failures: 0 },
        results: [],
      },
    });

    const listSignalsSpy = vi.spyOn(PolicyService.prototype, 'listPolicySignals').mockReturnValue({
      checks: { coverage_threshold: true },
      signals: [],
      missing: [],
      generated_at: new Date().toISOString(),
    });

    const ctx = { sseNotify: vi.fn(), projectRoot: process.cwd() };
    const routes = createRoutes(ctx);

    const withChecksRes = createRes();
    await routes['POST /api/v1/policies/evaluate'](
      createReq('/api/v1/policies/evaluate', 'POST', {
        context_type: 'gate',
        scope: 'global',
        checks: { c1: true },
      }),
      withChecksRes
    );
    expect(withChecksRes.statusCode).toBe(200);

    const inferredChecksRes = createRes();
    await routes['POST /api/v1/policies/evaluate'](
      createReq('/api/v1/policies/evaluate', 'POST', {
        context_type: 'gate',
        scope: 'global',
        checks: {},
      }),
      inferredChecksRes
    );
    expect(inferredChecksRes.statusCode).toBe(200);
    expect(evaluateSpy).toHaveBeenCalledTimes(2);
    expect(listSignalsSpy).toHaveBeenCalledTimes(1);
    expect(ctx.sseNotify).toHaveBeenCalled();
  });

  it('returns 500 when evaluate throws', async () => {
    vi.spyOn(PolicyService.prototype, 'evaluatePolicies').mockImplementation(() => {
      throw new Error('evaluate failed');
    });

    const routes = createRoutes();
    const res = createRes();

    await routes['POST /api/v1/policies/evaluate'](
      createReq('/api/v1/policies/evaluate', 'POST', {
        context_type: 'gate',
        scope: 'global',
        checks: { c1: true },
      }),
      res
    );

    expect(res.statusCode).toBe(500);
    expect(parsed(res).code).toBe('INTERNAL_ERROR');
  });

  it('updates policies and maps update errors', async () => {
    vi.spyOn(PolicyService.prototype, 'updatePolicy').mockReturnValue({
      ok: true,
      policy: {
        id: 'P-1',
        name: 'Policy 1',
        scope: 'global',
      },
    });

    const ctx = { sseNotify: vi.fn(), projectRoot: process.cwd() };
    const routes = createRoutes(ctx);
    const okRes = createRes();
    await routes['POST /api/v1/policies/update'](
      createReq('/api/v1/policies/update', 'POST', { policy_id: 'P-1', name: 'Policy 1' }),
      okRes
    );
    expect(okRes.statusCode).toBe(200);
    expect(ctx.sseNotify).toHaveBeenCalled();

    vi.spyOn(PolicyService.prototype, 'updatePolicy').mockImplementation(() => {
      throw new PolicyValidationError('bad input');
    });
    const validationRoutes = createRoutes();
    const badRes = createRes();
    await validationRoutes['POST /api/v1/policies/update'](
      createReq('/api/v1/policies/update', 'POST', { policy_id: '' }),
      badRes
    );
    expect(badRes.statusCode).toBe(400);

    vi.spyOn(PolicyService.prototype, 'updatePolicy').mockImplementation(() => {
      throw new PolicyNotFoundError('missing');
    });
    const notFoundRoutes = createRoutes();
    const missingRes = createRes();
    await notFoundRoutes['POST /api/v1/policies/update'](
      createReq('/api/v1/policies/update', 'POST', { policy_id: 'missing' }),
      missingRes
    );
    expect(missingRes.statusCode).toBe(404);

    vi.spyOn(PolicyService.prototype, 'updatePolicy').mockImplementation(() => {
      throw new Error('unexpected');
    });
    const failRoutes = createRoutes();
    const failRes = createRes();
    await failRoutes['POST /api/v1/policies/update'](
      createReq('/api/v1/policies/update', 'POST', { policy_id: 'P-1' }),
      failRes
    );
    expect(failRes.statusCode).toBe(500);
  });

  it('creates policy exceptions and maps exception errors', async () => {
    vi.spyOn(PolicyService.prototype, 'createException').mockReturnValue({
      ok: true,
      policy_id: 'P-1',
      exception: { id: 'EX-1' },
    });

    const ctx = { sseNotify: vi.fn(), projectRoot: process.cwd() };
    const routes = createRoutes(ctx);
    const okRes = createRes();
    await routes['POST /api/v1/policies/exceptions'](
      createReq('/api/v1/policies/exceptions', 'POST', {
        policy_id: 'P-1',
        reason: 'Temporary',
        approved_by: 'architect',
        expires: '2027-01-01T00:00:00.000Z',
      }),
      okRes
    );
    expect(okRes.statusCode).toBe(201);
    expect(ctx.sseNotify).toHaveBeenCalled();

    vi.spyOn(PolicyService.prototype, 'createException').mockImplementation(() => {
      throw new PolicyValidationError('invalid exception');
    });
    const badRoutes = createRoutes();
    const badRes = createRes();
    await badRoutes['POST /api/v1/policies/exceptions'](
      createReq('/api/v1/policies/exceptions', 'POST', { policy_id: 'P-1' }),
      badRes
    );
    expect(badRes.statusCode).toBe(400);

    vi.spyOn(PolicyService.prototype, 'createException').mockImplementation(() => {
      throw new PolicyNotFoundError('missing policy');
    });
    const missingRoutes = createRoutes();
    const missingRes = createRes();
    await missingRoutes['POST /api/v1/policies/exceptions'](
      createReq('/api/v1/policies/exceptions', 'POST', { policy_id: 'missing' }),
      missingRes
    );
    expect(missingRes.statusCode).toBe(404);

    vi.spyOn(PolicyService.prototype, 'createException').mockImplementation(() => {
      throw new Error('unexpected exception path');
    });
    const failRoutes = createRoutes();
    const failRes = createRes();
    await failRoutes['POST /api/v1/policies/exceptions'](
      createReq('/api/v1/policies/exceptions', 'POST', { policy_id: 'P-1' }),
      failRes
    );
    expect(failRes.statusCode).toBe(500);
  });
});
