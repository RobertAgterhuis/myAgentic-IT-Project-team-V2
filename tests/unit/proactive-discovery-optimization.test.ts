// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceContext } from '../../src/webapp/services/types';
import { createProactiveDiscoveryOptimizationService } from '../../platform/engine/proactive-discovery-optimization';

function createMockContext(): ServiceContext {
  const data = new Map<string, string>();

  const storeApi = {
    exists: vi.fn((filePath: string) => data.has(filePath)),
    readFile: vi.fn((filePath: string) => {
      const value = data.get(filePath);
      if (value === undefined) throw new Error(`ENOENT: ${filePath}`);
      return value;
    }),
    writeFile: vi.fn((filePath: string, content: string) => {
      data.set(filePath, content);
    }),
    mkdirp: vi.fn(),
    readdir: vi.fn((dirPath: string) => {
      if (dirPath !== 'Patterns') {
        return [];
      }
      return Array.from(data.keys())
        .filter((key) => key.startsWith('Patterns/') && key.toLowerCase().endsWith('.md'))
        .map((key) => key.slice('Patterns/'.length));
    }),
    stat: vi.fn(),
    mtime: vi.fn(() => 0),
  };

  return {
    store: storeApi,
    cache: {} as ServiceContext['cache'],
    audit: {} as ServiceContext['audit'],
    projectRoot: '.',
    businessDocs: 'BusinessDocs',
    sessionDir: 'BusinessDocs/session',
    decisionsFile: 'BusinessDocs/decisions.md',
    decisionsDir: 'BusinessDocs/decisions',
    commandQueue: 'BusinessDocs/command-queue.jsonl',
    helpDir: 'docs/help',
    safeWrite: vi.fn((filePath: string, dataText: string) => {
      data.set(filePath, dataText);
    }),
  } as unknown as ServiceContext;
}

describe('proactive-discovery-optimization service', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('detects stale and superseded knowledge and recommends reevaluate', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.scanKnowledgeStaleness({
      staleThresholdSeconds: 3600,
      nowIso: '2026-03-27T20:00:00.000Z',
      entities: [
        {
          id: 'DEC-1',
          type: 'decision',
          lastUpdatedAt: '2026-03-27T17:00:00.000Z',
          workflows: ['sprint-gate'],
        },
        {
          id: 'ART-2',
          type: 'artifact',
          lastUpdatedAt: '2026-03-27T19:45:00.000Z',
          supersededById: 'ART-3',
          workflows: ['approval'],
        },
      ],
    });

    expect(result.staleEntities).toBe(2);
    expect(result.findings.some((f) => f.staleReason === 'superseded')).toBe(true);
    expect(result.reevaluateRecommended).toBe(true);
  });

  it('finds contradictory decisions and missing citations and blocks synthesis on critical', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.detectContradictionsAndMissingCitations({
      artifacts: [
        {
          artifactId: 'phase2-architecture',
          phase: 'PHASE_2',
          content: 'Decision: transport=http\nThe API must enforce auth at gateway.',
        },
        {
          artifactId: 'synthesis-report',
          phase: 'SYNTHESIS',
          content: 'Decision: transport=grpc\nThis component should include end-to-end encryption.',
        },
      ],
    });

    expect(result.totalFindings).toBeGreaterThanOrEqual(2);
    expect(result.findings.some((f) => f.type === 'contradiction')).toBe(true);
    expect(result.findings.some((f) => f.type === 'missing-citation')).toBe(true);
    expect(result.blockSynthesisPublication).toBe(true);
  });

  it('generates ranked exploratory branches only when uncertainty is high', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const none = await svc.generateExploratoryBranches({
      taskId: 'TASK-low',
      objective: 'Improve discovery quality',
      basePlanSteps: ['step-1'],
      uncertainty: 0.2,
    });

    expect(none).toBeNull();

    const result = await svc.generateExploratoryBranches({
      taskId: 'TASK-high',
      objective: 'Improve discovery quality',
      basePlanSteps: ['step-1', 'step-2'],
      uncertainty: 0.82,
      maxAlternatives: 3,
      surfaceAt: 'approval',
    });

    expect(result).not.toBeNull();
    expect(result?.alternativesGenerated).toBe(3);
    expect(result?.branches[0].tradeoffScore).toBeGreaterThanOrEqual(
      result!.branches[1].tradeoffScore
    );
    expect(result?.surfacedAt).toBe('approval');
  });

  it('tunes concurrency with rollback safety when regression is detected', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.decideConcurrencyPolicy({
      currentMaxConcurrency: 8,
      queueWaitMs: 1200,
      failureRate: 0.22,
      throughputRps: 40,
      previousPolicy: {
        maxConcurrency: 6,
        baselineFailureRate: 0.1,
        baselineThroughputRps: 60,
        rollbackValue: 6,
      },
    });

    expect(result.rollbackApplied).toBe(true);
    expect(result.nextMaxConcurrency).toBe(6);
    expect(result.reasons.some((reason) => reason.toLowerCase().includes('rolling back'))).toBe(
      true
    );
  });

  it('adapts retrieval policy by risk and metrics, and emits route escalation traces', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const retrieval = await svc.decideRetrievalPolicy({
      riskLevel: 'high',
      citationUsefulness: 0.41,
      noMatchRate: 0.3,
      retrievalLatencyP95Ms: 1200,
      latencyBudgetMs: 900,
    });

    expect(retrieval.topK).toBeGreaterThanOrEqual(2);
    expect(retrieval.threshold).toBeGreaterThan(0.03);
    expect(retrieval.metadata.reasons.length).toBeGreaterThan(0);

    const escalated = await svc.decideRouteEscalation({
      confidence: 0.4,
      riskLevel: 'high',
    });
    expect(escalated.selectedRoute).toBe('verifier-heavy');

    const fast = await svc.decideRouteEscalation({
      confidence: 0.92,
      riskLevel: 'low',
    });
    expect(fast.selectedRoute).toBe('fast-path');

    const recent = await svc.listRecentRouteEscalations(2);
    expect(recent.length).toBe(2);
  });

  it('supports auditable and reversible adaptive policy proposal lifecycle', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    await svc.decideConcurrencyPolicy({
      currentMaxConcurrency: 8,
      queueWaitMs: 1900,
      failureRate: 0.05,
      throughputRps: 90,
    });

    const proposal = await svc.createAdaptivePolicyProposal({
      domain: 'concurrency',
      title: 'Increase bounded concurrency',
      rationale: 'Queue wait is elevated while failure rate remains low.',
      desiredChange: { maxConcurrency: 10 },
      decisionReferences: ['CONCURRENCY-1'],
      actor: 'architect',
    });

    expect(proposal.status).toBe('pending');
    expect(proposal.auditTrail[0].action).toBe('created');

    const approved = await svc.approveAdaptivePolicyProposal(
      proposal.proposalId,
      'reviewer',
      'Approved for rollout'
    );
    expect(approved?.status).toBe('approved');

    const applied = await svc.applyAdaptivePolicyProposal(
      proposal.proposalId,
      'operator',
      'Applied safely'
    );
    expect(applied?.status).toBe('applied');

    const reverted = await svc.revertAdaptivePolicyProposal(
      proposal.proposalId,
      'operator',
      'Rollback after drift spike'
    );
    expect(reverted?.status).toBe('reverted');

    const listed = await svc.listAdaptivePolicyProposals();
    expect(listed.length).toBe(1);
    expect(listed[0].auditTrail.length).toBeGreaterThanOrEqual(4);

    const summary = await svc.getAdaptiveBehaviorSummary();
    expect(summary.optimization.concurrencyDecisions).toBeGreaterThan(0);
    expect(summary.approvals.revertedProposals).toBe(1);
    expect(summary.latest.proposal?.proposalId).toBe(proposal.proposalId);

    const missing = await svc.approveAdaptivePolicyProposal('unknown', 'reviewer', 'no-op');
    expect(missing).toBeUndefined();
  });

  it('analyzes pattern score readiness and generates uplift proposals for low-scoring patterns', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    ctx.store.writeFile(
      'Patterns/01-prompt-chaining.md',
      '# Prompt Chaining\nCurrent score: 9.2/10\nTarget score: 9.9/10\n'
    );
    ctx.store.writeFile(
      'Patterns/02-routing.md',
      '# Routing\nCurrent score: 9.95/10\nTarget score: 9.95/10\n'
    );
    ctx.store.writeFile(
      'Patterns/03-parallelization.md',
      '# Parallelization\nCurrent score: 9.5/10\nTarget score: 9.9/10\n'
    );

    const analysis = await svc.analyzePatternScores({
      averageTarget: 9.9,
      minimumTarget: 9.4,
      limit: 2,
    });

    expect(analysis.totalPatterns).toBe(3);
    expect(analysis.averageCurrentScore).toBeLessThan(9.9);
    expect(analysis.minCurrentScore).toBe(9.2);
    expect(analysis.belowMinThresholdPatterns.length).toBe(1);
    expect(analysis.readyForM4Done).toBe(false);
    expect(analysis.topPriorityPatterns.length).toBe(2);

    const generated = await svc.generatePatternUpliftProposals({
      actor: 'optimizer',
      limit: 2,
      averageTarget: 9.9,
      minimumTarget: 9.4,
    });

    expect(generated.proposalsCreated.length).toBe(2);
    expect(generated.proposalsCreated[0].domain).toBe('pattern-uplift');
    expect(generated.analysis.totalPatterns).toBe(3);

    const allProposals = await svc.listAdaptivePolicyProposals();
    expect(allProposals.length).toBe(2);
    expect(allProposals.every((proposal) => proposal.domain === 'pattern-uplift')).toBe(true);
  });

  it('analyzes chain quality and recommends deeper review for weak predecessor contracts', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.analyzeChainQuality({
      currentChainDepth: 2,
      predecessorContracts: [
        {
          source: 'BusinessDocs/phase-1.md',
          headingCount: 1,
          hasHandoffChecklist: true,
          checklist: { total: 4, checked: 2, completionRatio: 0.5 },
        },
      ],
      unresolvedOpenItems: 3,
    });

    expect(result.qualityBand).toBe('weak');
    expect(result.recommendedChainDepth).toBe(3);
    expect(result.reasons.some((reason) => reason.includes('Unresolved open items'))).toBe(true);
  });

  it('builds dependency-aware execution groups and a critical path', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.planDependencyAwareExecution({
      items: [
        { id: 'A', estimatedDurationMinutes: 10, impactScore: 0.7, urgencyScore: 0.8 },
        { id: 'B', dependencies: ['A'], estimatedDurationMinutes: 20, impactScore: 0.9 },
        { id: 'C', dependencies: ['A'], estimatedDurationMinutes: 5, impactScore: 0.5 },
        { id: 'D', dependencies: ['B'], estimatedDurationMinutes: 15, impactScore: 0.8 },
      ],
    });

    expect(result.executionGroups).toEqual([['A'], ['B', 'C'], ['D']]);
    expect(result.criticalPath.steps).toEqual(['A', 'B', 'D']);
    expect(result.criticalPath.totalDurationMinutes).toBe(45);
  });

  it('scores tool reliability from execution traces', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const result = await svc.analyzeToolReliability({
      traces: [
        {
          toolId: 'search',
          success: true,
          durationMs: 120,
          planningReason: 'high recall',
          skippedTools: ['grep'],
          estimatedCostUsd: 0.02,
        },
        {
          toolId: 'search',
          success: false,
          durationMs: 220,
          planningReason: 'fallback',
          escalatedTo: 'manual-review',
          estimatedCostUsd: 0.03,
        },
      ],
    });

    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].toolId).toBe('search');
    expect(result.tools[0].successRate).toBe(0.5);
    expect(result.tools[0].escalationTargets).toContain('manual-review');
  });

  it('detects stale plans and auto-applies bounded proposals', async () => {
    const svc = createProactiveDiscoveryOptimizationService(ctx);

    const freshness = await svc.validatePlanFreshness({
      planId: 'PLAN-1',
      assumptions: [
        {
          key: 'coverage-threshold',
          expectedValue: 90,
          actualValue: 85,
        },
      ],
    });

    expect(freshness.stale).toBe(true);
    expect(freshness.staleAssumptions[0].reason).toBe('value-mismatch');

    const proposal = await svc.createAdaptivePolicyProposal({
      domain: 'concurrency',
      title: 'Increase concurrency slightly',
      rationale: 'Queue wait remains elevated.',
      desiredChange: { maxConcurrency: 11 },
      approvalRequired: true,
      actor: 'architect',
    });

    const autoApplied = await svc.autoApplyAdaptivePolicyProposal({
      proposalId: proposal.proposalId,
      actor: 'operator',
      baselineValues: { maxConcurrency: 10 },
      maxChangePercent: 15,
    });

    expect(autoApplied?.withinBounds).toBe(true);
    expect(autoApplied?.autoApplied).toBe(true);
    expect(autoApplied?.proposal.status).toBe('applied');
  });
});
