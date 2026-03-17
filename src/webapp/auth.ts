// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Authentication & RBAC Module (M29) ───────────────────────── *
 * Provides: user model, session store, CSRF tokens, OAuth 2.0     *
 * login flow (GitHub), cookie management, and RBAC middleware.     *
 * All backed by SQLite via better-sqlite3.                         *
 * ─────────────────────────────────────────────────────────────── */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { IncomingMessage, ServerResponse } from 'http';

/* ── Types ────────────────────────────────────────────────────── */

export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  github_id: number;
  email: string;
  name: string;
  avatar_url: string;
  role: Role;
  created_at: string;
  last_login: string;
}

export interface Session {
  id: string;
  user_id: string;
  csrf_token: string;
  created_at: string;
  expires_at: string;
  last_active: string;
}

export interface AuthConfig {
  /** GitHub OAuth client ID */
  clientId: string;
  /** GitHub OAuth client secret */
  clientSecret: string;
  /** Full callback URL, e.g. http://localhost:3000/api/auth/callback */
  callbackUrl: string;
  /** HMAC secret for OAuth state parameter */
  stateSecret: string;
  /** Session TTL in milliseconds (default: 24h) */
  sessionTtlMs?: number;
  /** Path to auth SQLite database */
  dbPath?: string;
  /** Whether auth is enabled (default: true) */
  enabled?: boolean;
  /** Secure cookie flag (default: false for localhost dev) */
  secureCookies?: boolean;
}

/* ── Constants ────────────────────────────────────────────────── */

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE = 'sid';
const CSRF_COOKIE = 'csrf';
const CSRF_HEADER = 'x-csrf-token';
const ROLE_HIERARCHY: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes for OAuth state

/** Format Date to SQLite-compatible datetime string (YYYY-MM-DD HH:MM:SS). */
function toSqliteDatetime(d: Date): string {
  return d
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/* ── AuthStore (SQLite) ───────────────────────────────────────── */

export class AuthStore {
  private _db: DatabaseType;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this._db = new Database(dbPath);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._migrate();
  }

  private _migrate(): void {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        github_id INTEGER UNIQUE NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','operator','viewer')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        last_active TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);
  }

  /* ── User CRUD ──────────────────────────────────────────────── */

  findUserByGithubId(githubId: number): User | null {
    const row = this._db.prepare('SELECT * FROM users WHERE github_id = ?').get(githubId);
    return (row as User) || null;
  }

  findUserById(id: string): User | null {
    const row = this._db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return (row as User) || null;
  }

  upsertUser(data: { githubId: number; email: string; name: string; avatarUrl: string }): User {
    const existing = this.findUserByGithubId(data.githubId);
    if (existing) {
      this._db
        .prepare(
          `UPDATE users SET email = ?, name = ?, avatar_url = ?, last_login = datetime('now')
           WHERE github_id = ?`
        )
        .run(data.email, data.name, data.avatarUrl, data.githubId);
      return this.findUserByGithubId(data.githubId)!;
    }
    const id = crypto.randomUUID();
    // First user gets admin role (bootstrap)
    const userCount = (
      this._db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
    ).cnt;
    const role: Role = userCount === 0 ? 'admin' : 'viewer';
    this._db
      .prepare(
        `INSERT INTO users (id, github_id, email, name, avatar_url, role)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.githubId, data.email, data.name, data.avatarUrl, role);
    return this.findUserById(id)!;
  }

  listUsers(): User[] {
    return this._db.prepare('SELECT * FROM users ORDER BY created_at').all() as User[];
  }

  updateUserRole(userId: string, role: Role): boolean {
    const result = this._db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    return result.changes > 0;
  }

  /* ── Session CRUD ───────────────────────────────────────────── */

  createSession(userId: string, ttlMs?: number): Session {
    const id = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlMs || SESSION_TTL_MS));
    const expiresStr = toSqliteDatetime(expiresAt);
    this._db
      .prepare(
        `INSERT INTO sessions (id, user_id, csrf_token, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(id, userId, csrfToken, expiresStr);
    return this.findSession(id)!;
  }

  findSession(id: string): Session | null {
    const row = this._db
      .prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')")
      .get(id);
    return (row as Session) || null;
  }

  touchSession(id: string, ttlMs?: number): void {
    const expiresAt = new Date(Date.now() + (ttlMs || SESSION_TTL_MS));
    const expiresStr = toSqliteDatetime(expiresAt);
    this._db
      .prepare("UPDATE sessions SET last_active = datetime('now'), expires_at = ? WHERE id = ?")
      .run(expiresStr, id);
  }

  destroySession(id: string): void {
    this._db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  destroyUserSessions(userId: string): void {
    this._db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  cleanExpired(): number {
    const result = this._db
      .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
      .run();
    return result.changes;
  }

  close(): void {
    this._db.close();
  }
}

/* ── Cookie Helpers (M29-004, M29-014) ────────────────────────── */

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

function setCookie(
  res: ServerResponse,
  name: string,
  value: string,
  opts: { maxAge?: number; httpOnly?: boolean; secure?: boolean; path?: string } = {}
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push('SameSite=Strict');
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  // Append to existing Set-Cookie headers
  const existing = res.getHeader('Set-Cookie');
  const arr = existing
    ? Array.isArray(existing)
      ? [...existing, parts.join('; ')]
      : [existing as string, parts.join('; ')]
    : [parts.join('; ')];
  res.setHeader('Set-Cookie', arr);
}

function clearCookie(res: ServerResponse, name: string, secure?: boolean): void {
  setCookie(res, name, '', { maxAge: 0, httpOnly: true, secure });
}

/* ── OAuth State Helpers ──────────────────────────────────────── */

function createOAuthState(secret: string, redirectTo?: string): string {
  const ts = Date.now().toString(36);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = redirectTo ? `${ts}.${nonce}.${redirectTo}` : `${ts}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyOAuthState(secret: string, state: string): { valid: boolean; redirectTo?: string } {
  const parts = state.split('.');
  if (parts.length < 3) return { valid: false };
  const sig = parts.pop()!;
  const payload = parts.join('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }
  // Check timestamp (first segment is base36)
  const ts = parseInt(parts[0], 36);
  if (Date.now() - ts > STATE_TTL_MS) return { valid: false };
  // Third part is optional redirectTo
  const redirectTo = parts.length >= 3 ? parts.slice(2).join('.') : undefined;
  return { valid: true, redirectTo };
}

/* ── Auth Manager ─────────────────────────────────────────────── */

export class AuthManager {
  private _store: AuthStore;
  private _config: AuthConfig;
  private _sessionTtlMs: number;

  constructor(config: AuthConfig) {
    this._config = config;
    this._sessionTtlMs = config.sessionTtlMs || SESSION_TTL_MS;
    const dbPath = config.dbPath || path.join(process.cwd(), '.agentic', 'auth.db');
    this._store = new AuthStore(dbPath);

    // Periodic expired-session cleanup every 10 minutes
    const cleanupTimer = setInterval(() => this._store.cleanExpired(), 10 * 60 * 1000);
    cleanupTimer.unref();
  }

  get store(): AuthStore {
    return this._store;
  }

  get config(): AuthConfig {
    return this._config;
  }

  /* ── OAuth Flow ─────────────────────────────────────────────── */

  getLoginUrl(redirectTo?: string): string {
    const state = createOAuthState(this._config.stateSecret, redirectTo);
    const params = new URLSearchParams({
      client_id: this._config.clientId,
      redirect_uri: this._config.callbackUrl,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<string> {
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this._config.clientId,
        client_secret: this._config.clientSecret,
        code,
        redirect_uri: this._config.callbackUrl,
      }),
    });
    if (!resp.ok) throw new Error(`GitHub token exchange failed: ${resp.status}`);
    const data = (await resp.json()) as { access_token?: string; error?: string };
    if (data.error || !data.access_token) {
      throw new Error(`GitHub OAuth error: ${data.error || 'no access_token'}`);
    }
    return data.access_token;
  }

  async fetchGitHubUser(
    accessToken: string
  ): Promise<{ id: number; email: string; name: string; avatar_url: string; login: string }> {
    const resp = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Agentic-SDLC-Platform',
      },
    });
    if (!resp.ok) throw new Error(`GitHub user fetch failed: ${resp.status}`);
    const user = (await resp.json()) as {
      id: number;
      email: string | null;
      name: string | null;
      avatar_url: string;
      login: string;
    };

    // If email is not public, fetch from /user/emails
    let email = user.email || '';
    if (!email) {
      const emailResp = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Agentic-SDLC-Platform',
        },
      });
      if (emailResp.ok) {
        const emails = (await emailResp.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email || '';
      }
    }

    return {
      id: user.id,
      email,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      login: user.login,
    };
  }

  verifyState(state: string): { valid: boolean; redirectTo?: string } {
    return verifyOAuthState(this._config.stateSecret, state);
  }

  /* ── Session Management ─────────────────────────────────────── */

  createSession(userId: string): Session {
    return this._store.createSession(userId, this._sessionTtlMs);
  }

  getSessionFromRequest(req: IncomingMessage): Session | null {
    const cookies = parseCookies(req);
    const sid = cookies[SESSION_COOKIE];
    if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
    return this._store.findSession(sid);
  }

  getUserForSession(session: Session): User | null {
    return this._store.findUserById(session.user_id);
  }

  setSessionCookie(res: ServerResponse, session: Session): void {
    const maxAge = Math.floor(this._sessionTtlMs / 1000);
    setCookie(res, SESSION_COOKIE, session.id, {
      maxAge,
      httpOnly: true,
      secure: this._config.secureCookies,
    });
    // CSRF double-submit cookie (readable by JS)
    setCookie(res, CSRF_COOKIE, session.csrf_token, {
      maxAge,
      httpOnly: false,
      secure: this._config.secureCookies,
    });
  }

  clearSessionCookies(res: ServerResponse): void {
    clearCookie(res, SESSION_COOKIE, this._config.secureCookies);
    clearCookie(res, CSRF_COOKIE, this._config.secureCookies);
  }

  touchSession(sessionId: string): void {
    this._store.touchSession(sessionId, this._sessionTtlMs);
  }

  destroySession(sessionId: string): void {
    this._store.destroySession(sessionId);
  }

  /* ── CSRF Validation (M29-013) ──────────────────────────────── */

  validateCsrf(req: IncomingMessage, session: Session): boolean {
    const headerToken = req.headers[CSRF_HEADER] as string | undefined;
    if (!headerToken || !session.csrf_token) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(headerToken, 'utf8'),
        Buffer.from(session.csrf_token, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /* ── RBAC (M29-008) ────────────────────────────────────────── */

  static hasRole(userRole: Role, requiredRole: Role): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  }

  /* ── Admin operations ───────────────────────────────────────── */

  listUsers(): User[] {
    return this._store.listUsers();
  }

  updateUserRole(userId: string, role: Role): boolean {
    return this._store.updateUserRole(userId, role);
  }

  close(): void {
    this._store.close();
  }
}

/* ── Middleware Factory (M29-008, M29-005) ────────────────────── */

export interface AuthMiddlewareOptions {
  authManager: AuthManager;
  /** Structured log function */
  log: (level: string, message: string, fields?: Record<string, unknown>) => void;
  /** Audit trail logger */
  audit?: { log(meta: AuditMeta): void };
}

export interface AuthenticatedRequest extends IncomingMessage {
  user?: User;
  session?: Session;
}

/**
 * Returns an `authenticate` function that validates the session cookie
 * and attaches `req.user` + `req.session`. Returns false if auth failed
 * (response already sent).
 */
export function createAuthMiddleware(opts: AuthMiddlewareOptions) {
  const { authManager, log, audit } = opts;

  const PUBLIC_PATHS = ['/api/health', '/api/auth/login', '/api/auth/callback', '/api/auth/logout'];

  function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }

  /** Check auth. Returns true if request should proceed, false if denied (response sent). */
  async function authenticate(
    req: AuthenticatedRequest,
    res: ServerResponse,
    pathname: string
  ): Promise<boolean> {
    if (isPublicPath(pathname)) return true;

    const session = authManager.getSessionFromRequest(req);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }));
      return false;
    }

    const user = authManager.getUserForSession(session);
    if (!user) {
      authManager.destroySession(session.id);
      authManager.clearSessionCookies(res);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Session invalid' }));
      return false;
    }

    // CSRF check for state-changing methods (M29-013)
    const method = req.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (!authManager.validateCsrf(req, session)) {
        log('warn', 'csrf_validation_failed', { user: user.id, path: pathname });
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CSRF_INVALID', message: 'CSRF token invalid' }));
        return false;
      }
    }

    // Attach to request
    req.user = user;
    req.session = session;

    // Sliding session renewal
    authManager.touchSession(session.id);

    return true;
  }

  /** RBAC check — call AFTER authenticate(). Returns true if allowed. */
  function requireRole(
    req: AuthenticatedRequest,
    res: ServerResponse,
    requiredRole: Role,
    pathname?: string
  ): boolean {
    const user = req.user;
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }));
      return false;
    }
    if (!AuthManager.hasRole(user.role, requiredRole)) {
      log('warn', 'access_denied', {
        user: user.id,
        role: user.role,
        requiredRole,
        path: pathname,
      });
      audit?.log({
        operation: 'access_denied',
        entityType: 'rbac',
        entityId: null,
        user: user.email || user.id,
        summary: `Access denied: ${user.role} < ${requiredRole} for ${pathname || 'unknown'}`,
      });
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'FORBIDDEN', message: 'Insufficient permissions' }));
      return false;
    }
    return true;
  }

  return { authenticate, requireRole, isPublicPath };
}

/* ── Config Helpers ───────────────────────────────────────────── */

export function loadAuthConfig(): AuthConfig | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.PORT || '3000';
  const baseUrl = process.env.AUTH_CALLBACK_URL || `http://${host}:${port}`;
  const callbackUrl = `${baseUrl}/api/auth/callback`;
  const stateSecret = process.env.AUTH_STATE_SECRET || crypto.randomBytes(32).toString('hex');
  const secureCookies = process.env.AUTH_SECURE_COOKIES === 'true';

  return {
    clientId,
    clientSecret,
    callbackUrl,
    stateSecret,
    secureCookies,
    enabled: true,
  };
}
