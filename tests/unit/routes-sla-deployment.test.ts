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

describe('routes/sla-deployment', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerSlaDeploymentRoutes(app, createContext());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── M5-E1-I1 ─────────────────────────────────────────────────

  it('prioritizes queue items by SLA urgency and returns breach alerts', async () => {
    const now = new Date();
    const res = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/queue/prioritize',
      payload: {
        items: [
          {
            id: 'low-1',
            workspaceId: 'ws-a',
            title: 'Low priority',
            enqueuedAt: now.toISOString(),
            sla: {
              deadline: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
              urgency: 'low',
              breachThresholdMinutes: 60,
              breachPenalty: 1,
            },
          },
          {
            id: 'critical-1',
            workspaceId: 'ws-a',
            title: 'Critical breach',
            enqueuedAt: now.toISOString(),
            sla: {
              deadline: new Date(now.getTime() + 5 * 60_000).toISOString(),
              urgency: 'critical',
              breachThresholdMinutes: 30,
              breachPenalty: 2,
            },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.ordered[0].id).toBe('critical-1');
    expect(Array.isArray(body.breachAlerts)).toBe(true);
    expect(body.computedAt).toBeDefined();
  });

  // ── M5-E1-I2 ─────────────────────────────────────────────────

  it('returns SDLC_ONLY for high-confidence low-risk feature tasks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/routing/decide',
      payload: { confidenceScore: 0.85, riskLevel: 'low', taskType: 'feature' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.routing.mode).toBe('SDLC_ONLY');
    expect(Array.isArray(body.routing.rationale)).toBe(true);
  });

  it('returns AGENCY_ONLY for critical risk tasks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/routing/decide',
      payload: { confidenceScore: 0.9, riskLevel: 'critical', taskType: 'deployment' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().routing.mode).toBe('AGENCY_ONLY');
  });

  it('exposes routing policy endpoint', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sla-deployment/routing/policy' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.policy.sdlcOnlyMinConfidence).toBeDefined();
    expect(body.policy.hybridMinConfidence).toBeDefined();
  });

  // ── M5-E1-I3 ─────────────────────────────────────────────────

  it('checks workspace fairness and returns allowed status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/fairness/check',
      payload: {
        workspaceId: 'ws-ok',
        currentSlots: [{ workspaceId: 'ws-ok', inFlight: 1, queueDepth: 2, skippedCycles: 0 }],
        globalInFlight: 3,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.check.status).toBe('allowed');
    expect(body.check.workspaceId).toBe('ws-ok');
  });

  it('computes fairness snapshot and identifies starved workspaces', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/fairness/snapshot',
      payload: {
        slots: [
          { workspaceId: 'ws-1', inFlight: 0, queueDepth: 0, skippedCycles: 0 },
          { workspaceId: 'ws-2', inFlight: 0, queueDepth: 1, skippedCycles: 5 },
        ],
        globalInFlight: 0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.snapshot.starvedWorkspaces).toContain('ws-2');
  });

  // ── M5-E2-I1 ─────────────────────────────────────────────────

  it('executes full rollout lifecycle: create → evaluate advance → evaluate rollback', async () => {
    // Create plan
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/rollout/plans',
      payload: { releaseId: 'rel-101', workspaceId: 'ws-deploy' },
    });
    expect(createRes.statusCode).toBe(201);
    const planId = createRes.json().plan.id;

    // Evaluate canary with healthy metrics → advance
    const evalRes = await app.inject({
      method: 'POST',
      url: `/api/sla-deployment/rollout/plans/${planId}/evaluate`,
      payload: {
        stage: 'canary',
        metrics: {
          successRate: 0.99,
          errorRate: 0.01,
          latencyP99Ms: 400,
          sampleCount: 2000,
          observedMinutes: 45,
        },
      },
    });
    expect(evalRes.json().evaluation.status).toBe('advance');

    // Trigger rollback on partial stage
    const rollbackRes = await app.inject({
      method: 'POST',
      url: `/api/sla-deployment/rollout/plans/${planId}/rollback`,
      payload: {
        stage: 'partial',
        metrics: {
          successRate: 0.7,
          errorRate: 0.3,
          latencyP99Ms: 6000,
          sampleCount: 500,
          observedMinutes: 60,
        },
        reason: 'Error spike detected.',
      },
    });
    expect(rollbackRes.json().rollback.planId).toBe(planId);

    // Verify plan list
    const listRes = await app.inject({ method: 'GET', url: '/api/sla-deployment/rollout/plans' });
    expect(listRes.json().total).toBeGreaterThanOrEqual(1);
  });

  // ── M5-E2-I2 ─────────────────────────────────────────────────

  it('runs release evidence bundle lifecycle: create → submit → validate', async () => {
    // Create bundle
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/evidence/bundles',
      payload: { releaseId: 'rel-202', workspaceId: 'ws-rel' },
    });
    expect(createRes.statusCode).toBe(201);
    const bundleId = createRes.json().bundle.id;

    // Validate before submitting — should be blocked
    const preVal = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/evidence/bundles/${bundleId}/validate`,
    });
    expect(preVal.json().validation.promotionAllowed).toBe(false);

    // Submit all required evidence
    for (const type of ['test-results', 'approval', 'provenance', 'security-scan']) {
      const submitRes = await app.inject({
        method: 'POST',
        url: `/api/sla-deployment/evidence/bundles/${bundleId}/submit`,
        payload: { evidence: { type, description: `CI ${type}`, providedBy: 'pipeline' } },
      });
      expect(submitRes.statusCode).toBe(200);
    }

    // Final validation — should pass
    const postVal = await app.inject({
      method: 'GET',
      url: `/api/sla-deployment/evidence/bundles/${bundleId}/validate`,
    });
    expect(postVal.json().validation.promotionAllowed).toBe(true);
    expect(postVal.json().validation.fulfilled.length).toBe(4);
  });

  // ── M5-E2-I3 ─────────────────────────────────────────────────

  it('records SLO spans and computes snapshot with breach detection', async () => {
    // Record healthy latency
    const spanRes = await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/slo/spans',
      payload: { indicator: 'latency', value: 800, unit: 'ms', workspaceId: 'ws-slo' },
    });
    expect(spanRes.statusCode).toBe(201);
    expect(spanRes.json().span.id).toMatch(/^SPAN-/);

    // Record breaching error rate
    await app.inject({
      method: 'POST',
      url: '/api/sla-deployment/slo/spans',
      payload: { indicator: 'error-rate', value: 25, unit: '%', workspaceId: 'ws-slo' },
    });

    // Snapshot for workspace
    const snapshotRes = await app.inject({
      method: 'GET',
      url: '/api/sla-deployment/slo/snapshot?workspaceId=ws-slo',
    });
    expect(snapshotRes.statusCode).toBe(200);
    const snap = snapshotRes.json().snapshot;
    expect(snap.orchestrationReadiness.level).not.toBe('green');
    const errorBreach = snap.breachIndicators.find(
      (b: { indicator: string }) => b.indicator === 'error-rate'
    );
    expect(errorBreach).toBeDefined();

    // Breaches endpoint
    const breachRes = await app.inject({
      method: 'GET',
      url: '/api/sla-deployment/slo/breaches?workspaceId=ws-slo',
    });
    expect(breachRes.json().total).toBeGreaterThan(0);

    // SLO targets
    const targetsRes = await app.inject({ method: 'GET', url: '/api/sla-deployment/slo/targets' });
    expect(Array.isArray(targetsRes.json().targets)).toBe(true);
    expect(targetsRes.json().targets.length).toBeGreaterThan(0);
  });
});
