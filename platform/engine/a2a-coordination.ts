// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * A2A Coordination Service — M4 Operational A2A Coordination
 *
 * Implements:
 * - Capability discovery for contested routing decisions (M4-E1-I1)
 * - Dispute/rebuttal protocol for conflicting outputs (M4-E1-I2)
 * - Fan-in synthesis policy for parallel branches (M4-E1-I3)
 * - Governance hooks for high-risk divergence (M4-E2-I2)
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import { queryAgents, type AgentPhase, type AgentRegistryEntry } from './agent-registry';

export interface CapabilityDiscoveryInput {
  requiredCapabilities: string[];
  phase?: AgentPhase;
  minSuccessRate?: number;
  limit?: number;
  contestedAgentIds?: string[];
}

export interface CapabilityDiscoveryCandidate {
  agentId: string;
  name: string;
  matchedCapabilities: string[];
  capabilityScore: number;
  successRate: number;
  confidence: number;
  conflictCount: number;
  contested: boolean;
}

export interface CapabilityDiscoveryResult {
  recommendedAgentId?: string;
  contested: boolean;
  confidence: number;
  candidates: CapabilityDiscoveryCandidate[];
  rationale: string[];
}

export interface DisputePosition {
  agentId: string;
  summary: string;
  confidence: number;
  evidencePaths?: string[];
}

export interface DisputeRebuttal {
  id: string;
  disputeId: string;
  fromAgentId: string;
  targetAgentId: string;
  points: string[];
  evidencePaths: string[];
  createdAt: string;
}

export interface FanInBranchScore {
  agentId: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  rebuttalPressure: number;
}

export interface FanInSynthesisResult {
  selectedAgentId?: string;
  decisionSummary: string;
  confidence: number;
  consensusLevel: 'high' | 'medium' | 'low';
  unresolvedConflicts: string[];
  branchScores: FanInBranchScore[];
}

export interface GovernanceEvaluation {
  required: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
  escalated: boolean;
  approvalsNeeded: number;
}

export interface DisputeCase {
  id: string;
  correlationId: string;
  topic: string;
  status: 'open' | 'under-rebuttal' | 'resolved' | 'escalated';
  openedAt: string;
  updatedAt: string;
  positions: DisputePosition[];
  rebuttals: DisputeRebuttal[];
  fanIn?: FanInSynthesisResult;
  governance?: GovernanceEvaluation;
  resolution?: {
    selectedAgentId: string;
    summary: string;
    resolvedAt: string;
    approvedBy?: string[];
  };
}

export interface OpenDisputeInput {
  correlationId: string;
  topic: string;
  positions: DisputePosition[];
}

export interface SubmitRebuttalInput {
  disputeId: string;
  fromAgentId: string;
  targetAgentId: string;
  points: string[];
  evidencePaths?: string[];
}

export interface FanInInput {
  disputeId: string;
  strategy?: 'highest-confidence' | 'evidence-weighted';
}

export interface GovernanceInput {
  disputeId: string;
  highImpact?: boolean;
  blastRadius?: number;
  requireHumanApprovalAtOrAbove?: 'medium' | 'high';
}

export interface ResolveDisputeInput {
  disputeId: string;
  selectedAgentId: string;
  summary: string;
  approvedBy?: string[];
}

export class A2ACoordinationService {
  private ctx: ServiceContext;
  private disputesPath = 'BusinessDocs/reasoning-collaboration/a2a-disputes.json';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  async discoverCapabilities(input: CapabilityDiscoveryInput): Promise<CapabilityDiscoveryResult> {
    if (!Array.isArray(input.requiredCapabilities) || input.requiredCapabilities.length === 0) {
      throw new Error('requiredCapabilities must contain at least one capability');
    }

    const required = input.requiredCapabilities.map((value) => value.toLowerCase());
    const candidates = queryAgents({
      capability: input.requiredCapabilities,
      phase: input.phase,
      minSuccessRate: input.minSuccessRate,
      sortBy: 'success_rate',
      limit: Math.max(2, input.limit ?? 10),
    });

    const candidateScores = candidates.map((agent) => this.toCandidate(agent, required, input));
    const sorted = [...candidateScores].sort(
      (left, right) =>
        right.confidence - left.confidence || right.capabilityScore - left.capabilityScore
    );

    const top = sorted[0];
    const second = sorted[1];
    const scoreDelta = top && second ? Math.abs(top.confidence - second.confidence) : 1;
    const contestedByDelta = sorted.length > 1 && scoreDelta < 0.1;
    const contestedByInput = sorted.some((candidate) => candidate.contested);
    const contested = contestedByDelta || contestedByInput;

    const rationale: string[] = [];
    if (top) {
      rationale.push(
        `Top candidate ${top.agentId} matched ${top.matchedCapabilities.length}/${required.length} required capabilities.`
      );
    }
    if (contestedByDelta && top && second) {
      rationale.push(
        `Routing is contested: top confidence delta is ${scoreDelta.toFixed(3)} between ${top.agentId} and ${second.agentId}.`
      );
    }
    if (contestedByInput) {
      rationale.push('Routing is contested by explicit contestedAgentIds input.');
    }
    if (!top) {
      rationale.push('No candidate met the capability filters.');
    }

    return {
      recommendedAgentId: contested ? undefined : top?.agentId,
      contested,
      confidence: top ? top.confidence : 0,
      candidates: sorted,
      rationale,
    };
  }

  async openDispute(input: OpenDisputeInput): Promise<DisputeCase> {
    if (!input.positions?.length || input.positions.length < 2) {
      throw new Error('A dispute requires at least two conflicting positions');
    }

    const now = new Date().toISOString();
    const dispute: DisputeCase = {
      id: `DSP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      correlationId: input.correlationId,
      topic: input.topic,
      status: 'open',
      openedAt: now,
      updatedAt: now,
      positions: input.positions,
      rebuttals: [],
    };

    const disputes = await this.loadDisputes();
    disputes.push(dispute);
    await this.saveDisputes(disputes);
    return dispute;
  }

  async submitRebuttal(input: SubmitRebuttalInput): Promise<DisputeCase | undefined> {
    const disputes = await this.loadDisputes();
    const dispute = disputes.find((item) => item.id === input.disputeId);
    if (!dispute) return undefined;

    const rebuttal: DisputeRebuttal = {
      id: `RBT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      disputeId: input.disputeId,
      fromAgentId: input.fromAgentId,
      targetAgentId: input.targetAgentId,
      points: input.points,
      evidencePaths: input.evidencePaths ?? [],
      createdAt: new Date().toISOString(),
    };

    dispute.rebuttals.push(rebuttal);
    dispute.status = 'under-rebuttal';
    dispute.updatedAt = new Date().toISOString();

    await this.saveDisputes(disputes);
    return dispute;
  }

  async synthesizeFanIn(input: FanInInput): Promise<DisputeCase | undefined> {
    const disputes = await this.loadDisputes();
    const dispute = disputes.find((item) => item.id === input.disputeId);
    if (!dispute) return undefined;

    const strategy = input.strategy ?? 'evidence-weighted';
    const rebuttalPressureByAgent = new Map<string, number>();
    for (const rebuttal of dispute.rebuttals) {
      rebuttalPressureByAgent.set(
        rebuttal.targetAgentId,
        (rebuttalPressureByAgent.get(rebuttal.targetAgentId) ?? 0) + rebuttal.points.length
      );
    }

    const branchScores: FanInBranchScore[] = dispute.positions.map((position) => {
      const evidenceCount = position.evidencePaths?.length ?? 0;
      const rebuttalPressure = rebuttalPressureByAgent.get(position.agentId) ?? 0;
      const base = position.confidence;
      const evidenceBonus = strategy === 'evidence-weighted' ? evidenceCount * 0.04 : 0;
      const pressurePenalty = rebuttalPressure * 0.03;
      const score = round3(Math.max(0, Math.min(1, base + evidenceBonus - pressurePenalty)));

      return {
        agentId: position.agentId,
        score,
        confidence: position.confidence,
        evidenceCount,
        rebuttalPressure,
      };
    });

    branchScores.sort((left, right) => right.score - left.score);

    const winner = branchScores[0];
    const runnerUp = branchScores[1];
    const delta = winner && runnerUp ? winner.score - runnerUp.score : winner ? winner.score : 0;

    const unresolvedConflicts: string[] = [];
    if (branchScores.length > 1 && delta < 0.1) {
      unresolvedConflicts.push(
        'Top branch scores are too close for deterministic auto-resolution.'
      );
    }
    if (branchScores.some((branch) => branch.rebuttalPressure > 0 && branch.evidenceCount === 0)) {
      unresolvedConflicts.push(
        'At least one disputed branch lacks supporting evidence under rebuttal.'
      );
    }

    const consensusLevel: FanInSynthesisResult['consensusLevel'] =
      unresolvedConflicts.length > 0 ? 'low' : delta >= 0.2 ? 'high' : 'medium';

    const confidence = winner
      ? round3(Math.max(0, Math.min(1, winner.score - unresolvedConflicts.length * 0.05)))
      : 0;
    const selectedAgentId = unresolvedConflicts.length > 0 ? undefined : winner?.agentId;

    dispute.fanIn = {
      selectedAgentId,
      decisionSummary: selectedAgentId
        ? `Selected ${selectedAgentId} via ${strategy} fan-in scoring.`
        : 'Fan-in produced unresolved conflicts; governance review required.',
      confidence,
      consensusLevel,
      unresolvedConflicts,
      branchScores,
    };

    dispute.updatedAt = new Date().toISOString();

    await this.saveDisputes(disputes);
    return dispute;
  }

  async evaluateGovernance(input: GovernanceInput): Promise<DisputeCase | undefined> {
    const disputes = await this.loadDisputes();
    const dispute = disputes.find((item) => item.id === input.disputeId);
    if (!dispute) return undefined;

    const unresolved = dispute.fanIn?.unresolvedConflicts.length ?? 0;
    const blastRadius = input.blastRadius ?? 1;
    const highImpact = Boolean(input.highImpact);

    let riskLevel: GovernanceEvaluation['riskLevel'] = 'low';
    if (highImpact || unresolved > 0 || blastRadius >= 4) {
      riskLevel = 'high';
    } else if (blastRadius >= 2 || (dispute.fanIn?.consensusLevel ?? 'high') === 'medium') {
      riskLevel = 'medium';
    }

    const threshold = input.requireHumanApprovalAtOrAbove ?? 'high';
    const required = threshold === 'medium' ? riskLevel !== 'low' : riskLevel === 'high';

    dispute.governance = {
      required,
      riskLevel,
      reason: required
        ? 'Human approval required due to unresolved or high-impact divergence.'
        : 'Governance review not required for current divergence profile.',
      escalated: required,
      approvalsNeeded: required ? 1 : 0,
    };

    dispute.status = required ? 'escalated' : dispute.status;
    dispute.updatedAt = new Date().toISOString();

    await this.saveDisputes(disputes);
    return dispute;
  }

  async resolveDispute(input: ResolveDisputeInput): Promise<DisputeCase | undefined> {
    const disputes = await this.loadDisputes();
    const dispute = disputes.find((item) => item.id === input.disputeId);
    if (!dispute) return undefined;

    dispute.status = 'resolved';
    dispute.resolution = {
      selectedAgentId: input.selectedAgentId,
      summary: input.summary,
      resolvedAt: new Date().toISOString(),
      approvedBy: input.approvedBy,
    };
    dispute.updatedAt = new Date().toISOString();

    await this.saveDisputes(disputes);
    return dispute;
  }

  async listDisputes(filters?: {
    status?: DisputeCase['status'];
    correlationId?: string;
  }): Promise<DisputeCase[]> {
    const all = await this.loadDisputes();
    if (!filters) return all;

    return all.filter((item) => {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.correlationId && item.correlationId !== filters.correlationId) return false;
      return true;
    });
  }

  async getDispute(id: string): Promise<DisputeCase | undefined> {
    const all = await this.loadDisputes();
    return all.find((item) => item.id === id);
  }

  private toCandidate(
    agent: AgentRegistryEntry,
    requiredCapabilities: string[],
    input: CapabilityDiscoveryInput
  ): CapabilityDiscoveryCandidate {
    const matchedCapabilities = requiredCapabilities.filter((required) =>
      agent.capabilities.some((candidate) => candidate.toLowerCase().includes(required))
    );

    const capabilityScore = matchedCapabilities.length / requiredCapabilities.length;
    const successRateNormalized = agent.successRate / 100;
    const confidence = round3(capabilityScore * 0.7 + successRateNormalized * 0.3);

    return {
      agentId: agent.id,
      name: agent.name,
      matchedCapabilities,
      capabilityScore: round3(capabilityScore),
      successRate: round3(successRateNormalized),
      confidence,
      conflictCount: agent.conflictsWith.length,
      contested: (input.contestedAgentIds ?? []).includes(agent.id),
    };
  }

  private async loadDisputes(): Promise<DisputeCase[]> {
    try {
      const raw = this.ctx.store.readFile(this.disputesPath);
      const parsed = JSON.parse(raw) as DisputeCase[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveDisputes(disputes: DisputeCase[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.disputesPath, JSON.stringify(disputes, null, 2));
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function createA2ACoordinationService(ctx: ServiceContext): A2ACoordinationService {
  return new A2ACoordinationService(ctx);
}
