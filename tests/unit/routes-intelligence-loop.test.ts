// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/webapp/store';
import type { ServiceContext } from '../../src/webapp/services/types';
import { registerIntelligenceLoopRoutes } from '../../src/webapp/routes/intelligence-loop';

function createContext(): ServiceContext {
  const store = new InMemoryStore();
  store.writeFile(
    'tests/load/bench-route.json',
    JSON.stringify({ p95: 1400, errorRatePct: 2, successRatePct: 98 })
  );
  store.writeFile(
    'tests/load/golden-tasks/agent-quality-core.json',
    JSON.stringify({
      suiteId: 'agent-quality-core',
      version: '1.0.0',
      tasks: [
        { taskId: 'GT-001', prompt: 'Assess architecture quality', weight: 2 },
        { taskId: 'GT-002', prompt: 'Assess security checklist', weight: 1 },
      ],
    })
  );
  store.writeFile(
    'tests/load/prompt-run-baseline.json',
    JSON.stringify({
      suiteId: 'agent-quality-core',
      tasks: [
        { taskId: 'GT-001', score: 74, pass: true, latencyMs: 1200 },
        { taskId: 'GT-002', score: 70, pass: true, latencyMs: 980 },
      ],
    })
  );
  store.writeFile(
    'tests/load/prompt-run-candidate.json',
    JSON.stringify({
      suiteId: 'agent-quality-core',
      tasks: [
        { taskId: 'GT-001', score: 82, pass: true, latencyMs: 1100 },
        { taskId: 'GT-002', score: 78, pass: true, latencyMs: 920 },
      ],
    })
  );
  store.writeFile(
    'BusinessDocs/retrospectives/retro-route.md',
    '# Retrospective\n\n## Successes\n- Approval workflow remained stable under guardrails\n'
  );
  store.writeFile(
    'Patterns/01-prompt-chaining.md',
    '# Prompt Chaining\nCurrent score: 9.2/10\nTarget score: 9.9/10\n'
  );
  store.writeFile(
    'Patterns/02-routing.md',
    '# Routing\nCurrent score: 9.6/10\nTarget score: 9.9/10\n'
  );
  store.writeFile(
    'Patterns/03-parallelization.md',
    '# Parallelization\nCurrent score: 9.95/10\nTarget score: 9.95/10\n'
  );

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
        retrospectiveIds: ['retro-route.md'],
        benchmarkRunIds: ['bench-route'],
      },
    });
    expect(proposalRes.statusCode).toBe(201);
    const proposalId = proposalRes.json().proposal.proposalId as string;
    expect(proposalId).toMatch(/^POLICYCHANGE-/);

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/policy-proposals/${proposalId}/approve`,
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().ok).toBe(true);

    const autoApplyRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/policy-proposals/${proposalId}/auto-apply`,
      payload: {
        actor: 'route-test-runner',
      },
    });
    expect(autoApplyRes.statusCode).toBe(200);
    expect(autoApplyRes.json().result.autoApplied).toBe(true);

    const revertRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/policy-proposals/revert-latest',
      payload: {
        reason: 'route rollback validation',
      },
    });
    expect(revertRes.statusCode).toBe(200);
    expect(revertRes.json().reverted.proposalId).toBe(proposalId);
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

  it('compares prompt variants on stable golden tasks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/prompt-ab-compare',
      payload: {
        baselineRunId: 'prompt-run-baseline',
        candidateRunId: 'prompt-run-candidate',
        suiteId: 'agent-quality-core',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.comparison.comparedTaskCount).toBe(2);
    expect(body.comparison.verdict).toBe('improved');
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

  it('supports M4 adaptive policy proposal lifecycle and summary surfaces', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals',
      payload: {
        domain: 'concurrency',
        title: 'Increase bounded concurrency',
        rationale: 'Queue wait is high with stable failure rate.',
        desiredChange: { maxConcurrency: 10 },
        decisionReferences: ['CONCURRENCY-TEST-1'],
        actor: 'architect',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const proposalId = createRes.json().proposal.proposalId as string;

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/m4/adaptive-policy-proposals/${proposalId}/approve`,
      payload: { actor: 'reviewer', reason: 'looks safe' },
    });

    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().proposal.status).toBe('approved');

    const applyRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/m4/adaptive-policy-proposals/${proposalId}/apply`,
      payload: { actor: 'operator', reason: 'rollout' },
    });

    expect(applyRes.statusCode).toBe(200);
    expect(applyRes.json().proposal.status).toBe('applied');

    const revertRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/m4/adaptive-policy-proposals/${proposalId}/revert`,
      payload: { actor: 'operator', reason: 'rollback test' },
    });

    expect(revertRes.statusCode).toBe(200);
    expect(revertRes.json().proposal.status).toBe('reverted');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);

    const summaryRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/m4/adaptive-behaviors/summary',
    });

    expect(summaryRes.statusCode).toBe(200);
    expect(summaryRes.json().summary.approvals.revertedProposals).toBeGreaterThanOrEqual(1);

    const autoCreateRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals',
      payload: {
        domain: 'concurrency',
        title: 'Small concurrency uplift',
        rationale: 'Queue wait remains elevated.',
        desiredChange: { maxConcurrency: 11 },
        approvalRequired: true,
        actor: 'architect',
      },
    });

    const autoProposalId = autoCreateRes.json().proposal.proposalId as string;
    const autoApplyRes = await app.inject({
      method: 'POST',
      url: `/api/intelligence-loop/m4/adaptive-policy-proposals/${autoProposalId}/auto-apply`,
      payload: {
        actor: 'operator',
        baselineValues: { maxConcurrency: 10 },
        maxChangePercent: 15,
      },
    });

    expect(autoApplyRes.statusCode).toBe(200);
    expect(autoApplyRes.json().result.autoApplied).toBe(true);
  });

  it('returns 404 for unknown M4 adaptive policy proposal operations', async () => {
    const approveRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals/unknown/approve',
      payload: { actor: 'reviewer', reason: 'n/a' },
    });
    expect(approveRes.statusCode).toBe(404);

    const applyRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals/unknown/apply',
      payload: { actor: 'operator', reason: 'n/a' },
    });
    expect(applyRes.statusCode).toBe(404);

    const revertRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals/unknown/revert',
      payload: { actor: 'operator', reason: 'n/a' },
    });
    expect(revertRes.statusCode).toBe(404);

    const rejectRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals/unknown/reject',
      payload: { actor: 'reviewer', reason: 'n/a' },
    });
    expect(rejectRes.statusCode).toBe(404);
  });

  it('supports M4 pattern score analysis and uplift proposal generation', async () => {
    const analysisRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/m4/pattern-scores/analysis?averageTarget=9.9&minimumTarget=9.4&limit=2',
    });

    expect(analysisRes.statusCode).toBe(200);
    expect(analysisRes.json().analysis.totalPatterns).toBeGreaterThanOrEqual(3);
    expect(analysisRes.json().analysis.readyForM4Done).toBe(false);

    const generateRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/pattern-uplift-proposals',
      payload: {
        actor: 'optimizer',
        limit: 2,
        averageTarget: 9.9,
        minimumTarget: 9.4,
      },
    });

    expect(generateRes.statusCode).toBe(201);
    expect(generateRes.json().result.proposalsCreated.length).toBe(2);
    expect(generateRes.json().result.proposalsCreated[0].domain).toBe('pattern-uplift');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/intelligence-loop/m4/adaptive-policy-proposals?status=pending',
    });

    expect(listRes.statusCode).toBe(200);
    expect(
      listRes
        .json()
        .proposals.some((proposal: { domain: string }) => proposal.domain === 'pattern-uplift')
    ).toBe(true);
  });

  it('supports new M4 analytics endpoints for chain quality, dependency planning, tool reliability and plan freshness', async () => {
    const chainQualityRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/chain-quality-analysis',
      payload: {
        predecessorContracts: [
          {
            source: 'BusinessDocs/phase-1.md',
            headingCount: 1,
            hasHandoffChecklist: true,
            checklist: { total: 4, checked: 2, completionRatio: 0.5 },
          },
        ],
        unresolvedOpenItems: 3,
        currentChainDepth: 2,
      },
    });

    expect(chainQualityRes.statusCode).toBe(200);
    expect(chainQualityRes.json().analysis.recommendedChainDepth).toBe(3);

    const dependencyPlanRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/dependency-plan',
      payload: {
        items: [
          { id: 'A', estimatedDurationMinutes: 10, impactScore: 0.8 },
          { id: 'B', dependencies: ['A'], estimatedDurationMinutes: 20, impactScore: 0.9 },
          { id: 'C', dependencies: ['A'], estimatedDurationMinutes: 5, impactScore: 0.4 },
        ],
      },
    });

    expect(dependencyPlanRes.statusCode).toBe(200);
    expect(dependencyPlanRes.json().result.executionGroups).toEqual([['A'], ['B', 'C']]);

    const toolReliabilityRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/tool-reliability-analysis',
      payload: {
        traces: [
          {
            toolId: 'search',
            success: true,
            durationMs: 100,
            planningReason: 'primary',
            skippedTools: ['grep'],
          },
          {
            toolId: 'search',
            success: false,
            durationMs: 200,
            escalatedTo: 'manual-review',
          },
        ],
      },
    });

    expect(toolReliabilityRes.statusCode).toBe(200);
    expect(toolReliabilityRes.json().result.tools[0].toolId).toBe('search');

    const freshnessRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/plan-freshness/validate',
      payload: {
        planId: 'PLAN-1',
        assumptions: [
          {
            key: 'coverage-target',
            expectedValue: 90,
            actualValue: 85,
          },
        ],
      },
    });

    expect(freshnessRes.statusCode).toBe(200);
    expect(freshnessRes.json().result.stale).toBe(true);

    const runtimePriorityRes = await app.inject({
      method: 'POST',
      url: '/api/intelligence-loop/m4/runtime-priority/plan',
      payload: {
        items: [
          { id: 'A', estimatedDurationMinutes: 10, impactScore: 0.4 },
          { id: 'B', estimatedDurationMinutes: 5, impactScore: 0.9 },
        ],
      },
    });

    expect(runtimePriorityRes.statusCode).toBe(200);
    expect(runtimePriorityRes.json().result.prioritizedOrder[0].id).toBe('B');
  });
});
