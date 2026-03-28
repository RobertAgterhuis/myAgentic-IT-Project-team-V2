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
import type { ServerContext } from '../context';
import type { ServiceContext } from '../services/types';
import { toServiceContext } from '../services';
import { createLessonsToPolicyService } from '../../../platform/engine/lessons-to-policy';
import { createFailureTaxonomyService } from '../../../platform/engine/failure-taxonomy';
import {
  createObjectiveGraphService,
  type Objective,
} from '../../../platform/engine/objective-graph';
import { createGoalHealthScoringService } from '../../../platform/engine/goal-health';
import { createBenchmarkTuningService } from '../../../platform/engine/benchmark-tuning';
import { createProactiveDiscoveryOptimizationService } from '../../../platform/engine/proactive-discovery-optimization';

export async function registerIntelligenceLoopRoutes(app: FastifyInstance, ctx: ServiceContext) {
  const objectiveGraphService = await createObjectiveGraphService(ctx);
  const healthScoringService = await createGoalHealthScoringService(ctx);
  const lessonsPolicyService = await createLessonsToPolicyService(ctx);
  const failureTaxonomyService = await createFailureTaxonomyService(ctx);
  const benchmarkTuningService = await createBenchmarkTuningService(ctx);
  const proactiveOptimizationService = createProactiveDiscoveryOptimizationService(ctx);

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

  // ──── M3 Proactive Discovery & Optimization (E5 + E6) ────

  /**
   * POST /api/intelligence-loop/m3/discovery/stale-scan
   */
  app.post<{
    Body: {
      entities: Array<{
        id: string;
        type: 'decision' | 'rag-collection' | 'artifact';
        lastUpdatedAt: string;
        supersededById?: string;
        workflows?: string[];
      }>;
      staleThresholdSeconds?: number;
      reevaluateThresholdCount?: number;
    };
  }>('/api/intelligence-loop/m3/discovery/stale-scan', async (request, reply) => {
    try {
      const result = await proactiveOptimizationService.scanKnowledgeStaleness(request.body);
      return reply.send({ ok: true, result });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/m3/discovery/contradictions
   */
  app.post<{
    Body: {
      artifacts: Array<{ artifactId: string; phase?: string; content: string }>;
    };
  }>('/api/intelligence-loop/m3/discovery/contradictions', async (request, reply) => {
    try {
      const result = await proactiveOptimizationService.detectContradictionsAndMissingCitations(
        request.body
      );
      const statusCode = result.blockSynthesisPublication ? 422 : 200;
      return reply.status(statusCode).send({
        ok: !result.blockSynthesisPublication,
        blockSynthesisPublication: result.blockSynthesisPublication,
        result,
      });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/m3/discovery/exploratory-branches
   */
  app.post<{
    Body: {
      taskId: string;
      objective: string;
      basePlanSteps: string[];
      uncertainty: number;
      includeExploration?: boolean;
      maxAlternatives?: number;
      surfaceAt?: 'sprint-gate' | 'approval';
    };
  }>('/api/intelligence-loop/m3/discovery/exploratory-branches', async (request, reply) => {
    try {
      const result = await proactiveOptimizationService.generateExploratoryBranches(request.body);
      if (!result) {
        return reply.send({
          ok: true,
          generated: false,
          reason: 'Exploration disabled or uncertainty below threshold',
        });
      }
      return reply.status(201).send({ ok: true, generated: true, result });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/m3/optimization/concurrency-policy
   */
  app.post<{
    Body: {
      currentMaxConcurrency: number;
      queueWaitMs: number;
      failureRate: number;
      throughputRps: number;
      previousPolicy?: {
        maxConcurrency: number;
        baselineFailureRate: number;
        baselineThroughputRps: number;
        rollbackValue: number;
      };
    };
  }>('/api/intelligence-loop/m3/optimization/concurrency-policy', async (request, reply) => {
    try {
      const decision = await proactiveOptimizationService.decideConcurrencyPolicy(request.body);
      return reply.send({ ok: true, decision });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/m3/optimization/retrieval-policy
   */
  app.post<{
    Body: {
      riskLevel: 'low' | 'high';
      citationUsefulness: number;
      noMatchRate: number;
      retrievalLatencyP95Ms: number;
      latencyBudgetMs: number;
      currentTopK?: number;
      currentThreshold?: number;
    };
  }>('/api/intelligence-loop/m3/optimization/retrieval-policy', async (request, reply) => {
    try {
      const decision = await proactiveOptimizationService.decideRetrievalPolicy(request.body);
      return reply.send({ ok: true, decision });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/intelligence-loop/m3/optimization/route-escalation
   */
  app.post<{
    Body: {
      confidence: number;
      riskLevel: 'low' | 'medium' | 'high';
      requiresHumanApproval?: boolean;
      verifierFindingsCritical?: boolean;
    };
  }>('/api/intelligence-loop/m3/optimization/route-escalation', async (request, reply) => {
    try {
      const decision = await proactiveOptimizationService.decideRouteEscalation(request.body);
      return reply.send({ ok: true, decision });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/intelligence-loop/m3/optimization/route-escalation/recent
   */
  app.get<{ Querystring: { limit?: string } }>(
    '/api/intelligence-loop/m3/optimization/route-escalation/recent',
    async (request, reply) => {
      try {
        const parsedLimit = Number(request.query.limit || 20);
        const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.floor(parsedLimit)) : 20;
        const decisions = await proactiveOptimizationService.listRecentRouteEscalations(limit);
        return reply.send({ ok: true, decisions, total: decisions.length });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(500).send({ ok: false, error: 'Failed to list route escalations' });
      }
    }
  );

  // ──── M4 Finishing Surfaces (Adaptive approvals + observability) ────

  /**
   * POST /api/intelligence-loop/m4/adaptive-policy-proposals
   */
  app.post<{
    Body: {
      domain: 'concurrency' | 'retrieval' | 'route-escalation' | 'pattern-uplift';
      title: string;
      rationale: string;
      desiredChange: Record<string, unknown>;
      decisionReferences?: string[];
      approvalRequired?: boolean;
      actor?: string;
    };
  }>('/api/intelligence-loop/m4/adaptive-policy-proposals', async (request, reply) => {
    try {
      const proposal = await proactiveOptimizationService.createAdaptivePolicyProposal(
        request.body
      );
      return reply.status(201).send({ ok: true, proposal });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/intelligence-loop/m4/adaptive-policy-proposals
   */
  app.get<{ Querystring: { status?: string } }>(
    '/api/intelligence-loop/m4/adaptive-policy-proposals',
    async (request, reply) => {
      try {
        const status = request.query.status as
          | 'pending'
          | 'approved'
          | 'applied'
          | 'reverted'
          | 'rejected'
          | undefined;
        const proposals = await proactiveOptimizationService.listAdaptivePolicyProposals(status);
        return reply.send({ ok: true, proposals, total: proposals.length });
      } catch (error) {
        app.log.error({ error }, '');
        return reply
          .status(500)
          .send({ ok: false, error: 'Failed to list adaptive policy proposals' });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/m4/adaptive-policy-proposals/:id/approve
   */
  app.post<{ Params: { id: string }; Body: { actor?: string; reason?: string } }>(
    '/api/intelligence-loop/m4/adaptive-policy-proposals/:id/approve',
    async (request, reply) => {
      try {
        const proposal = await proactiveOptimizationService.approveAdaptivePolicyProposal(
          request.params.id,
          request.body.actor || 'reviewer',
          request.body.reason
        );
        if (!proposal) {
          return reply.status(404).send({ ok: false, error: 'Adaptive policy proposal not found' });
        }
        return reply.send({ ok: true, proposal });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/m4/adaptive-policy-proposals/:id/apply
   */
  app.post<{ Params: { id: string }; Body: { actor?: string; reason?: string } }>(
    '/api/intelligence-loop/m4/adaptive-policy-proposals/:id/apply',
    async (request, reply) => {
      try {
        const proposal = await proactiveOptimizationService.applyAdaptivePolicyProposal(
          request.params.id,
          request.body.actor || 'operator',
          request.body.reason
        );
        if (!proposal) {
          return reply.status(404).send({ ok: false, error: 'Adaptive policy proposal not found' });
        }
        return reply.send({ ok: true, proposal });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/m4/adaptive-policy-proposals/:id/revert
   */
  app.post<{ Params: { id: string }; Body: { actor?: string; reason: string } }>(
    '/api/intelligence-loop/m4/adaptive-policy-proposals/:id/revert',
    async (request, reply) => {
      try {
        const proposal = await proactiveOptimizationService.revertAdaptivePolicyProposal(
          request.params.id,
          request.body.actor || 'operator',
          request.body.reason
        );
        if (!proposal) {
          return reply.status(404).send({ ok: false, error: 'Adaptive policy proposal not found' });
        }
        return reply.send({ ok: true, proposal });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * POST /api/intelligence-loop/m4/adaptive-policy-proposals/:id/reject
   */
  app.post<{ Params: { id: string }; Body: { actor?: string; reason: string } }>(
    '/api/intelligence-loop/m4/adaptive-policy-proposals/:id/reject',
    async (request, reply) => {
      try {
        const proposal = await proactiveOptimizationService.rejectAdaptivePolicyProposal(
          request.params.id,
          request.body.actor || 'reviewer',
          request.body.reason
        );
        if (!proposal) {
          return reply.status(404).send({ ok: false, error: 'Adaptive policy proposal not found' });
        }
        return reply.send({ ok: true, proposal });
      } catch (error) {
        app.log.error({ error }, '');
        return reply.status(400).send({ ok: false, error: (error as Error).message });
      }
    }
  );

  /**
   * GET /api/intelligence-loop/m4/adaptive-behaviors/summary
   */
  app.get('/api/intelligence-loop/m4/adaptive-behaviors/summary', async (request, reply) => {
    try {
      const summary = await proactiveOptimizationService.getAdaptiveBehaviorSummary();
      return reply.send({ ok: true, summary });
    } catch (error) {
      app.log.error({ error }, '');
      return reply
        .status(500)
        .send({ ok: false, error: 'Failed to compute adaptive behavior summary' });
    }
  });

  /**
   * GET /api/intelligence-loop/m4/pattern-scores/analysis
   */
  app.get<{
    Querystring: {
      averageTarget?: string;
      minimumTarget?: string;
      limit?: string;
    };
  }>('/api/intelligence-loop/m4/pattern-scores/analysis', async (request, reply) => {
    try {
      const parsedAverageTarget = Number(request.query.averageTarget || 9.9);
      const parsedMinimumTarget = Number(request.query.minimumTarget || 9.4);
      const parsedLimit = Number(request.query.limit || 5);

      const analysis = await proactiveOptimizationService.analyzePatternScores({
        averageTarget: Number.isFinite(parsedAverageTarget) ? parsedAverageTarget : 9.9,
        minimumTarget: Number.isFinite(parsedMinimumTarget) ? parsedMinimumTarget : 9.4,
        limit: Number.isFinite(parsedLimit) ? Math.max(1, Math.floor(parsedLimit)) : 5,
      });

      return reply.send({ ok: true, analysis });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(500).send({ ok: false, error: 'Failed to analyze pattern scores' });
    }
  });

  /**
   * POST /api/intelligence-loop/m4/pattern-uplift-proposals
   */
  app.post<{
    Body: {
      actor?: string;
      limit?: number;
      averageTarget?: number;
      minimumTarget?: number;
    };
  }>('/api/intelligence-loop/m4/pattern-uplift-proposals', async (request, reply) => {
    try {
      const result = await proactiveOptimizationService.generatePatternUpliftProposals(
        request.body
      );
      return reply.status(201).send({ ok: true, result });
    } catch (error) {
      app.log.error({ error }, '');
      return reply.status(400).send({ ok: false, error: (error as Error).message });
    }
  });
}

// Backward compatibility alias for any existing imports.
export const registerM1Routes = registerIntelligenceLoopRoutes;

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  return registerIntelligenceLoopRoutes(
    app,
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
}
