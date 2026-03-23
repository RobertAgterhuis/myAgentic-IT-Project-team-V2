// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agents API routes — GET /api/agents/*, POST /api/agents/:id/execute
 *
 * Endpoints:
 *   GET  /api/agents                   — List all agents with current status
 *   GET  /api/agents/executions        — Execution history (M31-009)
 *   GET  /api/agents/:id               — Agent detail (prompt summary, outputs, history)
 *   POST /api/agents/:id/execute       — Execute agent on demand (M31-001)
 *   GET  /api/agents/jobs/:jobId/status  — Job status (M31-002)
 *   GET  /api/agents/jobs/:jobId/result  — Job result (M31-004)
 *   POST /api/agents/jobs/:jobId/cancel  — Cancel execution (M31-005)
 *
 * @module routes/agents
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { sessionTracker } from '../session-tracker';
import { AgentExecutionService, AgentNotFoundError, toServiceContext } from '../services';
import { structuredLog } from '../middleware';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const execService = new AgentExecutionService(
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );

  // ── GET /api/agents ──────────────────────────────────────

  app.get(
    '/api/agents',
    { schema: { tags: ['agents'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const agents = sessionTracker.listAgents();
      return reply.send({ ok: true, count: agents.length, agents });
    }
  );

  // ── GET /api/agents/executions (M31-009) ─────────────────

  app.get(
    '/api/agents/executions',
    { schema: RS.agentExecutionHistory },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const executions = execService.listExecutionHistory();
      return reply.send({ ok: true, count: executions.length, executions });
    }
  );

  // ── GET /api/agents/:id ──────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/agents/:id',
    { schema: RS.agentDetail },
    async (request, reply) => {
      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Agent ID is required'));
      }
      const agent = sessionTracker.getAgent(id);
      if (!agent) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Agent not found: ${id}`));
      }
      return reply.send({ ok: true, agent });
    }
  );

  // ── POST /api/agents/:id/execute (M31-001) ───────────────

  app.post<{ Params: { id: string } }>(
    '/api/agents/:id/execute',
    { schema: RS.agentExecute },
    async (request, reply) => {
      const agentId = decodeURIComponent(request.params.id);
      const body = (request.body as Record<string, unknown>) || {};
      const context = body.context as
        | { predecessorPaths?: string[]; questionnairePath?: string; workspaceId?: string }
        | undefined;

      structuredLog('info', 'agent_execute_request', { agentId });

      // Emit SSE: execution starting
      ctx.sseNotify('agent_execution_start', {
        type: 'agent_execution_start',
        agent_id: agentId,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await execService.execute({ agentId, context });

        // Emit SSE based on outcome
        const sseType =
          result.status === 'completed' ? 'agent_execution_complete' : 'agent_execution_failed';

        ctx.sseNotify(sseType, {
          type: sseType,
          job_id: result.job_id,
          agent_id: result.agent_id,
          agent_name: result.agent_name,
          status: result.status,
          duration_ms: result.duration_ms,
          error: result.error,
          confidence: result.confidence,
          uncertainty_reasons: result.uncertainty_reasons,
          needs_human_review: result.needs_human_review,
          timestamp: new Date().toISOString(),
        });

        // Emit progress log entries via SSE
        for (const log of result.logs) {
          ctx.sseNotify('agent_execution_log', {
            type: 'agent_execution_log',
            job_id: result.job_id,
            agent_id: result.agent_id,
            level: log.level,
            message: log.message,
            timestamp: log.timestamp,
          });
        }

        structuredLog('info', 'agent_execute_result', {
          agentId: result.agent_id,
          jobId: result.job_id,
          status: result.status,
          durationMs: result.duration_ms,
        });

        return reply.send({ ok: true, execution: result });
      } catch (err) {
        if (err instanceof AgentNotFoundError) {
          return reply.code(404).send(errorResponse('NOT_FOUND', err.message));
        }

        ctx.sseNotify('agent_execution_failed', {
          type: 'agent_execution_failed',
          agent_id: agentId,
          error: (err as Error).message,
          timestamp: new Date().toISOString(),
        });

        structuredLog('error', 'agent_execute_error', {
          agentId,
          error: (err as Error).message,
        });

        return reply.code(500).send(errorResponse('EXECUTION_ERROR', (err as Error).message));
      }
    }
  );

  // ── GET /api/agents/jobs/:jobId/status (M31-002) ─────────

  app.get<{ Params: { jobId: string } }>(
    '/api/agents/jobs/:jobId/status',
    { schema: RS.agentJobStatus },
    async (request, reply) => {
      const jobId = decodeURIComponent(request.params.jobId);
      const job = execService.getJobStatus(jobId);
      if (!job) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Job not found: ${jobId}`));
      }
      return reply.send({
        ok: true,
        job_id: job.job_id,
        agent_id: job.agent_id,
        agent_name: job.agent_name,
        status: job.status,
        started_at: job.started_at,
        completed_at: job.completed_at,
        duration_ms: job.duration_ms,
        confidence: job.confidence,
        uncertainty_reasons: job.uncertainty_reasons,
        needs_human_review: job.needs_human_review,
      });
    }
  );

  // ── GET /api/agents/jobs/:jobId/result (M31-004) ─────────

  app.get<{ Params: { jobId: string } }>(
    '/api/agents/jobs/:jobId/result',
    { schema: RS.agentJobResult },
    async (request, reply) => {
      const jobId = decodeURIComponent(request.params.jobId);
      const job = execService.getJobResult(jobId);
      if (!job) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Job not found: ${jobId}`));
      }
      if (job.status === 'running') {
        return reply.code(202).send({
          ok: true,
          status: 'running',
          message: 'Execution still in progress',
        });
      }
      return reply.send({
        ok: true,
        execution: job,
      });
    }
  );

  // ── POST /api/agents/jobs/:jobId/cancel (M31-005) ────────

  app.post<{ Params: { jobId: string } }>(
    '/api/agents/jobs/:jobId/cancel',
    { schema: RS.agentJobCancel },
    async (request, reply) => {
      const jobId = decodeURIComponent(request.params.jobId);
      const cancelled = execService.cancelJob(jobId);
      if (!cancelled) {
        return reply
          .code(404)
          .send(errorResponse('NOT_FOUND', `Job not found or not running: ${jobId}`));
      }

      ctx.sseNotify('agent_execution_cancelled', {
        type: 'agent_execution_cancelled',
        job_id: jobId,
        timestamp: new Date().toISOString(),
      });

      structuredLog('info', 'agent_execute_cancelled', { jobId });

      return reply.send({ ok: true, message: `Job ${jobId} cancelled` });
    }
  );
}
