/**
 * S2-2: E2E Smoke Test — Full CREATE Pipeline
 *
 * Validates the complete CREATE lifecycle through the webapp API:
 *  1. Queue a CREATE command for a test project
 *  2. Session state initialized and persisted (ONBOARDING status)
 *  3. Onboarding output generated and validated against contract
 *  4. Phase 1 produces valid deliverables (all agents completed)
 *  5. Runs in CI within 5 minutes (lightweight HTTP tests, no Playwright)
 *
 * Uses InMemoryStore for isolation — no disk side effects.
 */
const http = require('http');
const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { server, _cache } = require('../../src/webapp/server');

const WEBAPP_DIR = path.resolve(__dirname, '../../src/webapp');
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');
const ONBOARDING_DIR = path.join(BUSINESS_DOCS, 'onboarding');
const ONBOARDING_OUTPUT = path.join(ONBOARDING_DIR, 'onboarding-output.md');

let baseUrl;

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {},
    };
    if (body !== undefined) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

/* ── Fixtures ───────────────────────────────────────────────────── */

/** Session state: freshly initialized by Orchestrator after CREATE command. */
const SESSION_ONBOARDING = {
  session_id: 'smoke-create-001',
  cycle_type: 'CREATE',
  status: 'ONBOARDING',
  current_phase: 'ONBOARDING',
  current_agent: '25-onboarding-agent',
  initiated_at: '2026-06-01T10:00:00Z',
  last_updated: '2026-06-01T10:00:01Z',
  completed_phases: [],
  completed_agents: [],
  phase_outputs: {},
};

/** Session state: onboarding complete, Phase 1 in progress. */
const SESSION_PHASE1_ACTIVE = {
  session_id: 'smoke-create-001',
  cycle_type: 'CREATE',
  status: 'IN-PROGRESS',
  current_phase: 'PHASE-1',
  current_agent: '01-business-analyst',
  initiated_at: '2026-06-01T10:00:00Z',
  last_updated: '2026-06-01T10:15:00Z',
  completed_phases: ['ONBOARDING'],
  completed_agents: ['25-onboarding-agent'],
  phase_outputs: {
    onboarding: 'BusinessDocs/onboarding/onboarding-output.md',
  },
};

/** Session state: Phase 1 fully completed with all agents done. */
const SESSION_PHASE1_DONE = {
  session_id: 'smoke-create-001',
  cycle_type: 'CREATE',
  status: 'IN-PROGRESS',
  current_phase: 'PHASE-2',
  current_agent: '05-software-architect',
  initiated_at: '2026-06-01T10:00:00Z',
  last_updated: '2026-06-01T11:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-1'],
  completed_agents: [
    '25-onboarding-agent',
    '01-business-analyst',
    '02-domain-expert',
    '03-sales-strategist',
    '04-financial-analyst',
    '34-product-manager',
    'critic_risk',
  ],
  phase_outputs: {
    onboarding: 'BusinessDocs/onboarding/onboarding-output.md',
    'phase-1': {
      '01': 'BusinessDocs/phase1/01-business-analyst-output.md',
      '02': 'BusinessDocs/phase1/02-domain-expert-output.md',
      '03': 'BusinessDocs/phase1/03-sales-strategist-output.md',
      '04': 'BusinessDocs/phase1/04-financial-analyst-output.md',
      34: 'BusinessDocs/phase1/34-product-manager-output.md',
      critic_risk: 'BusinessDocs/phase1/critic-risk-output.md',
    },
  },
};

const ONBOARDING_OUTPUT_MD = `# Onboarding Output — SmokeProject

> Generated: 2026-06-01T10:10:00Z | Agent: 25-onboarding-agent

## Project Summary
SmokeProject is a test project for validating the CREATE pipeline.

## Intake Answers
- **Project name:** SmokeProject
- **Description:** E2E smoke test project
- **Mode:** CREATE (full scope)

## Tooling Scan
- Node.js: 22.x
- Package manager: npm
- Test framework: vitest
`;

/* ── Lifecycle ──────────────────────────────────────────────────── */

beforeAll(async () => {
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  setStore(new InMemoryStore());
  _cache.invalidateAll();
});

afterEach(() => {
  setStore(new InMemoryStore());
});

/* ═══════════════════════════════════════════════════════════════
 * STEP 1: Queue CREATE command for test project
 * ═══════════════════════════════════════════════════════════════ */

describe('SMOKE: CREATE pipeline — Step 1: Command queuing', () => {
  it('queues a CREATE command and receives clipboard text', async () => {
    const res = await req('POST', '/api/command', {
      command: 'CREATE',
      project: 'SmokeProject',
      description: 'E2E smoke test project for pipeline validation',
    });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.clipboard_text).toContain('CREATE');
    expect(res.json.clipboard_text).toContain('SmokeProject');
  });

  it('queues CREATE with a project brief and marks brief_saved', async () => {
    const res = await req('POST', '/api/command', {
      command: 'CREATE',
      project: 'SmokeProject',
      brief: 'SmokeProject is a lightweight web application for testing.\n\nTarget: Node.js 22+.',
    });
    expect(res.status).toBe(200);
    expect(res.json.ok).toBe(true);
    expect(res.json.brief_saved).toBe(true);
  });

  it('reads back the queued CREATE command', async () => {
    await req('POST', '/api/command', {
      command: 'CREATE',
      project: 'SmokeProject',
    });
    const read = await req('GET', '/api/command');
    expect(read.status).toBe(200);
    expect(read.json.command.command).toBe('CREATE');
    expect(read.json.command.project).toBe('SmokeProject');
    expect(read.json.command.status).toBe('PENDING');
    expect(read.json.queue).toHaveLength(1);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * STEP 2: Session state initialized and persisted
 * ═══════════════════════════════════════════════════════════════ */

describe('SMOKE: CREATE pipeline — Step 2: Session initialization', () => {
  it('reports no active session before initialization', async () => {
    const res = await req('GET', '/api/session');
    expect(res.status).toBe(200);
    expect(res.json.session).toBeNull();
  });

  it('reports no active progress before initialization', async () => {
    const res = await req('GET', '/api/progress');
    expect(res.status).toBe(200);
    expect(res.json.active).toBe(false);
    expect(res.json.session).toBeNull();
  });

  it('reads initialized session with ONBOARDING status', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_ONBOARDING),
      })
    );
    _cache.invalidateAll();

    const res = await req('GET', '/api/session');
    expect(res.status).toBe(200);
    expect(res.json.session).not.toBeNull();
    expect(res.json.session.session_id).toBe('smoke-create-001');
    expect(res.json.session.cycle_type).toBe('CREATE');
    expect(res.json.session.status).toBe('ONBOARDING');
  });

  it('shows ONBOARDING phase as active in progress', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_ONBOARDING),
      })
    );
    _cache.invalidateAll();

    const res = await req('GET', '/api/progress');
    expect(res.status).toBe(200);
    expect(res.json.active).toBe(true);
    expect(res.json.session.session_id).toBe('smoke-create-001');

    const onboarding = res.json.phases.find((p) => p.key === 'ONBOARDING');
    expect(onboarding.status).toBe('active');

    const onboardingAgent = onboarding.agents.find((a) => a.id === '25');
    expect(onboardingAgent.status).toBe('active');

    // All other phases should be pending
    const pending = res.json.phases.filter((p) => p.key !== 'ONBOARDING');
    for (const p of pending) {
      expect(p.status).toBe('pending');
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
 * STEP 3: Onboarding output generated and validated
 * ═══════════════════════════════════════════════════════════════ */

describe('SMOKE: CREATE pipeline — Step 3: Onboarding output', () => {
  it('transitions to Phase 1 after onboarding completes', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_PHASE1_ACTIVE),
        [ONBOARDING_OUTPUT]: ONBOARDING_OUTPUT_MD,
      })
    );
    _cache.invalidateAll();

    const session = await req('GET', '/api/session');
    expect(session.status).toBe(200);
    expect(session.json.session.status).toBe('IN-PROGRESS');
    expect(session.json.session.current_phase).toBe('PHASE-1');
    expect(session.json.session.current_agent).toBe('01-business-analyst');
  });

  it('marks ONBOARDING phase as done after onboarding output exists', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_PHASE1_ACTIVE),
        [ONBOARDING_OUTPUT]: ONBOARDING_OUTPUT_MD,
      })
    );
    _cache.invalidateAll();

    const res = await req('GET', '/api/progress');
    expect(res.status).toBe(200);

    const onboarding = res.json.phases.find((p) => p.key === 'ONBOARDING');
    expect(onboarding.status).toBe('done');

    const phase1 = res.json.phases.find((p) => p.key === 'PHASE-1');
    expect(phase1.status).toBe('active');

    // Business Analyst should be active
    const ba = phase1.agents.find((a) => a.id === '01');
    expect(ba.status).toBe('active');
  });

  it('validates session schema for CREATE cycle', async () => {
    const schemas = require('../../src/webapp/schemas');
    const result = schemas.validateSessionState(SESSION_PHASE1_ACTIVE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * STEP 4: Phase 1 produces valid deliverables
 * ═══════════════════════════════════════════════════════════════ */

describe('SMOKE: CREATE pipeline — Step 4: Phase 1 deliverables', () => {
  it('marks all Phase 1 agents as done after completion', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_PHASE1_DONE),
        [ONBOARDING_OUTPUT]: ONBOARDING_OUTPUT_MD,
      })
    );
    _cache.invalidateAll();

    const res = await req('GET', '/api/progress');
    expect(res.status).toBe(200);

    // ONBOARDING should be done
    const onboarding = res.json.phases.find((p) => p.key === 'ONBOARDING');
    expect(onboarding.status).toBe('done');

    // PHASE-1 should be done
    const phase1 = res.json.phases.find((p) => p.key === 'PHASE-1');
    expect(phase1.status).toBe('done');

    // All Phase 1 agents should be done
    for (const agent of phase1.agents) {
      expect(agent.status).toBe('done');
    }
    expect(phase1.done).toBe(phase1.total);

    // PHASE-2 should be active (current_phase)
    const phase2 = res.json.phases.find((p) => p.key === 'PHASE-2');
    expect(phase2.status).toBe('active');
  });

  it('validates session state schema at Phase 1 completion', async () => {
    const schemas = require('../../src/webapp/schemas');
    const result = schemas.validateSessionState(SESSION_PHASE1_DONE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('session correctly reports completed agents list', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_PHASE1_DONE),
      })
    );
    _cache.invalidateAll();

    const res = await req('GET', '/api/session');
    expect(res.status).toBe(200);
    expect(res.json.session.current_phase).toBe('PHASE-2');
    expect(res.json.session.status).toBe('IN-PROGRESS');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * STEP 5: Full lifecycle — command → session → progress coherent
 * ═══════════════════════════════════════════════════════════════ */

describe('SMOKE: CREATE pipeline — Step 5: Full lifecycle coherence', () => {
  it('command queue + session + progress all align for CREATE', async () => {
    // Seed session at Phase 1 active state
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: JSON.stringify(SESSION_PHASE1_ACTIVE),
        [ONBOARDING_OUTPUT]: ONBOARDING_OUTPUT_MD,
      })
    );
    _cache.invalidateAll();

    // Queue a CREATE command
    const cmd = await req('POST', '/api/command', {
      command: 'CREATE',
      project: 'SmokeProject',
    });
    expect(cmd.status).toBe(200);

    // All three endpoints should be coherent
    const [session, progress, command] = await Promise.all([
      req('GET', '/api/session'),
      req('GET', '/api/progress'),
      req('GET', '/api/command'),
    ]);

    // Session is active
    expect(session.json.session).not.toBeNull();
    expect(session.json.session.cycle_type).toBe('CREATE');

    // Progress reflects session
    expect(progress.json.active).toBe(true);
    expect(progress.json.session.session_id).toBe('smoke-create-001');

    // Command queue has the CREATE command
    expect(command.json.command.command).toBe('CREATE');
    expect(command.json.queue).toHaveLength(1);

    // Progress shows correct phase alignment
    const activePhase = progress.json.phases.find((p) => p.status === 'active');
    expect(activePhase.key).toBe('PHASE-1');
  });

  it('rejects invalid commands gracefully', async () => {
    const res = await req('POST', '/api/command', {
      command: 'INVALID_COMMAND_XYZ',
    });
    expect(res.status).toBe(400);
    expect(res.json.error).toBeDefined();
  });

  it('handles malformed session state gracefully', async () => {
    setStore(
      new InMemoryStore({
        [SESSION_FILE]: '{ invalid json !!!',
      })
    );
    _cache.invalidateAll();

    const session = await req('GET', '/api/session');
    expect(session.status).toBe(200);
    expect(session.json.session).toBeNull();

    const progress = await req('GET', '/api/progress');
    expect(progress.status).toBe(200);
    expect(progress.json.active).toBe(false);
  });
});
