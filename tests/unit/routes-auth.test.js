import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Route handler tests for routes/auth.ts (M29 coverage).
 * Tests each HTTP handler exported by createAuthRoutes.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

let AuthManager, createAuthMiddleware;
let createAuthRoutes;

beforeAll(async () => {
  const authMod = await import('../../src/webapp/auth.ts');
  AuthManager = authMod.AuthManager;
  createAuthMiddleware = authMod.createAuthMiddleware;
  const { registerRoutes } = await import('../../src/webapp/routes/auth.ts');
  const { createTestableRoutes } = await import('../helpers/fastify-test-adapter.js');
  createAuthRoutes = (ctx) => createTestableRoutes(registerRoutes, ctx);
});

/* ── Helpers ──────────────────────────────────────────────────── */

function tmpDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-route-'));
  return path.join(dir, 'auth.db');
}

function rmDir(dbPath) {
  try {
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const TEST_CONFIG = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  callbackUrl: 'http://localhost:3000/api/auth/callback',
  stateSecret: crypto.randomBytes(32).toString('hex'),
  secureCookies: false,
  enabled: true,
};

const ENTRA_TEST_CONFIG = {
  entraClientId: 'entra-client-id',
  entraTenantId: 'common',
  entraCallbackUrl: 'http://localhost:3000/api/auth/entra/callback',
};

function createUnsignedJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

function createReq(url, method = 'GET', { headers = {}, body = null } = {}) {
  const chunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  return {
    url,
    method,
    headers: { host: 'localhost:3000', 'content-type': 'application/json', ...headers },
    on(event, cb) {
      if (event === 'data') chunks.forEach((c) => cb(c));
      if (event === 'end') cb();
      return this;
    },
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: '',
    _headersSent: false,
    setHeader(key, val) {
      if (Array.isArray(res._headers[key])) {
        res._headers[key].push(val);
      } else if (res._headers[key]) {
        res._headers[key] = [res._headers[key], val];
      } else {
        res._headers[key] = val;
      }
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      res._headersSent = true;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) {
          res._headers[k] = v;
        }
      }
      return res;
    },
    end(data) {
      if (data) res._body = data;
    },
    getHeader(key) {
      return res._headers[key];
    },
  };
  return res;
}

function parsed(res) {
  return JSON.parse(res._body);
}

/* ── Test Suite ───────────────────────────────────────────────── */

describe('routes/auth handlers', () => {
  let dbPath, manager, middleware, routes;

  beforeEach(() => {
    dbPath = tmpDbPath();
    const config = { ...TEST_CONFIG, dbPath };
    manager = new AuthManager(config);
    middleware = createAuthMiddleware({
      authManager: manager,
      log: () => {},
    });
    routes = createAuthRoutes({
      _authManager: manager,
      _authMiddleware: middleware,
    });
  });

  afterEach(() => {
    manager.close();
    rmDir(dbPath);
  });

  /* ── GET /api/auth/login ─────────────────────────────────────── */

  describe('GET /api/auth/login', () => {
    it('redirects to GitHub OAuth URL', async () => {
      const handler = routes['GET /api/auth/login'];
      const req = createReq('/api/auth/login');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(302);
      expect(res._headers['Location']).toContain('github.com/login/oauth/authorize');
      expect(res._headers['Location']).toContain('client_id=test-client-id');
    });

    it('includes redirect param in state', async () => {
      const handler = routes['GET /api/auth/login'];
      const req = createReq('/api/auth/login?redirect=/dashboard');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(302);
      expect(res._headers['Location']).toContain('state=');
    });
  });

  describe('GET /api/auth/entra/login', () => {
    it('returns 503 when Entra provider is not configured', async () => {
      const handler = routes['GET /api/auth/entra/login'];
      const req = createReq('/api/auth/entra/login');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(503);
      expect(parsed(res).error).toBe('AUTH_PROVIDER_DISABLED');
    });

    it('redirects to Entra authorize endpoint when provider is configured', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const handler = routes['GET /api/auth/entra/login'];
      const req = createReq('/api/auth/entra/login?redirect=/dashboard');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(302);
      expect(res._headers['Location']).toContain('login.microsoftonline.com');
      expect(res._headers['Location']).toContain('code_challenge_method=S256');
      expect(res._headers['Location']).toContain('client_id=entra-client-id');
    });
  });

  describe('POST /api/auth/link/entra', () => {
    it('returns 401 when no authenticated session is present', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const handler = routes['POST /api/auth/link/entra'];
      const req = createReq('/api/auth/link/entra', 'POST', { body: { redirect: '/settings' } });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(parsed(res).code).toBe('UNAUTHORIZED');
    });

    it('returns Entra login URL for authenticated user without existing Entra link', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const user = manager.store.upsertUser({
        provider: 'github',
        providerId: 'gh-link-user-1',
        providerUsername: 'ghlink1',
        email: 'gh-link1@example.com',
        name: 'GH Link 1',
        avatarUrl: '',
      });
      const session = manager.createSession(user.id, 'github');

      const handler = routes['POST /api/auth/link/entra'];
      const req = createReq('/api/auth/link/entra', 'POST', {
        headers: { cookie: `sid=${session.primary_provider}.${session.id}` },
        body: { redirect: '/settings/identity' },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.provider).toBe('entra');
      expect(body.url).toContain('login.microsoftonline.com');
      expect(body.url).toContain('state=');
    });

    it('returns 409 when user already linked Entra provider', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const user = manager.store.upsertUser({
        provider: 'github',
        providerId: 'gh-link-user-2',
        providerUsername: 'ghlink2',
        email: 'gh-link2@example.com',
        name: 'GH Link 2',
        avatarUrl: '',
      });
      manager.store.linkProviderAccount({
        userId: user.id,
        provider: 'entra',
        providerId: 'entra-linked-user-2',
        providerUsername: 'entra.user2@example.com',
      });
      const session = manager.createSession(user.id, 'github');

      const handler = routes['POST /api/auth/link/entra'];
      const req = createReq('/api/auth/link/entra', 'POST', {
        headers: { cookie: `sid=${session.primary_provider}.${session.id}` },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(409);
      expect(parsed(res).code).toBe('CONFLICT');
    });
  });

  /* ── GET /api/auth/callback ──────────────────────────────────── */

  describe('GET /api/auth/callback', () => {
    it('redirects to /login?error=missing_params when code/state missing', async () => {
      const handler = routes['GET /api/auth/callback'];
      const req = createReq('/api/auth/callback');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(302);
      expect(res._headers['Location']).toBe('/login?error=missing_params');
    });

    it('redirects to /login?error=invalid_state when state is invalid', async () => {
      const handler = routes['GET /api/auth/callback'];
      const req = createReq('/api/auth/callback?code=abc123&state=invalid');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(302);
      expect(res._headers['Location']).toBe('/login?error=invalid_state');
    });

    it('completes OAuth flow and creates session on valid callback', async () => {
      // Generate a valid state
      const loginUrl = manager.getLoginUrl('/dashboard');
      const stateParam = new URL(loginUrl).searchParams.get('state');

      // Mock global fetch for token exchange and user fetch
      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('login/oauth/access_token')) {
          return {
            ok: true,
            json: async () => ({ access_token: 'mock-token' }),
          };
        }
        if (urlStr.includes('api.github.com/user/emails')) {
          return {
            ok: true,
            json: async () => [{ email: 'cb@test.com', primary: true, verified: true }],
          };
        }
        if (urlStr.includes('api.github.com/user')) {
          return {
            ok: true,
            json: async () => ({
              id: 88888,
              email: null,
              name: 'CB User',
              avatar_url: 'https://example.com/avatar.png',
              login: 'cbuser',
            }),
          };
        }
        return origFetch(url);
      };

      try {
        const handler = routes['GET /api/auth/callback'];
        const req = createReq(
          `/api/auth/callback?code=mock-code&state=${encodeURIComponent(stateParam)}`
        );
        const res = createRes();

        await handler(req, res);

        expect(res.statusCode).toBe(302);
        expect(res._headers['Location']).toBe('/dashboard');
        // Should have set session cookies
        const setCookie = res._headers['Set-Cookie'];
        expect(setCookie).toBeDefined();
        // User should exist in the store
        const user = manager.store.findUserByGithubId(88888);
        expect(user).not.toBeNull();
        expect(user.name).toBe('CB User');
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it('redirects to /login?error=auth_failed on token exchange error', async () => {
      const loginUrl = manager.getLoginUrl();
      const stateParam = new URL(loginUrl).searchParams.get('state');

      const origFetch = globalThis.fetch;
      globalThis.fetch = async () => ({ ok: false, status: 500 });

      try {
        const handler = routes['GET /api/auth/callback'];
        const req = createReq(
          `/api/auth/callback?code=bad-code&state=${encodeURIComponent(stateParam)}`
        );
        const res = createRes();

        await handler(req, res);

        expect(res.statusCode).toBe(302);
        expect(res._headers['Location']).toBe(
          '/login?error=auth_failed&error_detail=GitHub%20token%20exchange%20failed%3A%20500'
        );
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });

  describe('GET /api/auth/entra/callback', () => {
    it('returns 503 when Entra provider is not configured', async () => {
      const handler = routes['GET /api/auth/entra/callback'];
      const req = createReq('/api/auth/entra/callback');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(503);
      expect(parsed(res).error).toBe('AUTH_PROVIDER_DISABLED');
    });

    it('completes Entra OAuth flow and creates session on valid callback', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const loginUrl = manager.getLoginUrlForProvider('entra', '/dashboard');
      const stateParam = new URL(loginUrl).searchParams.get('state');

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/oauth2/v2.0/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'entra-access-token',
              refresh_token: 'entra-refresh-token',
              expires_in: 3600,
              id_token: createUnsignedJwt({
                oid: 'entra-user-001',
                tid: 'tenant-001',
                preferred_username: 'entra.user@example.com',
                name: 'Entra User',
                email: 'entra.user@example.com',
              }),
            }),
          };
        }
        return origFetch(url);
      };

      try {
        const handler = routes['GET /api/auth/entra/callback'];
        const req = createReq(
          `/api/auth/entra/callback?code=mock-code&state=${encodeURIComponent(stateParam)}`
        );
        const res = createRes();

        await handler(req, res);

        expect(res.statusCode).toBe(302);
        expect(res._headers['Location']).toBe('/dashboard');

        const user = manager.store.findUserByProvider('entra', 'entra-user-001');
        expect(user).not.toBeNull();
        expect(user.email).toBe('entra.user@example.com');

        const entraAccount = user.linked_accounts.find((a) => a.provider === 'entra');
        expect(entraAccount).not.toBeNull();
        expect(entraAccount.tenant_id).toBe('tenant-001');
        expect(entraAccount.provider_username).toBe('entra.user@example.com');
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it('links Entra account to existing GitHub session without logout', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({ ...TEST_CONFIG, ...ENTRA_TEST_CONFIG, dbPath });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      const user = manager.store.upsertUser({
        provider: 'github',
        providerId: 'gh-link-entra-001',
        providerUsername: 'gh-link-user',
        email: 'gh.link@example.com',
        name: 'GH Link User',
        avatarUrl: '',
      });
      const session = manager.createSession(user.id, 'github');

      const linkRedirect = `/__auth/link/entra?uid=${encodeURIComponent(user.id)}&redirect=${encodeURIComponent('/settings/identity')}`;
      const loginUrl = manager.getLoginUrlForProvider('entra', linkRedirect);
      const stateParam = new URL(loginUrl).searchParams.get('state');

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/oauth2/v2.0/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'entra-access-token-link',
              refresh_token: 'entra-refresh-token-link',
              expires_in: 3600,
              id_token: createUnsignedJwt({
                oid: 'entra-user-link-001',
                tid: 'tenant-link-001',
                preferred_username: 'linked.user@example.com',
                name: 'Linked User',
                email: 'linked.user@example.com',
              }),
            }),
          };
        }
        return origFetch(url);
      };

      try {
        const handler = routes['GET /api/auth/entra/callback'];
        const req = createReq(
          `/api/auth/entra/callback?code=mock-code&state=${encodeURIComponent(stateParam)}`,
          'GET',
          { headers: { cookie: `sid=${session.primary_provider}.${session.id}` } }
        );
        const res = createRes();

        await handler(req, res);

        expect(res.statusCode).toBe(302);
        expect(res._headers['Location']).toBe('/settings/identity?linked=entra');

        const linkedUser = manager.store.findUserById(user.id);
        const linkedProviders = linkedUser.linked_accounts.map((a) => a.provider).sort();
        expect(linkedProviders).toEqual(['entra', 'github']);

        const persistedSession = manager.store.findSession(session.id);
        expect(persistedSession).not.toBeNull();
        expect(persistedSession.primary_provider).toBe('github');
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it('maps Entra admin group claim to admin role on login', async () => {
      manager.close();
      rmDir(dbPath);

      dbPath = tmpDbPath();
      manager = new AuthManager({
        ...TEST_CONFIG,
        ...ENTRA_TEST_CONFIG,
        dbPath,
        entraAdminGroupIds: ['entra-admin-group-001'],
      });
      middleware = createAuthMiddleware({
        authManager: manager,
        log: () => {},
      });
      routes = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
      });

      // Consume bootstrap admin role so Entra user role assertion is meaningful.
      manager.store.upsertUser({
        provider: 'github',
        providerId: 'bootstrap-admin-gh',
        providerUsername: 'bootstrap',
        email: 'bootstrap@example.com',
        name: 'Bootstrap',
        avatarUrl: '',
      });

      const loginUrl = manager.getLoginUrlForProvider('entra', '/dashboard');
      const stateParam = new URL(loginUrl).searchParams.get('state');

      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/oauth2/v2.0/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'entra-access-token-admin',
              refresh_token: 'entra-refresh-token-admin',
              expires_in: 3600,
              id_token: createUnsignedJwt({
                oid: 'entra-admin-user-001',
                tid: 'tenant-admin-001',
                preferred_username: 'admin.user@example.com',
                name: 'Admin User',
                email: 'admin.user@example.com',
                groups: ['entra-admin-group-001'],
              }),
            }),
          };
        }
        return origFetch(url);
      };

      try {
        const handler = routes['GET /api/auth/entra/callback'];
        const req = createReq(
          `/api/auth/entra/callback?code=mock-code&state=${encodeURIComponent(stateParam)}`
        );
        const res = createRes();

        await handler(req, res);

        expect(res.statusCode).toBe(302);
        expect(res._headers['Location']).toBe('/dashboard');

        const user = manager.store.findUserByProvider('entra', 'entra-admin-user-001');
        expect(user).not.toBeNull();
        expect(user.role).toBe('admin');
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });

  /* ── POST /api/auth/logout ───────────────────────────────────── */

  describe('POST /api/auth/logout', () => {
    it('returns ok when no session exists', async () => {
      const handler = routes['POST /api/auth/logout'];
      const req = createReq('/api/auth/logout', 'POST');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(parsed(res).ok).toBe(true);
    });

    it('destroys session and clears cookies when session exists', async () => {
      const user = manager.store.upsertUser({
        githubId: 9001,
        email: 'logout@test.com',
        name: 'LogoutUser',
        avatarUrl: '',
      });
      const session = manager.store.createSession(user.id);

      const handler = routes['POST /api/auth/logout'];
      const req = createReq('/api/auth/logout', 'POST', {
        headers: { cookie: `sid=${session.id}` },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(parsed(res).ok).toBe(true);
      // Session should be destroyed
      expect(manager.store.findSession(session.id)).toBeNull();
    });
  });

  /* ── GET /api/auth/me ────────────────────────────────────────── */

  describe('GET /api/auth/me', () => {
    it('returns 401 when not authenticated', async () => {
      const handler = routes['GET /api/auth/me'];
      const req = createReq('/api/auth/me');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(parsed(res).code).toBe('UNAUTHORIZED');
    });

    it('returns user profile when authenticated', async () => {
      const user = manager.store.upsertUser({
        githubId: 9002,
        email: 'me@test.com',
        name: 'MeUser',
        avatarUrl: 'https://example.com/avatar.png',
      });
      const session = manager.store.createSession(user.id);

      const handler = routes['GET /api/auth/me'];
      const req = createReq('/api/auth/me', 'GET', {
        headers: { cookie: `sid=${session.id}` },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.email).toBe('me@test.com');
      expect(body.name).toBe('MeUser');
      expect(body.role).toBe('admin'); // first user is admin
      expect(body.csrf_token).toBeDefined();
    });

    it('returns 401 and clears session when user not found', async () => {
      const user = manager.store.upsertUser({
        githubId: 9003,
        email: 'ghost@test.com',
        name: 'Ghost',
        avatarUrl: '',
      });
      const session = manager.store.createSession(user.id);
      // Delete the user from DB directly
      manager.store._db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

      const handler = routes['GET /api/auth/me'];
      const req = createReq('/api/auth/me', 'GET', {
        headers: { cookie: `sid=${session.id}` },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(parsed(res).code).toBe('UNAUTHORIZED');
    });
  });

  /* ── GET /api/auth/providers ─────────────────────────────────── */

  describe('GET /api/auth/providers', () => {
    it('returns github:true entra:false when only GitHub is configured', async () => {
      const handler = routes['GET /api/auth/providers'];
      const req = createReq('/api/auth/providers');
      const res = createRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.github).toBe(true);
      expect(body.entra).toBe(false);
    });

    it('returns github:true entra:true when both providers are configured', async () => {
      const dbPath2 = tmpDbPath();
      const cfg = {
        ...TEST_CONFIG,
        dbPath: dbPath2,
        ...ENTRA_TEST_CONFIG,
        entraClientSecret: 'entra-secret',
      };
      const mgr2 = new AuthManager(cfg);
      const mw2 = createAuthMiddleware({ authManager: mgr2, log: () => {} });
      const routes2 = createAuthRoutes({ _authManager: mgr2, _authMiddleware: mw2 });

      const handler = routes2['GET /api/auth/providers'];
      const req = createReq('/api/auth/providers');
      const res = createRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.github).toBe(true);
      expect(body.entra).toBe(true);

      mgr2.close();
      rmDir(dbPath2);
    });

    it('returns 503 when auth is disabled', async () => {
      const routes3 = createAuthRoutes({ _authManager: undefined, _authMiddleware: undefined });
      const handler = routes3['GET /api/auth/providers'];
      const req = createReq('/api/auth/providers');
      const res = createRes();
      await handler(req, res);

      expect(res.statusCode).toBe(503);
      expect(parsed(res).error).toBe('AUTH_DISABLED');
    });
  });

  describe('GET /api/auth/config/validate', () => {
    it('returns validation payload with github and entra sections', async () => {
      const handler = routes['GET /api/auth/config/validate'];
      const req = createReq('/api/auth/config/validate');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(typeof body.allConfigured).toBe('boolean');
      expect(body.github).toBeDefined();
      expect(body.entra).toBeDefined();
      expect(Array.isArray(body.github.requiredVariables)).toBe(true);
      expect(Array.isArray(body.entra.requiredVariables)).toBe(true);
    });

    it('returns providerEnabled false when auth manager is unavailable', async () => {
      const routesNoAuth = createAuthRoutes({
        _authManager: undefined,
        _authMiddleware: undefined,
      });
      const handler = routesNoAuth['GET /api/auth/config/validate'];
      const req = createReq('/api/auth/config/validate');
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.github.providerEnabled).toBe(false);
      expect(body.entra.providerEnabled).toBe(false);
    });
  });

  describe('POST /api/auth/config/env', () => {
    it('creates .env when missing and writes provided GitHub values', async () => {
      const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-env-create-'));
      const routesWithRoot = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
        PROJECT_ROOT: projectRoot,
      });

      const handler = routesWithRoot['POST /api/auth/config/env'];
      const req = createReq('/api/auth/config/env', 'POST', {
        body: {
          values: {
            GITHUB_CLIENT_ID: 'client-id-123',
            GITHUB_CLIENT_SECRET: 'secret-123',
            AUTH_CALLBACK_URL: 'http://127.0.0.1:3000',
          },
        },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.created).toBe(true);
      expect(body.updated).toEqual(
        expect.arrayContaining(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'AUTH_CALLBACK_URL'])
      );

      const envPath = path.join(projectRoot, '.env');
      expect(fs.existsSync(envPath)).toBe(true);
      const content = fs.readFileSync(envPath, 'utf8');
      expect(content).toContain('GITHUB_CLIENT_ID=client-id-123');
      expect(content).toContain('GITHUB_CLIENT_SECRET=secret-123');
      expect(content).toContain('AUTH_CALLBACK_URL=http://127.0.0.1:3000');

      fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    it('updates existing values in .env without duplicating keys', async () => {
      const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-env-update-'));
      const envPath = path.join(projectRoot, '.env');
      fs.writeFileSync(envPath, 'GITHUB_CLIENT_ID=old-id\nENTRA_TENANT_ID=common\n', 'utf8');

      const routesWithRoot = createAuthRoutes({
        _authManager: manager,
        _authMiddleware: middleware,
        PROJECT_ROOT: projectRoot,
      });

      const handler = routesWithRoot['POST /api/auth/config/env'];
      const req = createReq('/api/auth/config/env', 'POST', {
        body: {
          values: {
            GITHUB_CLIENT_ID: 'new-id',
            GITHUB_CLIENT_SECRET: 'new-secret',
          },
        },
      });
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.created).toBe(false);

      const content = fs.readFileSync(envPath, 'utf8');
      expect(content).toContain('GITHUB_CLIENT_ID=new-id');
      expect(content).toContain('GITHUB_CLIENT_SECRET=new-secret');
      expect(content).toContain('ENTRA_TENANT_ID=common');
      expect(content.match(/GITHUB_CLIENT_ID=/g)?.length).toBe(1);

      fs.rmSync(projectRoot, { recursive: true, force: true });
    });
  });

  /* ── GET /api/admin/users ────────────────────────────────────── */

  describe('GET /api/admin/users', () => {
    it('returns user list when admin', async () => {
      const admin = manager.store.upsertUser({
        githubId: 9010,
        email: 'admin@test.com',
        name: 'Admin',
        avatarUrl: '',
      });
      const session = manager.store.createSession(admin.id);

      const handler = routes['GET /api/admin/users'];
      const req = createReq('/api/admin/users', 'GET', {
        headers: { cookie: `sid=${session.id}` },
      });
      req.user = admin;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.users).toBeInstanceOf(Array);
      expect(body.users.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects non-admin users', async () => {
      // Create admin first, then viewer
      manager.store.upsertUser({ githubId: 9020, email: 'a@t.com', name: 'A', avatarUrl: '' });
      const viewer = manager.store.upsertUser({
        githubId: 9021,
        email: 'viewer@test.com',
        name: 'Viewer',
        avatarUrl: '',
      });
      const session = manager.store.createSession(viewer.id);

      const handler = routes['GET /api/admin/users'];
      const req = createReq('/api/admin/users', 'GET', {
        headers: { cookie: `sid=${session.id}` },
      });
      req.user = viewer;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  /* ── PUT /api/admin/users/:id/role ───────────────────────────── */

  describe('PUT /api/admin/users/:id/role', () => {
    it('updates user role when admin', async () => {
      const admin = manager.store.upsertUser({
        githubId: 9030,
        email: 'admin2@test.com',
        name: 'Admin2',
        avatarUrl: '',
      });
      const target = manager.store.upsertUser({
        githubId: 9031,
        email: 'target@test.com',
        name: 'Target',
        avatarUrl: '',
      });
      const session = manager.store.createSession(admin.id);

      const handler = routes['PUT /api/admin/users/:id/role'];
      const req = createReq(`/api/admin/users/${target.id}/role`, 'PUT', {
        headers: { cookie: `sid=${session.id}` },
        body: { role: 'operator' },
      });
      req.user = admin;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.role).toBe('operator');
      expect(manager.store.findUserById(target.id).role).toBe('operator');
    });

    it('returns 400 for invalid role', async () => {
      const admin = manager.store.upsertUser({
        githubId: 9040,
        email: 'admin3@test.com',
        name: 'Admin3',
        avatarUrl: '',
      });
      const session = manager.store.createSession(admin.id);

      const handler = routes['PUT /api/admin/users/:id/role'];
      const req = createReq('/api/admin/users/some-id/role', 'PUT', {
        headers: { cookie: `sid=${session.id}` },
        body: { role: 'superuser' },
      });
      req.user = admin;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(parsed(res).code).toBe('INVALID_INPUT');
    });

    it('returns 404 for non-existent user', async () => {
      const admin = manager.store.upsertUser({
        githubId: 9050,
        email: 'admin4@test.com',
        name: 'Admin4',
        avatarUrl: '',
      });
      const session = manager.store.createSession(admin.id);

      const handler = routes['PUT /api/admin/users/:id/role'];
      const req = createReq('/api/admin/users/nonexistent/role', 'PUT', {
        headers: { cookie: `sid=${session.id}` },
        body: { role: 'operator' },
      });
      req.user = admin;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
      expect(parsed(res).code).toBe('NOT_FOUND');
    });

    it('returns 400 when role is missing from body', async () => {
      const admin = manager.store.upsertUser({
        githubId: 9060,
        email: 'admin5@test.com',
        name: 'Admin5',
        avatarUrl: '',
      });
      const session = manager.store.createSession(admin.id);

      const handler = routes['PUT /api/admin/users/:id/role'];
      const req = createReq('/api/admin/users/some-user-id/role', 'PUT', {
        headers: { cookie: `sid=${session.id}` },
        body: {},
      });
      req.user = admin;
      req.session = session;
      const res = createRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  /* ── AUTH_DISABLED paths ─────────────────────────────────────── */

  describe('when auth is disabled (no authManager)', () => {
    let disabledRoutes;

    beforeEach(() => {
      disabledRoutes = createAuthRoutes({});
    });

    it('GET /api/auth/login returns 503', async () => {
      const req = createReq('/api/auth/login');
      const res = createRes();
      await disabledRoutes['GET /api/auth/login'](req, res);
      expect(res.statusCode).toBe(503);
      expect(parsed(res).error).toBe('AUTH_DISABLED');
    });

    it('GET /api/auth/callback returns 503', async () => {
      const req = createReq('/api/auth/callback');
      const res = createRes();
      await disabledRoutes['GET /api/auth/callback'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('GET /api/auth/entra/login returns 503', async () => {
      const req = createReq('/api/auth/entra/login');
      const res = createRes();
      await disabledRoutes['GET /api/auth/entra/login'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('GET /api/auth/entra/callback returns 503', async () => {
      const req = createReq('/api/auth/entra/callback');
      const res = createRes();
      await disabledRoutes['GET /api/auth/entra/callback'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('POST /api/auth/logout returns 503', async () => {
      const req = createReq('/api/auth/logout', 'POST');
      const res = createRes();
      await disabledRoutes['POST /api/auth/logout'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('GET /api/auth/me returns 503', async () => {
      const req = createReq('/api/auth/me');
      const res = createRes();
      await disabledRoutes['GET /api/auth/me'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('GET /api/admin/users returns 503', async () => {
      const req = createReq('/api/admin/users');
      const res = createRes();
      await disabledRoutes['GET /api/admin/users'](req, res);
      expect(res.statusCode).toBe(503);
    });

    it('PUT /api/admin/users/:id/role returns 503', async () => {
      const req = createReq('/api/admin/users/x/role', 'PUT');
      const res = createRes();
      await disabledRoutes['PUT /api/admin/users/:id/role'](req, res);
      expect(res.statusCode).toBe(503);
    });
  });
});

/* ── safeRedirect (internal) ──────────────────────────────────── */

describe('safeRedirect via authLogin', () => {
  let dbPath, manager, routes;

  beforeEach(() => {
    dbPath = tmpDbPath();
    manager = new AuthManager({ ...TEST_CONFIG, dbPath });
    routes = createAuthRoutes({ _authManager: manager });
  });

  afterEach(() => {
    manager.close();
    rmDir(dbPath);
  });

  it('login includes state even with no redirect param', async () => {
    const req = createReq('/api/auth/login');
    const res = createRes();
    await routes['GET /api/auth/login'](req, res);
    expect(res.statusCode).toBe(302);
    expect(res._headers['Location']).toContain('state=');
  });
});
