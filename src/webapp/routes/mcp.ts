// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { McpGovernanceService } from '../plugins/mcp-governance';

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
}
