// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerContext } from '../../src/webapp/context';
import { registerRoutes } from '../../src/webapp/routes/mcp-experience';

const governanceMocks = vi.hoisted(() => ({
  getMatrix: vi.fn(),
  getAgentPermissions: vi.fn(),
  listOverrides: vi.fn(),
  createOverride: vi.fn(),
  expireOverride: vi.fn(),
  getDiagnostics: vi.fn(),
  listReconcileRuns: vi.fn(),
}));

vi.mock('../../src/webapp/plugins/mcp-governance', () => {
  class MockMcpGovernanceService {
    getMatrix = governanceMocks.getMatrix;
    getAgentPermissions = governanceMocks.getAgentPermissions;
    listOverrides = governanceMocks.listOverrides;
    createOverride = governanceMocks.createOverride;
    expireOverride = governanceMocks.expireOverride;
    getDiagnostics = governanceMocks.getDiagnostics;
    listReconcileRuns = governanceMocks.listReconcileRuns;
  }

  return { McpGovernanceService: MockMcpGovernanceService };
});

function baseContext(authEnabled = true): ServerContext {
  return {
    PROJECT_ROOT: process.cwd(),
    getStorageProvider: () => null,
    _authMiddleware: authEnabled ? ({} as ServerContext['_authMiddleware']) : null,
  } as unknown as ServerContext;
}

function attachRoleHook(app: FastifyInstance): void {
  app.addHook('preHandler', async (request) => {
    const role = request.headers['x-role'];
    if (!role) return;
    (request.raw as { user?: { role: string } }).user = {
      role: Array.isArray(role) ? role[0] : String(role),
    };
  });
}

describe('routes/mcp-experience', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    Object.values(governanceMocks).forEach((fn) => fn.mockReset());

    governanceMocks.getMatrix.mockResolvedValue({ rows: [{ agentId: 'architect', level: 'R' }] });
    governanceMocks.getAgentPermissions.mockResolvedValue({
      agentId: 'architect',
      permissions: [{ serverId: 'svc-1', permissionLevel: 'R' }],
    });
    governanceMocks.listOverrides.mockResolvedValue([
      {
        id: 'override-1',
        agentId: 'architect',
        serverId: 'svc-1',
        permissionLevel: 'W',
      },
    ]);
    governanceMocks.createOverride.mockResolvedValue({
      id: 'override-2',
      agentId: 'architect',
      serverId: 'svc-1',
      permissionLevel: 'W',
    });
    governanceMocks.expireOverride.mockResolvedValue(true);
    governanceMocks.getDiagnostics.mockResolvedValue({ drift: [], summary: { issues: 0 } });
    governanceMocks.listReconcileRuns.mockResolvedValue([{ runId: 'run-1', status: 'success' }]);

    app = Fastify({ logger: false });
    attachRoleHook(app);
    await registerRoutes(app, baseContext(true));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 when auth is required and no user is present', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/mcp/matrix' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for viewer role on operator/admin endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/matrix',
      headers: { 'x-role': 'viewer' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns matrix for operator role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/matrix',
      headers: { 'x-role': 'operator' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(governanceMocks.getMatrix).toHaveBeenCalledTimes(1);
  });

  it('validates and returns per-agent permissions', async () => {
    const invalidRes = await app.inject({
      method: 'GET',
      url: `/api/v1/mcp/agents/${'a'.repeat(129)}/permissions`,
      headers: { 'x-role': 'admin' },
    });
    expect(invalidRes.statusCode).toBe(404);

    governanceMocks.getAgentPermissions.mockResolvedValueOnce(null);
    const notFoundRes = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/agents/missing/permissions',
      headers: { 'x-role': 'admin' },
    });
    expect(notFoundRes.statusCode).toBe(404);

    const okRes = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/agents/architect/permissions',
      headers: { 'x-role': 'admin' },
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.json().agentId).toBe('architect');
  });

  it('lists overrides for operator and validates admin-only creation', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'operator' },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().count).toBe(1);

    const nonAdminCreate = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'operator' },
      payload: {},
    });
    expect(nonAdminCreate.statusCode).toBe(403);

    const missingFieldRes = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'admin' },
      payload: { agent_id: 'architect' },
    });
    expect(missingFieldRes.statusCode).toBe(400);

    const invalidPermissionRes = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'admin' },
      payload: {
        agent_id: 'architect',
        server_id: 'svc-1',
        permission_level: 'Z',
        override_reason: 'test',
        expiry: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    expect(invalidPermissionRes.statusCode).toBe(400);

    const invalidExpiryRes = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'admin' },
      payload: {
        agent_id: 'architect',
        server_id: 'svc-1',
        permission_level: 'R',
        override_reason: 'test',
        expiry: new Date(Date.now() - 60_000).toISOString(),
      },
    });
    expect(invalidExpiryRes.statusCode).toBe(400);

    const createPayload = {
      agent_id: 'architect',
      server_id: 'svc-1',
      tool_id: 'tool-123',
      permission_level: 'W',
      override_reason: 'incident-mitigation',
      justification: 'temporary elevated write for rollback',
      expiry: new Date(Date.now() + 3600_000).toISOString(),
      author: 'admin-user',
    };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/mcp/overrides',
      headers: { 'x-role': 'admin' },
      payload: createPayload,
    });

    expect(createRes.statusCode).toBe(201);
    expect(governanceMocks.createOverride).toHaveBeenCalledWith({
      agentId: 'architect',
      serverId: 'svc-1',
      toolId: 'tool-123',
      permissionLevel: 'W',
      overrideReason: 'incident-mitigation',
      author: 'admin-user',
      justification: 'temporary elevated write for rollback',
      expiry: createPayload.expiry,
    });
  });

  it('handles override expiration and diagnostics surfaces', async () => {
    governanceMocks.expireOverride.mockResolvedValueOnce(false);
    const missingRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/mcp/overrides/missing-id',
      headers: { 'x-role': 'admin' },
    });
    expect(missingRes.statusCode).toBe(404);

    const expireRes = await app.inject({
      method: 'DELETE',
      url: '/api/v1/mcp/overrides/override-1',
      headers: { 'x-role': 'admin' },
    });
    expect(expireRes.statusCode).toBe(200);
    expect(expireRes.json().expired).toBe(true);

    const diagnosticsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/diagnostics',
      headers: { 'x-role': 'operator' },
    });
    expect(diagnosticsRes.statusCode).toBe(200);
    expect(diagnosticsRes.json().ok).toBe(true);

    const runsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/mcp/reconcile-runs',
      headers: { 'x-role': 'admin' },
    });
    expect(runsRes.statusCode).toBe(200);
    expect(runsRes.json().count).toBe(1);
  });

  it('allows requests without auth middleware configured', async () => {
    const authless = Fastify({ logger: false });
    await registerRoutes(authless, baseContext(false));
    await authless.ready();
    try {
      const res = await authless.inject({ method: 'GET', url: '/api/v1/mcp/matrix' });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
    } finally {
      await authless.close();
    }
  });
});
