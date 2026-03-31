import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Auth integration tests (M29-012).
 * Tests the AuthStore (SQLite), AuthManager (session, CSRF, RBAC),
 * and createAuthMiddleware (authenticate, requireRole).
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

// Dynamic import wrapper for the TS auth module
let AuthStore,
  AuthManager,
  createAuthMiddleware,
  loadAuthConfig,
  ProviderRegistry,
  GitHubAuthProvider,
  EntraAuthProvider;

beforeAll(async () => {
  const mod = await import('../../src/webapp/auth.ts');
  AuthStore = mod.AuthStore;
  AuthManager = mod.AuthManager;
  createAuthMiddleware = mod.createAuthMiddleware;
  loadAuthConfig = mod.loadAuthConfig;
  ProviderRegistry = mod.ProviderRegistry;
  GitHubAuthProvider = mod.GitHubAuthProvider;
  EntraAuthProvider = mod.EntraAuthProvider;
});

/** Create a temporary database path that is cleaned up after each test. */
function tmpDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
  return path.join(dir, 'auth.db');
}

function rmDir(dbPath) {
  const dir = path.dirname(dbPath);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/* ── AuthStore Tests ──────────────────────────────────────────── */

describe('AuthStore', () => {
  let store;
  let dbPath;

  beforeEach(() => {
    dbPath = tmpDbPath();
    store = new AuthStore(dbPath);
  });

  afterEach(() => {
    store.close();
    rmDir(dbPath);
  });

  describe('user management', () => {
    it('upserts a new user with admin role for the first user', () => {
      const user = store.upsertUser({
        githubId: 1001,
        email: 'alice@example.com',
        name: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
      });
      expect(user).toBeDefined();
      expect(user.provider_id).toBe('1001');
      expect(user.primary_provider).toBe('github');
      expect(user.role).toBe('admin');
      expect(user.email).toBe('alice@example.com');
    });

    it('assigns viewer role to subsequent users', () => {
      store.upsertUser({ githubId: 1001, email: 'a@b.c', name: 'A', avatarUrl: '' });
      const second = store.upsertUser({ githubId: 1002, email: 'b@c.d', name: 'B', avatarUrl: '' });
      expect(second.role).toBe('viewer');
    });

    it('updates existing user on re-upsert', () => {
      store.upsertUser({ githubId: 1001, email: 'old@e.com', name: 'Old', avatarUrl: '' });
      const updated = store.upsertUser({
        githubId: 1001,
        email: 'new@e.com',
        name: 'New',
        avatarUrl: '',
      });
      expect(updated.email).toBe('new@e.com');
      expect(updated.name).toBe('New');
      expect(updated.role).toBe('admin'); // role unchanged by upsert
    });

    it('looks up user by github ID and by internal ID', () => {
      const created = store.upsertUser({
        githubId: 9999,
        email: 'x@y.z',
        name: 'X',
        avatarUrl: '',
      });
      expect(store.findUserByGithubId(9999)).toBeDefined();
      expect(store.findUserByProvider('github', '9999')).toBeDefined();
      expect(store.findUserById(created.id)).toBeDefined();
      expect(store.findUserByGithubId(0)).toBeNull();
      expect(store.findUserById('nonexistent')).toBeNull();
    });

    it('lists all users ordered by created_at', () => {
      store.upsertUser({ githubId: 1, email: 'a@b.c', name: 'A', avatarUrl: '' });
      store.upsertUser({ githubId: 2, email: 'b@c.d', name: 'B', avatarUrl: '' });
      const users = store.listUsers();
      expect(users).toHaveLength(2);
    });

    it('updates user role', () => {
      const user = store.upsertUser({ githubId: 1, email: 'a@b.c', name: 'A', avatarUrl: '' });
      expect(store.updateUserRole(user.id, 'operator')).toBe(true);
      expect(store.findUserById(user.id).role).toBe('operator');
    });

    it('returns false when updating nonexistent user role', () => {
      expect(store.updateUserRole('doesnotexist', 'admin')).toBe(false);
    });
  });

  describe('session management', () => {
    let user;

    beforeEach(() => {
      user = store.upsertUser({
        githubId: 5001,
        email: 'sess@test.com',
        name: 'SessUser',
        avatarUrl: '',
      });
    });

    it('creates a session with valid structure', () => {
      const session = store.createSession(user.id);
      expect(session.id).toHaveLength(64);
      expect(session.csrf_token).toHaveLength(64);
      expect(session.user_id).toBe(user.id);
      expect(new Date(session.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('finds active session by ID', () => {
      const session = store.createSession(user.id);
      const found = store.findSession(session.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(session.id);
    });

    it('returns null for expired sessions', () => {
      // Create a valid session first, then check it can be found
      const session = store.createSession(user.id, 60000);
      expect(store.findSession(session.id)).not.toBeNull();

      // Now expire it by touching with negative TTL
      store.touchSession(session.id, -2000);
      expect(store.findSession(session.id)).toBeNull();
    });

    it('destroys a session', () => {
      const session = store.createSession(user.id);
      store.destroySession(session.id);
      expect(store.findSession(session.id)).toBeNull();
    });

    it('destroys all user sessions', () => {
      store.createSession(user.id);
      store.createSession(user.id);
      store.destroyUserSessions(user.id);
      // All sessions should be gone (we can just try creating and finding)
    });

    it('touches session to extend it', () => {
      const session = store.createSession(user.id, 1000);
      const originalExpiry = session.expires_at;
      store.touchSession(session.id, 86400000); // extend to 24h
      const refreshed = store.findSession(session.id);
      expect(new Date(refreshed.expires_at).getTime()).toBeGreaterThan(
        new Date(originalExpiry).getTime()
      );
    });

    it('cleans expired sessions', () => {
      const s1 = store.createSession(user.id, 60000);
      const s2 = store.createSession(user.id, 60000);
      // Expire both
      store.touchSession(s1.id, -2000);
      store.touchSession(s2.id, -2000);
      const cleaned = store.cleanExpired();
      expect(cleaned).toBe(2);
    });
  });
});

/* ── AuthManager Tests ────────────────────────────────────────── */

describe('AuthManager', () => {
  let manager;
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'http://localhost:3000/api/auth/callback',
    stateSecret: crypto.randomBytes(32).toString('hex'),
    sessionTtlMs: 3600000,
    secureCookies: false,
  };

  beforeEach(() => {
    config.dbPath = tmpDbPath();
    manager = new AuthManager(config);
  });

  afterEach(() => {
    const dbPath = config.dbPath;
    manager.close();
    rmDir(dbPath);
  });

  it('generates a GitHub login URL with state parameter', () => {
    const url = manager.getLoginUrl();
    expect(url).toContain('https://github.com/login/oauth/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('state=');
  });

  it('registers and resolves providers through ProviderRegistry', () => {
    const registry = new ProviderRegistry();
    const provider = new GitHubAuthProvider(config);
    registry.registerProvider('github', provider);
    expect(registry.getProvider('github')).toBe(provider);
    expect(registry.getProvider('entra')).toBeNull();
  });

  it('registers Entra provider when ENTRA_CLIENT_ID is configured', () => {
    const entraManager = new AuthManager({
      ...config,
      dbPath: tmpDbPath(),
      entraClientId: 'entra-client',
      entraTenantId: 'common',
      entraCallbackUrl: 'http://localhost:3000/api/auth/entra/callback',
    });

    try {
      const provider = entraManager.getProvider('entra');
      expect(provider).toBeInstanceOf(EntraAuthProvider);

      const entraLoginUrl = entraManager.getLoginUrlForProvider('entra', '/dashboard');
      expect(entraLoginUrl).toContain('login.microsoftonline.com');
      expect(entraLoginUrl).toContain('code_challenge_method=S256');
      expect(entraLoginUrl).toContain('client_id=entra-client');
    } finally {
      const pathToDelete = entraManager.config.dbPath;
      entraManager.close();
      rmDir(pathToDelete);
    }
  });

  describe('EntraAuthProvider claims extraction (#868)', () => {
    let entraManager;
    let entraProvider;

    beforeEach(() => {
      entraManager = new AuthManager({
        ...config,
        dbPath: tmpDbPath(),
        entraClientId: 'entra-client',
        entraTenantId: 'test-tenant',
        entraClientSecret: 'entra-secret',
        entraCallbackUrl: 'http://localhost:3000/api/auth/entra/callback',
      });
      entraProvider = entraManager.getProvider('entra');
    });

    afterEach(() => {
      const pathToDelete = entraManager.config.dbPath;
      entraManager.close();
      rmDir(pathToDelete);
    });

    function makeUnsignedJwt(payload) {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${header}.${body}.`;
    }

    async function authenticateWithClaims(claims) {
      const loginUrl = entraProvider.getLoginUrl('/dashboard');
      const stateParam = new URL(loginUrl).searchParams.get('state');
      const origFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('/oauth2/v2.0/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'entra-at',
              refresh_token: 'entra-rt',
              expires_in: 3600,
              id_token: makeUnsignedJwt(claims),
            }),
          };
        }
        return origFetch(url);
      };
      try {
        return await entraProvider.authenticate('mock-code', stateParam);
      } finally {
        globalThis.fetch = origFetch;
      }
    }

    it('extracts oid → providerId and tid → tenantId from id_token', async () => {
      const result = await authenticateWithClaims({
        oid: 'entra-obj-id-001',
        tid: 'a1b2c3d4-0000-0000-0000-000000000001',
        preferred_username: 'alice@contoso.com',
        name: 'Alice',
        email: 'alice@contoso.com',
      });

      expect(result.provider).toBe('entra');
      expect(result.providerId).toBe('entra-obj-id-001');
      expect(result.tenantId).toBe('a1b2c3d4-0000-0000-0000-000000000001');
      expect(result.username).toBe('alice@contoso.com');
    });

    it('uses upn claim as provider_username when preferred_username is absent (v1.0 token)', async () => {
      const result = await authenticateWithClaims({
        oid: 'entra-obj-id-002',
        tid: 'a1b2c3d4-0000-0000-0000-000000000002',
        upn: 'bob@contoso.com',
        name: 'Bob',
      });

      expect(result.username).toBe('bob@contoso.com');
    });

    it('persists tenant_id and provider_username (UPN) in linked_accounts', async () => {
      const providerUser = await authenticateWithClaims({
        oid: 'entra-obj-id-003',
        tid: 'tenant-persist-001',
        preferred_username: 'carol@contoso.com',
        name: 'Carol',
        email: 'carol@contoso.com',
      });

      const user = entraManager.store.upsertUser({
        provider: providerUser.provider,
        providerId: providerUser.providerId,
        providerUsername: providerUser.username,
        email: providerUser.email,
        name: providerUser.name,
        avatarUrl: providerUser.avatarUrl,
        tokenPair: providerUser.tokenPair,
        tenantId: providerUser.tenantId,
      });

      const entraAccount = user.linked_accounts.find((a) => a.provider === 'entra');
      expect(entraAccount).not.toBeNull();
      expect(entraAccount.provider_id).toBe('entra-obj-id-003');
      expect(entraAccount.tenant_id).toBe('tenant-persist-001');
      expect(entraAccount.provider_username).toBe('carol@contoso.com');
    });

    it('extracts groups claim from Entra id_token', async () => {
      const result = await authenticateWithClaims({
        oid: 'entra-obj-id-004',
        tid: 'tenant-groups-001',
        preferred_username: 'dana@contoso.com',
        groups: ['group-admin', 'group-ops'],
      });

      expect(result.groups).toEqual(['group-admin', 'group-ops']);
    });
  });

  it('generates login URL with redirect_to encoded in state', () => {
    const url = manager.getLoginUrl('/dashboard');
    expect(url).toContain('state=');
  });

  it('verifies a valid state parameter', () => {
    // Generate state indirectly via login URL
    const url = manager.getLoginUrl();
    const stateParam = new URL(url).searchParams.get('state');
    const result = manager.verifyState(stateParam);
    expect(result.valid).toBe(true);
  });

  it('rejects a tampered state parameter', () => {
    const result = manager.verifyState('tampered.nonce.badsig');
    expect(result.valid).toBe(false);
  });

  describe('session management', () => {
    let userId;

    beforeEach(() => {
      const user = manager.store.upsertUser({
        githubId: 3001,
        email: 'mgr@test.com',
        name: 'MgrUser',
        avatarUrl: '',
      });
      userId = user.id;
    });

    it('creates a session and retrieves user', () => {
      const session = manager.createSession(userId);
      expect(session).toBeDefined();
      const user = manager.getUserForSession(session);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('retrieves session from request cookies', () => {
      const session = manager.createSession(userId);
      // Mock IncomingMessage with cookie header
      const mockReq = {
        headers: { cookie: `sid=${session.primary_provider}.${session.id}` },
      };
      const found = manager.getSessionFromRequest(mockReq);
      expect(found).toBeDefined();
      expect(found.id).toBe(session.id);
    });

    it('rejects mismatched provider in session cookie', () => {
      const session = manager.createSession(userId, 'github');
      const mockReq = {
        headers: { cookie: `sid=entra.${session.id}` },
      };
      expect(manager.getSessionFromRequest(mockReq)).toBeNull();
    });

    it('returns null for missing session cookie', () => {
      const mockReq = { headers: {} };
      expect(manager.getSessionFromRequest(mockReq)).toBeNull();
    });

    it('returns null for invalid session ID format', () => {
      const mockReq = { headers: { cookie: 'sid=not-hex' } };
      expect(manager.getSessionFromRequest(mockReq)).toBeNull();
    });

    it('destroys a session', () => {
      const session = manager.createSession(userId);
      manager.destroySession(session.id);
      const mockReq = { headers: { cookie: `sid=${session.id}` } };
      expect(manager.getSessionFromRequest(mockReq)).toBeNull();
    });
  });

  describe('CSRF validation (M29-013)', () => {
    let session;

    beforeEach(() => {
      const user = manager.store.upsertUser({
        githubId: 4001,
        email: 'csrf@test.com',
        name: 'CsrfUser',
        avatarUrl: '',
      });
      session = manager.createSession(user.id);
    });

    it('validates correct CSRF token', () => {
      const mockReq = { headers: { 'x-csrf-token': session.csrf_token } };
      expect(manager.validateCsrf(mockReq, session)).toBe(true);
    });

    it('rejects missing CSRF header', () => {
      const mockReq = { headers: {} };
      expect(manager.validateCsrf(mockReq, session)).toBe(false);
    });

    it('rejects wrong CSRF token', () => {
      const mockReq = { headers: { 'x-csrf-token': 'wrong-token-value' } };
      expect(manager.validateCsrf(mockReq, session)).toBe(false);
    });
  });

  describe('RBAC (M29-008)', () => {
    it('admin has all roles', () => {
      expect(AuthManager.hasRole('admin', 'viewer')).toBe(true);
      expect(AuthManager.hasRole('admin', 'operator')).toBe(true);
      expect(AuthManager.hasRole('admin', 'admin')).toBe(true);
    });

    it('operator has viewer and operator roles', () => {
      expect(AuthManager.hasRole('operator', 'viewer')).toBe(true);
      expect(AuthManager.hasRole('operator', 'operator')).toBe(true);
      expect(AuthManager.hasRole('operator', 'admin')).toBe(false);
    });

    it('viewer has only viewer role', () => {
      expect(AuthManager.hasRole('viewer', 'viewer')).toBe(true);
      expect(AuthManager.hasRole('viewer', 'operator')).toBe(false);
      expect(AuthManager.hasRole('viewer', 'admin')).toBe(false);
    });
  });

  describe('user management', () => {
    it('lists users', () => {
      manager.store.upsertUser({ githubId: 1, email: 'a@b.c', name: 'A', avatarUrl: '' });
      manager.store.upsertUser({ githubId: 2, email: 'b@c.d', name: 'B', avatarUrl: '' });
      expect(manager.listUsers()).toHaveLength(2);
    });

    it('updates user role', () => {
      const user = manager.store.upsertUser({
        githubId: 1,
        email: 'a@b.c',
        name: 'A',
        avatarUrl: '',
      });
      expect(manager.updateUserRole(user.id, 'operator')).toBe(true);
    });
  });
});

/* ── createAuthMiddleware Tests ───────────────────────────────── */

describe('createAuthMiddleware', () => {
  let manager;
  let middleware;
  const logs = [];

  const config = {
    clientId: 'mw-client-id',
    clientSecret: 'mw-client-secret',
    callbackUrl: 'http://localhost:3000/api/auth/callback',
    stateSecret: crypto.randomBytes(32).toString('hex'),
    sessionTtlMs: 3600000,
    secureCookies: false,
  };

  function mockRes() {
    const headers = {};
    return {
      statusCode: 200,
      writeHead: vi.fn((code) => {
        headers._statusCode = code;
      }),
      end: vi.fn(),
      setHeader: vi.fn((k, v) => {
        headers[k] = v;
      }),
      getHeader: vi.fn((k) => headers[k]),
      _headers: headers,
    };
  }

  beforeEach(() => {
    config.dbPath = tmpDbPath();
    manager = new AuthManager(config);
    logs.length = 0;
    middleware = createAuthMiddleware({
      authManager: manager,
      log: (level, msg, fields) => logs.push({ level, msg, fields }),
    });
  });

  afterEach(() => {
    const dbPath = config.dbPath;
    manager.close();
    rmDir(dbPath);
  });

  it('allows public paths without authentication', async () => {
    const req = { headers: {}, method: 'GET' };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/health');
    expect(result).toBe(true);
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  it('allows /api/auth/login without authentication', async () => {
    const req = { headers: {}, method: 'GET' };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/auth/login');
    expect(result).toBe(true);
  });

  it('rejects unauthenticated requests to protected paths', async () => {
    const req = { headers: {}, method: 'GET' };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/sessions');
    expect(result).toBe(false);
    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('allows authenticated GET request', async () => {
    const user = manager.store.upsertUser({
      githubId: 7001,
      email: 'mw@test.com',
      name: 'MwUser',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    const req = {
      headers: { cookie: `sid=${session.id}` },
      method: 'GET',
    };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/sessions');
    expect(result).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(user.id);
  });

  it('rejects POST without CSRF token', async () => {
    const user = manager.store.upsertUser({
      githubId: 7002,
      email: 'mw2@test.com',
      name: 'MwUser2',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    const req = {
      headers: { cookie: `sid=${session.id}` },
      method: 'POST',
    };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/commands');
    expect(result).toBe(false);
    expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
  });

  it('allows POST with valid CSRF token', async () => {
    const user = manager.store.upsertUser({
      githubId: 7003,
      email: 'mw3@test.com',
      name: 'MwUser3',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    const req = {
      headers: {
        cookie: `sid=${session.id}`,
        'x-csrf-token': session.csrf_token,
      },
      method: 'POST',
    };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/commands');
    expect(result).toBe(true);
  });

  describe('requireRole', () => {
    let adminUser, operatorUser, viewerUser;

    beforeEach(() => {
      adminUser = manager.store.upsertUser({
        githubId: 8001,
        email: 'admin@test.com',
        name: 'Admin',
        avatarUrl: '',
      });
      // First user is auto-admin
      operatorUser = manager.store.upsertUser({
        githubId: 8002,
        email: 'op@test.com',
        name: 'Operator',
        avatarUrl: '',
      });
      manager.store.updateUserRole(operatorUser.id, 'operator');
      operatorUser = manager.store.findUserById(operatorUser.id);

      viewerUser = manager.store.upsertUser({
        githubId: 8003,
        email: 'viewer@test.com',
        name: 'Viewer',
        avatarUrl: '',
      });
    });

    it('admin passes admin role check', () => {
      const req = { user: adminUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'admin')).toBe(true);
    });

    it('operator passes operator role check', () => {
      const req = { user: operatorUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'operator')).toBe(true);
    });

    it('viewer fails operator role check', () => {
      const req = { user: viewerUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'operator')).toBe(false);
      expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
    });

    it('viewer fails admin role check', () => {
      const req = { user: viewerUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'admin')).toBe(false);
    });

    it('operator fails admin role check', () => {
      const req = { user: operatorUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'admin')).toBe(false);
    });

    it('admin passes all role checks', () => {
      const req = { user: adminUser };
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'viewer')).toBe(true);
      expect(middleware.requireRole(req, res, 'operator')).toBe(true);
      expect(middleware.requireRole(req, res, 'admin')).toBe(true);
    });

    it('rejects when user is not set on request', () => {
      const req = {};
      const res = mockRes();
      expect(middleware.requireRole(req, res, 'viewer')).toBe(false);
      expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
    });
  });
});

/* ── loadAuthConfig Tests ─────────────────────────────────────── */

describe('loadAuthConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when GITHUB_CLIENT_ID is missing', () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.ENTRA_CLIENT_ID;
    delete process.env.ENTRA_TENANT_ID;
    expect(loadAuthConfig()).toBeNull();
  });

  it('returns config when both client ID and secret are set', () => {
    process.env.GITHUB_CLIENT_ID = 'test-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-secret';
    const config = loadAuthConfig();
    expect(config).not.toBeNull();
    expect(config.clientId).toBe('test-id');
    expect(config.clientSecret).toBe('test-secret');
    expect(config.callbackUrl).toContain('/api/auth/callback');
  });

  it('uses AUTH_CALLBACK_URL when provided', () => {
    process.env.GITHUB_CLIENT_ID = 'test-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-secret';
    process.env.AUTH_CALLBACK_URL = 'https://example.com';
    const config = loadAuthConfig();
    expect(config.callbackUrl).toBe('https://example.com/api/auth/callback');
  });

  it('uses AUTH_STATE_SECRET when provided', () => {
    process.env.GITHUB_CLIENT_ID = 'test-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-secret';
    process.env.AUTH_STATE_SECRET = 'my-secret';
    const config = loadAuthConfig();
    expect(config.stateSecret).toBe('my-secret');
  });

  it('sets secureCookies from env', () => {
    process.env.GITHUB_CLIENT_ID = 'test-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-secret';
    process.env.AUTH_SECURE_COOKIES = 'true';
    const config = loadAuthConfig();
    expect(config.secureCookies).toBe(true);
  });

  it('returns config when ENTRA_CLIENT_ID is set without GitHub credentials', () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    process.env.ENTRA_CLIENT_ID = 'entra-client-id';
    process.env.ENTRA_TENANT_ID = 'tenant-id';

    const config = loadAuthConfig();
    expect(config).not.toBeNull();
    expect(config.entraClientId).toBe('entra-client-id');
    expect(config.entraTenantId).toBe('tenant-id');
    expect(config.entraCallbackUrl).toContain('/api/auth/entra/callback');
  });

  it('uses ENTRA_REDIRECT_URI when set, overriding the derived entraCallbackUrl', () => {
    process.env.ENTRA_CLIENT_ID = 'entra-id';
    process.env.ENTRA_TENANT_ID = 'common';
    process.env.AUTH_CALLBACK_URL = 'https://app.example.com';
    process.env.ENTRA_REDIRECT_URI = 'https://custom.example.com/auth/entra/cb';

    const config = loadAuthConfig();
    expect(config.entraCallbackUrl).toBe('https://custom.example.com/auth/entra/cb');
  });

  it('disables Entra provider when ENTRA_CLIENT_ID is not set', () => {
    process.env.GITHUB_CLIENT_ID = 'gh-id';
    process.env.GITHUB_CLIENT_SECRET = 'gh-secret';
    delete process.env.ENTRA_CLIENT_ID;

    const config = loadAuthConfig();
    expect(config).not.toBeNull();
    expect(config.entraClientId).toBeFalsy();

    const manager = new AuthManager({ ...config, dbPath: tmpDbPath() });
    try {
      expect(manager.getProvider('entra')).toBeNull();
    } finally {
      const p = manager.config.dbPath;
      manager.close();
      rmDir(p);
    }
  });

  it('parses ENTRA_ADMIN_GROUP_ID as comma-separated group IDs', () => {
    process.env.ENTRA_CLIENT_ID = 'entra-client-id';
    process.env.ENTRA_ADMIN_GROUP_ID = 'group-a, group-b ,group-c';

    const config = loadAuthConfig();
    expect(config.entraAdminGroupIds).toEqual(['group-a', 'group-b', 'group-c']);
  });
});

/* ── Additional AuthManager Coverage ──────────────────────────── */

describe('AuthManager extra coverage', () => {
  const stateSecret = crypto.randomBytes(32).toString('hex');
  const config = {
    clientId: 'cov-id',
    clientSecret: 'cov-secret',
    callbackUrl: 'http://localhost:3000/api/auth/callback',
    stateSecret,
    secureCookies: false,
    enabled: true,
  };
  let manager, dbPath;

  beforeEach(() => {
    dbPath = tmpDbPath();
    manager = new AuthManager({ ...config, dbPath });
  });

  afterEach(() => {
    manager.close();
    rmDir(dbPath);
  });

  it('setSessionCookie sets sid and csrf cookies', () => {
    const user = manager.store.upsertUser({
      githubId: 50001,
      email: 'cookie@test.com',
      name: 'Cookie',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    let lastSetCookie = [];
    const res = {
      setHeader: (k, v) => {
        if (k === 'Set-Cookie') lastSetCookie = Array.isArray(v) ? v : [v];
      },
      getHeader: (k) => {
        if (k === 'Set-Cookie') return lastSetCookie;
        return undefined;
      },
    };
    manager.setSessionCookie(res, session);
    expect(lastSetCookie.length).toBeGreaterThanOrEqual(2);
    expect(lastSetCookie.some((c) => c.startsWith('sid='))).toBe(true);
    expect(lastSetCookie.some((c) => c.startsWith('csrf='))).toBe(true);
  });

  it('clearSessionCookies clears both cookies', () => {
    let lastSetCookie = [];
    const res = {
      setHeader: (k, v) => {
        if (k === 'Set-Cookie') lastSetCookie = Array.isArray(v) ? v : [v];
      },
      getHeader: (k) => {
        if (k === 'Set-Cookie') return lastSetCookie;
        return undefined;
      },
    };
    manager.clearSessionCookies(res);
    expect(lastSetCookie.some((c) => c.includes('sid='))).toBe(true);
    expect(lastSetCookie.some((c) => c.includes('Max-Age=0'))).toBe(true);
  });

  it('getLoginUrl returns GitHub OAuth URL', () => {
    const url = manager.getLoginUrl('/dashboard');
    expect(url).toContain('github.com/login/oauth/authorize');
    expect(url).toContain('client_id=cov-id');
    expect(url).toContain('state=');
  });

  it('getUserForSession returns null for non-existent user', () => {
    const user = manager.store.upsertUser({
      githubId: 50002,
      email: 'ghost2@test.com',
      name: 'Ghost2',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    manager.store._db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    expect(manager.getUserForSession(session)).toBeNull();
  });

  it('getSessionFromRequest returns null for malformed session IDs', () => {
    const req = { headers: { cookie: 'sid=not-hex-64' } };
    expect(manager.getSessionFromRequest(req)).toBeNull();
  });

  it('getSessionFromRequest returns null when no cookie', () => {
    const req = { headers: {} };
    expect(manager.getSessionFromRequest(req)).toBeNull();
  });

  it('exchangeCode throws on network error', async () => {
    // exchangeCode calls fetch — without mocking, GitHub will reject/fail
    await expect(manager.exchangeCode('invalid-code')).rejects.toThrow();
  });

  it('listUsers returns all users', () => {
    manager.store.upsertUser({ githubId: 50010, email: 'a@t.com', name: 'A', avatarUrl: '' });
    manager.store.upsertUser({ githubId: 50011, email: 'b@t.com', name: 'B', avatarUrl: '' });
    const users = manager.listUsers();
    expect(users.length).toBe(2);
  });

  it('updateUserRole returns false for non-existent user', () => {
    expect(manager.updateUserRole('nonexistent', 'admin')).toBe(false);
  });
});

/* ── Middleware audit logging coverage ────────────────────────── */

describe('createAuthMiddleware with audit', () => {
  const stateSecret = crypto.randomBytes(32).toString('hex');
  const config = {
    clientId: 'audit-id',
    clientSecret: 'audit-secret',
    callbackUrl: 'http://localhost:3000/api/auth/callback',
    stateSecret,
    secureCookies: false,
    enabled: true,
  };
  let manager, dbPath, middleware, auditLog;

  function mockRes() {
    const headers = {};
    return {
      writeHead: vi.fn((code, h) => {
        if (h) Object.assign(headers, h);
      }),
      end: vi.fn(),
      setHeader: vi.fn((k, v) => {
        headers[k] = v;
      }),
      getHeader: vi.fn((k) => headers[k]),
      _headers: headers,
    };
  }

  beforeEach(() => {
    dbPath = tmpDbPath();
    manager = new AuthManager({ ...config, dbPath });
    auditLog = [];
    middleware = createAuthMiddleware({
      authManager: manager,
      log: () => {},
      audit: { log: (meta) => auditLog.push(meta) },
    });
  });

  afterEach(() => {
    manager.close();
    rmDir(dbPath);
  });

  it('requireRole with audit logs access_denied', () => {
    manager.store.upsertUser({
      githubId: 60001,
      email: 'v-audit@test.com',
      name: 'Viewer',
      avatarUrl: '',
    });
    // Ensure viewer has viewer role (not first user admin)
    manager.store.upsertUser({ githubId: 60000, email: 'x@t.com', name: 'X', avatarUrl: '' });
    const viewer2 = manager.store.upsertUser({
      githubId: 60002,
      email: 'v2@test.com',
      name: 'V2',
      avatarUrl: '',
    });
    const req = { user: viewer2 };
    const res = mockRes();
    const result = middleware.requireRole(req, res, 'admin', '/api/admin/users');
    expect(result).toBe(false);
    expect(auditLog.length).toBe(1);
    expect(auditLog[0].operation).toBe('access_denied');
  });

  it('authenticate invalidates session with deleted user', async () => {
    const user = manager.store.upsertUser({
      githubId: 60010,
      email: 'del@test.com',
      name: 'Del',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);
    manager.store._db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const req = {
      headers: { cookie: `sid=${session.id}` },
      method: 'GET',
    };
    const res = mockRes();
    const result = await middleware.authenticate(req, res, '/api/sessions');
    expect(result).toBe(false);
    expect(res.writeHead).toHaveBeenCalledWith(401, expect.any(Object));
  });

  it('authenticate skips CSRF for HEAD and OPTIONS methods', async () => {
    const user = manager.store.upsertUser({
      githubId: 60020,
      email: 'head@test.com',
      name: 'Head',
      avatarUrl: '',
    });
    const session = manager.createSession(user.id);

    for (const method of ['HEAD', 'OPTIONS']) {
      const req = {
        headers: { cookie: `sid=${session.id}` },
        method,
      };
      const res = mockRes();
      const result = await middleware.authenticate(req, res, '/api/sessions');
      expect(result).toBe(true);
    }
  });
});
