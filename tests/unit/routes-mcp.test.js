'use strict';

const { registerRoutes } = require('../../src/webapp/routes/mcp');
const { McpGovernanceService } = require('../../src/webapp/plugins/mcp-governance');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createReq(url, method = 'GET', body, user) {
  return {
    url,
    method,
    body,
    headers: { host: 'localhost:3001', 'content-type': 'application/json' },
    user,
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    code(code) {
      res.statusCode = code;
      return res;
    },
    send(payload) {
      res.body = JSON.stringify(payload);
      return res;
    },
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
    PROJECT_ROOT: process.cwd(),
    getStorageProvider: () => null,
    _authMiddleware: null,
    ...ctxOverrides,
  });
}

describe('routes/mcp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers endpoints', () => {
    const routes = createRoutes();
    expect(routes).toHaveProperty('GET /api/v1/mcp/agents');
    expect(routes).toHaveProperty('GET /api/v1/mcp/servers');
  });

  it('returns catalog and registry payloads', async () => {
    vi.spyOn(McpGovernanceService.prototype, 'listAgents').mockResolvedValue([
      { id: 'orchestrator' },
    ]);
    vi.spyOn(McpGovernanceService.prototype, 'listServers').mockResolvedValue([]);

    const routes = createRoutes();

    const agentsRes = createRes();
    await routes['GET /api/v1/mcp/agents'](createReq('/api/v1/mcp/agents'), agentsRes);
    expect(agentsRes.statusCode).toBe(200);
    expect(parsed(agentsRes).count).toBe(1);

    const serversRes = createRes();
    await routes['GET /api/v1/mcp/servers'](createReq('/api/v1/mcp/servers'), serversRes);
    expect(serversRes.statusCode).toBe(200);
    expect(parsed(serversRes).count).toBe(0);
  });

  it('enforces operator/admin role when auth middleware is active', async () => {
    const routes = createRoutes({ _authMiddleware: { enabled: true } });

    const unauth = createRes();
    await routes['GET /api/v1/mcp/agents'](
      createReq('/api/v1/mcp/agents', 'GET', undefined),
      unauth
    );
    expect(unauth.statusCode).toBe(401);

    const forbidden = createRes();
    await routes['GET /api/v1/mcp/servers'](
      createReq('/api/v1/mcp/servers', 'GET', undefined, { role: 'viewer' }),
      forbidden
    );
    expect(forbidden.statusCode).toBe(403);

    vi.spyOn(McpGovernanceService.prototype, 'listAgents').mockResolvedValue([
      { id: 'orchestrator' },
    ]);
    const allowed = createRes();
    await routes['GET /api/v1/mcp/agents'](
      createReq('/api/v1/mcp/agents', 'GET', undefined, { role: 'operator' }),
      allowed
    );
    expect(allowed.statusCode).toBe(200);
  });
});
