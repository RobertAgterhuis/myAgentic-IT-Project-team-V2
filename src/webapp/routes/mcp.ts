// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { EnvScopeValidationError, McpGovernanceService } from '../plugins/mcp-governance';

function ensureOperatorOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  ctx: ServerContext
): boolean {
  if (!ctx._authMiddleware) return true;

  const user = (request.raw as FastifyRequest['raw'] & { user?: { role?: string } }).user;
  if (!user) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return false;
  }

  const role = user.role || 'viewer';
  if (role !== 'operator' && role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Operator or admin role required'));
    return false;
  }

  return true;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new McpGovernanceService({
    projectRoot: ctx.PROJECT_ROOT,
    storageProvider: ctx.getStorageProvider(),
  });

  app.get('/api/v1/mcp/agents', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const agents = await svc.listAgents();
    return reply.send({ ok: true, count: agents.length, agents });
  });

  app.get('/api/v1/mcp/servers', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const servers = await svc.listServers();
    return reply.send({ ok: true, count: servers.length, servers });
  });

  app.get('/api/v1/mcp/policies', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const policies = await svc.getDefinedPolicies();
    return reply.send({ ok: true, count: policies.length, policies });
  });

  app.get('/api/v1/mcp/capabilities', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const manifest = await svc.getCapabilityManifest();
    return reply.send({ ok: true, manifest });
  });

  app.post('/api/v1/mcp/resolve/server', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const body = (request.body || {}) as Record<string, unknown>;
    const agentId = String(body.agent_id || '');
    const serverId = String(body.server_id || '');

    if (!agentId || !serverId) {
      return reply
        .code(400)
        .send(errorResponse('INVALID_REQUEST', 'agent_id and server_id are required'));
    }

    try {
      const expectedScope =
        process.env.ENV_SCOPE === 'test' || process.env.ENV_SCOPE === 'prod'
          ? process.env.ENV_SCOPE
          : 'dev';
      const environment = svc.validateEnvironmentScope(String(body.env_scope || ''), expectedScope);
      const resolved = await svc.resolveServerPermission(agentId, serverId, environment);
      return reply.send({ ok: true, resolved });
    } catch (error) {
      if (error instanceof EnvScopeValidationError) {
        return reply.code(error.statusCode).send(errorResponse(error.code, error.message));
      }
      throw error;
    }
  });

  app.post('/api/v1/mcp/resolve/tool', { schema: { tags: ['mcp'] } }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;
    const body = (request.body || {}) as Record<string, unknown>;
    const agentId = String(body.agent_id || '');
    const serverId = String(body.server_id || '');
    const toolId = String(body.tool_id || '');

    if (!agentId || !serverId || !toolId) {
      return reply
        .code(400)
        .send(errorResponse('INVALID_REQUEST', 'agent_id, server_id and tool_id are required'));
    }

    try {
      const expectedScope =
        process.env.ENV_SCOPE === 'test' || process.env.ENV_SCOPE === 'prod'
          ? process.env.ENV_SCOPE
          : 'dev';
      const environment = svc.validateEnvironmentScope(String(body.env_scope || ''), expectedScope);
      const resolved = await svc.resolveToolPermission(agentId, serverId, toolId, environment);
      return reply.send({ ok: true, resolved });
    } catch (error) {
      if (error instanceof EnvScopeValidationError) {
        return reply.code(error.statusCode).send(errorResponse(error.code, error.message));
      }
      throw error;
    }
  });
}
