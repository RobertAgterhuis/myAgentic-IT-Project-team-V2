// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Goal Health Scoring Service
 *
 * Computes and tracks goal health status based on KPI drift, blockers, decisions, and benchmarks.
 *
 * Covers PATTERNS E2, Issue 2: Implement goal health scoring
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import type { Objective } from './objective-graph';

/**
 * Health factor contribution score
 */
export interface HealthFactor {
  score: number;
  weight: number;
  status: 'on-track' | 'warning' | 'at-risk' | 'critical';
  details?: Record<string, unknown>;
}

/**
 * Complete goal health assessment
 */
export interface GoalHealthAssessment {
  assessmentId: string;
  assessedAt: string;
  objectiveId: string;
  healthFactors: {
    kpiDrift?: HealthFactor;
    blockerCount?: HealthFactor;
    decisionCurrency?: HealthFactor;
    benchmarkRegression?: HealthFactor;
  };
  overallHealth: {
    score: number;
    status: 'healthy' | 'at-risk' | 'critical';
    trend: 'improving' | 'stable' | 'degrading';
  };
  recommendedActions: Array<{
    actionId: string;
    actionType: 'escalate' | 'remediate' | 'defer' | 'reassess' | 'notify' | 'reevaluate';
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    targetHealthImprovement: number;
  }>;
  assessmentMethod: 'automated' | 'manual' | 'hybrid';
  assessmentConfidence: number;
}

export class GoalHealthScoringService {
  private ctx: ServiceContext;
  private assessmentsPath = 'BusinessDocs/intelligence-loop/goal-health-assessments.jsonl';
  private previousAssessmentsCache: Map<string, GoalHealthAssessment> = new Map();

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private readText(filePath: string): string | null {
    if (!this.ctx.store.exists(filePath)) {
      return null;
    }
    return this.ctx.store.readFile(filePath);
  }

  private appendText(filePath: string, content: string): void {
    const existing = this.readText(filePath) || '';
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, `${existing}${content}`);
      return;
    }
    this.ctx.store.writeFile(filePath, `${existing}${content}`);
  }

  /**
   * Compute health for a single objective
   */
  async assessObjectiveHealth(objective: Objective): Promise<GoalHealthAssessment> {
    const assessmentId = `HEALTH-${objective.id}-${Date.now()}`;
    const assessedAt = new Date().toISOString();

    // Compute health factors
    const kpiDriftFactor = await this.computeKPIDriftFactor(objective);
    const blockerFactor = await this.computeBlockerFactor(objective);
    const decisionFactor = await this.computeDecisionCurrencyFactor(objective);
    const benchmarkFactor = await this.computeBenchmarkRegressionFactor(objective);

    // Compute weighted overall score
    const weighedFactors: number[] = [];
    const weights: number[] = [];

    if (kpiDriftFactor) {
      weighedFactors.push(kpiDriftFactor.score * kpiDriftFactor.weight);
      weights.push(kpiDriftFactor.weight);
    }
    if (blockerFactor) {
      weighedFactors.push(blockerFactor.score * blockerFactor.weight);
      weights.push(blockerFactor.weight);
    }
    if (decisionFactor) {
      weighedFactors.push(decisionFactor.score * decisionFactor.weight);
      weights.push(decisionFactor.weight);
    }
    if (benchmarkFactor) {
      weighedFactors.push(benchmarkFactor.score * benchmarkFactor.weight);
      weights.push(benchmarkFactor.weight);
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    const overallScore = weighedFactors.reduce((sum, s) => sum + s, 0) / totalWeight;

    // Determine overall status and trend
    const overallStatus = this.scoreToStatus(overallScore);
    const trend = await this.computeTrend(objective.id, overallScore);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(
      objective,
      overallStatus,
      kpiDriftFactor,
      blockerFactor,
      decisionFactor
    );

    const assessment: GoalHealthAssessment = {
      assessmentId,
      assessedAt,
      objectiveId: objective.id,
      healthFactors: {
        kpiDrift: kpiDriftFactor,
        blockerCount: blockerFactor,
        decisionCurrency: decisionFactor,
        benchmarkRegression: benchmarkFactor,
      },
      overallHealth: {
        score: Math.round(overallScore * 100) / 100,
        status: overallStatus,
        trend,
      },
      recommendedActions,
      assessmentMethod: 'automated',
      assessmentConfidence: 0.85,
    };

    // Persist assessment
    this.appendText(this.assessmentsPath, `${JSON.stringify(assessment)}\n`);

    // Cache for trend computation
    this.previousAssessmentsCache.set(objective.id, assessment);

    return assessment;
  }

  /**
   * Compute KPI drift health factor
   */
  private async computeKPIDriftFactor(objective: Objective): Promise<HealthFactor | undefined> {
    if (objective.kpis.length === 0) {
      return undefined;
    }

    const kpisAtRisk = objective.kpis.filter(
      (kpi) => kpi.driftStatus === 'at-risk' || kpi.driftStatus === 'critical'
    ).length;

    const riskPercentage = kpisAtRisk / objective.kpis.length;
    const score = Math.max(0, 10 - riskPercentage * 10);

    let status: HealthFactor['status'] = 'on-track';
    if (riskPercentage > 0.5) status = 'critical';
    else if (riskPercentage > 0.25) status = 'at-risk';
    else if (riskPercentage > 0.1) status = 'warning';

    return {
      score,
      weight: 0.35,
      status,
      details: {
        kpisAnalyzed: objective.kpis.length,
        kpisAtRisk,
        kpis: objective.kpis.map((kpi) => ({
          kpiId: kpi.id,
          currentValue: kpi.currentValue,
          targetValue: kpi.targetValue,
          driftStatus: kpi.driftStatus,
        })),
      },
    };
  }

  /**
   * Compute blocker count health factor
   */
  private async computeBlockerFactor(objective: Objective): Promise<HealthFactor> {
    const blockerCount = objective.blockerCount || objective.blockingDecisions.length;

    let status: HealthFactor['status'] = 'on-track';
    let score = 10;

    if (blockerCount > 5) {
      status = 'critical';
      score = Math.max(0, 10 - blockerCount);
    } else if (blockerCount > 2) {
      status = 'at-risk';
      score = 10 - blockerCount * 1.5;
    } else if (blockerCount > 0) {
      status = 'warning';
      score = 10 - blockerCount;
    }

    return {
      score: Math.max(0, score),
      weight: 0.3,
      status,
      details: {
        totalBlockers: blockerCount,
        criticalBlockers: objective.blockingDecisions.filter((d) => d.includes('CRITICAL')).length,
      },
    };
  }

  /**
   * Compute decision currency health factor
   */
  private async computeDecisionCurrencyFactor(objective: Objective): Promise<HealthFactor> {
    const totalDecisions = objective.blockingDecisions.length;

    // Estimate open decisions (simplified - in real system would query decisions service)
    const openDecisions = Math.ceil(totalDecisions * 0.4);
    const openPercentage = totalDecisions > 0 ? openDecisions / totalDecisions : 0;

    let status: HealthFactor['status'] = 'on-track';
    let score = 10;

    if (openPercentage > 0.5) {
      status = 'critical';
      score = 5;
    } else if (openPercentage > 0.3) {
      status = 'at-risk';
      score = 7;
    } else if (openPercentage > 0.1) {
      status = 'warning';
      score = 8.5;
    }

    return {
      score,
      weight: 0.2,
      status,
      details: {
        totalDecisions,
        openDecisions,
        overdueDecisions: 0,
      },
    };
  }

  /**
   * Compute benchmark regression health factor
   */
  private async computeBenchmarkRegressionFactor(
    _objective: Objective
  ): Promise<HealthFactor | undefined> {
    // Simplified - in real system would fetch actual benchmark data
    return {
      score: 9,
      weight: 0.15,
      status: 'on-track',
      details: {
        baselineRunId: 'none',
        currentRunId: 'none',
        regressionsDetected: [],
      },
    };
  }

  /**
   * Convert score to status
   */
  private scoreToStatus(score: number): 'healthy' | 'at-risk' | 'critical' {
    if (score >= 7) return 'healthy';
    if (score >= 4) return 'at-risk';
    return 'critical';
  }

  /**
   * Compute health trend (improving/stable/degrading)
   */
  private async computeTrend(
    objectiveId: string,
    currentScore: number
  ): Promise<'improving' | 'stable' | 'degrading'> {
    const previous = this.previousAssessmentsCache.get(objectiveId);

    if (!previous) {
      // Try to load previous assessment from file
      try {
        const content = this.readText(this.assessmentsPath);
        if (content) {
          const assessments = content
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line))
            .filter((a: GoalHealthAssessment) => a.objectiveId === objectiveId);

          if (assessments.length > 1) {
            const previousScore = assessments[assessments.length - 2].overallHealth.score;
            const diff = currentScore - previousScore;
            if (diff > 0.5) return 'improving';
            if (diff < -0.5) return 'degrading';
            return 'stable';
          }
        }
      } catch {
        // No previous data, assume stable
      }
      return 'stable';
    }

    const diff = currentScore - previous.overallHealth.score;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'degrading';
    return 'stable';
  }

  /**
   * Generate recommended actions based on health status
   */
  private generateRecommendedActions(
    objective: Objective,
    status: string,
    kpiFactor?: HealthFactor,
    blockerFactor?: HealthFactor,
    decisionFactor?: HealthFactor
  ): GoalHealthAssessment['recommendedActions'] {
    const actions: GoalHealthAssessment['recommendedActions'] = [];

    if (status === 'critical') {
      actions.push({
        actionId: `ACTION-${Date.now()}-1`,
        actionType: 'escalate',
        description: `Objective "${objective.name}" is at critical health (${status}). Escalate to product manager immediately.`,
        priority: 'critical',
        targetHealthImprovement: 3,
      });
    }

    if (blockerFactor && blockerFactor.status === 'critical') {
      actions.push({
        actionId: `ACTION-${Date.now()}-2`,
        actionType: 'remediate',
        description: 'High blocker count detected. Prioritize resolving open decisions.',
        priority: 'high',
        targetHealthImprovement: 2,
      });
    }

    if (kpiFactor && kpiFactor.status === 'at-risk') {
      actions.push({
        actionId: `ACTION-${Date.now()}-3`,
        actionType: 'reassess',
        description: 'Multiple KPIs are drifting. Reassess targets or increase investment.',
        priority: 'high',
        targetHealthImprovement: 2.5,
      });
    }

    if (decisionFactor && decisionFactor.status === 'warning') {
      actions.push({
        actionId: `ACTION-${Date.now()}-4`,
        actionType: 'notify',
        description: 'Decision queue is growing. Notify stakeholders for prioritization.',
        priority: 'medium',
        targetHealthImprovement: 1,
      });
    }

    if (status === 'at-risk' && actions.length === 0) {
      actions.push({
        actionId: `ACTION-${Date.now()}-5`,
        actionType: 'reevaluate',
        description: `Objective "${objective.name}" is at-risk. Consider reevaluate run to adjust strategy.`,
        priority: 'medium',
        targetHealthImprovement: 2,
      });
    }

    return actions;
  }

  /**
   * Get all health assessments for an objective
   */
  async getAssessmentsForObjective(objectiveId: string): Promise<GoalHealthAssessment[]> {
    try {
      const content = this.readText(this.assessmentsPath);
      if (!content) return [];

      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as GoalHealthAssessment)
        .filter((a) => a.objectiveId === objectiveId);
    } catch {
      return [];
    }
  }

  /**
   * Get latest assessment for an objective
   */
  async getLatestAssessment(objectiveId: string): Promise<GoalHealthAssessment | undefined> {
    const assessments = await this.getAssessmentsForObjective(objectiveId);
    return assessments[assessments.length - 1];
  }
}

export async function createGoalHealthScoringService(
  ctx: ServiceContext
): Promise<GoalHealthScoringService> {
  return new GoalHealthScoringService(ctx);
}
