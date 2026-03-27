// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * M2 Reasoning & Collaboration API Routes
 *
 * Exposes endpoints for:
 * - Reasoning profile management and selection (E3.1)
 * - Verifier pass for high-risk deliverables (E3.2)
 * - Self-revision tracking before handoff (E3.3)
 * - Typed A2A messaging (E4.1)
 * - Peer clarification workflows (E4.2)
 * - Collaboration traces and observability (E4.3)
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import type { ServiceContext } from '../services/types';
import { toServiceContext } from '../services';
import { createReasoningProfileService } from '../../../platform/engine/reasoning-profile';
import { createVerifierPassService } from '../../../platform/engine/verifier-pass';
import { createSelfRevisionService } from '../../../platform/engine/self-revision';
import { createA2AMessagingService } from '../../../platform/engine/a2a-messaging';
import { createPeerClarificationService } from '../../../platform/engine/peer-clarification';
import { createA2ACollaborationTracer } from '../../../platform/engine/a2a-collaboration-tracer';
import type {
  ProfileSelectionInput,
  ProfileUpdateInput,
} from '../../../platform/engine/reasoning-profile';
import type {
  VerifierRunInput,
  VerifierRiskCategory,
} from '../../../platform/engine/verifier-pass';
import type { SelfRevisionRequest } from '../../../platform/engine/self-revision';
import type { A2AMessageCreateInput } from '../../../platform/engine/a2a-messaging';
import type {
  OpenClarificationInput,
  RespondToClarificationInput,
} from '../../../platform/engine/peer-clarification';
import type {
  CollaborationTraceInput,
  TraceOutcomeInput,
} from '../../../platform/engine/a2a-collaboration-tracer';

export async function registerReasoningCollaborationRoutes(
  app: FastifyInstance,
  ctx: ServiceContext
): Promise<void> {
  const reasoningProfileService = createReasoningProfileService(ctx);
  const verifierPassService = createVerifierPassService(ctx);
  const selfRevisionService = createSelfRevisionService(ctx);
  const a2aMessagingService = createA2AMessagingService(ctx);
  const peerClarificationService = createPeerClarificationService(ctx);
  const collaborationTracer = createA2ACollaborationTracer(ctx);

  // ──── Reasoning Profiles (E3.1) ────

  /**
   * GET /api/reasoning-collaboration/reasoning-profiles
   */
  app.get('/api/reasoning-collaboration/reasoning-profiles', async (request, reply) => {
    try {
      const profiles = await reasoningProfileService.listProfiles();
      return reply.send({ ok: true, profiles, total: profiles.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list reasoning profiles' });
    }
  });

  /**
   * GET /api/reasoning-collaboration/reasoning-profiles/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/reasoning-profiles/:id',
    async (request, reply) => {
      try {
        const profile = await reasoningProfileService.getProfile(request.params.id);
        if (!profile) {
          return reply.status(404).send({ ok: false, error: 'Reasoning profile not found' });
        }
        return reply.send({ ok: true, profile });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve reasoning profile' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/reasoning-profiles/select
   * Select the best reasoning profile for a given invocation context
   */
  app.post<{ Body: ProfileSelectionInput }>(
    '/api/reasoning-collaboration/reasoning-profiles/select',
    async (request, reply) => {
      try {
        const result = await reasoningProfileService.selectProfile(request.body);
        return reply.send({ ok: true, selection: result });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/reasoning-profiles/performance
   * Record performance feedback for adaptive profile selection
   */
  app.post<{ Body: ProfileUpdateInput }>(
    '/api/reasoning-collaboration/reasoning-profiles/performance',
    async (request, reply) => {
      try {
        await reasoningProfileService.updatePerformanceHistory(request.body);
        return reply.send({ ok: true });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  // ──── Verifier Pass (E3.2) ────

  /**
   * POST /api/reasoning-collaboration/verifier/run
   * Run a verifier pass against a deliverable
   */
  app.post<{ Body: VerifierRunInput }>(
    '/api/reasoning-collaboration/verifier/run',
    async (request, reply) => {
      try {
        const result = await verifierPassService.runVerifierPass(request.body);
        const statusCode = result.verdict === 'fail' ? 422 : 200;
        return reply.status(statusCode).send({ ok: result.verdict !== 'fail', result });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/verifier/results
   */
  app.get<{
    Querystring: {
      agentId?: string;
      riskCategory?: VerifierRiskCategory;
      verdict?: string;
    };
  }>('/api/reasoning-collaboration/verifier/results', async (request, reply) => {
    try {
      const results = await verifierPassService.listResults({
        agentId: request.query.agentId,
        riskCategory: request.query.riskCategory,
        verdict: request.query.verdict as 'pass' | 'pass-with-warnings' | 'fail' | undefined,
      });
      return reply.send({ ok: true, results, total: results.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list verifier results' });
    }
  });

  /**
   * GET /api/reasoning-collaboration/verifier/results/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/verifier/results/:id',
    async (request, reply) => {
      try {
        const result = await verifierPassService.getResult(request.params.id);
        if (!result) {
          return reply.status(404).send({ ok: false, error: 'Verifier result not found' });
        }
        return reply.send({ ok: true, result });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve verifier result' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/verifier/results/:id/self-revision
   * Record that a self-revision was applied after a verifier pass
   */
  app.post<{
    Params: { id: string };
    Body: { summary: string; revisionsApplied: number };
  }>('/api/reasoning-collaboration/verifier/results/:id/self-revision', async (request, reply) => {
    try {
      const { summary, revisionsApplied } = request.body;
      const result = await verifierPassService.recordSelfRevision(
        request.params.id,
        summary,
        revisionsApplied
      );
      if (!result) {
        return reply.status(404).send({ ok: false, error: 'Verifier result not found' });
      }
      return reply.send({ ok: true, result });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  // ──── Self-Revision (E3.3) ────

  /**
   * POST /api/reasoning-collaboration/self-revision/evaluate
   * Evaluate whether a self-revision is needed for a deliverable
   */
  app.post<{ Body: SelfRevisionRequest }>(
    '/api/reasoning-collaboration/self-revision/evaluate',
    async (request, reply) => {
      try {
        const event = await selfRevisionService.evaluateRevisionNeed(request.body);
        return reply.send({
          ok: true,
          revisionNeeded: event !== null,
          event: event ?? null,
        });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/self-revision/events
   */
  app.get<{
    Querystring: {
      agentId?: string;
      trigger?: string;
      applied?: string;
    };
  }>('/api/reasoning-collaboration/self-revision/events', async (request, reply) => {
    try {
      const events = await selfRevisionService.listEvents({
        agentId: request.query.agentId,
        trigger: request.query.trigger as SelfRevisionRequest['trigger'] | undefined,
        applied: request.query.applied !== undefined ? request.query.applied === 'true' : undefined,
      });
      return reply.send({ ok: true, events, total: events.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list self-revision events' });
    }
  });

  /**
   * POST /api/reasoning-collaboration/self-revision/events/:id/applied
   * Mark a self-revision event as applied
   */
  app.post<{ Params: { id: string }; Body: { summary: string } }>(
    '/api/reasoning-collaboration/self-revision/events/:id/applied',
    async (request, reply) => {
      try {
        const event = await selfRevisionService.markApplied(
          request.params.id,
          request.body.summary
        );
        if (!event) {
          return reply.status(404).send({ ok: false, error: 'Self-revision event not found' });
        }
        return reply.send({ ok: true, event });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  // ──── A2A Messaging (E4.1) ────

  /**
   * POST /api/reasoning-collaboration/a2a/messages
   * Send a new A2A message
   */
  app.post<{ Body: A2AMessageCreateInput }>(
    '/api/reasoning-collaboration/a2a/messages',
    async (request, reply) => {
      try {
        const message = await a2aMessagingService.sendMessage(request.body);
        return reply.status(201).send({ ok: true, message });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/a2a/messages
   */
  app.get<{
    Querystring: {
      fromAgentId?: string;
      toAgentId?: string;
      correlationId?: string;
      type?: string;
      status?: string;
    };
  }>('/api/reasoning-collaboration/a2a/messages', async (request, reply) => {
    try {
      const messages = await a2aMessagingService.listMessages({
        fromAgentId: request.query.fromAgentId,
        toAgentId: request.query.toAgentId,
        correlationId: request.query.correlationId,
        type: request.query.type as A2AMessageCreateInput['type'] | undefined,
        status: request.query.status as
          | 'pending'
          | 'delivered'
          | 'read'
          | 'replied'
          | 'expired'
          | undefined,
      });
      return reply.send({ ok: true, messages, total: messages.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list messages' });
    }
  });

  /**
   * GET /api/reasoning-collaboration/a2a/messages/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/a2a/messages/:id',
    async (request, reply) => {
      try {
        const message = await a2aMessagingService.getMessage(request.params.id);
        if (!message) {
          return reply.status(404).send({ ok: false, error: 'Message not found' });
        }
        return reply.send({ ok: true, message });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve message' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/a2a/messages/:id/delivered
   */
  app.post<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/a2a/messages/:id/delivered',
    async (request, reply) => {
      try {
        const message = await a2aMessagingService.markDelivered(request.params.id);
        if (!message) {
          return reply.status(404).send({ ok: false, error: 'Message not found' });
        }
        return reply.send({ ok: true, message });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/a2a/conversations/:correlationId
   */
  app.get<{ Params: { correlationId: string } }>(
    '/api/reasoning-collaboration/a2a/conversations/:correlationId',
    async (request, reply) => {
      try {
        const conversation = await a2aMessagingService.getConversation(
          request.params.correlationId
        );
        if (!conversation) {
          return reply
            .status(404)
            .send({ ok: false, error: 'No conversation found for this correlationId' });
        }
        return reply.send({ ok: true, conversation });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve conversation' });
      }
    }
  );

  // ──── Peer Clarification (E4.2) ────

  /**
   * GET /api/reasoning-collaboration/peer-clarification/canonical-pairs
   */
  app.get(
    '/api/reasoning-collaboration/peer-clarification/canonical-pairs',
    async (request, reply) => {
      try {
        const pairs = peerClarificationService.listCanonicalPairs();
        return reply.send({ ok: true, pairs });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to list canonical pairs' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/peer-clarification/workflows
   * Open a new peer clarification workflow
   */
  app.post<{ Body: OpenClarificationInput }>(
    '/api/reasoning-collaboration/peer-clarification/workflows',
    async (request, reply) => {
      try {
        const workflow = await peerClarificationService.openClarification(request.body);
        return reply.status(201).send({ ok: true, workflow });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/peer-clarification/workflows
   */
  app.get<{
    Querystring: {
      initiatorAgentId?: string;
      responderAgentId?: string;
      status?: string;
      phase?: string;
    };
  }>('/api/reasoning-collaboration/peer-clarification/workflows', async (request, reply) => {
    try {
      const workflows = await peerClarificationService.listWorkflows({
        initiatorAgentId: request.query.initiatorAgentId,
        responderAgentId: request.query.responderAgentId,
        status: request.query.status as
          | 'open'
          | 'awaiting-response'
          | 'partially-answered'
          | 'resolved'
          | 'escalated'
          | undefined,
        phase: request.query.phase,
      });
      return reply.send({ ok: true, workflows, total: workflows.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list workflows' });
    }
  });

  /**
   * GET /api/reasoning-collaboration/peer-clarification/workflows/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/peer-clarification/workflows/:id',
    async (request, reply) => {
      try {
        const workflow = await peerClarificationService.getWorkflow(request.params.id);
        if (!workflow) {
          return reply.status(404).send({ ok: false, error: 'Clarification workflow not found' });
        }
        return reply.send({ ok: true, workflow });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve workflow' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/peer-clarification/workflows/:id/respond
   */
  app.post<{ Params: { id: string }; Body: Omit<RespondToClarificationInput, 'workflowId'> }>(
    '/api/reasoning-collaboration/peer-clarification/workflows/:id/respond',
    async (request, reply) => {
      try {
        const workflow = await peerClarificationService.respondToClarification({
          workflowId: request.params.id,
          ...request.body,
        });
        if (!workflow) {
          return reply.status(404).send({ ok: false, error: 'Clarification workflow not found' });
        }
        return reply.send({ ok: true, workflow });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/peer-clarification/workflows/:id/escalate
   */
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/api/reasoning-collaboration/peer-clarification/workflows/:id/escalate',
    async (request, reply) => {
      try {
        const workflow = await peerClarificationService.escalateWorkflow(
          request.params.id,
          request.body.reason
        );
        if (!workflow) {
          return reply.status(404).send({ ok: false, error: 'Clarification workflow not found' });
        }
        return reply.send({ ok: true, workflow });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  // ──── Collaboration Traces (E4.3) ────

  /**
   * POST /api/reasoning-collaboration/collaboration/traces
   * Record a collaboration trace
   */
  app.post<{ Body: CollaborationTraceInput }>(
    '/api/reasoning-collaboration/collaboration/traces',
    async (request, reply) => {
      try {
        const trace = await collaborationTracer.recordTrace(request.body);
        return reply.status(201).send({ ok: true, trace });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/collaboration/traces
   */
  app.get<{
    Querystring: {
      fromAgentId?: string;
      toAgentId?: string;
      correlationId?: string;
      phase?: string;
      outcome?: string;
      sessionId?: string;
      workspaceId?: string;
    };
  }>('/api/reasoning-collaboration/collaboration/traces', async (request, reply) => {
    try {
      const traces = await collaborationTracer.listTraces({
        fromAgentId: request.query.fromAgentId,
        toAgentId: request.query.toAgentId,
        correlationId: request.query.correlationId,
        phase: request.query.phase,
        outcome: request.query.outcome as
          | 'acknowledged'
          | 'acted-upon'
          | 'escalated'
          | 'expired'
          | 'pending'
          | undefined,
        sessionId: request.query.sessionId,
        workspaceId: request.query.workspaceId,
      });
      return reply.send({ ok: true, traces, total: traces.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to list traces' });
    }
  });

  /**
   * GET /api/reasoning-collaboration/collaboration/traces/:id
   */
  app.get<{ Params: { id: string } }>(
    '/api/reasoning-collaboration/collaboration/traces/:id',
    async (request, reply) => {
      try {
        const trace = await collaborationTracer.getTrace(request.params.id);
        if (!trace) {
          return reply.status(404).send({ ok: false, error: 'Collaboration trace not found' });
        }
        return reply.send({ ok: true, trace });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve trace' });
      }
    }
  );

  /**
   * POST /api/reasoning-collaboration/collaboration/traces/:id/outcome
   * Update the outcome of a collaboration trace
   */
  app.post<{ Params: { id: string }; Body: Omit<TraceOutcomeInput, 'traceId'> }>(
    '/api/reasoning-collaboration/collaboration/traces/:id/outcome',
    async (request, reply) => {
      try {
        const trace = await collaborationTracer.updateOutcome({
          traceId: request.params.id,
          ...request.body,
        });
        if (!trace) {
          return reply.status(404).send({ ok: false, error: 'Collaboration trace not found' });
        }
        return reply.send({ ok: true, trace });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/reasoning-collaboration/collaboration/summary
   * Compute aggregated collaboration summary
   */
  app.get<{ Querystring: { since?: string; until?: string } }>(
    '/api/reasoning-collaboration/collaboration/summary',
    async (request, reply) => {
      try {
        const summary = await collaborationTracer.computeSummary(
          request.query.since,
          request.query.until
        );
        return reply.send({ ok: true, summary });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to compute summary' });
      }
    }
  );
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  return registerReasoningCollaborationRoutes(
    app,
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
}
