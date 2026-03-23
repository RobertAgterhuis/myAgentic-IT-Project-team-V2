// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { RagGroundingService, type ChatGroundingIntent } from '../services/rag-grounding-service';
import * as RS from '../route-schemas';

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

function summarizeGrounding(
  intent: ChatGroundingIntent,
  resultCount: number,
  collection: string
): string {
  if (resultCount === 0) {
    return `No grounded results found for ${intent} in ${collection}.`;
  }

  return `Found ${resultCount} grounded result${resultCount === 1 ? '' : 's'} for ${intent} in ${collection}.`;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const grounding = new RagGroundingService({
    projectRoot: ctx.PROJECT_ROOT,
    ragStore: ctx._ragStore,
    embeddingProvider: ctx._embeddingProvider,
  });

  app.post<{
    Body: {
      intent: ChatGroundingIntent;
      message: string;
      topK?: number;
      threshold?: number;
    };
  }>('/api/v1/chat/query', { schema: RS.chatQuery }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    if (!grounding.hasServices()) {
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', 'RAG services not initialised'));
    }

    try {
      const intent = request.body.intent;
      const message = request.body.message.trim();
      const topK = Number.isFinite(request.body.topK) ? Number(request.body.topK) : 5;
      const threshold = Number.isFinite(request.body.threshold)
        ? Number(request.body.threshold)
        : 0;

      if (!message) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', 'Message is required'));
      }

      const grounded = await grounding.queryIntent(intent, message, { topK, threshold });

      return reply.send({
        ok: true,
        intent,
        query: grounded.query,
        collection: grounded.collections[0],
        answer: summarizeGrounding(intent, grounded.matches.length, grounded.collections[0]),
        references: grounded.matches,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send(errorResponse('CHAT_QUERY_ERROR', message));
    }
  });
}
