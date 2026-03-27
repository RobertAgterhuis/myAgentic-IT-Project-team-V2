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
    readdir: vi.fn(() => []),
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
});
