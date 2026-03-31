// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * SLA Prioritizer — M5-E1-I1
 *
 * Extends queue ordering with SLA urgency and risk factor weights.
 * Computes a composite priority score and detects SLA breach risk.
 *
 * Issue: #1467
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface SlaModel {
  /** ISO-8601 deadline timestamp */
  deadline: string;
  urgency: UrgencyLevel;
  /** Minutes before deadline to consider breach imminent */
  breachThresholdMinutes: number;
  /** Penalty multiplier applied to urgency score when breach is imminent */
  breachPenalty: number;
}

export interface RiskWeights {
  /** 0–1: potential business/system impact if this item fails */
  impactScore: number;
  /** 0–1: estimated probability of failure */
  failureProbability: number;
  /** minutes to recover if this item fails */
  recoveryTimeMinutes: number;
}

export interface QueueItem {
  id: string;
  workspaceId: string;
  title: string;
  sla?: SlaModel;
  risk?: RiskWeights;
  enqueuedAt: string;
}

export interface PrioritizedItem extends QueueItem {
  priorityScore: number;
  urgencyScore: number;
  riskScore: number;
  breachImminent: boolean;
  minutesToDeadline?: number;
}

export interface SlaBreachAlert {
  itemId: string;
  workspaceId: string;
  title: string;
  minutesToDeadline: number;
  urgency: UrgencyLevel;
  riskScore: number;
}

export interface PrioritizeQueueResult {
  ordered: PrioritizedItem[];
  breachAlerts: SlaBreachAlert[];
  computedAt: string;
}

// ─── Constants ───────────────────────────────────────────────

const URGENCY_BASE_SCORES: Record<UrgencyLevel, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 10,
};

// ─── Internal helpers ────────────────────────────────────────

function computeUrgencyScore(sla: SlaModel, nowMs: number): number {
  const base = URGENCY_BASE_SCORES[sla.urgency] ?? 10;
  const deadlineMs = new Date(sla.deadline).getTime();
  const minutesRemaining = (deadlineMs - nowMs) / 60_000;
  if (minutesRemaining <= 0) {
    // Already breached — maximum urgency
    return base * sla.breachPenalty;
  }
  if (minutesRemaining <= sla.breachThresholdMinutes) {
    return base * sla.breachPenalty;
  }
  // Decay as more time remains (capped at 0)
  const decayFactor = Math.max(0, 1 - minutesRemaining / (sla.breachThresholdMinutes * 4));
  return base * (1 + decayFactor);
}

function computeRiskScore(risk: RiskWeights): number {
  // Composite: impact and failure probability weighted most, recovery time secondary
  const composite =
    risk.impactScore * 50 +
    risk.failureProbability * 30 +
    Math.min(1, risk.recoveryTimeMinutes / 480) * 20;
  return Math.min(100, composite);
}

// ─── Service ─────────────────────────────────────────────────

export interface SlaQueuePrioritizerService {
  prioritizeQueue(items: QueueItem[]): PrioritizeQueueResult;
  computeItemPriority(item: QueueItem): PrioritizedItem;
}

export function createSlaQueuePrioritizerService(_ctx: ServiceContext): SlaQueuePrioritizerService {
  function computeItemPriority(item: QueueItem): PrioritizedItem {
    const nowMs = Date.now();

    const urgencyScore = item.sla ? computeUrgencyScore(item.sla, nowMs) : 0;
    const riskScore = item.risk ? computeRiskScore(item.risk) : 0;
    const priorityScore = urgencyScore * 0.6 + riskScore * 0.4;

    let breachImminent = false;
    let minutesToDeadline: number | undefined;

    if (item.sla) {
      const deadlineMs = new Date(item.sla.deadline).getTime();
      minutesToDeadline = (deadlineMs - nowMs) / 60_000;
      breachImminent =
        minutesToDeadline <= item.sla.breachThresholdMinutes || minutesToDeadline <= 0;
    }

    return {
      ...item,
      priorityScore,
      urgencyScore,
      riskScore,
      breachImminent,
      minutesToDeadline,
    };
  }

  function prioritizeQueue(items: QueueItem[]): PrioritizeQueueResult {
    const prioritized = items.map(computeItemPriority);
    // Descending priority score; ties broken by enqueue time (FIFO)
    prioritized.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
    });

    const breachAlerts: SlaBreachAlert[] = prioritized
      .filter((p) => p.breachImminent && p.sla)
      .map((p) => ({
        itemId: p.id,
        workspaceId: p.workspaceId,
        title: p.title,
        minutesToDeadline: Math.round(p.minutesToDeadline ?? 0),
        urgency: p.sla!.urgency,
        riskScore: p.riskScore,
      }));

    return {
      ordered: prioritized,
      breachAlerts,
      computedAt: new Date().toISOString(),
    };
  }

  return { prioritizeQueue, computeItemPriority };
}
