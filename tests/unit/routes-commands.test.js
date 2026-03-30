'use strict';

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const { registerRoutes } = require('../../src/webapp/routes/commands');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) {
      res.headers[k] = v;
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

function createReq(url, method = 'GET', body) {
  return {
    url,
    method,
    body,
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
    },
  };
}

describe('routes/commands', () => {
  const projectRoot = '/project';
  const businessDocs = path.join(projectRoot, 'BusinessDocs');
  const sessionDir = path.join(businessDocs, 'session');
  const commandQueue = path.join(sessionDir, 'command-queue.json');

  function makeCtx(store) {
    return {
      PROJECT_ROOT: projectRoot,
      BUSINESS_DOCS: businessDocs,
      SESSION_DIR: sessionDir,
      COMMAND_QUEUE: commandQueue,
      HELP_DIR: path.join(projectRoot, 'docs', 'help'),
      DECISIONS_FILE: path.join(businessDocs, 'decisions.md'),
      DECISIONS_DIR: path.join(businessDocs, 'decisions'),
      _cache: new FileCache(store),
      _audit: { read: () => [] },
      sseNotify: vi.fn(),
      safeWriteSync(filePath, data) {
        store.writeFile(filePath, data);
      },
    };
  }

  it('queues a valid command, emits SSE, and exposes queue helpers on context', async () => {
    const store = new InMemoryStore({});
    setStore(store);
    const ctx = makeCtx(store);
    const routes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await routes['POST /api/command'](
      createReq('/api/command', 'POST', {
        command: 'create',
        project: 'CoverageFixProject',
        description: 'Build deterministic CI coverage buffer',
        execution_mode: 'HYBRID',
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.clipboard_text).toContain('CREATE CoverageFixProject');
    expect(body.clipboard_text).toContain('[HYBRID]');
    expect(ctx.sseNotify).toHaveBeenCalledWith(
      'command_queued',
      expect.objectContaining({
        type: 'command_queued',
        command: 'create',
      })
    );

    expect(typeof ctx._readCommandQueue).toBe('function');
    expect(typeof ctx._getLatestCommand).toBe('function');
    expect(ctx._readCommandQueue()).toHaveLength(1);
    expect(ctx._getLatestCommand()).toMatchObject({
      command: 'CREATE',
      project: 'CoverageFixProject',
      execution_mode: 'HYBRID',
      status: 'PENDING',
    });
  });

  it('returns UNKNOWN_COMMAND for invalid command names', async () => {
    const store = new InMemoryStore({});
    setStore(store);
    const ctx = makeCtx(store);
    const routes = createTestableRoutes(registerRoutes, ctx);

    const res = createRes();
    await routes['POST /api/command'](
      createReq('/api/command', 'POST', {
        command: 'not-a-real-command',
        project: 'X',
      }),
      res
    );

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ code: 'UNKNOWN_COMMAND' });
  });

  it('returns latest command and queue via GET /api/command and returns catalog', async () => {
    const store = new InMemoryStore({});
    setStore(store);
    const ctx = makeCtx(store);
    const routes = createTestableRoutes(registerRoutes, ctx);

    const queueRes = createRes();
    await routes['POST /api/command'](
      createReq('/api/command', 'POST', { command: 'AUDIT', project: 'CatalogProject' }),
      queueRes
    );

    const getRes = createRes();
    await routes['GET /api/command'](createReq('/api/command'), getRes);
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.command).toMatchObject({ command: 'AUDIT', project: 'CatalogProject' });
    expect(Array.isArray(getBody.queue)).toBe(true);
    expect(getBody.queue).toHaveLength(1);

    const catalogRes = createRes();
    await routes['GET /api/commands'](createReq('/api/commands'), catalogRes);
    expect(catalogRes.statusCode).toBe(200);
    const catalogBody = JSON.parse(catalogRes.body);
    expect(Array.isArray(catalogBody.commands)).toBe(true);
    expect(catalogBody.commands.length).toBeGreaterThan(0);
  });
});
