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
import type { ServiceContext, SessionState, ProgressInfo } from './types';

/* ── Phase / agent constants ──────────────────────────────────── */

const PHASE_AGENTS: Record<string, Array<{ id: string; name: string }>> = {
  ONBOARDING: [{ id: '25', name: 'Onboarding Agent' }],
  'PHASE-1': [
    { id: '01', name: 'Business Analyst' },
    { id: '02', name: 'Domain Expert' },
    { id: '03', name: 'Sales Strategist' },
    { id: '04', name: 'Financial Analyst' },
    { id: '34', name: 'Product Manager' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-2': [
    { id: '05', name: 'Software Architect' },
    { id: '06', name: 'Senior Developer' },
    { id: '07', name: 'DevOps Engineer' },
    { id: '08', name: 'Security Architect' },
    { id: '09', name: 'Data Architect' },
    { id: '33', name: 'Legal Counsel' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-3': [
    { id: '10', name: 'UX Researcher' },
    { id: '11', name: 'UX Designer' },
    { id: '12', name: 'UI Designer' },
    { id: '13', name: 'Accessibility Specialist' },
    { id: '32', name: 'Content Strategist' },
    { id: '35', name: 'Localization Specialist' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-4': [
    { id: '14', name: 'Brand Strategist' },
    { id: '15', name: 'Growth Marketer' },
    { id: '16', name: 'CRO Specialist' },
    { id: 'critic_risk', name: 'Critic + Risk' },
    { id: '30', name: 'Brand & Assets Agent' },
    { id: '31', name: 'Storybook Agent' },
  ],
  SYNTHESIS: [
    { id: '17', name: 'Synthesis Agent' },
    { id: '27', name: 'GitHub Integration' },
  ],
  'PHASE-5': [
    { id: '20', name: 'Implementation Agent' },
    { id: '21', name: 'Test Agent' },
    { id: '22', name: 'PR/Review Agent' },
    { id: '29', name: 'KPI Agent' },
    { id: '26', name: 'Documentation Agent' },
    { id: '27', name: 'GitHub Integration' },
    { id: '28', name: 'Retrospective Agent' },
  ],
};

const PHASE_ORDER = [
  'ONBOARDING',
  'PHASE-1',
  'PHASE-2',
  'PHASE-3',
  'PHASE-4',
  'SYNTHESIS',
  'PHASE-5',
];

const PHASE_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  'PHASE-1': 'Phase 1 — Requirements & Strategy',
  'PHASE-2': 'Phase 2 — Architecture & Design',
  'PHASE-3': 'Phase 3 — Experience Design',
  'PHASE-4': 'Phase 4 — Brand & Growth',
  SYNTHESIS: 'Synthesis',
  'PHASE-5': 'Phase 5 — Implementation',
};

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
    if (!session) {
      return {
        projectName: null,
        mode: null,
        currentPhase: null,
        currentAgent: null,
        phases: [],
        activeSprint: null,
      };
    }
    return {
      projectName: session.projectName || null,
      mode: session.mode || null,
      currentPhase: session.currentPhase || session.current_phase || null,
      currentAgent: session.currentAgent || session.current_agent || null,
      phases: session.phases || [],
      activeSprint: session.activeSprint || null,
    };
  }

  /* ── Build detailed phase progress (used by GET /api/progress) ─ */

  buildPhaseProgress(session: SessionState): Array<{
    key: string;
    label: string;
    status: string;
    agents: Array<{ id: string; name: string; status: string }>;
    done: number;
    total: number;
  }> {
    const completedPhases = session.completed_phases || [];
    const completedAgents = session.completed_agents || [];
    const currentPhase = session.current_phase || null;
    const phaseOutputs = session.phase_outputs || {};

    return PHASE_ORDER.map((phaseKey) => {
      const agents = (PHASE_AGENTS[phaseKey] || []).map((a) => ({
        id: a.id,
        name: a.name,
        status: this.resolveAgentStatus(
          a,
          phaseKey,
          completedAgents,
          currentPhase,
          session.current_agent || null,
          phaseOutputs
        ),
      }));
      const phaseStatus = this.resolvePhaseStatus(phaseKey, completedPhases, currentPhase, session);
      const done = agents.filter((a) => a.status === 'done').length;
      return {
        key: phaseKey,
        label: PHASE_LABELS[phaseKey],
        status: phaseStatus,
        agents,
        done,
        total: agents.length,
      };
    });
  }

  /* ── Build empty phases placeholder ─────────────────────────── */

  buildEmptyPhases(): Array<{
    key: string;
    label: string;
    status: string;
    agents: Array<{ id: string; name: string; status: string }>;
    done: number;
    total: number;
  }> {
    return PHASE_ORDER.map((key) => ({
      key,
      label: PHASE_LABELS[key],
      status: 'pending',
      agents: (PHASE_AGENTS[key] || []).map((a) => ({
        id: a.id,
        name: a.name,
        status: 'pending',
      })),
      done: 0,
      total: (PHASE_AGENTS[key] || []).length,
    }));
  }

  /* ── Build session summary object ───────────────────────────── */

  buildSessionSummary(session: SessionState): Record<string, unknown> {
    return {
      session_id: session.session_id,
      cycle_type: session.cycle_type,
      status: session.status,
      current_phase: session.current_phase || null,
      current_agent: session.current_agent || null,
      current_step: session.current_step || null,
      initiated_at: session.initiated_at,
      last_updated: session.last_updated,
      blockers: session.blockers || [],
      open_human_escalations: (session.open_human_escalations || []).filter(
        (e) => e.status === 'OPEN'
      ),
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

    let sprintPlanContent: string | null = null;
    if (planPath) {
      const abs = path.resolve(this.ctx.projectRoot, planPath);
      try {
        sprintPlanContent = this.ctx.store.readFile(abs);
      } catch {
        /* missing plan */
      }
    }

    const syncReports = this.readSyncReports(sprintStatuses);
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
    try {
      const files = this.ctx.store.readdir(this.ctx.helpDir).filter((f) => {
        const name = typeof f === 'string' ? f : f.name;
        return name.endsWith('.md');
      });
      return files.map((f) => {
        const name = typeof f === 'string' ? f : f.name;
        return { slug: name.replace('.md', ''), file: name };
      });
    } catch {
      return [];
    }
  }

  getHelpTopic(topic: string): { topic: string; content: string } | null {
    const safe = topic.replace(/[^a-z0-9_-]/gi, '');
    const file = path.join(this.ctx.helpDir, `${safe}.md`);
    if (!this.ctx.store.exists(file)) return null;
    return { topic: safe, content: this.ctx.store.readFile(file) };
  }

  /* ── Private helpers ────────────────────────────────────────── */

  private resolveAgentStatus(
    agent: { id: string; name: string },
    phaseKey: string,
    completedAgents: string[],
    currentPhase: string | null,
    currentAgent: string | null,
    phaseOutputs: Record<string, unknown>
  ): string {
    if (this.isAgentCompleted(agent, completedAgents)) return 'done';
    if (this.isAgentActive(agent, phaseKey, currentPhase, currentAgent)) return 'active';
    const po = phaseOutputs[phaseKey.toLowerCase()];
    if (
      (po && typeof po === 'object' && po[agent.id] && po[agent.id] !== 'null') ||
      (po && typeof po === 'string' && po !== 'null' && phaseKey === 'ONBOARDING')
    ) {
      return 'done';
    }
    return 'pending';
  }

  private isAgentCompleted(
    agent: { id: string; name: string },
    completedAgents: string[]
  ): boolean {
    const agentFile = agent.id + '-' + agent.name.toLowerCase().replace(/[^a-z]+/g, '-');
    return completedAgents.includes(agentFile) || completedAgents.includes(agent.id);
  }

  private isAgentActive(
    agent: { id: string },
    phaseKey: string,
    currentPhase: string | null,
    currentAgent: string | null
  ): boolean {
    return (
      currentPhase === phaseKey &&
      !!currentAgent &&
      (currentAgent.startsWith(agent.id + '-') || currentAgent === agent.id)
    );
  }

  private resolvePhaseStatus(
    phaseKey: string,
    completedPhases: string[],
    currentPhase: string | null,
    session: SessionState
  ): string {
    if (completedPhases.includes(phaseKey)) return 'done';
    if (currentPhase === phaseKey) return 'active';
    if (
      phaseKey === 'PHASE-5' &&
      session.sprint_backlog &&
      (session.sprint_backlog.total_sprints || 0) > 0
    ) {
      return 'active';
    }
    return 'pending';
  }

  private readSyncReports(sprintStatuses: Record<string, unknown>): Record<string, string | null> {
    const sprintsDir = path.join(this.ctx.businessDocs, 'sprints');
    const phase5Dir = path.join(this.ctx.businessDocs, 'phase-5');
    const reports: Record<string, string | null> = {};

    for (const sprintId of Object.keys(sprintStatuses)) {
      reports[sprintId] = null;
      const path1 = path.join(sprintsDir, sprintId, 'github-sync-report.md');
      if (this.ctx.store.exists(path1)) {
        try {
          reports[sprintId] = this.ctx.store.readFile(path1);
          continue;
        } catch {
          /* fall through */
        }
      }
      const path2 = path.join(phase5Dir, `sprint-${sprintId}`, 'github-sync-report.md');
      if (this.ctx.store.exists(path2)) {
        try {
          reports[sprintId] = this.ctx.store.readFile(path2);
        } catch {
          /* ignore */
        }
      }
    }
    return reports;
  }
}
