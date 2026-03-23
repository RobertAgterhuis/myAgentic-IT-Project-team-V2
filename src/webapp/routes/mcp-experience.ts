// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M-INFRA-3c: MCP Experience Plane routes (#846–#849, #851–#852)

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { McpGovernanceService } from '../plugins/mcp-governance';
import type { PermissionLevel } from '../plugins/mcp-governance/types';

function ensureAdmin(request: FastifyRequest, reply: FastifyReply, ctx: ServerContext): boolean {
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

function ensureAdminOnly(
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

  if (user.role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Admin role required'));
    return false;
  }

  return true;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new McpGovernanceService({
    projectRoot: ctx.PROJECT_ROOT,
    storageProvider: ctx.getStorageProvider(),
  });

  // ── GET /api/v1/mcp/matrix (#846) ────────────────────────────────
  app.get(
    '/api/v1/mcp/matrix',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;
      const matrix = await svc.getMatrix();
      return reply.send({ ok: true, ...matrix });
    }
  );

  // ── GET /api/v1/mcp/agents/:agentId/permissions (#847) ──────────
  app.get(
    '/api/v1/mcp/agents/:agentId/permissions',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;
      const { agentId } = request.params as { agentId: string };
      if (!agentId || typeof agentId !== 'string' || agentId.length > 128) {
        return reply
          .code(400)
          .send(errorResponse('INVALID_REQUEST', 'agentId is required and must be a valid string'));
      }
      const view = await svc.getAgentPermissions(agentId);
      if (!view) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Agent not found: ${agentId}`));
      }
      return reply.send({ ok: true, ...view });
    }
  );

  // ── GET /api/v1/mcp/overrides (#848) ────────────────────────────
  app.get(
    '/api/v1/mcp/overrides',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;
      const overrides = await svc.listOverrides();
      return reply.send({ ok: true, count: overrides.length, overrides });
    }
  );

  // ── POST /api/v1/mcp/overrides (#848) ───────────────────────────
  app.post(
    '/api/v1/mcp/overrides',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdminOnly(request, reply, ctx)) return;
      const body = (request.body || {}) as Record<string, unknown>;

      const agentId = String(body.agent_id || '');
      const serverId = String(body.server_id || '');
      const permissionLevel = String(body.permission_level || '');
      const overrideReason = String(body.override_reason || '');
      const justification = String(body.justification || '');
      const expiry = String(body.expiry || '');
      const author = String(body.author || 'system');
      const toolId = body.tool_id ? String(body.tool_id) : undefined;

      if (!agentId || !serverId || !permissionLevel || !overrideReason || !expiry) {
        return reply
          .code(400)
          .send(
            errorResponse(
              'INVALID_REQUEST',
              'agent_id, server_id, permission_level, override_reason and expiry are required'
            )
          );
      }

      const validLevels = ['N', 'D', 'R', 'P', 'W', 'A', 'X'];
      if (!validLevels.includes(permissionLevel)) {
        return reply
          .code(400)
          .send(
            errorResponse(
              'INVALID_REQUEST',
              `permission_level must be one of: ${validLevels.join(', ')}`
            )
          );
      }

      const expiryDate = new Date(expiry);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return reply
          .code(400)
          .send(errorResponse('INVALID_REQUEST', 'expiry must be a future ISO-8601 date-time'));
      }

      const override = await svc.createOverride({
        agentId,
        serverId,
        toolId,
        permissionLevel: permissionLevel as PermissionLevel,
        overrideReason,
        author,
        justification,
        expiry,
      });
      return reply.code(201).send({ ok: true, override });
    }
  );

  // ── DELETE /api/v1/mcp/overrides/:id (#848) ─────────────────────
  app.delete(
    '/api/v1/mcp/overrides/:id',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdminOnly(request, reply, ctx)) return;
      const { id } = request.params as { id: string };
      const expired = await svc.expireOverride(id);
      if (!expired) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Override not found: ${id}`));
      }
      return reply.send({ ok: true, id, expired: true });
    }
  );

  // ── GET /api/v1/mcp/diagnostics (#849) ──────────────────────────
  app.get(
    '/api/v1/mcp/diagnostics',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;
      const report = await svc.getDiagnostics();
      return reply.send({ ok: true, ...report });
    }
  );

  // ── GET /api/v1/mcp/reconcile-runs (#852) ───────────────────────
  app.get(
    '/api/v1/mcp/reconcile-runs',
    { schema: { tags: ['mcp-experience'] } },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;
      const runs = await svc.listReconcileRuns();
      return reply.send({ ok: true, count: runs.length, runs });
    }
  );
}
