// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Session lifecycle tracker — generates session IDs, tracks state,
 * stores metadata, and maintains timeline events.
 *
 * Used by the orchestrator to record session lifecycle for the
 * sessions API (M15-021, M15-022, M15-025).
 *
 * @module session-tracker
 */

import crypto from 'crypto';

/* ── Types ──────────────────────────────────────────────────── */

export type SessionStatus = 'active' | 'completed' | 'failed' | 'paused';

export type TimelineEventType =
  | 'session_start'
  | 'session_complete'
  | 'phase_start'
  | 'phase_complete'
  | 'agent_start'
  | 'agent_complete'
  | 'artifact_created'
  | 'gate_passed'
  | 'gate_failed'
  | 'decision_created'
  | 'error'
  | 'retry';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifact_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackedSession {
  id: string;
  project: string;
  flow: string;
  phase: string;
  status: SessionStatus;
  progress: number;
  started_at: string;
  completed_at: string | null;
  current_agent: string | null;
  current_agents: string[];
}

/* ── AgentDetail fields (M15-023) ────────────────────────────── */

export interface AgentDetail {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'retrying';
  task_description: string;
  started_at: string;
  duration_ms: number;
  prompt_summary?: string;
  outputs: string[];
  retry_count: number;
  session_id: string;
  phase: string;
}

/* ── Session Tracker ─────────────────────────────────────────── */

const MAX_TIMELINE_EVENTS = 1000;
const MAX_SESSIONS = 100;

export class SessionTracker {
  private sessions: Map<string, TrackedSession> = new Map();
  private timelines: Map<string, TimelineEvent[]> = new Map();
  private agents: Map<string, AgentDetail> = new Map();
  private sessionOrder: string[] = [];

  /** Generate a unique session ID. */
  generateId(): string {
    const ts = Date.now().toString(36);
    const rand = crypto.randomBytes(4).toString('hex');
    return `sess-${ts}-${rand}`;
  }

  /** Start a new session. Returns the created session. */
  startSession(project: string, flow: string): TrackedSession {
    const id = this.generateId();
    const now = new Date().toISOString();
    const session: TrackedSession = {
      id,
      project,
      flow,
      phase: 'ONBOARDING',
      status: 'active',
      progress: 0,
      started_at: now,
      completed_at: null,
      current_agent: null,
      current_agents: [],
    };
    this.sessions.set(id, session);
    this.timelines.set(id, []);
    this.sessionOrder.push(id);

    // Evict oldest sessions if over limit
    while (this.sessionOrder.length > MAX_SESSIONS) {
      const oldest = this.sessionOrder.shift()!;
      this.sessions.delete(oldest);
      this.timelines.delete(oldest);
      // Clean up agents for evicted session
      for (const [key, agent] of this.agents) {
        if (agent.session_id === oldest) this.agents.delete(key);
      }
    }

    this.addTimelineEvent(id, {
      type: 'session_start',
      description: `Session started: ${flow} for ${project}`,
      metadata: { project, flow },
    });

    return session;
  }

  /** Get a session by ID. */
  getSession(id: string): TrackedSession | undefined {
    return this.sessions.get(id);
  }

  /** List all sessions, newest first. */
  listSessions(): TrackedSession[] {
    return [...this.sessionOrder].reverse().map((id) => this.sessions.get(id)!);
  }

  /** Update session state. */
  updateSession(
    id: string,
    updates: Partial<
      Pick<TrackedSession, 'phase' | 'status' | 'progress' | 'current_agent' | 'current_agents'>
    >
  ): TrackedSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    if (updates.phase !== undefined) session.phase = updates.phase;
    if (updates.status !== undefined) session.status = updates.status;
    if (updates.progress !== undefined) session.progress = updates.progress;
    if (updates.current_agent !== undefined) session.current_agent = updates.current_agent;
    if (updates.current_agents !== undefined) session.current_agents = updates.current_agents;

    if (updates.status === 'completed' || updates.status === 'failed') {
      session.completed_at = new Date().toISOString();
      session.current_agents = [];
    }

    return session;
  }

  /** Complete a session. */
  completeSession(id: string, status: 'completed' | 'failed' = 'completed'): void {
    this.updateSession(id, { status, progress: status === 'completed' ? 100 : undefined });
    this.addTimelineEvent(id, {
      type: 'session_complete',
      description: `Session ${status}`,
      metadata: { final_status: status },
    });
  }

  /** Add a timeline event to a session. */
  addTimelineEvent(
    sessionId: string,
    event: Omit<TimelineEvent, 'id' | 'timestamp'>
  ): TimelineEvent | undefined {
    const timeline = this.timelines.get(sessionId);
    if (!timeline) return undefined;

    const entry: TimelineEvent = {
      id: `evt-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    timeline.push(entry);

    // Ring buffer: evict oldest events beyond limit
    while (timeline.length > MAX_TIMELINE_EVENTS) {
      timeline.shift();
    }

    return entry;
  }

  /** Get timeline events for a session. */
  getTimeline(sessionId: string): TimelineEvent[] {
    return this.timelines.get(sessionId) ?? [];
  }

  /* ── Agent tracking (M15-023 / M15-024) ──────────────────── */

  /** Record an agent starting work. */
  startAgent(
    sessionId: string,
    agentId: string,
    agentName: string,
    phase: string,
    taskDescription: string
  ): AgentDetail {
    const detail: AgentDetail = {
      id: agentId,
      name: agentName,
      status: 'running',
      task_description: taskDescription,
      started_at: new Date().toISOString(),
      duration_ms: 0,
      outputs: [],
      retry_count: 0,
      session_id: sessionId,
      phase,
    };
    this.agents.set(agentId, detail);
    return detail;
  }

  /** Mark an agent as completed. */
  completeAgent(agentId: string, outputs: string[] = []): AgentDetail | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    agent.status = 'completed';
    agent.duration_ms = Date.now() - new Date(agent.started_at).getTime();
    agent.outputs = outputs;
    return agent;
  }

  /** Mark an agent as failed. */
  failAgent(agentId: string): AgentDetail | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    agent.status = 'failed';
    agent.duration_ms = Date.now() - new Date(agent.started_at).getTime();
    return agent;
  }

  /** Record an agent retry. */
  retryAgent(agentId: string): AgentDetail | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;
    agent.status = 'retrying';
    agent.retry_count += 1;
    return agent;
  }

  /** Get a single agent detail. */
  getAgent(agentId: string): AgentDetail | undefined {
    return this.agents.get(agentId);
  }

  /** List all tracked agents. */
  listAgents(): AgentDetail[] {
    return Array.from(this.agents.values());
  }

  /** List agents for a specific session. */
  listAgentsBySession(sessionId: string): AgentDetail[] {
    return Array.from(this.agents.values()).filter((a) => a.session_id === sessionId);
  }

  /** Clear all data (for testing). */
  reset(): void {
    this.sessions.clear();
    this.timelines.clear();
    this.agents.clear();
    this.sessionOrder = [];
  }
}

/** Singleton instance shared across the server. */
export const sessionTracker = new SessionTracker();
