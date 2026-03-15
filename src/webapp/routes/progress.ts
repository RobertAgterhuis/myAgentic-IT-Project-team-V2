// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Progress route handler — GET /api/progress.
 * @module routes/progress
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import { getStore } from '../store';
import { json } from '../middleware';

/* ── Agent / phase constants ──────────────────────────────────── */

const PHASE_AGENTS = {
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
const PHASE_LABELS = {
  ONBOARDING: 'Onboarding',
  'PHASE-1': 'Phase 1 — Requirements & Strategy',
  'PHASE-2': 'Phase 2 — Architecture & Design',
  'PHASE-3': 'Phase 3 — Experience Design',
  'PHASE-4': 'Phase 4 — Brand & Growth',
  SYNTHESIS: 'Synthesis',
  'PHASE-5': 'Phase 5 — Implementation',
};

/* ── Progress helpers ─────────────────────────────────────────── */

function isAgentCompleted(agent, completedAgents) {
  const agentFile = agent.id + '-' + agent.name.toLowerCase().replace(/[^a-z]+/g, '-');
  return completedAgents.includes(agentFile) || completedAgents.includes(agent.id);
}

function isAgentActive(agent, phaseKey, currentPhase, currentAgent) {
  return (
    currentPhase === phaseKey &&
    currentAgent &&
    (currentAgent.startsWith(agent.id + '-') || currentAgent === agent.id)
  );
}

function hasAgentOutputAsObject(po, agentId) {
  return (
    po && typeof po === 'object' && po[agentId] && po[agentId] !== 'null' && po[agentId] !== null
  );
}

function hasOnboardingOutput(po, phaseKey) {
  return po && typeof po === 'string' && po !== 'null' && po !== null && phaseKey === 'ONBOARDING';
}

function resolveAgentStatus(
  agent,
  phaseKey,
  completedAgents,
  currentPhase,
  currentAgent,
  phaseOutputs
) {
  if (isAgentCompleted(agent, completedAgents)) return 'done';
  if (isAgentActive(agent, phaseKey, currentPhase, currentAgent)) return 'active';
  const po = phaseOutputs[phaseKey.toLowerCase()];
  if (hasAgentOutputAsObject(po, agent.id) || hasOnboardingOutput(po, phaseKey)) return 'done';
  return 'pending';
}

function resolvePhaseStatus(phaseKey, completedPhases, currentPhase, session) {
  if (completedPhases.includes(phaseKey)) return 'done';
  if (currentPhase === phaseKey) return 'active';
  if (phaseKey === 'PHASE-5' && session.sprint_backlog && session.sprint_backlog.total_sprints > 0)
    return 'active';
  return 'pending';
}

function buildPhaseProgress(session) {
  const completedPhases = session.completed_phases || [];
  const completedAgents = session.completed_agents || [];
  const currentPhase = session.current_phase || null;
  const phaseOutputs = session.phase_outputs || {};

  return PHASE_ORDER.map((phaseKey) => {
    const agents = (PHASE_AGENTS[phaseKey] || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: resolveAgentStatus(
        a,
        phaseKey,
        completedAgents,
        currentPhase,
        session.current_agent || null,
        phaseOutputs
      ),
    }));
    const phaseStatus = resolvePhaseStatus(phaseKey, completedPhases, currentPhase, session);
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

function buildSessionSummary(session) {
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

function buildEmptyPhases() {
  return PHASE_ORDER.map((key) => ({
    key,
    label: PHASE_LABELS[key],
    status: 'pending',
    agents: (PHASE_AGENTS[key] || []).map((a) => ({ id: a.id, name: a.name, status: 'pending' })),
    done: 0,
    total: (PHASE_AGENTS[key] || []).length,
  }));
}

function createProgressRoutes(ctx): Record<string, unknown> {
  const { _cache, SESSION_FILE, resolveSessionFile, _getLatestCommand } = ctx;

  async function apiGetProgress(_req, res) {
    const command = _getLatestCommand();
    const store = getStore();
    const sessionFile =
      typeof resolveSessionFile === 'function' ? resolveSessionFile() : SESSION_FILE;

    if (!sessionFile || !store.exists(sessionFile)) {
      return json(res, 200, { active: false, phases: buildEmptyPhases(), session: null, command });
    }
    let session;
    try {
      session = JSON.parse(_cache.read(sessionFile));
    } catch {
      return json(res, 200, { active: false, phases: buildEmptyPhases(), session: null, command });
    }

    const sprints = session.sprint_backlog
      ? {
          total: session.sprint_backlog.total_sprints || 0,
          statuses: session.sprint_backlog.sprint_statuses || {},
        }
      : null;

    json(res, 200, {
      active: true,
      session: buildSessionSummary(session),
      phases: buildPhaseProgress(session),
      sprints,
      command,
    });
  }

  return {
    'GET /api/progress': apiGetProgress,
  };
}

export = createProgressRoutes;
