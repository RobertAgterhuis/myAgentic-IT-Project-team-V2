// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Command queue route handlers — POST/GET /api/command.
 *
 * Thin HTTP wrapper over CommandService (M20-003).
 *
 * @module routes/commands
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import { CommandService, ServiceValidationError, toServiceContext } from '../services';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { RESPONSES as R } from '../strings';
import { structuredLog, checkSecretsInBody } from '../middleware';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new CommandService(toServiceContext(ctx as unknown as Record<string, unknown>));
  const correlationIdFor = (request: {
    id?: string;
    headers?: Record<string, unknown>;
  }): string => {
    const headerId = String(request.headers?.['x-correlation-id'] || '').trim();
    return headerId || String(request.id || 'n/a');
  };

  // Expose helpers for cross-module use (progress needs getLatestCommand + readCommandQueue)
  ctx._readCommandQueue = () => svc.getQueue();
  ctx._getLatestCommand = () => svc.getLatest();

  app.post('/api/command', { schema: RS.commandCreate }, async (request, reply) => {
    const correlationId = correlationIdFor(request);
    reply.header('x-correlation-id', correlationId);
    const body = request.body as Record<string, unknown>;

    const cmdSecrets = checkSecretsInBody(body, ['description', 'brief']);
    if (cmdSecrets.length > 0)
      structuredLog('warn', 'secret_pattern_in_command', {
        patterns: cmdSecrets,
        command: body.command,
      });

    try {
      const result = await svc.queue(
        {
          command: body.command as string,
          project: body.project as string | undefined,
          description: body.description as string | undefined,
          scope: body.scope as string | undefined,
          brief: body.brief as string | undefined,
          execution_mode: body.execution_mode as 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID' | undefined,
        },
        'webapp'
      );

      ctx.sseNotify('command_queued', {
        type: 'command_queued',
        command: (body.command as string).trim(),
        project: result.clipboard_text,
        timestamp: new Date().toISOString(),
      });

      const cmdResponse = {
        ok: true,
        clipboard_text: result.clipboard_text,
        brief_saved: result.brief_saved,
        correlation_id: correlationId,
        degraded: svc.getQueueHealth().degraded,
        message: R.commandQueued(result.clipboard_text),
      };
      attachSecretWarnings(cmdResponse, cmdSecrets);
      return reply.type('application/json').send(cmdResponse);
    } catch (e) {
      if (e instanceof ServiceValidationError) {
        structuredLog('warn', 'command_queue_validation_error', {
          correlation_id: correlationId,
          error: e.message,
          command: body.command,
        });
        return reply.code(400).send({
          ...errorResponse('UNKNOWN_COMMAND', R.unknownCommand(body.command as string)),
          correlation_id: correlationId,
          degraded: svc.getQueueHealth().degraded,
        });
      }
      structuredLog('error', 'command_queue_route_error', {
        correlation_id: correlationId,
        error: (e as Error).message,
      });
      throw e;
    }
  });

  app.get('/api/command', { schema: RS.commandGet }, async (_request, reply) => {
    const correlationId = correlationIdFor(_request);
    reply.header('x-correlation-id', correlationId);
    const queue = svc.getQueue();
    const health = svc.getQueueHealth();
    return reply.send({
      command: svc.getLatest(),
      queue,
      correlation_id: correlationId,
      degraded: health.degraded,
      degraded_reason: health.reason,
    });
  });

  app.get('/api/commands', { schema: RS.commandsCatalogGet }, async (_request, reply) => {
    return reply.send({ commands: svc.getCatalog() });
  });
}
