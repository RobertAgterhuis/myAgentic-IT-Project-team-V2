// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { ChatService } from '../services/chat-service';
import { ContextAssembler } from '../services/chat/context-assembler';
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

function resolveChatSessionId(request: FastifyRequest): string {
  const body = request.body as { session_id?: string } | undefined;
  if (typeof body?.session_id === 'string' && body.session_id.trim().length > 0) {
    return body.session_id;
  }

  const headerValue = request.headers['x-session-id'];
  const headerSessionId =
    typeof headerValue === 'string'
      ? headerValue
      : Array.isArray(headerValue)
        ? headerValue[0]
        : undefined;
  if (headerSessionId && headerSessionId.trim().length > 0) {
    return headerSessionId;
  }

  const rawUser = (
    request.raw as FastifyRequest['raw'] & { user?: { login?: string; id?: number } }
  ).user;
  if (rawUser?.login) return `user-${rawUser.login}`;
  if (typeof rawUser?.id === 'number') return `user-${rawUser.id}`;
  return 'default';
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const chatService = new ChatService({
    projectRoot: ctx.PROJECT_ROOT,
    sessionDir: path.relative(ctx.PROJECT_ROOT, ctx.SESSION_DIR),
  });
  const contextAssembler = new ContextAssembler({
    projectRoot: ctx.PROJECT_ROOT,
    resolveSessionFile: () => ctx.resolveSessionFile(),
    getHumanOverrideEvents: ctx._getHumanOverrideEvents,
  });
  const grounding = new RagGroundingService({
    projectRoot: ctx.PROJECT_ROOT,
    ragStore: ctx._ragStore,
    embeddingProvider: ctx._embeddingProvider,
  });

  app.post<{
    Body: {
      message: string;
      context_hints?: string[];
      session_id?: string;
    };
  }>('/api/v1/chat/message', { schema: RS.chatMessage }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const message = request.body.message.trim();
    if (!message) {
      return reply.code(400).send(errorResponse('INVALID_INPUT', 'Message is required'));
    }

    const sessionId = resolveChatSessionId(request);
    const assembled = contextAssembler.assemble();
    const response = chatService.sendMessage({
      sessionId,
      message,
      contextHints: request.body.context_hints,
      contextSnapshot: assembled.snapshot,
      citations: assembled.citations,
    });

    return reply.send({
      ok: true,
      session_id: sessionId,
      ...response,
    });
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
