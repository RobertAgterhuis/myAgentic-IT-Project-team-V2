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
  };
  recommendationStatus: 'pending-review' | 'approved' | 'rejected' | 'applied' | 'reverted';
  reviewNotes?: string;
  appliedAt?: string;
}

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
      },
      recommendationStatus: 'pending-review',
    };

    // Persist the proposal
    const proposalPath = `BusinessDocs/intelligence-loop/policy-proposals/${proposal.proposalId}.json`;
    this.writeText(proposalPath, JSON.stringify(proposal, null, 2));

    return proposal;
  }

  /**
   * Apply an approved policy change proposal
   */
  async applyProposal(proposal: PolicyChangeProposal): Promise<void> {
    if (proposal.recommendationStatus !== 'approved') {
      throw new Error(`Cannot apply proposal with status: ${proposal.recommendationStatus}`);
    }

    // Record audit trail
    const auditEntry = {
      timestamp: new Date().toISOString(),
      proposalId: proposal.proposalId,
      action: 'applied',
      changesCount: proposal.recommendedChanges.length,
      appliedBy: 'automated-pipeline',
    };

    const auditPath = `BusinessDocs/intelligence-loop/policy-application-audit.jsonl`;
    const auditContent = `${JSON.stringify(auditEntry)}\n`;
    this.appendText(auditPath, auditContent);

    // Update proposal status
    proposal.recommendationStatus = 'applied';
    proposal.appliedAt = new Date().toISOString();
    const proposalPath = `BusinessDocs/intelligence-loop/policy-proposals/${proposal.proposalId}.json`;
    this.writeText(proposalPath, JSON.stringify(proposal, null, 2));
  }

  /**
   * Revert a previously applied proposal
   */
  async revertProposal(proposalId: string, reason: string): Promise<void> {
    const proposalPath = `BusinessDocs/intelligence-loop/policy-proposals/${proposalId}.json`;
    const content = this.readText(proposalPath);

    if (!content) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const proposal = JSON.parse(content) as PolicyChangeProposal;

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
    this.writeText(proposalPath, JSON.stringify(proposal, null, 2));
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
