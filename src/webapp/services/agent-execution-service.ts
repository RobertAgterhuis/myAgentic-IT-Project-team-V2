// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agent Execution Service (M31-001 … M31-005).
 *
 * Wraps the platform Dispatcher to allow ad-hoc execution of individual
 * agents from the UI, independent of the state machine flow.
 * Tracks running jobs for status/result/cancel support.
 */

import { randomUUID } from 'node:crypto';
import { Dispatcher, PHASE_AGENTS } from '../../../platform/engine/dispatcher';
import { getStore } from '../store';
import { sessionTracker } from '../session-tracker';
import type { ServiceContext } from './types';
import { resolveAdapter } from '../../../platform/engine/agent-runtime-adapter';
import { AGENT_RUNTIME_ADAPTER } from '../config';
import { GitBackendRouter } from './git/git-backend-router';
import { GitService } from './git/git-service';

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
    workspaceId?: string;
  };
}

export type ExecutionJobStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecuteAgentResult {
  job_id: string;
  agent_id: string;
  agent_name: string;
  status: ExecutionJobStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  output_path?: string;
  error?: string;
  confidence?: number;
  uncertainty_reasons?: string[];
  needs_human_review?: boolean;
  logs: ExecutionLogEntry[];
}

export interface ExecutionLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

/** In-memory store for tracking running & finished agent executions. */
const JOB_STORE = new Map<string, ExecuteAgentResult>();

/** AbortControllers for cancellable executions. */
const JOB_ABORT = new Map<string, AbortController>();

/** Keep up to this many completed jobs in memory. */
const MAX_HISTORY = 200;

function pruneHistory() {
  if (JOB_STORE.size <= MAX_HISTORY) return;
  const completed = [...JOB_STORE.entries()]
    .filter(([, j]) => j.status !== 'running')
    .sort((a, b) => (a[1].started_at < b[1].started_at ? -1 : 1));
  const toRemove = completed.length - MAX_HISTORY;
  for (let i = 0; i < toRemove; i++) {
    JOB_STORE.delete(completed[i][0]);
  }
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

  /** Execute a single agent by ID. Returns immediately with a job_id while execution runs. */
  async execute(input: ExecuteAgentInput): Promise<ExecuteAgentResult> {
    const info = AGENT_INDEX.get(input.agentId);
    if (!info) {
      throw new AgentNotFoundError(`Unknown agent ID: ${input.agentId}`);
    }

    const jobId = `exec-${randomUUID()}`;
    const startedAt = new Date().toISOString();
    const ac = new AbortController();
    JOB_ABORT.set(jobId, ac);

    const job: ExecuteAgentResult = {
      job_id: jobId,
      agent_id: info.id,
      agent_name: info.name,
      status: 'running',
      started_at: startedAt,
      logs: [{ timestamp: startedAt, level: 'info', message: `Starting agent ${info.name}` }],
    };
    JOB_STORE.set(jobId, job);

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

    // I-A1-003: resolve adapter from registry; Dispatcher uses it instead of bare throw.
    const { adapter } = resolveAdapter({ adapterName: AGENT_RUNTIME_ADAPTER });
    const dispatcher = new Dispatcher({ store: getStore(), adapter: adapter ?? undefined });
    const workspaceId = input.context?.workspaceId || 'default';
    const gitService = this.createGitService(workspaceId);

    // Build context
    const ctx = dispatcher.buildContext(info.id, {
      predecessorPaths: input.context?.predecessorPaths ?? [],
      questionnairePath: input.context?.questionnairePath,
      workspaceId,
      gitService,
    });

    try {
      // Check for cancellation before invoking
      if (ac.signal.aborted) {
        throw new AgentCancelledError('Execution cancelled before start');
      }

      job.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Dispatching to ${info.name} (${info.phase})`,
      });

      const result = await dispatcher.invoke({ id: info.id, name: info.name }, info.phase, ctx);

      // Check for cancellation after invoke
      if (ac.signal.aborted) {
        throw new AgentCancelledError('Execution cancelled');
      }

      const completedAt = new Date().toISOString();
      const durationMs = +new Date(completedAt) - +new Date(startedAt);
      const outputPath = result.outputPath as string | undefined;
      const confidence =
        typeof result.confidence === 'number' ? result.confidence : result.success ? 0.5 : 0;
      const uncertaintyReasons = Array.isArray(result.uncertainty_reasons)
        ? (result.uncertainty_reasons as string[])
        : result.success
          ? []
          : [String(result.error || 'Agent invocation failed')];
      const needsHumanReview =
        typeof result.needs_human_review === 'boolean'
          ? result.needs_human_review
          : !result.success || confidence < 0.6 || uncertaintyReasons.length > 0;

      if (result.success) {
        sessionTracker.completeAgent(info.id, outputPath ? [outputPath] : []);

        this._svc.audit.log({
          operation: 'AGENT_MANUAL_EXECUTE',
          entityType: 'agent',
          entityId: info.id,
          user: 'webapp',
          summary: `Manual execution of ${info.name} completed successfully`,
        });

        job.status = 'completed';
        job.completed_at = completedAt;
        job.duration_ms = durationMs;
        job.output_path = outputPath;
        job.confidence = confidence;
        job.uncertainty_reasons = uncertaintyReasons;
        job.needs_human_review = needsHumanReview;
        job.logs.push({ timestamp: completedAt, level: 'info', message: 'Execution completed' });
      } else {
        sessionTracker.failAgent(info.id);

        this._svc.audit.log({
          operation: 'AGENT_MANUAL_EXECUTE',
          entityType: 'agent',
          entityId: info.id,
          user: 'webapp',
          summary: `Manual execution of ${info.name} failed: ${result.error}`,
        });

        job.status = 'failed';
        job.completed_at = completedAt;
        job.duration_ms = durationMs;
        job.error = result.error;
        job.confidence = confidence;
        job.uncertainty_reasons = uncertaintyReasons;
        job.needs_human_review = needsHumanReview;
        job.logs.push({
          timestamp: completedAt,
          level: 'error',
          message: `Failed: ${result.error}`,
        });
      }
    } catch (err) {
      if (err instanceof AgentCancelledError) {
        job.status = 'cancelled';
      } else {
        sessionTracker.failAgent(info.id);
        job.status = 'failed';
        job.error = (err as Error).message;
        job.confidence = 0;
        job.uncertainty_reasons = [(err as Error).message];
        job.needs_human_review = true;
        job.logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: (err as Error).message,
        });
      }

      const completedAt = new Date().toISOString();
      job.completed_at = completedAt;
      job.duration_ms = +new Date(completedAt) - +new Date(startedAt);
    } finally {
      JOB_ABORT.delete(jobId);
      pruneHistory();
    }

    return job;
  }

  private createGitService(workspaceId: string): GitService {
    const repositoryPath = this._svc.projectRoot;
    const router = new GitBackendRouter({
      repositoryPath,
      workspaceId,
      env: process.env,
    });

    return new GitService({
      backend: router.getBackend(),
      audit: this._svc.audit,
      repositoryPath,
      actor: 'agent-execution',
    });
  }

  /** Get execution status by job ID (M31-002). */
  getJobStatus(jobId: string): ExecuteAgentResult | undefined {
    return JOB_STORE.get(jobId);
  }

  /** Get execution result; returns undefined if not found (M31-004). */
  getJobResult(jobId: string): ExecuteAgentResult | undefined {
    return JOB_STORE.get(jobId);
  }

  /** Cancel a running execution (M31-005). */
  cancelJob(jobId: string): boolean {
    const ac = JOB_ABORT.get(jobId);
    const job = JOB_STORE.get(jobId);
    if (!job) return false;
    if (job.status !== 'running') return false;

    ac?.abort();
    JOB_ABORT.delete(jobId);
    job.status = 'cancelled';
    job.completed_at = new Date().toISOString();
    job.duration_ms = +new Date(job.completed_at) - +new Date(job.started_at);
    job.logs.push({
      timestamp: job.completed_at,
      level: 'warn',
      message: 'Execution cancelled by user',
    });

    return true;
  }

  /** List all execution history (M31-009). */
  listExecutionHistory(): ExecuteAgentResult[] {
    return [...JOB_STORE.values()].sort((a, b) => (a.started_at > b.started_at ? -1 : 1));
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

export class AgentCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentCancelledError';
  }
}
