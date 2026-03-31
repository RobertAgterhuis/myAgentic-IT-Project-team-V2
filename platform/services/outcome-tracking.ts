// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Outcome Tracking Data Model — M5-E1 / Issue #1401
 *
 * Defines data structures and services for capturing, storing, and querying
 * agent execution outcomes to enable pattern analysis and recommendation refinement.
 *
 * Data captured per agent activation:
 * - Session context: sessionId, taskId, agentId, teamId
 * - Execution context: executionMode, phase, agent information
 * - Input: task definition, previous agent outputs
 * - Output: deliverables produced, handoff document
 * - Metrics: execution time, quality scores, blockers encountered
 * - Success indicators: completion status, next agent success
 * - Timeline: estimated vs. actual duration
 *
 * Aggregations enable:
 * - Per agent: success rate, avg quality, avg timeline accuracy
 * - Per team: success rate, avg quality for team compositions
 * - Per task type: which team patterns work best
 * - Pair analysis: which agent sequences succeed/fail
 */

/* ── Outcome Data Types ────────────────────────────────────────── */

/**
 * Represents a single agent execution outcome.
 * Captures all data needed for pattern analysis and learning.
 */
export interface AgentExecutionOutcome {
  // Identifiers
  outcomeid: string; // UUID
  sessionId: string;
  taskId: string;
  agentId: string;
  agentName: string;
  teamId?: string; // For agency team compositions
  phaseNumber: number;
  phaseName: string;

  // Execution context
  executionMode: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID';
  timestamp: string; // ISO 8601
  recordedAt: string; // When outcome was recorded

  // Input metadata
  taskDefinition: {
    type: string; // e.g., 'FEATURE', 'BUG_FIX', 'REFACTOR'
    category?: string; // e.g., 'backend', 'frontend', 'infra'
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    description?: string;
  };
  predecessorOutputs: string[]; // Paths to previous agent outputs used
  inputDataSize: number; // Bytes

  // Output metrics
  deliverables: {
    count: number;
    paths: string[];
    totalSize: number; // Bytes
    types: string[]; // e.g., 'markdown', 'typescript', 'json'
  };
  handoffDocument?: string; // Path to handoff/summary

  // Execution metrics
  executionTimeMs: number;
  estimatedTimeMs?: number;
  timelineAccuracy?: number; // Ratio: actual / estimated

  // Quality metrics
  qualityScore?: number; // 0.0 - 1.0, from Critic feedback
  confidenceLevel?: number; // 0.0 - 1.0, agent's self-assessment
  blockers: string[]; // Issues encountered
  uncertaintyReasons?: string[];

  // Success indicators
  completionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  nextAgentSucceeded?: boolean; // Did the next agent in sequence succeed?
  gateResult?: 'PASSED' | 'FAILED' | 'SKIPPED'; // Critic gate result

  // Dependencies and impacts
  blockedBy?: string[]; // Issue IDs or outcome IDs
  blocks?: string[]; // What this outcome blocks

  // Human review
  needsHumanReview: boolean;
  reviewNotes?: string;
}
/**
 * Team composition record — for AGENCY_ONLY or HYBRID modes
 */
export interface TeamComposition {
  teamId: string;
  teamName: string;
  agents: {
    agentId: string;
    agentName: string;
    sequence: number;
    role: string;
  }[];
  createdAt: string;
  usageCount: number;
  successRate: number; // Computed
}

/**
 * Outcome aggregation for analytics
 */
export interface OutcomeAggregation {
  // Per-agent metrics
  agentMetrics: Record<
    string,
    {
      agentId: string;
      agentName: string;
      totalExecutions: number;
      successCount: number;
      successRate: number;
      avgQualityScore: number;
      avgConfidence: number;
      avgExecutionTimeMs: number;
      avgTimelineAccuracy: number;
      mostCommonBlockers: { blocker: string; frequency: number }[];
      typicalFollowOns: { nextAgent: string; frequency: number; successRate: number }[];
    }
  >;

  // Per-team metrics (agency teams)
  teamMetrics?: Record<
    string,
    {
      teamId: string;
      teamName: string;
      totalExecutions: number;
      successCount: number;
      successRate: number;
      avgQualityScore: number;
      agents: string[];
    }
  >;

  // Per-task-type metrics
  taskTypeMetrics?: Record<
    string,
    {
      taskType: string;
      totalExecutions: number;
      successCount: number;
      topTeams: { teamId: string; teamName: string; successRate: number }[];
      topAgents: { agentId: string; agentName: string; successRate: number }[];
    }
  >;

  // Pair analysis: (agentA, agentB) -> success rate
  pairAnalysis?: Record<
    string,
    {
      agentA: string;
      agentB: string;
      pairKeyV: string; // "{agentA}→{agentB}"
      totalSequences: number;
      successCount: number;
      successRate: number;
      avgQualityScore: number;
      commonBlockers: string[];
    }
  >;

  computedAt: string;
}

/**
 * Quality metrics from Critic feedback
 */
export interface CriticFeedback {
  outcomeid: string;
  criticAgentId: string;
  gatePhase: string;
  passed: boolean;
  score: number; // 0.0 - 1.0
  findings: {
    category: 'BLOCKING' | 'WARNING' | 'INFO';
    message: string;
  }[];
  recordedAt: string;
}

/* ── Service Interface ─────────────────────────────────────────── */

/**
 * Service for recording, querying, and aggregating execution outcomes.
 */
export interface IOutcomeTrackingService {
  /**
   * Record a new agent execution outcome.
   * Validates required fields and stores to outcome log.
   */
  recordOutcome(outcome: AgentExecutionOutcome): Promise<string>; // Returns outcomeid

  /**
   * Record feedback from Critic gate
   */
  recordCriticFeedback(feedback: CriticFeedback): Promise<void>;

  /**
   * Record a team composition (for agency modes)
   */
  recordTeamComposition(team: TeamComposition): Promise<void>;

  /**
   * Query outcomes by filters
   */
  queryOutcomes(filters: {
    sessionId?: string;
    agentId?: string;
    teamId?: string;
    taskType?: string;
    executionMode?: string;
    completionStatus?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<AgentExecutionOutcome[]>;

  /**
   * Compute aggregations across outcomes
   */
  computeAggregations(timeWindowDays?: number): Promise<OutcomeAggregation>;

  /**
   * Get success rate for a specific agent pair
   */
  getPairSuccessRate(agentA: string, agentB: string): Promise<number>;

  /**
   * Get top-performing team compositions for a task type
   */
  getTopTeamsForTaskType(
    taskType: string,
    limit?: number
  ): Promise<Array<{ teamId: string; successRate: number; agents: string[] }>>;

  /**
   * Get timeline accuracy stats for an agent
   */
  getTimelineAccuracyStats(agentId: string): Promise<{
    avgAccuracy: number;
    estimates: { estimate: number; actual: number; accuracy: number }[];
  }>;

  /**
   * Export outcomes for external analysis
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportOutcomes(format: 'json' | 'csv', filters?: any): Promise<string>; // Returns file path
}

/* ── Storage format ────────────────────────────────────────────── */

/**
 * Stored in: BusinessDocs/learning/outcomes-log.jsonl
 * Format: JSON Lines (one complete outcome per line)
 *
 * Stored in: BusinessDocs/learning/team-compositions.json
 * Format: JSON array of team compositions
 *
 * Stored in: BusinessDocs/learning/critic-feedback.jsonl
 * Format: JSON Lines (one feedback entry per line)
 *
 * Indexes:
 * - By sessionId (HASH)
 * - By agentId (HASH)
 * - By timestamp range (RANGE)
 * - By (agentA, agentB) for pair analysis (HASH)
 */

/**
 * Outcome validation schema
 */
export const OUTCOME_VALIDATION_RULES = {
  requiredFields: [
    'outcomeid',
    'sessionId',
    'taskId',
    'agentId',
    'agentName',
    'timestamp',
    'recordedAt',
    'completionStatus',
    'executionTimeMs',
    'needsHumanReview',
  ] as const,

  numericRanges: {
    qualityScore: { min: 0, max: 1 },
    confidenceLevel: { min: 0, max: 1 },
    executionTimeMs: { min: 0, max: 3_600_000 }, // Max 1 hour
    timelineAccuracy: { min: 0, max: 10 }, // Allow up to 10x overrun
  },

  enums: {
    completionStatus: ['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED'],
    executionMode: ['SDLC_ONLY', 'AGENCY_ONLY', 'HYBRID'],
    gateResult: ['PASSED', 'FAILED', 'SKIPPED'],
  },
} as const;
