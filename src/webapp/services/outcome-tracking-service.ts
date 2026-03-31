// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Outcome Tracking Service Implementation — M5-E1 / Issue #1401
 *
 * Implements storage, validation, and aggregation of agent execution outcomes.
 * Storage uses JSON Lines format for efficient streaming and queries.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import type { ServiceContext } from './types';
import type {
  AgentExecutionOutcome,
  TeamComposition,
  CriticFeedback,
  OutcomeAggregation,
  IOutcomeTrackingService,
} from '../../../platform/services/outcome-tracking';
import { OUTCOME_VALIDATION_RULES } from '../../../platform/services/outcome-tracking';

/**
 * OutcomeTrackingService — Records and queries agent execution outcomes
 */
export class OutcomeTrackingService implements IOutcomeTrackingService {
  private outcomesLogPath: string;
  private teamCompositionsPath: string;
  private criticFeedbackPath: string;
  private aggregationsPath: string;
  private svc: ServiceContext;

  constructor(svc: ServiceContext) {
    this.svc = svc;
    const learningDir = join(svc.businessDocs, 'learning');
    this.outcomesLogPath = join(learningDir, 'outcomes-log.jsonl');
    this.teamCompositionsPath = join(learningDir, 'team-compositions.json');
    this.criticFeedbackPath = join(learningDir, 'critic-feedback.jsonl');
    this.aggregationsPath = join(learningDir, 'aggregations.json');

    // Ensure learning directory exists
    if (!existsSync(learningDir)) {
      mkdirSync(learningDir, { recursive: true });
    }
  }

  /**
   * Validate outcome against schema
   */
  private validateOutcome(outcome: AgentExecutionOutcome): string[] {
    const errors: string[] = [];

    // Check required fields
    for (const field of OUTCOME_VALIDATION_RULES.requiredFields) {
      if (!(field in outcome) || (outcome as any)[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate numeric ranges
    for (const [field, range] of Object.entries(OUTCOME_VALIDATION_RULES.numericRanges)) {
      const value = (outcome as any)[field];
      if (value !== undefined) {
        if (typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        } else if (value < range.min || value > range.max) {
          errors.push(`${field} must be between ${range.min} and ${range.max}, got ${value}`);
        }
      }
    }

    // Validate enums
    for (const [field, allowedValues] of Object.entries(OUTCOME_VALIDATION_RULES.enums)) {
      const value = (outcome as any)[field];
      if (value !== undefined && !allowedValues.includes(value)) {
        errors.push(`${field} must be one of ${allowedValues.join(', ')}, got ${value}`);
      }
    }

    return errors;
  }

  /**
   * Record a new agent execution outcome
   */
  async recordOutcome(outcome: Omit<AgentExecutionOutcome, 'outcomeid'>): Promise<string> {
    const outcomeid = randomUUID();
    const withId: AgentExecutionOutcome = {
      ...outcome,
      outcomeid,
    };

    const errors = this.validateOutcome(withId);
    if (errors.length > 0) {
      throw new Error(`Outcome validation failed:\n${errors.join('\n')}`);
    }

    try {
      appendFileSync(this.outcomesLogPath, JSON.stringify(withId) + '\n', { encoding: 'utf-8' });

      this.svc.audit.log({
        operation: 'OUTCOME_RECORDED',
        entityType: 'AgentExecutionOutcome',
        entityId: outcomeid,
        summary: `Recorded outcome for agent ${outcome.agentId} in session ${outcome.sessionId}`,
      });

      return outcomeid;
    } catch (err) {
      throw new Error(`Failed to record outcome: ${String(err)}`);
    }
  }

  /**
   * Record Critic feedback
   */
  async recordCriticFeedback(feedback: CriticFeedback): Promise<void> {
    try {
      appendFileSync(this.criticFeedbackPath, JSON.stringify(feedback) + '\n', {
        encoding: 'utf-8',
      });

      this.svc.audit.log({
        operation: 'CRITIC_FEEDBACK_RECORDED',
        entityType: 'CriticFeedback',
        entityId: feedback.outcomeid,
        summary: `Critic gate ${feedback.passed ? 'PASSED' : 'FAILED'} for outcome ${feedback.outcomeid}`,
      });
    } catch (err) {
      throw new Error(`Failed to record critic feedback: ${String(err)}`);
    }
  }

  /**
   * Record a team composition
   */
  async recordTeamComposition(team: TeamComposition): Promise<void> {
    try {
      let compositions: TeamComposition[] = [];
      if (existsSync(this.teamCompositionsPath)) {
        const raw = readFileSync(this.teamCompositionsPath, 'utf-8');
        compositions = JSON.parse(raw);
      }

      // Update existing or add new
      const idx = compositions.findIndex((t) => t.teamId === team.teamId);
      if (idx >= 0) {
        compositions[idx] = { ...compositions[idx], ...team };
      } else {
        compositions.push(team);
      }

      writeFileSync(this.teamCompositionsPath, JSON.stringify(compositions, null, 2), {
        encoding: 'utf-8',
      });

      this.svc.audit.log({
        operation: 'TEAM_COMPOSITION_RECORDED',
        entityType: 'TeamComposition',
        entityId: team.teamId,
        summary: `Recorded team ${team.teamName}: ${team.agents.map((a) => a.agentName).join(' → ')}`,
      });
    } catch (err) {
      throw new Error(`Failed to record team composition: ${String(err)}`);
    }
  }

  /**
   * Query outcomes by filters
   */
  async queryOutcomes(filters: {
    sessionId?: string;
    agentId?: string;
    teamId?: string;
    taskType?: string;
    executionMode?: string;
    completionStatus?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<AgentExecutionOutcome[]> {
    try {
      if (!existsSync(this.outcomesLogPath)) {
        return [];
      }

      const lines = readFileSync(this.outcomesLogPath, 'utf-8')
        .split('\n')
        .filter((line) => line.trim().length > 0);

      let outcomes: AgentExecutionOutcome[] = lines.map((line) => JSON.parse(line));

      // Apply filters
      if (filters.sessionId) {
        outcomes = outcomes.filter((o) => o.sessionId === filters.sessionId);
      }
      if (filters.agentId) {
        outcomes = outcomes.filter((o) => o.agentId === filters.agentId);
      }
      if (filters.teamId) {
        outcomes = outcomes.filter((o) => o.teamId === filters.teamId);
      }
      if (filters.taskType) {
        outcomes = outcomes.filter((o) => o.taskDefinition.type === filters.taskType);
      }
      if (filters.executionMode) {
        outcomes = outcomes.filter((o) => o.executionMode === filters.executionMode);
      }
      if (filters.completionStatus) {
        outcomes = outcomes.filter((o) => o.completionStatus === filters.completionStatus);
      }
      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start).getTime();
        const end = new Date(filters.dateRange.end).getTime();
        outcomes = outcomes.filter((o) => {
          const ts = new Date(o.timestamp).getTime();
          return ts >= start && ts <= end;
        });
      }

      // Sort by timestamp descending, apply limit
      outcomes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (filters.limit) {
        outcomes = outcomes.slice(0, filters.limit);
      }

      return outcomes;
    } catch (err) {
      throw new Error(`Failed to query outcomes: ${String(err)}`);
    }
  }

  /**
   * Compute aggregations across outcomes
   */
  async computeAggregations(timeWindowDays: number = 90): Promise<OutcomeAggregation> {
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - timeWindowDays);

    const outcomes = await this.queryOutcomes({
      dateRange: {
        start: cutoffTime.toISOString(),
        end: new Date().toISOString(),
      },
    });

    const agentMetrics: Record<string, any> = {};

    // Build agent metrics
    for (const outcome of outcomes) {
      const agentId = outcome.agentId;
      if (!agentMetrics[agentId]) {
        agentMetrics[agentId] = {
          agentId,
          agentName: outcome.agentName,
          totalExecutions: 0,
          successCount: 0,
          qualityScores: [] as number[],
          confidenceLevels: [] as number[],
          executionTimes: [] as number[],
          timelineAccuracies: [] as number[],
          blockers: {} as Record<string, number>,
          followOns: {} as Record<string, { total: number; success: number }>,
        };
      }

      const stats = agentMetrics[agentId];
      stats.totalExecutions++;
      if (outcome.completionStatus === 'SUCCESS') {
        stats.successCount++;
      }
      if (outcome.qualityScore !== undefined) {
        stats.qualityScores.push(outcome.qualityScore);
      }
      if (outcome.confidenceLevel !== undefined) {
        stats.confidenceLevels.push(outcome.confidenceLevel);
      }
      stats.executionTimes.push(outcome.executionTimeMs);
      if (outcome.timelineAccuracy !== undefined) {
        stats.timelineAccuracies.push(outcome.timelineAccuracy);
      }

      // Track blockers
      for (const blocker of outcome.blockers) {
        stats.blockers[blocker] = (stats.blockers[blocker] || 0) + 1;
      }
    }

    // Compute final agent metrics
    const finalAgentMetrics: Record<string, any> = {};
    for (const [agentId, stats] of Object.entries(agentMetrics)) {
      finalAgentMetrics[agentId] = {
        agentId: stats.agentId,
        agentName: stats.agentName,
        totalExecutions: stats.totalExecutions,
        successCount: stats.successCount,
        successRate: stats.successCount / stats.totalExecutions,
        avgQualityScore:
          stats.qualityScores.length > 0
            ? stats.qualityScores.reduce((a: number, b: number) => a + b, 0) /
              stats.qualityScores.length
            : undefined,
        avgConfidence:
          stats.confidenceLevels.length > 0
            ? stats.confidenceLevels.reduce((a: number, b: number) => a + b, 0) /
              stats.confidenceLevels.length
            : undefined,
        avgExecutionTimeMs:
          stats.executionTimes.reduce((a: number, b: number) => a + b, 0) /
          stats.executionTimes.length,
        avgTimelineAccuracy:
          stats.timelineAccuracies.length > 0
            ? stats.timelineAccuracies.reduce((a: number, b: number) => a + b, 0) /
              stats.timelineAccuracies.length
            : undefined,
        mostCommonBlockers: Object.entries(stats.blockers)
          .map(([blocker, frequency]) => ({ blocker, frequency }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 5),
      };
    }

    return {
      agentMetrics: finalAgentMetrics,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get success rate for a specific agent pair
   */
  async getPairSuccessRate(agentA: string, agentB: string): Promise<number> {
    const outcomes = await this.queryOutcomes({});
    let successCount = 0;
    let totalCount = 0;

    for (let i = 0; i < outcomes.length - 1; i++) {
      if (
        outcomes[i].agentId === agentA &&
        outcomes[i + 1].agentId === agentB &&
        outcomes[i].sessionId === outcomes[i + 1].sessionId
      ) {
        totalCount++;
        if (outcomes[i].nextAgentSucceeded) {
          successCount++;
        }
      }
    }

    return totalCount > 0 ? successCount / totalCount : 0;
  }

  /**
   * Get top-performing team compositions for a task type
   */
  async getTopTeamsForTaskType(
    taskType: string,
    limit: number = 5
  ): Promise<Array<{ teamId: string; successRate: number; agents: string[] }>> {
    const outcomes = await this.queryOutcomes({
      taskType,
    });

    const teamStats: Record<
      string,
      { teamId: string; agents: string[]; successCount: number; total: number }
    > = {};

    for (const outcome of outcomes) {
      if (outcome.teamId) {
        if (!teamStats[outcome.teamId]) {
          teamStats[outcome.teamId] = {
            teamId: outcome.teamId,
            agents: [],
            successCount: 0,
            total: 0,
          };
        }

        teamStats[outcome.teamId].total++;
        if (outcome.completionStatus === 'SUCCESS') {
          teamStats[outcome.teamId].successCount++;
        }
      }
    }

    return Object.values(teamStats)
      .map((t) => ({
        ...t,
        successRate: t.total > 0 ? t.successCount / t.total : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get timeline accuracy stats for an agent
   */
  async getTimelineAccuracyStats(agentId: string): Promise<any> {
    const outcomes = await this.queryOutcomes({
      agentId,
    });

    const accuracies = outcomes
      .filter((o) => o.timelineAccuracy !== undefined)
      .map((o) => ({
        estimate: o.estimatedTimeMs || 0,
        actual: o.executionTimeMs,
        accuracy: o.timelineAccuracy || 0,
      }));

    const avgAccuracy =
      accuracies.length > 0
        ? accuracies.reduce((sum, a) => sum + a.accuracy, 0) / accuracies.length
        : 0;

    return {
      avgAccuracy,
      estimates: accuracies.slice(-20), // Last 20
    };
  }

  /**
   * Export outcomes for external analysis
   */
  async exportOutcomes(format: 'json' | 'csv', filters?: any): Promise<string> {
    const outcomes = await this.queryOutcomes(filters || {});

    if (format === 'json') {
      const exportPath = join(dirname(this.outcomesLogPath), 'outcomes-export.json');
      writeFileSync(exportPath, JSON.stringify(outcomes, null, 2), { encoding: 'utf-8' });
      return exportPath;
    } else if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'outcomeid',
        'sessionId',
        'agentId',
        'agentName',
        'timestamp',
        'completionStatus',
        'qualityScore',
        'confidenceLevel',
        'executionTimeMs',
        'successRate',
      ];

      const rows = outcomes.map((o) => [
        o.outcomeid,
        o.sessionId,
        o.agentId,
        o.agentName,
        o.timestamp,
        o.completionStatus,
        o.qualityScore || '',
        o.confidenceLevel || '',
        o.executionTimeMs,
        (o.nextAgentSucceeded ? 1 : 0).toString(),
      ]);

      const csvContent =
        headers.join(',') +
        '\n' +
        rows
          .map((row) =>
            row
              .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
              .join(',')
          )
          .join('\n');

      const exportPath = join(dirname(this.outcomesLogPath), 'outcomes-export.csv');
      writeFileSync(exportPath, csvContent, { encoding: 'utf-8' });
      return exportPath;
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }
}
