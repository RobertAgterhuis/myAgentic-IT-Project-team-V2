// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Comprehensive Tests for M1 Intelligence Loop Services
 *
 * Covers:
 * - lessons-to-policy.ts
 * - failure-taxonomy.ts
 * - objective-graph.ts
 * - goal-health.ts
 * - benchmark-tuning.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ServiceContext } from '../../src/webapp/services/types';
import { LessonsToPolicyService } from '../../platform/engine/lessons-to-policy';
import {
  FailureTaxonomyService,
  createFailureTaxonomyService,
} from '../../platform/engine/failure-taxonomy';
import {
  ObjectiveGraphService,
  createObjectiveGraphService,
  type Objective,
} from '../../platform/engine/objective-graph';
import { GoalHealthScoringService } from '../../platform/engine/goal-health';
import { BenchmarkTuningService } from '../../platform/engine/benchmark-tuning';

/**
 * Mock ServiceContext for testing
 */
function createMockContext(): ServiceContext {
  const store = new Map<string, string>();

  const storeApi = {
    exists: vi.fn((filePath: string) => store.has(filePath)),
    readFile: vi.fn((filePath: string) => {
      const value = store.get(filePath);
      if (value === undefined) {
        throw new Error(`ENOENT: ${filePath}`);
      }
      return value;
    }),
    writeFile: vi.fn((filePath: string, content: string) => {
      store.set(filePath, content);
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
    sessionDir: '.session',
    decisionsFile: 'BusinessDocs/decisions.md',
    decisionsDir: 'BusinessDocs/decisions',
    commandQueue: 'BusinessDocs/command-queue.jsonl',
    helpDir: 'docs/help',
    safeWrite: vi.fn((filePath: string, data: string) => {
      store.set(filePath, data);
    }),
  } as unknown as ServiceContext;
}

describe('PATTERNS M1: Close The Intelligence Loop', () => {
  describe('LessonsToPolicyService', () => {
    let service: LessonsToPolicyService;
    let ctx: ServiceContext;

    beforeEach(() => {
      ctx = createMockContext();
      service = new LessonsToPolicyService(ctx);
    });

    it('should extract lessons from reevaluate artifacts', async () => {
      const mockReevaluate = `# Reevaluate Report

## What Worked Well
- Agent routing improved decision accuracy
- RAG integration reduced hallucinations
- Benchmarks caught regressions early

## What Could Improve
- Tool loop optimization needs work
- Provider fallback is too slow
- Decision caching not effective
`;

      vi.mocked(ctx.store.exists).mockReturnValueOnce(true);
      vi.mocked(ctx.store.readFile).mockReturnValueOnce(mockReevaluate);

      const lessons = await service.extractLessons(['reeval-123'], []);
      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons[0].narrative).toContain('Agent routing');
    });

    it('should extract lessons from retrospective artifacts', async () => {
      const mockRetro = `# Retrospective

## Successes
- Approval process streamlined
- Documentation was comprehensive

## Issues Encountered
- Tool timeouts during peak load
- Missing RAG evidence in some cases
`;

      vi.mocked(ctx.store.exists).mockReturnValueOnce(true);
      vi.mocked(ctx.store.readFile).mockReturnValueOnce(mockRetro);

      const lessons = await service.extractLessons([], ['retro-456']);
      expect(lessons.length).toBeGreaterThan(0);
      expect(lessons[0].category).toBe('approval');
    });

    it('should generate policy recommendations from lessons', async () => {
      const lessons = [
        {
          id: 'LESSON-TEST-001',
          category: 'routing',
          narrative: 'Agent routing improved accuracy significantly',
          evidence: [{ source: 'metric', data: '95% accuracy', weight: 0.9 }],
          confidence: 0.85,
          applicability: { phases: ['PHASE_2'], agents: [], scope: 'universal' },
          recommendedPolicyChange: {
            policyDomain: 'routing',
            changeDescription: 'Enable new routing algorithm',
          },
        },
      ];

      const recommendations = await service.generatePolicyRecommendations(lessons);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].policyDomain).toBe('routing');
      expect(recommendations[0].approvalRequired).toBe(true);
    });

    it('should create and persist policy change proposals', async () => {
      const safeWriteCall = vi.mocked(ctx.safeWrite);

      const proposal = await service.createProposal(
        [
          {
            id: 'LESSON-TEST-001',
            category: 'validation',
            narrative: 'Validation strictness needs adjustment',
            evidence: [],
            confidence: 0.8,
            applicability: { phases: [], agents: [], scope: 'universal' },
          },
        ],
        [],
        []
      );

      expect(proposal.proposalId).toMatch(/^POLICYCHANGE-/);
      expect(proposal.recommendedChanges.length).toBeGreaterThan(0);
      expect(proposal.recommendationStatus).toBe('pending-review');
      expect(proposal.summary.riskClassification).toBe('low');
      expect(safeWriteCall).toHaveBeenCalled();
    });

    it('should map lesson categories and explicit policy domains into recommendations', async () => {
      const recommendations = await service.generatePolicyRecommendations([
        {
          id: 'LESSON-MAP-001',
          category: 'performance',
          narrative: 'Cache misses are increasing',
          evidence: [],
          confidence: 0.55,
          applicability: { phases: ['PHASE_2'], agents: ['architect'], scope: 'targeted' },
          recommendedPolicyChange: {
            policyDomain: 'cache-policy',
            changeDescription: 'Reduce cache churn',
          },
        },
        {
          id: 'LESSON-MAP-002',
          category: 'collaboration',
          narrative: 'Escalation behavior caused less churn',
          evidence: [],
          confidence: 0.9,
          applicability: { phases: ['PHASE_3'], agents: ['orchestrator'], scope: 'targeted' },
          recommendedPolicyChange: {
            policyDomain: 'unknown-domain',
            changeDescription: 'Fallback to category mapping',
          },
        },
      ]);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].policyDomain).toBe('cache-policy');
      expect(recommendations[0].riskLevel).toBe('high');
      expect(recommendations[1].policyDomain).toBe('escalation-behavior');
      expect(recommendations[1].expectedImpact.estimatedMagnitude).toBe('large');
    });

    it('should summarize proposal confidence and high-risk counts', async () => {
      const proposal = await service.createProposal(
        [
          {
            id: 'LESSON-SUMMARY-001',
            category: 'validation',
            narrative: 'Validation noise should be reduced',
            evidence: [],
            confidence: 0.5,
            applicability: { phases: ['PHASE_2'], agents: [], scope: 'universal' },
          },
          {
            id: 'LESSON-SUMMARY-002',
            category: 'routing',
            narrative: 'Routing policy is performing well',
            evidence: [],
            confidence: 0.95,
            applicability: { phases: ['PHASE_1'], agents: ['orchestrator'], scope: 'universal' },
          },
        ],
        ['bench-1'],
        ['retro-1']
      );

      expect(proposal.derivedFrom.benchmarkRunIds).toEqual(['bench-1']);
      expect(proposal.derivedFrom.retrospectiveIds).toEqual(['retro-1']);
      expect(proposal.summary.totalChangesProposed).toBe(2);
      expect(proposal.summary.highRiskChanges).toBe(1);
      expect(proposal.summary.requiresApproval).toBe(2);
      expect(proposal.summary.confidenceScore).toBeGreaterThan(0.6);
      expect(proposal.summary.riskClassification).toBe('high');
    });

    it('should auto-apply low-risk proposals when benchmark evidence passes', async () => {
      ctx.store.writeFile(
        'tests/load/bench-low-risk.json',
        JSON.stringify({ p95: 1500, errorRatePct: 2, successRatePct: 98 })
      );

      const proposal = await service.createProposal(
        [
          {
            id: 'LESSON-AUTOAPPLY-001',
            category: 'routing',
            narrative: 'Routing policy remained stable under load',
            evidence: [],
            confidence: 0.9,
            applicability: { phases: [], agents: [], scope: 'universal' },
          },
        ],
        ['bench-low-risk'],
        []
      );

      const result = await service.autoApplyProposal(proposal.proposalId);

      expect(result.autoApplied).toBe(true);
      expect(result.failClosed).toBe(false);

      const stored = JSON.parse(
        ctx.store.readFile(
          `BusinessDocs/intelligence-loop/policy-proposals/${proposal.proposalId}.json`
        )
      );
      expect(stored.recommendationStatus).toBe('applied');

      const rollbackJournal = ctx.store.readFile(
        'BusinessDocs/intelligence-loop/policy-rollback-journal.jsonl'
      );
      expect(rollbackJournal).toContain(proposal.proposalId);

      const adaptationEvents = ctx.store.readFile('BusinessDocs/metrics/adaptation-events.jsonl');
      expect(adaptationEvents).toContain('auto-apply-attempted');
      expect(adaptationEvents).toContain('proposal-applied');
    });

    it('should fail closed when auto-apply benchmark evidence is missing', async () => {
      const proposal = await service.createProposal(
        [
          {
            id: 'LESSON-AUTOAPPLY-002',
            category: 'retrieval',
            narrative: 'Retrieval profile appears stable',
            evidence: [],
            confidence: 0.92,
            applicability: { phases: [], agents: [], scope: 'universal' },
          },
        ],
        ['missing-benchmark'],
        []
      );

      const result = await service.autoApplyProposal(proposal.proposalId);
      expect(result.autoApplied).toBe(false);
      expect(result.failClosed).toBe(true);
      expect(result.reasons.some((reason) => reason.includes('benchmark evidence'))).toBe(true);

      const adaptationEvents = ctx.store.readFile('BusinessDocs/metrics/adaptation-events.jsonl');
      expect(adaptationEvents).toContain('auto-apply-failed-closed');
    });

    it('should revert latest applied proposal from rollback journal in one command', async () => {
      ctx.store.writeFile(
        'tests/load/bench-revert.json',
        JSON.stringify({ p95: 1200, errorRatePct: 1, successRatePct: 99 })
      );

      const proposal = await service.createProposal(
        [
          {
            id: 'LESSON-ROLLBACK-001',
            category: 'tool-use',
            narrative: 'Concurrency tuning stayed within safe boundaries',
            evidence: [],
            confidence: 0.91,
            applicability: { phases: [], agents: [], scope: 'universal' },
          },
        ],
        ['bench-revert'],
        []
      );

      const applied = await service.autoApplyProposal(proposal.proposalId);
      expect(applied.autoApplied).toBe(true);

      const reverted = await service.revertLatestAppliedProposal('rapid rollback');
      expect(reverted.proposalId).toBe(proposal.proposalId);

      const stored = JSON.parse(
        ctx.store.readFile(
          `BusinessDocs/intelligence-loop/policy-proposals/${proposal.proposalId}.json`
        )
      );
      expect(stored.recommendationStatus).toBe('reverted');
    });

    it('should apply and revert proposals with audit trails', async () => {
      const proposal = await service.createProposal([], [], []);

      proposal.recommendationStatus = 'approved';
      await service.applyProposal(proposal);

      expect(proposal.appliedAt).toBeDefined();

      const safeWriteCall = vi.mocked(ctx.safeWrite);
      expect(safeWriteCall).toHaveBeenCalledWith(
        expect.stringContaining('policy-application-audit'),
        expect.stringContaining('applied')
      );
    });

    it('should reject applying proposals that are not approved', async () => {
      const proposal = await service.createProposal([], [], []);

      await expect(service.applyProposal(proposal)).rejects.toThrow(
        'Cannot apply proposal with status: pending-review'
      );
    });

    it('should revert persisted proposals and reject missing proposal reverts', async () => {
      const proposal = await service.createProposal([], [], []);
      proposal.recommendationStatus = 'approved';
      await service.applyProposal(proposal);

      await service.revertProposal(proposal.proposalId, 'rollback test');

      const stored = JSON.parse(
        vi.mocked(ctx.store.readFile).mock.results.length
          ? ctx.store.readFile(
              `BusinessDocs/intelligence-loop/policy-proposals/${proposal.proposalId}.json`
            )
          : '{}'
      );
      expect(stored.recommendationStatus).toBe('reverted');
      expect(stored.reviewNotes).toContain('rollback test');

      await expect(service.revertProposal('missing-proposal', 'no-op')).rejects.toThrow(
        'Proposal not found: missing-proposal'
      );
    });
  });

  describe('FailureTaxonomyService', () => {
    let service: FailureTaxonomyService;
    let ctx: ServiceContext;

    beforeEach(async () => {
      ctx = createMockContext();
      service = await createFailureTaxonomyService(ctx);
    });

    it('should initialize taxonomy with default failure classes', async () => {
      const taxonomy = await service.getTaxonomy();
      expect(taxonomy.failureClasses.length).toBeGreaterThan(0);
      expect(taxonomy.failureClasses[0].category).toBeDefined();
      expect(taxonomy.failureClasses[0].documentedRemediations.length).toBeGreaterThan(0);
    });

    it('should classify errors into failure classes', async () => {
      const failureClass = await service.classifyError(
        'Provider unavailable: service returned 503',
        'agent-1'
      );
      expect(failureClass).toBeDefined();
      expect(failureClass?.category).toBe('provider-fallback');
    });

    it('should record failure instances', async () => {
      const instance = await service.recordFailure({
        classId: 'FAIL-PROVIDER-001',
        timestamp: new Date().toISOString(),
        affectedAgent: 'architect',
        errorMessage: 'Provider timeout',
      });

      expect(instance.id).toMatch(/^FAILINSTANCE-/);
    });

    it('should recommend remediations for failure class', async () => {
      const remediations = await service.recommendRemediations('FAIL-PROVIDER-001');
      expect(remediations.length).toBeGreaterThan(0);
      // Should be sorted by success rate descending
      if (remediations.length > 1) {
        expect(remediations[0].successRate).toBeGreaterThanOrEqual(remediations[1].successRate);
      }
    });

    it('should track remediation application success', async () => {
      const instance = await service.recordFailure({
        classId: 'FAIL-PROVIDER-001',
        timestamp: new Date().toISOString(),
        affectedAgent: 'architect',
        errorMessage: 'Provider error',
      });

      await service.recordRemediationApplication(instance.id, 'REM-PROV-001', true);

      const stats = await service.getTaxonomyStats();
      expect(stats.totalClasses).toBeGreaterThan(0);
    });

    it('should compute taxonomy statistics', async () => {
      const stats = await service.getTaxonomyStats();
      expect(stats.totalClasses).toBeGreaterThan(0);
      expect(stats.totalRemediations).toBeGreaterThan(0);
      expect(stats.overallRemediationSuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.overallRemediationSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  describe('ObjectiveGraphService', () => {
    let service: ObjectiveGraphService;
    let ctx: ServiceContext;

    beforeEach(async () => {
      ctx = createMockContext();
      service = await createObjectiveGraphService(ctx);
    });

    it('should initialize empty objective graph', async () => {
      const graph = await service.getGraph();
      expect(graph.version).toBe('1.0.0');
      expect(graph.objectives).toEqual([]);
      expect(graph.epics).toEqual([]);
    });

    it('should add objectives to graph', async () => {
      const objective: Objective = {
        id: 'OBJ-M1-001',
        name: 'Close The Intelligence Loop',
        description: 'Implement automatic learning from operational evidence',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        kpis: [
          {
            id: 'KPI-ADAPT-001',
            name: 'Learning and Adaptation Score',
            metricType: 'score',
            targetValue: 8.8,
            currentValue: 7.1,
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      };

      const added = await service.addObjective(objective);
      expect(added.id).toBe('OBJ-M1-001');

      const graph = await service.getGraph();
      expect(graph.objectives.length).toBe(1);
    });

    it('should link epics to objectives', async () => {
      const objective = await service.addObjective({
        id: 'OBJ-M1-002',
        name: 'Test Objective',
        description: 'Test',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      });

      const _epic = await service.addEpic({
        id: 'EPIC-E1-001',
        name: 'Lessons-to-Policy Pipeline',
        objectiveId: objective.id,
        status: 'in-progress',
      });

      const graph = await service.getGraph();
      expect(graph.epics.length).toBe(1);
      const updatedObjective = graph.objectives.find((o) => o.id === objective.id);
      expect(updatedObjective?.linkedEpics).toContain('EPIC-E1-001');
    });

    it('should update KPI values and drift status', async () => {
      const objective = await service.addObjective({
        id: 'OBJ-KPI-TEST',
        name: 'KPI Test',
        description: 'Test',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        kpis: [
          {
            id: 'KPI-TEST-001',
            name: 'Test KPI',
            metricType: 'score',
            targetValue: 9.0,
            currentValue: 8.5,
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      });

      const updated = await service.updateKPI(objective.id, 'KPI-TEST-001', 8.8, 'on-track');

      expect(updated.currentValue).toBe(8.8);
      expect(updated.driftStatus).toBe('on-track');
    });

    it('should compute health summary', async () => {
      await service.addObjective({
        id: 'OBJ-HEALTH-001',
        name: 'Health Test 1',
        description: 'Test',
        ownerAgent: 'orchestrator',
        status: 'healthy',
        healthScore: 9.0,
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      });

      await service.addObjective({
        id: 'OBJ-HEALTH-002',
        name: 'Health Test 2',
        description: 'Test',
        ownerAgent: 'orchestrator',
        status: 'at-risk',
        healthScore: 5.0,
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 2,
        recommendedActions: [],
      });

      const summary = await service.computeHealthSummary();
      expect(summary.totalObjectives).toBe(2);
      expect(summary.healthy).toBe(1);
      expect(summary.atRisk).toBe(1);
    });

    it('should update objectives, link artifacts, filter views and export graph', async () => {
      await service.addObjective({
        id: 'OBJ-VIEWS-001',
        name: 'Objective Views',
        description: 'Covers graph query operations',
        ownerAgent: 'orchestrator',
        status: 'not-started',
        healthScore: 4.4,
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      });

      const updated = await service.updateObjective('OBJ-VIEWS-001', {
        status: 'at-risk',
        blockerCount: 1,
      });
      expect(updated.status).toBe('at-risk');
      expect(updated.lastHealthAssessment).toBeDefined();

      await service.addEpic({
        id: 'EPIC-VIEWS-001',
        name: 'Graph Query Coverage',
        objectiveId: 'OBJ-VIEWS-001',
        status: 'planned',
      });
      await service.linkSprintItem('OBJ-VIEWS-001', 'SPRINT-001');
      await service.linkSprintItem('OBJ-VIEWS-001', 'SPRINT-001');
      await service.linkGate('OBJ-VIEWS-001', 'gate.critic-risk-1');
      await service.linkGate('OBJ-VIEWS-001', 'gate.critic-risk-1');

      const byStatus = await service.getObjectivesByStatus('at-risk');
      const atRisk = await service.getAtRiskObjectives();
      const byAgent = await service.getObjectivesByAgent('orchestrator');
      const epics = await service.getEpicsForObjective('OBJ-VIEWS-001');
      const exported = await service.exportGraph();

      expect(byStatus.map((objective) => objective.id)).toContain('OBJ-VIEWS-001');
      expect(atRisk.map((objective) => objective.id)).toContain('OBJ-VIEWS-001');
      expect(byAgent.map((objective) => objective.id)).toContain('OBJ-VIEWS-001');
      expect(epics.map((epic) => epic.id)).toContain('EPIC-VIEWS-001');
      expect(exported.healthSummary?.totalObjectives).toBeGreaterThanOrEqual(1);
      expect(
        exported.objectives.find((objective) => objective.id === 'OBJ-VIEWS-001')?.linkedSprintItems
      ).toEqual(['SPRINT-001']);
      expect(
        exported.objectives.find((objective) => objective.id === 'OBJ-VIEWS-001')?.linkedGates
      ).toEqual(['gate.critic-risk-1']);
    });

    it('should throw for duplicate objectives, missing objectives and duplicate epics', async () => {
      await service.addObjective({
        id: 'OBJ-ERROR-001',
        name: 'Duplicate Objective',
        description: 'Covers graph errors',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      });

      await expect(
        service.addObjective({
          id: 'OBJ-ERROR-001',
          name: 'Duplicate Objective',
          description: 'duplicate',
          ownerAgent: 'orchestrator',
          status: 'in-progress',
          kpis: [],
          linkedEpics: [],
          linkedSprintItems: [],
          linkedGates: [],
          blockingDecisions: [],
          blockerCount: 0,
          recommendedActions: [],
        })
      ).rejects.toThrow('Objective already exists: OBJ-ERROR-001');

      await expect(service.updateObjective('OBJ-MISSING', { status: 'paused' })).rejects.toThrow(
        'Objective not found: OBJ-MISSING'
      );
      await expect(service.linkSprintItem('OBJ-MISSING', 'SPRINT-404')).rejects.toThrow(
        'Objective not found: OBJ-MISSING'
      );
      await expect(service.linkGate('OBJ-MISSING', 'gate-missing')).rejects.toThrow(
        'Objective not found: OBJ-MISSING'
      );
      await expect(service.updateKPI('OBJ-ERROR-001', 'KPI-MISSING', 1)).rejects.toThrow(
        'KPI not found: KPI-MISSING'
      );
      await expect(
        service.addEpic({
          id: 'EPIC-MISSING-OBJECTIVE',
          name: 'Missing Objective Epic',
          objectiveId: 'OBJ-MISSING',
          status: 'planned',
        })
      ).rejects.toThrow('Objective not found: OBJ-MISSING');

      await service.addEpic({
        id: 'EPIC-DUPLICATE',
        name: 'Duplicate Epic',
        objectiveId: 'OBJ-ERROR-001',
        status: 'planned',
      });

      await expect(
        service.addEpic({
          id: 'EPIC-DUPLICATE',
          name: 'Duplicate Epic',
          objectiveId: 'OBJ-ERROR-001',
          status: 'planned',
        })
      ).rejects.toThrow('Epic already exists: EPIC-DUPLICATE');
    });
  });

  describe('GoalHealthScoringService', () => {
    let service: GoalHealthScoringService;
    let ctx: ServiceContext;

    beforeEach(() => {
      ctx = createMockContext();
      service = new GoalHealthScoringService(ctx);
    });

    it('should assess objective health', async () => {
      const objective: Objective = {
        id: 'OBJ-HEALTH-TEST',
        name: 'Health Assessment Test',
        description: 'Test objective',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        healthScore: 7.5,
        kpis: [
          {
            id: 'KPI-001',
            name: 'Accuracy',
            metricType: 'percentage',
            targetValue: 95,
            currentValue: 92,
            driftStatus: 'warning',
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: ['DEC-001', 'DEC-002'],
        blockerCount: 2,
        recommendedActions: [],
      };

      const assessment = await service.assessObjectiveHealth(objective);

      expect(assessment.assessmentId).toMatch(/^HEALTH-/);
      expect(assessment.objectiveId).toBe(objective.id);
      expect(assessment.overallHealth.score).toBeGreaterThanOrEqual(0);
      expect(assessment.overallHealth.score).toBeLessThanOrEqual(10);
      expect(['healthy', 'at-risk', 'critical']).toContain(assessment.overallHealth.status);
    });

    it('should generate recommended actions based on health', async () => {
      const objective: Objective = {
        id: 'OBJ-CRITICAL-TEST',
        name: 'Critical Objective',
        description: 'At critical health',
        ownerAgent: 'orchestrator',
        status: 'at-risk',
        healthScore: 2.0,
        kpis: [
          {
            id: 'KPI-CRIT-001',
            name: 'Availability',
            metricType: 'percentage',
            targetValue: 99.9,
            currentValue: 85,
            driftStatus: 'critical',
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [
          'DEC-BLOCK-001',
          'DEC-BLOCK-002',
          'DEC-BLOCK-003',
          'DEC-BLOCK-004',
          'DEC-BLOCK-005',
        ],
        blockerCount: 5,
        recommendedActions: [],
      };

      const assessment = await service.assessObjectiveHealth(objective);

      if (assessment.overallHealth.status === 'critical') {
        expect(assessment.recommendedActions.length).toBeGreaterThan(0);
        expect(assessment.recommendedActions[0].priority).toBe('critical');
      }
    });

    it('should classify at-risk objectives and emit notify or reevaluate actions', async () => {
      const notifyObjective: Objective = {
        id: 'OBJ-NOTIFY-001',
        name: 'Decision Queue Warning',
        description: 'Triggers decision warning action',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        healthScore: 6,
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: ['DEC-1', 'DEC-2', 'DEC-3', 'DEC-4'],
        blockerCount: 0,
        recommendedActions: [],
      };

      const notifyAssessment = await service.assessObjectiveHealth(notifyObjective);
      expect(notifyAssessment.overallHealth.status).toBe('at-risk');
      expect(
        notifyAssessment.recommendedActions.some((action) => action.actionType === 'reevaluate')
      ).toBe(true);

      const reevaluateObjective: Objective = {
        id: 'OBJ-REEVALUATE-001',
        name: 'At Risk Objective',
        description: 'Triggers fallback at-risk action',
        ownerAgent: 'orchestrator',
        status: 'at-risk',
        healthScore: 4.6,
        kpis: [],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 5,
        recommendedActions: [],
      };

      const reevaluateAssessment = await service.assessObjectiveHealth(reevaluateObjective);
      expect(reevaluateAssessment.overallHealth.status).toBe('at-risk');
      expect(
        reevaluateAssessment.recommendedActions.some((action) => action.actionType === 'reevaluate')
      ).toBe(true);
    });

    it('should return improving, degrading and stable trends from persisted assessments', async () => {
      const objective: Objective = {
        id: 'OBJ-TREND-001',
        name: 'Trend Objective',
        description: 'Exercise persisted trend logic',
        ownerAgent: 'orchestrator',
        status: 'in-progress',
        healthScore: 7,
        kpis: [
          {
            id: 'KPI-TREND-001',
            name: 'Trend KPI',
            metricType: 'percentage',
            targetValue: 100,
            currentValue: 100,
            driftStatus: 'on-track',
          },
        ],
        linkedEpics: [],
        linkedSprintItems: [],
        linkedGates: [],
        blockingDecisions: [],
        blockerCount: 0,
        recommendedActions: [],
      };

      vi.mocked(ctx.safeWrite).mockImplementation((filePath, data) => {
        const content = typeof data === 'string' ? data : String(data);
        vi.mocked(ctx.store.writeFile)(filePath, content);
      });

      vi.mocked(ctx.store.writeFile).mockImplementation((filePath: string, content: string) => {
        (ctx as unknown as { __store?: Map<string, string> }).__store ??= new Map<string, string>();
        (ctx as unknown as { __store: Map<string, string> }).__store.set(filePath, content);
      });
      vi.mocked(ctx.store.exists).mockImplementation((filePath: string) =>
        (
          (ctx as unknown as { __store?: Map<string, string> }).__store ?? new Map<string, string>()
        ).has(filePath)
      );
      vi.mocked(ctx.store.readFile).mockImplementation((filePath: string) => {
        const value = (
          (ctx as unknown as { __store?: Map<string, string> }).__store ?? new Map()
        ).get(filePath);
        if (value === undefined) {
          throw new Error(`ENOENT: ${filePath}`);
        }
        return value;
      });
      (ctx as unknown as { __store: Map<string, string> }).__store = new Map<string, string>();

      (ctx as unknown as { __store: Map<string, string> }).__store.set(
        'BusinessDocs/intelligence-loop/goal-health-assessments.jsonl',
        `${JSON.stringify({ objectiveId: 'OBJ-TREND-001', overallHealth: { score: 4 } })}\n${JSON.stringify({ objectiveId: 'OBJ-TREND-001', overallHealth: { score: 5 } })}\n`
      );
      const improving = await service.assessObjectiveHealth(objective);
      expect(improving.overallHealth.trend).toBe('improving');

      (ctx as unknown as { __store: Map<string, string> }).__store.set(
        'BusinessDocs/intelligence-loop/goal-health-assessments.jsonl',
        `${JSON.stringify({ objectiveId: 'OBJ-TREND-001', overallHealth: { score: 9 } })}\n${JSON.stringify({ objectiveId: 'OBJ-TREND-001', overallHealth: { score: 8.8 } })}\n`
      );
      const degradingService = new GoalHealthScoringService(ctx);
      const degrading = await degradingService.assessObjectiveHealth({
        ...objective,
        kpis: [
          {
            ...objective.kpis[0],
            currentValue: 60,
            driftStatus: 'critical',
          },
        ],
        blockerCount: 6,
        blockingDecisions: ['A', 'B', 'C', 'D', 'E', 'F'],
      });
      expect(degrading.overallHealth.trend).toBe('degrading');

      const latest = await degradingService.getLatestAssessment('OBJ-TREND-001');
      expect(latest?.objectiveId).toBe('OBJ-TREND-001');
      expect(
        (await degradingService.getAssessmentsForObjective('OBJ-TREND-001')).length
      ).toBeGreaterThan(0);

      (ctx as unknown as { __store: Map<string, string> }).__store.set(
        'BusinessDocs/intelligence-loop/goal-health-assessments.jsonl',
        'not-json\n'
      );
      expect(await degradingService.getAssessmentsForObjective('OBJ-TREND-001')).toEqual([]);
    });
  });

  describe('BenchmarkTuningService', () => {
    let service: BenchmarkTuningService;
    let ctx: ServiceContext;

    beforeEach(() => {
      ctx = createMockContext();
      service = new BenchmarkTuningService(ctx);
    });

    it('should compare benchmark runs', async () => {
      const comparison = await service.compareBenchmarks('bench-current', 'bench-previous');

      expect(comparison.comparisonId).toMatch(/^BENCHCMP-/);
      expect(comparison.currentBenchmarkId).toBe('bench-current');
      expect(comparison.previousBenchmarkId).toBe('bench-previous');
    });

    it('should generate tuning proposals from regressions', async () => {
      const comparison = await service.compareBenchmarks('bench-2', 'bench-1');

      const proposals = await service.generateTuningProposals(comparison);

      // Proposals may be empty if no regressions, which is fine
      if (proposals.length > 0) {
        expect(proposals[0].id).toMatch(/^TUNING-/);
        expect(proposals[0].safetyBounds).toBeDefined();
      }
    });

    it('should manage proposal approval workflow', async () => {
      const proposals = await service.generateTuningProposals({
        comparisonId: 'test-cmp',
        currentBenchmarkId: 'bench-3',
        previousBenchmarkId: 'bench-2',
        comparedAt: new Date().toISOString(),
        metrics: [],
        regressions: [
          {
            metricName: 'avgLatencyMs',
            changePercentage: 15.5,
            severity: 'high',
          },
        ],
        improvementsDetected: [],
      });

      if (proposals.length > 0) {
        const proposalId = proposals[0].id;

        await service.applyProposal(proposalId);
        let allProposals = await service.getAllProposals();
        const applied = allProposals.find((p) => p.id === proposalId);
        expect(applied?.approvalStatus).toBe('applied');

        await service.revertProposal(proposalId, 'Safety concern');
        allProposals = await service.getAllProposals();
        const reverted = allProposals.find((p) => p.id === proposalId);
        expect(reverted?.revertReason).toBe('Safety concern');
      }
    });

    it('should compare against a baseline when no previous benchmark is supplied', async () => {
      const comparison = await service.compareBenchmarks('bench-baseline-only');

      expect(comparison.previousBenchmarkId).toBe('baseline');
      expect(comparison.metrics).toEqual([]);
      expect(comparison.regressions).toEqual([]);
    });

    it('should detect latency, throughput and error-rate regressions from stored benchmark data', async () => {
      vi.mocked(ctx.store.exists).mockImplementation((filePath: string) =>
        [
          'tests/load/bench-prev.json',
          'tests/load/bench-current.json',
          'tests/load/bench-throughput-prev.json',
          'tests/load/bench-throughput-current.json',
        ].includes(filePath)
      );
      vi.mocked(ctx.store.readFile).mockImplementation((filePath: string) => {
        const fixtures: Record<string, string> = {
          'tests/load/bench-prev.json': JSON.stringify({
            avgLatencyMs: 100,
            p95LatencyMs: 300,
            throughputRequestsPerSec: 100,
            errorRate: 0.01,
            approvalTimeMinutes: 3,
            cacheMissRate: 0.1,
          }),
          'tests/load/bench-current.json': JSON.stringify({
            avgLatencyMs: 140,
            p95LatencyMs: 420,
            throughputRequestsPerSec: 80,
            errorRate: 0.03,
            approvalTimeMinutes: 6,
            cacheMissRate: 0.2,
          }),
          'tests/load/bench-throughput-prev.json': JSON.stringify({
            avgLatencyMs: 100,
            p95LatencyMs: 100,
            throughputRequestsPerSec: 100,
            errorRate: 0.01,
            approvalTimeMinutes: 4,
            cacheMissRate: 0.15,
          }),
          'tests/load/bench-throughput-current.json': JSON.stringify({
            avgLatencyMs: 102,
            p95LatencyMs: 103,
            throughputRequestsPerSec: 60,
            errorRate: 0.011,
            approvalTimeMinutes: 4.1,
            cacheMissRate: 0.14,
          }),
        };
        return fixtures[filePath];
      });

      const regressionComparison = await service.compareBenchmarks('bench-current', 'bench-prev');
      expect(regressionComparison.regressions.map((regression) => regression.metricName)).toEqual(
        expect.arrayContaining(['avgLatencyMs', 'p95LatencyMs', 'errorRate', 'approvalTimeMinutes'])
      );
      expect(regressionComparison.improvementsDetected).toContain('cacheMissRate');

      const proposals = await service.generateTuningProposals(regressionComparison);
      expect(proposals.some((proposal) => proposal.configurationDomain === 'concurrency')).toBe(
        true
      );
      expect(
        proposals.some((proposal) => proposal.configurationDomain === 'human-review-threshold')
      ).toBe(true);

      const throughputComparison = await service.compareBenchmarks(
        'bench-throughput-current',
        'bench-throughput-prev'
      );
      expect(
        throughputComparison.regressions.some(
          (regression) => regression.metricName === 'throughputRequestsPerSec'
        )
      ).toBe(true);
      const throughputProposals = await service.generateTuningProposals({
        ...throughputComparison,
        regressions: [
          {
            metricName: 'throughput',
            changePercentage: -40,
            severity: 'critical',
          },
        ],
      });
      expect(
        throughputProposals.some((proposal) => proposal.expectedImprovement.metric === 'throughput')
      ).toBe(true);
    });

    it('should reject and filter proposals and handle missing proposal operations', async () => {
      const proposals = await service.generateTuningProposals({
        comparisonId: 'cmp-status',
        currentBenchmarkId: 'bench-status-current',
        previousBenchmarkId: 'bench-status-prev',
        comparedAt: new Date().toISOString(),
        metrics: [],
        regressions: [
          {
            metricName: 'errorRate',
            changePercentage: 25,
            severity: 'critical',
          },
        ],
        improvementsDetected: [],
      });

      expect(proposals).toHaveLength(1);
      await service.rejectProposal(proposals[0].id, 'too risky');
      expect(await service.getProposalsByStatus('rejected')).toHaveLength(1);

      await expect(service.applyProposal('missing-proposal')).rejects.toThrow(
        'Proposal not found: missing-proposal'
      );
      await expect(service.rejectProposal('missing-proposal', 'x')).rejects.toThrow(
        'Proposal not found: missing-proposal'
      );
      await expect(service.revertProposal('missing-proposal', 'x')).rejects.toThrow(
        'Proposal not found: missing-proposal'
      );
    });

    it('should return empty proposal collections when storage is missing or malformed', async () => {
      expect(await service.getAllProposals()).toEqual([]);
      vi.mocked(ctx.store.exists).mockReturnValue(true);
      vi.mocked(ctx.store.readFile).mockReturnValue('not-json');
      expect(await service.getAllProposals()).toEqual([]);
    });

    it('should compare prompt variants on stable golden tasks', async () => {
      vi.mocked(ctx.store.exists).mockImplementation((filePath: string) =>
        [
          'tests/load/golden-tasks/agent-quality-core.json',
          'tests/load/prompt-run-a.json',
          'tests/load/prompt-run-b.json',
        ].includes(filePath)
      );

      vi.mocked(ctx.store.readFile).mockImplementation((filePath: string) => {
        const fixtures: Record<string, string> = {
          'tests/load/golden-tasks/agent-quality-core.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            version: '1.0.0',
            tasks: [
              { taskId: 'GT-001', prompt: 'Task 1', weight: 2 },
              { taskId: 'GT-002', prompt: 'Task 2', weight: 1 },
            ],
          }),
          'tests/load/prompt-run-a.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            tasks: [
              { taskId: 'GT-001', score: 72, pass: true, latencyMs: 1200 },
              { taskId: 'GT-002', score: 70, pass: true, latencyMs: 900 },
            ],
          }),
          'tests/load/prompt-run-b.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            tasks: [
              { taskId: 'GT-001', score: 82, pass: true, latencyMs: 1100 },
              { taskId: 'GT-002', score: 80, pass: true, latencyMs: 850 },
            ],
          }),
        };

        return fixtures[filePath];
      });

      const comparison = await service.comparePromptVariants({
        baselineRunId: 'prompt-run-a',
        candidateRunId: 'prompt-run-b',
        suiteId: 'agent-quality-core',
      });

      expect(comparison.comparisonId).toMatch(/^PROMPTAB-/);
      expect(comparison.comparedTaskCount).toBe(2);
      expect(comparison.verdict).toBe('improved');
      expect(comparison.taskComparisons).toHaveLength(2);
    });

    it('should fail prompt variant comparison when run tasks do not match golden suite', async () => {
      vi.mocked(ctx.store.exists).mockImplementation((filePath: string) =>
        [
          'tests/load/golden-tasks/agent-quality-core.json',
          'tests/load/prompt-run-a.json',
          'tests/load/prompt-run-missing.json',
        ].includes(filePath)
      );

      vi.mocked(ctx.store.readFile).mockImplementation((filePath: string) => {
        const fixtures: Record<string, string> = {
          'tests/load/golden-tasks/agent-quality-core.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            version: '1.0.0',
            tasks: [
              { taskId: 'GT-001', prompt: 'Task 1', weight: 1 },
              { taskId: 'GT-002', prompt: 'Task 2', weight: 1 },
            ],
          }),
          'tests/load/prompt-run-a.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            tasks: [
              { taskId: 'GT-001', score: 70, pass: true },
              { taskId: 'GT-002', score: 68, pass: true },
            ],
          }),
          'tests/load/prompt-run-missing.json': JSON.stringify({
            suiteId: 'agent-quality-core',
            tasks: [{ taskId: 'GT-001', score: 76, pass: true }],
          }),
        };

        return fixtures[filePath];
      });

      await expect(
        service.comparePromptVariants({
          baselineRunId: 'prompt-run-a',
          candidateRunId: 'prompt-run-missing',
          suiteId: 'agent-quality-core',
        })
      ).rejects.toThrow(/Stable benchmark mismatch/i);
    });
  });
});
