// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Session service — shared business logic for session, progress, drift (M20-002).
 *
 * Consumed by: HTTP routes (misc.ts, progress.ts, drift.ts) and MCP tools.
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import fsp from 'node:fs/promises';
import { resolveSessionFile } from '../session-state-resolver';
import type { ServiceContext, SessionState, ProgressInfo, RuntimeAlert } from './types';
import { buildEmptyPhases, buildPhaseProgress, buildProgressMcp } from './session/phase-progress';
import { getHelpTopic, getHelpTopics } from './session/help';
import { readSprintPlan, readSyncReports } from './session/drift';

const DEFAULT_PHASE_TIMEOUT_MS = Number(process.env.PHASE_TIMEOUT_MS ?? 45 * 60 * 1000);
const DEFAULT_STALL_ALERT_MS = Number(process.env.PHASE_STALL_ALERT_MS ?? 15 * 60 * 1000);

function parseIsoMs(value: string | undefined | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatDurationMinutes(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} minute(s)`;
}

function shouldEvaluateRuntimeAlerts(session: SessionState): boolean {
  const status = String(session.status || '').toUpperCase();
  return !['COMPLETED', 'COMPLETE', 'FAILED', 'ERROR', 'PAUSED', 'IDLE', 'STOPPED'].includes(
    status
  );
}

function buildRuntimeAlerts(session: SessionState): RuntimeAlert[] {
  if (!shouldEvaluateRuntimeAlerts(session)) return [];

  const now = Date.now();
  const phaseStartedAt =
    parseIsoMs(session.phase_started_at) ??
    parseIsoMs(session.initiated_at) ??
    parseIsoMs(session.last_updated);
  const lastUpdatedAt = parseIsoMs(session.last_updated) ?? phaseStartedAt;

  if (!phaseStartedAt || !lastUpdatedAt) return [];

  const alerts: RuntimeAlert[] = [];
  const phaseElapsedMs = now - phaseStartedAt;
  const idleForMs = now - lastUpdatedAt;

  if (phaseElapsedMs > DEFAULT_PHASE_TIMEOUT_MS) {
    alerts.push({
      id: 'phase-timeout',
      kind: 'timeout',
      severity: 'critical',
      title: 'Phase wall-clock timeout exceeded',
      detail: `Current phase has been active for ${formatDurationMinutes(phaseElapsedMs)} (threshold ${formatDurationMinutes(DEFAULT_PHASE_TIMEOUT_MS)}).`,
      next_action:
        'Review blockers, decide whether to reroute, or pause and resume with an updated command.',
    });
  }

  if (idleForMs > DEFAULT_STALL_ALERT_MS) {
    alerts.push({
      id: 'phase-stall',
      kind: 'stall',
      severity: 'warning',
      title: 'Execution appears stalled',
      detail: `No session update has been recorded for ${formatDurationMinutes(idleForMs)} (threshold ${formatDurationMinutes(DEFAULT_STALL_ALERT_MS)}).`,
      next_action:
        'Inspect active agent logs and queue state, then resume, retry, or escalate to human review.',
    });
  }

  return alerts;
}

export class SessionService {
  private ctx: ServiceContext;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  /* ── Read session state (sync, from store) ──────────────────── */

  readSessionState(): SessionState | null {
    const sessionFile = resolveSessionFile(this.ctx.store, this.ctx.cache, this.ctx.sessionDir);
    if (!sessionFile || !this.ctx.store.exists(sessionFile)) return null;
    try {
      return JSON.parse(this.ctx.cache.read(sessionFile)) as SessionState;
    } catch {
      return null;
    }
  }

  /* ── Read session state (async, from filesystem directly) ───── */

  async readSessionStateAsync(): Promise<SessionState | null> {
    const sessionFile =
      resolveSessionFile(this.ctx.store, this.ctx.cache, this.ctx.sessionDir) ||
      path.join(this.ctx.sessionDir, 'session-state.json');
    try {
      return JSON.parse(await fsp.readFile(sessionFile, 'utf8')) as SessionState;
    } catch {
      return null;
    }
  }

  /* ── Build MCP-style progress info ──────────────────────────── */

  buildProgressMcp(session: SessionState | null): ProgressInfo {
    return buildProgressMcp(session);
  }

  /* ── Build detailed phase progress (used by GET /api/progress) ─ */

  buildPhaseProgress(session: SessionState): Array<{
    key: string;
    label: string;
    status: string;
    agents: Array<{
      id: string;
      name: string;
      status: string;
      automation_level: 'autonomous' | 'supervised' | 'human_required';
    }>;
    done: number;
    total: number;
  }> {
    return buildPhaseProgress(session);
  }

  /* ── Build empty phases placeholder ─────────────────────────── */

  buildEmptyPhases(): Array<{
    key: string;
    label: string;
    status: string;
    agents: Array<{
      id: string;
      name: string;
      status: string;
      automation_level: 'autonomous' | 'supervised' | 'human_required';
    }>;
    done: number;
    total: number;
  }> {
    return buildEmptyPhases();
  }

  /* ── Build session summary object ───────────────────────────── */

  buildSessionSummary(session: SessionState): Record<string, unknown> {
    const runtimeAlerts = buildRuntimeAlerts(session);
    return {
      session_id: session.session_id,
      cycle_type: session.cycle_type,
      status: session.status,
      current_phase: session.current_phase || null,
      current_agent: session.current_agent || null,
      current_agents: session.currentAgents || session.current_agents || [],
      current_step: session.current_step || null,
      initiated_at: session.initiated_at,
      last_updated: session.last_updated,
      blockers: session.blockers || [],
      open_human_escalations: (session.open_human_escalations || []).filter(
        (e) => e.status === 'OPEN'
      ),
      runtime_alerts: runtimeAlerts,
      phase_watch: {
        timeout_ms: DEFAULT_PHASE_TIMEOUT_MS,
        stall_alert_ms: DEFAULT_STALL_ALERT_MS,
      },
    };
  }

  /* ── Drift detection ────────────────────────────────────────── */

  checkDrift(
    driftDetector: (opts: {
      sessionState: SessionState;
      sprintPlanContent: string | null;
      syncReports: Record<string, string | null>;
    }) => unknown
  ): unknown {
    const session = this.readSessionState();
    if (!session) {
      return {
        generated_at: new Date().toISOString(),
        summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
        drifts: [],
        in_sync: { sprints: [], stories: 0 },
        error: 'No session state found',
      };
    }

    const sprintStatuses: Record<string, unknown> =
      (session.sprint_backlog && session.sprint_backlog.sprint_statuses) || {};
    const planPath = session.sprint_backlog && session.sprint_backlog.path;

    const sprintPlanContent = readSprintPlan(this.ctx, planPath || null);
    const syncReports = readSyncReports(this.ctx, sprintStatuses);
    return driftDetector({ sessionState: session, sprintPlanContent, syncReports });
  }

  /* ── Read audit log ─────────────────────────────────────────── */

  readAuditLog(limit = 50): { total: number; entries: object[] } {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 1000);
    const entries = this.ctx.audit.read(n);
    return { total: entries.length, entries };
  }

  /* ── Help system ────────────────────────────────────────────── */

  getHelpTopics(): Array<{ slug: string; file: string }> {
    return getHelpTopics(this.ctx.store, this.ctx.helpDir);
  }

  getHelpTopic(topic: string): { topic: string; content: string } | null {
    return getHelpTopic(this.ctx.store, this.ctx.helpDir, topic);
  }
}
