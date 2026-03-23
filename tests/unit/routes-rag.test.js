// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerRoutes } = require('../../src/webapp/routes/rag');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createMemoryStorageProvider() {
  const collections = new Map();

  function getCollection(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  }

  return {
    name: 'test-memory',
    async read(collection, id) {
      return getCollection(collection).get(id) || null;
    },
    async write(collection, id, data) {
      getCollection(collection).set(id, { ...data, id });
    },
    async delete(collection, id) {
      getCollection(collection).delete(id);
    },
    async list(collection, filter = {}) {
      let docs = Array.from(getCollection(collection).values());
      if (filter.where) {
        docs = docs.filter((doc) => Object.entries(filter.where).every(([k, v]) => doc[k] === v));
      }
      if (typeof filter.offset === 'number') docs = docs.slice(filter.offset);
      if (typeof filter.limit === 'number') docs = docs.slice(0, filter.limit);
      return docs;
    },
    async transaction() {},
    async query(collection, query) {
      return this.list(collection, query || {});
    },
    async initialize() {},
    async close() {},
    async health() {
      return { status: 'healthy', provider: 'test-memory', latencyMs: 0 };
    },
    metrics() {
      return {
        reads: 0,
        writes: 0,
        deletes: 0,
        errors: 0,
        readLatencies: [],
        writeLatencies: [],
      };
    },
  };
}

function createCtx() {
  return {
    _authMiddleware: { enabled: true },
    PROJECT_ROOT: process.cwd(),
    getStorageProvider: vi.fn().mockReturnValue(createMemoryStorageProvider()),
    sseNotify: vi.fn(),
    _ragStore: {
      ensureCollection: vi.fn(),
      query: vi.fn().mockResolvedValue([
        {
          chunk: {
            source_path: require('path').join(process.cwd(), 'docs', 'contracts', 'sample.md'),
            chunk_text: 'Contract obligations and clauses.',
            start_line: 12,
          },
          score: 0.91,
        },
      ]),
    },
    _ragIndexer: {
      syncDirectory: vi.fn().mockResolvedValue({
        filesProcessed: 1,
        chunksInserted: 5,
        filesSkipped: 2,
      }),
      indexFile: vi.fn().mockResolvedValue({
        filesProcessed: 1,
        chunksInserted: 1,
        filesSkipped: 0,
      }),
    },
    _embeddingProvider: {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    },
  };
}

function createReq(url, method = 'POST', body = {}, role = 'admin') {
  return {
    url,
    method,
    body,
    user: role ? { role } : undefined,
    headers: { host: 'localhost:3001', 'content-type': 'application/json' },
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, val) {
      res.headers[key] = val;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

describe('routes/rag (#896)', () => {
  const ctx = createCtx();
  const routes = createTestableRoutes(registerRoutes, ctx);

  it('registers POST /api/v1/rag/index', () => {
    expect(routes).toHaveProperty('POST /api/v1/rag/index');
  });

  it('registers POST /api/v1/rag/query', () => {
    expect(routes).toHaveProperty('POST /api/v1/rag/query');
  });

  it('registers POST /api/v1/rag/index-standard', () => {
    expect(routes).toHaveProperty('POST /api/v1/rag/index-standard');
  });

  it('returns 400 for invalid collection name', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index'](
      createReq('/api/v1/rag/index', 'POST', {
        collection: 'bad name with spaces',
        paths: ['docs'],
      }),
      res
    );

    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when non-admin user calls endpoint', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index'](
      createReq(
        '/api/v1/rag/index',
        'POST',
        {
          collection: 'team_docs',
          paths: ['docs'],
        },
        'operator'
      ),
      res
    );

    expect(res.statusCode).toBe(403);
  });

  it('returns a jobId for valid admin request', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index'](
      createReq('/api/v1/rag/index', 'POST', {
        collection: 'team_docs',
        paths: ['docs'],
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(typeof payload.jobId).toBe('string');
    expect(payload.jobId.length).toBeGreaterThan(0);
  });

  it('indexes the standard decisions collection with default paths', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index-standard'](
      createReq('/api/v1/rag/index-standard', 'POST', {
        collection: 'decisions',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(payload.collection).toBe('decisions');
    expect(payload.resolvedCollection).toBe('decisions');
    expect(Array.isArray(payload.paths)).toBe(true);
    expect(payload.paths.length).toBeGreaterThan(0);
  });

  it('includes BusinessDocs/session in phase-outputs standard collection paths', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index-standard'](
      createReq('/api/v1/rag/index-standard', 'POST', {
        collection: 'phase-outputs',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.collection).toBe('phase-outputs');
    expect(payload.paths).toEqual(expect.arrayContaining(['BusinessDocs/session']));
  });

  it('scopes sprint-artifacts collection by workspaceId', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/index-standard'](
      createReq('/api/v1/rag/index-standard', 'POST', {
        collection: 'sprint-artifacts',
        workspaceId: 'project-alpha',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.collection).toBe('sprint-artifacts');
    expect(payload.resolvedCollection).toBe('sprint-artifacts--project-alpha');
  });

  it('returns 403 for viewer on query endpoint', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/query'](
      createReq(
        '/api/v1/rag/query',
        'POST',
        {
          collection: 'contracts',
          query: 'payment terms',
        },
        'viewer'
      ),
      res
    );

    expect(res.statusCode).toBe(403);
  });

  it('returns chunks for operator query requests', async () => {
    const res = createRes();
    await routes['POST /api/v1/rag/query'](
      createReq(
        '/api/v1/rag/query',
        'POST',
        {
          collection: 'contracts',
          query: 'obligations',
          topK: 5,
          threshold: 0.2,
        },
        'operator'
      ),
      res
    );

    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.chunks)).toBe(true);
    expect(payload.chunks.length).toBe(1);
    expect(payload.chunks[0].source_path).toBe('docs/contracts/sample.md');
    expect(payload.chunks[0].start_line).toBe(12);
    expect(payload.chunks[0].collection).toBe('contracts');
    expect(payload.chunks[0].resolved_collection).toBe('contracts');
    expect(typeof payload.chunks[0].score).toBe('number');
  });
});
