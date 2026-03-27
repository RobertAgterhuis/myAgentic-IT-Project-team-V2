// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Peer Clarification Workflow Service — PATTERNS M2, Epic E4.2
 *
 * Manages structured peer-to-peer clarification workflows between agents.
 * Supports the canonical collaboration pairs:
 *   - Architecture ↔ Security (agents 05 and 08)
 *   - UX ↔ Content (agents 11 and 32)
 *   - Dev ↔ Test (agents 06 and 21)
 * as well as ad-hoc peer clarification for any agent pair.
 *
 * A clarification workflow consists of:
 *  1. Initiator sends a peer-review-request with clarification questions
 *  2. Responder sends a peer-review-response with answers and any rebuttals
 *  3. Optional follow-up round(s)
 *  4. Workflow resolved when all questions are answered
 *
 * Source: Patterns/15-inter-agent-communication-a2a.md — Path To 9.9
 */

import type { ServiceContext } from '../../src/webapp/services/types';
import { A2AMessagingService, type A2AMessage, createA2AMessagingService } from './a2a-messaging';

// ─── Types ────────────────────────────────────────────────────

export type ClarificationStatus =
  | 'open'
  | 'awaiting-response'
  | 'partially-answered'
  | 'resolved'
  | 'escalated';

export interface ClarificationQuestion {
  id: string;
  text: string;
  askedBy: string;
  askedAt: string;
  answeredAt?: string;
  answer?: string;
  answeredBy?: string;
  followUpNeeded: boolean;
}

export interface ClarificationWorkflow {
  id: string;
  correlationId: string;
  initiatorAgentId: string;
  responderAgentId: string;
  topic: string;
  deliverableSource?: string;
  phase?: string;
  status: ClarificationStatus;
  questions: ClarificationQuestion[];
  messages: A2AMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  escalatedAt?: string;
  escalationReason?: string;
  maxRounds: number;
  currentRound: number;
}

export interface OpenClarificationInput {
  initiatorAgentId: string;
  responderAgentId: string;
  topic: string;
  questions: string[];
  deliverableSource?: string;
  phase?: string;
  maxRounds?: number;
  provenance?: {
    sessionId?: string;
    workspaceId?: string;
    triggeredByEvent?: string;
  };
}

export interface RespondToClarificationInput {
  workflowId: string;
  respondingAgentId: string;
  answers: Array<{ questionId: string; answer: string; followUpNeeded?: boolean }>;
  rebuttalPoints?: string[];
  additionalQuestions?: string[];
}

// ─── Known peer pairs (for guided workflow suggestions) ───────

export const CANONICAL_PEER_PAIRS: Record<
  string,
  { agentA: string; agentB: string; domain: string }
> = {
  'architecture-security': { agentA: '05', agentB: '08', domain: 'architecture-security' },
  'ux-content': { agentA: '11', agentB: '32', domain: 'ux-content' },
  'dev-test': { agentA: '06', agentB: '21', domain: 'dev-test' },
  'product-business': { agentA: '34', agentB: '01', domain: 'product-business' },
  'devops-security': { agentA: '07', agentB: '08', domain: 'devops-security' },
  'data-security': { agentA: '09', agentB: '08', domain: 'data-security' },
};

// ─── Service ──────────────────────────────────────────────────

export class PeerClarificationService {
  private ctx: ServiceContext;
  private workflowsPath = 'BusinessDocs/reasoning-collaboration/peer-clarification-workflows.jsonl';
  private messagingService: A2AMessagingService;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
    this.messagingService = createA2AMessagingService(ctx);
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Open a new peer clarification workflow.
   */
  async openClarification(input: OpenClarificationInput): Promise<ClarificationWorkflow> {
    const correlationId = `CLA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const questions: ClarificationQuestion[] = input.questions.map((text, i) => ({
      id: `Q-${i + 1}`,
      text,
      askedBy: input.initiatorAgentId,
      askedAt: now,
      followUpNeeded: false,
    }));

    // Send the peer-review-request message
    const message = await this.messagingService.sendMessage({
      type: 'peer-review-request',
      fromAgentId: input.initiatorAgentId,
      toAgentId: input.responderAgentId,
      correlationId,
      priority: 'normal',
      payload: {
        summary: `Peer clarification request: ${input.topic}`,
        body: input.deliverableSource
          ? `Deliverable under review: ${input.deliverableSource}`
          : undefined,
        clarificationQuestions: input.questions,
        requestedAction: 'Please answer all clarification questions and flag any follow-up items.',
      },
      provenance: {
        phase: input.phase,
        sessionId: input.provenance?.sessionId,
        workspaceId: input.provenance?.workspaceId,
        triggeredByEvent: input.provenance?.triggeredByEvent,
      },
    });

    const workflow: ClarificationWorkflow = {
      id: `WF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      correlationId,
      initiatorAgentId: input.initiatorAgentId,
      responderAgentId: input.responderAgentId,
      topic: input.topic,
      deliverableSource: input.deliverableSource,
      phase: input.phase,
      status: 'awaiting-response',
      questions,
      messages: [message],
      createdAt: now,
      updatedAt: now,
      maxRounds: input.maxRounds ?? 3,
      currentRound: 1,
    };

    await this.appendWorkflow(workflow);
    return workflow;
  }

  /**
   * Respond to a clarification workflow.
   */
  async respondToClarification(
    input: RespondToClarificationInput
  ): Promise<ClarificationWorkflow | undefined> {
    const workflows = await this.loadWorkflows();
    const workflow = workflows.find((w) => w.id === input.workflowId);
    if (!workflow) return undefined;

    // Apply answers
    for (const ans of input.answers) {
      const q = workflow.questions.find((q) => q.id === ans.questionId);
      if (q) {
        q.answer = ans.answer;
        q.answeredBy = input.respondingAgentId;
        q.answeredAt = new Date().toISOString();
        q.followUpNeeded = ans.followUpNeeded ?? false;
      }
    }

    // Determine new status
    const unanswered = workflow.questions.filter((q) => !q.answer);
    const followUpNeeded = workflow.questions.some((q) => q.followUpNeeded);

    // Add additional questions from responder (counter-clarification)
    if (input.additionalQuestions && input.additionalQuestions.length > 0) {
      const now = new Date().toISOString();
      for (const text of input.additionalQuestions) {
        workflow.questions.push({
          id: `Q-${workflow.questions.length + 1}`,
          text,
          askedBy: input.respondingAgentId,
          askedAt: now,
          followUpNeeded: false,
        });
      }
    }

    // Send the peer-review-response message
    const responseMessage = await this.messagingService.sendMessage({
      type: 'peer-review-response',
      fromAgentId: input.respondingAgentId,
      toAgentId: workflow.initiatorAgentId,
      correlationId: workflow.correlationId,
      priority: 'normal',
      payload: {
        summary: `Peer clarification response for workflow ${input.workflowId}`,
        body: input.answers.map((a) => `Q[${a.questionId}]: ${a.answer}`).join('\n\n'),
        rebuttalPoints: input.rebuttalPoints,
        clarificationQuestions: input.additionalQuestions,
      },
      provenance: {
        phase: workflow.phase,
        parentMessageId: workflow.messages[0]?.id,
      },
    });

    workflow.messages.push(responseMessage);
    workflow.currentRound++;
    workflow.updatedAt = new Date().toISOString();

    if (unanswered.length === 0 && !followUpNeeded) {
      workflow.status = 'resolved';
      workflow.resolvedAt = workflow.updatedAt;
    } else if (workflow.currentRound > workflow.maxRounds) {
      workflow.status = 'escalated';
      workflow.escalatedAt = workflow.updatedAt;
      workflow.escalationReason = `Max rounds (${workflow.maxRounds}) reached with unanswered questions.`;
    } else {
      workflow.status = unanswered.length > 0 ? 'partially-answered' : 'awaiting-response';
    }

    await this.saveWorkflows(workflows);
    return workflow;
  }

  /**
   * Escalate a stalled clarification workflow.
   */
  async escalateWorkflow(
    workflowId: string,
    reason: string
  ): Promise<ClarificationWorkflow | undefined> {
    const workflows = await this.loadWorkflows();
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) return undefined;

    workflow.status = 'escalated';
    workflow.escalatedAt = new Date().toISOString();
    workflow.escalationReason = reason;
    workflow.updatedAt = workflow.escalatedAt;

    await this.saveWorkflows(workflows);
    return workflow;
  }

  async listWorkflows(filters?: {
    initiatorAgentId?: string;
    responderAgentId?: string;
    status?: ClarificationStatus;
    phase?: string;
  }): Promise<ClarificationWorkflow[]> {
    const all = await this.loadWorkflows();
    if (!filters) return all;

    return all.filter((w) => {
      if (filters.initiatorAgentId && w.initiatorAgentId !== filters.initiatorAgentId) return false;
      if (filters.responderAgentId && w.responderAgentId !== filters.responderAgentId) return false;
      if (filters.status && w.status !== filters.status) return false;
      if (filters.phase && w.phase !== filters.phase) return false;
      return true;
    });
  }

  async getWorkflow(id: string): Promise<ClarificationWorkflow | undefined> {
    const all = await this.loadWorkflows();
    return all.find((w) => w.id === id);
  }

  /**
   * List the canonical peer pairs for guided workflow creation.
   */
  listCanonicalPairs(): typeof CANONICAL_PEER_PAIRS {
    return CANONICAL_PEER_PAIRS;
  }

  // ─── Private helpers ──────────────────────────────────────

  private async loadWorkflows(): Promise<ClarificationWorkflow[]> {
    try {
      const raw = this.ctx.store.readFile(this.workflowsPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ClarificationWorkflow);
    } catch {
      return [];
    }
  }

  private async appendWorkflow(workflow: ClarificationWorkflow): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.workflowsPath);
      this.ctx.store.writeFile(this.workflowsPath, existing + '\n' + JSON.stringify(workflow));
    } catch {
      this.ctx.store.writeFile(this.workflowsPath, JSON.stringify(workflow));
    }
  }

  private async saveWorkflows(workflows: ClarificationWorkflow[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(
      this.workflowsPath,
      workflows.map((w) => JSON.stringify(w)).join('\n')
    );
  }
}

export function createPeerClarificationService(ctx: ServiceContext): PeerClarificationService {
  return new PeerClarificationService(ctx);
}
