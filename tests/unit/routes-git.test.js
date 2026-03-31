import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

const fs = require('fs');
const os = require('os');
const path = require('path');
import * as __req_0 from '../../src/webapp/routes/git';
const { registerRoutes } = __req_0;
import * as __req_1 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_1;

function createCtx() {
  return {
    PROJECT_ROOT: process.cwd(),
  };
}

function createReq(url, method = 'GET', body = undefined, userId = null) {
  return {
    url,
    method,
    body,
    user: userId ? { id: userId } : undefined,
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

describe('routes/git credentials (#958)', () => {
  const originalKey = process.env.CREDENTIAL_MASTER_KEY;
  const originalDbPath = process.env.GIT_CREDENTIAL_DB_PATH;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-credentials-routes-'));

  beforeEach(() => {
    process.env.CREDENTIAL_MASTER_KEY =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    process.env.GIT_CREDENTIAL_DB_PATH = path.join(
      tempDir,
      `creds-${Date.now()}-${Math.random()}.sqlite`
    );
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.CREDENTIAL_MASTER_KEY;
    } else {
      process.env.CREDENTIAL_MASTER_KEY = originalKey;
    }

    if (originalDbPath === undefined) {
      delete process.env.GIT_CREDENTIAL_DB_PATH;
    } else {
      process.env.GIT_CREDENTIAL_DB_PATH = originalDbPath;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('registers credential management routes', () => {
    const routes = createTestableRoutes(registerRoutes, createCtx());

    expect(routes).toHaveProperty('POST /api/v1/git/credentials');
    expect(routes).toHaveProperty('DELETE /api/v1/git/credentials/:provider');
    expect(routes).toHaveProperty('GET /api/v1/git/credentials/status');
  });

  it('returns 401 when unauthenticated', async () => {
    const routes = createTestableRoutes(registerRoutes, createCtx());
    const res = createRes();

    await routes['GET /api/v1/git/credentials/status'](
      createReq('/api/v1/git/credentials/status', 'GET', undefined, null),
      res
    );

    expect(res.statusCode).toBe(401);
  });

  it('stores credential and status returns presence only', async () => {
    const routes = createTestableRoutes(registerRoutes, createCtx());

    const setRes = createRes();
    await routes['POST /api/v1/git/credentials'](
      createReq(
        '/api/v1/git/credentials',
        'POST',
        {
          provider: 'github',
          token: 'super-secret-token',
        },
        'user-1'
      ),
      setRes
    );
    expect(setRes.statusCode).toBe(200);

    const statusRes = createRes();
    await routes['GET /api/v1/git/credentials/status'](
      createReq('/api/v1/git/credentials/status', 'GET', undefined, 'user-1'),
      statusRes
    );

    expect(statusRes.statusCode).toBe(200);
    const payload = JSON.parse(statusRes.body);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.providers)).toBe(true);
    expect(payload.providers).toContainEqual({ provider: 'github', hasCredential: true });
    expect(statusRes.body.includes('super-secret-token')).toBe(false);
  });

  it('scopes credentials per authenticated user workspace', async () => {
    const routes = createTestableRoutes(registerRoutes, createCtx());

    await routes['POST /api/v1/git/credentials'](
      createReq(
        '/api/v1/git/credentials',
        'POST',
        {
          provider: 'gitlab',
          token: 'token-a',
        },
        'user-a'
      ),
      createRes()
    );

    const otherStatus = createRes();
    await routes['GET /api/v1/git/credentials/status'](
      createReq('/api/v1/git/credentials/status', 'GET', undefined, 'user-b'),
      otherStatus
    );

    const payload = JSON.parse(otherStatus.body);
    expect(payload.providers).toEqual([]);
  });

  it('deletes stored provider credential', async () => {
    const routes = createTestableRoutes(registerRoutes, createCtx());

    await routes['POST /api/v1/git/credentials'](
      createReq(
        '/api/v1/git/credentials',
        'POST',
        {
          provider: 'bitbucket',
          token: 'token-z',
        },
        'user-z'
      ),
      createRes()
    );

    const deleteRes = createRes();
    await routes['DELETE /api/v1/git/credentials/:provider'](
      createReq('/api/v1/git/credentials/bitbucket', 'DELETE', undefined, 'user-z'),
      deleteRes
    );

    expect(deleteRes.statusCode).toBe(200);
    const payload = JSON.parse(deleteRes.body);
    expect(payload.deleted).toBe(true);

    const statusRes = createRes();
    await routes['GET /api/v1/git/credentials/status'](
      createReq('/api/v1/git/credentials/status', 'GET', undefined, 'user-z'),
      statusRes
    );

    expect(JSON.parse(statusRes.body).providers).toEqual([]);
  });
});
