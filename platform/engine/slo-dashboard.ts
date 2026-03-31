// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * SLO Dashboard — M5-E2-I3
 *
 * Publishes latency, readiness, and breach indicators for orchestration
 * and release readiness. Computes SLO snapshots from recorded span events.
 *
 * Issue: #1477
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type SloIndicatorType =
  | 'latency'
  | 'error-rate'
  | 'throughput'
  | 'availability'
  | 'release-readiness';

export interface SloTarget {
  indicator: SloIndicatorType;
  /** Description of the SLO target */
  description: string;
  /** Target threshold value */
  targetValue: number;
  /** Unit of the threshold (e.g. 'ms', '%', 'req/s') */
  unit: string;
  /** Direction: 'below' means value must be below target, 'above' means must be above */
  direction: 'below' | 'above';
}

export interface SloSpanEvent {
  id: string;
  workspaceId?: string;
  releaseId?: string;
  indicator: SloIndicatorType;
  value: number;
  unit: string;
  recordedAt: string;
  tags?: Record<string, string>;
}

export interface SloMetric {
  indicator: SloIndicatorType;
  current: number;
  target: number;
  unit: string;
  breached: boolean;
  /** Percentage of sampled windows in compliance */
  complianceRate: number;
  sampleCount: number;
  direction: 'below' | 'above';
}

export interface SloBreachIndicator {
  indicator: SloIndicatorType;
  current: number;
  target: number;
  unit: string;
  severity: 'warning' | 'critical';
  detectedAt: string;
  workspaceId?: string;
  releaseId?: string;
}

export interface OrchestrationReadiness {
  score: number;
  level: 'green' | 'yellow' | 'red';
  breachedIndicators: SloIndicatorType[];
  summary: string;
}

export interface SloSnapshot {
  workspaceId?: string;
  releaseId?: string;
  metrics: SloMetric[];
  breachIndicators: SloBreachIndicator[];
  orchestrationReadiness: OrchestrationReadiness;
  computedAt: string;
}

export interface RecordSpanEventInput {
  workspaceId?: string;
  releaseId?: string;
  indicator: SloIndicatorType;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

// ─── Default SLO targets ─────────────────────────────────────

export const DEFAULT_SLO_TARGETS: SloTarget[] = [
  {
    indicator: 'latency',
    description: 'P99 orchestration response latency',
    targetValue: 3000,
    unit: 'ms',
    direction: 'below',
  },
  {
    indicator: 'error-rate',
    description: 'Orchestration pipeline error rate',
    targetValue: 5,
    unit: '%',
    direction: 'below',
  },
  {
    indicator: 'throughput',
    description: 'Minimum orchestration throughput',
    targetValue: 10,
    unit: 'req/min',
    direction: 'above',
  },
  {
    indicator: 'availability',
    description: 'Orchestration service availability',
    targetValue: 99.5,
    unit: '%',
    direction: 'above',
  },
  {
    indicator: 'release-readiness',
    description: 'Release evidence completeness score',
    targetValue: 90,
    unit: '%',
    direction: 'above',
  },
];

const SPANS_PATH = 'BusinessDocs/deployment/slo-spans.jsonl';

// ─── Service ─────────────────────────────────────────────────

export interface SloDashboardService {
  recordSpanEvent(input: RecordSpanEventInput): SloSpanEvent;
  computeSnapshot(workspaceId?: string, releaseId?: string): SloSnapshot;
  listBreachIndicators(workspaceId?: string): SloBreachIndicator[];
  getDefaultTargets(): SloTarget[];
}

export function createSloDashboardService(ctx: ServiceContext): SloDashboardService {
  function loadSpans(): SloSpanEvent[] {
    if (!ctx.store.exists(SPANS_PATH)) return [];
    try {
      const lines = ctx.store.readFile(SPANS_PATH).split('\n').filter(Boolean);
      return lines.map((l) => JSON.parse(l) as SloSpanEvent);
    } catch {
      return [];
    }
  }

  function appendSpan(span: SloSpanEvent): void {
    const existing = ctx.store.exists(SPANS_PATH) ? ctx.store.readFile(SPANS_PATH) : '';
    ctx.store.writeFile(SPANS_PATH, existing + JSON.stringify(span) + '\n');
  }

  function getDefaultTargets(): SloTarget[] {
    return [...DEFAULT_SLO_TARGETS];
  }

  function recordSpanEvent(input: RecordSpanEventInput): SloSpanEvent {
    const span: SloSpanEvent = {
      id: `SPAN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: input.workspaceId,
      releaseId: input.releaseId,
      indicator: input.indicator,
      value: input.value,
      unit: input.unit,
      recordedAt: new Date().toISOString(),
      tags: input.tags,
    };
    appendSpan(span);
    return span;
  }

  function computeSnapshot(workspaceId?: string, releaseId?: string): SloSnapshot {
    const allSpans = loadSpans();
    const spans = allSpans.filter(
      (s) =>
        (!workspaceId || s.workspaceId === workspaceId) && (!releaseId || s.releaseId === releaseId)
    );

    const metrics: SloMetric[] = DEFAULT_SLO_TARGETS.map((target) => {
      const samples = spans.filter((s) => s.indicator === target.indicator);
      if (samples.length === 0) {
        return {
          indicator: target.indicator,
          current: 0,
          target: target.targetValue,
          unit: target.unit,
          breached: false,
          complianceRate: 1,
          sampleCount: 0,
          direction: target.direction,
        };
      }

      const latest = samples[samples.length - 1].value;
      const compliant = samples.filter((s) =>
        target.direction === 'below' ? s.value <= target.targetValue : s.value >= target.targetValue
      );
      const complianceRate = compliant.length / samples.length;
      const breached =
        target.direction === 'below' ? latest > target.targetValue : latest < target.targetValue;

      return {
        indicator: target.indicator,
        current: latest,
        target: target.targetValue,
        unit: target.unit,
        breached,
        complianceRate,
        sampleCount: samples.length,
        direction: target.direction,
      };
    });

    const now = new Date().toISOString();
    const breachIndicators: SloBreachIndicator[] = metrics
      .filter((m) => m.breached)
      .map((m) => {
        const deviation =
          m.direction === 'below'
            ? (m.current - m.target) / m.target
            : (m.target - m.current) / m.target;
        return {
          indicator: m.indicator,
          current: m.current,
          target: m.target,
          unit: m.unit,
          severity: deviation > 0.2 ? 'critical' : 'warning',
          detectedAt: now,
          workspaceId,
          releaseId,
        };
      });

    const breachedCount = breachIndicators.length;
    const criticalCount = breachIndicators.filter((b) => b.severity === 'critical').length;
    const score = Math.max(0, 100 - breachedCount * 20 - criticalCount * 10);
    const level: 'green' | 'yellow' | 'red' =
      criticalCount > 0 ? 'red' : breachedCount > 0 ? 'yellow' : 'green';

    const orchestrationReadiness: OrchestrationReadiness = {
      score,
      level,
      breachedIndicators: breachIndicators.map((b) => b.indicator),
      summary:
        level === 'green'
          ? 'All SLO targets met — orchestration ready.'
          : level === 'yellow'
            ? `${breachedCount} SLO indicator(s) breached — review recommended.`
            : `${criticalCount} critical SLO breach(es) — orchestration not ready.`,
    };

    return {
      workspaceId,
      releaseId,
      metrics,
      breachIndicators,
      orchestrationReadiness,
      computedAt: now,
    };
  }

  function listBreachIndicators(workspaceId?: string): SloBreachIndicator[] {
    return computeSnapshot(workspaceId).breachIndicators;
  }

  return { recordSpanEvent, computeSnapshot, listBreachIndicators, getDefaultTargets };
}
