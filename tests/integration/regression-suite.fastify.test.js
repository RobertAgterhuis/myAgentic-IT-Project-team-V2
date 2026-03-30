'use strict';
/* M30-007: Comprehensive Regression Test Suite — SP-R2-007-001 via Fastify inject().
 * Replaces regression-suite.test.js (raw HTTP) with framework-native testing.
 * Verifies ALL features from Sprints 1-7. */

const path = require('path');
const fs = require('fs');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp, paths } = require('../helpers/create-test-app');
const {
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
  safePath,
} = require('../../src/webapp/middleware');
const models = require('../../src/webapp/models');
const schemas = require('../../src/webapp/schemas');
const { FileCache } = require('../../src/webapp/cache');
const { errorResponse, statusToCode } = require('../../src/webapp/utils/errors');
const {
  formatSecretWarnings,
  attachSecretWarnings,
} = require('../../src/webapp/utils/secret-utils');
const { VALIDATION: V, RESPONSES: R, STATIC: S } = require('../../src/webapp/strings');

const { BUSINESS_DOCS, SESSION_FILE, DECISIONS_FILE, HELP_DIR, ANALYTICS_FILE } = paths;

let app;
let store;

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

### Q-05-002 [OPTIONAL]
**Question:** What is the expected user count?
**Why we need this:** Capacity planning.
**Expected format:** Number
**Example:** 500
**Your answer:**
> *(fill in here)*

## Answer Status

| Q-ID | Status | Last Updated |
|------|--------|--------------|
| Q-05-001 | OPEN | — |
| Q-05-002 | OPEN | — |
`;

const SESSION_STATE = {
  session_id: 'regression-test',
  cycle_type: 'COMBO_AUDIT',
  status: 'SPRINT-IN-PROGRESS',
  current_phase: 'PHASE-5',
  current_agent: '20-implementation-agent',
  current_step: 'Sprint 7 regression testing',
  initiated_at: '2026-03-08T00:00:00Z',
  last_updated: '2026-03-08T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-2', 'PHASE-3'],
  completed_agents: ['25-onboarding-agent', '05-software-architect'],
  phase_outputs: {
    onboarding: 'BusinessDocs/onboarding/onboarding-output.md',
    'phase-2': { '05': 'BusinessDocs/phase-2/05-software-architect.md' },
  },
  sprint_backlog: {},
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
|----|-----------|-------|----------|-------|------|
| DEC-T-001 | HIGH | All phases | Use dual-mode | Test decision | 2025-01-01 |

### Reevaluation Decisions (DEC-R2 series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|----------|-------|------|
| DEC-R2-001 | HIGH | Phase 2 | Use PostgreSQL | Performance reasons | 2025-01-01 |

### Operational Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|----------|-------|------|
| DEC-102 | HIGH | Phase 2 | Use IaC | Best practice | 2025-01-01 |

---

## Deferred & Expired

---

## Change Log
| Date | Action | ID | By |
|------|--------|----|----|
`;

function seedFiles() {
  return {
    [path.join(BUSINESS_DOCS, Q_FILE_REL)]: QUESTIONNAIRE_MD,
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [path.join(HELP_DIR, 'getting-started.md')]: '# Getting Started\nWelcome.',
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
  store = new InMemoryStore(seedFiles());
  setStore(store);
  app._cache.invalidateAll();
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

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 1 — SECURITY + FOUNDATION
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 1 Regression: Security', () => {
  it('sanitizeMarkdown escapes heading injection', () => {
    expect(sanitizeMarkdown('# Injected')).toBe('\\# Injected');
    expect(sanitizeMarkdown('## Double')).toBe('\\## Double');
  });

  it('sanitizeMarkdown escapes horizontal rules', () => {
    expect(sanitizeMarkdown('---')).toMatch(/\\---/);
  });

  it('sanitizeMarkdown escapes table pipe at line start', () => {
    expect(sanitizeMarkdown('| cell')).toBe('\\| cell');
  });

  it('sanitizeQID neutralizes fake Q-IDs', () => {
    const result = sanitizeQID('Q-05-001 is the answer');
    expect(result).not.toContain('Q-05-001');
    expect(result).toContain('\u2010');
  });

  it('detectSecrets finds AWS keys', () => {
    expect(detectSecrets('key: AKIAIOSFODNN7EXAMPLE')).toContain('AWS Access Key');
  });

  it('detectSecrets finds GitHub tokens', () => {
    expect(detectSecrets('token: ghp_ABCDEFghijklmnopqrstuvwxyz123456789012')).toContain(
      'GitHub Token'
    );
  });

  it('detectSecrets finds private keys', () => {
    expect(detectSecrets('-----BEGIN RSA PRIVATE KEY-----')).toContain('Private Key');
  });

  it('detectSecrets returns empty for clean text', () => {
    expect(detectSecrets('just normal text here')).toHaveLength(0);
  });

  it('safePath blocks traversal', () => {
    expect(() => safePath('/base', '../../../etc/passwd')).toThrow();
  });

  it('safePath allows valid paths', () => {
    const result = safePath('/base', 'sub/file.txt');
    expect(result).toContain('sub');
  });

  it('security headers are set on all responses', async () => {
    const res = await inject('GET', '/');
    expect([200, 404]).toContain(res.statusCode);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBeTruthy();
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBeTruthy();
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  it('POST /api/save warns on secret patterns in answers', async () => {
    const res = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [
        { questionId: 'Q-05-001', answer: 'key: AKIAIOSFODNN7EXAMPLE', status: 'ANSWERED' },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().warnings).toBeDefined();
    expect(res.json().warnings[0]).toContain('AWS Access Key');
  }, 15000);
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 2 — ARCHITECTURE + DESIGN SYSTEM
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 2 Regression: Architecture', () => {
  it('Store abstraction: InMemoryStore reads and writes', () => {
    store.writeFile('/tmp/test.txt', 'hello');
    expect(store.readFile('/tmp/test.txt')).toBe('hello');
  });

  it('Store abstraction: exists returns false for missing', () => {
    expect(store.exists('/nonexistent/file.txt')).toBe(false);
  });

  it('Store abstraction: writeFile creates parent dirs', () => {
    store.writeFile('/a/b/c/file.txt', 'data');
    expect(store.exists('/a/b/c/file.txt')).toBe(true);
  });

  it('Cache returns cached content on same mtime', () => {
    const cache = new FileCache();
    expect(cache.read(path.join(BUSINESS_DOCS, Q_FILE_REL))).toContain('Software Architect');
    expect(cache.read(path.join(BUSINESS_DOCS, Q_FILE_REL))).toContain('Software Architect');
    expect(cache.stats().hits).toBeGreaterThanOrEqual(1);
  });

  it('Cache invalidation forces re-read', () => {
    const cache = new FileCache();
    cache.read(path.join(BUSINESS_DOCS, Q_FILE_REL));
    cache.invalidate(path.join(BUSINESS_DOCS, Q_FILE_REL));
    cache.read(path.join(BUSINESS_DOCS, Q_FILE_REL));
    expect(cache.stats().misses).toBeGreaterThanOrEqual(2);
  });

  it('JSON schema validates session state', () => {
    const result = schemas.validateSessionState(SESSION_STATE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('JSON schema rejects invalid session state', () => {
    const result = schemas.validateSessionState({ session_id: 123 });
    expect(result.valid).toBe(false);
  });

  it('JSON schema validates command entry', () => {
    const result = schemas.validateCommandEntry({
      command: 'CREATE',
      requested_at: '2026-01-01T00:00:00Z',
      status: 'PENDING',
    });
    expect(result.valid).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 3 — CODE QUALITY + TESTING
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 3 Regression: Code Quality', () => {
  it('models.parseQuestionnaire parses correctly', () => {
    const parsed = models.parseQuestionnaire(QUESTIONNAIRE_MD, Q_FILE_REL, BUSINESS_DOCS);
    expect(parsed.agent).toBe('Software Architect');
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0].id).toBe('Q-05-001');
  });

  it('models.updateAnswerInContent replaces placeholder', () => {
    const updated = models.updateAnswerInContent(
      QUESTIONNAIRE_MD,
      'Q-05-001',
      'Localhost',
      'ANSWERED'
    );
    expect(updated).toContain('Localhost');
  });

  it('models.parseDecisions parses open and decided', () => {
    const decisions = models.parseDecisions(DECISIONS_MD);
    expect(decisions.open).toHaveLength(1);
    expect(decisions.decided.length).toBeGreaterThanOrEqual(3);
    expect(decisions.open[0].id).toBe('DEC-R2-010');
    expect(decisions.decided.map((d) => d.id)).toContain('DEC-R2-001');
  });

  it('models.nextDecisionId generates sequential IDs', () => {
    const nextId = models.nextDecisionId(DECISIONS_MD, 'DEC-R2-');
    expect(nextId).toMatch(/^DEC-R2-\d{3}$/);
    expect(parseInt(nextId.split('-').pop())).toBeGreaterThan(10);
  });

  it('error catalog has all expected codes', () => {
    const expectedCodes = [
      'VALIDATION_ERROR',
      'FILE_NOT_FOUND',
      'DECISIONS_NOT_FOUND',
      'INVALID_ACTION',
      'UNKNOWN_COMMAND',
      'NOT_FOUND',
      'PATH_TRAVERSAL',
      'PAYLOAD_TOO_LARGE',
      'INVALID_CONTENT_TYPE',
      'INVALID_JSON',
      'INVALID_INPUT',
      'METHOD_NOT_ALLOWED',
      'INTERNAL_ERROR',
    ];
    for (const code of expectedCodes) {
      const err = errorResponse(code);
      expect(err.code).toBe(code);
      expect(err.message).toBeTruthy();
      expect(err.recovery).toBeTruthy();
    }
  });

  it('statusToCode maps standard HTTP codes', () => {
    expect(statusToCode(400)).toBe('VALIDATION_ERROR');
    expect(statusToCode(403)).toBe('PATH_TRAVERSAL');
    expect(statusToCode(404)).toBe('NOT_FOUND');
    expect(statusToCode(413)).toBe('PAYLOAD_TOO_LARGE');
    expect(statusToCode(500)).toBe('INTERNAL_ERROR');
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 4 — UX PATTERNS + REAL-TIME
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 4 Regression: SSE & Metrics', () => {
  it('GET /api/metrics returns expected shape', async () => {
    const res = await inject('GET', '/api/metrics');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('uptime_seconds');
    expect(body).toHaveProperty('request_count');
    expect(body).toHaveProperty('error_count');
    expect(body).toHaveProperty('error_rate');
    expect(body).toHaveProperty('response_time_p50');
    expect(body).toHaveProperty('sse_connections');
    expect(body).toHaveProperty('cache_hit_ratio');
    expect(body).toHaveProperty('per_endpoint');
  });

  it('GET /api/health returns status ok with SSE count', async () => {
    const res = await inject('GET', '/api/health');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('sse_connections');
    expect(body).toHaveProperty('timestamp');
  });

  it('recordMetric increments counts', () => {
    const before = app._metrics.requestCount;
    app._ctx.recordMetric('GET', '/test', 10, 200);
    expect(app._metrics.requestCount).toBe(before + 1);
  });

  it('recordMetric tracks errors for 4xx/5xx', () => {
    const before = app._metrics.errorCount;
    app._ctx.recordMetric('GET', '/fail', 5, 500);
    expect(app._metrics.errorCount).toBe(before + 1);
  });

  it('computePercentiles returns zeroes for empty', () => {
    const p = app._ctx.computePercentiles([]);
    expect(p.p50).toBe(0);
    expect(p.p95).toBe(0);
    expect(p.p99).toBe(0);
  });

  it('computePercentiles computes for known data', () => {
    const data = Array.from({ length: 100 }, (_, i) => i + 1);
    const p = app._ctx.computePercentiles(data);
    expect(p.p50).toBe(50);
    expect(p.p95).toBe(95);
    expect(p.p99).toBe(99);
  });

  it('POST /api/analytics accepts valid events', async () => {
    const res = await inject('POST', '/api/analytics', {
      events: [
        { event: 'page_view', properties: { page: 'questionnaires' } },
        { event: 'tab_switch', properties: { tab: 'decisions' } },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accepted).toBe(2);
    expect(res.json().rejected).toBe(0);
  });

  it('POST /api/analytics rejects invalid event types', async () => {
    const res = await inject('POST', '/api/analytics', {
      events: [{ event: 'invalid_event' }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/analytics returns stored events', async () => {
    store.writeFile(
      ANALYTICS_FILE,
      JSON.stringify([{ event: 'page_view', properties: {}, timestamp: '2026-01-01T00:00:00Z' }])
    );
    app._cache.invalidateAll();
    const res = await inject('GET', '/api/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.json().events).toHaveLength(1);
  });

  it('strings module exports all expected keys', () => {
    expect(V.UPDATES_RANGE).toBeTruthy();
    expect(V.EVENTS_RANGE).toBeTruthy();
    expect(V.MISSING_CREATE_FIELDS).toBeTruthy();
    expect(R.reevaluateTrigger('ALL')).toContain('REEVALUATE');
    expect(R.commandQueued('test')).toContain('test');
    expect(S.NOT_FOUND).toBe('Not found');
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 5 — ACCESSIBILITY + CONTENT
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 5 Regression: Accessibility', () => {
  it('React SPA accessibility test suite exists', () => {
    const specPath = path.join(__dirname, '..', 'e2e', 's9h-accessibility.spec.ts');
    expect(fs.existsSync(specPath)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 6 — VALIDATION + INTEGRATION
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 6 Regression: Integration & Backup', () => {
  it('InMemoryStore creates backups on overwrite', () => {
    store.writeFile('/test/backup.txt', 'version1');
    store.writeFile('/test/backup.txt', 'version2');
    const backups = store._backups.get(path.resolve('/test/backup.txt'));
    expect(backups).toBeDefined();
    expect(backups.length).toBeGreaterThanOrEqual(1);
    expect(backups[0].data).toBe('version1');
  });

  it('POST /api/save round-trip persists answer', async () => {
    const saveRes = await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'Q-05-001', answer: 'Localhost deployment', status: 'ANSWERED' }],
    });
    expect(saveRes.statusCode).toBe(200);
    expect(saveRes.json().ok).toBe(true);

    const content = store.readFile(path.join(BUSINESS_DOCS, Q_FILE_REL));
    expect(content).toContain('Localhost deployment');
  });

  it('decision create + answer + decide round-trip', async () => {
    const createRes = await inject('POST', '/api/decisions', {
      action: 'create',
      type: 'OPEN_QUESTION',
      priority: 'HIGH',
      scope: 'TECH',
      text: 'Regression test Q?',
    });
    expect(createRes.statusCode).toBe(200);
    const id = createRes.json().id;

    const ansRes = await inject('POST', '/api/decisions', {
      action: 'answer',
      id,
      answer: 'Yes, confirmed.',
    });
    expect(ansRes.statusCode).toBe(200);

    const decRes = await inject('POST', '/api/decisions', {
      action: 'decide',
      id,
      answer: 'Final: yes.',
    });
    expect(decRes.statusCode).toBe(200);
  }, 15000);

  it('GET /api/export includes session and queue data', async () => {
    const res = await inject('GET', '/api/export');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('session');
    expect(body).toHaveProperty('command_queue');
    expect(body).toHaveProperty('exported_at');
  });

  it('GET /api/progress returns phase structure', async () => {
    const res = await inject('GET', '/api/progress');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.phases).toBeDefined();
    expect(body.phases.length).toBe(7);
    const labels = body.phases.map((p) => p.key);
    expect(labels).toContain('ONBOARDING');
    expect(labels).toContain('PHASE-2');
    expect(labels).toContain('PHASE-5');
  });

  it('secret-utils formats warnings correctly', () => {
    const formatted = formatSecretWarnings(['AWS Access Key', 'GitHub Token']);
    expect(formatted).toHaveLength(1);
    expect(formatted[0]).toContain('AWS Access Key');
    expect(formatted[0]).toContain('GitHub Token');
  });

  it('secret-utils returns empty for no warnings', () => {
    expect(formatSecretWarnings([])).toHaveLength(0);
    expect(formatSecretWarnings(null)).toHaveLength(0);
  });

  it('attachSecretWarnings mutates response', () => {
    const resp = { ok: true };
    attachSecretWarnings(resp, ['test']);
    expect(resp.warnings).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * SPRINT 7 — AUDIT TRAIL
 * ═══════════════════════════════════════════════════════════════════ */

describe('Sprint 7 Regression: Audit Trail', () => {
  it('GET /api/audit returns entries with limit param', async () => {
    await inject('POST', '/api/save', {
      file: Q_FILE_REL,
      updates: [{ questionId: 'Q-05-001', answer: 'Audit trail test', status: 'ANSWERED' }],
    });
    const res = await inject('GET', '/api/audit?limit=10');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('entries');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('limit');
  });

  it('GET /api/audit defaults to limit=50', async () => {
    const res = await inject('GET', '/api/audit');
    expect(res.statusCode).toBe(200);
    expect(res.json().limit).toBe(50);
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * CROSS-CUTTING REGRESSION
 * ═══════════════════════════════════════════════════════════════════ */

describe('Cross-cutting Regression', () => {
  it('404 for unknown API path', async () => {
    const res = await inject('GET', '/api/nonexistent');
    expect(res.statusCode).toBe(404);
  });

  it('405 for wrong method on existing path', async () => {
    const res = await inject('DELETE', '/api/session');
    expect(res.statusCode).toBe(405);
  });

  it('GET /api/help returns table of contents', async () => {
    const res = await inject('GET', '/api/help');
    expect(res.statusCode).toBe(200);
    expect(res.json().toc).toBeDefined();
    expect(res.json().toc.length).toBeGreaterThan(0);
  });

  it('GET /api/help?topic=getting-started returns content', async () => {
    const res = await inject('GET', '/api/help?topic=getting-started');
    expect(res.statusCode).toBe(200);
    expect(res.json().content).toContain('Getting Started');
  });

  it('GET /api/help rejects invalid slug', async () => {
    const res = await inject('GET', '/api/help?topic=../secrets');
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/command queues valid command', async () => {
    const res = await inject('POST', '/api/command', { command: 'AUDIT TECH' });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(res.json().clipboard_text).toContain('AUDIT TECH');
  });

  it('POST /api/command rejects unknown command', async () => {
    const res = await inject('POST', '/api/command', { command: 'INVALID COMMAND' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/command returns queue', async () => {
    await inject('POST', '/api/command', { command: 'CONTINUE' });
    const res = await inject('GET', '/api/command');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('queue');
    expect(res.json()).toHaveProperty('command');
  });

  it('POST /api/reevaluate writes trigger', async () => {
    const res = await inject('POST', '/api/reevaluate', { scope: 'TECH' });
    expect(res.statusCode).toBe(200);
    expect(res.json().scope).toBe('TECH');
  });

  it('Cache readJSON validates with schema', () => {
    const cache = new FileCache();
    const { data, errors } = cache.readJSON(SESSION_FILE, schemas.validateSessionState);
    expect(data).toBeTruthy();
    expect(errors).toBeNull();
  });

  it('Cache readJSON reports invalid JSON', () => {
    store.writeFile('/test/bad.json', '{invalid json}');
    const cache = new FileCache();
    const { data, errors } = cache.readJSON('/test/bad.json');
    expect(data).toBeNull();
    expect(errors).toBeTruthy();
    expect(errors[0]).toContain('Invalid JSON');
  });
});
