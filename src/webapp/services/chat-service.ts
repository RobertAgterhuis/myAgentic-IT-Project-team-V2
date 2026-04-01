// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { IntentClassifier, type ChatIntent } from './chat/intent-classifier';
import { ActionProposer } from './chat/action-proposer';
import { ControlPlaneStateRepository } from './control-plane-state-repository';

export interface ChatContextSnapshot {
  sessionStatus?: string;
  mode?: string;
  currentPhase?: string;
  currentAgent?: string;
  pendingApprovals?: number;
}

export interface ChatCitation {
  source_path: string;
  excerpt: string;
  start_line: number | null;
  source_type?: 'artifact' | 'decision' | 'policy' | 'session' | 'rag_chunk';
  deep_link?: string;
}

export type ProposedActionType =
  | 'create_command'
  | 'approve'
  | 'reject'
  | 'resume'
  | 'pause'
  | 'open_screen';

export interface ProposedAction {
  id: string;
  label: string;
  type: ProposedActionType;
  payload?: Record<string, unknown>;
  requires_confirmation: boolean;
  nonce?: string;
  expires_at?: string;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatMessageResponse {
  intent: ChatIntent;
  message: ChatHistoryMessage;
  citations: ChatCitation[];
  proposed_actions: ProposedAction[];
}

export interface SendChatMessageInput {
  sessionId: string;
  message: string;
  contextHints?: string[];
  contextSnapshot?: ChatContextSnapshot;
  citations?: ChatCitation[];
  assistantMessageOverride?: string;
  suppressActions?: boolean;
  proposedActionsOverride?: ProposedAction[];
  onToken?: (token: string, index: number) => void;
}

export interface ChatActionEnvelope {
  action: ProposedAction;
  context_snapshot?: ChatContextSnapshot;
  created_at: string;
  nonce: string;
  expires_at: string;
  consumed_at?: string;
}

export interface ChatSession {
  session_id: string;
  updated_at: string;
  messages: ChatHistoryMessage[];
  action_contexts?: Record<string, ChatActionEnvelope>;
}

interface ChatServiceOptions {
  projectRoot: string;
  sessionDir: string;
  intentClassifier?: IntentClassifier;
  actionProposer?: ActionProposer;
}

const ACTION_ENVELOPE_TTL_MS = 5 * 60 * 1000;

function safeNow(): string {
  return new Date().toISOString();
}

function normalizeSessionId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-');
  return normalized || 'default';
}

function buildContextSummary(snapshot?: ChatContextSnapshot): string {
  const status = snapshot?.sessionStatus || 'UNKNOWN';
  const mode = snapshot?.mode || 'UNKNOWN';
  const phase = snapshot?.currentPhase || 'n/a';
  const agent = snapshot?.currentAgent || 'n/a';
  const approvals = Number.isFinite(snapshot?.pendingApprovals)
    ? String(snapshot?.pendingApprovals)
    : 'n/a';
  return `Session status: ${status}. Mode: ${mode}. Current phase: ${phase}. Current agent: ${agent}. Pending approvals: ${approvals}.`;
}

function buildAssistantResponse(input: {
  intent: ChatIntent;
  contextSummary: string;
  contextHints: string[];
}): string {
  if (input.intent === 'decision_lookup') {
    return `${input.contextSummary} I can ground this with prior decisions and link the relevant decision records.`;
  }

  if (input.intent === 'workspace_query') {
    return `${input.contextSummary} I can ground this with codebase evidence and point to relevant source locations.`;
  }

  if (input.intent === 'artifact_query') {
    return `${input.contextSummary} I can ground this with phase output artifacts and summarize the relevant sections.`;
  }

  if (input.intent === 'session_status') {
    return `${input.contextSummary} I can also open the pipeline or approval center if you want to continue from here.`;
  }

  if (input.intent === 'approval_guidance') {
    return `${input.contextSummary} I can guide you through pending approvals and open the approval center for the next decision.`;
  }

  if (input.intent === 'workspace_navigation') {
    return `${input.contextSummary} I can take you to workspaces and help you navigate repository-level context.`;
  }

  if (input.contextHints.length > 0) {
    return `${input.contextSummary} I considered your context hints: ${input.contextHints.join('; ')}.`;
  }

  return `${input.contextSummary} Ask me for session status, pending approvals, or where to navigate next.`;
}

function chunkTextForStreaming(text: string): string[] {
  const parts = text.match(/\S+\s*/g);
  if (!parts || parts.length === 0) {
    return text.length > 0 ? [text] : [];
  }
  return parts;
}

export class ChatService {
  private readonly sessionDir: string;
  private readonly cache = new Map<string, ChatSession>();
  private readonly intentClassifier: IntentClassifier;
  private readonly actionProposer: ActionProposer;
  private readonly stateRepository: ControlPlaneStateRepository;

  constructor(options: ChatServiceOptions) {
    this.sessionDir = path.join(options.projectRoot, options.sessionDir, 'chat-history');
    this.intentClassifier = options.intentClassifier || new IntentClassifier();
    this.actionProposer = options.actionProposer || new ActionProposer();
    this.stateRepository = new ControlPlaneStateRepository(options.projectRoot);
  }

  sendMessage(input: SendChatMessageInput): ChatMessageResponse {
    const sessionId = normalizeSessionId(input.sessionId);
    const contextHints = (input.contextHints || []).map((hint) => hint.trim()).filter(Boolean);
    const userMessage = input.message.trim();
    const intent = this.intentClassifier.classify(userMessage, contextHints);

    const session = this.readSession(sessionId);
    const userEntry: ChatHistoryMessage = {
      id: `u-${Date.now().toString(36)}`,
      role: 'user',
      content: userMessage,
      created_at: safeNow(),
    };
    session.messages.push(userEntry);

    const contextSummary = buildContextSummary(input.contextSnapshot);
    const assistantContent =
      typeof input.assistantMessageOverride === 'string' &&
      input.assistantMessageOverride.trim().length > 0
        ? input.assistantMessageOverride.trim()
        : buildAssistantResponse({ intent, contextSummary, contextHints });

    if (typeof input.onToken === 'function') {
      const chunks = chunkTextForStreaming(assistantContent);
      chunks.forEach((token, index) => {
        input.onToken?.(token, index);
      });
    }

    const assistantEntry: ChatHistoryMessage = {
      id: `a-${Date.now().toString(36)}`,
      role: 'assistant',
      content: assistantContent,
      created_at: safeNow(),
    };
    session.messages.push(assistantEntry);
    session.updated_at = safeNow();

    const citations = input.citations || [];
    const proposedActions = Array.isArray(input.proposedActionsOverride)
      ? input.proposedActionsOverride
      : input.suppressActions
        ? []
        : this.actionProposer.propose({
            intent,
            message: userMessage,
            contextSnapshot: input.contextSnapshot,
          });

    const actionContexts: Record<string, ChatActionEnvelope> = session.action_contexts || {};
    const securedActions: ProposedAction[] = [];
    for (const action of proposedActions) {
      const nonce = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + ACTION_ENVELOPE_TTL_MS).toISOString();
      const securedAction: ProposedAction = {
        ...action,
        nonce,
        expires_at: expiresAt,
      };
      actionContexts[action.id] = {
        action: securedAction,
        context_snapshot: input.contextSnapshot,
        created_at: safeNow(),
        nonce,
        expires_at: expiresAt,
      };
      securedActions.push(securedAction);
    }
    session.action_contexts = actionContexts;

    this.persistSession(session);

    return {
      intent,
      message: assistantEntry,
      citations,
      proposed_actions: securedActions,
    };
  }

  getHistory(input: { sessionId: string; limit?: number }): ChatHistoryMessage[] {
    const sessionId = normalizeSessionId(input.sessionId);
    const session = this.readSession(sessionId);
    const limit = Number.isFinite(input.limit) ? Math.max(1, Number(input.limit)) : 50;
    return session.messages.slice(-limit);
  }

  clearSession(input: { sessionId: string }): { cleared: boolean } {
    const sessionId = normalizeSessionId(input.sessionId);
    this.cache.delete(sessionId);

    const filePath = this.sessionPath(sessionId);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    return { cleared: true };
  }

  getActionEnvelope(input: { sessionId: string; actionId: string }): ChatActionEnvelope | null {
    const sessionId = normalizeSessionId(input.sessionId);
    const actionId = String(input.actionId || '').trim();
    if (!actionId) return null;

    const session = this.readSession(sessionId);
    const envelope = session.action_contexts?.[actionId] || null;
    if (!envelope) return null;
    if (new Date(envelope.expires_at).getTime() <= Date.now()) {
      delete session.action_contexts?.[actionId];
      this.persistSession(session);
      return null;
    }
    return envelope;
  }

  validateActionEnvelope(input: { sessionId: string; actionId: string; nonce: string }): {
    ok: boolean;
    envelope?: ChatActionEnvelope;
    reason?: 'NOT_FOUND' | 'NONCE_INVALID' | 'ACTION_REPLAYED' | 'ACTION_EXPIRED';
  } {
    const sessionId = normalizeSessionId(input.sessionId);
    const actionId = String(input.actionId || '').trim();
    const nonce = String(input.nonce || '').trim();
    if (!actionId || !nonce) return { ok: false, reason: 'NOT_FOUND' };

    const session = this.readSession(sessionId);
    const envelope = session.action_contexts?.[actionId] || null;
    if (!envelope) return { ok: false, reason: 'NOT_FOUND' };
    if (envelope.consumed_at) return { ok: false, reason: 'ACTION_REPLAYED' };
    if (new Date(envelope.expires_at).getTime() <= Date.now()) {
      delete session.action_contexts?.[actionId];
      this.persistSession(session);
      return { ok: false, reason: 'ACTION_EXPIRED' };
    }
    if (envelope.nonce !== nonce) return { ok: false, reason: 'NONCE_INVALID' };
    return { ok: true, envelope };
  }

  consumeActionEnvelope(input: { sessionId: string; actionId: string }): void {
    const sessionId = normalizeSessionId(input.sessionId);
    const actionId = String(input.actionId || '').trim();
    if (!actionId) return;

    const session = this.readSession(sessionId);
    const envelope = session.action_contexts?.[actionId];
    if (!envelope) return;
    envelope.consumed_at = safeNow();
    this.persistSession(session);
  }

  private sessionPath(sessionId: string): string {
    return path.join(this.sessionDir, `${sessionId}.json`);
  }

  private readSession(sessionId: string): ChatSession {
    const cached = this.cache.get(sessionId);
    if (cached) return cached;

    const filePath = this.sessionPath(sessionId);
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ChatSession;
        if (Array.isArray(parsed.messages)) {
          this.cache.set(sessionId, parsed);
          return parsed;
        }
      } catch {
        // Fall through to fresh session.
      }
    }

    const fresh: ChatSession = {
      session_id: sessionId,
      updated_at: safeNow(),
      messages: [],
      action_contexts: {},
    };
    this.cache.set(sessionId, fresh);
    return fresh;
  }

  private persistSession(session: ChatSession): void {
    const filePath = this.sessionPath(session.session_id);
    this.stateRepository.saveChatSession(
      filePath,
      session.session_id,
      session as Record<string, unknown>
    );
  }
}
