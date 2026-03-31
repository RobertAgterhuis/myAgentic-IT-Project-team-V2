// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Pattern Analysis Service Implementation — M5-E1 / Issue #1402
 *
 * Implements analysis of execution outcomes to identify successful patterns
 * and generate recommendations for team composition and agent sequencing.
 */

import type { AgentExecutionOutcome } from '../../../platform/services/outcome-tracking';
import type {
  IPatternAnalysisService,
  PairAnalysis,
  TeamPattern,
  TaskTypePattern,
  TimelinePattern,
  ConflictPattern,
  PatternAnalysisReport,
  RecommendationCandidate,
  RecommendationRefinementResult,
} from '../../../platform/services/pattern-analysis';
import {
  MIN_SAMPLE_SIZE,
  getConfidence,
  getConfidenceScore,
} from '../../../platform/services/pattern-analysis';

/**
 * PatternAnalysisService — Analyzes execution outcomes to find patterns
 */
export class PatternAnalysisService implements IPatternAnalysisService {
  private clampScore(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  /**
   * Analyze all agent pair sequences
   */
  analyzePairs(outcomes: AgentExecutionOutcome[]): PairAnalysis[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pairMap: Map<string, any> = new Map();

    // Group outcomes by session and phase to find agent sequences
    const sessionMap: Map<string, { outcomes: AgentExecutionOutcome[]; sessionId: string }> =
      new Map();

    for (const outcome of outcomes) {
      const key = outcome.sessionId;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, { outcomes: [], sessionId: key });
      }
      sessionMap.get(key)!.outcomes.push(outcome);
    }

    // Analyze transitions
    for (const [, session] of sessionMap) {
      const sorted = session.outcomes.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const agentA = sorted[i].agentId;
        const agentB = sorted[i + 1].agentId;
        const pairKey = `${agentA}→${agentB}`;

        if (!pairMap.has(pairKey)) {
          pairMap.set(pairKey, {
            agentA,
            agentB,
            label: pairKey,
            totalSequences: 0,
            successCount: 0,
            qualityScores: [] as number[],
            blockers: {} as Record<string, number>,
            sessions: [] as string[],
          });
        }

        const pair = pairMap.get(pairKey)!;
        pair.totalSequences++;
        if (
          sorted[i].nextAgentSucceeded !== false &&
          sorted[i + 1].completionStatus === 'SUCCESS'
        ) {
          pair.successCount++;
        }
        if (sorted[i].qualityScore !== undefined) {
          pair.qualityScores.push(sorted[i].qualityScore);
        }
        for (const blocker of sorted[i].blockers) {
          pair.blockers[blocker] = (pair.blockers[blocker] || 0) + 1;
        }
        pair.sessions.push(session.sessionId);
      }
    }

    // Convert to analysis objects
    return Array.from(pairMap.values()).map((pair) => ({
      agentA: pair.agentA,
      agentB: pair.agentB,
      label: pair.label,
      totalSequences: pair.totalSequences,
      successCount: pair.successCount,
      successRate: pair.totalSequences > 0 ? pair.successCount / pair.totalSequences : 0,
      avgQualityScore:
        pair.qualityScores.length > 0
          ? pair.qualityScores.reduce((a: number, b: number) => a + b, 0) /
            pair.qualityScores.length
          : undefined,
      commonBlockers: Object.entries(pair.blockers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((e) => e[0]),
      sampleSessions: pair.sessions.slice(-3),
    }));
  }

  /**
   * Analyze team composition success patterns
   */
  analyzeTeams(outcomes: AgentExecutionOutcome[]): TeamPattern[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamMap: Map<string, any> = new Map();

    // Group outcomes by team
    for (const outcome of outcomes) {
      if (outcome.teamId) {
        const teamKey = outcome.teamId;
        if (!teamMap.has(teamKey)) {
          teamMap.set(teamKey, {
            teamId: outcome.teamId,
            teamName: outcome.teamId, // Would come from team registry
            agents: [] as string[],
            totalExecutions: 0,
            successCount: 0,
            qualityScores: [] as number[],
            taskTypes: {} as Record<string, { count: number; success: number }>,
          });
        }

        const team = teamMap.get(teamKey)!;
        team.totalExecutions++;
        if (outcome.completionStatus === 'SUCCESS') {
          team.successCount++;
        }
        if (outcome.qualityScore !== undefined) {
          team.qualityScores.push(outcome.qualityScore);
        }

        const taskType = outcome.taskDefinition.type;
        if (!team.taskTypes[taskType]) {
          team.taskTypes[taskType] = { count: 0, success: 0 };
        }
        team.taskTypes[taskType].count++;
        if (outcome.completionStatus === 'SUCCESS') {
          team.taskTypes[taskType].success++;
        }
      }
    }

    return Array.from(teamMap.values()).map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      agents: team.agents,
      agentSequence: team.agents.join('→') || 'unknown',
      totalExecutions: team.totalExecutions,
      successCount: team.successCount,
      successRate: team.totalExecutions > 0 ? team.successCount / team.totalExecutions : 0,
      avgQualityScore:
        team.qualityScores.length > 0
          ? team.qualityScores.reduce((a: number, b: number) => a + b, 0) /
            team.qualityScores.length
          : undefined,
      taskTypes: Object.entries(team.taskTypes).map(([type, stats]) => ({
        type,
        count: stats.count,
        successRate: stats.count > 0 ? stats.success / stats.count : 0,
      })),
    }));
  }

  /**
   * Analyze task type to team/agent patterns
   */
  analyzeTaskTypePatterns(outcomes: AgentExecutionOutcome[]): TaskTypePattern[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskMap: Map<string, any> = new Map();

    for (const outcome of outcomes) {
      const taskType = outcome.taskDefinition.type;
      if (!taskMap.has(taskType)) {
        taskMap.set(taskType, {
          taskType,
          domainCategory: outcome.taskDefinition.category,
          totalExecutions: 0,
          successCount: 0,
          teams: {} as Record<string, { count: number; success: number }>,
          agents: {} as Record<string, { count: number; success: number }>,
        });
      }

      const task = taskMap.get(taskType)!;
      task.totalExecutions++;
      if (outcome.completionStatus === 'SUCCESS') {
        task.successCount++;
      }

      if (outcome.teamId) {
        if (!task.teams[outcome.teamId]) {
          task.teams[outcome.teamId] = { count: 0, success: 0 };
        }
        task.teams[outcome.teamId].count++;
        if (outcome.completionStatus === 'SUCCESS') {
          task.teams[outcome.teamId].success++;
        }
      }

      if (!task.agents[outcome.agentId]) {
        task.agents[outcome.agentId] = { count: 0, success: 0 };
      }
      task.agents[outcome.agentId].count++;
      if (outcome.completionStatus === 'SUCCESS') {
        task.agents[outcome.agentId].success++;
      }
    }

    return Array.from(taskMap.values()).map((task) => ({
      taskType: task.taskType,
      domainCategory: task.domainCategory,
      totalExecutions: task.totalExecutions,
      successRate: task.totalExecutions > 0 ? task.successCount / task.totalExecutions : 0,
      topTeams: Object.entries(task.teams)
        .filter((e) => e[1].count >= MIN_SAMPLE_SIZE)
        .map(([teamId, stats]) => ({
          teamId,
          teamName: teamId,
          successRate: stats.success / stats.count,
          confidence: getConfidenceScore(getConfidence(stats.count)),
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5),
      topAgents: Object.entries(task.agents)
        .filter((e) => e[1].count >= MIN_SAMPLE_SIZE)
        .map(([agentId, stats]) => ({
          agentId,
          agentName: agentId,
          successRate: stats.success / stats.count,
          confidence: getConfidenceScore(getConfidence(stats.count)),
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5),
    }));
  }

  /**
   * Analyze timeline accuracy patterns
   */
  analyzeTimelinePatterns(outcomes: AgentExecutionOutcome[]): TimelinePattern[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentMap: Map<string, any> = new Map();

    for (const outcome of outcomes) {
      const agentId = outcome.agentId;
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId,
          agentName: outcome.agentName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          estimates: [] as any[],
          underestimates: [] as string[],
          overestimates: [] as string[],
        });
      }

      const agent = agentMap.get(agentId)!;
      if (outcome.estimatedTimeMs && outcome.timelineAccuracy !== undefined) {
        agent.estimates.push({
          taskId: outcome.taskId,
          accuracy: outcome.timelineAccuracy,
        });

        if (outcome.timelineAccuracy > 1.2) {
          agent.underestimates.push(outcome.taskId);
        } else if (outcome.timelineAccuracy < 0.8) {
          agent.overestimates.push(outcome.taskId);
        }
      }
    }

    return Array.from(agentMap.values()).map((agent) => {
      const estimates = agent.estimates;
      const avgAccuracy =
        estimates.length > 0
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            estimates.reduce((sum: number, e: any) => sum + e.accuracy, 0) / estimates.length
          : 1.0;

      // Determine trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (estimates.length >= 5) {
        const first5 =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          estimates.slice(0, 5).reduce((sum: number, e: any) => sum + e.accuracy, 0) / 5;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const last5 = estimates.slice(-5).reduce((sum: number, e: any) => sum + e.accuracy, 0) / 5;
        if (last5 < first5 * 0.9) trend = 'improving';
        else if (last5 > first5 * 1.1) trend = 'declining';
      }

      return {
        agentId: agent.agentId,
        agentName: agent.agentName,
        estimatesCount: estimates.length,
        avgAccuracy,
        underestimators: agent.underestimates,
        overestimators: agent.overestimates,
        accuracyTrend: trend,
      };
    });
  }

  /**
   * Analyze conflict patterns between agents
   */
  analyzeConflictPatterns(outcomes: AgentExecutionOutcome[]): ConflictPattern[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conflictMap: Map<string, any> = new Map();

    // Find triplets: agentA -> agentB -> agentC where B's output conflicts with C's success
    for (let i = 0; i < outcomes.length - 2; i++) {
      if (
        outcomes[i].sessionId === outcomes[i + 1].sessionId &&
        outcomes[i + 1].sessionId === outcomes[i + 2].sessionId
      ) {
        const agentA = outcomes[i].agentId;
        const agentB = outcomes[i + 1].agentId;
        const agentC = outcomes[i + 2].agentId;
        const conflictKey = `${agentA}→${agentB}→${agentC}`;

        if (!conflictMap.has(conflictKey)) {
          conflictMap.set(conflictKey, {
            agentA,
            agentB,
            subsequentAgentId: agentC,
            conflicts: 0,
            rejections: 0,
            reasons: {} as Record<string, number>,
          });
        }

        const pattern = conflictMap.get(conflictKey)!;
        pattern.conflicts++;

        // Check if B's output caused issues for C
        if (!outcomes[i + 1].nextAgentSucceeded || outcomes[i + 2].completionStatus !== 'SUCCESS') {
          pattern.rejections++;
          if (outcomes[i + 2].blockers.length > 0) {
            for (const blocker of outcomes[i + 2].blockers) {
              pattern.reasons[blocker] = (pattern.reasons[blocker] || 0) + 1;
            }
          }
        }
      }
    }

    return Array.from(conflictMap.values())
      .map((pattern) => ({
        agentA: pattern.agentA,
        agentB: pattern.agentB,
        subsequentAgentId: pattern.subsequentAgentId,
        conflicts: pattern.conflicts,
        rejectionRate: pattern.conflicts > 0 ? pattern.rejections / pattern.conflicts : 0,
        commonReasons: Object.entries(pattern.reasons)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((e) => e[0]),
        recommendation: (function () {
          const rate = pattern.conflicts > 0 ? pattern.rejections / pattern.conflicts : 0;
          if (rate >= 0.5) return 'AVOID';
          if (rate >= 0.2) return 'RISKY';
          return 'SAFE';
        })(),
      }))
      .sort((a, b) => b.rejectionRate - a.rejectionRate);
  }

  /**
   * Generate complete pattern analysis report
   */
  generateReport(outcomes: AgentExecutionOutcome[]): PatternAnalysisReport {
    const pairs = this.analyzePairs(outcomes);
    const teams = this.analyzeTeams(outcomes);
    const tasks = this.analyzeTaskTypePatterns(outcomes);
    const timelines = this.analyzeTimelinePatterns(outcomes);
    const conflicts = this.analyzeConflictPatterns(outcomes);

    const bestPair =
      pairs.length > 0 ? pairs.reduce((a, b) => (a.successRate > b.successRate ? a : b)) : null;

    const worstPair =
      pairs.length > 0
        ? pairs
            .filter((p) => p.totalSequences >= MIN_SAMPLE_SIZE)
            .reduce((a, b) => (a.successRate < b.successRate ? a : b), bestPair)
        : null;

    const bestTeam =
      teams.length > 0 ? teams.reduce((a, b) => (a.successRate > b.successRate ? a : b)) : null;

    const mostConflictual = conflicts.length > 0 ? conflicts[0] : null;

    const improvementAreas: string[] = [];
    if (worstPair && worstPair.successRate < 0.6) {
      improvementAreas.push(
        `Improve pair ${worstPair.agentA} → ${worstPair.agentB} (${(worstPair.successRate * 100).toFixed(0)}% success)`
      );
    }

    const underperformingAgents = timelines.filter((t) => t.avgAccuracy > 1.5);
    if (underperformingAgents.length > 0) {
      improvementAreas.push(
        `Timeline estimation: ${underperformingAgents.map((a) => a.agentName).join(', ')} tend to underestimate`
      );
    }

    if (mostConflictual && mostConflictual.rejectionRate > 0.3) {
      improvementAreas.push(
        `Conflict: ${mostConflictual.agentA} → ${mostConflictual.agentB} frequently conflicts with ${mostConflictual.subsequentAgentId}`
      );
    }

    const dateRange =
      outcomes.length > 0
        ? {
            startDate: outcomes.reduce((a, b) =>
              new Date(a.timestamp) < new Date(b.timestamp) ? a : b
            ).timestamp,
            endDate: outcomes.reduce((a, b) =>
              new Date(a.timestamp) > new Date(b.timestamp) ? a : b
            ).timestamp,
          }
        : { startDate: new Date().toISOString(), endDate: new Date().toISOString() };

    return {
      generatedAt: new Date().toISOString(),
      analysisWindow: {
        ...dateRange,
        totalOutcomes: outcomes.length,
      },
      pairAnalyses: pairs,
      teamPatterns: teams,
      taskTypePatterns: tasks,
      timelinePatterns: timelines,
      conflictPatterns: conflicts,
      insights: {
        bestPair,
        worstPair,
        bestTeam,
        mostConflictual,
        improvementAreas,
      },
    };
  }

  /**
   * Refine recommendation scores using historical outcomes and compare to baseline
   */
  refineRecommendations(
    outcomes: AgentExecutionOutcome[],
    candidates: RecommendationCandidate[]
  ): RecommendationRefinementResult {
    const taskPatterns = this.analyzeTaskTypePatterns(outcomes);
    const teamPatterns = this.analyzeTeams(outcomes);

    const recommendations = candidates.map((candidate) => {
      const baselineScore = this.clampScore(candidate.baselineScore);
      const taskPattern = taskPatterns.find((p) => p.taskType === candidate.taskType);
      const taskTeam = taskPattern?.topTeams.find((t) => t.teamId === candidate.teamId);
      const teamPattern = teamPatterns.find((t) => t.teamId === candidate.teamId);

      // Prefer task-specific historical score; fallback to overall team score; neutral fallback.
      const historicalScore = this.clampScore(
        taskTeam?.successRate ?? teamPattern?.successRate ?? baselineScore
      );
      const confidence = this.clampScore(taskTeam?.confidence ?? 0.3);

      // Weighted uplift: history influences score, but baseline still contributes.
      const refinementWeight = 0.35 + confidence * 0.45;
      const refinedScore = this.clampScore(
        baselineScore * (1 - refinementWeight) + historicalScore * refinementWeight
      );
      const uplift = Number((refinedScore - baselineScore).toFixed(4));

      let reason = 'No historical match; baseline retained';
      if (taskTeam) {
        reason = `Task-specific historical success ${(historicalScore * 100).toFixed(1)}% with confidence ${confidence.toFixed(2)}`;
      } else if (teamPattern) {
        reason = `Overall team historical success ${(historicalScore * 100).toFixed(1)}%`;
      }

      return {
        teamId: candidate.teamId,
        taskType: candidate.taskType,
        baselineScore,
        historicalScore,
        confidence,
        refinedScore,
        uplift,
        reason,
      };
    });

    const baselineAverage =
      recommendations.length > 0
        ? recommendations.reduce((sum, r) => sum + r.baselineScore, 0) / recommendations.length
        : 0;
    const refinedAverage =
      recommendations.length > 0
        ? recommendations.reduce((sum, r) => sum + r.refinedScore, 0) / recommendations.length
        : 0;

    return {
      generatedAt: new Date().toISOString(),
      candidatesEvaluated: recommendations.length,
      baselineAverage,
      refinedAverage,
      averageUplift: refinedAverage - baselineAverage,
      recommendations: recommendations.sort((a, b) => b.refinedScore - a.refinedScore),
    };
  }

  /**
   * Get specific pattern
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPattern(_type: 'pair' | 'team' | 'task' | 'timeline', _key: string): any {
    // Would be implemented with actual backend query
    return null;
  }

  /**
   * Recommendation engine
   */
  shouldRecommend(
    _type: 'pair' | 'team',
    _key: string
  ): { recommend: boolean; confidence: number; reason: string } {
    // Would be implemented with actual pattern lookup
    return {
      recommend: true,
      confidence: 0.5,
      reason: 'Pattern not found in current analysis',
    };
  }
}
