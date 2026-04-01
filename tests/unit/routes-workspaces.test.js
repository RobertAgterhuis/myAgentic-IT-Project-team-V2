// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/routes/workspaces';
const { registerRoutes } = __req_0;
import * as __req_1 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_1;

function createReq(url, method = 'GET', body, params) {
  return {
    url,
    method,
    body,
    params,
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

function parsed(res) {
  return JSON.parse(res.body);
}

function createMemoryProvider() {
  const db = new Map();
  const key = (collection, id) => `${collection}:${id}`;

  return {
    name: 'memory',
    async read(collection, id) {
      return db.get(key(collection, id)) ?? null;
    },
    async write(collection, id, data) {
      db.set(key(collection, id), JSON.parse(JSON.stringify(data)));
    },
    async delete(collection, id) {
      db.delete(key(collection, id));
    },
    async list(collection, filter) {
      const docs = [...db.entries()]
        .filter(([k]) => k.startsWith(`${collection}:`))
        .map(([, v]) => JSON.parse(JSON.stringify(v)));

      if (!filter?.where) return docs;
      return docs.filter((doc) =>
        Object.entries(filter.where).every(([field, value]) => doc[field] === value)
      );
    },
    async transaction() {},
    async query() {
      return [];
    },
    async initialize() {},
    async close() {},
    async health() {
      return { status: 'healthy', provider: 'memory', latencyMs: 0 };
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

function createRoutesWithProvider(provider) {
  return createTestableRoutes(registerRoutes, {
    getStorageProvider: () => provider,
    sseNotify: vi.fn(),
    PROJECT_ROOT: process.cwd(),
  });
}

describe('routes/workspaces', () => {
  it('returns 503 when storage provider is unavailable', async () => {
    const routes = createTestableRoutes(registerRoutes, {
      getStorageProvider: () => null,
      sseNotify: vi.fn(),
      PROJECT_ROOT: process.cwd(),
    });

    const res = createRes();
    await routes['GET /api/workspaces'](createReq('/api/workspaces'), res);

    expect(res.statusCode).toBe(503);
    expect(parsed(res).code).toBe('INTERNAL_ERROR');
  });

  it('creates and lists workspaces', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    const createRes1 = createRes();
    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-1', name: 'Workspace 1', owner: 'alice' }),
      createRes1
    );
    expect(createRes1.statusCode).toBe(201);

    const listRes = createRes();
    await routes['GET /api/workspaces'](createReq('/api/workspaces'), listRes);
    expect(listRes.statusCode).toBe(200);
    const body = parsed(listRes);
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);
    expect(body.workspaces[0].id).toBe('ws-1');
  });

  it('returns 409 for duplicate workspace create', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    const first = createRes();
    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-dup', name: 'Dup', owner: 'alice' }),
      first
    );
    expect(first.statusCode).toBe(201);

    const second = createRes();
    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-dup', name: 'Dup', owner: 'bob' }),
      second
    );
    expect(second.statusCode).toBe(409);
    expect(parsed(second).code).toBe('INTERNAL_ERROR');
  });

  it('gets workspace detail and project list', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-2', name: 'Workspace 2', owner: 'alice' }),
      createRes()
    );
    await routes['POST /api/workspaces/:id/projects'](
      createReq('/api/workspaces/ws-2/projects', 'POST', {
        id: 'proj-1',
        name: 'Project 1',
        repositories: [],
      }),
      createRes()
    );

    const detailRes = createRes();
    await routes['GET /api/workspaces/:id'](createReq('/api/workspaces/ws-2'), detailRes);

    expect(detailRes.statusCode).toBe(200);
    const body = parsed(detailRes);
    expect(body.workspace.id).toBe('ws-2');
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].id).toBe('proj-1');
  });

  it('returns 404 for missing workspace detail', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());
    const res = createRes();

    await routes['GET /api/workspaces/:id'](createReq('/api/workspaces/nope'), res);

    expect(res.statusCode).toBe(404);
    expect(parsed(res).code).toBe('NOT_FOUND');
  });

  it('returns 400 for empty workspace id in detail route', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());
    const res = createRes();

    await routes['GET /api/workspaces/:id'](
      createReq('/api/workspaces/', 'GET', undefined, { id: '' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(parsed(res).error).toContain('Workspace ID required');
  });

  it('updates and deletes a workspace', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-3', name: 'Workspace 3', owner: 'alice' }),
      createRes()
    );

    const updateRes = createRes();
    await routes['PUT /api/workspaces/:id'](
      createReq('/api/workspaces/ws-3', 'PUT', { name: 'Workspace 3 Updated' }),
      updateRes
    );
    expect(updateRes.statusCode).toBe(200);
    expect(parsed(updateRes).workspace.name).toContain('Updated');

    const deleteRes = createRes();
    await routes['DELETE /api/workspaces/:id'](
      createReq('/api/workspaces/ws-3', 'DELETE'),
      deleteRes
    );
    expect(deleteRes.statusCode).toBe(200);
    expect(parsed(deleteRes).deleted).toBe('ws-3');
  });

  it('returns 404 when deleting non-existent workspace', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());
    const res = createRes();

    await routes['DELETE /api/workspaces/:id'](createReq('/api/workspaces/missing', 'DELETE'), res);

    expect(res.statusCode).toBe(404);
    expect(parsed(res).code).toBe('NOT_FOUND');
  });

  it('adds and removes repositories from a workspace', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-4', name: 'Workspace 4', owner: 'alice' }),
      createRes()
    );

    const addRes = createRes();
    await routes['POST /api/workspaces/:id/repositories'](
      createReq('/api/workspaces/ws-4/repositories', 'POST', {
        id: 'repo-1',
        name: 'repo-1',
        provider: 'github',
        url: 'https://example.test/repo-1',
        defaultBranch: 'main',
        tags: ['core'],
      }),
      addRes
    );
    expect(addRes.statusCode).toBe(201);
    expect(parsed(addRes).repository_count).toBe(1);

    const removeRes = createRes();
    await routes['DELETE /api/workspaces/:id/repositories/:repoId'](
      createReq('/api/workspaces/ws-4/repositories/repo-1', 'DELETE'),
      removeRes
    );
    expect(removeRes.statusCode).toBe(200);
    expect(parsed(removeRes).removed).toBe('repo-1');
  });

  it('returns 400 for invalid repository provider', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-5', name: 'Workspace 5', owner: 'alice' }),
      createRes()
    );

    const res = createRes();
    await routes['POST /api/workspaces/:id/repositories'](
      createReq('/api/workspaces/ws-5/repositories', 'POST', {
        id: 'repo-2',
        name: 'repo-2',
        provider: 'invalid-provider',
        url: 'https://example.test/repo-2',
        defaultBranch: 'main',
      }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(parsed(res).code).toBe('INTERNAL_ERROR');
  });

  it('returns 400 for missing repository identifiers on remove route', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());
    const res = createRes();

    await routes['DELETE /api/workspaces/:id/repositories/:repoId'](
      createReq('/api/workspaces//repositories/', 'DELETE', undefined, { id: '', repoId: '' }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(parsed(res).error).toContain('Workspace ID and Repository ID required');
  });

  it('returns 404 when removing missing repository', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-6', name: 'Workspace 6', owner: 'alice' }),
      createRes()
    );

    const res = createRes();
    await routes['DELETE /api/workspaces/:id/repositories/:repoId'](
      createReq('/api/workspaces/ws-6/repositories/missing', 'DELETE'),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(parsed(res).code).toBe('NOT_FOUND');
  });

  it('lists and creates projects for a workspace', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());

    await routes['POST /api/workspaces'](
      createReq('/api/workspaces', 'POST', { id: 'ws-7', name: 'Workspace 7', owner: 'alice' }),
      createRes()
    );

    await routes['POST /api/workspaces/:id/repositories'](
      createReq('/api/workspaces/ws-7/repositories', 'POST', {
        id: 'repo-x',
        name: 'Repo X',
        provider: 'github',
      }),
      createRes()
    );

    const createProjectRes = createRes();
    await routes['POST /api/workspaces/:id/projects'](
      createReq('/api/workspaces/ws-7/projects', 'POST', {
        id: 'proj-7',
        name: 'Project 7',
        repositories: ['repo-x'],
      }),
      createProjectRes
    );
    expect(createProjectRes.statusCode).toBe(201);

    const listProjectsRes = createRes();
    await routes['GET /api/workspaces/:id/projects'](
      createReq('/api/workspaces/ws-7/projects', 'GET'),
      listProjectsRes
    );
    expect(listProjectsRes.statusCode).toBe(200);
    expect(parsed(listProjectsRes).count).toBe(1);
  });

  it('returns 404 for project creation when workspace is missing', async () => {
    const routes = createRoutesWithProvider(createMemoryProvider());
    const res = createRes();

    await routes['POST /api/workspaces/:id/projects'](
      createReq('/api/workspaces/missing/projects', 'POST', { id: 'p', name: 'P' }),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(parsed(res).code).toBe('NOT_FOUND');
  });

  it('maps unexpected manager errors to 500', async () => {
    const brokenProvider = createMemoryProvider();
    brokenProvider.list = vi.fn().mockRejectedValue(new Error('boom'));

    const routes = createRoutesWithProvider(brokenProvider);
    const res = createRes();

    await routes['GET /api/workspaces'](createReq('/api/workspaces'), res);

    expect(res.statusCode).toBe(500);
    expect(parsed(res).code).toBe('INTERNAL_ERROR');
  });
});
