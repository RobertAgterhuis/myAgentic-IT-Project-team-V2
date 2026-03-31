// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/webapp/store';
import type { ServiceContext } from '../../src/webapp/services/types';
import { registerSlaDeploymentRoutes } from '../../src/webapp/routes/sla-deployment';

function createContext(): ServiceContext {
  const store = new InMemoryStore();
  return {
    store,
    cache: {} as ServiceContext['cache'],
    audit: {} as ServiceContext['audit'],
    projectRoot: process.cwd(),
    businessDocs: 'BusinessDocs',
    sessionDir: 'BusinessDocs/session',
    decisionsFile: 'BusinessDocs/decisions.md',
    decisionsDir: 'BusinessDocs/decisions',
    commandQueue: 'BusinessDocs/command-queue.jsonl',
    helpDir: 'docs/help',
    safeWrite: (filePath: string, data: string) => {
      store.writeFile(filePath, data);
    },
  };
}

/**
 * Integration: full M5 deployment confidence pipeline.
 *
 *  1. Prioritize a multi-urgency queue
 *  2. Route execution mode from confidence / risk
 *  3. Fairness check for the workspace
 *  4. Create a staged rollout plan and evaluate canary
 *  5. Build a release evidence bundle and satisfy all requirements
 *  6. Record SLO spans, compute snapshot, verify orchestration readiness
 */
describe('integration: M5 SLA-aware prioritization and deployment confidence', () => {
  let app: FastifyInstance;
  const workspaceId = 'ws-integration';
  const releaseId = 'rel-int-001';

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerSlaDeploymentRoutes(app, createContext());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs the complete M5 deployment confidence pipeline', async () => {
    const now = new Date();

    // ── 1. Queue prioritization ──────────────────────────────────
    const prioritizeRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/queue/prioritize',
      payload: {
        items: [
          {
            id: 'task-low',
            workspaceId,
            title: 'Low-priority doc update',
            enqueuedAt: now.toISOString(),
            sla: {
              deadline: new Date(now.getTime() + 14 * 24 * 60 * 60_000).toISOString(),
              urgency: 'low',
              breachThresholdMinutes: 120,
              breachPenalty: 1,
            },
          },
          {
            id: 'task-critical',
            workspaceId,
            title: 'Critical security patch',
            enqueuedAt: now.toISOString(),
            sla: {
              deadline: new Date(now.getTime() + 4 * 60_000).toISOString(),
              urgency: 'critical',
              breachThresholdMinutes: 30,
              breachPenalty: 3,
            },
          },
          {
            id: 'task-high',
            workspaceId,
            title: 'High-priority release',
            enqueuedAt: now.toISOString(),
            sla: {
              deadline: new Date(now.getTime() + 2 * 60 * 60_000).toISOString(),
              urgency: 'high',
              breachThresholdMinutes: 60,
              breachPenalty: 2,
            },
          },
        ],
      },
    });
    expect(prioritizeRes.statusCode).toBe(200);
    const { ordered, breachAlerts } = prioritizeRes.json();
    expect(ordered[0].id).toBe('task-critical');
    expect(ordered[1].id).toBe('task-high');
    expect(ordered[2].id).toBe('task-low');
    const criticalAlert = breachAlerts.find(
      (a: { itemId: string }) => a.itemId === 'task-critical'
    );
    expect(criticalAlert).toBeDefined();

    // ── 2. Execution mode routing ────────────────────────────────
    const routeRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/routing/decide',
      payload: { confidenceScore: 0.78, riskLevel: 'low', taskType: 'feature' },
    });
    expect(routeRes.statusCode).toBe(200);
    const { routing } = routeRes.json();
    expect(routing.mode).toBe('SDLC_ONLY');
    expect(Array.isArray(routing.rationale)).toBe(true);

    // ── 3. Workspace fairness ────────────────────────────────────
    const fairnessRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/fairness/check',
      payload: {
        workspaceId,
        currentSlots: [{ workspaceId, inFlight: 2, queueDepth: 4, skippedCycles: 0 }],
        globalInFlight: 10,
      },
    });
    expect(fairnessRes.statusCode).toBe(200);
    expect(fairnessRes.json().check.status).toBe('allowed');

    // ── 4. Staged rollout: create → evaluate canary → hold partial ─
    const planRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/rollout/plans',
      payload: { releaseId, workspaceId },
    });
    expect(planRes.statusCode).toBe(201);
    const planId = planRes.json().plan.id;

    // Canary: healthy — should advance
    const canaryEval = await app.inject({
      method: 'POST',
      url: `/api/sla-deployment/rollout/plans/${planId}/evaluate`,
      payload: {
        stage: 'canary',
        metrics: {
          successRate: 0.995,
          errorRate: 0.005,
          latencyP99Ms: 350,
          sampleCount: 3000,
          observedMinutes: 35,
        },
      },
    });
    expect(canaryEval.json().evaluation.status).toBe('advance');

    // Partial: insufficient dwell time — hold
    const partialEval = await app.inject({
      method: 'POST',
      url: `/api/sla-deployment/rollout/plans/${planId}/evaluate`,
      payload: {
        stage: 'partial',
        metrics: {
          successRate: 0.97,
          errorRate: 0.03,
          latencyP99Ms: 700,
          sampleCount: 800,
          observedMinutes: 20,
        },
      },
    });
    expect(partialEval.json().evaluation.status).toBe('hold');

    // Verify plan retrieval
    const getPlanRes = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/rollout/plans/${planId}`,
    });
    expect(getPlanRes.statusCode).toBe(200);
    expect(getPlanRes.json().plan.id).toBe(planId);

    // ── 5. Release evidence bundle lifecycle ─────────────────────
    const bundleRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/evidence/bundles',
      payload: { releaseId, workspaceId },
    });
    expect(bundleRes.statusCode).toBe(201);
    const bundleId = bundleRes.json().bundle.id;

    // Pre-submission: should not allow promotion
    const preValidate = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/evidence/bundles/${bundleId}/validate`,
    });
    expect(preValidate.json().validation.promotionAllowed).toBe(false);
    expect(preValidate.json().validation.missing.length).toBeGreaterThan(0);

    // Submit all required evidence types
    const evidencePayloads = [
      { type: 'test-results', description: 'All 312 tests passing', providedBy: 'vitest' },
      { type: 'approval', description: 'Tech lead approved', providedBy: 'reviewer@example.com' },
      {
        type: 'provenance',
        description: 'SBOM attached, verified build',
        providedBy: 'sigstore',
      },
      {
        type: 'security-scan',
        description: 'No critical CVEs found',
        providedBy: 'snyk',
      },
    ];
    for (const ePayload of evidencePayloads) {
      const submitRes = await app.inject({
        method: 'POST',
        url: `/api/sla-deployment/evidence/bundles/${bundleId}/submit`,
        payload: { evidence: ePayload },
      });
      expect(submitRes.statusCode).toBe(200);
    }

    // Post-submission: promotion should be allowed
    const postValidate = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/evidence/bundles/${bundleId}/validate`,
    });
    const validation = postValidate.json().validation;
    expect(validation.promotionAllowed).toBe(true);
    expect(validation.missing).toHaveLength(0);
    expect(validation.fulfilled).toHaveLength(4);

    // Bundle list
    const listBundles = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/evidence/bundles?releaseId=${releaseId}`,
    });
    expect(listBundles.json().total).toBeGreaterThanOrEqual(1);

    // ── 6. SLO dashboard ─────────────────────────────────────────
    // Record healthy spans
    const healthySpans = [
      { indicator: 'latency', value: 500, unit: 'ms' },
      { indicator: 'latency', value: 600, unit: 'ms' },
      { indicator: 'error-rate', value: 1, unit: '%' },
      { indicator: 'throughput', value: 25, unit: 'req/min' },
    ];
    for (const sp of healthySpans) {
      const spanRes = await app.inject({
        method: 'POST',
        url: '/api/sla-deployment/slo/spans',
        payload: { ...sp, workspaceId, releaseId },
      });
      expect(spanRes.statusCode).toBe(201);
    }

    // Snapshot should be green-ish for latency and throughput
    const snapshotRes = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/slo/snapshot?workspaceId=${workspaceId}&releaseId=${releaseId}`,
    });
    expect(snapshotRes.statusCode).toBe(200);
    const snapshot = snapshotRes.json().snapshot;
    expect(['green', 'yellow', 'red']).toContain(snapshot.orchestrationReadiness.level);
    expect(snapshot.metrics.length).toBeGreaterThan(0);
    expect(snapshot.computedAt).toBeDefined();

    // Targets should list all default indicators
    const targetsRes = await app.inject({
      method: 'GET',
      url: '/api/sla-deployment/slo/targets',
    });
    expect(targetsRes.statusCode).toBe(200);
    const targets = targetsRes.json().targets as Array<{ indicator: string }>;
    const indicators = targets.map((t) => t.indicator);
    expect(indicators).toContain('latency');
    expect(indicators).toContain('error-rate');
    expect(indicators).toContain('release-readiness');
  });
});
