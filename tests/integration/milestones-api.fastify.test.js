/* M30-007: Milestones API Integration Tests (SP-9) via Fastify inject().
 * Replaces milestones-api.test.js (raw HTTP) with framework-native testing.
 * Tests CRUD operations for milestone management. */

const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp, paths } = require('../helpers/create-test-app');

const { PROJECT_ROOT } = paths;
let app;

/* ── Lifecycle ────────────────────────────────────────────────── */

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  setStore(new InMemoryStore(PROJECT_ROOT));
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

/* ═══════════════════════════════════════════════════════════════
 * SP-9.1: CRUD Operations
 * ═══════════════════════════════════════════════════════════════ */

describe('Milestones API (SP-9) — Fastify', () => {
  describe('SP-9.1: CRUD Operations', () => {
    describe('POST /api/milestones (create)', () => {
      it('creates a milestone with valid input', async () => {
        const res = await inject('POST', '/api/milestones', {
          name: 'FEAT-05 Analytics Dashboard',
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
        });
        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body.ok).toBe(true);
        expect(body.data).toMatchObject({
          name: 'FEAT-05 Analytics Dashboard',
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
          archived: false,
        });
        expect(body.data.id).toMatch(/^milestone-\d{8}-[a-f0-9]{6}$/);
        expect(body.data.created_at).toBeDefined();
        expect(body.data.updated_at).toBeDefined();
      });

      it('rejects missing required field', async () => {
        const res = await inject('POST', '/api/milestones', {
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
        });
        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body.code).toBe('VALIDATION_ERROR');
      });

      it('rejects invalid progress (outside 0-100)', async () => {
        const res = await inject('POST', '/api/milestones', {
          name: 'Invalid Progress',
          status: 'in progress',
          progress: 150,
          completion: '2026-05-15',
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().code).toBe('VALIDATION_ERROR');
      });

      it('rejects duplicate milestone name', async () => {
        await inject('POST', '/api/milestones', {
          name: 'FEAT-06 Duplicate Test',
          status: 'not started',
          progress: 0,
          completion: '2026-05-20',
        });
        const res = await inject('POST', '/api/milestones', {
          name: 'FEAT-06 Duplicate Test',
          status: 'in progress',
          progress: 50,
          completion: '2026-05-21',
        });
        expect(res.statusCode).toBe(409);
        expect(res.json().error).toBe('Milestone already exists');
      });

      it('rejects invalid status via schema validation', async () => {
        const res = await inject('POST', '/api/milestones', {
          name: 'FEAT-07 Case Normalization',
          status: 'IN PROGRESS',
          progress: 25,
          completion: '2026-05-25',
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/milestones (list)', () => {
      it('lists all active milestones', async () => {
        await inject('POST', '/api/milestones', {
          name: 'LIST-TEST-1',
          status: 'not started',
          progress: 0,
          completion: '2026-06-01',
        });
        await inject('POST', '/api/milestones', {
          name: 'LIST-TEST-2',
          status: 'complete',
          progress: 100,
          completion: '2026-05-30',
        });

        const res = await inject('GET', '/api/milestones');
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.ok).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.count).toBeGreaterThanOrEqual(2);
        expect(body.data.every((m) => !m.archived)).toBe(true);
      });

      it('includes archived milestones with ?include_archived=true', async () => {
        const createRes = await inject('POST', '/api/milestones', {
          name: 'ARCHIVE-TEST-INCLUDE',
          status: 'blocked',
          progress: 30,
          completion: '2026-06-10',
        });
        const milestoneId = createRes.json().data.id;
        await inject('PATCH', `/api/milestones/${milestoneId}/archive`);

        const listRes1 = await inject('GET', '/api/milestones');
        expect(listRes1.json().data.find((m) => m.id === milestoneId)).toBeUndefined();

        const listRes2 = await inject('GET', '/api/milestones?include_archived=true');
        const archived2 = listRes2.json().data.find((m) => m.id === milestoneId);
        expect(archived2).toBeDefined();
        expect(archived2.archived).toBe(true);
      });
    });

    describe('GET /api/milestones/:id (read single)', () => {
      it('returns a single milestone by ID', async () => {
        const createRes = await inject('POST', '/api/milestones', {
          name: 'GET-SINGLE-TEST',
          status: 'in progress',
          progress: 50,
          completion: '2026-06-15',
        });
        const milestoneId = createRes.json().data.id;

        const res = await inject('GET', `/api/milestones/${milestoneId}`);
        expect(res.statusCode).toBe(200);
        expect(res.json().ok).toBe(true);
        expect(res.json().data.id).toBe(milestoneId);
        expect(res.json().data.name).toBe('GET-SINGLE-TEST');
      });

      it('returns 404 for non-existent milestone', async () => {
        const res = await inject('GET', '/api/milestones/milestone-invalid-id');
        expect(res.statusCode).toBe(404);
        expect(res.json().ok).toBe(false);
        expect(res.json().error).toBe('Milestone not found');
      });
    });
  });

  /* ═══════════════════════════════════════════════════════════════
   * SP-9.2: Update (PUT)
   * ═══════════════════════════════════════════════════════════════ */

  describe('SP-9.2: Update (PUT)', () => {
    it('updates a single field', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'UPDATE-SINGLE-FIELD',
        status: 'not started',
        progress: 0,
        completion: '2026-07-01',
      });
      const milestoneId = createRes.json().data.id;
      const created_at = createRes.json().data.created_at;

      const updateRes = await inject('PUT', `/api/milestones/${milestoneId}`, { progress: 50 });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().data.progress).toBe(50);
      expect(updateRes.json().data.name).toBe('UPDATE-SINGLE-FIELD');
      expect(updateRes.json().data.status).toBe('not started');
      expect(updateRes.json().data.created_at).toBe(created_at);
      // updated_at may match in fast test runs; just verify it exists
      expect(updateRes.json().data.updated_at).toBeDefined();
    });

    it('updates multiple fields', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'UPDATE-MULTI-FIELD',
        status: 'not started',
        progress: 0,
        completion: '2026-07-05',
      });
      const milestoneId = createRes.json().data.id;

      const updateRes = await inject('PUT', `/api/milestones/${milestoneId}`, {
        status: 'in progress',
        progress: 75,
        completion: '2026-07-10',
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().data.status).toBe('in progress');
      expect(updateRes.json().data.progress).toBe(75);
      expect(updateRes.json().data.completion).toBe('2026-07-10');
    });

    it('rejects invalid progress in update', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'UPDATE-INVALID-PROGRESS',
        status: 'not started',
        progress: 0,
        completion: '2026-07-15',
      });
      const milestoneId = createRes.json().data.id;

      const updateRes = await inject('PUT', `/api/milestones/${milestoneId}`, { progress: -10 });
      expect(updateRes.statusCode).toBe(400);
      expect(updateRes.json().code).toBe('VALIDATION_ERROR');
    });

    it('prevents duplicate name with update', async () => {
      await inject('POST', '/api/milestones', {
        name: 'DUP-ORIGINAL',
        status: 'not started',
        progress: 0,
        completion: '2026-07-20',
      });
      const res2 = await inject('POST', '/api/milestones', {
        name: 'DUP-CHANGEABLE',
        status: 'not started',
        progress: 0,
        completion: '2026-07-25',
      });
      const id2 = res2.json().data.id;

      const updateRes = await inject('PUT', `/api/milestones/${id2}`, { name: 'DUP-ORIGINAL' });
      expect(updateRes.statusCode).toBe(409);
      expect(updateRes.json().error).toBe('Milestone already exists');
    });

    it('returns 404 for non-existent milestone', async () => {
      const res = await inject('PUT', '/api/milestones/milestone-fake-id', { progress: 50 });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('Milestone not found');
    });

    it('preserves immutable fields (id, created_at)', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'IMMUTABLE-TEST',
        status: 'not started',
        progress: 0,
        completion: '2026-08-01',
      });
      const original = createRes.json().data;

      const updateRes = await inject('PUT', `/api/milestones/${original.id}`, {
        id: 'milestone-fake-999',
        created_at: '2020-01-01T00:00:00Z',
        progress: 100,
      });
      expect(updateRes.json().data.id).toBe(original.id);
      expect(updateRes.json().data.created_at).toBe(original.created_at);
      expect(updateRes.json().data.progress).toBe(100);
    });
  });

  /* ═══════════════════════════════════════════════════════════════
   * SP-9.3: Archive (PATCH)
   * ═══════════════════════════════════════════════════════════════ */

  describe('SP-9.3: Archive (PATCH)', () => {
    it('archives a milestone', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'ARCHIVE-TEST',
        status: 'in progress',
        progress: 50,
        completion: '2026-08-10',
      });
      const milestoneId = createRes.json().data.id;

      const archiveRes = await inject('PATCH', `/api/milestones/${milestoneId}/archive`);
      expect(archiveRes.statusCode).toBe(200);
      expect(archiveRes.json().ok).toBe(true);
      expect(archiveRes.json().data.archived).toBe(true);
      expect(archiveRes.json().data.name).toBe('ARCHIVE-TEST');
      expect(archiveRes.json().data.progress).toBe(50);
    });

    it('excludes archived milestone from default list', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'ARCHIVE-EXCLUDE-TEST',
        status: 'not started',
        progress: 0,
        completion: '2026-08-15',
      });
      const milestoneId = createRes.json().data.id;

      let listRes = await inject('GET', '/api/milestones');
      expect(listRes.json().data.find((m) => m.id === milestoneId)).toBeDefined();

      await inject('PATCH', `/api/milestones/${milestoneId}/archive`);

      listRes = await inject('GET', '/api/milestones');
      expect(listRes.json().data.find((m) => m.id === milestoneId)).toBeUndefined();

      listRes = await inject('GET', '/api/milestones?include_archived=true');
      const found = listRes.json().data.find((m) => m.id === milestoneId);
      expect(found).toBeDefined();
      expect(found.archived).toBe(true);
    });

    it('returns 404 for non-existent milestone', async () => {
      const res = await inject('PATCH', '/api/milestones/milestone-fake-999/archive');
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('Milestone not found');
    });

    it('recovery via PUT preserves archived state', async () => {
      const createRes = await inject('POST', '/api/milestones', {
        name: 'RECOVERY-TEST',
        status: 'complete',
        progress: 100,
        completion: '2026-08-20',
      });
      const milestoneId = createRes.json().data.id;

      await inject('PATCH', `/api/milestones/${milestoneId}/archive`);

      const getSingle = await inject('GET', `/api/milestones/${milestoneId}`);
      expect(getSingle.json().data.archived).toBe(true);

      const updateRes = await inject('PUT', `/api/milestones/${milestoneId}`, {
        progress: 75,
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json().data.archived).toBe(true);
    }, 15_000);
  });
});
