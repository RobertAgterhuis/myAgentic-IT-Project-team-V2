// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import { getStore, __setFiles, __getFiles } from '../store.js';
import createMilestoneRoutes from './milestones.js';

/* ── Mocks ──────────────────────────────────────────────────────── */

vi.mock('../file-lock', () => ({
  withFileLock: vi.fn((_path, fn) => fn()),
}));

vi.mock('../store', () => {
  let _files = {};
  return {
    getStore: vi.fn(() => ({
      exists: (fp) => fp in _files,
      mkdirp: vi.fn(),
      writeFile: (fp, data) => { _files[fp] = data; },
      stat: (fp) => (_files[fp] ? { mtimeMs: Date.now() } : null),
    })),
    __setFiles: (f) => { _files = f; },
    __getFiles: () => _files,
  };
});

/* ── Helpers ────────────────────────────────────────────────────── */

const PROJECT_ROOT = '/project';
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const MILESTONES_FILE = path.join(DATA_DIR, 'milestones.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'milestone-templates.json');

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) { _headers[k] = v; },
    writeHead(s, h) { _status = s; if (h) Object.assign(_headers, h); },
    end(data) { _body = data; },
    get status() { return _status; },
    get json() { return JSON.parse(_body); },
  };
}

function fakeReq(urlPath, body) {
  const bodyStr = body ? JSON.stringify(body) : '';
  return {
    url: urlPath || '/api/milestones',
    headers: { 'content-type': 'application/json', host: 'localhost:3000' },
    on(event, cb) {
      if (event === 'data' && bodyStr) cb(Buffer.from(bodyStr));
      if (event === 'end') cb();
    },
  };
}

function makeCtx() {
  return {
    PROJECT_ROOT,
    _cache: {
      read: (fp) => {
        const files = __getFiles();
        if (files[fp] !== undefined) return files[fp];
        throw new Error('not found');
      },
    },
    safeWriteSync: vi.fn((fp, data) => {
      const files = __getFiles();
      files[fp] = data;
      __setFiles(files);
    }),
  };
}

function seedMilestones(milestones) {
  const files = __getFiles();
  files[MILESTONES_FILE] = JSON.stringify(milestones);
  __setFiles(files);
}

function seedTemplates(templates) {
  const files = __getFiles();
  files[TEMPLATES_FILE] = JSON.stringify(templates);
  __setFiles(files);
}

const VALID_MILESTONE = {
  name: 'Alpha Release',
  status: 'not started',
  progress: 0,
  completion: '2026-12-31',
};

/* ── Tests ──────────────────────────────────────────────────────── */

describe('milestone routes', () => {
  let routes;

  beforeEach(() => {
    vi.clearAllMocks();
    __setFiles({});
    routes = createMilestoneRoutes(makeCtx());
  });

  it('exports all 9 route handlers', () => {
    expect(routes['POST /api/milestones']).toBeTypeOf('function');
    expect(routes['GET /api/milestones']).toBeTypeOf('function');
    expect(routes['GET /api/milestones/:id']).toBeTypeOf('function');
    expect(routes['PUT /api/milestones/:id']).toBeTypeOf('function');
    expect(routes['PATCH /api/milestones/:id/archive']).toBeTypeOf('function');
    expect(routes['POST /api/milestone-templates']).toBeTypeOf('function');
    expect(routes['GET /api/milestone-templates']).toBeTypeOf('function');
    expect(routes['DELETE /api/milestone-templates/:id']).toBeTypeOf('function');
    expect(routes['POST /api/milestone-templates/:id/apply']).toBeTypeOf('function');
  });

  /* ── POST /api/milestones (create) ──────────────────────────── */

  describe('POST /api/milestones', () => {
    it('creates a milestone with valid data', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', VALID_MILESTONE), res);
      expect(res.status).toBe(201);
      expect(res.json.ok).toBe(true);
      expect(res.json.data.name).toBe('Alpha Release');
      expect(res.json.data.status).toBe('not started');
      expect(res.json.data.id).toMatch(/^milestone-/);
    });

    it('returns 400 for missing name', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        status: 'not started', progress: 0, completion: '2026-12-31',
      }), res);
      expect(res.status).toBe(400);
      expect(res.json.ok).toBe(false);
    });

    it('returns 400 for empty name', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, name: '   ',
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid status', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, status: 'invalid',
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for non-integer progress', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, progress: 50.5,
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for progress out of range', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, progress: 150,
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid completion date format', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, completion: '2026/12/31',
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate name', async () => {
      seedMilestones([{ id: 'milestone-existing', name: 'Alpha Release', status: 'not started', progress: 0, completion: '2026-06-01', archived: false }]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', VALID_MILESTONE), res);
      expect(res.status).toBe(409);
    });

    it('normalizes status to lowercase', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, status: 'In Progress',
      }), res);
      expect(res.status).toBe(201);
      expect(res.json.data.status).toBe('in progress');
    });
  });

  /* ── GET /api/milestones (list) ─────────────────────────────── */

  describe('GET /api/milestones', () => {
    it('returns empty list initially', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['GET /api/milestones'](fakeReq('/api/milestones'), res);
      expect(res.status).toBe(200);
      expect(res.json.data).toEqual([]);
      expect(res.json.count).toBe(0);
    });

    it('excludes archived by default', async () => {
      seedMilestones([
        { id: 'm1', name: 'A', archived: false },
        { id: 'm2', name: 'B', archived: true },
      ]);
      const res = fakeRes();
      await routes['GET /api/milestones'](fakeReq('/api/milestones'), res);
      expect(res.json.count).toBe(1);
      expect(res.json.data[0].id).toBe('m1');
    });

    it('includes archived when query param is set', async () => {
      seedMilestones([
        { id: 'm1', name: 'A', archived: false },
        { id: 'm2', name: 'B', archived: true },
      ]);
      const res = fakeRes();
      await routes['GET /api/milestones'](fakeReq('/api/milestones?include_archived=true'), res);
      expect(res.json.count).toBe(2);
    });
  });

  /* ── GET /api/milestones/:id ─────────────────────────────────── */

  describe('GET /api/milestones/:id', () => {
    it('returns a single milestone', async () => {
      seedMilestones([{ id: 'test-001', name: 'M1', status: 'in progress', progress: 50, archived: false }]);
      const res = fakeRes();
      await routes['GET /api/milestones/:id'](fakeReq('/api/milestones/test-001'), res);
      expect(res.status).toBe(200);
      expect(res.json.data.name).toBe('M1');
    });

    it('returns 404 for non-existent milestone', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['GET /api/milestones/:id'](fakeReq('/api/milestones/nonexistent'), res);
      expect(res.status).toBe(404);
    });
  });

  /* ── PUT /api/milestones/:id (update) ────────────────────────── */

  describe('PUT /api/milestones/:id', () => {
    it('updates milestone fields', async () => {
      seedMilestones([{
        id: 'test-001', name: 'M1', status: 'not started', progress: 0,
        completion: '2026-06-01', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', archived: false,
      }]);
      const res = fakeRes();
      await routes['PUT /api/milestones/:id'](
        fakeReq('/api/milestones/test-001', { name: 'M1 Updated', progress: 25 }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.json.data.name).toBe('M1 Updated');
      expect(res.json.data.progress).toBe(25);
    });

    it('returns 404 for non-existent milestone', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['PUT /api/milestones/:id'](
        fakeReq('/api/milestones/noexist', { name: 'X' }),
        res
      );
      expect(res.status).toBe(404);
    });

    it('returns 409 when update creates name collision', async () => {
      seedMilestones([
        { id: 'test-001', name: 'M1', status: 'not started', progress: 0, completion: '2026-06-01', archived: false },
        { id: 'test-002', name: 'M2', status: 'not started', progress: 0, completion: '2026-06-01', archived: false },
      ]);
      const res = fakeRes();
      await routes['PUT /api/milestones/:id'](
        fakeReq('/api/milestones/test-001', { name: 'M2' }),
        res
      );
      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid field values', async () => {
      seedMilestones([{
        id: 'test-001', name: 'M1', status: 'not started', progress: 0,
        completion: '2026-06-01', archived: false,
      }]);
      const res = fakeRes();
      await routes['PUT /api/milestones/:id'](
        fakeReq('/api/milestones/test-001', { progress: -10 }),
        res
      );
      expect(res.status).toBe(400);
    });
  });

  /* ── PATCH /api/milestones/:id/archive ──────────────────────── */

  describe('PATCH /api/milestones/:id/archive', () => {
    it('archives a milestone', async () => {
      seedMilestones([{
        id: 'test-001', name: 'M1', status: 'complete', progress: 100,
        completion: '2026-06-01', archived: false, created_at: '2025-01-01T00:00:00Z',
      }]);
      const res = fakeRes();
      await routes['PATCH /api/milestones/:id/archive'](fakeReq('/api/milestones/test-001/archive'), res);
      expect(res.status).toBe(200);
      expect(res.json.data.archived).toBe(true);
    });

    it('returns 404 for non-existent milestone', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['PATCH /api/milestones/:id/archive'](fakeReq('/api/milestones/noexist/archive'), res);
      expect(res.status).toBe(404);
    });
  });

  /* ── Template CRUD ──────────────────────────────────────────── */

  describe('POST /api/milestone-templates', () => {
    it('creates a template', async () => {
      seedTemplates([]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates'](fakeReq('/api/milestone-templates', {
        name: 'Sprint Template',
        defaultStatus: 'not started',
        defaultProgress: 0,
      }), res);
      expect(res.status).toBe(201);
      expect(res.json.data.name).toBe('Sprint Template');
      expect(res.json.data.id).toMatch(/^template-/);
    });

    it('returns 400 for invalid template data', async () => {
      seedTemplates([]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates'](fakeReq('/api/milestone-templates', {
        name: '', defaultStatus: 'not started', defaultProgress: 0,
      }), res);
      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate template name', async () => {
      seedTemplates([{ id: 't-1', name: 'Sprint Template', defaultStatus: 'not started', defaultProgress: 0 }]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates'](fakeReq('/api/milestone-templates', {
        name: 'Sprint Template',
        defaultStatus: 'not started',
        defaultProgress: 0,
      }), res);
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/milestone-templates', () => {
    it('lists all templates', async () => {
      seedTemplates([
        { id: 't-1', name: 'A' },
        { id: 't-2', name: 'B' },
      ]);
      const res = fakeRes();
      await routes['GET /api/milestone-templates'](fakeReq('/api/milestone-templates'), res);
      expect(res.status).toBe(200);
      expect(res.json.count).toBe(2);
    });
  });

  describe('DELETE /api/milestone-templates/:id', () => {
    it('deletes an existing template', async () => {
      seedTemplates([{ id: 'tpl-001', name: 'Sprint' }]);
      const res = fakeRes();
      await routes['DELETE /api/milestone-templates/:id'](fakeReq('/api/milestone-templates/tpl-001'), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
    });

    it('returns 404 for non-existent template', async () => {
      seedTemplates([]);
      const res = fakeRes();
      await routes['DELETE /api/milestone-templates/:id'](fakeReq('/api/milestone-templates/noexist'), res);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/milestone-templates/:id/apply', () => {
    it('creates milestone from template', async () => {
      seedTemplates([{
        id: 'tpl-001', name: 'Sprint', namePattern: 'Sprint -',
        defaultStatus: 'not started', defaultProgress: 0,
      }]);
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates/:id/apply'](
        fakeReq('/api/milestone-templates/tpl-001/apply', {
          milestoneName: 'Sprint 5',
          completion: '2026-08-01',
        }),
        res
      );
      expect(res.status).toBe(201);
      expect(res.json.data.name).toBe('Sprint 5');
      expect(res.json.data.template_id).toBe('tpl-001');
    });

    it('returns 404 for non-existent template', async () => {
      seedTemplates([]);
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates/:id/apply'](
        fakeReq('/api/milestone-templates/noexist/apply', {
          milestoneName: 'Sprint 5',
          completion: '2026-08-01',
        }),
        res
      );
      expect(res.status).toBe(404);
    });

    it('returns 400 when completion validation fails', async () => {
      seedTemplates([{
        id: 'tpl-001', name: 'Sprint', defaultStatus: 'not started', defaultProgress: 0,
      }]);
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestone-templates/:id/apply'](
        fakeReq('/api/milestone-templates/tpl-001/apply', {
          milestoneName: 'Sprint 5',
          completion: 'not-a-date',
        }),
        res
      );
      expect(res.status).toBe(400);
    });
  });

  /* ── Validation functions coverage ──────────────────────────── */

  describe('validation edge cases', () => {
    it('rejects name longer than 255 chars', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, name: 'x'.repeat(256),
      }), res);
      expect(res.status).toBe(400);
      expect(res.json.details.some(d => d.includes('255'))).toBe(true);
    });

    it('rejects progress as string', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, progress: 'fifty',
      }), res);
      expect(res.status).toBe(400);
    });

    it('accepts all valid statuses', async () => {
      const statuses = ['not started', 'in progress', 'complete', 'blocked'];
      for (const status of statuses) {
        vi.clearAllMocks();
        __setFiles({});
        seedMilestones([]);
        routes = createMilestoneRoutes(makeCtx());
        const res = fakeRes();
        await routes['POST /api/milestones'](fakeReq('/api/milestones', {
          ...VALID_MILESTONE, name: `Test ${status}`, status,
        }), res);
        expect(res.status).toBe(201);
      }
    });

    it('rejects invalid completion date value', async () => {
      seedMilestones([]);
      const res = fakeRes();
      await routes['POST /api/milestones'](fakeReq('/api/milestones', {
        ...VALID_MILESTONE, completion: '2026-13-45',
      }), res);
      expect(res.status).toBe(400);
    });
  });
});
