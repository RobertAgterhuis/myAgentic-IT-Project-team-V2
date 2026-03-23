// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { registerRoutes } from '../../src/webapp/routes/decisions.js';
import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';

const createDecisionRoutes = (ctx) => createTestableRoutes(registerRoutes, ctx);

/* ── Temp dir for isolation (real FileStore, real withFileLock) ── */

let tmpRoot, DECISIONS_FILE, DECISIONS_DIR, RETROSPECTIVES_DIR, LESSONS_FILE;

const DECISIONS_MD = `# Decisions & Open Questions

---

## Open Questions (waiting for your answer)

| ID | Priority | Scope | Question | Your answer | Date |
|----|-----------|-------|-------|---------------|-------|
| DEC-001 | HIGH | Phase 2 | Which DB to use? | | 2025-01-01 |

---

## Decided Items (agents act on these)

### Reevaluation Decisions (DEC-R2 series)

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|

### Operational Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------------|-------|
| DEC-002 | MEDIUM | All sprints | Use file storage | Simplicity | 2025-01-02 |

---

## Deferred & Expired

| ID | Status | Scope | Subject | Reason | Date |
|----|--------|-------|---------|--------|------|

---

## Audit Trail
`;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'decisions-test-'));
  DECISIONS_FILE = path.join(tmpRoot, 'decisions.md');
  DECISIONS_DIR = path.join(tmpRoot, 'decisions');
  RETROSPECTIVES_DIR = path.join(tmpRoot, 'retrospectives');
  LESSONS_FILE = path.join(RETROSPECTIVES_DIR, 'lessons-learned.md');
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/* ── Helpers ────────────────────────────────────────────────────── */

function makeCtx() {
  return {
    DECISIONS_FILE,
    DECISIONS_DIR,
    PROJECT_ROOT: tmpRoot,
    _authMiddleware: { enabled: true },
    _cache: {
      read: (fp) => fs.readFileSync(fp, 'utf8'),
      invalidate: () => {},
    },
    safeWriteSync: (fp, data) => {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fp, data, 'utf8');
    },
    sseNotify: vi.fn(),
    _ragStore: {
      query: vi.fn().mockResolvedValue([
        {
          chunk: {
            source_path: path.join(tmpRoot, 'decisions', 'auth.md'),
            chunk_text: 'DEC-AUTH-001 | Require PKCE for Entra sign-in.',
            start_line: 14,
          },
          score: 0.93,
        },
      ]),
    },
    _embeddingProvider: {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    },
  };
}

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) {
      _headers[k] = v;
    },
    writeHead(s, h) {
      _status = s;
      if (h) Object.assign(_headers, h);
    },
    end(data) {
      _body = data;
    },
    get status() {
      return _status;
    },
    get json() {
      return JSON.parse(_body);
    },
  };
}

function fakeReq(body) {
  const bodyStr = body ? JSON.stringify(body) : '';
  return {
    url: '/api/decisions',
    headers: { 'content-type': 'application/json', host: 'localhost:3000' },
    on(event, cb) {
      if (event === 'data' && bodyStr) cb(Buffer.from(bodyStr));
      if (event === 'end') cb();
    },
  };
}

function seedDecisions(content) {
  fs.writeFileSync(DECISIONS_FILE, content || DECISIONS_MD, 'utf8');
}

function seedLessons(content) {
  if (!fs.existsSync(RETROSPECTIVES_DIR)) fs.mkdirSync(RETROSPECTIVES_DIR, { recursive: true });
  fs.writeFileSync(LESSONS_FILE, content, 'utf8');
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('decision routes', () => {
  let routes;

  beforeEach(() => {
    if (fs.existsSync(DECISIONS_FILE)) fs.unlinkSync(DECISIONS_FILE);
    if (fs.existsSync(DECISIONS_DIR)) fs.rmSync(DECISIONS_DIR, { recursive: true, force: true });
    routes = createTestableRoutes(registerRoutes, makeCtx());
  });

  it('exports 3 route handlers', () => {
    expect(routes['GET /api/decisions']).toBeTypeOf('function');
    expect(routes['POST /api/decisions']).toBeTypeOf('function');
    expect(routes['POST /api/decisions/activate-category']).toBeTypeOf('function');
    expect(routes['POST /api/v1/decisions/similar']).toBeTypeOf('function');
  });

  describe('POST /api/v1/decisions/similar', () => {
    function similarReq(body, role = 'operator') {
      const bodyStr = JSON.stringify(body);
      return {
        url: '/api/v1/decisions/similar',
        user: role ? { role } : undefined,
        raw: { user: role ? { role } : undefined },
        headers: { 'content-type': 'application/json', host: 'localhost:3000' },
        on(event, cb) {
          if (event === 'data') cb(Buffer.from(bodyStr));
          if (event === 'end') cb();
        },
      };
    }

    it('returns similar decision citations from the decisions collection', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'auth.md'),
        `# Decisions: Auth\n\nStack: Identity\nStatus: ACTIVE\nApplicable: YES\n\n| ID | Priority | Scope | Decision | Notes | Date |\n|----|-----------|-------|-----------|-------|------|\n| DEC-AUTH-001 | HIGH | Auth | Require PKCE for Entra sign-in. | Use PKCE everywhere. | 2025-01-03 |\n`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/v1/decisions/similar'](
        similarReq({ query: 'What decisions affect auth?', topK: 3 }),
        res
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.json)).toBe(true);
      expect(res.json).toHaveLength(1);
      expect(res.json[0].decisionId).toBe('DEC-AUTH-001');
      expect(res.json[0].title).toBe('Require PKCE for Entra sign-in.');
      expect(res.json[0].excerpt).toContain('DEC-AUTH-001');
    });

    it('returns 400 for empty query', async () => {
      const res = fakeRes();
      await routes['POST /api/v1/decisions/similar'](similarReq({ query: '   ' }), res);
      expect(res.status).toBe(400);
    });

    it('returns 403 for viewers when auth is enabled', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/v1/decisions/similar'](similarReq({ query: 'auth' }, 'viewer'), res);
      expect(res.status).toBe(403);
    });

    it('returns 401 when user is missing and auth is enabled', async () => {
      seedDecisions();
      const req = {
        ...similarReq({ query: 'auth' }, null),
        user: undefined,
        raw: {},
      };
      const res = fakeRes();
      await routes['POST /api/v1/decisions/similar'](req, res);
      expect(res.status).toBe(401);
    });

    it('returns 500 when RAG services are unavailable', async () => {
      seedDecisions();
      const ctx = makeCtx();
      ctx._ragStore = undefined;
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();
      await localRoutes['POST /api/v1/decisions/similar'](similarReq({ query: 'auth' }), res);
      expect(res.status).toBe(500);
      expect(res.json.code).toBe('INTERNAL_ERROR');
    });

    it('returns 400 when topK is out of range', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/v1/decisions/similar'](similarReq({ query: 'auth', topK: 99 }), res);
      expect(res.status).toBe(400);
      expect(res.json.code).toBe('INVALID_INPUT');
    });

    it('returns 500 when embedding provider throws', async () => {
      seedDecisions();
      const ctx = makeCtx();
      ctx._embeddingProvider = {
        embedText: vi.fn().mockRejectedValue(new Error('embed failed')),
      };
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();
      await localRoutes['POST /api/v1/decisions/similar'](similarReq({ query: 'auth' }), res);
      expect(res.status).toBe(500);
      expect(res.json.code).toBe('INTERNAL_ERROR');
      expect(res.json.error).toContain('embed failed');
    });

    it('returns unique mapped matches when retrieval includes duplicate decision ids', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'auth.md'),
        `# Decisions: Auth\n\nStack: Identity\nStatus: ACTIVE\nApplicable: YES\n\n| ID | Priority | Scope | Decision | Notes | Date |\n|----|-----------|-------|-----------|-------|------|\n| DEC-AUTH-001 | HIGH | Auth | Require PKCE for Entra sign-in. | Use PKCE everywhere. | 2025-01-03 |\n`,
        'utf8'
      );

      const ctx = makeCtx();
      ctx._ragStore = {
        query: vi.fn().mockResolvedValue([
          { chunk: { chunk_text: 'DEC-AUTH-001 first mention' }, score: 0.92 },
          { chunk: { chunk_text: 'DEC-AUTH-001 duplicate mention' }, score: 0.88 },
        ]),
      };
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();
      await localRoutes['POST /api/v1/decisions/similar'](
        similarReq({ query: 'auth decision', topK: 3 }),
        res
      );

      expect(res.status).toBe(200);
      expect(res.json).toHaveLength(1);
      expect(res.json[0].decisionId).toBe('DEC-AUTH-001');
    });

    it('matches by token overlap when chunk text has no explicit decision id', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'auth.md'),
        `# Decisions: Auth\n\nStack: Identity\nStatus: ACTIVE\nApplicable: YES\n\n| ID | Priority | Scope | Decision | Notes | Date |\n|----|-----------|-------|-----------|-------|------|\n| DEC-AUTH-001 | HIGH | Auth | Require PKCE for Entra sign-in. | Use PKCE everywhere. | 2025-01-03 |\n`,
        'utf8'
      );

      const ctx = makeCtx();
      ctx._ragStore = {
        query: vi.fn().mockResolvedValue([
          {
            chunk: {
              chunk_text:
                'For enterprise sign in we should require PKCE and stronger Entra login flow.',
            },
            score: 0.91,
          },
        ]),
      };
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();
      await localRoutes['POST /api/v1/decisions/similar'](
        similarReq({ query: 'secure entra sign in policy', topK: 3 }),
        res
      );

      expect(res.status).toBe(200);
      expect(res.json).toHaveLength(1);
      expect(res.json[0].decisionId).toBe('DEC-AUTH-001');
    });
  });

  /* ── GET /api/decisions ─────────────────────────────────────── */

  describe('GET /api/decisions', () => {
    it('returns empty structure when decisions.md does not exist', async () => {
      const res = fakeRes();
      await routes['GET /api/decisions'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.open).toEqual([]);
      expect(res.json.decided).toEqual([]);
      expect(res.json.deferred).toEqual([]);
      expect(res.json.categories).toEqual([]);
    });

    it('returns parsed decisions from decisions.md', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['GET /api/decisions'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.open.length).toBe(1);
      expect(res.json.open[0].id).toBe('DEC-001');
      expect(res.json.decided.length).toBeGreaterThanOrEqual(1);
    });

    it('reads category files from decisions directory', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'cat-test.md'),
        `# Decisions: Test Category

Stack: Node.js
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-CAT-001 | HIGH | Backend | Use Express | Fast | 2025-01-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['GET /api/decisions'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.categories.length).toBe(1);
      expect(res.json.categories[0].name).toBe('Test Category');
    });

    it('classifies CAT_DEFERRED decisions from active category', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      // Active category with a "## Deferred Decisions" subsection
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'mixed.md'),
        `# Decisions: Mixed

Stack: Node.js
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-MIX-001 | HIGH | Backend | Use Express | Selected | 2025-01-01 |

## Deferred Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-MIX-002 | LOW | Backend | Use Koa | TBD | 2025-01-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['GET /api/decisions'](fakeReq(), res);
      expect(res.status).toBe(200);
      // DEC-MIX-001 should be in decided (active, not deferred)
      expect(res.json.decided.some((d) => d.id === 'DEC-MIX-001')).toBe(true);
      // DEC-MIX-002 should be in deferred (CAT_DEFERRED from active category)
      expect(res.json.deferred.some((d) => d.id === 'DEC-MIX-002')).toBe(true);
    });

    it('handles deferred category decisions', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'deferred-cat.md'),
        `# Decisions: Deferred Cat

Stack: Python
Status: DEFERRED
Applicable: NO
> Deferred-Reason: Not needed yet

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-DEF-001 | LOW | Backend | Use Django | TBD | 2025-01-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['GET /api/decisions'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.deferred.some((d) => d.id === 'DEC-DEF-001')).toBe(true);
    });
  });

  /* ── POST /api/decisions — validation ───────────────────────── */

  describe('POST /api/decisions — validation', () => {
    it('returns 400 for missing action', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](fakeReq({ id: 'DEC-001' }), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid decision id format', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          id: 'bad!!!id',
          answer: 'Yes',
        }),
        res
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when decisions.md does not exist', async () => {
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          id: 'DEC-001',
          answer: 'Yes',
        }),
        res
      );
      expect(res.status).toBe(404);
    });
  });

  /* ── POST /api/decisions — mutations ────────────────────────── */

  describe('POST /api/decisions — mutations', () => {
    it('answers an open question', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          id: 'DEC-001',
          answer: 'PostgreSQL',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('answered');
    });

    it('decides an open question', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'decide',
          id: 'DEC-001',
          answer: 'PostgreSQL',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('decided');
    });

    it('defers an open question', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'defer',
          id: 'DEC-001',
          reason: 'Need more info',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('deferred');
    });

    it('returns 400 for missing id on answer', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          answer: 'Yes',
        }),
        res
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing answer on answer action', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          id: 'DEC-001',
        }),
        res
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown action', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'unknown_action',
          id: 'DEC-001',
        }),
        res
      );
      expect(res.status).toBe(400);
    });

    it('creates a new open question', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'create',
          type: 'OPEN_QUESTION',
          priority: 'HIGH',
          scope: 'Phase 1',
          text: 'Should we use Docker?',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('created_open_question');
      expect(res.json.id).toMatch(/^DEC-/);
    });

    it('creates a new operational decision', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'create',
          type: 'operational',
          priority: 'MEDIUM',
          scope: 'Phase 2',
          text: 'Use Redis for caching',
          notes: 'Performance requirement',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('created_decision');
    });

    it('returns 400 for create with missing fields', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'create',
          type: 'OPEN_QUESTION',
        }),
        res
      );
      expect(res.status).toBe(400);
    });

    it('edits a decided item', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'edit',
          id: 'DEC-002',
          text: 'Use S3 storage',
          notes: 'Updated approach',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('edited');
    });

    it('reopens a deferred item', async () => {
      // First defer, then reopen
      seedDecisions();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'defer',
          id: 'DEC-001',
          reason: 'Delayed',
        }),
        fakeRes()
      );

      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'reopen',
          id: 'DEC-001',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('reopened');
    });

    it('expires a decided item', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'expire',
          id: 'DEC-002',
          reason: 'No longer relevant',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('expired');
    });

    it('edits a decision found in a category file', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'backend.md'),
        `# Decisions: Backend

Stack: Node.js
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-CAT-010 | HIGH | Backend | Use Fastify | Speed | 2025-01-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'edit',
          id: 'DEC-CAT-010',
          text: 'Use ExpressJS instead',
          notes: 'Changed mind',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('edited');
      // Verify the category file was updated (not the main decisions.md)
      const catContent = fs.readFileSync(path.join(DECISIONS_DIR, 'backend.md'), 'utf8');
      expect(catContent).toContain('DEC-CAT-010');
    });

    it('expires a decision in a category file and syncs to index', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'infra.md'),
        `# Decisions: Infrastructure

Stack: Docker
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-INF-001 | MEDIUM | DevOps | Use Docker Compose | Simple | 2025-02-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'expire',
          id: 'DEC-INF-001',
          reason: 'Switched to Kubernetes',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('expired');
      // syncExpireToIndex should have updated the main decisions.md
      const indexContent = fs.readFileSync(DECISIONS_FILE, 'utf8');
      expect(indexContent).toContain('DEC-INF-001');
    });

    it('reopens a decision found in a category file', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      // Write a category file with a deferred decision to reopen
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'data.md'),
        `# Decisions: Data

Stack: SQL
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|

## Deferred Decisions

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-DAT-005 | LOW | Data | Use SQLite | TBD | 2025-03-01 |
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'reopen',
          id: 'DEC-DAT-005',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('reopened');
    });

    it('falls back to DECISIONS_FILE when ID is not in any category file', async () => {
      // Seed decisions.md with an ID that won't appear in any category file
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'empty.md'),
        `# Decisions: Empty

Stack: None
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
`,
        'utf8'
      );
      const res = fakeRes();
      // Edit DEC-002 which is in decisions.md but not in any category file
      await routes['POST /api/decisions'](
        fakeReq({
          action: 'edit',
          id: 'DEC-002',
          text: 'Use S3 object storage',
          notes: 'Updated',
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
    });

    it('notifies SSE on mutation', async () => {
      seedDecisions();
      const ctx = makeCtx();
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();
      await localRoutes['POST /api/decisions'](
        fakeReq({
          action: 'answer',
          id: 'DEC-001',
          answer: 'PostgreSQL',
        }),
        res
      );
      expect(ctx.sseNotify).toHaveBeenCalledWith(
        'decision_update',
        expect.objectContaining({
          action: 'answer',
        })
      );
    });
  });

  describe('category header fallbacks', () => {
    it('classifies category with bare content (no standard headers)', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      // No "# Decisions:", no "Stack:", no "Status:", no "Applicable:"
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'bare.md'),
        `## Some non-standard heading

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
| DEC-BARE-001 | HIGH | Phase 2 | Use Redis | cache layer | 2025-06-01 |
`,
        'utf8'
      );

      const res = fakeRes();
      await routes['GET /api/decisions'](
        { url: '/api/decisions', headers: { host: 'localhost:3000' } },
        res
      );
      expect(res.status).toBe(200);
      // Category should exist with fallback values
      const cat = res.json.categories.find((c) => c.file === 'bare.md');
      expect(cat).toBeTruthy();
      expect(cat.name).toBe('Unknown');
      expect(cat.stack).toBe('unknown');
      expect(cat.status).toBe('ACTIVE');
      expect(cat.applicable).toBe('YES');
    });
  });

  /* ── POST /api/decisions/activate-category ───────────────────── */

  describe('POST /api/decisions/activate-category', () => {
    function catReq(body) {
      const bodyStr = JSON.stringify(body);
      return {
        url: '/api/decisions/activate-category',
        headers: { 'content-type': 'application/json', host: 'localhost:3000' },
        on(event, cb) {
          if (event === 'data') cb(Buffer.from(bodyStr));
          if (event === 'end') cb();
        },
      };
    }

    it('returns 400 for invalid filename', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions/activate-category'](catReq({ file: 'data.json' }), res);
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent category file', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      const res = fakeRes();
      await routes['POST /api/decisions/activate-category'](catReq({ file: 'noexist.md' }), res);
      expect(res.status).toBe(404);
    });

    it('activates a deferred category', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'my-cat.md'),
        `# Decisions: My Category

Stack: Node.js
Status: DEFERRED
Applicable: NO
> Deferred-Reason: Not yet needed

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/decisions/activate-category'](catReq({ file: 'my-cat.md' }), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('activated');
    });

    it('returns already_active for active category', async () => {
      seedDecisions();
      fs.mkdirSync(DECISIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(DECISIONS_DIR, 'active-cat.md'),
        `# Decisions: Active Category

Stack: Node.js
Status: ACTIVE
Applicable: YES

| ID | Priority | Scope | Decision | Notes | Date |
|----|-----------|-------|-----------|-------|------|
`,
        'utf8'
      );
      const res = fakeRes();
      await routes['POST /api/decisions/activate-category'](catReq({ file: 'active-cat.md' }), res);
      expect(res.status).toBe(200);
      expect(res.json.action).toBe('already_active');
    });

    it('returns 400 for filename with double dots', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions/activate-category'](catReq({ file: 'file..evil.md' }), res);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/decisions/promote-lesson', () => {
    function promoteReq(body) {
      const bodyStr = JSON.stringify(body);
      return {
        url: '/api/decisions/promote-lesson',
        headers: { 'content-type': 'application/json', host: 'localhost:3000' },
        on(event, cb) {
          if (event === 'data') cb(Buffer.from(bodyStr));
          if (event === 'end') cb();
        },
      };
    }

    it('returns 400 for invalid lesson id format', async () => {
      seedDecisions();
      const res = fakeRes();
      await routes['POST /api/decisions/promote-lesson'](promoteReq({ lessonId: 'BAD-1' }), res);
      expect(res.status).toBe(400);
      expect(res.json.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when lessons-learned file does not exist', async () => {
      seedDecisions();
      if (fs.existsSync(LESSONS_FILE)) fs.unlinkSync(LESSONS_FILE);
      const res = fakeRes();
      await routes['POST /api/decisions/promote-lesson'](promoteReq({ lessonId: 'L100' }), res);
      expect(res.status).toBe(404);
      expect(res.json.code).toBe('INTERNAL_ERROR');
      expect(String(res.json.error)).toMatch(/lessons-learned\.md/i);
    });

    it('returns 404 when candidate lesson is missing or not flagged for promotion', async () => {
      seedDecisions();
      seedLessons(
        `# Lessons Learned\n\n| ID | Lesson | Type | Applies To | Status |\n|----|--------|------|------------|--------|\n| L100 | Improve logging | process | all | OPEN |\n`
      );
      const res = fakeRes();
      await routes['POST /api/decisions/promote-lesson'](promoteReq({ lessonId: 'L100' }), res);
      expect(res.status).toBe(404);
      expect(res.json.code).toBe('INTERNAL_ERROR');
      expect(String(res.json.error)).toMatch(/L100/i);
    });

    it('promotes lesson into decisions and marks lesson as promoted', async () => {
      seedDecisions();
      seedLessons(
        `# Lessons Learned\n\n| ID | Lesson | Type | Applies To | Status |\n|----|--------|------|------------|--------|\n| L200 | Enforce PKCE for auth flows | security | auth | PROMOTE_TO_DECISION |\n`
      );
      const ctx = makeCtx();
      const localRoutes = createDecisionRoutes(ctx);
      const res = fakeRes();

      await localRoutes['POST /api/decisions/promote-lesson'](
        promoteReq({ lessonId: 'L200', priority: 'HIGH', scope: 'Auth' }),
        res
      );

      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.action).toBe('promoted');
      expect(res.json.id).toMatch(/^DEC-/);

      const decisionsContent = fs.readFileSync(DECISIONS_FILE, 'utf8');
      expect(decisionsContent).toContain('Promoted from lesson L200');

      const lessonsContent = fs.readFileSync(LESSONS_FILE, 'utf8');
      expect(lessonsContent).toContain('PROMOTED');

      expect(ctx.sseNotify).toHaveBeenCalledWith(
        'decision_update',
        expect.objectContaining({ action: 'promote-lesson', lessonId: 'L200' })
      );
    });
  });
});
