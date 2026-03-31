// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Lessons-to-Policy Pipeline Service
 *
 * Transforms normalized lessons from reevaluate and retrospective artifacts
 * into machine-readable policy change proposals with rollback metadata.
 *
 * Covers PATTERNS E1, Issue 1: Build lessons-to-policy pipeline
 */

import { createHash } from 'node:crypto';
import type { ServiceContext } from '../../src/webapp/services/types';

/**
 * Represents a normalized lesson extracted from artifacts
 */
export interface NormalizedLesson {
  id: string;
  category:
    | 'routing'
    | 'prompting'
    | 'validation'
    | 'retrieval'
    | 'tool-use'
    | 'collaboration'
    | 'approval'
    | 'performance';
  narrative: string;
  evidence: Array<{
    source: string;
    data: string;
    weight: number;
  }>;
  confidence: number;
  applicability: {
    phases: string[];
    agents: string[];
    scope: string;
  };
  recommendedPolicyChange?: {
    policyDomain: string;
    changeDescription: string;
  };
}

/**
 * Represents a recommended policy change
 */
export interface PolicyChangeRecommendation {
  id: string;
  policyDomain:
    | 'routing'
    | 'prompt-profile'
    | 'validation-strictness'
    | 'retrieval-profile'
    | 'concurrency'
    | 'approval-threshold'
    | 'escalation-behavior'
    | 'cache-policy';
  changeType: 'increase' | 'decrease' | 'toggle' | 'add-rule' | 'remove-rule' | 'modify-threshold';
  currentValue: unknown;
  proposedValue: unknown;
  rationale: string;
  expectedImpact: {
    metric: string;
    direction: 'improvement' | 'degradation' | 'neutral';
    estimatedMagnitude: 'small' | 'medium' | 'large';
  };
  riskLevel: 'low' | 'medium' | 'high';
  affectedAgents: string[];
  affectedPhases: string[];
  rollbackProcedure: string;
  approvalRequired: boolean;
  approvalAuthority: 'orchestrator' | 'human' | 'automated';
}

export type ProposalRiskClassification = 'low' | 'medium' | 'high';

export interface BenchmarkThreshold {
  maxP95LatencyMs: number;
  maxErrorRatePct: number;
  minSuccessRatePct: number;
}

export interface BenchmarkEvidence {
  benchmarkRunId: string;
  collectedAt: string;
  metrics: {
    p95LatencyMs: number;
    errorRatePct: number;
    successRatePct: number;
  };
  thresholds: BenchmarkThreshold;
  passed: boolean;
  failures: string[];
}

export interface PolicyAutoApplyResult {
  proposalId: string;
  attemptedAt: string;
  autoApplied: boolean;
  failClosed: boolean;
  reasons: string[];
  riskClassification: ProposalRiskClassification;
  benchmarkEvidence: BenchmarkEvidence[];
}

/**
 * Policy change proposal document
 */
export interface PolicyChangeProposal {
  proposalId: string;
  generatedAt: string;
  derivedFrom: {
    lessonIds: string[];
    benchmarkRunIds: string[];
    retrospectiveIds: string[];
  };
  recommendedChanges: PolicyChangeRecommendation[];
  summary: {
    totalChangesProposed: number;
    highRiskChanges: number;
    requiresApproval: number;
    confidenceScore: number;
    riskClassification: ProposalRiskClassification;
  };
  recommendationStatus: 'pending-review' | 'approved' | 'rejected' | 'applied' | 'reverted';
  reviewNotes?: string;
  appliedAt?: string;
}

export interface RollbackJournalEntry {
  entryId: string;
  proposalId: string;
  recordedAt: string;
  appliedAt: string;
  appliedBy: string;
  reversibleCommand: string;
  proposalSnapshot: {
    recommendationStatus: PolicyChangeProposal['recommendationStatus'];
    reviewNotes?: string;
    appliedAt?: string;
  };
}

const POLICY_CLASS_THRESHOLDS: Record<
  PolicyChangeRecommendation['policyDomain'],
  BenchmarkThreshold
> = {
  routing: { maxP95LatencyMs: 2600, maxErrorRatePct: 5, minSuccessRatePct: 95 },
  'prompt-profile': { maxP95LatencyMs: 3000, maxErrorRatePct: 6, minSuccessRatePct: 94 },
  'validation-strictness': { maxP95LatencyMs: 2800, maxErrorRatePct: 4, minSuccessRatePct: 96 },
  'retrieval-profile': { maxP95LatencyMs: 3200, maxErrorRatePct: 5, minSuccessRatePct: 95 },
  concurrency: { maxP95LatencyMs: 2400, maxErrorRatePct: 5, minSuccessRatePct: 95 },
  'approval-threshold': { maxP95LatencyMs: 3000, maxErrorRatePct: 6, minSuccessRatePct: 94 },
  'escalation-behavior': { maxP95LatencyMs: 3500, maxErrorRatePct: 6, minSuccessRatePct: 94 },
  'cache-policy': { maxP95LatencyMs: 2500, maxErrorRatePct: 5, minSuccessRatePct: 95 },
};

export class LessonsToPolicyService {
  private ctx: ServiceContext;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private readText(filePath: string): string | null {
    if (!this.ctx.store.exists(filePath)) {
      return null;
    }
    return this.ctx.store.readFile(filePath);
  }

  private writeText(filePath: string, content: string): void {
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, content);
      return;
    }
    this.ctx.store.writeFile(filePath, content);
  }

  private appendText(filePath: string, content: string): void {
    const existing = this.readText(filePath) || '';
    this.writeText(filePath, `${existing}${content}`);
  }

  private emitAdaptationEvent(event: {
    proposalId: string;
    eventType:
      | 'proposal-created'
      | 'proposal-approved'
      | 'auto-apply-attempted'
      | 'auto-apply-failed-closed'
      | 'proposal-applied'
      | 'proposal-reverted';
    details?: Record<string, unknown>;
  }): void {
    const row = {
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.appendText('BusinessDocs/metrics/adaptation-events.jsonl', `${JSON.stringify(row)}\n`);
  }

  private classifyProposalRisk(
    recommendations: PolicyChangeRecommendation[]
  ): ProposalRiskClassification {
    if (recommendations.some((recommendation) => recommendation.riskLevel === 'high')) {
      return 'high';
    }

    if (recommendations.some((recommendation) => recommendation.riskLevel === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  private parseBenchmarkMetrics(raw: unknown): {
    p95LatencyMs: number;
    errorRatePct: number;
    successRatePct: number;
  } | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const row = raw as Record<string, unknown>;
    const latency = row.latencyThresholds as Record<string, unknown> | undefined;
    const p95Candidate = row.p95 ?? row.p95Ms ?? latency?.p95;
    const errorCandidate = row.errorRatePct ?? row.errorRate ?? row.errorsPct;
    const successCandidate = row.successRatePct ?? row.successRate;

    const p95LatencyMs = typeof p95Candidate === 'number' ? p95Candidate : Number.NaN;
    const errorRatePct = typeof errorCandidate === 'number' ? errorCandidate : Number.NaN;
    const successRatePct =
      typeof successCandidate === 'number' ? successCandidate : 100 - (errorRatePct || 0);

    if (!Number.isFinite(p95LatencyMs) || !Number.isFinite(errorRatePct)) {
      return null;
    }

    return {
      p95LatencyMs,
      errorRatePct,
      successRatePct: Number.isFinite(successRatePct) ? successRatePct : 0,
    };
  }

  private validateBenchmarkForThreshold(
    benchmarkRunId: string,
    threshold: BenchmarkThreshold
  ): BenchmarkEvidence | null {
    const benchmarkFilePath = `tests/load/${benchmarkRunId}.json`;
    const benchmarkRaw = this.readText(benchmarkFilePath);
    if (!benchmarkRaw) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(benchmarkRaw);
    } catch {
      return null;
    }

    const metrics = this.parseBenchmarkMetrics(parsed);
    if (!metrics) {
      return null;
    }

    const failures: string[] = [];
    if (metrics.p95LatencyMs > threshold.maxP95LatencyMs) {
      failures.push(
        `p95 latency ${metrics.p95LatencyMs}ms exceeds max ${threshold.maxP95LatencyMs}ms`
      );
    }
    if (metrics.errorRatePct > threshold.maxErrorRatePct) {
      failures.push(
        `error rate ${metrics.errorRatePct}% exceeds max ${threshold.maxErrorRatePct}%`
      );
    }
    if (metrics.successRatePct < threshold.minSuccessRatePct) {
      failures.push(
        `success rate ${metrics.successRatePct}% below min ${threshold.minSuccessRatePct}%`
      );
    }

    return {
      benchmarkRunId,
      collectedAt: new Date().toISOString(),
      metrics,
      thresholds: threshold,
      passed: failures.length === 0,
      failures,
    };
  }

  private collectBenchmarkEvidence(proposal: PolicyChangeProposal): BenchmarkEvidence[] {
    const domains = Array.from(
      new Set(proposal.recommendedChanges.map((change) => change.policyDomain))
    );
    const evidenceRows: BenchmarkEvidence[] = [];

    for (const domain of domains) {
      const threshold = POLICY_CLASS_THRESHOLDS[domain];
      for (const benchmarkRunId of proposal.derivedFrom.benchmarkRunIds) {
        const evidence = this.validateBenchmarkForThreshold(benchmarkRunId, threshold);
        if (evidence) {
          evidenceRows.push(evidence);
        }
      }
    }

    return evidenceRows;
  }

  private getProposalPath(proposalId: string): string {
    return `BusinessDocs/intelligence-loop/policy-proposals/${proposalId}.json`;
  }

  private loadProposal(proposalId: string): PolicyChangeProposal {
    const proposalPath = this.getProposalPath(proposalId);
    const content = this.readText(proposalPath);
    if (!content) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    return JSON.parse(content) as PolicyChangeProposal;
  }

  private persistProposal(proposal: PolicyChangeProposal): void {
    this.writeText(this.getProposalPath(proposal.proposalId), JSON.stringify(proposal, null, 2));
  }

  /**
   * Parse reevaluate and retrospective artifacts into normalized lessons
   */
  async extractLessons(
    reevaluateArtifactIds: string[],
    retrospectiveIds: string[]
  ): Promise<NormalizedLesson[]> {
    const lessons: NormalizedLesson[] = [];

    // Extract from reevaluate artifacts
    for (const artifactId of reevaluateArtifactIds) {
      const artifact = this.readText(`BusinessDocs/reevaluate/${artifactId}`);
      if (artifact) {
        const extracted = this.parseLessonsFromReevaluate(artifact, artifactId);
        lessons.push(...extracted);
      }
    }

    // Extract from retrospectives
    for (const retroId of retrospectiveIds) {
      const artifact = this.readText(`BusinessDocs/retrospectives/${retroId}`);
      if (artifact) {
        const extracted = this.parseLessonsFromRetrospective(artifact, retroId);
        lessons.push(...extracted);
      }
    }

    return lessons;
  }

  /**
   * Parse lessons specific from a reevaluate artifact
   */
  private parseLessonsFromReevaluate(content: string, artifactId: string): NormalizedLesson[] {
    const lessons: NormalizedLesson[] = [];

    // Parse "What worked well" section
    const workedWellMatch = content.match(/## What Worked Well\n([\s\S]*?)(?=##|$)/);
    if (workedWellMatch) {
      const items = workedWellMatch[1].split('\n-').filter((s) => s.trim());
      items.forEach((item, idx) => {
        lessons.push({
          id: `LESSON-REEVAL-${artifactId.slice(0, 8)}-${idx + 1000}`,
          category: 'routing',
          narrative: item.trim(),
          evidence: [
            {
              source: 'observation',
              data: `Extracted from reevaluate run ${artifactId}`,
              weight: 0.8,
            },
          ],
          confidence: 0.7,
          applicability: {
            phases: [],
            agents: [],
            scope: 'universal',
          },
        });
      });
    }

    // Parse "What could improve" section
    const improveMatch = content.match(/## What Could Improve\n([\s\S]*?)(?=##|$)/);
    if (improveMatch) {
      const items = improveMatch[1].split('\n-').filter((s) => s.trim());
      items.forEach((item, idx) => {
        lessons.push({
          id: `LESSON-REEVAL-${artifactId.slice(0, 8)}-${idx + 2000}`,
          category: 'validation',
          narrative: `Improvement opportunity: ${item.trim()}`,
          evidence: [
            {
              source: 'observation',
              data: `Extracted from reevaluate run ${artifactId}`,
              weight: 0.7,
            },
          ],
          confidence: 0.65,
          applicability: {
            phases: [],
            agents: [],
            scope: 'universal',
          },
        });
      });
    }

    return lessons;
  }

  /**
   * Parse lessons from a retrospective artifact
   */
  private parseLessonsFromRetrospective(content: string, retroId: string): NormalizedLesson[] {
    const lessons: NormalizedLesson[] = [];

    // Parse "Successes" section
    const successMatch = content.match(/## Successes\n([\s\S]*?)(?=##|$)/);
    if (successMatch) {
      const items = successMatch[1].split('\n-').filter((s) => s.trim());
      items.forEach((item, idx) => {
        lessons.push({
          id: `LESSON-RETRO-${retroId.slice(0, 8)}-${idx + 1000}`,
          category: 'approval',
          narrative: `Success: ${item.trim()}`,
          evidence: [
            {
              source: 'observation',
              data: `Extracted from retrospective ${retroId}`,
              weight: 0.85,
            },
          ],
          confidence: 0.75,
          applicability: {
            phases: [],
            agents: [],
            scope: 'universal',
          },
        });
      });
    }

    // Parse "Issues encountered" section
    const issuesMatch = content.match(/## Issues Encountered\n([\s\S]*?)(?=##|$)/);
    if (issuesMatch) {
      const items = issuesMatch[1].split('\n-').filter((s) => s.trim());
      items.forEach((item, idx) => {
        lessons.push({
          id: `LESSON-RETRO-${retroId.slice(0, 8)}-${idx + 2000}`,
          category: 'validation',
          narrative: `Issue: ${item.trim()}`,
          evidence: [
            {
              source: 'observation',
              data: `Extracted from retrospective ${retroId}`,
              weight: 0.8,
            },
          ],
          confidence: 0.7,
          applicability: {
            phases: [],
            agents: [],
            scope: 'universal',
          },
        });
      });
    }

    return lessons;
  }

  /**
   * Generate policy recommendations from lessons
   */
  async generatePolicyRecommendations(
    lessons: NormalizedLesson[]
  ): Promise<PolicyChangeRecommendation[]> {
    const recommendations: PolicyChangeRecommendation[] = [];

    const categoryToPolicyDomain: Record<
      NormalizedLesson['category'],
      PolicyChangeRecommendation['policyDomain']
    > = {
      routing: 'routing',
      prompting: 'prompt-profile',
      validation: 'validation-strictness',
      retrieval: 'retrieval-profile',
      'tool-use': 'concurrency',
      collaboration: 'escalation-behavior',
      approval: 'approval-threshold',
      performance: 'cache-policy',
    };

    for (const lesson of lessons) {
      const policyDomain = lesson.recommendedPolicyChange?.policyDomain;
      const resolvedDomain = (
        policyDomain &&
        [
          'routing',
          'prompt-profile',
          'validation-strictness',
          'retrieval-profile',
          'concurrency',
          'approval-threshold',
          'escalation-behavior',
          'cache-policy',
        ].includes(policyDomain)
          ? policyDomain
          : categoryToPolicyDomain[lesson.category]
      ) as PolicyChangeRecommendation['policyDomain'];

      const recommendation: PolicyChangeRecommendation = {
        id: `POLICYCHANGE-${this.generateId()}-${Date.now()}`,
        policyDomain: resolvedDomain,
        changeType: 'modify-threshold',
        currentValue: null,
        proposedValue: null,
        rationale: `${lesson.narrative}. Confidence: ${(lesson.confidence * 100).toFixed(0)}%`,
        expectedImpact: {
          metric: 'accuracy',
          direction: 'improvement',
          estimatedMagnitude: lesson.confidence > 0.8 ? 'large' : 'medium',
        },
        riskLevel: lesson.confidence < 0.6 ? 'high' : lesson.confidence < 0.75 ? 'medium' : 'low',
        affectedAgents: lesson.applicability.agents || [],
        affectedPhases: lesson.applicability.phases || [],
        rollbackProcedure: `Revert policy domain '${resolvedDomain}' to previous value and validate against recent benchmarks.`,
        approvalRequired: true,
        approvalAuthority: 'orchestrator',
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Create a policy change proposal artifact
   */
  async createProposal(
    lessons: NormalizedLesson[],
    benchmarkRunIds: string[] = [],
    retrospectiveIds: string[] = []
  ): Promise<PolicyChangeProposal> {
    const recommendations = await this.generatePolicyRecommendations(lessons);

    const highRiskCount = recommendations.filter((r) => r.riskLevel === 'high').length;
    const approvalsRequired = recommendations.filter((r) => r.approvalRequired).length;
    const riskClassification = this.classifyProposalRisk(recommendations);
    const confidenceScore =
      recommendations.length > 0
        ? recommendations.reduce(
            (sum, r) => sum + parseFloat(r.rationale.match(/\d+/)?.[0] || '50') / 100,
            0
          ) / recommendations.length
        : 0.5;

    const proposal: PolicyChangeProposal = {
      proposalId: `POLICYCHANGE-${this.generateId()}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      derivedFrom: {
        lessonIds: lessons.map((l) => l.id),
        benchmarkRunIds,
        retrospectiveIds,
      },
      recommendedChanges: recommendations,
      summary: {
        totalChangesProposed: recommendations.length,
        highRiskChanges: highRiskCount,
        requiresApproval: approvalsRequired,
        confidenceScore: Math.min(1, confidenceScore),
        riskClassification,
      },
      recommendationStatus: 'pending-review',
    };

    // Persist the proposal
    this.persistProposal(proposal);
    this.emitAdaptationEvent({
      proposalId: proposal.proposalId,
      eventType: 'proposal-created',
      details: {
        riskClassification,
        benchmarkRunIds: benchmarkRunIds.length,
      },
    });

    return proposal;
  }

  async approveProposal(
    proposalId: string,
    reviewer = 'orchestrator'
  ): Promise<PolicyChangeProposal> {
    const proposal = this.loadProposal(proposalId);
    proposal.recommendationStatus = 'approved';
    proposal.reviewNotes = `Approved by ${reviewer}`;
    this.persistProposal(proposal);
    this.emitAdaptationEvent({
      proposalId,
      eventType: 'proposal-approved',
      details: { reviewer },
    });
    return proposal;
  }

  async autoApplyProposal(
    proposalId: string,
    actor = 'automated-pipeline'
  ): Promise<PolicyAutoApplyResult> {
    const proposal = this.loadProposal(proposalId);
    const attemptedAt = new Date().toISOString();
    const reasons: string[] = [];
    const benchmarkEvidence = this.collectBenchmarkEvidence(proposal);
    const riskClassification = proposal.summary.riskClassification;

    if (riskClassification !== 'low') {
      reasons.push(
        `Proposal risk classification is '${riskClassification}', only 'low' is eligible.`
      );
    }

    if (
      proposal.recommendationStatus !== 'pending-review' &&
      proposal.recommendationStatus !== 'approved'
    ) {
      reasons.push(
        `Proposal status '${proposal.recommendationStatus}' is not eligible for auto-apply.`
      );
    }

    const missingBenchmarkEvidence = benchmarkEvidence.length === 0;
    if (missingBenchmarkEvidence) {
      reasons.push('Required benchmark evidence is missing for this policy class.');
    }

    const failingBenchmarkEvidence = benchmarkEvidence.filter((evidence) => !evidence.passed);
    if (failingBenchmarkEvidence.length > 0) {
      reasons.push(
        `Benchmark thresholds failed for ${failingBenchmarkEvidence.length} evidence record(s).`
      );
    }

    const failClosed = missingBenchmarkEvidence || failingBenchmarkEvidence.length > 0;
    this.emitAdaptationEvent({
      proposalId,
      eventType: 'auto-apply-attempted',
      details: {
        actor,
        failClosed,
        riskClassification,
        benchmarkEvidenceCount: benchmarkEvidence.length,
      },
    });

    if (reasons.length > 0) {
      if (failClosed) {
        this.emitAdaptationEvent({
          proposalId,
          eventType: 'auto-apply-failed-closed',
          details: {
            reasons,
          },
        });
      }

      return {
        proposalId,
        attemptedAt,
        autoApplied: false,
        failClosed,
        reasons,
        riskClassification,
        benchmarkEvidence,
      };
    }

    proposal.recommendationStatus = 'approved';
    await this.applyProposal(proposal, actor);

    return {
      proposalId,
      attemptedAt,
      autoApplied: true,
      failClosed,
      reasons: ['All guard conditions passed; proposal auto-applied.'],
      riskClassification,
      benchmarkEvidence,
    };
  }

  /**
   * Apply an approved policy change proposal
   */
  async applyProposal(proposal: PolicyChangeProposal, actor = 'automated-pipeline'): Promise<void> {
    if (proposal.recommendationStatus !== 'approved') {
      throw new Error(`Cannot apply proposal with status: ${proposal.recommendationStatus}`);
    }

    const rollbackJournalEntry: RollbackJournalEntry = {
      entryId: `ROLLBACK-${this.generateId()}-${Date.now()}`,
      proposalId: proposal.proposalId,
      recordedAt: new Date().toISOString(),
      appliedAt: new Date().toISOString(),
      appliedBy: actor,
      reversibleCommand:
        'POST /api/intelligence-loop/policy-proposals/revert-latest { "reason": "<reason>" }',
      proposalSnapshot: {
        recommendationStatus: proposal.recommendationStatus,
        reviewNotes: proposal.reviewNotes,
        appliedAt: proposal.appliedAt,
      },
    };
    this.appendText(
      'BusinessDocs/intelligence-loop/policy-rollback-journal.jsonl',
      `${JSON.stringify(rollbackJournalEntry)}\n`
    );

    // Record audit trail
    const auditEntry = {
      timestamp: new Date().toISOString(),
      proposalId: proposal.proposalId,
      action: 'applied',
      changesCount: proposal.recommendedChanges.length,
      appliedBy: actor,
    };

    const auditPath = `BusinessDocs/intelligence-loop/policy-application-audit.jsonl`;
    const auditContent = `${JSON.stringify(auditEntry)}\n`;
    this.appendText(auditPath, auditContent);

    // Update proposal status
    proposal.recommendationStatus = 'applied';
    proposal.appliedAt = new Date().toISOString();
    this.persistProposal(proposal);
    this.emitAdaptationEvent({
      proposalId: proposal.proposalId,
      eventType: 'proposal-applied',
      details: {
        actor,
        rollbackJournalEntryId: rollbackJournalEntry.entryId,
      },
    });
  }

  /**
   * Revert a previously applied proposal
   */
  async revertProposal(proposalId: string, reason: string): Promise<void> {
    const proposal = this.loadProposal(proposalId);

    // Record revert in audit trail
    const auditEntry = {
      timestamp: new Date().toISOString(),
      proposalId,
      action: 'reverted',
      reason,
      revertedBy: 'automated-pipeline',
    };

    const auditPath = `BusinessDocs/intelligence-loop/policy-application-audit.jsonl`;
    const auditContent = `${JSON.stringify(auditEntry)}\n`;
    this.appendText(auditPath, auditContent);

    // Update proposal status
    proposal.recommendationStatus = 'reverted';
    proposal.reviewNotes = `Reverted: ${reason}`;
    this.persistProposal(proposal);
    this.emitAdaptationEvent({
      proposalId,
      eventType: 'proposal-reverted',
      details: { reason },
    });
  }

  async revertLatestAppliedProposal(reason: string): Promise<{ proposalId: string }> {
    const rollbackLog =
      this.readText('BusinessDocs/intelligence-loop/policy-rollback-journal.jsonl') || '';
    const rows = rollbackLog
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RollbackJournalEntry);

    if (rows.length === 0) {
      throw new Error('No rollback journal entries found');
    }

    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const candidate = rows[index];
      const proposal = this.loadProposal(candidate.proposalId);
      if (proposal.recommendationStatus === 'applied') {
        await this.revertProposal(candidate.proposalId, reason);
        return { proposalId: candidate.proposalId };
      }
    }

    throw new Error('No applied proposal found in rollback journal');
  }

  private generateId(): string {
    return createHash('sha256')
      .update(Date.now().toString())
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();
  }
}

export async function createLessonsToPolicyService(
  ctx: ServiceContext
): Promise<LessonsToPolicyService> {
  return new LessonsToPolicyService(ctx);
}
