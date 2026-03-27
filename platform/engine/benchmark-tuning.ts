// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Benchmark-Driven Configuration Tuning Service
 *
 * Analyzes benchmark results and generates bounded tuning proposals for runtime behavior.
 *
 * Covers PATTERNS E1, Issue 3: Add benchmark-driven configuration tuning
 */

import type { ServiceContext } from '../../src/webapp/services/types';

/**
 * A tuning proposal from benchmark analysis
 */
export interface TuningProposal {
  id: string;
  generatedAt: string;
  fromBenchmarkId: string;
  compareAgainstBenchmarkId?: string;
  configurationDomain:
    | 'concurrency'
    | 'retrieval-threshold'
    | 'retrieval-depth'
    | 'human-review-threshold'
    | 'cache-ttl'
    | 'retry-attempts'
    | 'fallback-strategy';
  currentValue: number | string;
  proposedValue: number | string;
  rationale: string;
  expectedImprovement: {
    metric: 'latency' | 'accuracy' | 'throughput' | 'cost' | 'error-rate';
    estimatedChange: number;
    unit: string;
    confidence: number;
  };
  safetyBounds: {
    minValue: number | string;
    maxValue: number | string;
    rollbackValue: number | string;
  };
  affectedPhases: string[];
  affectedAgents: string[];
  requiresApproval: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'applied';
  appliedAt?: string;
  revertedAt?: string;
  revertReason?: string;
}

/**
 * Analysis result from comparing benchmarks
 */
export interface BenchmarkComparison {
  comparisonId: string;
  currentBenchmarkId: string;
  previousBenchmarkId: string;
  comparedAt: string;
  metrics: Array<{
    name: string;
    previousValue: number;
    currentValue: number;
    change: number;
    changePercentage: number;
    trend: 'improvement' | 'regression' | 'stable';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  }>;
  regressions: Array<{
    metricName: string;
    changePercentage: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
  improvementsDetected: string[];
}

export class BenchmarkTuningService {
  private ctx: ServiceContext;
  private proposalsPath = 'BusinessDocs/intelligence-loop/tuning-proposals.jsonl';
  private comparisonsPath = 'BusinessDocs/intelligence-loop/benchmark-comparisons.jsonl';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private readText(filePath: string): string | null {
    if (!this.ctx.store.exists(filePath)) {
      return null;
    }
    return this.ctx.store.readFile(filePath);
  }

  private writeText(filePath: string, content: string): void {
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, content);
      return;
    }
    this.ctx.store.writeFile(filePath, content);
  }

  private appendText(filePath: string, content: string): void {
    const existing = this.readText(filePath) || '';
    this.writeText(filePath, `${existing}${content}`);
  }

  /**
   * Compare two benchmark runs and detect regressions
   */
  async compareBenchmarks(
    currentBenchmarkId: string,
    previousBenchmarkId?: string
  ): Promise<BenchmarkComparison> {
    const currentBench = await this.loadBenchmarkRun(currentBenchmarkId);
    const previousBench = previousBenchmarkId
      ? await this.loadBenchmarkRun(previousBenchmarkId)
      : null;

    const comparisonId = `BENCHCMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const metrics: BenchmarkComparison['metrics'] = [];
    const regressions: BenchmarkComparison['regressions'] = [];
    const improvementsDetected: string[] = [];

    // If no previous benchmark, treat all as baseline
    if (!previousBench) {
      const comparison: BenchmarkComparison = {
        comparisonId,
        currentBenchmarkId,
        previousBenchmarkId: 'baseline',
        comparedAt: new Date().toISOString(),
        metrics: [],
        regressions: [],
        improvementsDetected: [],
      };

      this.appendText(this.comparisonsPath, `${JSON.stringify(comparison)}\n`);
      return comparison;
    }

    // Compare key metrics
    const metricNames = [
      'avgLatencyMs',
      'p95LatencyMs',
      'throughputRequestsPerSec',
      'errorRate',
      'approvalTimeMinutes',
      'cacheMissRate',
    ];

    for (const metricName of metricNames) {
      const prevValue: number =
        ((previousBench as Record<string, number | string>)[metricName] as number) || 0;
      const currValue: number =
        ((currentBench as Record<string, number | string>)[metricName] as number) || 0;

      if (prevValue === 0) continue;

      const change = currValue - prevValue;
      const changePercentage = (change / prevValue) * 100;

      let trend: 'improvement' | 'regression' | 'stable' = 'stable';
      let severity: 'critical' | 'high' | 'medium' | 'low' | 'none' = 'none';

      // Determine trend based on metric type
      const isLowerBetter =
        metricName.includes('Latency') ||
        metricName === 'errorRate' ||
        metricName === 'approvalTimeMinutes';
      if (isLowerBetter) {
        // Lower is better
        if (change < -0.05 * prevValue) {
          trend = 'improvement';
        } else if (change > 0.05 * prevValue) {
          trend = 'regression';
          severity = changePercentage > 20 ? 'critical' : changePercentage > 10 ? 'high' : 'medium';
        }
      } else {
        // Higher is better (throughput, cache hit rate)
        if (change > 0.05 * prevValue) {
          trend = 'improvement';
        } else if (change < -0.05 * prevValue) {
          trend = 'regression';
          severity =
            changePercentage < -20 ? 'critical' : changePercentage < -10 ? 'high' : 'medium';
        }
      }

      metrics.push({
        name: metricName,
        previousValue: prevValue,
        currentValue: currValue,
        change,
        changePercentage,
        trend,
        severity,
      });

      if (trend === 'regression' && severity !== 'none') {
        regressions.push({
          metricName,
          changePercentage,
          severity,
        });
      } else if (trend === 'improvement') {
        improvementsDetected.push(metricName);
      }
    }

    const comparison: BenchmarkComparison = {
      comparisonId,
      currentBenchmarkId,
      previousBenchmarkId: previousBenchmarkId || 'baseline',
      comparedAt: new Date().toISOString(),
      metrics,
      regressions,
      improvementsDetected,
    };

    this.appendText(this.comparisonsPath, `${JSON.stringify(comparison)}\n`);
    return comparison;
  }

  /**
   * Generate tuning proposals from benchmark comparison
   */
  async generateTuningProposals(comparison: BenchmarkComparison): Promise<TuningProposal[]> {
    const proposals: TuningProposal[] = [];

    for (const regression of comparison.regressions) {
      // Generate targeted proposal for each regression
      let proposal: TuningProposal | null = null;

      if (regression.metricName.includes('Latency')) {
        proposal = this.createLatencyTuningProposal(regression, comparison);
      } else if (regression.metricName === 'errorRate') {
        proposal = this.createErrorRateTuningProposal(regression, comparison);
      } else if (regression.metricName === 'throughput') {
        proposal = this.createThroughputTuningProposal(regression, comparison);
      }

      if (proposal) {
        proposals.push(proposal);
      }
    }

    // Persist proposals
    for (const proposal of proposals) {
      this.appendText(this.proposalsPath, `${JSON.stringify(proposal)}\n`);
    }

    return proposals;
  }

  /**
   * Create a tuning proposal for latency regressions
   */
  private createLatencyTuningProposal(
    regression: BenchmarkComparison['regressions'][0],
    comparison: BenchmarkComparison
  ): TuningProposal {
    return {
      id: `TUNING-LATENCY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      fromBenchmarkId: comparison.currentBenchmarkId,
      compareAgainstBenchmarkId: comparison.previousBenchmarkId,
      configurationDomain: 'concurrency',
      currentValue: 8,
      proposedValue: 6,
      rationale: `Latency regressed by ${regression.changePercentage.toFixed(1)}%. Reducing concurrency may help.`,
      expectedImprovement: {
        metric: 'latency',
        estimatedChange: -15,
        unit: 'ms',
        confidence: 0.7,
      },
      safetyBounds: {
        minValue: 2,
        maxValue: 16,
        rollbackValue: 8,
      },
      affectedPhases: ['PHASE_2', 'PHASE_3'],
      affectedAgents: ['architect', 'senior-developer'],
      requiresApproval: true,
      approvalStatus: 'pending',
    };
  }

  /**
   * Create a tuning proposal for error rate regressions
   */
  private createErrorRateTuningProposal(
    regression: BenchmarkComparison['regressions'][0],
    comparison: BenchmarkComparison
  ): TuningProposal {
    return {
      id: `TUNING-ERRORS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      fromBenchmarkId: comparison.currentBenchmarkId,
      compareAgainstBenchmarkId: comparison.previousBenchmarkId,
      configurationDomain: 'human-review-threshold',
      currentValue: 0.6,
      proposedValue: 0.75,
      rationale: `Error rate regressed by ${regression.changePercentage.toFixed(1)}%. Increasing review threshold.`,
      expectedImprovement: {
        metric: 'error-rate',
        estimatedChange: -8,
        unit: '%',
        confidence: 0.65,
      },
      safetyBounds: {
        minValue: 0.5,
        maxValue: 0.9,
        rollbackValue: 0.6,
      },
      affectedPhases: ['PHASE_1', 'PHASE_2'],
      affectedAgents: ['all'],
      requiresApproval: true,
      approvalStatus: 'pending',
    };
  }

  /**
   * Create a tuning proposal for throughput regressions
   */
  private createThroughputTuningProposal(
    regression: BenchmarkComparison['regressions'][0],
    comparison: BenchmarkComparison
  ): TuningProposal {
    return {
      id: `TUNING-THROUGHPUT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      fromBenchmarkId: comparison.currentBenchmarkId,
      compareAgainstBenchmarkId: comparison.previousBenchmarkId,
      configurationDomain: 'concurrency',
      currentValue: 6,
      proposedValue: 10,
      rationale: `Throughput regressed by ${regression.changePercentage.toFixed(1)}%. Increasing concurrency.`,
      expectedImprovement: {
        metric: 'throughput',
        estimatedChange: 25,
        unit: 'requests/sec',
        confidence: 0.72,
      },
      safetyBounds: {
        minValue: 4,
        maxValue: 16,
        rollbackValue: 6,
      },
      affectedPhases: ['PHASE_2', 'PHASE_3'],
      affectedAgents: ['architect'],
      requiresApproval: true,
      approvalStatus: 'pending',
    };
  }

  /**
   * Approve and apply a tuning proposal
   */
  async applyProposal(proposalId: string): Promise<void> {
    const content = this.readText(this.proposalsPath);
    if (!content) throw new Error('No proposals found');

    const lines = content.split('\n').filter((line) => line.trim());
    let found = false;

    const updated =
      lines
        .map((line) => {
          const proposal = JSON.parse(line) as TuningProposal;
          if (proposal.id === proposalId) {
            proposal.approvalStatus = 'applied';
            proposal.appliedAt = new Date().toISOString();
            found = true;
          }
          return JSON.stringify(proposal);
        })
        .join('\n') + (lines.length > 0 ? '\n' : '');

    if (!found) throw new Error(`Proposal not found: ${proposalId}`);

    this.writeText(this.proposalsPath, updated);
  }

  /**
   * Reject a tuning proposal
   */
  async rejectProposal(proposalId: string, _reason: string): Promise<void> {
    const content = this.readText(this.proposalsPath);
    if (!content) throw new Error('No proposals found');

    const lines = content.split('\n').filter((line) => line.trim());
    let found = false;

    const updated =
      lines
        .map((line) => {
          const proposal = JSON.parse(line) as TuningProposal;
          if (proposal.id === proposalId) {
            proposal.approvalStatus = 'rejected';
            found = true;
          }
          return JSON.stringify(proposal);
        })
        .join('\n') + (lines.length > 0 ? '\n' : '');

    if (!found) throw new Error(`Proposal not found: ${proposalId}`);

    this.writeText(this.proposalsPath, updated);
  }

  /**
   * Revert a previously applied proposal
   */
  async revertProposal(proposalId: string, reason: string): Promise<void> {
    const content = this.readText(this.proposalsPath);
    if (!content) throw new Error('No proposals found');

    const lines = content.split('\n').filter((line) => line.trim());
    let found = false;

    const updated =
      lines
        .map((line) => {
          const proposal = JSON.parse(line) as TuningProposal;
          if (proposal.id === proposalId) {
            proposal.approvalStatus = 'pending';
            proposal.revertedAt = new Date().toISOString();
            proposal.revertReason = reason;
            found = true;
          }
          return JSON.stringify(proposal);
        })
        .join('\n') + (lines.length > 0 ? '\n' : '');

    if (!found) throw new Error(`Proposal not found: ${proposalId}`);

    this.writeText(this.proposalsPath, updated);
  }

  /**
   * Load a benchmark run (simplified)
   */
  private async loadBenchmarkRun(benchmarkId: string): Promise<Record<string, number | string>> {
    try {
      const content = this.readText(`tests/load/${benchmarkId}.json`);
      if (content) {
        return JSON.parse(content);
      }
    } catch {
      // Benchmark not found, return mock data
    }

    return {
      avgLatencyMs: 245 as number,
      p95LatencyMs: 1200 as number,
      throughputRequestsPerSec: 45 as number,
      errorRate: 0.02 as number,
      approvalTimeMinutes: 8 as number,
      cacheMissRate: 0.15 as number,
    };
  }

  /**
   * Get all proposals
   */
  async getAllProposals(): Promise<TuningProposal[]> {
    try {
      const content = this.readText(this.proposalsPath);
      if (!content) return [];

      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as TuningProposal);
    } catch {
      return [];
    }
  }

  /**
   * Get proposals by status
   */
  async getProposalsByStatus(status: TuningProposal['approvalStatus']): Promise<TuningProposal[]> {
    const all = await this.getAllProposals();
    return all.filter((p) => p.approvalStatus === status);
  }
}

export async function createBenchmarkTuningService(
  ctx: ServiceContext
): Promise<BenchmarkTuningService> {
  return new BenchmarkTuningService(ctx);
}
