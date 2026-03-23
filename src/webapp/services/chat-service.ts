// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';

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
}

export interface ProposedAction {
  id: string;
  label: string;
  type: 'navigation' | 'refresh';
  target?: string;
}

export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatMessageResponse {
  message: ChatHistoryMessage;
  citations: ChatCitation[];
  proposed_actions: ProposedAction[];
}

export interface ChatSession {
  session_id: string;
  updated_at: string;
  messages: ChatHistoryMessage[];
}

interface ChatServiceOptions {
  projectRoot: string;
  sessionDir: string;
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
  userMessage: string;
  contextSummary: string;
  contextHints: string[];
}): string {
  const lower = input.userMessage.toLowerCase();
  if (lower.includes('current session status') || lower.includes('session status')) {
    return `${input.contextSummary} I can also open the pipeline or approval center if you want to continue from here.`;
  }

  if (input.contextHints.length > 0) {
    return `${input.contextSummary} I considered your context hints: ${input.contextHints.join('; ')}.`;
  }

  return `${input.contextSummary} Ask me for session status, pending approvals, or where to navigate next.`;
}

function buildProposedActions(userMessage: string): ProposedAction[] {
  const lower = userMessage.toLowerCase();
  const actions: ProposedAction[] = [];

  if (lower.includes('status') || lower.includes('phase') || lower.includes('session')) {
    actions.push({
      id: 'open-pipeline',
      label: 'Open pipeline status',
      type: 'navigation',
      target: '/pipeline',
    });
  }

  if (lower.includes('approval') || lower.includes('override')) {
    actions.push({
      id: 'open-approvals',
      label: 'Open approval center',
      type: 'navigation',
      target: '/approvals',
    });
  }

  if (lower.includes('workspace') || lower.includes('repo')) {
    actions.push({
      id: 'open-workspaces',
      label: 'Open workspaces',
      type: 'navigation',
      target: '/workspaces',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'refresh-chat-context',
      label: 'Refresh session context',
      type: 'refresh',
    });
  }

  return actions;
}

export class ChatService {
  private readonly sessionDir: string;
  private readonly cache = new Map<string, ChatSession>();

  constructor(options: ChatServiceOptions) {
    this.sessionDir = path.join(options.projectRoot, options.sessionDir, 'chat-history');
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
      content: buildAssistantResponse({ userMessage, contextSummary, contextHints }),
      created_at: safeNow(),
    };
    session.messages.push(assistantEntry);
    session.updated_at = safeNow();

    const citations = input.citations || [];
    const proposedActions = buildProposedActions(userMessage);
    this.persistSession(session);

    return {
      message: assistantEntry,
      citations,
      proposed_actions: proposedActions,
    };
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
