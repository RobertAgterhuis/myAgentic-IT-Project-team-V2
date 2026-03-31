import * as __req_0 from '../../src/webapp/routes/mcp';
const { registerRoutes } = __req_0;
import * as __req_1 from '../../src/webapp/plugins/mcp-governance';
const { McpGovernanceService } = __req_1;
import * as __req_2 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_2;

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
    expect(routes).toHaveProperty('GET /api/v1/mcp/policies');
    expect(routes).toHaveProperty('GET /api/v1/mcp/capabilities');
    expect(routes).toHaveProperty('POST /api/v1/mcp/resolve/server');
    expect(routes).toHaveProperty('POST /api/v1/mcp/resolve/tool');
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

    vi.spyOn(McpGovernanceService.prototype, 'getDefinedPolicies').mockResolvedValue([]);
    const policiesRes = createRes();
    await routes['GET /api/v1/mcp/policies'](createReq('/api/v1/mcp/policies'), policiesRes);
    expect(policiesRes.statusCode).toBe(200);
    expect(parsed(policiesRes).count).toBe(0);

    vi.spyOn(McpGovernanceService.prototype, 'getCapabilityManifest').mockResolvedValue({
      schemaVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      environment: 'dev',
      serverCount: 0,
      agentCount: 0,
      agents: [],
    });

    const capabilitiesRes = createRes();
    await routes['GET /api/v1/mcp/capabilities'](
      createReq('/api/v1/mcp/capabilities'),
      capabilitiesRes
    );
    expect(capabilitiesRes.statusCode).toBe(200);
    expect(parsed(capabilitiesRes).ok).toBe(true);
    expect(parsed(capabilitiesRes).manifest.schemaVersion).toBe('1.0.0');
  });

  it('returns 400 when env_scope is missing and resolves when valid', async () => {
    const routes = createRoutes();

    const missingRes = createRes();
    await routes['POST /api/v1/mcp/resolve/server'](
      createReq('/api/v1/mcp/resolve/server', 'POST', {
        agent_id: 'orchestrator',
        server_id: 'workspace-management',
      }),
      missingRes
    );
    expect(missingRes.statusCode).toBe(400);

    vi.spyOn(McpGovernanceService.prototype, 'resolveServerPermission').mockResolvedValue({
      permissionLevel: 'R',
      approvalRequired: false,
      blocked: false,
    });

    const okRes = createRes();
    await routes['POST /api/v1/mcp/resolve/server'](
      createReq('/api/v1/mcp/resolve/server', 'POST', {
        agent_id: 'orchestrator',
        server_id: 'workspace-management',
        env_scope: 'dev',
      }),
      okRes
    );
    expect(okRes.statusCode).toBe(200);
    expect(parsed(okRes).ok).toBe(true);
  });

  it('returns 403 for invalid env_scope on tool resolve', async () => {
    const routes = createRoutes();
    const res = createRes();
    await routes['POST /api/v1/mcp/resolve/tool'](
      createReq('/api/v1/mcp/resolve/tool', 'POST', {
        agent_id: 'orchestrator',
        server_id: 'workspace-management',
        tool_id: 'workspace-management.default',
        env_scope: 'staging',
      }),
      res
    );
    expect(res.statusCode).toBe(403);
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
