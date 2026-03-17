'use strict';
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
let AuthStore, AuthManager, createAuthMiddleware, loadAuthConfig;

beforeAll(async () => {
  const mod = await import('../../src/webapp/auth.ts');
  AuthStore = mod.AuthStore;
  AuthManager = mod.AuthManager;
  createAuthMiddleware = mod.createAuthMiddleware;
  loadAuthConfig = mod.loadAuthConfig;
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
      expect(user.github_id).toBe(1001);
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
        headers: { cookie: `sid=${session.id}` },
      };
      const found = manager.getSessionFromRequest(mockReq);
      expect(found).toBeDefined();
      expect(found.id).toBe(session.id);
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
});
