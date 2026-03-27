// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * A2A Messaging Service — PATTERNS M2, Epic E4.1
 *
 * Implements the typed Agent-to-Agent message contract for peer requests,
 * clarifications, rebuttals, and evidence handoff.
 *
 * Every message carries a provenance block for full traceability.
 *
 * Source: Patterns/15-inter-agent-communication-a2a.md — Path To 9.9
 * Source: platform/schema/a2a-message.schema.json
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type A2AMessageType =
  | 'request'
  | 'clarification'
  | 'rebuttal'
  | 'evidence-handoff'
  | 'acknowledgement'
  | 'peer-review-request'
  | 'peer-review-response';

export type A2AMessageStatus = 'pending' | 'delivered' | 'read' | 'replied' | 'expired';
export type A2AMessagePriority = 'critical' | 'high' | 'normal' | 'low';

export interface A2AMessagePayload {
  summary: string;
  body?: string;
  evidencePaths?: string[];
  clarificationQuestions?: string[];
  rebuttalPoints?: string[];
  requestedAction?: string;
  deadline?: string;
}

export interface A2AMessageProvenance {
  sessionId?: string;
  workspaceId?: string;
  phase?: string;
  triggeredByEvent?: string;
  parentMessageId?: string;
}

export interface A2AMessage {
  id: string;
  type: A2AMessageType;
  fromAgentId: string;
  toAgentId: string;
  correlationId: string;
  replyToId?: string;
  sentAt: string;
  receivedAt?: string;
  status: A2AMessageStatus;
  priority: A2AMessagePriority;
  payload: A2AMessagePayload;
  provenance?: A2AMessageProvenance;
  ttlSeconds?: number;
}

export interface A2AMessageCreateInput {
  type: A2AMessageType;
  fromAgentId: string;
  toAgentId: string;
  correlationId?: string;
  replyToId?: string;
  priority?: A2AMessagePriority;
  payload: A2AMessagePayload;
  provenance?: A2AMessageProvenance;
  ttlSeconds?: number;
}

export interface A2AConversation {
  correlationId: string;
  participants: string[];
  messages: A2AMessage[];
  startedAt: string;
  lastActivityAt: string;
  status: 'open' | 'resolved' | 'stale';
}

// ─── Service ──────────────────────────────────────────────────

export class A2AMessagingService {
  private ctx: ServiceContext;
  private messagesPath = 'BusinessDocs/reasoning-collaboration/a2a-messages.jsonl';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Send a new A2A message.
   */
  async sendMessage(input: A2AMessageCreateInput): Promise<A2AMessage> {
    const message: A2AMessage = {
      id: `A2A-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: input.type,
      fromAgentId: input.fromAgentId,
      toAgentId: input.toAgentId,
      correlationId: input.correlationId ?? `COR-${Date.now()}`,
      replyToId: input.replyToId,
      sentAt: new Date().toISOString(),
      status: 'pending',
      priority: input.priority ?? 'normal',
      payload: input.payload,
      provenance: input.provenance,
      ttlSeconds: input.ttlSeconds,
    };

    await this.appendMessage(message);
    return message;
  }

  /**
   * Mark a message as delivered.
   */
  async markDelivered(id: string): Promise<A2AMessage | undefined> {
    return this.updateStatus(id, 'delivered', { receivedAt: new Date().toISOString() });
  }

  /**
   * Mark a message as read by the target agent.
   */
  async markRead(id: string): Promise<A2AMessage | undefined> {
    return this.updateStatus(id, 'read');
  }

  /**
   * Mark a message as replied (after a reply message has been sent).
   */
  async markReplied(id: string): Promise<A2AMessage | undefined> {
    return this.updateStatus(id, 'replied');
  }

  /**
   * Expire timed-out messages.
   */
  async pruneExpired(): Promise<number> {
    const messages = await this.loadMessages();
    const now = Date.now();
    let pruned = 0;

    for (const msg of messages) {
      if (
        msg.ttlSeconds &&
        msg.ttlSeconds > 0 &&
        msg.status === 'pending' &&
        now - new Date(msg.sentAt).getTime() > msg.ttlSeconds * 1000
      ) {
        msg.status = 'expired';
        pruned++;
      }
    }

    if (pruned > 0) await this.saveMessages(messages);
    return pruned;
  }

  /**
   * List messages, optionally filtered.
   */
  async listMessages(filters?: {
    fromAgentId?: string;
    toAgentId?: string;
    correlationId?: string;
    type?: A2AMessageType;
    status?: A2AMessageStatus;
  }): Promise<A2AMessage[]> {
    const all = await this.loadMessages();
    if (!filters) return all;

    return all.filter((m) => {
      if (filters.fromAgentId && m.fromAgentId !== filters.fromAgentId) return false;
      if (filters.toAgentId && m.toAgentId !== filters.toAgentId) return false;
      if (filters.correlationId && m.correlationId !== filters.correlationId) return false;
      if (filters.type && m.type !== filters.type) return false;
      if (filters.status && m.status !== filters.status) return false;
      return true;
    });
  }

  async getMessage(id: string): Promise<A2AMessage | undefined> {
    const all = await this.loadMessages();
    return all.find((m) => m.id === id);
  }

  /**
   * Reconstruct a conversation thread by correlationId.
   */
  async getConversation(correlationId: string): Promise<A2AConversation | undefined> {
    const messages = await this.listMessages({ correlationId });
    if (messages.length === 0) return undefined;

    const participants = [...new Set(messages.flatMap((m) => [m.fromAgentId, m.toAgentId]))];
    const sortedMessages = messages.sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    const lastActivityAt = sortedMessages[sortedMessages.length - 1].sentAt;
    const daysSinceActivity =
      (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);

    const allReplied = sortedMessages.every((m) => m.status === 'replied' || m.status === 'read');
    const isStale = daysSinceActivity > 7;

    return {
      correlationId,
      participants,
      messages: sortedMessages,
      startedAt: sortedMessages[0].sentAt,
      lastActivityAt,
      status: isStale ? 'stale' : allReplied ? 'resolved' : 'open',
    };
  }

  // ─── Private helpers ──────────────────────────────────────

  private async updateStatus(
    id: string,
    status: A2AMessageStatus,
    extra?: Partial<A2AMessage>
  ): Promise<A2AMessage | undefined> {
    const messages = await this.loadMessages();
    const message = messages.find((m) => m.id === id);
    if (!message) return undefined;

    message.status = status;
    if (extra) Object.assign(message, extra);

    await this.saveMessages(messages);
    return message;
  }

  private async loadMessages(): Promise<A2AMessage[]> {
    try {
      const raw = this.ctx.store.readFile(this.messagesPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as A2AMessage);
    } catch {
      return [];
    }
  }

  private async appendMessage(message: A2AMessage): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.messagesPath);
      this.ctx.store.writeFile(this.messagesPath, existing + '\n' + JSON.stringify(message));
    } catch {
      this.ctx.store.writeFile(this.messagesPath, JSON.stringify(message));
    }
  }

  private async saveMessages(messages: A2AMessage[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.messagesPath, messages.map((m) => JSON.stringify(m)).join('\n'));
  }
}

export function createA2AMessagingService(ctx: ServiceContext): A2AMessagingService {
  return new A2AMessagingService(ctx);
}
