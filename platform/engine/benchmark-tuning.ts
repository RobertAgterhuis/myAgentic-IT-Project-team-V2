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

export interface GoldenTaskCase {
  taskId: string;
  prompt: string;
  weight?: number;
}

export interface GoldenTaskSuite {
  suiteId: string;
  version: string;
  tasks: GoldenTaskCase[];
}

export interface PromptABRun {
  runId: string;
  suiteId?: string;
  agentId?: string;
  promptVariantId?: string;
  tasks: Array<{
    taskId: string;
    score: number;
    pass: boolean;
    latencyMs?: number;
  }>;
}

export interface PromptABComparison {
  comparisonId: string;
  comparedAt: string;
  suiteId: string;
  baselineRunId: string;
  candidateRunId: string;
  comparedTaskCount: number;
  baseline: {
    weightedScore: number;
    passRatePct: number;
    avgLatencyMs: number | null;
  };
  candidate: {
    weightedScore: number;
    passRatePct: number;
    avgLatencyMs: number | null;
  };
  deltas: {
    weightedScore: number;
    passRatePct: number;
    avgLatencyMs: number | null;
  };
  verdict: 'improved' | 'stable' | 'regressed';
  taskComparisons: Array<{
    taskId: string;
    baselineScore: number;
    candidateScore: number;
    scoreDelta: number;
    baselinePass: boolean;
    candidatePass: boolean;
    baselineLatencyMs: number | null;
    candidateLatencyMs: number | null;
    latencyDeltaMs: number | null;
  }>;
}

export class BenchmarkTuningService {
  private ctx: ServiceContext;
  private proposalsPath = 'BusinessDocs/intelligence-loop/tuning-proposals.jsonl';
  private comparisonsPath = 'BusinessDocs/intelligence-loop/benchmark-comparisons.jsonl';
  private promptAbComparisonsPath = 'BusinessDocs/intelligence-loop/prompt-ab-comparisons.jsonl';

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

  async comparePromptVariants(input: {
    baselineRunId: string;
    candidateRunId: string;
    suiteId?: string;
  }): Promise<PromptABComparison> {
    const baseline = this.loadPromptABRun(input.baselineRunId);
    const candidate = this.loadPromptABRun(input.candidateRunId);
    const suiteId = input.suiteId || candidate.suiteId || baseline.suiteId;
    if (!suiteId) {
      throw new Error('Prompt A/B comparison requires suiteId on request or run artifacts');
    }

    const suite = this.loadGoldenTaskSuite(suiteId);
    const baselineByTask = new Map(baseline.tasks.map((task) => [task.taskId, task]));
    const candidateByTask = new Map(candidate.tasks.map((task) => [task.taskId, task]));

    const missingBaseline = suite.tasks
      .map((task) => task.taskId)
      .filter((taskId) => !baselineByTask.has(taskId));
    const missingCandidate = suite.tasks
      .map((task) => task.taskId)
      .filter((taskId) => !candidateByTask.has(taskId));

    if (missingBaseline.length > 0 || missingCandidate.length > 0) {
      throw new Error(
        `Stable benchmark mismatch. Missing baseline tasks: ${missingBaseline.join(', ') || 'none'}; missing candidate tasks: ${missingCandidate.join(', ') || 'none'}`
      );
    }

    const taskComparisons = suite.tasks.map((task) => {
      const baselineTask = baselineByTask.get(task.taskId)!;
      const candidateTask = candidateByTask.get(task.taskId)!;
      const baselineLatencyMs =
        typeof baselineTask.latencyMs === 'number' ? baselineTask.latencyMs : null;
      const candidateLatencyMs =
        typeof candidateTask.latencyMs === 'number' ? candidateTask.latencyMs : null;

      return {
        taskId: task.taskId,
        baselineScore: baselineTask.score,
        candidateScore: candidateTask.score,
        scoreDelta: candidateTask.score - baselineTask.score,
        baselinePass: baselineTask.pass,
        candidatePass: candidateTask.pass,
        baselineLatencyMs,
        candidateLatencyMs,
        latencyDeltaMs:
          baselineLatencyMs !== null && candidateLatencyMs !== null
            ? candidateLatencyMs - baselineLatencyMs
            : null,
      };
    });

    const totalWeight = suite.tasks.reduce((sum, task) => sum + (task.weight ?? 1), 0);
    const baselineWeightedScore =
      suite.tasks.reduce((sum, task) => {
        const baselineTask = baselineByTask.get(task.taskId)!;
        return sum + baselineTask.score * (task.weight ?? 1);
      }, 0) / totalWeight;
    const candidateWeightedScore =
      suite.tasks.reduce((sum, task) => {
        const candidateTask = candidateByTask.get(task.taskId)!;
        return sum + candidateTask.score * (task.weight ?? 1);
      }, 0) / totalWeight;

    const baselinePassRatePct =
      (taskComparisons.filter((task) => task.baselinePass).length / taskComparisons.length) * 100;
    const candidatePassRatePct =
      (taskComparisons.filter((task) => task.candidatePass).length / taskComparisons.length) * 100;

    const baselineLatencyValues = taskComparisons
      .map((task) => task.baselineLatencyMs)
      .filter((value): value is number => typeof value === 'number');
    const candidateLatencyValues = taskComparisons
      .map((task) => task.candidateLatencyMs)
      .filter((value): value is number => typeof value === 'number');

    const baselineAvgLatencyMs =
      baselineLatencyValues.length > 0
        ? baselineLatencyValues.reduce((sum, value) => sum + value, 0) /
          baselineLatencyValues.length
        : null;
    const candidateAvgLatencyMs =
      candidateLatencyValues.length > 0
        ? candidateLatencyValues.reduce((sum, value) => sum + value, 0) /
          candidateLatencyValues.length
        : null;

    const weightedDelta = candidateWeightedScore - baselineWeightedScore;
    const verdict = weightedDelta > 1 ? 'improved' : weightedDelta < -1 ? 'regressed' : 'stable';

    const comparison: PromptABComparison = {
      comparisonId: `PROMPTAB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      comparedAt: new Date().toISOString(),
      suiteId,
      baselineRunId: input.baselineRunId,
      candidateRunId: input.candidateRunId,
      comparedTaskCount: taskComparisons.length,
      baseline: {
        weightedScore: baselineWeightedScore,
        passRatePct: baselinePassRatePct,
        avgLatencyMs: baselineAvgLatencyMs,
      },
      candidate: {
        weightedScore: candidateWeightedScore,
        passRatePct: candidatePassRatePct,
        avgLatencyMs: candidateAvgLatencyMs,
      },
      deltas: {
        weightedScore: weightedDelta,
        passRatePct: candidatePassRatePct - baselinePassRatePct,
        avgLatencyMs:
          baselineAvgLatencyMs !== null && candidateAvgLatencyMs !== null
            ? candidateAvgLatencyMs - baselineAvgLatencyMs
            : null,
      },
      verdict,
      taskComparisons,
    };

    this.appendText(this.promptAbComparisonsPath, `${JSON.stringify(comparison)}\n`);
    return comparison;
  }

  private loadGoldenTaskSuite(suiteId: string): GoldenTaskSuite {
    const path = `tests/load/golden-tasks/${suiteId}.json`;
    const content = this.readText(path);
    if (!content) {
      throw new Error(`Golden task suite not found: ${path}`);
    }

    const parsed = JSON.parse(content) as GoldenTaskSuite;
    if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      throw new Error(`Invalid golden task suite: ${path}`);
    }

    const seen = new Set<string>();
    for (const task of parsed.tasks) {
      if (!task || typeof task.taskId !== 'string' || task.taskId.trim() === '') {
        throw new Error(`Invalid golden task entry in suite: ${path}`);
      }
      if (seen.has(task.taskId)) {
        throw new Error(`Duplicate golden task id in suite ${suiteId}: ${task.taskId}`);
      }
      seen.add(task.taskId);
    }

    return {
      suiteId: parsed.suiteId || suiteId,
      version: parsed.version || '1.0.0',
      tasks: parsed.tasks,
    };
  }

  private loadPromptABRun(runId: string): PromptABRun {
    const path = `tests/load/${runId}.json`;
    const content = this.readText(path);
    if (!content) {
      throw new Error(`Prompt A/B run artifact not found: ${path}`);
    }

    const parsed = JSON.parse(content) as PromptABRun;
    if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      throw new Error(`Invalid prompt A/B run artifact: ${path}`);
    }

    const tasks = parsed.tasks.map((task) => {
      if (!task || typeof task.taskId !== 'string' || typeof task.score !== 'number') {
        throw new Error(`Invalid prompt A/B run task row in ${path}`);
      }
      return {
        taskId: task.taskId,
        score: task.score,
        pass: Boolean(task.pass),
        latencyMs: typeof task.latencyMs === 'number' ? task.latencyMs : undefined,
      };
    });

    return {
      runId,
      suiteId: parsed.suiteId,
      agentId: parsed.agentId,
      promptVariantId: parsed.promptVariantId,
      tasks,
    };
  }
}

export async function createBenchmarkTuningService(
  ctx: ServiceContext
): Promise<BenchmarkTuningService> {
  return new BenchmarkTuningService(ctx);
}
