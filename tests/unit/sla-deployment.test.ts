// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceContext } from '../../src/webapp/services/types';
import { createSlaQueuePrioritizerService } from '../../platform/engine/sla-prioritizer';
import { createConfidenceRouterService } from '../../platform/engine/confidence-router';
import { createWorkspaceFairnessService } from '../../platform/engine/workspace-fairness';
import { createStagedRolloutService } from '../../platform/engine/staged-rollout';
import { createReleaseEvidenceService } from '../../platform/engine/release-evidence';
import { createSloDashboardService } from '../../platform/engine/slo-dashboard';
import type { QueueItem } from '../../platform/engine/sla-prioritizer';

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

describe('sla-deployment services', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  // ── M5-E1-I1: SLA Prioritizer ────────────────────────────────

  describe('SlaQueuePrioritizer', () => {
    it('orders items by urgency score descending and detects breach-imminent items', () => {
      const svc = createSlaQueuePrioritizerService(ctx);
      const now = new Date();
      const urgent: QueueItem = {
        id: 'item-1',
        workspaceId: 'ws-a',
        title: 'Critical hotfix',
        enqueuedAt: now.toISOString(),
        sla: {
          deadline: new Date(now.getTime() + 10 * 60_000).toISOString(), // 10 min
          urgency: 'critical',
          breachThresholdMinutes: 30,
          breachPenalty: 2,
        },
        risk: { impactScore: 0.9, failureProbability: 0.5, recoveryTimeMinutes: 120 },
      };
      const low: QueueItem = {
        id: 'item-2',
        workspaceId: 'ws-a',
        title: 'Routine task',
        enqueuedAt: now.toISOString(),
        sla: {
          deadline: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(), // 7 days
          urgency: 'low',
          breachThresholdMinutes: 60,
          breachPenalty: 1,
        },
        risk: { impactScore: 0.1, failureProbability: 0.05, recoveryTimeMinutes: 15 },
      };

      const result = svc.prioritizeQueue([low, urgent]);

      expect(result.ordered[0].id).toBe('item-1');
      expect(result.ordered[1].id).toBe('item-2');
      expect(result.ordered[0].breachImminent).toBe(true);
      expect(result.breachAlerts.length).toBe(1);
      expect(result.breachAlerts[0].itemId).toBe('item-1');
      expect(result.computedAt).toBeDefined();
    });

    it('handles items with no SLA or risk gracefully', () => {
      const svc = createSlaQueuePrioritizerService(ctx);
      const item: QueueItem = {
        id: 'bare-item',
        workspaceId: 'ws-b',
        title: 'No SLA task',
        enqueuedAt: new Date().toISOString(),
      };
      const result = svc.prioritizeQueue([item]);
      expect(result.ordered.length).toBe(1);
      expect(result.ordered[0].priorityScore).toBe(0);
      expect(result.breachAlerts.length).toBe(0);
    });
  });

  // ── M5-E1-I2: Confidence Router ───────────────────────────────

  describe('ConfidenceRouter', () => {
    it('routes high-confidence low-risk tasks to SDLC_ONLY', () => {
      const svc = createConfidenceRouterService(ctx);
      const result = svc.routeExecution({
        confidenceScore: 0.9,
        riskLevel: 'low',
        taskType: 'feature',
      });
      expect(result.mode).toBe('SDLC_ONLY');
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it('routes moderate confidence to HYBRID', () => {
      const svc = createConfidenceRouterService(ctx);
      const result = svc.routeExecution({
        confidenceScore: 0.6,
        riskLevel: 'medium',
        taskType: 'audit',
      });
      expect(result.mode).toBe('HYBRID');
    });

    it('forces AGENCY_ONLY for critical risk regardless of confidence', () => {
      const svc = createConfidenceRouterService(ctx);
      const result = svc.routeExecution({
        confidenceScore: 0.95,
        riskLevel: 'critical',
        taskType: 'deployment',
      });
      expect(result.mode).toBe('AGENCY_ONLY');
    });

    it('forces AGENCY_ONLY for hotfix task type', () => {
      const svc = createConfidenceRouterService(ctx);
      const result = svc.routeExecution({
        confidenceScore: 0.8,
        riskLevel: 'low',
        taskType: 'hotfix',
      });
      expect(result.mode).toBe('AGENCY_ONLY');
    });

    it('routes very low confidence to AGENCY_ONLY', () => {
      const svc = createConfidenceRouterService(ctx);
      const result = svc.routeExecution({
        confidenceScore: 0.3,
        riskLevel: 'low',
        taskType: 'generic',
      });
      expect(result.mode).toBe('AGENCY_ONLY');
    });
  });

  // ── M5-E1-I3: Workspace Fairness ─────────────────────────────

  describe('WorkspaceFairness', () => {
    it('allows workspace within limits', () => {
      const svc = createWorkspaceFairnessService(ctx);
      const result = svc.checkWorkspace({
        workspaceId: 'ws-ok',
        currentSlots: [{ workspaceId: 'ws-ok', inFlight: 1, queueDepth: 2, skippedCycles: 0 }],
        globalInFlight: 5,
      });
      expect(result.status).toBe('allowed');
    });

    it('throttles workspace exceeding maxConcurrent', () => {
      const svc = createWorkspaceFairnessService(ctx);
      const result = svc.checkWorkspace({
        workspaceId: 'ws-busy',
        currentSlots: [{ workspaceId: 'ws-busy', inFlight: 10, queueDepth: 5, skippedCycles: 0 }],
        globalInFlight: 10,
      });
      expect(result.status).toBe('throttled');
    });

    it('detects starved workspace exceeding skip threshold', () => {
      const svc = createWorkspaceFairnessService(ctx);
      const result = svc.checkWorkspace({
        workspaceId: 'ws-starved',
        currentSlots: [{ workspaceId: 'ws-starved', inFlight: 0, queueDepth: 3, skippedCycles: 5 }],
        globalInFlight: 2,
      });
      expect(result.status).toBe('starved');
    });

    it('computes snapshot across multiple workspaces', () => {
      const svc = createWorkspaceFairnessService(ctx);
      const snapshot = svc.computeSnapshot(
        [
          { workspaceId: 'ws-1', inFlight: 0, queueDepth: 1, skippedCycles: 0 },
          { workspaceId: 'ws-2', inFlight: 0, queueDepth: 1, skippedCycles: 4 },
        ],
        2
      );
      expect(snapshot.starvedWorkspaces).toContain('ws-2');
      expect(snapshot.slots.length).toBe(2);
    });
  });

  // ── M5-E2-I1: Staged Rollout ──────────────────────────────────

  describe('StagedRollout', () => {
    it('creates a rollout plan with default stages', () => {
      const svc = createStagedRolloutService(ctx);
      const plan = svc.createPlan({ releaseId: 'rel-1', workspaceId: 'ws-a' });
      expect(plan.id).toMatch(/^RP-/);
      expect(plan.stages.length).toBe(3);
      expect(plan.status).toBe('pending');
      expect(plan.currentStage).toBe('canary');
    });

    it('evaluates canary stage and advances when metrics are healthy', () => {
      const svc = createStagedRolloutService(ctx);
      const plan = svc.createPlan({ releaseId: 'rel-2', workspaceId: 'ws-b' });
      const result = svc.evaluateStage(plan.id, 'canary', {
        successRate: 0.99,
        errorRate: 0.01,
        latencyP99Ms: 500,
        sampleCount: 1000,
        observedMinutes: 60,
      });
      expect(result.status).toBe('advance');
    });

    it('triggers rollback when error rate is breached', () => {
      const svc = createStagedRolloutService(ctx);
      const plan = svc.createPlan({ releaseId: 'rel-3', workspaceId: 'ws-c' });
      const result = svc.evaluateStage(plan.id, 'canary', {
        successRate: 0.9,
        errorRate: 0.15,
        latencyP99Ms: 800,
        sampleCount: 200,
        observedMinutes: 60,
      });
      expect(result.status).toBe('rollback');
    });

    it('holds when dwell time is insufficient', () => {
      const svc = createStagedRolloutService(ctx);
      const plan = svc.createPlan({ releaseId: 'rel-4', workspaceId: 'ws-d' });
      const result = svc.evaluateStage(plan.id, 'canary', {
        successRate: 0.99,
        errorRate: 0.005,
        latencyP99Ms: 300,
        sampleCount: 50,
        observedMinutes: 5, // less than required 30
      });
      expect(result.status).toBe('hold');
    });

    it('manually triggers rollback and marks plan rolled-back', () => {
      const svc = createStagedRolloutService(ctx);
      const plan = svc.createPlan({ releaseId: 'rel-5', workspaceId: 'ws-e' });
      const trigger = svc.triggerRollback(
        plan.id,
        'canary',
        {
          successRate: 0.7,
          errorRate: 0.3,
          latencyP99Ms: 5000,
          sampleCount: 100,
          observedMinutes: 30,
        },
        'Manual override: customer impact detected.'
      );
      expect(trigger.planId).toBe(plan.id);
      expect(trigger.stage).toBe('canary');
      const updated = svc.getPlan(plan.id)!;
      expect(updated.status).toBe('rolled-back');
    });
  });

  // ── M5-E2-I2: Release Evidence ────────────────────────────────

  describe('ReleaseEvidence', () => {
    it('creates evidence bundle and validates missing items', () => {
      const svc = createReleaseEvidenceService(ctx);
      const bundle = svc.createBundle({ releaseId: 'rel-1', workspaceId: 'ws-a' });
      expect(bundle.id).toMatch(/^EB-/);

      const validation = svc.validateBundle(bundle.id);
      expect(validation.promotionAllowed).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
    });

    it('allows promotion when all required evidence is submitted', () => {
      const svc = createReleaseEvidenceService(ctx);
      const bundle = svc.createBundle({ releaseId: 'rel-2', workspaceId: 'ws-b' });

      for (const type of ['test-results', 'approval', 'provenance', 'security-scan'] as const) {
        svc.submitEvidence({
          bundleId: bundle.id,
          evidence: { type, description: `Mock ${type}`, providedBy: 'ci-pipeline' },
        });
      }

      const validation = svc.validateBundle(bundle.id);
      expect(validation.promotionAllowed).toBe(true);
      expect(validation.fulfilled.length).toBe(4);
    });

    it('replaces evidence of the same type on re-submit', () => {
      const svc = createReleaseEvidenceService(ctx);
      const bundle = svc.createBundle({ releaseId: 'rel-3', workspaceId: 'ws-c' });

      svc.submitEvidence({
        bundleId: bundle.id,
        evidence: { type: 'approval', description: 'First approval', providedBy: 'alice' },
      });
      const updated = svc.submitEvidence({
        bundleId: bundle.id,
        evidence: { type: 'approval', description: 'Re-approved', providedBy: 'bob' },
      });

      const approvals = updated.evidence.filter((e) => e.type === 'approval');
      expect(approvals.length).toBe(1);
      expect(approvals[0].providedBy).toBe('bob');
    });
  });

  // ── M5-E2-I3: SLO Dashboard ───────────────────────────────────

  describe('SloDashboard', () => {
    it('records span events and computes a green snapshot with no breaches', () => {
      const svc = createSloDashboardService(ctx);
      svc.recordSpanEvent({ indicator: 'latency', value: 800, unit: 'ms', workspaceId: 'ws-a' });
      svc.recordSpanEvent({ indicator: 'error-rate', value: 1, unit: '%', workspaceId: 'ws-a' });

      const snapshot = svc.computeSnapshot('ws-a');
      expect(snapshot.orchestrationReadiness.level).toBe('green');
      expect(snapshot.breachIndicators.length).toBe(0);
    });

    it('raises breach indicator when latency exceeds target', () => {
      const svc = createSloDashboardService(ctx);
      svc.recordSpanEvent({ indicator: 'latency', value: 5000, unit: 'ms', workspaceId: 'ws-b' });

      const snapshot = svc.computeSnapshot('ws-b');
      const latencyBreach = snapshot.breachIndicators.find((b) => b.indicator === 'latency');
      expect(latencyBreach).toBeDefined();
      expect(snapshot.orchestrationReadiness.level).not.toBe('green');
    });

    it('returns empty snapshot for workspace with no span data', () => {
      const svc = createSloDashboardService(ctx);
      const snapshot = svc.computeSnapshot('ws-unknown');
      expect(snapshot.metrics.every((m) => m.sampleCount === 0)).toBe(true);
      expect(snapshot.orchestrationReadiness.level).toBe('green');
    });

    it('lists breach indicators for a workspace', () => {
      const svc = createSloDashboardService(ctx);
      svc.recordSpanEvent({ indicator: 'error-rate', value: 50, unit: '%', workspaceId: 'ws-c' });

      const breaches = svc.listBreachIndicators('ws-c');
      expect(breaches.length).toBeGreaterThan(0);
      expect(breaches[0].indicator).toBe('error-rate');
    });
  });
});
