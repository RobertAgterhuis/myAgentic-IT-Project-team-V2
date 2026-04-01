/* M30-007: Server API integration tests via Fastify inject().
 * Replaces server-api.test.js (raw HTTP) with framework-native testing.
 * Uses InMemoryStore and app.inject() for full isolation. */

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp, paths } = require('../helpers/create-test-app');

const { BUSINESS_DOCS, SESSION_FILE, DECISIONS_FILE, COMMAND_QUEUE, HELP_DIR } = paths;

let app;

/* ── Fixtures ─────────────────────────────────────────────────── */

const Q_FILE_REL = 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md';

const QUESTIONNAIRE_MD = `# Questionnaire: Software Architect

> Phase: Phase 2 | Generated: 2025-01-01 | Version: 1.0

## Section 1: Architecture

### Q-05-001 [REQUIRED]
**Question:** What is the target deployment environment?
**Why we need this:** To determine infrastructure requirements.
**Expected format:** Text description
**Example:** Cloud-based Kubernetes cluster
**Your answer:**
> *(fill in here)*

## Answer Status

| Q-ID | Status | Last Updated |
|------|--------|--------------|
| Q-05-001 | OPEN | — |
`;

const SESSION_STATE = {
  session_id: 'test-session',
  cycle_type: 'FULL_CREATE',
  status: 'IN_PROGRESS',
  current_phase: 'PHASE-2',
  current_agent: '05-software-architect',
  initiated_at: '2025-01-01T00:00:00Z',
  last_updated: '2025-01-02T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-1'],
  completed_agents: ['25-onboarding-agent'],
  phase_outputs: {},
  sprint_backlog: { total_sprints: 3, sprint_statuses: { 'SP-1': 'DONE' } },
};

const DECISIONS_MD = `# Decisions & Open Questions

---

## Open Questions (waiting for your answer)

| ID | Priority | Scope | Question | Your answer | Date |
|----|-----------|-------|-------|---------------|-------|
| DEC-R2-010 | HIGH | Phase 2 | Which DB to use? | | 2025-01-01 |

---

## Decided Items (agents act on these)

### Transformation Decisions (DEC-T series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

### Reevaluation Decisions (DEC-R2 series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

### Operational Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|
| DEC-100 | — | — | *(Add a decision here)* | | |

---

## Deferred & Expired

| ID | Status | Scope | Subject | Reason | Date |
|----|--------|-------|---------|--------|------|

---

## Audit Trail
`;

function seedFiles() {
  const qPath = path.join(BUSINESS_DOCS, Q_FILE_REL);
  const helpPath = path.join(HELP_DIR, 'getting-started.md');
  const commandsPath = path.join(HELP_DIR, 'commands.md');
  const pageHelpPath = path.join(HELP_DIR, 'page-help.yaml');
  return {
    [qPath]: QUESTIONNAIRE_MD,
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [helpPath]: '# Getting Started\n\nWelcome to the help.',
    [commandsPath]:
      '# Commands Reference\n\nUse `CREATE` to start a new run.\n\n<script>alert("x")</script>\n\n[Danger](javascript:alert(1))',
    [pageHelpPath]: `pages:\n  - routeSlug: commands\n    routePath: /commands\n    pageTitle: Commands\n    purpose: Queue runs and inspect command behavior.\n    coreActions:\n      - label: Queue command\n        description: Submit CREATE or AUDIT runs.\n    inputsOutputs: Reads command details and writes queued work.\n    permissions: Operator access required for queue mutations.\n    relatedPages:\n      - routeSlug: pipeline\n        title: Pipeline\n    keywords: [commands, queue, create]\n    topicLinks:\n      - topicId: commands\n        title: Commands Reference\n`,
  };
}

/* ── Lifecycle ────────────────────────────────────────────────── */

beforeAll(async () => {
  app = await createTestApp(seedFiles());
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  setStore(new InMemoryStore(seedFiles()));
  app._cache.invalidateAll();
});

afterEach(() => {
  setStore(new InMemoryStore());
});

/* ── Helper ───────────────────────────────────────────────────── */

function inject(method, url, payload) {
  const opts = { method, url };
  if (payload !== undefined) {
    opts.payload = payload;
    opts.headers = { 'content-type': 'application/json' };
  }
  return app.inject(opts);
}

/* ── Health + Static ──────────────────────────────────────────── */

describe('GET /health', () => {
  it('returns ok', async () => {
    const r = await inject('GET', '/health');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('GET / (static)', () => {
  it('serves response with security headers', async () => {
    const r = await inject('GET', '/');
    expect([200, 404]).toContain(r.statusCode);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

/* ── Router edge cases ────────────────────────────────────────── */

describe('Router', () => {
  it('returns 404 for unknown API path', async () => {
    const r = await inject('GET', '/api/nonexistent');
    expect(r.statusCode).toBe(404);
  });

  it('returns 405 for wrong method on known path', async () => {
    const r = await inject('DELETE', '/api/questionnaires');
    expect(r.statusCode).toBe(405);
    const body = r.json();
    expect(body.code).toBe('METHOD_NOT_ALLOWED');
    expect(r.headers.allow).toContain('GET');
  });
});

/* ── Standardized error response format ──────────────────────── */

describe('Error response format', () => {
  it('returns 404 for unknown API path', async () => {
    const r = await inject('GET', '/api/nonexistent');
    expect(r.statusCode).toBe(404);
  });

  it('returns code, message, recovery on 405', async () => {
    const r = await inject('DELETE', '/api/questionnaires');
    expect(r.statusCode).toBe(405);
    const body = r.json();
    expect(body.code).toBe('METHOD_NOT_ALLOWED');
    expect(typeof body.recovery).toBe('string');
  });

  it('returns code, message, recovery on 400 validation', async () => {
    const r = await inject('POST', '/api/save', { file: 'x', updates: 'nope' });
    expect(r.statusCode).toBe(400);
    const body = r.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(typeof body.message).toBe('string');
    expect(typeof body.recovery).toBe('string');
  });
});

/* ── Questionnaires API ───────────────────────────────────────── */

describe('GET /api/questionnaires', () => {
  it('returns discovered questionnaires', async () => {
    const r = await inject('GET', '/api/questionnaires');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.questionnaires).toHaveLength(1);
    expect(body.questionnaires[0].agent).toBe('Software Architect');
    expect(body.questionnaires[0].questions).toHaveLength(1);
  });

  it('returns empty when no BusinessDocs', async () => {
    setStore(new InMemoryStore());
    app._cache.invalidateAll();
    const r = await inject('GET', '/api/questionnaires');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.questionnaires).toEqual([]);
  });
});

/* ── Session API ──────────────────────────────────────────────── */

describe('GET /api/session', () => {
  it('returns session when file exists', async () => {
    const r = await inject('GET', '/api/session');
    expect(r.statusCode).toBe(200);
    expect(r.json().session.session_id).toBe('test-session');
  });

  it('returns null when no session file', async () => {
    setStore(new InMemoryStore());
    app._cache.invalidateAll();
    const r = await inject('GET', '/api/session');
    expect(r.statusCode).toBe(200);
    expect(r.json().session).toBeNull();
  });
});

/* ── Save API ─────────────────────────────────────────────────── */

describe('POST /api/save', () => {
  it('saves an answer to a questionnaire', async () => {
    const r = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'Localhost only' }],
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.ok).toBe(true);
    expect(body.saved).toBe(1);
  });

  it('rejects missing file field', async () => {
    const r = await inject('POST', '/api/save', {
      updates: [{ questionId: 'Q-05-001', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(400);
  });

  it('rejects empty updates array', async () => {
    const r = await inject('POST', '/api/save', { file: Q_FILE_REL, updates: [] });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('updates');
  });

  it('rejects invalid Q-ID', async () => {
    const r = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'INVALID', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Invalid Q-ID');
  });

  it('rejects invalid status', async () => {
    const r = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'Q-05-001', status: 'INVALID', answer: '' }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toBeDefined();
  });

  it('returns 404 for non-existent file', async () => {
    const r = await inject('POST', '/api/save', {
      file: 'nonexistent/file.md',
      updates: [{ questionId: 'Q-05-001', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(404);
  });

  it('warns when answer contains a secret pattern', async () => {
    const r = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'key=AKIAIOSFODNN7EXAMPLE' }],
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().warnings).toBeDefined();
    expect(r.json().warnings[0]).toContain('secrets detected');
  });
});

/* ── Reevaluate API ───────────────────────────────────────────── */

describe('POST /api/reevaluate', () => {
  it('writes reevaluate trigger', async () => {
    const r = await inject('POST', '/api/reevaluate', { scope: 'TECH' });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.ok).toBe(true);
    expect(body.scope).toBe('TECH');
  });

  it('rejects invalid scope via schema validation', async () => {
    const r = await inject('POST', '/api/reevaluate', { scope: 'INVALID' });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('VALIDATION_ERROR');
  });
});

/* ── Decisions API ────────────────────────────────────────────── */

describe('GET /api/decisions', () => {
  it('returns parsed decisions', async () => {
    const r = await inject('GET', '/api/decisions');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.open).toHaveLength(1);
    expect(body.open[0].id).toBe('DEC-R2-010');
  });
});

describe('POST /api/decisions', () => {
  it('creates an open question', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'MEDIUM',
      scope: 'Phase 2',
      text: 'Should we add caching?',
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.ok).toBe(true);
    expect(body.action).toBe('created_open_question');
    expect(body.id).toMatch(/^DEC-/);
  });

  it('creates an operational decision', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'HIGH',
      scope: 'All sprints',
      text: 'Use file-based storage',
      notes: 'Per DEC-R2-006',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('created_decision');
  });

  it('answers an open question', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'answer',
      id: 'DEC-R2-010',
      answer: 'PostgreSQL',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('answered');
  });

  it('decides an open question', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'decide',
      id: 'DEC-R2-010',
      answer: 'PostgreSQL — confirmed',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('decided');
  });

  it('defers an item', { timeout: 15000 }, async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'defer',
      id: 'DEC-R2-010',
      reason: 'Waiting for feedback',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('deferred');
  });

  it('expires an item', { timeout: 15000 }, async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'expire',
      id: 'DEC-R2-010',
      reason: 'No longer relevant',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('expired');
  });

  it('reopens an item', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'reopen',
      id: 'DEC-R2-010',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('reopened');
  });

  it('edits a decision', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'edit',
      id: 'DEC-R2-010',
      text: 'Updated question text',
      notes: 'Updated notes',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().action).toBe('edited');
  });

  it('rejects unknown action', async () => {
    const r = await inject('POST', '/api/decisions', { action: 'fly' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Unknown action');
  });

  it('rejects create with missing fields', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Missing');
  });

  it('rejects create with invalid type', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'INVALID',
      priority: 'HIGH',
      scope: 'x',
      text: 'y',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Invalid type');
  });

  it('rejects create with invalid priority', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'ULTRA',
      scope: 'x',
      text: 'y',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Invalid priority');
  });

  it('rejects answer with missing id', async () => {
    const r = await inject('POST', '/api/decisions', { action: 'answer', answer: 'yes' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Missing id');
  });

  it('rejects invalid decision ID format', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'answer',
      id: 'INVALID-FORMAT!!!',
      answer: 'yes',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Invalid decision ID');
  });

  it('warns on secret patterns in decision text', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'LOW',
      scope: 'Test',
      text: 'Use key AKIAIOSFODNN7EXAMPLE?',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().warnings).toBeDefined();
  });

  it('returns 404 when decisions.md missing', async () => {
    setStore(new InMemoryStore());
    app._cache.invalidateAll();
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'HIGH',
      scope: 'x',
      text: 'y',
    });
    expect(r.statusCode).toBe(404);
  });
});

/* ── Command API ──────────────────────────────────────────────── */

describe('POST /api/command', () => {
  it('queues a valid command', async () => {
    const r = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'TestProject',
      description: 'A test project',
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.ok).toBe(true);
    expect(body.clipboard_text).toContain('CREATE');
    expect(body.clipboard_text).toContain('TestProject');
  });

  it('rejects unknown command', async () => {
    const r = await inject('POST', '/api/command', { command: 'FLY' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toContain('Unknown command');
  });

  it('saves project brief when provided', async () => {
    const r = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'BriefTest',
      brief: 'This is the full project brief content.',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().brief_saved).toBe(true);
  });

  it('queues multi-word commands', async () => {
    const r = await inject('POST', '/api/command', { command: 'CREATE BUSINESS' });
    expect(r.statusCode).toBe(200);
    expect(r.json().ok).toBe(true);
  });

  it('appends to existing queue', async () => {
    const store = new InMemoryStore(seedFiles());
    store.writeFile(
      COMMAND_QUEUE,
      JSON.stringify([{ command: 'AUDIT', status: 'DONE', requested_at: '2025-01-01T00:00:00Z' }])
    );
    setStore(store);
    app._cache.invalidateAll();
    const r = await inject('POST', '/api/command', { command: 'CREATE' });
    expect(r.statusCode).toBe(200);
  });
});

describe('GET /api/command', () => {
  it('returns null when no queue exists', async () => {
    const r = await inject('GET', '/api/command');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.command).toBeNull();
    expect(body.queue).toEqual([]);
  });

  it('returns latest command from queue', async () => {
    await inject('POST', '/api/command', { command: 'REEVALUATE' });
    const r = await inject('GET', '/api/command');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.command.command).toBe('REEVALUATE');
    expect(body.queue).toHaveLength(1);
  }, 15000);
});

describe('GET /api/commands', () => {
  it('returns metadata-backed command catalog', async () => {
    const r = await inject('GET', '/api/commands');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(Array.isArray(body.commands)).toBe(true);
    expect(body.commands.length).toBeGreaterThan(0);
    expect(body.commands.some((entry) => entry.name === 'CREATE')).toBe(true);
    expect(body.commands.some((entry) => entry.name === 'AUDIT')).toBe(true);
  });
});

/* ── Progress API ─────────────────────────────────────────────── */

describe('GET /api/progress', () => {
  it('returns progress with active session', async () => {
    const r = await inject('GET', '/api/progress');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.active).toBe(true);
    expect(body.session.session_id).toBe('test-session');
    expect(body.phases).toHaveLength(7);
    expect(body.sprints.total).toBe(3);
    const p1 = body.phases.find((p) => p.key === 'PHASE-1');
    expect(p1.status).toBe('done');
    const p2 = body.phases.find((p) => p.key === 'PHASE-2');
    expect(p2.status).toBe('active');
  });

  it('returns inactive progress when no session', async () => {
    setStore(new InMemoryStore());
    app._cache.invalidateAll();
    const r = await inject('GET', '/api/progress');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.active).toBe(false);
    expect(body.phases).toHaveLength(7);
  });
});

/* ── Help API ─────────────────────────────────────────────────── */

describe('GET /api/help', () => {
  it('returns table of contents', async () => {
    const r = await inject('GET', '/api/help');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.toc).toBeDefined();
    expect(body.toc.length).toBeGreaterThan(0);
  });

  it('returns specific topic', async () => {
    const r = await inject('GET', '/api/help?topic=getting-started');
    expect(r.statusCode).toBe(200);
    expect(r.json().content).toContain('Getting Started');
  });

  it('rejects path traversal in topic', async () => {
    const r = await inject('GET', '/api/help?topic=../secrets');
    expect(r.statusCode).toBe(400);
  });
});

describe('GET /api/v1/help/page/:routeSlug', () => {
  it('returns structured page help for known routes', async () => {
    const r = await inject('GET', '/api/v1/help/page/commands');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.routeSlug).toBe('commands');
    expect(body.pageTitle).toBe('Commands');
    expect(body.topicLinks[0].topicId).toBe('commands');
  });

  it('returns 404 for unknown routes', async () => {
    const r = await inject('GET', '/api/v1/help/page/unknown-route');
    expect(r.statusCode).toBe(404);
  });
});

describe('GET /api/v1/help/topic/:topicId', () => {
  it('returns rendered HTML and strips raw script tags', async () => {
    const r = await inject('GET', '/api/v1/help/topic/commands');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.title).toBe('Commands Reference');
    expect(body.html).toContain('<h1>Commands Reference</h1>');
    expect(body.html).not.toContain('<script>');
    expect(body.html).not.toContain('href="javascript:');
  });

  it('returns 404 for unknown topics', async () => {
    const r = await inject('GET', '/api/v1/help/topic/not-a-topic');
    expect(r.statusCode).toBe(404);
  });
});

describe('GET /api/v1/help/search', () => {
  it('returns matching page and topic results', async () => {
    const r = await inject('GET', '/api/v1/help/search?q=create');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.results.some((result) => result.kind === 'page' && result.id === 'commands')).toBe(
      true
    );
    expect(Array.isArray(body.pages)).toBe(true);
    expect(Array.isArray(body.topics)).toBe(true);
    expect(body.pages.some((page) => page.routeSlug === 'commands')).toBe(true);
  });
});

/* ── Export API ────────────────────────────────────────────────── */

describe('GET /api/export', () => {
  it('returns export bundle', async () => {
    const r = await inject('GET', '/api/export');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('session');
    expect(body).toHaveProperty('command_queue');
    expect(body).toHaveProperty('exported_at');
  });
});

/* ── Security Headers ─────────────────────────────────────────── */

describe('Security Headers', () => {
  it('sets X-Content-Type-Options on responses', async () => {
    const r = await inject('GET', '/');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', async () => {
    const r = await inject('GET', '/');
    expect(r.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets Content-Security-Policy', async () => {
    const r = await inject('GET', '/');
    expect(r.headers['content-security-policy']).toBeDefined();
    expect(r.headers['content-security-policy']).toMatch(/default-src/);
  });

  it('sets Referrer-Policy', async () => {
    const r = await inject('GET', '/');
    expect(r.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('does not leak stack traces in error responses', async () => {
    const r = await inject('GET', '/api/nonexistent-route-xyz');
    expect(r.body).not.toMatch(/node_modules/);
    expect(r.body).not.toMatch(/at\s+\w+\s+\(/);
  });
});
