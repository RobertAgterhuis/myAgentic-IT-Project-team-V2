// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Pattern Analysis Engine — M5-E1 / Issue #1402
 *
 * Analyzes execution outcomes to identify successful patterns:
 * - Which agent pairs/sequences work well
 * - Which team compositions succeed for specific task types
 * - Timeline accuracy by agent
 * - Conflict patterns between agent outputs
 */

import type { AgentExecutionOutcome } from './outcome-tracking';

/* ── Analysis Types ────────────────────────────────────────────── */

/**
 * Success rate between two agents in sequence
 */
export interface PairAnalysis {
  agentA: string;
  agentB: string;
  label: string; // "{agentA} → {agentB}"
  totalSequences: number;
  successCount: number;
  successRate: number; // 0.0 - 1.0
  avgQualityScore?: number;
  commonBlockers: string[];
  sampleSessions: string[]; // Last 3 session IDs with this pair
}

/**
 * Success patterns for a given team composition
 */
export interface TeamPattern {
  teamId: string;
  teamName: string;
  agents: string[];
  agentSequence: string; // "{agent1}→{agent2}→{agent3}"
  totalExecutions: number;
  successCount: number;
  successRate: number;
  avgQualityScore?: number;
  taskTypes: { type: string; count: number; successRate: number }[];
}

/**
 * Task type to best-performing teams mapping
 */
export interface TaskTypePattern {
  taskType: string;
  domainCategory?: string;
  totalExecutions: number;
  successRate: number;
  topTeams: Array<{
    teamId: string;
    teamName: string;
    successRate: number;
    confidence: number; // Based on sample size (n ≥ 5 for high confidence)
  }>;
  topAgents: Array<{
    agentId: string;
    agentName: string;
    successRate: number;
    confidence: number;
  }>;
}

/**
 * Timeline accuracy analysis for an agent
 */
export interface TimelinePattern {
  agentId: string;
  agentName: string;
  estimatesCount: number;
  avgAccuracy: number; // Ratio: actual / estimated
  underestimators: string[]; // Task IDs where agent underestimated
  overestimators: string[]; // Task IDs where agent overestimated
  accuracyTrend?: 'improving' | 'stable' | 'declining';
}

/**
 * Conflict pattern between agent outputs
 */
export interface ConflictPattern {
  agentA: string;
  agentB: string;
  subsequentAgentId: string;
  conflicts: number;
  rejectionRate: number; // % of times next agent rejects B's output after A
  commonReasons: string[];
  recommendation: 'AVOID' | 'RISKY' | 'SAFE';
}

/**
 * Complete pattern analysis report
 */
export interface PatternAnalysisReport {
  generatedAt: string;
  analysisWindow: {
    startDate: string;
    endDate: string;
    totalOutcomes: number;
  };
  pairAnalyses: PairAnalysis[];
  teamPatterns: TeamPattern[];
  taskTypePatterns: TaskTypePattern[];
  timelinePatterns: TimelinePattern[];
  conflictPatterns: ConflictPattern[];
  insights: {
    bestPair: PairAnalysis | null;
    worstPair: PairAnalysis | null;
    bestTeam: TeamPattern | null;
    mostConflictual: ConflictPattern | null;
    improvementAreas: string[];
  };
}

/**
 * Pattern analysis service interface
 */
export interface IPatternAnalysisService {
  /**
   * Analyze all pair sequences in outcomes
   */
  analyzePairs(outcomes: AgentExecutionOutcome[]): PairAnalysis[];

  /**
   * Analyze team composition success patterns
   */
  analyzeTeams(outcomes: AgentExecutionOutcome[]): TeamPattern[];

  /**
   * Identify best teams for each task type
   */
  analyzeTaskTypePatterns(outcomes: AgentExecutionOutcome[]): TaskTypePattern[];

  /**
   * Analyze timeline accuracy by agent
   */
  analyzeTimelinePatterns(outcomes: AgentExecutionOutcome[]): TimelinePattern[];

  /**
   * Identify conflict patterns between agents
   */
  analyzeConflictPatterns(outcomes: AgentExecutionOutcome[]): ConflictPattern[];

  /**
   * Generate complete pattern analysis report
   */
  generateReport(outcomes: AgentExecutionOutcome[]): PatternAnalysisReport;

  /**
   * Get specific pattern by key
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPattern(type: 'pair' | 'team' | 'task' | 'timeline', key: string): any;

  /**
   * Recommendation: should this pair/team be used?
   */
  shouldRecommend(
    type: 'pair' | 'team',
    key: string
  ): { recommend: boolean; confidence: number; reason: string };
}

/* ── Constants ────────────────────────────────────────────────── */

/**
 * Minimum sample size for confidence thresholds
 */
export const MIN_SAMPLE_SIZE = 5;

/**
 * Confidence levels based on sample size
 */
export function getConfidence(sampleSize: number): 'high' | 'medium' | 'low' {
  if (sampleSize >= 20) return 'high';
  if (sampleSize >= MIN_SAMPLE_SIZE) return 'medium';
  return 'low';
}

/**
 * Convert confidence string to number
 */
export function getConfidenceScore(confidence: 'high' | 'medium' | 'low'): number {
  const scores = { high: 0.9, medium: 0.6, low: 0.3 };
  return scores[confidence];
}

/**
 * Classification based on success rate
 */
export function classifySuccessRate(rate: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  if (rate >= 0.85) return 'EXCELLENT';
  if (rate >= 0.7) return 'GOOD';
  if (rate >= 0.5) return 'FAIR';
  return 'POOR';
}
