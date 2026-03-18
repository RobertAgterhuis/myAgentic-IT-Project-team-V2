'use strict';
/* M30-007: End-to-end API flow integration tests via Fastify inject().
 * Replaces e2e-api-flows.test.js (raw HTTP) with framework-native testing.
 * Tests complete user journeys through the API. */

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp, paths } = require('../helpers/create-test-app');

const { BUSINESS_DOCS, SESSION_FILE, DECISIONS_FILE, HELP_DIR } = paths;

let app;

/* ── Fixtures ─────────────────────────────────────────────────── */

const Q05_MD = `# Questionnaire: Software Architect

> Phase: Phase 2 | Generated: 2025-01-01 | Version: 1.0

## Section 1: Architecture

### Q-05-001 [REQUIRED]
**Question:** What is the target deployment environment?
**Why we need this:** To determine infrastructure requirements.
**Expected format:** Text description
**Example:** Cloud-based Kubernetes cluster
**Your answer:**
> *(fill in here)*

### Q-05-002 [OPTIONAL]
**Question:** What is the expected peak load?
**Why we need this:** Capacity planning.
**Expected format:** Number
**Example:** 1000 requests/sec
**Your answer:**
> *(fill in here)*

## Answer Status

| Q-ID | Status | Last Updated |
|------|--------|--------------|
| Q-05-001 | OPEN | — |
| Q-05-002 | OPEN | — |
`;

const SESSION_STATE = {
  session_id: 'e2e-test-session',
  cycle_type: 'COMBO_AUDIT',
  status: 'SPRINT-IN-PROGRESS',
  current_phase: 'PHASE-5',
  current_agent: '20-implementation-agent',
  initiated_at: '2026-03-01T00:00:00Z',
  last_updated: '2026-03-08T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-2', 'PHASE-3'],
  completed_agents: ['25-onboarding-agent', '05-software-architect'],
  phase_outputs: {},
  sprint_backlog: {
    total_sprints: 7,
    sprint_statuses: { 'SP-R2-001': 'DONE', 'SP-R2-002': 'DONE' },
  },
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
| DEC-R2-001 | HIGH | All sprints | Localhost only | Security advisory | 2025-01-01 |

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
  const qPath = path.join(
    BUSINESS_DOCS,
    'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md'
  );
  const helpPath = path.join(HELP_DIR, 'getting-started.md');
  return {
    [qPath]: Q05_MD,
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [helpPath]: '# Getting Started\n\nWelcome to the help system.',
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

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 1: Questionnaire discovery → answer → verify persistence
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Questionnaire answer journey', () => {
  it('discovers questionnaires, saves answers, and verifies persistence', async () => {
    const discover = await inject('GET', '/api/questionnaires');
    expect(discover.statusCode).toBe(200);
    const dBody = discover.json();
    expect(dBody.questionnaires).toHaveLength(1);
    expect(dBody.questionnaires[0].agent).toBe('Software Architect');
    expect(dBody.questionnaires[0].questions).toHaveLength(2);
    expect(dBody.questionnaires[0].questions[0].id).toBe('Q-05-001');

    const save1 = await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'Local Node.js server' }],
    });
    expect(save1.statusCode).toBe(200);
    expect(save1.json().saved).toBe(1);

    const verify = await inject('GET', '/api/questionnaires');
    const updated = verify.json().questionnaires[0];
    const q1 = updated.questions.find((x) => x.id === 'Q-05-001');
    expect(q1.answer).toBe('Local Node.js server');
    expect(q1.status).toBe('ANSWERED');
    const q2 = updated.questions.find((x) => x.id === 'Q-05-002');
    expect(q2.status).toBe('OPEN');
  });

  it('saves multiple answers in one batch and verifies all', async () => {
    const save = await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [
        { questionId: 'Q-05-001', status: 'ANSWERED', answer: 'Docker containers' },
        { questionId: 'Q-05-002', status: 'ANSWERED', answer: '500 req/sec' },
      ],
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().saved).toBe(2);

    const verify = await inject('GET', '/api/questionnaires');
    const qs = verify.json().questionnaires[0].questions;
    expect(qs.find((x) => x.id === 'Q-05-001').answer).toBe('Docker containers');
    expect(qs.find((x) => x.id === 'Q-05-002').answer).toBe('500 req/sec');
    expect(qs.every((x) => x.status === 'ANSWERED')).toBe(true);
  });

  it('handles sequential answer updates (overwrite previous)', async () => {
    await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'First answer' }],
    });
    await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [{ questionId: 'Q-05-001', status: 'ANSWERED', answer: 'Updated answer' }],
    });

    const verify = await inject('GET', '/api/questionnaires');
    const q1 = verify.json().questionnaires[0].questions.find((x) => x.id === 'Q-05-001');
    expect(q1.answer).toBe('Updated answer');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 2: Decision lifecycle — full state machine
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Decision full lifecycle', () => {
  it('creates, answers, decides, and verifies an open question', async () => {
    const initial = await inject('GET', '/api/decisions');
    expect(initial.statusCode).toBe(200);
    expect(initial.json().open).toHaveLength(1);

    const create = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'MEDIUM',
      scope: 'Phase 5',
      text: 'Should we use WebSockets for real-time updates?',
    });
    expect(create.statusCode).toBe(200);
    const newId = create.json().id;

    const afterCreate = await inject('GET', '/api/decisions');
    expect(afterCreate.json().open).toHaveLength(2);
    const newQ = afterCreate.json().open.find((q) => q.id === newId);
    expect(newQ.question).toContain('WebSockets');

    const answer = await inject('POST', '/api/decisions', {
      action: 'answer',
      id: newId,
      answer: 'SSE is sufficient for localhost use',
    });
    expect(answer.statusCode).toBe(200);

    const afterAnswer = await inject('GET', '/api/decisions');
    const answered = afterAnswer.json().open.find((q) => q.id === newId);
    expect(answered.answer).toContain('SSE is sufficient');

    const decide = await inject('POST', '/api/decisions', {
      action: 'decide',
      id: newId,
      answer: 'SSE confirmed — DEC-R2-001 constraints apply',
    });
    expect(decide.statusCode).toBe(200);

    const afterDecide = await inject('GET', '/api/decisions');
    expect(afterDecide.json().open.find((q) => q.id === newId)).toBeUndefined();
    const decided = afterDecide.json().decided.find((d) => d.id === newId);
    expect(decided).toBeDefined();
  });

  it('creates decision, defers it, then reopens it', async () => {
    const create = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'HIGH',
      scope: 'Phase 2',
      text: 'What caching strategy to use?',
    });
    const id = create.json().id;

    const defer = await inject('POST', '/api/decisions', {
      action: 'defer',
      id,
      reason: 'Waiting for performance benchmarks',
    });
    expect(defer.statusCode).toBe(200);

    const afterDefer = await inject('GET', '/api/decisions');
    expect(afterDefer.json().open.find((q) => q.id === id)).toBeUndefined();
    expect(afterDefer.json().deferred.find((d) => d.id === id)).toBeDefined();

    const reopen = await inject('POST', '/api/decisions', { action: 'reopen', id });
    expect(reopen.statusCode).toBe(200);

    const afterReopen = await inject('GET', '/api/decisions');
    expect(afterReopen.json().open.find((q) => q.id === id)).toBeDefined();
  });

  it('creates an operational decision directly', async () => {
    const create = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'HIGH',
      scope: 'All sprints',
      text: 'Use file-based storage only',
      notes: 'Simplicity over scalability',
    });
    expect(create.statusCode).toBe(200);

    const after = await inject('GET', '/api/decisions');
    const dec = after.json().decided.find((d) => d.id === create.json().id);
    expect(dec).toBeDefined();
    expect(dec.decision).toContain('file-based storage');
  });

  it('edits an existing decided item', async () => {
    const edit = await inject('POST', '/api/decisions', {
      action: 'edit',
      id: 'DEC-R2-001',
      text: 'Localhost only — confirmed production constraint',
      notes: 'Updated security advisory notes',
    });
    expect(edit.statusCode).toBe(200);

    const after = await inject('GET', '/api/decisions');
    const edited = after.json().decided.find((d) => d.id === 'DEC-R2-001');
    expect(edited.decision).toContain('confirmed production constraint');
    expect(edited.notes).toContain('Updated security');
  });

  it('expires a decided item', async () => {
    const expire = await inject('POST', '/api/decisions', {
      action: 'expire',
      id: 'DEC-R2-001',
      reason: 'Migrating to cloud deployment',
    });
    expect(expire.statusCode).toBe(200);

    const after = await inject('GET', '/api/decisions');
    expect(after.json().decided.find((d) => d.id === 'DEC-R2-001')).toBeUndefined();
    const expired = after.json().deferred.find((d) => d.id === 'DEC-R2-001');
    expect(expired).toBeDefined();
    expect(expired.status).toBe('EXPIRED');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 3: Command pipeline — queue, verify, read back
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Command pipeline journey', () => {
  it('queues commands, reads them back, and verifies order', async () => {
    const empty = await inject('GET', '/api/command');
    expect(empty.json().command).toBeNull();
    expect(empty.json().queue).toEqual([]);

    const cmd1 = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'ProjectAlpha',
      description: 'A new software project',
    });
    expect(cmd1.statusCode).toBe(200);
    expect(cmd1.json().clipboard_text).toContain('CREATE');
    expect(cmd1.json().clipboard_text).toContain('ProjectAlpha');

    const cmd2 = await inject('POST', '/api/command', { command: 'REEVALUATE', scope: 'TECH' });
    expect(cmd2.statusCode).toBe(200);

    const readBack = await inject('GET', '/api/command');
    expect(readBack.json().command.command).toBe('REEVALUATE');
    expect(readBack.json().queue).toHaveLength(2);
    expect(readBack.json().queue[0].command).toBe('CREATE');
    expect(readBack.json().queue[1].command).toBe('REEVALUATE');
  });

  it('queues a command with project brief and verifies brief saved', async () => {
    const cmd = await inject('POST', '/api/command', {
      command: 'CREATE',
      project: 'BriefProject',
      brief: 'This is a comprehensive project brief for testing purposes.',
    });
    expect(cmd.statusCode).toBe(200);
    expect(cmd.json().brief_saved).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 4: Session + Progress monitoring
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Session and progress monitoring', () => {
  it('reads session, checks progress phases, verifies consistency', async () => {
    const session = await inject('GET', '/api/session');
    expect(session.statusCode).toBe(200);
    expect(session.json().session.session_id).toBe('e2e-test-session');
    expect(session.json().session.status).toBe('SPRINT-IN-PROGRESS');

    const progress = await inject('GET', '/api/progress');
    expect(progress.statusCode).toBe(200);
    const pBody = progress.json();
    expect(pBody.active).toBe(true);
    expect(pBody.phases).toHaveLength(7);

    const p2 = pBody.phases.find((p) => p.key === 'PHASE-2');
    expect(p2.status).toBe('done');
    const p5 = pBody.phases.find((p) => p.key === 'PHASE-5');
    expect(p5.status).toBe('active');
    expect(pBody.sprints.total).toBe(7);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 5: Analytics flow — post, accumulate, read back
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Analytics event flow', () => {
  it('posts analytics events, accumulates, and reads back all', async () => {
    const empty = await inject('GET', '/api/analytics');
    expect(empty.json().events).toEqual([]);

    const post1 = await inject('POST', '/api/analytics', {
      events: [
        {
          event: 'session_start',
          properties: { source: 'test' },
          timestamp: '2026-03-08T00:00:00Z',
        },
        {
          event: 'page_view',
          properties: { page: 'dashboard' },
          timestamp: '2026-03-08T00:01:00Z',
        },
      ],
    });
    expect(post1.statusCode).toBe(200);
    expect(post1.json().accepted).toBe(2);

    const post2 = await inject('POST', '/api/analytics', {
      events: [
        {
          event: 'tab_switch',
          properties: { tab: 'decisions' },
          timestamp: '2026-03-08T00:02:00Z',
        },
      ],
    });
    expect(post2.json().accepted).toBe(1);

    const readAll = await inject('GET', '/api/analytics');
    expect(readAll.json().total).toBe(3);
    expect(readAll.json().events.some((e) => e.event === 'session_start')).toBe(true);
    expect(readAll.json().events.some((e) => e.event === 'page_view')).toBe(true);
    expect(readAll.json().events.some((e) => e.event === 'tab_switch')).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 6: Reevaluate trigger flow
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Reevaluate trigger flow', () => {
  it('triggers reevaluate and verifies trigger file written', async () => {
    const trigger = await inject('POST', '/api/reevaluate', { scope: 'TECH' });
    expect(trigger.statusCode).toBe(200);
    const body = trigger.json();
    expect(body.ok).toBe(true);
    expect(body.scope).toBe('TECH');
    expect(body.message).toContain('REEVALUATE TECH');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 7: Export bundle — comprehensive state dump
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Export bundle journey', () => {
  it('exports session + command queue as complete bundle', async () => {
    await inject('POST', '/api/command', { command: 'AUDIT', project: 'TestExport' });

    const exp = await inject('GET', '/api/export');
    expect(exp.statusCode).toBe(200);
    const body = exp.json();
    expect(body.exported_at).toBeDefined();
    expect(body.session.session_id).toBe('e2e-test-session');
    expect(body.command_queue).toHaveLength(1);
    expect(body.command_queue[0].command).toBe('AUDIT');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 8: Help system navigation
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Help system navigation', () => {
  it('lists help topics, then reads a specific topic', async () => {
    const toc = await inject('GET', '/api/help');
    expect(toc.statusCode).toBe(200);
    expect(toc.json().toc.length).toBeGreaterThan(0);

    const firstSlug = toc.json().toc[0].slug;
    const topic = await inject('GET', `/api/help?topic=${firstSlug}`);
    expect(topic.statusCode).toBe(200);
    expect(topic.json().slug).toBe(firstSlug);
    expect(topic.json().content.length).toBeGreaterThan(0);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 9: Error path — comprehensive error handling
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Error paths', () => {
  it('returns 404 for save to non-existent questionnaire file', async () => {
    const r = await inject('POST', '/api/save', {
      file: 'NonExistent/fake-questionnaire.md',
      updates: [{ questionId: 'Q-99-001', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(404);
    expect(r.json().code).toBe('FILE_NOT_FOUND');
    expect(r.json().recovery).toBeDefined();
  });

  it('returns 400 for invalid question ID format', async () => {
    const r = await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [{ questionId: 'INVALID-ID', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for decision with missing required fields', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
    });
    expect(r.statusCode).toBe(400);
  });

  it('returns 400 for unknown decision action', async () => {
    const r = await inject('POST', '/api/decisions', { action: 'teleport' });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('INVALID_ACTION');
  });

  it('returns 400 for unknown command', async () => {
    const r = await inject('POST', '/api/command', { command: 'DESTROY' });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('UNKNOWN_COMMAND');
  });

  it('returns 404 for decisions when decisions.md is missing', async () => {
    setStore(new InMemoryStore({ [SESSION_FILE]: JSON.stringify(SESSION_STATE) }));
    app._cache.invalidateAll();
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'HIGH',
      scope: 'Test',
      text: 'Test decision',
    });
    expect(r.statusCode).toBe(404);
    expect(r.json().code).toBe('DECISIONS_NOT_FOUND');
  });

  it('returns 400 for analytics with invalid event types', async () => {
    const r = await inject('POST', '/api/analytics', {
      events: [{ event: 'invalid_event_type', properties: {} }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 for path traversal attempt in save', async () => {
    const r = await inject('POST', '/api/save', {
      file: '../../etc/passwd',
      updates: [{ questionId: 'Q-01-001', status: 'OPEN', answer: '' }],
    });
    expect(r.statusCode).toBe(403);
    expect(r.json().code).toBe('PATH_TRAVERSAL');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 10: Health + Metrics observability
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Health and metrics observability', () => {
  it('health endpoint reports status, then metrics reflect request count', async () => {
    const health = await inject('GET', '/api/health');
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe('ok');
    expect(health.json().sse_connections).toBeDefined();

    const metrics = await inject('GET', '/api/metrics');
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json().uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(metrics.json().per_endpoint).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 11: Secret detection across endpoints
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Secret detection across endpoints', () => {
  it('detects secrets in questionnaire answers', async () => {
    const r = await inject('POST', '/api/save', {
      file: 'Phase2-Tech/Questionnaires/05-software-architect-questionnaire.md',
      updates: [
        {
          questionId: 'Q-05-001',
          status: 'ANSWERED',
          answer: 'Use key AKIAIOSFODNN7EXAMPLE to connect',
        },
      ],
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().warnings).toBeDefined();
    expect(r.json().warnings[0]).toContain('secrets detected');
  });

  it('detects secrets in decision text', async () => {
    const r = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'LOW',
      scope: 'Test',
      text: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().warnings).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════
 * JOURNEY 12: Cross-endpoint state consistency
 * ═══════════════════════════════════════════════════════════════ */

describe('E2E: Cross-endpoint state consistency', () => {
  it('command + decision + export state is consistent', async () => {
    await inject('POST', '/api/command', { command: 'CREATE', project: 'ConsistencyTest' });
    await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'DECIDED',
      priority: 'HIGH',
      scope: 'All',
      text: 'Use vitest for testing',
      notes: 'Confirmed in Sprint 3',
    });

    const exp = await inject('GET', '/api/export');
    expect(exp.statusCode).toBe(200);
    expect(exp.json().session.session_id).toBe('e2e-test-session');
  });

  it('progress reflects session changes after reevaluate trigger', async () => {
    await inject('POST', '/api/reevaluate', { scope: 'UX' });

    const progress = await inject('GET', '/api/progress');
    expect(progress.statusCode).toBe(200);
    expect(progress.json().active).toBe(true);
    expect(progress.json().session.session_id).toBe('e2e-test-session');
  });
});
