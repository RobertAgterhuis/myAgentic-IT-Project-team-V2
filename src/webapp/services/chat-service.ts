// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import { IntentClassifier, type ChatIntent } from './chat/intent-classifier';
import { ActionProposer } from './chat/action-proposer';

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

export interface ChatActionEnvelope {
  action: ProposedAction;
  context_snapshot?: ChatContextSnapshot;
  created_at: string;
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

export class ChatService {
  private readonly sessionDir: string;
  private readonly cache = new Map<string, ChatSession>();
  private readonly intentClassifier: IntentClassifier;
  private readonly actionProposer: ActionProposer;

  constructor(options: ChatServiceOptions) {
    this.sessionDir = path.join(options.projectRoot, options.sessionDir, 'chat-history');
    this.intentClassifier = options.intentClassifier || new IntentClassifier();
    this.actionProposer = options.actionProposer || new ActionProposer();
  }

  sendMessage(input: {
    sessionId: string;
    message: string;
    contextHints?: string[];
    contextSnapshot?: ChatContextSnapshot;
    citations?: ChatCitation[];
  }): ChatMessageResponse {
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
    const assistantEntry: ChatHistoryMessage = {
      id: `a-${Date.now().toString(36)}`,
      role: 'assistant',
      content: buildAssistantResponse({ intent, contextSummary, contextHints }),
      created_at: safeNow(),
    };
    session.messages.push(assistantEntry);
    session.updated_at = safeNow();

    const citations = input.citations || [];
    const proposedActions = this.actionProposer.propose({
      intent,
      message: userMessage,
      contextSnapshot: input.contextSnapshot,
    });

    const actionContexts: Record<string, ChatActionEnvelope> = session.action_contexts || {};
    for (const action of proposedActions) {
      actionContexts[action.id] = {
        action,
        context_snapshot: input.contextSnapshot,
        created_at: safeNow(),
      };
    }
    session.action_contexts = actionContexts;

    this.persistSession(session);

    return {
      intent,
      message: assistantEntry,
      citations,
      proposed_actions: proposedActions,
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
    return session.action_contexts?.[actionId] || null;
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
    fs.mkdirSync(this.sessionDir, { recursive: true });
    const filePath = this.sessionPath(session.session_id);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
  }
}
