// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Staged Rollout Orchestrator — M5-E2-I1
 *
 * Gates release stages and auto-triggers rollback when breach signals are detected.
 * Supports canary → partial → full rollout stages with configurable thresholds.
 *
 * Issue: #1473
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type RolloutStageName = 'canary' | 'partial' | 'full';

export type RolloutStatus =
  | 'pending'
  | 'in-progress'
  | 'passed'
  | 'failed'
  | 'rolled-back'
  | 'completed';

export interface RolloutStageDefinition {
  name: RolloutStageName;
  /** Percentage of traffic/population to expose */
  trafficPercent: number;
  /** Required success rate (0–1) to advance to next stage */
  successRateThreshold: number;
  /** Maximum allowed error rate (0–1) before rollback */
  maxErrorRate: number;
  /** Maximum allowed P99 latency in ms before rollback */
  maxLatencyP99Ms: number;
  /** Minimum dwell time in minutes before evaluation */
  dwellMinutes: number;
}

export interface RolloutPlan {
  id: string;
  releaseId: string;
  workspaceId: string;
  stages: RolloutStageDefinition[];
  createdAt: string;
  status: RolloutStatus;
  currentStage?: RolloutStageName;
}

export interface StageMetrics {
  successRate: number;
  errorRate: number;
  latencyP99Ms: number;
  sampleCount: number;
  observedMinutes: number;
}

export interface RolloutEvaluationResult {
  planId: string;
  stage: RolloutStageName;
  status: 'advance' | 'hold' | 'rollback';
  reasons: string[];
  metricsSnapshot: StageMetrics;
  evaluatedAt: string;
}

export interface RollbackTrigger {
  planId: string;
  stage: RolloutStageName;
  reason: string;
  triggeredAt: string;
  metrics: StageMetrics;
}

export interface CreateRolloutPlanInput {
  releaseId: string;
  workspaceId: string;
  stages?: Partial<RolloutStageDefinition>[];
}

// ─── Default stages ───────────────────────────────────────────

const DEFAULT_STAGES: RolloutStageDefinition[] = [
  {
    name: 'canary',
    trafficPercent: 5,
    successRateThreshold: 0.98,
    maxErrorRate: 0.02,
    maxLatencyP99Ms: 2000,
    dwellMinutes: 30,
  },
  {
    name: 'partial',
    trafficPercent: 25,
    successRateThreshold: 0.97,
    maxErrorRate: 0.03,
    maxLatencyP99Ms: 2500,
    dwellMinutes: 60,
  },
  {
    name: 'full',
    trafficPercent: 100,
    successRateThreshold: 0.95,
    maxErrorRate: 0.05,
    maxLatencyP99Ms: 3000,
    dwellMinutes: 120,
  },
];

const PLANS_PATH = 'BusinessDocs/deployment/rollout-plans.json';

// ─── Service ─────────────────────────────────────────────────

export interface StagedRolloutService {
  createPlan(input: CreateRolloutPlanInput): RolloutPlan;
  evaluateStage(
    planId: string,
    stage: RolloutStageName,
    metrics: StageMetrics
  ): RolloutEvaluationResult;
  triggerRollback(
    planId: string,
    stage: RolloutStageName,
    metrics: StageMetrics,
    reason: string
  ): RollbackTrigger;
  getPlan(planId: string): RolloutPlan | undefined;
  listPlans(workspaceId?: string): RolloutPlan[];
}

export function createStagedRolloutService(ctx: ServiceContext): StagedRolloutService {
  function loadPlans(): RolloutPlan[] {
    if (!ctx.store.exists(PLANS_PATH)) return [];
    try {
      return JSON.parse(ctx.store.readFile(PLANS_PATH)) as RolloutPlan[];
    } catch {
      return [];
    }
  }

  function savePlans(plans: RolloutPlan[]): void {
    ctx.store.writeFile(PLANS_PATH, JSON.stringify(plans, null, 2));
  }

  function createPlan(input: CreateRolloutPlanInput): RolloutPlan {
    const plans = loadPlans();
    const stages: RolloutStageDefinition[] = input.stages
      ? input.stages.map((override, i) => ({
          ...DEFAULT_STAGES[i % DEFAULT_STAGES.length],
          ...override,
        }))
      : [...DEFAULT_STAGES];

    const plan: RolloutPlan = {
      id: `RP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      releaseId: input.releaseId,
      workspaceId: input.workspaceId,
      stages,
      createdAt: new Date().toISOString(),
      status: 'pending',
      currentStage: 'canary',
    };

    plans.push(plan);
    savePlans(plans);
    return plan;
  }

  function evaluateStage(
    planId: string,
    stage: RolloutStageName,
    metrics: StageMetrics
  ): RolloutEvaluationResult {
    const plans = loadPlans();
    const plan = plans.find((p) => p.id === planId);
    const stageDef = (plan?.stages ?? DEFAULT_STAGES).find((s) => s.name === stage);

    const reasons: string[] = [];
    let decision: 'advance' | 'hold' | 'rollback' = 'advance';

    // Dwell check
    if (stageDef && metrics.observedMinutes < stageDef.dwellMinutes) {
      decision = 'hold';
      reasons.push(
        `Dwell time ${metrics.observedMinutes}m < required ${stageDef.dwellMinutes}m — hold.`
      );
    }

    // Error rate breach
    if (stageDef && metrics.errorRate > stageDef.maxErrorRate) {
      decision = 'rollback';
      reasons.push(
        `Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds max ${(stageDef.maxErrorRate * 100).toFixed(1)}% — rollback.`
      );
    }

    // Latency breach
    if (stageDef && metrics.latencyP99Ms > stageDef.maxLatencyP99Ms) {
      decision = 'rollback';
      reasons.push(
        `P99 latency ${metrics.latencyP99Ms}ms exceeds max ${stageDef.maxLatencyP99Ms}ms — rollback.`
      );
    }

    // Success rate check
    if (stageDef && decision === 'advance' && metrics.successRate < stageDef.successRateThreshold) {
      decision = 'hold';
      reasons.push(
        `Success rate ${(metrics.successRate * 100).toFixed(1)}% below threshold ${(stageDef.successRateThreshold * 100).toFixed(1)}% — hold.`
      );
    }

    if (reasons.length === 0) {
      reasons.push(`Stage '${stage}' metrics within thresholds — advancing.`);
    }

    // Update plan status
    if (plan) {
      if (decision === 'rollback') {
        plan.status = 'rolled-back';
      } else if (decision === 'advance') {
        const stageOrder: RolloutStageName[] = ['canary', 'partial', 'full'];
        const nextIdx = stageOrder.indexOf(stage) + 1;
        if (nextIdx >= stageOrder.length) {
          plan.status = 'completed';
          plan.currentStage = undefined;
        } else {
          plan.status = 'in-progress';
          plan.currentStage = stageOrder[nextIdx];
        }
      } else {
        plan.status = 'in-progress';
      }
      savePlans(plans);
    }

    return {
      planId,
      stage,
      status: decision,
      reasons,
      metricsSnapshot: metrics,
      evaluatedAt: new Date().toISOString(),
    };
  }

  function triggerRollback(
    planId: string,
    stage: RolloutStageName,
    metrics: StageMetrics,
    reason: string
  ): RollbackTrigger {
    const plans = loadPlans();
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      plan.status = 'rolled-back';
      savePlans(plans);
    }
    return {
      planId,
      stage,
      reason,
      triggeredAt: new Date().toISOString(),
      metrics,
    };
  }

  function getPlan(planId: string): RolloutPlan | undefined {
    return loadPlans().find((p) => p.id === planId);
  }

  function listPlans(workspaceId?: string): RolloutPlan[] {
    const plans = loadPlans();
    return workspaceId ? plans.filter((p) => p.workspaceId === workspaceId) : plans;
  }

  return { createPlan, evaluateStage, triggerRollback, getPlan, listPlans };
}
