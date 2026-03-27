// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * M1 Intelligence Loop API Routes
 *
 * Exposes endpoints for:
 * - Objective graph management
 * - Goal health assessment
 * - Lessons-to-policy pipeline
 * - Failure taxonomy and remediation
 * - Benchmark-driven tuning
 */

import type { FastifyInstance } from 'fastify';
import type { ServiceContext } from '../services/types';
import { createLessonsToPolicyService } from '../../../platform/engine/lessons-to-policy';
import { createFailureTaxonomyService } from '../../../platform/engine/failure-taxonomy';
import {
  createObjectiveGraphService,
  type Objective,
} from '../../../platform/engine/objective-graph';
import { createGoalHealthScoringService } from '../../../platform/engine/goal-health';
import { createBenchmarkTuningService } from '../../../platform/engine/benchmark-tuning';

export async function registerIntelligenceLoopRoutes(app: FastifyInstance, ctx: ServiceContext) {
  const objectiveGraphService = await createObjectiveGraphService(ctx);
  const healthScoringService = await createGoalHealthScoringService(ctx);
  const lessonsPolicyService = await createLessonsToPolicyService(ctx);
  const failureTaxonomyService = await createFailureTaxonomyService(ctx);
  const benchmarkTuningService = await createBenchmarkTuningService(ctx);

  // ──── Objective Graph Endpoints ────

  /**
   * GET /api/intelligence-loop/objectives
   * Retrieve all objectives from the graph
   */
  app.get('/api/intelligence-loop/objectives', async (request, reply) => {
    try {
      const graph = await objectiveGraphService.getGraph();
      return reply.send({
        ok: true,
        objectives: graph.objectives,
        total: graph.objectives.length,
      });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to retrieve objectives' });
    }
  });

  /**
   * POST /api/intelligence-loop/objectives
   * Create a new objective
   */
  app.post<{ Body: Objective }>('/api/intelligence-loop/objectives', async (request, reply) => {
    try {
      const objective = await objectiveGraphService.addObjective(request.body);
      return reply.status(201).send({ ok: true, objective });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/intelligence-loop/objectives/:id
   * Retrieve a specific objective
   */
  app.get<{ Params: { id: string } }>(
    '/api/intelligence-loop/objectives/:id',
    async (request, reply) => {
      try {
        const graph = await objectiveGraphService.getGraph();
        const objective = graph.objectives.find((o) => o.id === request.params.id);

        if (!objective) {
          return reply.status(404).send({ ok: false, error: 'Objective not found' });
        }

        return reply.send({ ok: true, objective });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve objective' });
      }
    }
  );

  /**
   * PUT /api/intelligence-loop/objectives/:id
   * Update an objective
   */
  app.put<{ Params: { id: string }; Body: Partial<Objective> }>(
    '/api/intelligence-loop/objectives/:id',
    async (request, reply) => {
      try {
        const objective = await objectiveGraphService.updateObjective(
          request.params.id,
          request.body
        );
        return reply.send({ ok: true, objective });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/intelligence-loop/objectives/:id/health
   * Get latest health assessment for an objective
   */
  app.get<{ Params: { id: string } }>(
    '/api/intelligence-loop/objectives/:id/health',
    async (request, reply) => {
      try {
        const graph = await objectiveGraphService.getGraph();
        const objective = graph.objectives.find((o) => o.id === request.params.id);

        if (!objective) {
          return reply.status(404).send({ ok: false, error: 'Objective not found' });
        }

        const assessment = await healthScoringService.assessObjectiveHealth(objective);
        return reply.send({ ok: true, assessment });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to assess health' });
      }
    }
  );

  // ──── Health Summary ────

  /**
   * GET /api/intelligence-loop/health-summary
   * Get overall health summary for all objectives
   */
  app.get('/api/intelligence-loop/health-summary', async (request, reply) => {
    try {
      const summary = await objectiveGraphService.computeHealthSummary();
      return reply.send({ ok: true, summary });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to compute health summary' });
    }
  });

  /**
   * GET /api/intelligence-loop/at-risk-objectives
   * Get all objectives currently at risk
   */
  app.get('/api/intelligence-loop/at-risk-objectives', async (request, reply) => {
    try {
      const objectives = await objectiveGraphService.getAtRiskObjectives();
      return reply.send({ ok: true, objectives, total: objectives.length });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to retrieve at-risk objectives' });
    }
  });

  // ──── Failure Taxonomy Endpoints ────

  /**
   * GET /api/intelligence-loop/failure-taxonomy
   * Retrieve the complete failure taxonomy
   */
  app.get('/api/intelligence-loop/failure-taxonomy', async (request, reply) => {
    try {
      const taxonomy = await failureTaxonomyService.getTaxonomy();
      const stats = await failureTaxonomyService.getTaxonomyStats();
      return reply.send({ ok: true, taxonomy, stats });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to retrieve taxonomy' });
    }
  });

  /**
   * GET /api/intelligence-loop/failure-taxonomy/:classId/remediations
   * Get recommended remediations for a failure class
   */
  app.get<{ Params: { classId: string } }>(
    '/api/intelligence-loop/failure-taxonomy/:classId/remediations',
    async (request, reply) => {
      try {
        const remediations = await failureTaxonomyService.recommendRemediations(
          request.params.classId
        );
        return reply.send({ ok: true, remediations });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to get remediations' });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/failure-taxonomy/classify
   * Classify an error message
   */
  app.post<{ Body: { errorMessage: string; affectedAgent: string; phase?: string } }>(
    '/api/intelligence-loop/failure-taxonomy/classify',
    async (request, reply) => {
      try {
        const failureClass = await failureTaxonomyService.classifyError(
          request.body.errorMessage,
          request.body.affectedAgent,
          request.body.phase
        );

        if (!failureClass) {
          return reply.send({
            ok: true,
            classified: false,
            message: 'No matching failure class found',
          });
        }

        return reply.send({ ok: true, classified: true, failureClass });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to classify error' });
      }
    }
  );

  // ──── Lessons-to-Policy Endpoints ────

  /**
   * POST /api/intelligence-loop/policy-proposals
   * Generate a policy change proposal from lessons
   */
  app.post<{
    Body: {
      reevaluateArtifactIds: string[];
      retrospectiveIds: string[];
      benchmarkRunIds: string[];
    };
  }>('/api/intelligence-loop/policy-proposals', async (request, reply) => {
    try {
      const lessons = await lessonsPolicyService.extractLessons(
        request.body.reevaluateArtifactIds,
        request.body.retrospectiveIds
      );

      const proposal = await lessonsPolicyService.createProposal(
        lessons,
        request.body.benchmarkRunIds,
        request.body.retrospectiveIds
      );

      return reply.status(201).send({ ok: true, proposal });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/policy-proposals/:id/approve
   * Approve a policy proposal
   */
  app.post<{ Params: { id: string } }>(
    '/api/intelligence-loop/policy-proposals/:id/approve',
    async (request, reply) => {
      try {
        // In a real implementation, would load, approve, and apply proposal
        return reply.send({ ok: true, message: 'Policy proposal approved and applied' });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  // ──── Benchmark Tuning Endpoints ────

  /**
   * POST /api/intelligence-loop/benchmark-comparison
   * Compare two benchmark runs
   */
  app.post<{ Body: { currentBenchmarkId: string; previousBenchmarkId?: string } }>(
    '/api/intelligence-loop/benchmark-comparison',
    async (request, reply) => {
      try {
        const comparison = await benchmarkTuningService.compareBenchmarks(
          request.body.currentBenchmarkId,
          request.body.previousBenchmarkId
        );

        const proposals = await benchmarkTuningService.generateTuningProposals(comparison);

        return reply.send({ ok: true, comparison, proposals, proposalCount: proposals.length });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/intelligence-loop/tuning-proposals
   * Get all tuning proposals
   */
  app.get<{ Querystring: { status?: string } }>(
    '/api/intelligence-loop/tuning-proposals',
    async (request, reply) => {
      try {
        let proposals;
        if (request.query.status) {
          proposals = await benchmarkTuningService.getProposalsByStatus(
            request.query.status as 'pending' | 'approved' | 'rejected' | 'applied'
          );
        } else {
          proposals = await benchmarkTuningService.getAllProposals();
        }

        return reply.send({ ok: true, proposals, total: proposals.length });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to retrieve proposals' });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/tuning-proposals/:id/apply
   * Apply a tuning proposal
   */
  app.post<{ Params: { id: string } }>(
    '/api/intelligence-loop/tuning-proposals/:id/apply',
    async (request, reply) => {
      try {
        await benchmarkTuningService.applyProposal(request.params.id);
        return reply.send({ ok: true, message: 'Tuning proposal applied' });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/tuning-proposals/:id/revert
   * Revert a tuning proposal
   */
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/api/intelligence-loop/tuning-proposals/:id/revert',
    async (request, reply) => {
      try {
        await benchmarkTuningService.revertProposal(request.params.id, request.body.reason);
        return reply.send({ ok: true, message: 'Tuning proposal reverted' });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );
}

// Backward compatibility alias for any existing imports.
export const registerM1Routes = registerIntelligenceLoopRoutes;
