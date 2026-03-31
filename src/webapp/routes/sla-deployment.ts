// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * M5 SLA-Aware Prioritization & Deployment Confidence API Routes
 *
 * Exposes endpoints for:
 * - SLA queue prioritization with risk weights (M5-E1-I1)
 * - Confidence/risk-based execution mode routing (M5-E1-I2)
 * - Per-workspace fairness controls (M5-E1-I3)
 * - Staged rollout orchestration with rollback (M5-E2-I1)
 * - Release evidence bundle management (M5-E2-I2)
 * - SLO dashboard and breach indicators (M5-E2-I3)
 */

import type { FastifyInstance } from 'fastify';
import type { ServiceContext } from '../services/types';
import { createSlaQueuePrioritizerService } from '../../../platform/engine/sla-prioritizer';
import { createConfidenceRouterService } from '../../../platform/engine/confidence-router';
import { createWorkspaceFairnessService } from '../../../platform/engine/workspace-fairness';
import { createStagedRolloutService } from '../../../platform/engine/staged-rollout';
import { createReleaseEvidenceService } from '../../../platform/engine/release-evidence';
import { createSloDashboardService } from '../../../platform/engine/slo-dashboard';
import type { QueueItem } from '../../../platform/engine/sla-prioritizer';
import type { ConfidenceRoutingInput } from '../../../platform/engine/confidence-router';
import type {
  WorkspaceSlot,
  FairnessCheckInput,
} from '../../../platform/engine/workspace-fairness';
import type {
  CreateRolloutPlanInput,
  StageMetrics,
  RolloutStageName,
} from '../../../platform/engine/staged-rollout';
import type {
  CreateEvidenceBundleInput,
  SubmitEvidenceInput,
} from '../../../platform/engine/release-evidence';
import type { RecordSpanEventInput } from '../../../platform/engine/slo-dashboard';

export async function registerSlaDeploymentRoutes(
  app: FastifyInstance,
  ctx: ServiceContext
): Promise<void> {
  const slaPrioritizer = createSlaQueuePrioritizerService(ctx);
  const confidenceRouter = createConfidenceRouterService(ctx);
  const workspaceFairness = createWorkspaceFairnessService(ctx);
  const stagedRollout = createStagedRolloutService(ctx);
  const releaseEvidence = createReleaseEvidenceService(ctx);
  const sloDashboard = createSloDashboardService(ctx);

  // ── M5-E1-I1: SLA Queue Prioritization ──────────────────────

  app.post('/api/sla-deployment/queue/prioritize', async (req, reply) => {
    const body = req.body as { items: QueueItem[] };
    const result = slaPrioritizer.prioritizeQueue(body.items ?? []);
    return reply.status(200).send({ ok: true, ...result });
  });

  app.post('/api/sla-deployment/queue/item-priority', async (req, reply) => {
    const item = req.body as QueueItem;
    const result = slaPrioritizer.computeItemPriority(item);
    return reply.status(200).send({ ok: true, item: result });
  });

  // ── M5-E1-I2: Confidence/Risk Routing ───────────────────────

  app.post('/api/sla-deployment/routing/decide', async (req, reply) => {
    const input = req.body as ConfidenceRoutingInput;
    const result = confidenceRouter.routeExecution(input);
    return reply.status(200).send({ ok: true, routing: result });
  });

  app.get('/api/sla-deployment/routing/policy', async (_req, reply) => {
    const policy = confidenceRouter.getDefaultPolicy();
    return reply.status(200).send({ ok: true, policy });
  });

  // ── M5-E1-I3: Workspace Fairness ────────────────────────────

  app.post('/api/sla-deployment/fairness/check', async (req, reply) => {
    const input = req.body as FairnessCheckInput;
    const result = workspaceFairness.checkWorkspace(input);
    return reply.status(200).send({ ok: true, check: result });
  });

  app.post('/api/sla-deployment/fairness/snapshot', async (req, reply) => {
    const body = req.body as {
      slots: WorkspaceSlot[];
      globalInFlight: number;
      policy?: Record<string, unknown>;
    };
    const result = workspaceFairness.computeSnapshot(
      body.slots ?? [],
      body.globalInFlight ?? 0,
      body.policy
    );
    return reply.status(200).send({ ok: true, snapshot: result });
  });

  app.get('/api/sla-deployment/fairness/policy', async (_req, reply) => {
    const policy = workspaceFairness.getDefaultPolicy();
    return reply.status(200).send({ ok: true, policy });
  });

  // ── M5-E2-I1: Staged Rollout ─────────────────────────────────

  app.post('/api/sla-deployment/rollout/plans', async (req, reply) => {
    const input = req.body as CreateRolloutPlanInput;
    const plan = stagedRollout.createPlan(input);
    return reply.status(201).send({ ok: true, plan });
  });

  app.get('/api/sla-deployment/rollout/plans', async (req, reply) => {
    const { workspaceId } = req.query as { workspaceId?: string };
    const plans = stagedRollout.listPlans(workspaceId);
    return reply.status(200).send({ ok: true, plans, total: plans.length });
  });

  app.get('/api/sla-deployment/rollout/plans/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const plan = stagedRollout.getPlan(id);
    if (!plan) return reply.status(404).send({ ok: false, error: 'Rollout plan not found.' });
    return reply.status(200).send({ ok: true, plan });
  });

  app.post('/api/sla-deployment/rollout/plans/:id/evaluate', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { stage: RolloutStageName; metrics: StageMetrics };
    const result = stagedRollout.evaluateStage(id, body.stage, body.metrics);
    return reply.status(200).send({ ok: true, evaluation: result });
  });

  app.post('/api/sla-deployment/rollout/plans/:id/rollback', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { stage: RolloutStageName; metrics: StageMetrics; reason: string };
    const trigger = stagedRollout.triggerRollback(id, body.stage, body.metrics, body.reason);
    return reply.status(200).send({ ok: true, rollback: trigger });
  });

  // ── M5-E2-I2: Release Evidence ───────────────────────────────

  app.post('/api/sla-deployment/evidence/bundles', async (req, reply) => {
    const input = req.body as CreateEvidenceBundleInput;
    const bundle = releaseEvidence.createBundle(input);
    return reply.status(201).send({ ok: true, bundle });
  });

  app.get('/api/sla-deployment/evidence/bundles', async (req, reply) => {
    const { releaseId } = req.query as { releaseId?: string };
    const bundles = releaseEvidence.listBundles(releaseId);
    return reply.status(200).send({ ok: true, bundles, total: bundles.length });
  });

  app.get('/api/sla-deployment/evidence/bundles/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const bundle = releaseEvidence.getBundle(id);
    if (!bundle) return reply.status(404).send({ ok: false, error: 'Evidence bundle not found.' });
    return reply.status(200).send({ ok: true, bundle });
  });

  app.post('/api/sla-deployment/evidence/bundles/:id/submit', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Omit<SubmitEvidenceInput, 'bundleId'>;
    try {
      const bundle = releaseEvidence.submitEvidence({ bundleId: id, ...body });
      return reply.status(200).send({ ok: true, bundle });
    } catch (err) {
      return reply.status(404).send({ ok: false, error: (err as Error).message });
    }
  });

  app.get('/api/sla-deployment/evidence/bundles/:id/validate', async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = releaseEvidence.validateBundle(id);
    return reply.status(200).send({ ok: true, validation: result });
  });

  // ── M5-E2-I3: SLO Dashboard ──────────────────────────────────

  app.post('/api/sla-deployment/slo/spans', async (req, reply) => {
    const input = req.body as RecordSpanEventInput;
    const span = sloDashboard.recordSpanEvent(input);
    return reply.status(201).send({ ok: true, span });
  });

  app.get('/api/sla-deployment/slo/snapshot', async (req, reply) => {
    const { workspaceId, releaseId } = req.query as {
      workspaceId?: string;
      releaseId?: string;
    };
    const snapshot = sloDashboard.computeSnapshot(workspaceId, releaseId);
    return reply.status(200).send({ ok: true, snapshot });
  });

  app.get('/api/sla-deployment/slo/breaches', async (req, reply) => {
    const { workspaceId } = req.query as { workspaceId?: string };
    const breaches = sloDashboard.listBreachIndicators(workspaceId);
    return reply.status(200).send({ ok: true, breaches, total: breaches.length });
  });

  app.get('/api/sla-deployment/slo/targets', async (_req, reply) => {
    const targets = sloDashboard.getDefaultTargets();
    return reply.status(200).send({ ok: true, targets });
  });
}
