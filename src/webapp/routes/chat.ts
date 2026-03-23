// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { ChatService } from '../services/chat-service';
import { ContextAssembler } from '../services/chat/context-assembler';
import { RagGroundingService, type ChatGroundingIntent } from '../services/rag-grounding-service';
import {
  CommandService,
  GovernanceService,
  ServiceNotAvailableError,
  ServiceValidationError,
  toServiceContext,
} from '../services';
import * as RS from '../route-schemas';

type ChatActionType = 'create_command' | 'approve' | 'reject' | 'resume' | 'pause' | 'open_screen';

function resolveCitationLink(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/');
  if (normalized.includes('BusinessDocs/decisions')) return '/decisions';
  if (normalized.includes('BusinessDocs/session')) return '/sessions';
  if (normalized.includes('BusinessDocs')) return '/artifacts';
  if (normalized.includes('src/')) return '/workspaces';
  return '/artifacts';
}

function resolveCitationSourceType(
  sourcePath: string
): 'artifact' | 'decision' | 'policy' | 'session' | 'rag_chunk' {
  const normalized = sourcePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('decisions')) return 'decision';
  if (normalized.includes('policy')) return 'policy';
  if (normalized.includes('session')) return 'session';
  if (normalized.includes('businessdocs')) return 'artifact';
  return 'rag_chunk';
}

function streamTokens(ctx: ServerContext, sessionId: string, text: string): void {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
  parts.forEach((token, index) => {
    setTimeout(() => {
      ctx.sseNotify('message', {
        type: 'chat_token',
        session_id: sessionId,
        token,
        index,
        timestamp: new Date().toISOString(),
      });

      if (index === parts.length - 1) {
        ctx.sseNotify('message', {
          type: 'chat_stream_complete',
          session_id: sessionId,
          timestamp: new Date().toISOString(),
        });
      }
    }, index * 18);
  });
}

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
  const commandService = new CommandService(
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
  const governanceService = new GovernanceService(
    toServiceContext(ctx as unknown as Record<string, unknown>),
    {
      getEngine: ctx._getEngine as (() => unknown) | undefined,
    }
  );
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

    streamTokens(ctx, sessionId, response.message.content);

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

      const citations = grounded.matches.map((match) => ({
        source_path: match.source_path,
        excerpt: match.text,
        start_line: match.start_line,
        source_type: resolveCitationSourceType(match.source_path),
        deep_link: resolveCitationLink(match.source_path),
      }));

      return reply.send({
        ok: true,
        intent,
        query: grounded.query,
        collection: grounded.collections[0],
        answer: summarizeGrounding(intent, grounded.matches.length, grounded.collections[0]),
        references: grounded.matches,
        citations,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send(errorResponse('CHAT_QUERY_ERROR', message));
    }
  });

  app.get<{
    Querystring: {
      session_id?: string;
      limit?: number;
    };
  }>('/api/v1/chat/history', { schema: RS.chatHistory }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId =
      typeof request.query.session_id === 'string' && request.query.session_id.trim().length > 0
        ? request.query.session_id
        : resolveChatSessionId(request);
    const history = chatService.getHistory({
      sessionId,
      limit: request.query.limit,
    });

    return reply.send({
      ok: true,
      session_id: sessionId,
      count: history.length,
      messages: history,
    });
  });

  app.delete<{
    Body: {
      session_id?: string;
    };
  }>('/api/v1/chat/session', { schema: RS.chatSessionDelete }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId = resolveChatSessionId(request);
    const result = chatService.clearSession({ sessionId });

    return reply.send({
      ok: true,
      session_id: sessionId,
      ...result,
    });
  });

  app.post<{
    Body: {
      actionId: string;
      session_id?: string;
      confirmed?: boolean;
    };
  }>('/api/v1/chat/action', { schema: RS.chatAction }, async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    const sessionId = resolveChatSessionId(request);
    const actionEnvelope = chatService.getActionEnvelope({
      sessionId,
      actionId: request.body.actionId,
    });

    if (!actionEnvelope) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Chat action not found'));
    }

    const action = actionEnvelope.action;
    const confirmed = request.body.confirmed === true;
    if (action.requires_confirmation && !confirmed) {
      return reply.code(409).send({
        ...errorResponse('CONFIRMATION_REQUIRED', 'Confirmation required before executing action'),
        requires_confirmation: true,
        action,
      });
    }

    try {
      let result: Record<string, unknown>;
      const payload = action.payload || {};

      switch (action.type as ChatActionType) {
        case 'approve': {
          const approvalId = String(payload.approval_id || '').trim();
          if (!approvalId) {
            return reply
              .code(400)
              .send(errorResponse('INVALID_INPUT', 'approval_id is required for approve action'));
          }
          result = governanceService.approve(
            approvalId,
            String(payload.user || 'chat-user'),
            String(payload.reason || 'Approved via chat action')
          ) as unknown as Record<string, unknown>;
          break;
        }
        case 'reject': {
          const approvalId = String(payload.approval_id || '').trim();
          if (!approvalId) {
            return reply
              .code(400)
              .send(errorResponse('INVALID_INPUT', 'approval_id is required for reject action'));
          }
          result = governanceService.reject(
            approvalId,
            String(payload.user || 'chat-user'),
            String(payload.reason || 'Rejected via chat action')
          ) as unknown as Record<string, unknown>;
          break;
        }
        case 'create_command':
        case 'resume':
        case 'pause': {
          const command =
            action.type === 'resume'
              ? 'CONTINUE'
              : action.type === 'pause'
                ? 'SCOPE CHANGE'
                : String(payload.command || 'CREATE');

          result = (await commandService.queue(
            {
              command,
              project: String(payload.project || 'chat-panel'),
              description: String(
                payload.description ||
                  `Action executed from chat context (${actionEnvelope.context_snapshot?.currentPhase || 'n/a'})`
              ),
              scope: String(payload.scope || 'chat-action'),
            },
            'chat-action'
          )) as unknown as Record<string, unknown>;
          break;
        }
        case 'open_screen': {
          result = {
            ok: true,
            target: String(payload.target || '/dashboard'),
          };
          break;
        }
        default:
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', `Unsupported action type: ${action.type}`));
      }

      ctx.sseNotify('message', {
        type: 'chat_action_executed',
        session_id: sessionId,
        action_id: action.id,
        action_type: action.type,
        timestamp: new Date().toISOString(),
      });

      return reply.send({
        ok: true,
        session_id: sessionId,
        action,
        replay_context: actionEnvelope.context_snapshot || null,
        result,
      });
    } catch (err) {
      if (err instanceof ServiceValidationError) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', err.message));
      }
      if (err instanceof ServiceNotAvailableError) {
        return reply.code(503).send(errorResponse('SERVICE_UNAVAILABLE', err.message));
      }

      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }
      return reply.code(500).send(errorResponse('CHAT_ACTION_ERROR', message));
    }
  });
}
