// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Self-Revision Service — PATTERNS M2, Epic E3.3
 *
 * Applies a selective self-revision pass to an agent's output before handoff.
 * Triggered when a verifier pass returns findings, or when the reasoning profile
 * has selfCritiqueEnabled = true and the deliverable quality score is below threshold.
 *
 * The service records revision events so they are traceable for audit purposes.
 *
 * Source: Patterns/17-reasoning-techniques.md — Path To 9.9
 * Source: templates/sdlc/agents/00-orchestrator.md — handoff discipline
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import type { VerifierFinding } from './verifier-pass';

// ─── Types ────────────────────────────────────────────────────

export type RevisionTrigger = 'verifier-findings' | 'quality-below-threshold' | 'manual';
export type RevisionLifecycleStatus = 'requested' | 'applied' | 'succeeded' | 'escalated';

export interface SelfRevisionRequest {
  agentId: string;
  deliverableSource: string;
  originalContent: string;
  trigger: RevisionTrigger;
  verifierFindings?: VerifierFinding[];
  qualityScore?: number;
  qualityThreshold?: number;
}

export interface SelfRevisionInstruction {
  heading: string;
  directive: string;
}

export interface SelfRevisionEvent {
  id: string;
  agentId: string;
  deliverableSource: string;
  trigger: RevisionTrigger;
  requestedAt: string;
  status: RevisionLifecycleStatus;
  instructions: SelfRevisionInstruction[];
  findingsAddressed: string[];
  estimatedImpact: 'high' | 'medium' | 'low';
  applied: boolean;
  appliedAt?: string;
  succeededAt?: string;
  escalatedAt?: string;
  summary?: string;
  terminalReason?: string;
}

function normalizeQualityPercent(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value <= 1 ? value * 100 : value;
}

// ─── Service ──────────────────────────────────────────────────

export class SelfRevisionService {
  private ctx: ServiceContext;
  private eventsPath = 'BusinessDocs/reasoning-collaboration/self-revision-events.jsonl';

  /** Minimum quality score that triggers self-revision when selfCritiqueEnabled. */
  readonly DEFAULT_QUALITY_THRESHOLD = 75;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Evaluate whether a self-revision is needed, and if so, produce
   * a structured set of revision instructions.
   *
   * Returns null if no revision is warranted.
   */
  async evaluateRevisionNeed(request: SelfRevisionRequest): Promise<SelfRevisionEvent | null> {
    const findings = request.verifierFindings ?? [];
    const qualityScore = normalizeQualityPercent(request.qualityScore, 100);
    const qualityThreshold = normalizeQualityPercent(
      request.qualityThreshold,
      this.DEFAULT_QUALITY_THRESHOLD
    );

    const actionableFindings = findings.filter((f) =>
      ['critical', 'high', 'medium'].includes(f.severity)
    );

    const qualityFail = qualityScore < qualityThreshold;

    if (actionableFindings.length === 0 && !qualityFail && request.trigger !== 'manual') {
      return null;
    }

    const instructions = this.buildInstructions(
      actionableFindings,
      qualityFail,
      qualityScore,
      qualityThreshold
    );
    const estimatedImpact = this.estimateImpact(actionableFindings, qualityFail);

    const event: SelfRevisionEvent = {
      id: `SRE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentId: request.agentId,
      deliverableSource: request.deliverableSource,
      trigger: request.trigger,
      requestedAt: new Date().toISOString(),
      status: 'requested',
      instructions,
      findingsAddressed: actionableFindings.map((f) => f.ruleId),
      estimatedImpact,
      applied: false,
    };

    await this.appendEvent(event);
    return event;
  }

  /**
   * Mark a revision event as applied.
   */
  async markApplied(eventId: string, summary: string): Promise<SelfRevisionEvent | undefined> {
    return this.updateEvent(eventId, (event) => {
      event.applied = true;
      event.status = 'applied';
      event.appliedAt = new Date().toISOString();
      event.summary = summary;
    });
  }

  async markSucceeded(eventId: string, summary: string): Promise<SelfRevisionEvent | undefined> {
    return this.updateEvent(eventId, (event) => {
      event.applied = true;
      event.status = 'succeeded';
      event.succeededAt = new Date().toISOString();
      event.summary = summary;
    });
  }

  async markEscalated(
    eventId: string,
    summary: string,
    terminalReason: string
  ): Promise<SelfRevisionEvent | undefined> {
    return this.updateEvent(eventId, (event) => {
      event.status = 'escalated';
      event.escalatedAt = new Date().toISOString();
      event.summary = summary;
      event.terminalReason = terminalReason;
    });
  }

  async listEvents(filters?: {
    agentId?: string;
    trigger?: RevisionTrigger;
    applied?: boolean;
  }): Promise<SelfRevisionEvent[]> {
    const all = await this.loadEvents();
    if (!filters) return all;

    return all.filter((e) => {
      if (filters.agentId && e.agentId !== filters.agentId) return false;
      if (filters.trigger && e.trigger !== filters.trigger) return false;
      if (filters.applied !== undefined && e.applied !== filters.applied) return false;
      return true;
    });
  }

  async getEvent(id: string): Promise<SelfRevisionEvent | undefined> {
    const all = await this.loadEvents();
    return all.find((e) => e.id === id);
  }

  // ─── Private helpers ──────────────────────────────────────

  private buildInstructions(
    findings: VerifierFinding[],
    qualityFail: boolean,
    qualityScore: number,
    threshold: number
  ): SelfRevisionInstruction[] {
    const instructions: SelfRevisionInstruction[] = [];

    if (findings.length > 0) {
      instructions.push({
        heading: 'Address Verifier Findings',
        directive: `You must address the following ${findings.length} verifier finding(s) before handoff:\n${findings
          .map(
            (f, i) =>
              `${i + 1}. [${f.ruleId}/${f.severity}] ${f.description}${f.suggestedFix ? ` — Suggested fix: ${f.suggestedFix}` : ''}`
          )
          .join('\n')}`,
      });
    }

    const hasCritical = findings.some((f) => f.severity === 'critical');
    const hasChecklistIssue = findings.some((f) => f.ruleId === 'VR-001');
    const hasUncertain = findings.some((f) => f.ruleId === 'VR-002');
    const hasInsufficient = findings.some((f) => f.ruleId === 'VR-003');

    if (hasCritical || hasChecklistIssue) {
      instructions.push({
        heading: 'Complete HANDOFF CHECKLIST',
        directive:
          'Ensure the HANDOFF CHECKLIST section exists and all items are checked with [x]. Add any missing items. An agent MAY NOT hand off the task if any checkbox is unchecked.',
      });
    }

    if (hasUncertain || hasInsufficient) {
      instructions.push({
        heading: 'Resolve Uncertainty Markers',
        directive:
          'For each UNCERTAIN: or INSUFFICIENT_DATA: item: either resolve it with a source reference, escalate with QUESTIONNAIRE_REQUEST, or document the escalation path. Do not leave markers dangling.',
      });
    }

    if (qualityFail) {
      instructions.push({
        heading: 'Improve Deliverable Quality',
        directive: `Your deliverable quality score (${qualityScore.toFixed(0)}%) is below the required threshold (${threshold.toFixed(0)}%). Review for: depth of analysis, presence of evidence citations, completeness of required sections, and absence of generic statements (AL-4).`,
      });
    }

    if (instructions.length === 0) {
      instructions.push({
        heading: 'General Self-Review',
        directive:
          'Review your output end-to-end for internal consistency, complete evidence citations, and anti-laziness compliance (AL-1 through AL-6).',
      });
    }

    return instructions;
  }

  private estimateImpact(
    findings: VerifierFinding[],
    qualityFail: boolean
  ): 'high' | 'medium' | 'low' {
    const hasCritical = findings.some((f) => f.severity === 'critical');
    const hasHigh = findings.some((f) => f.severity === 'high');
    if (hasCritical || (hasHigh && qualityFail)) return 'high';
    if (hasHigh || qualityFail) return 'medium';
    return 'low';
  }

  private async loadEvents(): Promise<SelfRevisionEvent[]> {
    try {
      const raw = this.ctx.store.readFile(this.eventsPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as SelfRevisionEvent);
    } catch {
      return [];
    }
  }

  private async appendEvent(event: SelfRevisionEvent): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.eventsPath);
      this.ctx.store.writeFile(this.eventsPath, existing + '\n' + JSON.stringify(event));
    } catch {
      this.ctx.store.writeFile(this.eventsPath, JSON.stringify(event));
    }
  }

  private async saveEvents(events: SelfRevisionEvent[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.eventsPath, events.map((e) => JSON.stringify(e)).join('\n'));
  }

  private async updateEvent(
    eventId: string,
    mutate: (event: SelfRevisionEvent) => void
  ): Promise<SelfRevisionEvent | undefined> {
    const events = await this.loadEvents();
    const event = events.find((candidate) => candidate.id === eventId);
    if (!event) return undefined;

    mutate(event);
    await this.saveEvents(events);
    return event;
  }
}

export function createSelfRevisionService(ctx: ServiceContext): SelfRevisionService {
  return new SelfRevisionService(ctx);
}
