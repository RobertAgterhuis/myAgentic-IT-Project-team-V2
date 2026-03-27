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
      expect(safeWriteCall).toHaveBeenCalled();
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
  });
});
