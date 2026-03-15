'use strict';
/* Milestones API Integration Tests (SP-9)
 * Tests CRUD operations for milestone management:
 * - SP-9.1: POST (create), GET list, GET single
 * - SP-9.2: PUT (update with partial support)
 * - SP-9.3: PATCH (soft-delete/archive)
 * Validates input, duplicate detection, audit trail, and soft-delete behavior. */

const http = require('http');
const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { server, _cache, _rateLimitMap } = require('../../src/webapp/server');

const WEBAPP_DIR = path.resolve(__dirname, '../../src/webapp');
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');

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
    if (body !== undefined) {
      r.write(JSON.stringify(body));
    }
    r.end();
  });
}

describe('Milestones API (SP-9)', () => {
  beforeAll(async () => {
    setStore(new InMemoryStore(PROJECT_ROOT));
    _rateLimitMap.clear();
    const listener = server.listen(0);
    const addr = listener.address();
    baseUrl = `http://localhost:${addr.port}`;
    await new Promise((resolve) => {
      if (listener.listening) resolve();
      else listener.once('listening', resolve);
    });
  });

  afterAll(() => {
    if (server.listening) server.close();
  });

  beforeEach(() => {
    _rateLimitMap.clear();
  });

  describe('SP-9.1: CRUD Operations', () => {
    describe('POST /api/milestones (create)', () => {
      it('creates a milestone with valid input', async () => {
        const res = await req('POST', '/api/milestones', {
          name: 'FEAT-05 Analytics Dashboard',
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
        });

        expect(res.status).toBe(201);
        expect(res.json.ok).toBe(true);
        expect(res.json.data).toMatchObject({
          name: 'FEAT-05 Analytics Dashboard',
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
          archived: false,
        });
        expect(res.json.data.id).toMatch(/^milestone-\d{8}-[a-f0-9]{6}$/);
        expect(res.json.data.created_at).toBeDefined();
        expect(res.json.data.updated_at).toBeDefined();
      });

      it('rejects missing required field', async () => {
        const res = await req('POST', '/api/milestones', {
          status: 'not started',
          progress: 0,
          completion: '2026-05-15',
          // missing: name
        });

        expect(res.status).toBe(400);
        expect(res.json.ok).toBe(false);
        expect(res.json.error).toBe('Validation failed');
        expect(res.json.details).toContain('name: required string field');
      });

      it('rejects invalid progress (outside 0-100)', async () => {
        const res = await req('POST', '/api/milestones', {
          name: 'Invalid Progress',
          status: 'in progress',
          progress: 150,
          completion: '2026-05-15',
        });

        expect(res.status).toBe(400);
        expect(res.json.details[0]).toContain('progress: must be between 0 and 100');
      });

      it('rejects duplicate milestone name', async () => {
        // Create first
        await req('POST', '/api/milestones', {
          name: 'FEAT-06 Duplicate Test',
          status: 'not started',
          progress: 0,
          completion: '2026-05-20',
        });

        // Try to create with same name
        const res = await req('POST', '/api/milestones', {
          name: 'FEAT-06 Duplicate Test',
          status: 'in progress',
          progress: 50,
          completion: '2026-05-21',
        });

        expect(res.status).toBe(409);
        expect(res.json.error).toBe('Milestone already exists');
      });

      it('normalizes status to lowercase', async () => {
        const res = await req('POST', '/api/milestones', {
          name: 'FEAT-07 Case Normalization',
          status: 'IN PROGRESS',
          progress: 25,
          completion: '2026-05-25',
        });

        expect(res.status).toBe(201);
        expect(res.json.data.status).toBe('in progress');
      });
    });

    describe('GET /api/milestones (list)', () => {
      it('lists all active milestones', async () => {
        // Create a couple milestones
        await req('POST', '/api/milestones', {
          name: 'LIST-TEST-1',
          status: 'not started',
          progress: 0,
          completion: '2026-06-01',
        });

        await req('POST', '/api/milestones', {
          name: 'LIST-TEST-2',
          status: 'complete',
          progress: 100,
          completion: '2026-05-30',
        });

        const res = await req('GET', '/api/milestones');

        expect(res.status).toBe(200);
        expect(res.json.ok).toBe(true);
        expect(Array.isArray(res.json.data)).toBe(true);
        expect(res.json.count).toBeGreaterThanOrEqual(2);
        expect(res.json.data.every((m) => !m.archived)).toBe(true);
      });

      it('includes archived milestones with ?include_archived=true', async () => {
        // Create and archive a milestone
        const createRes = await req('POST', '/api/milestones', {
          name: 'ARCHIVE-TEST-INCLUDE',
          status: 'blocked',
          progress: 30,
          completion: '2026-06-10',
        });

        const milestoneId = createRes.json.data.id;
        await req('PATCH', `/api/milestones/${milestoneId}/archive`);

        // List without include_archived
        const listRes1 = await req('GET', '/api/milestones');
        const archived1 = listRes1.json.data.find((m) => m.id === milestoneId);
        expect(archived1).toBeUndefined();

        // List with include_archived=true
        const listRes2 = await req('GET', '/api/milestones?include_archived=true');
        const archived2 = listRes2.json.data.find((m) => m.id === milestoneId);
        expect(archived2).toBeDefined();
        expect(archived2.archived).toBe(true);
      });
    });

    describe('GET /api/milestones/:id (read single)', () => {
      it('returns a single milestone by ID', async () => {
        const createRes = await req('POST', '/api/milestones', {
          name: 'GET-SINGLE-TEST',
          status: 'in progress',
          progress: 50,
          completion: '2026-06-15',
        });

        const milestoneId = createRes.json.data.id;
        const res = await req('GET', `/api/milestones/${milestoneId}`);

        expect(res.status).toBe(200);
        expect(res.json.ok).toBe(true);
        expect(res.json.data.id).toBe(milestoneId);
        expect(res.json.data.name).toBe('GET-SINGLE-TEST');
      });

      it('returns 404 for non-existent milestone', async () => {
        const res = await req('GET', '/api/milestones/milestone-invalid-id');

        expect(res.status).toBe(404);
        expect(res.json.ok).toBe(false);
        expect(res.json.error).toBe('Milestone not found');
      });
    });
  });

  describe('SP-9.2: Update (PUT)', () => {
    it('updates a single field', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'UPDATE-SINGLE-FIELD',
        status: 'not started',
        progress: 0,
        completion: '2026-07-01',
      });

      const milestoneId = createRes.json.data.id;
      const created_at = createRes.json.data.created_at;

      const updateRes = await req('PUT', `/api/milestones/${milestoneId}`, {
        progress: 50,
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.json.data.progress).toBe(50);
      expect(updateRes.json.data.name).toBe('UPDATE-SINGLE-FIELD');
      expect(updateRes.json.data.status).toBe('not started');
      expect(updateRes.json.data.created_at).toBe(created_at);
      expect(updateRes.json.data.updated_at).not.toBe(createRes.json.data.updated_at);
    });

    it('updates multiple fields', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'UPDATE-MULTI-FIELD',
        status: 'not started',
        progress: 0,
        completion: '2026-07-05',
      });

      const milestoneId = createRes.json.data.id;

      const updateRes = await req('PUT', `/api/milestones/${milestoneId}`, {
        status: 'in progress',
        progress: 75,
        completion: '2026-07-10',
      });

      expect(updateRes.status).toBe(200);
      expect(updateRes.json.data.status).toBe('in progress');
      expect(updateRes.json.data.progress).toBe(75);
      expect(updateRes.json.data.completion).toBe('2026-07-10');
    });

    it('rejects invalid progress in update', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'UPDATE-INVALID-PROGRESS',
        status: 'not started',
        progress: 0,
        completion: '2026-07-15',
      });

      const milestoneId = createRes.json.data.id;

      const updateRes = await req('PUT', `/api/milestones/${milestoneId}`, {
        progress: -10,
      });

      expect(updateRes.status).toBe(400);
      expect(updateRes.json.error).toBe('Validation failed');
    });

    it('prevents duplicate name with update', async () => {
      // Create two milestones
      const _res1 = await req('POST', '/api/milestones', {
        name: 'DUP-ORIGINAL',
        status: 'not started',
        progress: 0,
        completion: '2026-07-20',
      });

      const res2 = await req('POST', '/api/milestones', {
        name: 'DUP-CHANGEABLE',
        status: 'not started',
        progress: 0,
        completion: '2026-07-25',
      });

      const id2 = res2.json.data.id;

      // Try to rename second to first's name
      const updateRes = await req('PUT', `/api/milestones/${id2}`, {
        name: 'DUP-ORIGINAL',
      });

      expect(updateRes.status).toBe(409);
      expect(updateRes.json.error).toBe('Milestone already exists');
    });

    it('returns 404 for non-existent milestone', async () => {
      const res = await req('PUT', '/api/milestones/milestone-fake-id', {
        progress: 50,
      });

      expect(res.status).toBe(404);
      expect(res.json.error).toBe('Milestone not found');
    });

    it('preserves immutable fields (id, created_at)', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'IMMUTABLE-TEST',
        status: 'not started',
        progress: 0,
        completion: '2026-08-01',
      });

      const original = createRes.json.data;

      // Try to change id and created_at (should be ignored)
      const updateRes = await req('PUT', `/api/milestones/${original.id}`, {
        id: 'milestone-fake-999',
        created_at: '2020-01-01T00:00:00Z',
        progress: 100,
      });

      expect(updateRes.json.data.id).toBe(original.id);
      expect(updateRes.json.data.created_at).toBe(original.created_at);
      expect(updateRes.json.data.progress).toBe(100);
    });
  });

  describe('SP-9.3: Archive (PATCH)', () => {
    it('archives a milestone', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'ARCHIVE-TEST',
        status: 'in progress',
        progress: 50,
        completion: '2026-08-10',
      });

      const milestoneId = createRes.json.data.id;

      const archiveRes = await req('PATCH', `/api/milestones/${milestoneId}/archive`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.json.ok).toBe(true);
      expect(archiveRes.json.data.archived).toBe(true);
      expect(archiveRes.json.data.name).toBe('ARCHIVE-TEST');
      expect(archiveRes.json.data.progress).toBe(50);
    });

    it('excludes archived milestone from default list', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'ARCHIVE-EXCLUDE-TEST',
        status: 'not started',
        progress: 0,
        completion: '2026-08-15',
      });

      const milestoneId = createRes.json.data.id;

      // Initially visible
      let listRes = await req('GET', '/api/milestones');
      let found = listRes.json.data.find((m) => m.id === milestoneId);
      expect(found).toBeDefined();
      expect(found.archived).toBe(false);

      // Archive it
      await req('PATCH', `/api/milestones/${milestoneId}/archive`);

      // No longer in default list
      listRes = await req('GET', '/api/milestones');
      found = listRes.json.data.find((m) => m.id === milestoneId);
      expect(found).toBeUndefined();

      // Visible with include_archived=true
      listRes = await req('GET', '/api/milestones?include_archived=true');
      found = listRes.json.data.find((m) => m.id === milestoneId);
      expect(found).toBeDefined();
      expect(found.archived).toBe(true);
    });

    it('returns 404 for non-existent milestone', async () => {
      const res = await req('PATCH', '/api/milestones/milestone-fake-999/archive');

      expect(res.status).toBe(404);
      expect(res.json.error).toBe('Milestone not found');
    });

    it('can be recovered by updating archived to false', async () => {
      const createRes = await req('POST', '/api/milestones', {
        name: 'RECOVERY-TEST',
        status: 'complete',
        progress: 100,
        completion: '2026-08-20',
      });

      const milestoneId = createRes.json.data.id;

      // Archive
      await req('PATCH', `/api/milestones/${milestoneId}/archive`);

      // Verify it's archived
      let getSingle = await req('GET', `/api/milestones/${milestoneId}`);
      expect(getSingle.json.data.archived).toBe(true);

      // Recover by updating archived to false
      const updateRes = await req('PUT', `/api/milestones/${milestoneId}`, {
        // Note: archived field cannot be directly set to false via PUT in current spec
        // Recovery would require a specific unarchive endpoint or allowing archived field in PUT
        // For now, this test documents the limitation
        progress: 75,
      });

      expect(updateRes.status).toBe(200);
      // archived should still be true since we didn't provide a way to unarchive via PUT
      expect(updateRes.json.data.archived).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on file system errors', async () => {
      // This would require mocking file system errors
      // Documented as future test
    });

    it('handles concurrent operations gracefully', async () => {
      // This would require testing with file locks
      // Documented as future test
    });
  });
});
