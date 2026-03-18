// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agent Execution Service (M31-001).
 *
 * Wraps the platform Dispatcher to allow ad-hoc execution of individual
 * agents from the UI, independent of the state machine flow.
 */

import { Dispatcher, PHASE_AGENTS } from '../../../platform/engine/dispatcher';
import { getStore } from '../store';
import { sessionTracker } from '../session-tracker';
import type { ServiceContext } from './types';

/** All known agents from the PHASE_AGENTS registry, keyed by id. */
const AGENT_INDEX = new Map<string, { id: string; name: string; phase: string }>();
for (const [phase, agents] of Object.entries(PHASE_AGENTS)) {
  for (const agent of agents as Array<{ id: string; name: string }>) {
    if (!AGENT_INDEX.has(agent.id)) {
      AGENT_INDEX.set(agent.id, { id: agent.id, name: agent.name, phase });
    }
  }
}

export interface ExecuteAgentInput {
  agentId: string;
  context?: {
    predecessorPaths?: string[];
    questionnairePath?: string;
  };
}

export interface ExecuteAgentResult {
  agent_id: string;
  agent_name: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  output_path?: string;
  error?: string;
}

export class AgentExecutionService {
  private _svc: ServiceContext;

  constructor(svc: ServiceContext) {
    this._svc = svc;
  }

  /** Look up agent metadata by ID. Returns undefined if unknown. */
  getAgentInfo(agentId: string) {
    return AGENT_INDEX.get(agentId);
  }

  /** Execute a single agent by ID. */
  async execute(input: ExecuteAgentInput): Promise<ExecuteAgentResult> {
    const info = AGENT_INDEX.get(input.agentId);
    if (!info) {
      throw new AgentNotFoundError(`Unknown agent ID: ${input.agentId}`);
    }

    const startedAt = new Date().toISOString();

    // Track in session tracker
    const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
    const sessionId = activeSession?.id ?? 'manual';
    sessionTracker.startAgent(
      sessionId,
      info.id,
      info.name,
      info.phase,
      `Manual execution from UI`
    );

    // Build dispatcher with the current store
    const dispatcher = new Dispatcher({ store: getStore() });

    // Build context
    const ctx = dispatcher.buildContext(info.id, {
      predecessorPaths: input.context?.predecessorPaths ?? [],
      questionnairePath: input.context?.questionnairePath,
    });

    try {
      const result = await dispatcher.invoke({ id: info.id, name: info.name }, info.phase, ctx);

      const completedAt = new Date().toISOString();
      const durationMs = +new Date(completedAt) - +new Date(startedAt);

      const outputPath = result.outputPath as string | undefined;

      if (result.success) {
        sessionTracker.completeAgent(info.id, outputPath ? [outputPath] : []);

        // Audit log
        this._svc.audit.log({
          operation: 'AGENT_MANUAL_EXECUTE',
          entityType: 'agent',
          entityId: info.id,
          user: 'webapp',
          summary: `Manual execution of ${info.name} completed successfully`,
        });

        return {
          agent_id: info.id,
          agent_name: info.name,
          status: 'completed',
          started_at: startedAt,
          completed_at: completedAt,
          duration_ms: durationMs,
          output_path: outputPath,
        };
      } else {
        sessionTracker.failAgent(info.id);

        this._svc.audit.log({
          operation: 'AGENT_MANUAL_EXECUTE',
          entityType: 'agent',
          entityId: info.id,
          user: 'webapp',
          summary: `Manual execution of ${info.name} failed: ${result.error}`,
        });

        return {
          agent_id: info.id,
          agent_name: info.name,
          status: 'failed',
          started_at: startedAt,
          completed_at: completedAt,
          duration_ms: durationMs,
          error: result.error,
        };
      }
    } catch (err) {
      sessionTracker.failAgent(info.id);

      const completedAt = new Date().toISOString();
      return {
        agent_id: info.id,
        agent_name: info.name,
        status: 'failed',
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: +new Date(completedAt) - +new Date(startedAt),
        error: (err as Error).message,
      };
    }
  }

  /** List all known agents from the registry. */
  listKnownAgents() {
    return Array.from(AGENT_INDEX.values());
  }
}

export class AgentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}
