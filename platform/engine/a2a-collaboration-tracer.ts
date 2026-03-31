// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * A2A Collaboration Tracer — PATTERNS M2, Epic E4.3
 *
 * Records and exposes collaboration traces for every inter-agent
 * message exchange, making A2A activity observable on the dashboard
 * and queryable for audit purposes.
 *
 * Each trace captures: who sent what to whom, when, within which phase,
 * and the outcome (acknowledged, acted-upon, escalated).
 *
 * Source: Patterns/15-inter-agent-communication-a2a.md — Path To 9.9
 * Source: Patterns/19-evaluation-and-monitoring.md
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import type { A2AMessageType, A2AMessagePriority } from './a2a-messaging';

// ─── Types ────────────────────────────────────────────────────

export type CollaborationOutcome =
  | 'acknowledged'
  | 'acted-upon'
  | 'escalated'
  | 'expired'
  | 'pending';

export interface CollaborationTrace {
  id: string;
  messageId: string;
  correlationId: string;
  workflowId?: string;
  messageType: A2AMessageType;
  fromAgentId: string;
  toAgentId: string;
  phase?: string;
  sessionId?: string;
  workspaceId?: string;
  tracedAt: string;
  priority: A2AMessagePriority;
  outcome: CollaborationOutcome;
  outcomeAt?: string;
  latencyMs?: number;
  payloadSummary: string;
  evidenceCount: number;
  clarificationCount: number;
  rebuttalCount: number;
  tags: string[];
}

export interface CollaborationSummary {
  totalMessages: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byPhase: Record<string, number>;
  topCollaboratorPairs: Array<{
    fromAgentId: string;
    toAgentId: string;
    count: number;
  }>;
  avgLatencyMs: number;
  pendingCount: number;
  escalatedCount: number;
  startedAt: string;
  endedAt: string;
}

export interface CollaborationTraceInput {
  messageId: string;
  correlationId: string;
  workflowId?: string;
  messageType: A2AMessageType;
  fromAgentId: string;
  toAgentId: string;
  phase?: string;
  sessionId?: string;
  workspaceId?: string;
  priority?: A2AMessagePriority;
  payloadSummary: string;
  evidencePaths?: string[];
  clarificationQuestions?: string[];
  rebuttalPoints?: string[];
  tags?: string[];
}

export interface TraceOutcomeInput {
  traceId: string;
  outcome: CollaborationOutcome;
  latencyMs?: number;
}

export type CoordinationState =
  | 'dispute-opened'
  | 'awaiting-rebuttal'
  | 'rebuttal-submitted'
  | 'fan-in-synthesized'
  | 'governance-review-required'
  | 'governance-approved'
  | 'resolved'
  | 'escalated';

export interface CoordinationStateTransition {
  id: string;
  disputeId: string;
  correlationId: string;
  fromState?: CoordinationState;
  toState: CoordinationState;
  reason?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  initiatedBy?: string;
  approvals?: string[];
  transitionedAt: string;
}

export interface CoordinationStateTransitionInput {
  disputeId: string;
  correlationId: string;
  fromState?: CoordinationState;
  toState: CoordinationState;
  reason?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  initiatedBy?: string;
  approvals?: string[];
}

// ─── Service ──────────────────────────────────────────────────

export class A2ACollaborationTracer {
  private ctx: ServiceContext;
  private tracesPath = 'BusinessDocs/reasoning-collaboration/collaboration-traces.jsonl';
  private transitionsPath =
    'BusinessDocs/reasoning-collaboration/collaboration-state-transitions.jsonl';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Record a collaboration trace for an A2A message.
   */
  async recordTrace(input: CollaborationTraceInput): Promise<CollaborationTrace> {
    const trace: CollaborationTrace = {
      id: `TRC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      messageId: input.messageId,
      correlationId: input.correlationId,
      workflowId: input.workflowId,
      messageType: input.messageType,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      phase: input.phase,
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      tracedAt: new Date().toISOString(),
      priority: input.priority ?? 'normal',
      outcome: 'pending',
      payloadSummary: input.payloadSummary,
      evidenceCount: input.evidencePaths?.length ?? 0,
      clarificationCount: input.clarificationQuestions?.length ?? 0,
      rebuttalCount: input.rebuttalPoints?.length ?? 0,
      tags: input.tags ?? [],
    };

    await this.appendTrace(trace);
    return trace;
  }

  /**
   * Update the outcome of a trace (called when the target agent acknowledges,
   * acts on, or escalates a message).
   */
  async updateOutcome(input: TraceOutcomeInput): Promise<CollaborationTrace | undefined> {
    const traces = await this.loadTraces();
    const trace = traces.find((t) => t.id === input.traceId);
    if (!trace) return undefined;

    trace.outcome = input.outcome;
    trace.outcomeAt = new Date().toISOString();
    if (input.latencyMs !== undefined) trace.latencyMs = input.latencyMs;

    await this.saveTraces(traces);
    return trace;
  }

  /**
   * List traces with optional filters.
   */
  async listTraces(filters?: {
    fromAgentId?: string;
    toAgentId?: string;
    correlationId?: string;
    phase?: string;
    outcome?: CollaborationOutcome;
    messageType?: A2AMessageType;
    sessionId?: string;
    workspaceId?: string;
  }): Promise<CollaborationTrace[]> {
    const all = await this.loadTraces();
    if (!filters) return all;

    return all.filter((t) => {
      if (filters.fromAgentId && t.fromAgentId !== filters.fromAgentId) return false;
      if (filters.toAgentId && t.toAgentId !== filters.toAgentId) return false;
      if (filters.correlationId && t.correlationId !== filters.correlationId) return false;
      if (filters.phase && t.phase !== filters.phase) return false;
      if (filters.outcome && t.outcome !== filters.outcome) return false;
      if (filters.messageType && t.messageType !== filters.messageType) return false;
      if (filters.sessionId && t.sessionId !== filters.sessionId) return false;
      if (filters.workspaceId && t.workspaceId !== filters.workspaceId) return false;
      return true;
    });
  }

  async getTrace(id: string): Promise<CollaborationTrace | undefined> {
    const all = await this.loadTraces();
    return all.find((t) => t.id === id);
  }

  /**
   * Compute an aggregated collaboration summary for a time window.
   */
  async computeSummary(since?: string, until?: string): Promise<CollaborationSummary> {
    let traces = await this.loadTraces();

    if (since) {
      const sinceMs = new Date(since).getTime();
      traces = traces.filter((t) => new Date(t.tracedAt).getTime() >= sinceMs);
    }
    if (until) {
      const untilMs = new Date(until).getTime();
      traces = traces.filter((t) => new Date(t.tracedAt).getTime() <= untilMs);
    }

    if (traces.length === 0) {
      const now = new Date().toISOString();
      return {
        totalMessages: 0,
        byType: {},
        byOutcome: {},
        byPhase: {},
        topCollaboratorPairs: [],
        avgLatencyMs: 0,
        pendingCount: 0,
        escalatedCount: 0,
        startedAt: now,
        endedAt: now,
      };
    }

    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    const pairCounts: Record<string, number> = {};
    let totalLatency = 0;
    let latencyCount = 0;

    for (const t of traces) {
      byType[t.messageType] = (byType[t.messageType] ?? 0) + 1;
      byOutcome[t.outcome] = (byOutcome[t.outcome] ?? 0) + 1;
      if (t.phase) byPhase[t.phase] = (byPhase[t.phase] ?? 0) + 1;

      const pairKey = `${t.fromAgentId}→${t.toAgentId}`;
      pairCounts[pairKey] = (pairCounts[pairKey] ?? 0) + 1;

      if (t.latencyMs !== undefined) {
        totalLatency += t.latencyMs;
        latencyCount++;
      }
    }

    const topCollaboratorPairs = Object.entries(pairCounts)
      .map(([key, count]) => {
        const [fromAgentId, toAgentId] = key.split('→');
        return { fromAgentId, toAgentId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const sortedByTime = [...traces].sort(
      (a, b) => new Date(a.tracedAt).getTime() - new Date(b.tracedAt).getTime()
    );

    return {
      totalMessages: traces.length,
      byType,
      byOutcome,
      byPhase,
      topCollaboratorPairs,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      pendingCount: byOutcome['pending'] ?? 0,
      escalatedCount: byOutcome['escalated'] ?? 0,
      startedAt: sortedByTime[0].tracedAt,
      endedAt: sortedByTime[sortedByTime.length - 1].tracedAt,
    };
  }

  /**
   * Record coordination state transitions for conflict resolution workflows.
   */
  async recordCoordinationStateTransition(
    input: CoordinationStateTransitionInput
  ): Promise<CoordinationStateTransition> {
    const transition: CoordinationStateTransition = {
      id: `CTS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      disputeId: input.disputeId,
      correlationId: input.correlationId,
      fromState: input.fromState,
      toState: input.toState,
      reason: input.reason,
      riskLevel: input.riskLevel,
      initiatedBy: input.initiatedBy,
      approvals: input.approvals ?? [],
      transitionedAt: new Date().toISOString(),
    };

    await this.appendTransition(transition);
    return transition;
  }

  async listCoordinationStateTransitions(filters?: {
    disputeId?: string;
    correlationId?: string;
    toState?: CoordinationState;
    riskLevel?: 'low' | 'medium' | 'high';
  }): Promise<CoordinationStateTransition[]> {
    const all = await this.loadTransitions();
    if (!filters) return all;

    return all.filter((transition) => {
      if (filters.disputeId && transition.disputeId !== filters.disputeId) return false;
      if (filters.correlationId && transition.correlationId !== filters.correlationId) return false;
      if (filters.toState && transition.toState !== filters.toState) return false;
      if (filters.riskLevel && transition.riskLevel !== filters.riskLevel) return false;
      return true;
    });
  }

  // ─── Private helpers ──────────────────────────────────────

  private async loadTraces(): Promise<CollaborationTrace[]> {
    try {
      const raw = this.ctx.store.readFile(this.tracesPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as CollaborationTrace);
    } catch {
      return [];
    }
  }

  private async appendTrace(trace: CollaborationTrace): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.tracesPath);
      this.ctx.store.writeFile(this.tracesPath, existing + '\n' + JSON.stringify(trace));
    } catch {
      this.ctx.store.writeFile(this.tracesPath, JSON.stringify(trace));
    }
  }

  private async saveTraces(traces: CollaborationTrace[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.tracesPath, traces.map((t) => JSON.stringify(t)).join('\n'));
  }

  private async loadTransitions(): Promise<CoordinationStateTransition[]> {
    try {
      const raw = this.ctx.store.readFile(this.transitionsPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as CoordinationStateTransition);
    } catch {
      return [];
    }
  }

  private async appendTransition(transition: CoordinationStateTransition): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.transitionsPath);
      this.ctx.store.writeFile(this.transitionsPath, existing + '\n' + JSON.stringify(transition));
    } catch {
      this.ctx.store.writeFile(this.transitionsPath, JSON.stringify(transition));
    }
  }
}

export function createA2ACollaborationTracer(ctx: ServiceContext): A2ACollaborationTracer {
  return new A2ACollaborationTracer(ctx);
}
