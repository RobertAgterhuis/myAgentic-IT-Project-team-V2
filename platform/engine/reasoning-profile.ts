// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Reasoning Profile Service — PATTERNS M2, Epic E3.1
 *
 * Provides explicit reasoning profiles (fast, critique-first, debate,
 * verification-heavy) and selects the appropriate profile at invocation time
 * based on task complexity, uncertainty, and historical success rate.
 *
 * Source: Patterns/17-reasoning-techniques.md — Path To 9.9
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type ReasoningStrategy = 'fast' | 'critique-first' | 'debate' | 'verification-heavy';

export interface ReasoningProfile {
  id: string;
  strategy: ReasoningStrategy;
  description: string;
  selectionCriteria: {
    taskComplexityMin?: number;
    uncertaintyThreshold?: number;
    applicablePhases?: string[];
    applicableAgentIds?: string[];
    highRiskDeliverable?: boolean;
  };
  promptDirectives: {
    systemPrefix?: string;
    chainOfThoughtDepth: 'minimal' | 'standard' | 'deep';
    selfCritiqueEnabled: boolean;
    debateRounds: number;
    verifierEnabled: boolean;
  };
  performanceHistory: {
    sampleCount: number;
    successRate: number;
    avgQualityScore: number;
    lastUpdated: string;
  };
}

export interface ProfileSelectionInput {
  agentId: string;
  phase?: string;
  taskComplexity?: number;
  uncertainty?: number;
  isHighRiskDeliverable?: boolean;
  overrideProfileId?: string;
}

export interface ProfileSelectionResult {
  profileId: string;
  strategy: ReasoningStrategy;
  systemPrefix: string;
  chainOfThoughtDepth: 'minimal' | 'standard' | 'deep';
  selfCritiqueEnabled: boolean;
  debateRounds: number;
  verifierEnabled: boolean;
  selectionReason: string;
}

export interface ProfileUpdateInput {
  profileId: string;
  qualityScore: number;
  success: boolean;
}

// ─── Built-in profiles ────────────────────────────────────────

const BUILT_IN_PROFILES: ReasoningProfile[] = [
  {
    id: 'fast',
    strategy: 'fast',
    description: 'Minimal reasoning overhead — use for low-risk, well-scoped tasks.',
    selectionCriteria: {
      taskComplexityMin: 0,
      uncertaintyThreshold: 0,
      applicablePhases: [],
      applicableAgentIds: [],
      highRiskDeliverable: false,
    },
    promptDirectives: {
      systemPrefix: 'Respond concisely. Skip extended chain-of-thought steps. Prioritize speed.',
      chainOfThoughtDepth: 'minimal',
      selfCritiqueEnabled: false,
      debateRounds: 0,
      verifierEnabled: false,
    },
    performanceHistory: {
      sampleCount: 0,
      successRate: 0,
      avgQualityScore: 0,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'critique-first',
    strategy: 'critique-first',
    description:
      'Internal critique pass before final answer — balanced accuracy/speed for moderate-complexity tasks.',
    selectionCriteria: {
      taskComplexityMin: 0.4,
      uncertaintyThreshold: 0.3,
      applicablePhases: ['PHASE_1', 'PHASE_3', 'PHASE_4'],
      applicableAgentIds: ['01', '02', '03', '04', '10', '11', '12', '34'],
      highRiskDeliverable: false,
    },
    promptDirectives: {
      systemPrefix:
        'Before reaching your final conclusion, conduct a brief internal critique: identify any assumptions, gaps, or contradictions. Revise as needed before delivering your answer.',
      chainOfThoughtDepth: 'standard',
      selfCritiqueEnabled: true,
      debateRounds: 0,
      verifierEnabled: false,
    },
    performanceHistory: {
      sampleCount: 0,
      successRate: 0,
      avgQualityScore: 0,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'debate',
    strategy: 'debate',
    description:
      'Explicit pro/con debate rounds before committing to a position — for high-stakes decisions with competing options.',
    selectionCriteria: {
      taskComplexityMin: 0.6,
      uncertaintyThreshold: 0.5,
      applicablePhases: ['PHASE_1', 'PHASE_2', 'CRITIC_RISK', 'SYNTHESIS'],
      applicableAgentIds: ['05', '08', '17', '18', '19', '34'],
      highRiskDeliverable: false,
    },
    promptDirectives: {
      systemPrefix:
        'Use structured debate reasoning: present the strongest case FOR the proposed approach, then the strongest case AGAINST, then synthesize a final justified recommendation. Show your work explicitly.',
      chainOfThoughtDepth: 'deep',
      selfCritiqueEnabled: true,
      debateRounds: 2,
      verifierEnabled: false,
    },
    performanceHistory: {
      sampleCount: 0,
      successRate: 0,
      avgQualityScore: 0,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'verification-heavy',
    strategy: 'verification-heavy',
    description:
      'Verifier-assisted reasoning for architecture, security, synthesis, and legal outputs.',
    selectionCriteria: {
      taskComplexityMin: 0.5,
      uncertaintyThreshold: 0.4,
      applicablePhases: ['PHASE_2', 'CRITIC_RISK', 'SYNTHESIS', 'PHASE_5_EXECUTING'],
      applicableAgentIds: ['05', '06', '07', '08', '09', '17', '22', '33', '38'],
      highRiskDeliverable: true,
    },
    promptDirectives: {
      systemPrefix:
        'Apply deep chain-of-thought reasoning. After producing your answer, perform an explicit verification sweep: check all factual claims, internal consistency, completeness against contract sections, and HANDOFF CHECKLIST items. Document any gaps found.',
      chainOfThoughtDepth: 'deep',
      selfCritiqueEnabled: true,
      debateRounds: 0,
      verifierEnabled: true,
    },
    performanceHistory: {
      sampleCount: 0,
      successRate: 0,
      avgQualityScore: 0,
      lastUpdated: new Date().toISOString(),
    },
  },
];

// ─── Service ──────────────────────────────────────────────────

export class ReasoningProfileService {
  private ctx: ServiceContext;
  private profilesPath = 'BusinessDocs/reasoning-collaboration/reasoning-profiles.json';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  // ─── Public API ───────────────────────────────────────────

  async listProfiles(): Promise<ReasoningProfile[]> {
    return this.loadProfiles();
  }

  async getProfile(id: string): Promise<ReasoningProfile | undefined> {
    const profiles = await this.loadProfiles();
    return profiles.find((p) => p.id === id);
  }

  /**
   * Select the best reasoning profile for a given invocation context.
   * Order of precedence:
   *  1. Explicit override (overrideProfileId)
   *  2. Agent-specific assignment
   *  3. High-risk deliverable → verification-heavy
   *  4. Complexity/uncertainty thresholds
   *  5. Phase assignment
   *  6. Fallback: fast
   */
  async selectProfile(input: ProfileSelectionInput): Promise<ProfileSelectionResult> {
    const profiles = await this.loadProfiles();

    let chosen: ReasoningProfile | undefined;
    let reason: string;

    // 1. Explicit override
    if (input.overrideProfileId) {
      chosen = profiles.find((p) => p.id === input.overrideProfileId);
      reason = `explicit override: ${input.overrideProfileId}`;
    }

    // 2. Agent assignment
    if (!chosen) {
      chosen = profiles.find(
        (p) =>
          p.selectionCriteria.applicableAgentIds?.includes(input.agentId) &&
          !p.selectionCriteria.highRiskDeliverable
      );
      if (chosen) reason = `agent assignment for agent ${input.agentId}`;
    }

    // 3. High-risk deliverable
    if (!chosen && input.isHighRiskDeliverable) {
      chosen = profiles.find((p) => p.selectionCriteria.highRiskDeliverable === true);
      reason = 'high-risk deliverable flag';
    }

    // 4. Complexity + uncertainty
    if (!chosen) {
      const complexity = input.taskComplexity ?? 0;
      const uncertainty = input.uncertainty ?? 0;

      // Select highest-threshold profile that passes
      const eligible = profiles
        .filter((p) => {
          const minC = p.selectionCriteria.taskComplexityMin ?? 0;
          const minU = p.selectionCriteria.uncertaintyThreshold ?? 0;
          return complexity >= minC && uncertainty >= minU;
        })
        .sort(
          (a, b) =>
            (b.selectionCriteria.taskComplexityMin ?? 0) -
            (a.selectionCriteria.taskComplexityMin ?? 0)
        );

      if (eligible.length > 0) {
        chosen = eligible[0];
        reason = `complexity=${complexity.toFixed(2)}, uncertainty=${uncertainty.toFixed(2)}`;
      }
    }

    // 5. Phase assignment
    if (!chosen && input.phase) {
      chosen = profiles.find((p) => p.selectionCriteria.applicablePhases?.includes(input.phase!));
      if (chosen) reason = `phase assignment for ${input.phase}`;
    }

    // 6. Fallback
    if (!chosen) {
      chosen = profiles.find((p) => p.id === 'fast')!;
      reason = 'fallback: no specific criteria matched';
    }

    return {
      profileId: chosen.id,
      strategy: chosen.strategy,
      systemPrefix: chosen.promptDirectives.systemPrefix ?? '',
      chainOfThoughtDepth: chosen.promptDirectives.chainOfThoughtDepth,
      selfCritiqueEnabled: chosen.promptDirectives.selfCritiqueEnabled,
      debateRounds: chosen.promptDirectives.debateRounds,
      verifierEnabled: chosen.promptDirectives.verifierEnabled,
      selectionReason: reason!,
    };
  }

  /**
   * Update the performance history of a profile after an invocation.
   * Used for adaptive profile selection.
   */
  async updatePerformanceHistory(input: ProfileUpdateInput): Promise<void> {
    const profiles = await this.loadProfiles();
    const profile = profiles.find((p) => p.id === input.profileId);
    if (!profile) return;

    const h = profile.performanceHistory;
    const samples = h.sampleCount;
    h.successRate = (h.successRate * samples + (input.success ? 1 : 0)) / (samples + 1);
    h.avgQualityScore = (h.avgQualityScore * samples + input.qualityScore) / (samples + 1);
    h.sampleCount = samples + 1;
    h.lastUpdated = new Date().toISOString();

    await this.saveProfiles(profiles);
  }

  // ─── Private helpers ──────────────────────────────────────

  private async loadProfiles(): Promise<ReasoningProfile[]> {
    try {
      const raw = this.ctx.store.readFile(this.profilesPath);
      const parsed = JSON.parse(raw) as ReasoningProfile[];
      // Merge with built-ins so new built-ins are always present
      const ids = new Set(parsed.map((p) => p.id));
      for (const builtin of BUILT_IN_PROFILES) {
        if (!ids.has(builtin.id)) parsed.push(builtin);
      }
      return parsed;
    } catch {
      return [...BUILT_IN_PROFILES];
    }
  }

  private async saveProfiles(profiles: ReasoningProfile[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));
  }
}

export function createReasoningProfileService(ctx: ServiceContext): ReasoningProfileService {
  return new ReasoningProfileService(ctx);
}
