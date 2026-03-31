import { describe, it, expect, beforeEach } from 'vitest';
import { PatternAnalysisService } from '../../src/webapp/services/pattern-analysis-service';

describe('PatternAnalysisService', () => {
  let svc;

  beforeEach(() => {
    svc = new PatternAnalysisService();
  });

  const createOutcome = (overrides) => ({
    outcomeid: 'outcome-' + Math.random(),
    sessionId: 'sess-1',
    taskId: 'task-1',
    agentId: 'agent-1',
    agentName: 'Test Agent',
    teamId: undefined,
    phaseNumber: 1,
    phaseName: 'PHASE_1',
    executionMode: 'SDLC_ONLY',
    timestamp: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    taskDefinition: {
      type: 'FEATURE',
      complexity: 'MEDIUM',
    },
    predecessorOutputs: [],
    inputDataSize: 1000,
    deliverables: {
      count: 1,
      paths: ['/output.md'],
      totalSize: 5000,
      types: ['markdown'],
    },
    executionTimeMs: 30000,
    completionStatus: 'SUCCESS',
    blockers: [],
    needsHumanReview: false,
    ...overrides,
  });

  describe('analyzePairs', () => {
    it('should return empty array for empty outcomes', () => {
      const pairs = svc.analyzePairs([]);
      expect(pairs).toEqual([]);
    });

    it('should identify agent pairs in sequence', () => {
      const outcomes = [
        createOutcome({ agentId: 'agent-1', sessionId: 'sess-1', phaseNumber: 1 }),
        createOutcome({ agentId: 'agent-2', sessionId: 'sess-1', phaseNumber: 2 }),
      ];

      const pairs = svc.analyzePairs(outcomes);
      expect(pairs.length).toBe(1);
      expect(pairs[0].agentA).toBe('agent-1');
      expect(pairs[0].agentB).toBe('agent-2');
    });

    it('should calculate success rate for pairs', () => {
      const outcomes = [
        createOutcome({
          agentId: 'agent-1',
          sessionId: 'sess-1',
          phaseNumber: 1,
          completionStatus: 'SUCCESS',
          nextAgentSucceeded: true,
        }),
        createOutcome({
          agentId: 'agent-2',
          sessionId: 'sess-1',
          phaseNumber: 2,
          completionStatus: 'SUCCESS',
        }),
        createOutcome({
          agentId: 'agent-1',
          sessionId: 'sess-2',
          phaseNumber: 1,
          completionStatus: 'FAILED',
        }),
        createOutcome({
          agentId: 'agent-2',
          sessionId: 'sess-2',
          phaseNumber: 2,
          completionStatus: 'FAILED',
        }),
      ];

      const pairs = svc.analyzePairs(outcomes);
      const pair = pairs.find((p) => p.agentA === 'agent-1' && p.agentB === 'agent-2');
      expect(pair).toBeDefined();
      expect(pair.totalSequences).toBe(2);
      expect(pair.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeTeams', () => {
    it('should identify team compositions', () => {
      const outcomes = [
        createOutcome({ teamId: 'team-1', agentId: 'agent-1' }),
        createOutcome({ teamId: 'team-1', agentId: 'agent-2' }),
      ];

      const teams = svc.analyzeTeams(outcomes);
      expect(teams.length).toBeGreaterThan(0);
    });

    it('should calculate team success rates', () => {
      const outcomes = [
        createOutcome({ teamId: 'team-1', completionStatus: 'SUCCESS' }),
        createOutcome({ teamId: 'team-1', completionStatus: 'SUCCESS' }),
        createOutcome({ teamId: 'team-1', completionStatus: 'FAILED' }),
      ];

      const teams = svc.analyzeTeams(outcomes);
      const team = teams[0];
      expect(team.totalExecutions).toBe(3);
      expect(team.successCount).toBe(2);
      expect(team.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('analyzeTaskTypePatterns', () => {
    it('should group outcomes by task type', () => {
      const outcomes = [
        createOutcome({ taskDefinition: { type: 'FEATURE', complexity: 'MEDIUM' } }),
        createOutcome({ taskDefinition: { type: 'BUG_FIX', complexity: 'LOW' } }),
        createOutcome({ taskDefinition: { type: 'FEATURE', complexity: 'HIGH' } }),
      ];

      const patterns = svc.analyzeTaskTypePatterns(outcomes);
      const types = patterns.map((p) => p.taskType).sort();
      expect(types).toContain('BUG_FIX');
      expect(types).toContain('FEATURE');
    });

    it('should identify top agents per task type', () => {
      const outcomes = Array(10)
        .fill(null)
        .map((_, i) =>
          createOutcome({
            agentId: i < 5 ? 'agent-1' : 'agent-2',
            taskDefinition: { type: 'FEATURE', complexity: 'MEDIUM' },
            completionStatus: i < 6 ? 'SUCCESS' : 'FAILED',
          })
        );

      const patterns = svc.analyzeTaskTypePatterns(outcomes);
      const feature = patterns.find((p) => p.taskType === 'FEATURE');
      expect(feature).toBeDefined();
      expect(feature && feature.topAgents.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeTimelinePatterns', () => {
    it('should calculate timeline accuracy', () => {
      const outcomes = [
        createOutcome({
          agentId: 'agent-1',
          estimatedTimeMs: 30000,
          executionTimeMs: 30000,
          timelineAccuracy: 1.0,
        }),
        createOutcome({
          agentId: 'agent-1',
          estimatedTimeMs: 20000,
          executionTimeMs: 40000,
          timelineAccuracy: 2.0,
        }),
      ];

      const patterns = svc.analyzeTimelinePatterns(outcomes);
      const agent = patterns[0];
      expect(agent.estimatesCount).toBe(2);
      expect(agent.avgAccuracy).toBeCloseTo(1.5, 1);
    });

    it('should identify under and overestimators', () => {
      const outcomes = [
        createOutcome({
          agentId: 'agent-1',
          taskId: 'task-1',
          estimatedTimeMs: 10000,
          executionTimeMs: 50000,
          timelineAccuracy: 5.0,
        }),
        createOutcome({
          agentId: 'agent-1',
          taskId: 'task-2',
          estimatedTimeMs: 50000,
          executionTimeMs: 10000,
          timelineAccuracy: 0.2,
        }),
      ];

      const patterns = svc.analyzeTimelinePatterns(outcomes);
      const agent = patterns[0];
      expect(agent.underestimators).toContain('task-1');
      expect(agent.overestimators).toContain('task-2');
    });
  });

  describe('analyzeConflictPatterns', () => {
    it('should identify conflict patterns', () => {
      const outcomes = [
        createOutcome({
          sessionId: 'sess-1',
          agentId: 'agent-1',
          phaseNumber: 1,
          nextAgentSucceeded: true,
        }),
        createOutcome({
          sessionId: 'sess-1',
          agentId: 'agent-2',
          phaseNumber: 2,
          nextAgentSucceeded: false,
        }),
        createOutcome({
          sessionId: 'sess-1',
          agentId: 'agent-3',
          phaseNumber: 3,
          completionStatus: 'FAILED',
        }),
      ];

      const conflicts = svc.analyzeConflictPatterns(outcomes);
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    it('should generate complete analysis report', () => {
      const outcomes = [
        createOutcome({ agentId: 'agent-1', sessionId: 'sess-1' }),
        createOutcome({ agentId: 'agent-2', sessionId: 'sess-1' }),
      ];

      const report = svc.generateReport(outcomes);
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('pairAnalyses');
      expect(report).toHaveProperty('teamPatterns');
      expect(report).toHaveProperty('taskTypePatterns');
      expect(report).toHaveProperty('timelinePatterns');
      expect(report).toHaveProperty('conflictPatterns');
      expect(report).toHaveProperty('insights');
      expect(report.analysisWindow.totalOutcomes).toBe(2);
    });
  });

  describe('refineRecommendations', () => {
    it('should uplift scores for teams with strong task-specific history', () => {
      const outcomes = Array(10)
        .fill(null)
        .map((_, i) =>
          createOutcome({
            teamId: 'team-strong',
            taskDefinition: { type: 'FEATURE', complexity: 'MEDIUM' },
            completionStatus: i < 9 ? 'SUCCESS' : 'FAILED',
          })
        );

      const result = svc.refineRecommendations(outcomes, [
        { teamId: 'team-strong', taskType: 'FEATURE', baselineScore: 0.55 },
      ]);

      expect(result.candidatesEvaluated).toBe(1);
      expect(result.recommendations[0].refinedScore).toBeGreaterThan(0.55);
      expect(result.averageUplift).toBeGreaterThan(0);
    });

    it('should penalize scores for weak historical performance', () => {
      const outcomes = Array(10)
        .fill(null)
        .map((_, i) =>
          createOutcome({
            teamId: 'team-weak',
            taskDefinition: { type: 'BUG_FIX', complexity: 'LOW' },
            completionStatus: i < 2 ? 'SUCCESS' : 'FAILED',
          })
        );

      const result = svc.refineRecommendations(outcomes, [
        { teamId: 'team-weak', taskType: 'BUG_FIX', baselineScore: 0.65 },
      ]);

      expect(result.recommendations[0].refinedScore).toBeLessThan(0.65);
      expect(result.recommendations[0].uplift).toBeLessThan(0);
    });

    it('should return baseline comparison metrics', () => {
      const outcomes = [
        createOutcome({
          teamId: 'team-a',
          taskDefinition: { type: 'FEATURE', complexity: 'MEDIUM' },
          completionStatus: 'SUCCESS',
        }),
      ];

      const result = svc.refineRecommendations(outcomes, [
        { teamId: 'team-a', taskType: 'FEATURE', baselineScore: 0.5 },
        { teamId: 'team-b', taskType: 'FEATURE', baselineScore: 0.5 },
      ]);

      expect(result).toHaveProperty('baselineAverage');
      expect(result).toHaveProperty('refinedAverage');
      expect(result).toHaveProperty('averageUplift');
      expect(result.recommendations.length).toBe(2);
    });
  });
});
