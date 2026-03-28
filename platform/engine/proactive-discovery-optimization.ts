// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Proactive Discovery & Optimization Service — PATTERNS M3 (E5 + E6)
 *
 * Implements:
 * - E5.1 stale knowledge scanning
 * - E5.2 contradiction and missing-citation discovery
 * - E5.3 exploratory branch generation
 * - E6.1 dynamic concurrency policy
 * - E6.2 adaptive retrieval policy
 * - E6.3 confidence-aware route escalation
 */

import type { ServiceContext } from '../../src/webapp/services/types';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface KnowledgeEntity {
  id: string;
  type: 'decision' | 'rag-collection' | 'artifact';
  lastUpdatedAt: string;
  supersededById?: string;
  workflows?: string[];
}

export interface StaleKnowledgeFinding {
  findingId: string;
  entityId: string;
  entityType: KnowledgeEntity['type'];
  severity: FindingSeverity;
  ageSeconds: number;
  staleReason: 'stale-age' | 'superseded';
  affectedWorkflows: string[];
  reevaluateRecommended: boolean;
}

export interface StaleKnowledgeScanInput {
  entities: KnowledgeEntity[];
  staleThresholdSeconds?: number;
  reevaluateThresholdCount?: number;
  nowIso?: string;
}

export interface StaleKnowledgeScanResult {
  scanId: string;
  scannedAt: string;
  staleThresholdSeconds: number;
  totalEntities: number;
  staleEntities: number;
  findings: StaleKnowledgeFinding[];
  reevaluateRecommended: boolean;
}

export interface ArtifactToInspect {
  artifactId: string;
  phase?: string;
  content: string;
}

export interface ContradictionFinding {
  findingId: string;
  artifactId: string;
  phase: string;
  type: 'contradiction' | 'missing-citation';
  severity: FindingSeverity;
  message: string;
  evidence: string[];
  citationRepairSuggestion?: string;
}

export interface ContradictionScanInput {
  artifacts: ArtifactToInspect[];
}

export interface ContradictionScanResult {
  scanId: string;
  scannedAt: string;
  findings: ContradictionFinding[];
  totalFindings: number;
  criticalFindings: number;
  blockSynthesisPublication: boolean;
}

export interface ExploratoryBranch {
  branchId: string;
  strategy: 'conservative' | 'balanced' | 'aggressive';
  summary: string;
  estimatedRisk: number;
  estimatedEffort: number;
  expectedValue: number;
  tradeoffScore: number;
}

export interface ExploratoryBranchInput {
  taskId: string;
  objective: string;
  basePlanSteps: string[];
  uncertainty: number;
  includeExploration?: boolean;
  maxAlternatives?: number;
  surfaceAt?: 'sprint-gate' | 'approval';
}

export interface ExploratoryBranchResult {
  explorationId: string;
  generatedAt: string;
  taskId: string;
  uncertainty: number;
  surfacedAt: 'sprint-gate' | 'approval';
  alternativesGenerated: number;
  branches: ExploratoryBranch[];
}

export interface ConcurrencyPolicyInput {
  currentMaxConcurrency: number;
  queueWaitMs: number;
  failureRate: number;
  throughputRps: number;
  previousPolicy?: {
    maxConcurrency: number;
    baselineFailureRate: number;
    baselineThroughputRps: number;
    rollbackValue: number;
  };
}

export interface ConcurrencyPolicyDecision {
  decisionId: string;
  decidedAt: string;
  previousMaxConcurrency: number;
  nextMaxConcurrency: number;
  changed: boolean;
  rollbackApplied: boolean;
  reasons: string[];
  safeBounds: {
    min: number;
    max: number;
  };
}

export interface RetrievalPolicyInput {
  riskLevel: 'low' | 'high';
  citationUsefulness: number;
  noMatchRate: number;
  retrievalLatencyP95Ms: number;
  latencyBudgetMs: number;
  currentTopK?: number;
  currentThreshold?: number;
}

export interface RetrievalPolicyDecision {
  decisionId: string;
  decidedAt: string;
  riskLevel: 'low' | 'high';
  topK: number;
  threshold: number;
  metadata: {
    citationUsefulness: number;
    noMatchRate: number;
    retrievalLatencyP95Ms: number;
    latencyBudgetMs: number;
    reasons: string[];
  };
}

export interface RouteEscalationInput {
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresHumanApproval?: boolean;
  verifierFindingsCritical?: boolean;
}

export interface RouteEscalationDecision {
  decisionId: string;
  decidedAt: string;
  selectedRoute:
    | 'fast-path'
    | 'standard-path'
    | 'deep-reasoning'
    | 'verifier-heavy'
    | 'human-approval';
  escalationReasons: string[];
  runtimeTrace: {
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    selectedRoute: string;
    reasons: string[];
  };
}

export type AdaptivePolicyDomain =
  | 'concurrency'
  | 'retrieval'
  | 'route-escalation'
  | 'pattern-uplift';

export interface AdaptivePolicyProposal {
  proposalId: string;
  createdAt: string;
  domain: AdaptivePolicyDomain;
  status: 'pending' | 'approved' | 'applied' | 'reverted' | 'rejected';
  title: string;
  rationale: string;
  desiredChange: Record<string, unknown>;
  decisionReferences: string[];
  approvalRequired: boolean;
  auditTrail: Array<{
    action: 'created' | 'approved' | 'applied' | 'reverted' | 'rejected';
    actor: string;
    at: string;
    reason?: string;
  }>;
}

export interface AdaptivePolicyProposalInput {
  domain: AdaptivePolicyDomain;
  title: string;
  rationale: string;
  desiredChange: Record<string, unknown>;
  decisionReferences?: string[];
  approvalRequired?: boolean;
  actor?: string;
}

export interface AdaptiveBehaviorSummary {
  generatedAt: string;
  optimization: {
    concurrencyDecisions: number;
    retrievalDecisions: number;
    routeEscalations: number;
  };
  approvals: {
    pendingProposals: number;
    approvedProposals: number;
    appliedProposals: number;
    revertedProposals: number;
    rejectedProposals: number;
  };
  latest: {
    concurrency: ConcurrencyPolicyDecision | null;
    retrieval: RetrievalPolicyDecision | null;
    routeEscalation: RouteEscalationDecision | null;
    proposal: AdaptivePolicyProposal | null;
  };
}

export interface PatternScoreEntry {
  patternId: string;
  filePath: string;
  currentScore: number;
  targetScore: number | null;
  projectedScore: number;
  gapTo99: number;
  gapToTarget: number;
}

export interface PatternScoreAnalysis {
  generatedAt: string;
  totalPatterns: number;
  averageCurrentScore: number;
  minCurrentScore: number;
  averageTargetScore: number | null;
  targetThresholds: {
    average: number;
    minimum: number;
  };
  belowMinThresholdPatterns: PatternScoreEntry[];
  belowTargetPatterns: PatternScoreEntry[];
  topPriorityPatterns: PatternScoreEntry[];
  readyForM4Done: boolean;
}

export interface PatternUpliftProposalBatchResult {
  generatedAt: string;
  analysis: PatternScoreAnalysis;
  proposalsCreated: AdaptivePolicyProposal[];
}

const BASE_DIR = 'BusinessDocs/intelligence-loop/m3';
const STALE_SCANS_PATH = `${BASE_DIR}/stale-knowledge-scans.jsonl`;
const CONTRADICTION_SCANS_PATH = `${BASE_DIR}/contradiction-scans.jsonl`;
const BRANCH_EXPLORATION_PATH = `${BASE_DIR}/exploratory-branches.jsonl`;
const CONCURRENCY_POLICY_PATH = `${BASE_DIR}/concurrency-policies.jsonl`;
const RETRIEVAL_POLICY_PATH = `${BASE_DIR}/retrieval-policies.jsonl`;
const ROUTE_ESCALATION_PATH = `${BASE_DIR}/route-escalations.jsonl`;
const ADAPTIVE_POLICY_PROPOSALS_PATH = `${BASE_DIR}/adaptive-policy-proposals.jsonl`;
const PATTERNS_DIR = 'Patterns';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseJsonl<T>(content: string): T[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function toAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3);
}

export class ProactiveDiscoveryOptimizationService {
  private readonly ctx: ServiceContext;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private read(filePath: string): string {
    if (!this.ctx.store.exists(filePath)) {
      return '';
    }
    return this.ctx.store.readFile(filePath);
  }

  private write(filePath: string, content: string): void {
    this.ctx.store.mkdirp(BASE_DIR);
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, content);
      return;
    }
    this.ctx.store.writeFile(filePath, content);
  }

  private appendJsonl<T extends object>(filePath: string, value: T): void {
    const existing = this.read(filePath);
    const next = `${existing}${JSON.stringify(value)}\n`;
    this.write(filePath, next);
  }

  private readJsonl<T>(filePath: string): T[] {
    return parseJsonl<T>(this.read(filePath));
  }

  private overwriteJsonl<T extends object>(filePath: string, rows: T[]): void {
    this.write(
      filePath,
      rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length > 0 ? '\n' : '')
    );
  }

  async scanKnowledgeStaleness(input: StaleKnowledgeScanInput): Promise<StaleKnowledgeScanResult> {
    const nowIso = input.nowIso || new Date().toISOString();
    const nowMs = Date.parse(nowIso);
    const staleThresholdSeconds = Math.max(60, input.staleThresholdSeconds ?? 3600);
    const reevaluateThresholdCount = Math.max(1, input.reevaluateThresholdCount ?? 2);

    const findings: StaleKnowledgeFinding[] = [];

    for (const entity of input.entities) {
      const entityUpdatedMs = Date.parse(entity.lastUpdatedAt);
      const ageSeconds = Number.isFinite(entityUpdatedMs)
        ? Math.max(0, Math.floor((nowMs - entityUpdatedMs) / 1000))
        : staleThresholdSeconds + 1;

      const isSuperseded = Boolean(entity.supersededById);
      const isStaleByAge = ageSeconds > staleThresholdSeconds;
      if (!isSuperseded && !isStaleByAge) {
        continue;
      }

      let severity: FindingSeverity = 'medium';
      if (isSuperseded || ageSeconds >= staleThresholdSeconds * 3) {
        severity = 'critical';
      } else if (ageSeconds >= staleThresholdSeconds * 2) {
        severity = 'high';
      }

      findings.push({
        findingId: makeId('STALE'),
        entityId: entity.id,
        entityType: entity.type,
        severity,
        ageSeconds,
        staleReason: isSuperseded ? 'superseded' : 'stale-age',
        affectedWorkflows: entity.workflows || ['sprint-gate'],
        reevaluateRecommended: severity === 'critical' || ageSeconds > staleThresholdSeconds * 1.5,
      });
    }

    const reevaluateRecommended =
      findings.length >= reevaluateThresholdCount ||
      findings.some((f) => f.severity === 'critical');

    const result: StaleKnowledgeScanResult = {
      scanId: makeId('STALESCAN'),
      scannedAt: nowIso,
      staleThresholdSeconds,
      totalEntities: input.entities.length,
      staleEntities: findings.length,
      findings,
      reevaluateRecommended,
    };

    this.appendJsonl(STALE_SCANS_PATH, result);
    return result;
  }

  async detectContradictionsAndMissingCitations(
    input: ContradictionScanInput
  ): Promise<ContradictionScanResult> {
    const findings: ContradictionFinding[] = [];
    const decisionValues = new Map<string, { artifactId: string; value: string; phase: string }>();

    for (const artifact of input.artifacts) {
      const phase = artifact.phase || 'unknown';
      const lines = artifact.content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        const decisionMatch = line.match(/^decision\s*:\s*([^=]+)=\s*(.+)$/i);
        if (decisionMatch) {
          const key = decisionMatch[1].trim().toLowerCase();
          const value = decisionMatch[2].trim().toLowerCase();
          const seen = decisionValues.get(key);
          if (seen && seen.value !== value) {
            findings.push({
              findingId: makeId('CONTRA'),
              artifactId: artifact.artifactId,
              phase,
              type: 'contradiction',
              severity: phase.toLowerCase().includes('synthesis') ? 'critical' : 'high',
              message: `Contradictory decision for '${key}' detected across artifacts.`,
              evidence: [
                `${seen.artifactId}: ${key}=${seen.value}`,
                `${artifact.artifactId}: ${key}=${value}`,
              ],
              citationRepairSuggestion:
                'Normalize to a single decision value and cite the authoritative decision record.',
            });
          } else if (!seen) {
            decisionValues.set(key, { artifactId: artifact.artifactId, value, phase });
          }
          continue;
        }

        const looksLikeClaim = /\b(must|should|will|requires?|recommended|mandatory)\b/i.test(line);
        const hasCitation = /\[source:[^\]]+\]|https?:\/\//i.test(line);
        if (looksLikeClaim && !hasCitation) {
          findings.push({
            findingId: makeId('CITE'),
            artifactId: artifact.artifactId,
            phase,
            type: 'missing-citation',
            severity: phase.toLowerCase().includes('synthesis') ? 'high' : 'medium',
            message: 'Claim appears to require citation but no source was found.',
            evidence: [line],
            citationRepairSuggestion:
              'Attach a [source: path:line] reference or URL for this claim before publication.',
          });
        }
      }
    }

    const criticalFindings = findings.filter((finding) => finding.severity === 'critical').length;
    const result: ContradictionScanResult = {
      scanId: makeId('DISCOVERY'),
      scannedAt: new Date().toISOString(),
      findings,
      totalFindings: findings.length,
      criticalFindings,
      blockSynthesisPublication: criticalFindings > 0,
    };

    this.appendJsonl(CONTRADICTION_SCANS_PATH, result);
    return result;
  }

  async generateExploratoryBranches(
    input: ExploratoryBranchInput
  ): Promise<ExploratoryBranchResult | null> {
    const includeExploration = input.includeExploration ?? true;
    const uncertainty = clamp(input.uncertainty, 0, 1);
    if (!includeExploration || uncertainty < 0.6) {
      return null;
    }

    const maxAlternatives = clamp(input.maxAlternatives ?? 3, 1, 5);
    const surfacedAt = input.surfaceAt || 'sprint-gate';

    const seed = [
      {
        strategy: 'conservative' as const,
        risk: 0.2,
        effort: 0.55,
        value: 0.64,
        summary: `Incremental path for '${input.objective}' with strict guardrails and minimal blast radius.`,
      },
      {
        strategy: 'balanced' as const,
        risk: 0.38,
        effort: 0.62,
        value: 0.82,
        summary: `Balanced path for '${input.objective}' optimizing confidence and delivery speed.`,
      },
      {
        strategy: 'aggressive' as const,
        risk: 0.67,
        effort: 0.83,
        value: 0.94,
        summary: `Aggressive path for '${input.objective}' prioritizing upside and learning speed.`,
      },
    ];

    const branches = seed
      .slice(0, maxAlternatives)
      .map((entry) => {
        const tradeoffScore = +(entry.value - entry.risk * 0.6 - entry.effort * 0.2).toFixed(3);
        return {
          branchId: makeId('BRANCH'),
          strategy: entry.strategy,
          summary: entry.summary,
          estimatedRisk: entry.risk,
          estimatedEffort: entry.effort,
          expectedValue: entry.value,
          tradeoffScore,
        };
      })
      .sort((a, b) => b.tradeoffScore - a.tradeoffScore);

    const result: ExploratoryBranchResult = {
      explorationId: makeId('EXPLORE'),
      generatedAt: new Date().toISOString(),
      taskId: input.taskId,
      uncertainty,
      surfacedAt,
      alternativesGenerated: branches.length,
      branches,
    };

    this.appendJsonl(BRANCH_EXPLORATION_PATH, result);
    return result;
  }

  async decideConcurrencyPolicy(input: ConcurrencyPolicyInput): Promise<ConcurrencyPolicyDecision> {
    const min = 2;
    const max = 16;
    const reasons: string[] = [];
    let next = clamp(Math.round(input.currentMaxConcurrency), min, max);
    let rollbackApplied = false;

    if (input.queueWaitMs > 1500 && input.failureRate < 0.08) {
      next = clamp(next + 2, min, max);
      reasons.push('High queue wait and low failure rate support safe concurrency increase.');
    }

    if (input.failureRate >= 0.12) {
      next = clamp(next - 2, min, max);
      reasons.push('Failure rate elevated; reducing concurrency to improve reliability.');
    }

    if (input.throughputRps < 1) {
      next = clamp(next - 1, min, max);
      reasons.push('Low throughput observed; reducing contention risk.');
    }

    if (
      input.previousPolicy &&
      input.throughputRps < input.previousPolicy.baselineThroughputRps * 0.85 &&
      input.failureRate > input.previousPolicy.baselineFailureRate * 1.2
    ) {
      next = clamp(input.previousPolicy.rollbackValue, min, max);
      rollbackApplied = true;
      reasons.push('Regression guard triggered; rolling back to known-safe policy.');
    }

    if (reasons.length === 0) {
      reasons.push('Metrics remain within stable range; keeping current policy.');
    }

    const decision: ConcurrencyPolicyDecision = {
      decisionId: makeId('CONCURRENCY'),
      decidedAt: new Date().toISOString(),
      previousMaxConcurrency: input.currentMaxConcurrency,
      nextMaxConcurrency: next,
      changed: next !== input.currentMaxConcurrency,
      rollbackApplied,
      reasons,
      safeBounds: { min, max },
    };

    this.appendJsonl(CONCURRENCY_POLICY_PATH, decision);
    return decision;
  }

  async decideRetrievalPolicy(input: RetrievalPolicyInput): Promise<RetrievalPolicyDecision> {
    let topK = input.riskLevel === 'high' ? 8 : 4;
    let threshold = input.riskLevel === 'high' ? 0.08 : 0.15;
    const reasons: string[] = [];

    if (input.citationUsefulness < 0.6) {
      topK += 2;
      threshold -= 0.02;
      reasons.push('Low citation usefulness; widening retrieval depth and relaxing threshold.');
    }

    if (input.noMatchRate > 0.25) {
      topK += 1;
      threshold -= 0.03;
      reasons.push('High no-match rate; increasing recall.');
    }

    if (input.retrievalLatencyP95Ms > input.latencyBudgetMs) {
      topK -= 2;
      threshold += 0.02;
      reasons.push('Latency budget exceeded; trimming depth and increasing precision.');
    }

    topK = clamp(topK, 2, 12);
    threshold = +clamp(threshold, 0.03, 0.6).toFixed(3);

    if (reasons.length === 0) {
      reasons.push('Baseline policy selected from risk tier.');
    }

    const decision: RetrievalPolicyDecision = {
      decisionId: makeId('RETRIEVAL'),
      decidedAt: new Date().toISOString(),
      riskLevel: input.riskLevel,
      topK,
      threshold,
      metadata: {
        citationUsefulness: input.citationUsefulness,
        noMatchRate: input.noMatchRate,
        retrievalLatencyP95Ms: input.retrievalLatencyP95Ms,
        latencyBudgetMs: input.latencyBudgetMs,
        reasons,
      },
    };

    this.appendJsonl(RETRIEVAL_POLICY_PATH, decision);
    return decision;
  }

  async decideRouteEscalation(input: RouteEscalationInput): Promise<RouteEscalationDecision> {
    const confidence = clamp(input.confidence, 0, 1);
    const reasons: string[] = [];
    let selectedRoute: RouteEscalationDecision['selectedRoute'];

    if (input.requiresHumanApproval || input.verifierFindingsCritical) {
      selectedRoute = 'human-approval';
      reasons.push('Human approval required by policy or critical verifier findings.');
    } else if (confidence < 0.45) {
      selectedRoute = 'verifier-heavy';
      reasons.push('Very low confidence; escalating to verifier-heavy path.');
    } else if (confidence < 0.65 || input.riskLevel === 'high') {
      selectedRoute = 'deep-reasoning';
      reasons.push('Moderate confidence or high risk; using deep reasoning.');
    } else if (confidence >= 0.85 && input.riskLevel === 'low') {
      selectedRoute = 'fast-path';
      reasons.push('High confidence and low risk; selecting reduced-latency path.');
    } else {
      selectedRoute = 'standard-path';
      reasons.push('Balanced path selected based on confidence and risk profile.');
    }

    const decision: RouteEscalationDecision = {
      decisionId: makeId('ROUTE'),
      decidedAt: new Date().toISOString(),
      selectedRoute,
      escalationReasons: reasons,
      runtimeTrace: {
        confidence,
        riskLevel: input.riskLevel,
        selectedRoute,
        reasons,
      },
    };

    this.appendJsonl(ROUTE_ESCALATION_PATH, decision);
    return decision;
  }

  async listRecentRouteEscalations(limit = 20): Promise<RouteEscalationDecision[]> {
    const rows = this.readJsonl<RouteEscalationDecision>(ROUTE_ESCALATION_PATH);
    return rows.slice(-Math.max(1, limit)).reverse();
  }

  async createAdaptivePolicyProposal(
    input: AdaptivePolicyProposalInput
  ): Promise<AdaptivePolicyProposal> {
    const now = new Date().toISOString();
    const actor = input.actor || 'system';
    const proposal: AdaptivePolicyProposal = {
      proposalId: makeId('ADAPTIVE-POLICY'),
      createdAt: now,
      domain: input.domain,
      status: 'pending',
      title: input.title,
      rationale: input.rationale,
      desiredChange: input.desiredChange,
      decisionReferences: input.decisionReferences || [],
      approvalRequired: input.approvalRequired ?? true,
      auditTrail: [{ action: 'created', actor, at: now }],
    };

    this.appendJsonl(ADAPTIVE_POLICY_PROPOSALS_PATH, proposal);
    return proposal;
  }

  async listAdaptivePolicyProposals(
    status?: AdaptivePolicyProposal['status']
  ): Promise<AdaptivePolicyProposal[]> {
    const rows = this.readJsonl<AdaptivePolicyProposal>(ADAPTIVE_POLICY_PROPOSALS_PATH);
    const filtered = status ? rows.filter((row) => row.status === status) : rows;
    return filtered.slice().reverse();
  }

  async approveAdaptivePolicyProposal(
    proposalId: string,
    actor: string,
    reason?: string
  ): Promise<AdaptivePolicyProposal | undefined> {
    return this.transitionAdaptivePolicyProposal(proposalId, 'approved', actor, reason);
  }

  async applyAdaptivePolicyProposal(
    proposalId: string,
    actor: string,
    reason?: string
  ): Promise<AdaptivePolicyProposal | undefined> {
    return this.transitionAdaptivePolicyProposal(proposalId, 'applied', actor, reason);
  }

  async revertAdaptivePolicyProposal(
    proposalId: string,
    actor: string,
    reason: string
  ): Promise<AdaptivePolicyProposal | undefined> {
    return this.transitionAdaptivePolicyProposal(proposalId, 'reverted', actor, reason);
  }

  async rejectAdaptivePolicyProposal(
    proposalId: string,
    actor: string,
    reason: string
  ): Promise<AdaptivePolicyProposal | undefined> {
    return this.transitionAdaptivePolicyProposal(proposalId, 'rejected', actor, reason);
  }

  private async transitionAdaptivePolicyProposal(
    proposalId: string,
    nextStatus: Exclude<AdaptivePolicyProposal['status'], 'pending'>,
    actor: string,
    reason?: string
  ): Promise<AdaptivePolicyProposal | undefined> {
    const rows = this.readJsonl<AdaptivePolicyProposal>(ADAPTIVE_POLICY_PROPOSALS_PATH);
    let updated: AdaptivePolicyProposal | undefined;

    const nextRows = rows.map((row) => {
      if (row.proposalId !== proposalId) {
        return row;
      }

      const patch: AdaptivePolicyProposal = {
        ...row,
        status: nextStatus,
        auditTrail: [
          ...row.auditTrail,
          {
            action: nextStatus,
            actor,
            at: new Date().toISOString(),
            reason,
          },
        ],
      };

      updated = patch;
      return patch;
    });

    if (!updated) {
      return undefined;
    }

    this.overwriteJsonl(ADAPTIVE_POLICY_PROPOSALS_PATH, nextRows);
    return updated;
  }

  async getAdaptiveBehaviorSummary(): Promise<AdaptiveBehaviorSummary> {
    const concurrency = this.readJsonl<ConcurrencyPolicyDecision>(CONCURRENCY_POLICY_PATH);
    const retrieval = this.readJsonl<RetrievalPolicyDecision>(RETRIEVAL_POLICY_PATH);
    const routeEscalation = this.readJsonl<RouteEscalationDecision>(ROUTE_ESCALATION_PATH);
    const proposals = this.readJsonl<AdaptivePolicyProposal>(ADAPTIVE_POLICY_PROPOSALS_PATH);

    const byStatus = (status: AdaptivePolicyProposal['status']): number =>
      proposals.filter((proposal) => proposal.status === status).length;

    return {
      generatedAt: new Date().toISOString(),
      optimization: {
        concurrencyDecisions: concurrency.length,
        retrievalDecisions: retrieval.length,
        routeEscalations: routeEscalation.length,
      },
      approvals: {
        pendingProposals: byStatus('pending'),
        approvedProposals: byStatus('approved'),
        appliedProposals: byStatus('applied'),
        revertedProposals: byStatus('reverted'),
        rejectedProposals: byStatus('rejected'),
      },
      latest: {
        concurrency: concurrency.length > 0 ? concurrency[concurrency.length - 1] : null,
        retrieval: retrieval.length > 0 ? retrieval[retrieval.length - 1] : null,
        routeEscalation:
          routeEscalation.length > 0 ? routeEscalation[routeEscalation.length - 1] : null,
        proposal: proposals.length > 0 ? proposals[proposals.length - 1] : null,
      },
    };
  }

  private readPatternMarkdownFiles(): Array<{ filePath: string; content: string }> {
    let entries: Array<string | { name: string; isFile(): boolean; isDirectory(): boolean }> = [];
    try {
      entries = this.ctx.store.readdir(PATTERNS_DIR);
    } catch {
      return [];
    }

    const markdownFiles = entries
      .map((entry) => (typeof entry === 'string' ? entry : entry.isFile() ? entry.name : null))
      .filter((entry): entry is string => Boolean(entry))
      .filter((name) => name.toLowerCase().endsWith('.md'))
      .map((name) => `${PATTERNS_DIR}/${name}`);

    return markdownFiles
      .map((filePath) => {
        try {
          return { filePath, content: this.ctx.store.readFile(filePath) };
        } catch {
          return null;
        }
      })
      .filter((row): row is { filePath: string; content: string } => row !== null);
  }

  private parsePatternScoreEntry(filePath: string, content: string): PatternScoreEntry | null {
    const currentMatch = content.match(/current\s+score\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/i);
    if (!currentMatch) {
      return null;
    }

    const targetMatch = content.match(/target\s+score\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/i);
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const fileName = filePath.split('/').pop() || filePath;
    const patternId = headingMatch?.[1]?.trim() || fileName.replace(/\.md$/i, '');

    const currentScore = +clamp(Number(currentMatch[1]), 0, 10).toFixed(3);
    const targetScore =
      targetMatch && Number.isFinite(Number(targetMatch[1]))
        ? +clamp(Number(targetMatch[1]), 0, 10).toFixed(3)
        : null;
    const projectedScore = targetScore ?? currentScore;

    return {
      patternId,
      filePath,
      currentScore,
      targetScore,
      projectedScore,
      gapTo99: +Math.max(0, 9.9 - currentScore).toFixed(3),
      gapToTarget: +(targetScore === null ? 0 : Math.max(0, targetScore - currentScore)).toFixed(3),
    };
  }

  async analyzePatternScores(input?: {
    averageTarget?: number;
    minimumTarget?: number;
    limit?: number;
  }): Promise<PatternScoreAnalysis> {
    const averageTarget = clamp(input?.averageTarget ?? 9.9, 0, 10);
    const minimumTarget = clamp(input?.minimumTarget ?? 9.4, 0, 10);
    const limit = Math.max(1, Math.floor(input?.limit ?? 5));

    const entries = this.readPatternMarkdownFiles()
      .map((row) => this.parsePatternScoreEntry(row.filePath, row.content))
      .filter((row): row is PatternScoreEntry => row !== null);

    const ranked = entries
      .slice()
      .sort(
        (a, b) =>
          b.gapTo99 - a.gapTo99 ||
          a.currentScore - b.currentScore ||
          a.patternId.localeCompare(b.patternId)
      );

    const belowMinThresholdPatterns = ranked.filter((entry) => entry.currentScore < minimumTarget);
    const belowTargetPatterns = ranked.filter(
      (entry) => entry.targetScore !== null && entry.currentScore < entry.targetScore
    );

    const averageCurrentScore = toAverage(entries.map((entry) => entry.currentScore));
    const minCurrentScore =
      entries.length > 0 ? Math.min(...entries.map((entry) => entry.currentScore)) : 0;

    const targetScores = entries
      .map((entry) => entry.targetScore)
      .filter((score): score is number => score !== null);

    const averageTargetScore = targetScores.length > 0 ? toAverage(targetScores) : null;
    const readyForM4Done =
      entries.length > 0 &&
      averageCurrentScore >= averageTarget &&
      minCurrentScore >= minimumTarget;

    return {
      generatedAt: new Date().toISOString(),
      totalPatterns: entries.length,
      averageCurrentScore,
      minCurrentScore,
      averageTargetScore,
      targetThresholds: {
        average: averageTarget,
        minimum: minimumTarget,
      },
      belowMinThresholdPatterns,
      belowTargetPatterns,
      topPriorityPatterns: ranked.slice(0, limit),
      readyForM4Done,
    };
  }

  async generatePatternUpliftProposals(input?: {
    actor?: string;
    limit?: number;
    averageTarget?: number;
    minimumTarget?: number;
  }): Promise<PatternUpliftProposalBatchResult> {
    const analysis = await this.analyzePatternScores({
      averageTarget: input?.averageTarget,
      minimumTarget: input?.minimumTarget,
      limit: input?.limit,
    });

    const actor = input?.actor || 'pattern-optimizer';
    const uniqueCandidates = new Map<string, PatternScoreEntry>();

    for (const entry of analysis.belowMinThresholdPatterns) {
      uniqueCandidates.set(entry.filePath, entry);
    }

    for (const entry of analysis.topPriorityPatterns) {
      if (entry.gapTo99 > 0) {
        uniqueCandidates.set(entry.filePath, entry);
      }
    }

    const candidates = Array.from(uniqueCandidates.values())
      .sort((a, b) => b.gapTo99 - a.gapTo99 || a.currentScore - b.currentScore)
      .slice(0, Math.max(1, Math.floor(input?.limit ?? 3)));

    const proposalsCreated: AdaptivePolicyProposal[] = [];
    for (const candidate of candidates) {
      const proposal = await this.createAdaptivePolicyProposal({
        domain: 'pattern-uplift',
        title: `Uplift ${candidate.patternId} toward M4 threshold`,
        rationale: `Current score ${candidate.currentScore.toFixed(2)}/10 is below M4 average guardrail readiness.`,
        desiredChange: {
          patternId: candidate.patternId,
          filePath: candidate.filePath,
          currentScore: candidate.currentScore,
          targetScore: candidate.targetScore,
          gapTo99: candidate.gapTo99,
          actions: [
            'Add or strengthen measurable acceptance criteria.',
            'Increase concrete examples and anti-pattern guidance.',
            'Align synthesis references with explicit citation anchors.',
          ],
        },
        decisionReferences: [`PATTERN-SCORE:${candidate.patternId}`],
        approvalRequired: true,
        actor,
      });

      proposalsCreated.push(proposal);
    }

    return {
      generatedAt: new Date().toISOString(),
      analysis,
      proposalsCreated,
    };
  }
}

export function createProactiveDiscoveryOptimizationService(
  ctx: ServiceContext
): ProactiveDiscoveryOptimizationService {
  return new ProactiveDiscoveryOptimizationService(ctx);
}
