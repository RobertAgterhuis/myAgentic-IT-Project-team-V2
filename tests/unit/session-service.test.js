import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

const path = require('path');
import * as __req_0 from '../../src/webapp/store';
const { InMemoryStore, setStore } = __req_0;
import * as __req_1 from '../../src/webapp/services';
const { SessionService } = __req_1;
import * as __req_2 from '../../src/webapp/cache';
const { FileCache } = __req_2;

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
const HELP_DIR = path.join(PROJECT_ROOT, 'docs', 'help');
const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');

function makeCtx(store) {
  const cache = new FileCache(store);
  return {
    store,
    cache,
    projectRoot: PROJECT_ROOT,
    businessDocs: BUSINESS_DOCS,
    sessionDir: SESSION_DIR,
    helpDir: HELP_DIR,
    audit: { read: (n) => [{ ts: '2025-01-01', action: 'test' }].slice(0, n) },
    safeWrite: () => {},
  };
}

const SESSION_STATE = {
  session_id: 'test-001',
  cycle_type: 'COMBO_AUDIT',
  status: 'SPRINT-IN-PROGRESS',
  current_phase: 'PHASE-2',
  current_agent: '05-software-architect',
  current_step: 'Testing',
  initiated_at: '2025-01-01T00:00:00Z',
  last_updated: '2025-01-01T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-1'],
  completed_agents: ['25-onboarding-agent', '01-business-analyst'],
  phase_outputs: {
    onboarding: 'BusinessDocs/onboarding/onboarding-output.md',
    'phase-1': { '01': 'BusinessDocs/phase-1/01-business-analyst.md' },
  },
  sprint_backlog: {
    path: 'BusinessDocs/sprints/plan.md',
    total_sprints: 2,
    sprint_statuses: { 'SP-1': 'DONE' },
  },
  blockers: [{ id: 'B1', text: 'Blocked' }],
  open_human_escalations: [
    { id: 'E1', status: 'OPEN' },
    { id: 'E2', status: 'RESOLVED' },
  ],
};

const PHASE_1_PARALLEL_AGENT_IDS = [
  '01-business-analyst',
  '02-domain-expert',
  '03-sales-strategist',
  '04-financial-analyst',
  '34-product-manager',
];

describe('SessionService', () => {
  let store;
  let svc;

  beforeEach(() => {
    store = new InMemoryStore({
      [SESSION_FILE]: JSON.stringify(SESSION_STATE),
      [path.join(HELP_DIR, 'tool-create.md')]: '# Create\nCreate things.',
      [path.join(HELP_DIR, 'tool-audit.md')]: '# Audit\nAudit things.',
    });
    setStore(store);
    svc = new SessionService(makeCtx(store));
  });

  it('reads session state from store', () => {
    const state = svc.readSessionState();
    expect(state).toBeTruthy();
    expect(state.session_id).toBe('test-001');
    expect(state.current_phase).toBe('PHASE-2');
  });

  it('returns null when session file is missing', () => {
    store = new InMemoryStore({});
    setStore(store);
    svc = new SessionService(makeCtx(store));
    expect(svc.readSessionState()).toBeNull();
  });

  it('returns null when session file has invalid JSON', () => {
    store = new InMemoryStore({ [SESSION_FILE]: 'not-json{' });
    setStore(store);
    svc = new SessionService(makeCtx(store));
    expect(svc.readSessionState()).toBeNull();
  });

  it('builds progress MCP info from session', () => {
    const info = svc.buildProgressMcp(SESSION_STATE);
    expect(info.currentPhase).toBe('PHASE-2');
    expect(info.currentAgent).toBe('05-software-architect');
    expect(info.currentAgents).toEqual([]);
  });

  it('builds progress MCP info when session is null', () => {
    const info = svc.buildProgressMcp(null);
    expect(info.projectName).toBeNull();
    expect(info.phases).toEqual([]);
  });

  it('builds phase progress with correct statuses', () => {
    const phases = svc.buildPhaseProgress(SESSION_STATE);
    expect(phases).toHaveLength(7);
    const onboarding = phases.find((p) => p.key === 'ONBOARDING');
    expect(onboarding.status).toBe('done');
    const phase1 = phases.find((p) => p.key === 'PHASE-1');
    expect(phase1.status).toBe('done');
    const phase2 = phases.find((p) => p.key === 'PHASE-2');
    expect(phase2.status).toBe('active');
    const phase5 = phases.find((p) => p.key === 'PHASE-5');
    expect(phase5.status).toBe('active'); // has sprint_backlog with total_sprints > 0
  });

  it('resolves agent statuses within phases', () => {
    const phases = svc.buildPhaseProgress(SESSION_STATE);
    const phase2 = phases.find((p) => p.key === 'PHASE-2');
    const architect = phase2.agents.find((a) => a.id === '05');
    expect(architect.status).toBe('active');
    const phase1 = phases.find((p) => p.key === 'PHASE-1');
    const ba = phase1.agents.find((a) => a.id === '01');
    expect(ba.status).toBe('done');
  });

  it('builds empty phases', () => {
    const phases = svc.buildEmptyPhases();
    expect(phases).toHaveLength(7);
    expect(phases.every((p) => p.status === 'pending')).toBe(true);
    expect(phases.every((p) => p.done === 0)).toBe(true);
  });

  it('builds session summary', () => {
    const summary = svc.buildSessionSummary(SESSION_STATE);
    expect(summary.session_id).toBe('test-001');
    expect(summary.current_agents).toEqual([]);
    expect(summary.blockers).toHaveLength(1);
    expect(summary.open_human_escalations).toHaveLength(1); // only OPEN ones
  });

  it('marks all tracked Phase 1 agents active when current_agents is populated', () => {
    const state5 = {
      ...SESSION_STATE,
      current_phase: 'PHASE-1',
      current_agent: '01-business-analyst',
      current_agents: PHASE_1_PARALLEL_AGENT_IDS,
      completed_phases: ['ONBOARDING'],
      completed_agents: ['25-onboarding-agent'],
    };

    const info = svc.buildProgressMcp(state5);
    expect(info.currentAgents).toEqual(PHASE_1_PARALLEL_AGENT_IDS);

    const phases = svc.buildPhaseProgress(state5);
    const phase1 = phases.find((p) => p.key === 'PHASE-1');
    const activePhase1Agents = phase1.agents
      .filter((agent) =>
        PHASE_1_PARALLEL_AGENT_IDS.includes(
          `${agent.id}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        )
      )
      .filter((agent) => agent.status === 'active');

    expect(activePhase1Agents).toHaveLength(5);
  });

  it('reads audit log', () => {
    const log = svc.readAuditLog(10);
    expect(log.total).toBe(1);
    expect(log.entries).toHaveLength(1);
  });

  it('lists help topics', () => {
    const topics = svc.getHelpTopics();
    expect(topics).toHaveLength(2);
    expect(topics.map((t) => t.slug)).toContain('tool-create');
  });

  it('gets a specific help topic', () => {
    const topic = svc.getHelpTopic('tool-create');
    expect(topic).toBeTruthy();
    expect(topic.content).toContain('Create things');
  });

  it('returns null for missing help topic', () => {
    expect(svc.getHelpTopic('nonexistent')).toBeNull();
  });

  it('sanitizes topic slug', () => {
    expect(svc.getHelpTopic('../../../etc/passwd')).toBeNull();
  });

  it('checkDrift returns error when no session', () => {
    store = new InMemoryStore({});
    setStore(store);
    svc = new SessionService(makeCtx(store));
    const result = svc.checkDrift(() => null);
    expect(result.error).toContain('No session state');
    expect(result.summary.total_drifts).toBe(0);
  });

  it('checkDrift calls detector with session data and sync reports', () => {
    // Add sprint sync report file
    const sprintsDir = path.join(BUSINESS_DOCS, 'sprints');
    store.writeFile(path.join(sprintsDir, 'SP-1', 'github-sync-report.md'), '# Sync OK');
    // Add sprint plan file
    store.writeFile(path.join(BUSINESS_DOCS, 'sprints', 'plan.md'), '# Sprint Plan');

    let captured;
    svc.checkDrift((opts) => {
      captured = opts;
      return { drifts: [] };
    });
    expect(captured.sessionState.session_id).toBe('test-001');
    expect(captured.sprintPlanContent).toContain('Sprint Plan');
    expect(captured.syncReports['SP-1']).toContain('Sync OK');
  });

  it('checkDrift reads sync report from phase-5 fallback dir', () => {
    const state2 = {
      ...SESSION_STATE,
      sprint_backlog: { sprint_statuses: { 'SP-2': 'IN_PROGRESS' } },
    };
    store.writeFile(SESSION_FILE, JSON.stringify(state2));
    const phase5Dir = path.join(BUSINESS_DOCS, 'phase-5');
    store.writeFile(path.join(phase5Dir, 'sprint-SP-2', 'github-sync-report.md'), '# Phase5 Sync');

    const cache2 = new FileCache(store);
    svc = new SessionService({ ...makeCtx(store), cache: cache2 });
    let captured;
    svc.checkDrift((opts) => {
      captured = opts;
      return { ok: true };
    });
    expect(captured.syncReports['SP-2']).toContain('Phase5 Sync');
  });

  it('resolves agent via phase_outputs for onboarding', () => {
    const state3 = {
      ...SESSION_STATE,
      current_phase: 'PHASE-3',
      current_agent: '10-ux-researcher',
      completed_phases: ['ONBOARDING'],
      completed_agents: [],
      phase_outputs: { onboarding: 'something' },
    };
    store.writeFile(SESSION_FILE, JSON.stringify(state3));
    const cache3 = new FileCache(store);
    svc = new SessionService({ ...makeCtx(store), cache: cache3 });
    const phases = svc.buildPhaseProgress(state3);
    const onboarding = phases.find((p) => p.key === 'ONBOARDING');
    expect(onboarding.agents[0].status).toBe('done');
  });

  it('resolves agent via phase_outputs for non-onboarding phase', () => {
    const state4 = {
      ...SESSION_STATE,
      completed_phases: [],
      completed_agents: [],
      current_phase: 'PHASE-3',
      current_agent: null,
      phase_outputs: { 'phase-2': { '05': 'some-output.md' } },
    };
    const phases = svc.buildPhaseProgress(state4);
    const phase2 = phases.find((p) => p.key === 'PHASE-2');
    const architect = phase2.agents.find((a) => a.id === '05');
    expect(architect.status).toBe('done');
  });

  it('adds hybrid injection agents to mapped progress phases and skips invalid duplicates', () => {
    const state5 = {
      ...SESSION_STATE,
      execution_mode: 'HYBRID',
      current_phase: 'PHASE-2',
      current_agent: null,
      current_agents: ['90'],
      execution_plan: {
        hybridInjections: [
          {
            atState: 'PHASE_2',
            agents: [
              { id: '90', name: 'Hybrid UX' },
              { id: '90', name: 'Hybrid UX' },
              { id: '', name: 'Ignored Missing Id' },
            ],
          },
          {
            atState: 'SYNTHESIS',
            agents: [{ id: '91', name: 'Synthesis Specialist' }],
          },
          {
            atState: 'UNKNOWN_STATE',
            agents: [{ id: '92', name: 'Ignored Unknown State' }],
          },
        ],
      },
    };

    const phases = svc.buildPhaseProgress(state5);
    const phase2 = phases.find((p) => p.key === 'PHASE-2');
    const synthesis = phases.find((p) => p.key === 'SYNTHESIS');

    expect(phase2.agents.filter((agent) => agent.id === '90')).toHaveLength(1);
    expect(phase2.agents.find((agent) => agent.id === '90')).toMatchObject({
      name: 'Hybrid UX',
      status: 'active',
      automation_level: 'autonomous',
    });
    expect(synthesis.agents.find((agent) => agent.id === '91')).toMatchObject({
      name: 'Synthesis Specialist',
      status: 'pending',
      automation_level: 'autonomous',
    });
    expect(phases.every((phase) => phase.agents.every((agent) => agent.id !== '92'))).toBe(true);
  });

  it('shows selected agency roster in onboarding for AGENCY_ONLY mode', () => {
    const state6 = {
      ...SESSION_STATE,
      execution_mode: 'AGENCY_ONLY',
      execution_plan: {
        selectedAgencyAgents: [
          { id: '88', name: 'Brand Strategist' },
          { id: '88', name: 'Brand Strategist' },
          { id: '89', name: 'Growth Lead' },
          { id: '', name: 'Ignored Missing Id' },
        ],
      },
    };

    const phases = svc.buildPhaseProgress(state6);
    const onboarding = phases.find((p) => p.key === 'ONBOARDING');

    expect(onboarding.agents.filter((agent) => agent.id === '88')).toHaveLength(1);
    expect(onboarding.agents.find((agent) => agent.id === '88')).toMatchObject({
      name: 'Brand Strategist',
      status: 'done',
      automation_level: 'autonomous',
    });
    expect(onboarding.agents.find((agent) => agent.id === '89')).toMatchObject({
      name: 'Growth Lead',
      status: 'done',
      automation_level: 'autonomous',
    });
  });

  it('builds runtime alerts for stalled long-running sessions', () => {
    const now = Date.now();
    const summary = svc.buildSessionSummary({
      ...SESSION_STATE,
      status: 'RUNNING',
      initiated_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      phase_started_at: new Date(now - 75 * 60 * 1000).toISOString(),
      last_updated: new Date(now - 20 * 60 * 1000).toISOString(),
    });

    expect(summary.runtime_alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'phase-timeout', kind: 'timeout', severity: 'critical' }),
        expect.objectContaining({ id: 'phase-stall', kind: 'stall', severity: 'warning' }),
      ])
    );
    expect(summary.phase_watch).toMatchObject({
      timeout_ms: expect.any(Number),
      stall_alert_ms: expect.any(Number),
    });
  });

  it('skips runtime alerts for terminal session states', () => {
    const now = Date.now();
    const summary = svc.buildSessionSummary({
      ...SESSION_STATE,
      status: 'COMPLETED',
      phase_started_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      last_updated: new Date(now - 30 * 60 * 1000).toISOString(),
    });

    expect(summary.runtime_alerts).toEqual([]);
  });
});
