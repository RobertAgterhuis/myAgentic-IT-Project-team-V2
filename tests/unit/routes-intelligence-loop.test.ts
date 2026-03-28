// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/webapp/store';
import type { ServiceContext } from '../../src/webapp/services/types';
import { registerIntelligenceLoopRoutes } from '../../src/webapp/routes/intelligence-loop';

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

describe('routes/intelligence-loop', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerIntelligenceLoopRoutes(app, createContext());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists objectives', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/intelligence-loop/objectives' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
  });

  it('creates, reads, updates and assesses an objective', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/objectives',
      payload: {
        id: 'OBJ-ROUTE-001',
        name: 'Route Coverage Objective',
        description: 'Validate intelligence loop routes',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        kpis: [
          {
            id: 'KPI-ROUTE-001',
            name: 'Coverage',
            metricType: 'score',
            targetValue: 90,
            currentValue: 75,
            driftStatus: 'warning',
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: ['DEC-1', 'DEC-2'],
        blockerCount: 2,
        recommendedActions: [],
      },
    });

    expect(createRes.statusCode).toBe(201);

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/objectives/OBJ-ROUTE-001',
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().objective.id).toBe('OBJ-ROUTE-001');

    const updateRes = await app.inject({
      method: 'PUT',
      url: '/api/intelligence-loop/objectives/OBJ-ROUTE-001',
      payload: { status: 'at-risk', blockerCount: 4 },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().objective.status).toBe('at-risk');

    const healthRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/objectives/OBJ-ROUTE-001/health',
    });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.json().assessment.objectiveId).toBe('OBJ-ROUTE-001');
  });

  it('returns 404 for unknown objective routes', async () => {
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/objectives/OBJ-NOT-FOUND',
    });
    expect(getRes.statusCode).toBe(404);

    const healthRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/objectives/OBJ-NOT-FOUND/health',
    });
    expect(healthRes.statusCode).toBe(404);
  });

  it('returns health and at-risk summaries', async () => {
    const summaryRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/health-summary',
    });
    expect(summaryRes.statusCode).toBe(200);
    expect(summaryRes.json().ok).toBe(true);

    const atRiskRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/at-risk-objectives',
    });
    expect(atRiskRes.statusCode).toBe(200);
    expect(Array.isArray(atRiskRes.json().objectives)).toBe(true);
  });

  it('serves taxonomy, remediations and classification endpoints', async () => {
    const taxonomyRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/failure-taxonomy',
    });
    expect(taxonomyRes.statusCode).toBe(200);
    expect(taxonomyRes.json().taxonomy.failureClasses.length).toBeGreaterThan(0);

    const remediationRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/failure-taxonomy/FAIL-PROVIDER-001/remediations',
    });
    expect(remediationRes.statusCode).toBe(200);
    expect(Array.isArray(remediationRes.json().remediations)).toBe(true);

    const classifyPositiveRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/failure-taxonomy/classify',
      payload: {
        errorMessage: 'Provider unavailable due to service error',
        affectedAgent: 'orchestrator',
      },
    });
    expect(classifyPositiveRes.statusCode).toBe(200);
    expect(classifyPositiveRes.json().classified).toBe(true);

    const classifyNegativeRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/failure-taxonomy/classify',
      payload: {
        errorMessage: 'completely unknown custom message',
        affectedAgent: 'orchestrator',
      },
    });
    expect(classifyNegativeRes.statusCode).toBe(200);
    expect(classifyNegativeRes.json().classified).toBe(false);
  });

  it('creates and approves policy proposals', async () => {
    const proposalRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/policy-proposals',
      payload: {
        reevaluateArtifactIds: [],
        retrospectiveIds: [],
        benchmarkRunIds: [],
      },
    });
    expect(proposalRes.statusCode).toBe(201);
    expect(proposalRes.json().proposal.proposalId).toMatch(/^POLICYCHANGE-/);

    const approveRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/policy-proposals/any-id/approve',
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().ok).toBe(true);
  });

  it('handles benchmark comparison and proposal listing', async () => {
    const compareRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/benchmark-comparison',
      payload: {
        currentBenchmarkId: 'bench-current',
        previousBenchmarkId: 'bench-previous',
      },
    });

    expect(compareRes.statusCode).toBe(200);
    const compareBody = compareRes.json();
    expect(compareBody.ok).toBe(true);
    expect(typeof compareBody.proposalCount).toBe('number');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/tuning-proposals',
    });
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json().proposals)).toBe(true);
  });

  it('returns 400 when applying or reverting unknown tuning proposals', async () => {
    const applyRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/tuning-proposals/unknown/apply',
    });
    expect(applyRes.statusCode).toBe(400);

    const revertRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/tuning-proposals/unknown/revert',
      payload: { reason: 'test rollback' },
    });
    expect(revertRes.statusCode).toBe(400);
  });

  it('runs M3 stale scan and contradiction discovery endpoints', async () => {
    const staleRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/discovery/stale-scan',
      payload: {
        staleThresholdSeconds: 3600,
        entities: [
          {
            id: 'DEC-100',
            type: 'decision',
            lastUpdatedAt: '2026-03-27T10:00:00.000Z',
            workflows: ['sprint-gate'],
          },
        ],
      },
    });

    expect(staleRes.statusCode).toBe(200);
    expect(staleRes.json().result.totalEntities).toBe(1);

    const contradictionRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/discovery/contradictions',
      payload: {
        artifacts: [
          {
            artifactId: 'phase2',
            phase: 'PHASE_2',
            content: 'Decision: transport=http',
          },
          {
            artifactId: 'synthesis',
            phase: 'SYNTHESIS',
            content: 'Decision: transport=grpc',
          },
        ],
      },
    });

    expect(contradictionRes.statusCode).toBe(422);
    expect(contradictionRes.json().blockSynthesisPublication).toBe(true);
  });

  it('runs exploratory branch generation and optimization policy endpoints', async () => {
    const noExploreRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/discovery/exploratory-branches',
      payload: {
        taskId: 'TASK-LOW',
        objective: 'Low uncertainty task',
        basePlanSteps: ['step-1'],
        uncertainty: 0.3,
      },
    });

    expect(noExploreRes.statusCode).toBe(200);
    expect(noExploreRes.json().generated).toBe(false);

    const exploreRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/discovery/exploratory-branches',
      payload: {
        taskId: 'TASK-HIGH',
        objective: 'High uncertainty task',
        basePlanSteps: ['step-1', 'step-2'],
        uncertainty: 0.85,
        maxAlternatives: 3,
      },
    });

    expect(exploreRes.statusCode).toBe(201);
    expect(exploreRes.json().result.alternativesGenerated).toBe(3);

    const concurrencyRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/optimization/concurrency-policy',
      payload: {
        currentMaxConcurrency: 8,
        queueWaitMs: 1000,
        failureRate: 0.22,
        throughputRps: 40,
        previousPolicy: {
          maxConcurrency: 6,
          baselineFailureRate: 0.1,
          baselineThroughputRps: 60,
          rollbackValue: 6,
        },
      },
    });

    expect(concurrencyRes.statusCode).toBe(200);
    expect(concurrencyRes.json().decision.rollbackApplied).toBe(true);

    const retrievalRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/optimization/retrieval-policy',
      payload: {
        riskLevel: 'high',
        citationUsefulness: 0.45,
        noMatchRate: 0.3,
        retrievalLatencyP95Ms: 1200,
        latencyBudgetMs: 900,
      },
    });

    expect(retrievalRes.statusCode).toBe(200);
    expect(retrievalRes.json().decision.metadata.reasons.length).toBeGreaterThan(0);

    const escalateRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m3/optimization/route-escalation',
      payload: {
        confidence: 0.4,
        riskLevel: 'high',
      },
    });

    expect(escalateRes.statusCode).toBe(200);
    expect(escalateRes.json().decision.selectedRoute).toBe('verifier-heavy');

    const recentRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/m3/optimization/route-escalation/recent?limit=1',
    });

    expect(recentRes.statusCode).toBe(200);
    expect(recentRes.json().total).toBe(1);
  });
});
