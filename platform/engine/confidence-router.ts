// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Confidence Router — M5-E1-I2
 *
 * Selects the orchestrator execution mode (SDLC_ONLY | AGENCY_ONLY | HYBRID)
 * based on calibrated confidence and risk thresholds.
 *
 * Issue: #1469
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import type { ExecutionMode } from './execution-mode';

// ─── Types ────────────────────────────────────────────────────

export type TaskType = 'feature' | 'hotfix' | 'audit' | 'research' | 'deployment' | 'generic';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RoutingPolicy {
  /** Minimum confidence score (0–1) required to use SDLC_ONLY */
  sdlcOnlyMinConfidence: number;
  /** Maximum risk level that allows SDLC_ONLY without agency augmentation */
  sdlcOnlyMaxRisk: RiskLevel;
  /** Minimum confidence score required to allow HYBRID */
  hybridMinConfidence: number;
  /** Risk level at or above which AGENCY_ONLY is forced regardless of confidence */
  agencyOnlyMinRisk: RiskLevel;
}

export interface ConfidenceRoutingInput {
  confidenceScore: number;
  riskLevel: RiskLevel;
  taskType: TaskType;
  /** Optional override policy; uses default if omitted */
  policy?: Partial<RoutingPolicy>;
}

export interface ConfidenceRoutingResult {
  mode: ExecutionMode;
  confidenceScore: number;
  riskLevel: RiskLevel;
  rationale: string[];
  policyApplied: RoutingPolicy;
}

// ─── Default policy ───────────────────────────────────────────

export const DEFAULT_ROUTING_POLICY: RoutingPolicy = {
  sdlcOnlyMinConfidence: 0.75,
  sdlcOnlyMaxRisk: 'medium',
  hybridMinConfidence: 0.5,
  agencyOnlyMinRisk: 'critical',
};

// ─── Risk ordering ────────────────────────────────────────────

const RISK_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function riskAtOrAbove(level: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_ORDER[level] >= RISK_ORDER[threshold];
}

// ─── Service ─────────────────────────────────────────────────

export interface ConfidenceRouterService {
  routeExecution(input: ConfidenceRoutingInput): ConfidenceRoutingResult;
  getDefaultPolicy(): RoutingPolicy;
}

export function createConfidenceRouterService(_ctx: ServiceContext): ConfidenceRouterService {
  function getDefaultPolicy(): RoutingPolicy {
    return { ...DEFAULT_ROUTING_POLICY };
  }

  function routeExecution(input: ConfidenceRoutingInput): ConfidenceRoutingResult {
    const policy: RoutingPolicy = {
      ...DEFAULT_ROUTING_POLICY,
      ...input.policy,
    };

    const rationale: string[] = [];
    let mode: ExecutionMode;

    // Rule 1: critical risk always forces AGENCY_ONLY for direct specialist handling
    if (riskAtOrAbove(input.riskLevel, policy.agencyOnlyMinRisk)) {
      mode = 'AGENCY_ONLY';
      rationale.push(
        `Risk level '${input.riskLevel}' meets AGENCY_ONLY threshold '${policy.agencyOnlyMinRisk}' — routing to agency specialists.`
      );
    }
    // Rule 2: hotfix task type bypasses SDLC phases regardless
    else if (input.taskType === 'hotfix') {
      mode = 'AGENCY_ONLY';
      rationale.push('Task type hotfix bypasses SDLC phases — routing directly to agency.');
    }
    // Rule 3: sufficient confidence + acceptable risk → pure SDLC
    else if (
      input.confidenceScore >= policy.sdlcOnlyMinConfidence &&
      !riskAtOrAbove(input.riskLevel, 'high')
    ) {
      mode = 'SDLC_ONLY';
      rationale.push(
        `Confidence ${input.confidenceScore.toFixed(2)} ≥ ${policy.sdlcOnlyMinConfidence} and risk '${input.riskLevel}' ≤ '${policy.sdlcOnlyMaxRisk}' — using SDLC_ONLY.`
      );
    }
    // Rule 4: moderate confidence → HYBRID augmentation
    else if (input.confidenceScore >= policy.hybridMinConfidence) {
      mode = 'HYBRID';
      const reason =
        input.confidenceScore < policy.sdlcOnlyMinConfidence
          ? `Confidence ${input.confidenceScore.toFixed(2)} below SDLC_ONLY threshold ${policy.sdlcOnlyMinConfidence}`
          : `Risk '${input.riskLevel}' elevates to HYBRID`;
      rationale.push(`${reason} — using HYBRID mode with agency augmentation.`);
    }
    // Rule 5: low confidence → AGENCY_ONLY
    else {
      mode = 'AGENCY_ONLY';
      rationale.push(
        `Confidence ${input.confidenceScore.toFixed(2)} below HYBRID threshold ${policy.hybridMinConfidence} — routing to AGENCY_ONLY.`
      );
    }

    // Task-type advisory notes
    if (input.taskType === 'audit' && mode !== 'AGENCY_ONLY') {
      rationale.push(
        'Audit task type: consider dedicated security/compliance agents in HYBRID mode.'
      );
    }
    if (input.taskType === 'deployment' && mode === 'SDLC_ONLY') {
      rationale.push('Deployment task: deployment confidence lane will be applied.');
    }

    return {
      mode,
      confidenceScore: input.confidenceScore,
      riskLevel: input.riskLevel,
      rationale,
      policyApplied: policy,
    };
  }

  return { routeExecution, getDefaultPolicy };
}
