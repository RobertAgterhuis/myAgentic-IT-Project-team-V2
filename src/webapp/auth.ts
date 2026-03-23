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

export type IdentityProvider = 'github' | 'entra' | string;

export interface TokenPair {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
}

export interface ProviderUser {
  provider: IdentityProvider;
  providerId: string;
  username: string;
  email: string;
  name: string;
  avatarUrl: string;
  tokenPair?: TokenPair | null;
  tenantId?: string | null;
  groups?: string[];
}

export interface IAuthProvider {
  readonly provider: IdentityProvider;
  authenticate(code: string, state: string): Promise<ProviderUser>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  revokeToken(accessToken: string): Promise<void>;
  getLoginUrl?(redirectTo?: string): string;
}

export interface LinkedAccount {
  provider: IdentityProvider;
  provider_id: string;
  provider_username: string;
  token_expires_at: string | null;
  tenant_id: string | null;
  scopes: string[];
}

export interface LinkedAccountTokenRecord extends LinkedAccount {
  access_token: string | null;
  refresh_token: string | null;
}

export interface User {
  id: string;
  provider_id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: Role;
  primary_provider: IdentityProvider;
  linked_accounts: LinkedAccount[];
  created_at: string;
  last_login: string;
}

export interface Session {
  id: string;
  user_id: string;
  primary_provider: IdentityProvider;
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
  /** Optional Entra OIDC client ID */
  entraClientId?: string;
  /** Optional Entra tenant ID (defaults to 'common') */
  entraTenantId?: string;
  /** Optional Entra client secret for confidential clients */
  entraClientSecret?: string;
  /** Optional Entra callback URL; defaults to /api/auth/entra/callback on base URL */
  entraCallbackUrl?: string;
  /** Optional Entra authority host (defaults to login.microsoftonline.com) */
  entraAuthorityHost?: string;
  /** Optional Entra scopes */
  entraScopes?: string[];
  /** Optional Entra group IDs mapped to admin role */
  entraAdminGroupIds?: string[];
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
const DEFAULT_PROVIDER: IdentityProvider = 'github';
const ENTRA_STATE_PREFIX = 'entra:';

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
        provider_account_id TEXT UNIQUE,
        email TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        avatar_url TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','operator','viewer')),
        primary_provider TEXT NOT NULL DEFAULT 'github',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS linked_accounts (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        provider_username TEXT NOT NULL DEFAULT '',
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TEXT,
        tenant_id TEXT,
        scopes TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, provider)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        primary_provider TEXT NOT NULL DEFAULT 'github',
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        last_active TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_linked_accounts_provider ON linked_accounts(provider, provider_id);
    `);

    const userColumns = new Set(
      (this._db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map(
        (column) => column.name
      )
    );
    if (!userColumns.has('provider_account_id')) {
      this._db.exec('ALTER TABLE users ADD COLUMN provider_account_id TEXT');
    }
    if (!userColumns.has('primary_provider')) {
      this._db.exec("ALTER TABLE users ADD COLUMN primary_provider TEXT NOT NULL DEFAULT 'github'");
    }
    if (userColumns.has('github_id')) {
      this._db.exec(
        "UPDATE users SET provider_account_id = COALESCE(provider_account_id, CAST(github_id AS TEXT)), primary_provider = COALESCE(primary_provider, 'github') WHERE github_id IS NOT NULL"
      );
    }

    const sessionColumns = new Set(
      (this._db.prepare('PRAGMA table_info(sessions)').all() as Array<{ name: string }>).map(
        (column) => column.name
      )
    );
    if (!sessionColumns.has('primary_provider')) {
      this._db.exec(
        "ALTER TABLE sessions ADD COLUMN primary_provider TEXT NOT NULL DEFAULT 'github'"
      );
    }

    if (userColumns.has('github_id')) {
      this._db.exec(`
        INSERT OR IGNORE INTO linked_accounts (
          user_id,
          provider,
          provider_id,
          provider_username,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          tenant_id,
          scopes
        )
        SELECT
          id,
          'github',
          CAST(github_id AS TEXT),
          '',
          NULL,
          NULL,
          NULL,
          NULL,
          '[]'
        FROM users
        WHERE provider_account_id IS NOT NULL
      `);
    }
  }

  private _listLinkedAccounts(userId: string): LinkedAccount[] {
    const rows = this._db
      .prepare(
        `SELECT provider, provider_id, provider_username, token_expires_at, tenant_id, scopes
         FROM linked_accounts WHERE user_id = ? ORDER BY provider`
      )
      .all(userId) as Array<{
      provider: string;
      provider_id: string;
      provider_username: string;
      token_expires_at: string | null;
      tenant_id: string | null;
      scopes: string;
    }>;

    return rows.map((row) => ({
      provider: row.provider,
      provider_id: row.provider_id,
      provider_username: row.provider_username,
      token_expires_at: row.token_expires_at,
      tenant_id: row.tenant_id,
      scopes: JSON.parse(row.scopes || '[]'),
    }));
  }

  private _getLinkedAccountTokens(
    userId: string,
    provider: IdentityProvider
  ): LinkedAccountTokenRecord | null {
    const row = this._db
      .prepare(
        `SELECT provider, provider_id, provider_username, token_expires_at, tenant_id, scopes,
                access_token_encrypted, refresh_token_encrypted
         FROM linked_accounts
         WHERE user_id = ? AND provider = ?`
      )
      .get(userId, provider) as
      | {
          provider: string;
          provider_id: string;
          provider_username: string;
          token_expires_at: string | null;
          tenant_id: string | null;
          scopes: string;
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
        }
      | undefined;

    if (!row) return null;

    return {
      provider: row.provider,
      provider_id: row.provider_id,
      provider_username: row.provider_username,
      token_expires_at: row.token_expires_at,
      tenant_id: row.tenant_id,
      scopes: JSON.parse(row.scopes || '[]'),
      access_token: _decryptToken(row.access_token_encrypted),
      refresh_token: _decryptToken(row.refresh_token_encrypted),
    };
  }

  private _mapUser(
    row: Omit<User, 'linked_accounts' | 'provider_id' | 'primary_provider'> & {
      provider_account_id?: string | null;
      primary_provider?: string | null;
    }
  ): User {
    return {
      id: row.id,
      provider_id: row.provider_account_id || '',
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      role: row.role,
      primary_provider: row.primary_provider || DEFAULT_PROVIDER,
      linked_accounts: this._listLinkedAccounts(row.id),
      created_at: row.created_at,
      last_login: row.last_login,
    };
  }

  private _upsertLinkedAccount(data: {
    userId: string;
    provider: IdentityProvider;
    providerId: string;
    providerUsername: string;
    tokenPair?: TokenPair | null;
    tenantId?: string | null;
  }): void {
    this._db
      .prepare(
        `INSERT INTO linked_accounts (
          user_id,
          provider,
          provider_id,
          provider_username,
          access_token_encrypted,
          refresh_token_encrypted,
          token_expires_at,
          tenant_id,
          scopes,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, provider) DO UPDATE SET
          provider_id = excluded.provider_id,
          provider_username = excluded.provider_username,
          access_token_encrypted = excluded.access_token_encrypted,
          refresh_token_encrypted = excluded.refresh_token_encrypted,
          token_expires_at = excluded.token_expires_at,
          tenant_id = excluded.tenant_id,
          scopes = excluded.scopes,
          updated_at = datetime('now')`
      )
      .run(
        data.userId,
        data.provider,
        data.providerId,
        data.providerUsername,
        encryptToken(data.tokenPair?.accessToken),
        encryptToken(data.tokenPair?.refreshToken),
        data.tokenPair?.expiresAt || null,
        data.tenantId || null,
        JSON.stringify(data.tokenPair?.scopes || [])
      );
  }

  /* ── User CRUD ──────────────────────────────────────────────── */

  findUserByProvider(provider: IdentityProvider, providerId: string): User | null {
    const row = this._db
      .prepare(
        `SELECT u.*
         FROM users u
         INNER JOIN linked_accounts la ON la.user_id = u.id
         WHERE la.provider = ? AND la.provider_id = ?`
      )
      .get(provider, providerId) as
      | ({
          id: string;
          provider_account_id?: string | null;
          email: string;
          name: string;
          avatar_url: string;
          role: Role;
          primary_provider?: string | null;
          created_at: string;
          last_login: string;
        } & Record<string, unknown>)
      | undefined;

    return row ? this._mapUser(row) : null;
  }

  findUserByGithubId(githubId: number): User | null {
    return this.findUserByProvider('github', String(githubId));
  }

  findUserById(id: string): User | null {
    const row = this._db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? this._mapUser(row as Parameters<AuthStore['_mapUser']>[0]) : null;
  }

  hasLinkedProvider(userId: string, provider: IdentityProvider): boolean {
    const row = this._db
      .prepare(
        'SELECT 1 as present FROM linked_accounts WHERE user_id = ? AND provider = ? LIMIT 1'
      )
      .get(userId, provider) as { present: number } | undefined;
    return Boolean(row?.present);
  }

  getLinkedAccountTokens(
    userId: string,
    provider: IdentityProvider
  ): LinkedAccountTokenRecord | null {
    return this._getLinkedAccountTokens(userId, provider);
  }

  linkProviderAccount(data: {
    userId: string;
    provider: IdentityProvider;
    providerId: string;
    providerUsername?: string;
    tokenPair?: TokenPair | null;
    tenantId?: string | null;
  }): User {
    const user = this.findUserById(data.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (this.hasLinkedProvider(data.userId, data.provider)) {
      throw new Error('PROVIDER_ALREADY_LINKED');
    }

    const existingByProvider = this.findUserByProvider(data.provider, data.providerId);
    if (existingByProvider && existingByProvider.id !== data.userId) {
      throw new Error('PROVIDER_ALREADY_LINKED_TO_OTHER_USER');
    }

    this._upsertLinkedAccount({
      userId: data.userId,
      provider: data.provider,
      providerId: data.providerId,
      providerUsername: data.providerUsername || '',
      tokenPair: data.tokenPair,
      tenantId: data.tenantId,
    });

    return this.findUserById(data.userId)!;
  }

  upsertUser(data: {
    githubId?: number;
    provider?: IdentityProvider;
    providerId?: string;
    providerUsername?: string;
    email: string;
    name: string;
    avatarUrl: string;
    tokenPair?: TokenPair | null;
    tenantId?: string | null;
  }): User {
    const provider = data.provider || DEFAULT_PROVIDER;
    const providerId = data.providerId || String(data.githubId);
    const providerUsername = data.providerUsername || '';
    const existing = this.findUserByProvider(provider, providerId);
    if (existing) {
      this._db
        .prepare(
          `UPDATE users SET
             email = ?,
             name = ?,
             avatar_url = ?,
             provider_account_id = ?,
             primary_provider = ?,
             last_login = datetime('now')
           WHERE id = ?`
        )
        .run(data.email, data.name, data.avatarUrl, providerId, provider, existing.id);
      this._upsertLinkedAccount({
        userId: existing.id,
        provider,
        providerId,
        providerUsername,
        tokenPair: data.tokenPair,
        tenantId: data.tenantId,
      });
      return this.findUserById(existing.id)!;
    }
    const id = crypto.randomUUID();
    // First user gets admin role (bootstrap)
    const userCount = (
      this._db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
    ).cnt;
    const role: Role = userCount === 0 ? 'admin' : 'viewer';
    this._db
      .prepare(
        `INSERT INTO users (id, provider_account_id, email, name, avatar_url, role, primary_provider)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, providerId, data.email, data.name, data.avatarUrl, role, provider);
    this._upsertLinkedAccount({
      userId: id,
      provider,
      providerId,
      providerUsername,
      tokenPair: data.tokenPair,
      tenantId: data.tenantId,
    });
    return this.findUserById(id)!;
  }

  listUsers(): User[] {
    const rows = this._db.prepare('SELECT * FROM users ORDER BY created_at').all() as Array<
      Parameters<AuthStore['_mapUser']>[0]
    >;
    return rows.map((row) => this._mapUser(row));
  }

  updateUserRole(userId: string, role: Role): boolean {
    const result = this._db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    return result.changes > 0;
  }

  /* ── Session CRUD ───────────────────────────────────────────── */

  createSession(
    userId: string,
    primaryProviderOrTtl?: IdentityProvider | number,
    ttlMs?: number
  ): Session {
    const id = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const primaryProvider =
      typeof primaryProviderOrTtl === 'string' ? primaryProviderOrTtl : DEFAULT_PROVIDER;
    const effectiveTtl =
      typeof primaryProviderOrTtl === 'number' ? primaryProviderOrTtl : ttlMs || SESSION_TTL_MS;
    const expiresAt = new Date(now.getTime() + effectiveTtl);
    const expiresStr = toSqliteDatetime(expiresAt);
    this._db
      .prepare(
        `INSERT INTO sessions (id, user_id, primary_provider, csrf_token, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, userId, primaryProvider, csrfToken, expiresStr);
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

function encodeSessionCookieValue(session: Session): string {
  return `${session.primary_provider}.${session.id}`;
}

function decodeSessionCookieValue(
  value: string
): { provider: IdentityProvider; sessionId: string } | null {
  if (/^[a-f0-9]{64}$/.test(value)) {
    return { provider: DEFAULT_PROVIDER, sessionId: value };
  }

  const match = /^([a-z0-9_-]+)\.([a-f0-9]{64})$/i.exec(value);
  if (!match) {
    return null;
  }

  return {
    provider: match[1].toLowerCase(),
    sessionId: match[2],
  };
}

function getTokenEncryptionKeys(): Buffer[] {
  const raw = process.env.AUTH_TOKEN_ENCRYPTION_KEYS || process.env.AUTH_TOKEN_ENCRYPTION_KEY || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (/^[a-f0-9]{64}$/i.test(entry)) {
        return Buffer.from(entry, 'hex');
      }
      return Buffer.from(entry, 'base64');
    })
    .filter((key) => key.length === 32);
}

function encryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const [key] = getTokenEncryptionKeys();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function _decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const payload = Buffer.from(value, 'base64');
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);

  for (const key of getTokenEncryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      continue;
    }
  }

  return null;
}

export class ProviderRegistry {
  private readonly _providers = new Map<IdentityProvider, IAuthProvider>();

  registerProvider(provider: IdentityProvider, implementation: IAuthProvider): void {
    this._providers.set(provider, implementation);
  }

  getProvider(provider: IdentityProvider): IAuthProvider | null {
    return this._providers.get(provider) || null;
  }
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

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function createPkceVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function createPkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function createEntraState(secret: string, codeVerifier: string, redirectTo?: string): string {
  const payload = toBase64Url(
    JSON.stringify({
      codeVerifier,
      redirectTo: redirectTo || '/',
    })
  );
  return createOAuthState(secret, `${ENTRA_STATE_PREFIX}${payload}`);
}

function verifyEntraState(
  secret: string,
  state: string
): { valid: boolean; redirectTo?: string; codeVerifier?: string } {
  const verified = verifyOAuthState(secret, state);
  if (!verified.valid || !verified.redirectTo?.startsWith(ENTRA_STATE_PREFIX)) {
    return { valid: false };
  }

  const encoded = verified.redirectTo.slice(ENTRA_STATE_PREFIX.length);
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as {
      codeVerifier?: string;
      redirectTo?: string;
    };
    if (!parsed.codeVerifier) {
      return { valid: false };
    }
    return {
      valid: true,
      codeVerifier: parsed.codeVerifier,
      redirectTo: parsed.redirectTo || '/',
    };
  } catch {
    return { valid: false };
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const segments = token.split('.');
  if (segments.length < 2) {
    throw new Error('Invalid JWT token');
  }

  const payload = fromBase64Url(segments[1]);
  return JSON.parse(payload) as Record<string, unknown>;
}

export class GitHubAuthProvider implements IAuthProvider {
  readonly provider: IdentityProvider = 'github';
  private readonly _config: AuthConfig;

  constructor(config: AuthConfig) {
    this._config = config;
  }

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

  async authenticate(code: string, _state: string): Promise<ProviderUser> {
    const tokenPair = await this.exchangeCode(code);
    const user = await this.fetchUser(tokenPair.accessToken);
    return {
      provider: this.provider,
      providerId: String(user.id),
      username: user.login,
      email: user.email,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      tokenPair,
    };
  }

  async refreshToken(_refreshToken: string): Promise<TokenPair> {
    throw new Error('GitHub refresh token flow is not implemented');
  }

  async revokeToken(_accessToken: string): Promise<void> {
    return;
  }

  async exchangeCode(code: string): Promise<TokenPair> {
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
    const data = (await resp.json()) as { access_token?: string; error?: string; scope?: string };
    if (data.error || !data.access_token) {
      throw new Error(`GitHub OAuth error: ${data.error || 'no access_token'}`);
    }
    return {
      accessToken: data.access_token,
      scopes: data.scope
        ? data.scope
            .split(',')
            .map((scope) => scope.trim())
            .filter(Boolean)
        : [],
    };
  }

  async fetchUser(accessToken: string): Promise<{
    id: number;
    email: string;
    name: string | null;
    avatar_url: string;
    login: string;
  }> {
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
        const primary = emails.find((entry) => entry.primary && entry.verified);
        email = primary?.email || emails[0]?.email || '';
      }
    }

    return {
      id: user.id,
      email,
      name: user.name,
      avatar_url: user.avatar_url,
      login: user.login,
    };
  }
}

export class EntraAuthProvider implements IAuthProvider {
  readonly provider: IdentityProvider = 'entra';
  private readonly _config: AuthConfig;

  constructor(config: AuthConfig) {
    this._config = config;
  }

  getLoginUrl(redirectTo?: string): string {
    if (!this._config.entraClientId) {
      throw new Error('Entra auth is not configured');
    }

    const verifier = createPkceVerifier();
    const challenge = createPkceChallenge(verifier);
    const state = createEntraState(this._config.stateSecret, verifier, redirectTo);
    const tenant = this._config.entraTenantId || 'common';
    const authority = (
      this._config.entraAuthorityHost || 'https://login.microsoftonline.com'
    ).replace(/\/$/, '');

    const params = new URLSearchParams({
      client_id: this._config.entraClientId,
      response_type: 'code',
      redirect_uri: this._config.entraCallbackUrl || '',
      response_mode: 'query',
      scope: (this._config.entraScopes || ['openid', 'profile', 'email', 'offline_access']).join(
        ' '
      ),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    return `${authority}/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async authenticate(code: string, state: string): Promise<ProviderUser> {
    const stateData = verifyEntraState(this._config.stateSecret, state);
    if (!stateData.valid || !stateData.codeVerifier) {
      throw new Error('Invalid Entra auth state');
    }

    const tokenPair = await this.exchangeCode(code, stateData.codeVerifier);
    const claims = tokenPair.idToken ? decodeJwtPayload(tokenPair.idToken) : {};

    const providerId =
      (typeof claims.oid === 'string' && claims.oid) ||
      (typeof claims.sub === 'string' && claims.sub) ||
      crypto.randomUUID();
    // preferred_username is the UPN in v2.0 tokens; fall back to the explicit upn
    // claim (v1.0 tokens) before trying email or the object ID.
    const username =
      (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
      (typeof claims.upn === 'string' && claims.upn) ||
      (typeof claims.email === 'string' && claims.email) ||
      providerId;
    const name =
      (typeof claims.name === 'string' && claims.name) ||
      (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
      username;
    const groups = Array.isArray(claims.groups)
      ? claims.groups.filter((entry): entry is string => typeof entry === 'string')
      : [];

    return {
      provider: this.provider,
      providerId,
      username,
      email:
        (typeof claims.email === 'string' && claims.email) ||
        (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
        '',
      name,
      avatarUrl: '',
      tokenPair,
      tenantId: typeof claims.tid === 'string' ? claims.tid : null,
      groups,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    if (!this._config.entraClientId) {
      throw new Error('Entra auth is not configured');
    }

    const tenant = this._config.entraTenantId || 'common';
    const authority = (
      this._config.entraAuthorityHost || 'https://login.microsoftonline.com'
    ).replace(/\/$/, '');
    const tokenUrl = `${authority}/${tenant}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this._config.entraClientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: (this._config.entraScopes || ['openid', 'profile', 'email', 'offline_access']).join(
        ' '
      ),
    });

    if (this._config.entraClientSecret) {
      body.set('client_secret', this._config.entraClientSecret);
    }

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!resp.ok) {
      throw new Error(`Entra refresh token failed: ${resp.status}`);
    }

    const data = (await resp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!data.access_token) {
      throw new Error('Entra refresh token response missing access_token');
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      scopes: data.scope
        ? data.scope
            .split(' ')
            .map((scope) => scope.trim())
            .filter(Boolean)
        : this._config.entraScopes,
    };
  }

  async revokeToken(_accessToken: string): Promise<void> {
    return;
  }

  private async exchangeCode(
    code: string,
    codeVerifier: string
  ): Promise<TokenPair & { idToken?: string }> {
    if (!this._config.entraClientId) {
      throw new Error('Entra auth is not configured');
    }

    const tenant = this._config.entraTenantId || 'common';
    const authority = (
      this._config.entraAuthorityHost || 'https://login.microsoftonline.com'
    ).replace(/\/$/, '');
    const tokenUrl = `${authority}/${tenant}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this._config.entraClientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this._config.entraCallbackUrl || '',
      code_verifier: codeVerifier,
      scope: (this._config.entraScopes || ['openid', 'profile', 'email', 'offline_access']).join(
        ' '
      ),
    });

    if (this._config.entraClientSecret) {
      body.set('client_secret', this._config.entraClientSecret);
    }

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!resp.ok) {
      throw new Error(`Entra token exchange failed: ${resp.status}`);
    }

    const data = (await resp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      throw new Error(
        `Entra OAuth error: ${data.error_description || data.error || 'no access_token'}`
      );
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt,
      scopes: data.scope
        ? data.scope
            .split(' ')
            .map((scope) => scope.trim())
            .filter(Boolean)
        : this._config.entraScopes,
      idToken: data.id_token,
    };
  }
}

/* ── Auth Manager ─────────────────────────────────────────────── */

export class AuthManager {
  private _store: AuthStore;
  private _config: AuthConfig;
  private _sessionTtlMs: number;
  private _providers: ProviderRegistry;

  constructor(config: AuthConfig) {
    this._config = config;
    this._sessionTtlMs = config.sessionTtlMs || SESSION_TTL_MS;
    const dbPath = config.dbPath || path.join(process.cwd(), '.agentic', 'auth.db');
    this._store = new AuthStore(dbPath);
    this._providers = new ProviderRegistry();

    if (config.clientId && config.clientSecret) {
      this.registerProvider(DEFAULT_PROVIDER, new GitHubAuthProvider(config));
    }
    if (config.entraClientId) {
      this.registerProvider('entra', new EntraAuthProvider(config));
    }

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

  registerProvider(provider: IdentityProvider, implementation: IAuthProvider): void {
    this._providers.registerProvider(provider, implementation);
  }

  getProvider(provider: IdentityProvider): IAuthProvider | null {
    return this._providers.getProvider(provider);
  }

  /* ── OAuth Flow ─────────────────────────────────────────────── */

  getLoginUrl(redirectTo?: string): string {
    return this.getLoginUrlForProvider(DEFAULT_PROVIDER, redirectTo);
  }

  getLoginUrlForProvider(provider: IdentityProvider, redirectTo?: string): string {
    const implementation = this.getProvider(provider);
    if (!implementation?.getLoginUrl) {
      throw new Error(`Auth provider not available: ${provider}`);
    }
    return implementation.getLoginUrl(redirectTo);
  }

  async authenticateProvider(
    provider: IdentityProvider,
    code: string,
    state: string
  ): Promise<ProviderUser> {
    const implementation = this.getProvider(provider);
    if (!implementation) {
      throw new Error(`Auth provider not available: ${provider}`);
    }
    return implementation.authenticate(code, state);
  }

  async exchangeCode(code: string): Promise<string> {
    const provider = this.getProvider(DEFAULT_PROVIDER);
    if (!(provider instanceof GitHubAuthProvider)) {
      throw new Error(`Auth provider not available: ${DEFAULT_PROVIDER}`);
    }
    const tokenPair = await provider.exchangeCode(code);
    return tokenPair.accessToken;
  }

  async fetchGitHubUser(
    accessToken: string
  ): Promise<{ id: number; email: string; name: string; avatar_url: string; login: string }> {
    const provider = this.getProvider(DEFAULT_PROVIDER);
    if (!(provider instanceof GitHubAuthProvider)) {
      throw new Error(`Auth provider not available: ${DEFAULT_PROVIDER}`);
    }
    const user = await provider.fetchUser(accessToken);
    return {
      id: user.id,
      email: user.email,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      login: user.login,
    };
  }

  verifyState(state: string): { valid: boolean; redirectTo?: string } {
    return this.verifyProviderState(DEFAULT_PROVIDER, state);
  }

  verifyProviderState(
    provider: IdentityProvider,
    state: string
  ): { valid: boolean; redirectTo?: string } {
    if (provider === 'entra') {
      const result = verifyEntraState(this._config.stateSecret, state);
      return {
        valid: result.valid,
        redirectTo: result.redirectTo,
      };
    }
    return verifyOAuthState(this._config.stateSecret, state);
  }

  /* ── Session Management ─────────────────────────────────────── */

  createSession(userId: string, primaryProvider?: IdentityProvider): Session {
    const provider =
      primaryProvider || this._store.findUserById(userId)?.primary_provider || DEFAULT_PROVIDER;
    return this._store.createSession(userId, provider, this._sessionTtlMs);
  }

  getSessionFromRequest(req: IncomingMessage): Session | null {
    const cookies = parseCookies(req);
    const sid = cookies[SESSION_COOKIE];
    if (!sid) return null;
    const parsed = decodeSessionCookieValue(sid);
    if (!parsed) return null;
    const session = this._store.findSession(parsed.sessionId);
    if (!session || session.primary_provider !== parsed.provider) return null;
    return session;
  }

  getUserForSession(session: Session): User | null {
    const user = this._store.findUserById(session.user_id);
    if (!user || user.primary_provider !== session.primary_provider) {
      return null;
    }
    return user;
  }

  setSessionCookie(res: ServerResponse, session: Session): void {
    const maxAge = Math.floor(this._sessionTtlMs / 1000);
    setCookie(res, SESSION_COOKIE, encodeSessionCookieValue(session), {
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

  const PUBLIC_PATHS = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/callback',
    '/api/auth/entra/login',
    '/api/auth/entra/callback',
    '/api/auth/logout',
    '/api/auth/providers',
  ];

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
  const entraClientId = process.env.ENTRA_CLIENT_ID;
  const entraTenantId = process.env.ENTRA_TENANT_ID;
  const entraClientSecret = process.env.ENTRA_CLIENT_SECRET;
  const entraAdminGroupIds = (process.env.ENTRA_ADMIN_GROUP_ID || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const hasGitHub = Boolean(clientId && clientSecret);
  const hasEntra = Boolean(entraClientId);
  if (!hasGitHub && !hasEntra) return null;

  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.PORT || '3000';
  const baseUrl = process.env.AUTH_CALLBACK_URL || `http://${host}:${port}`;
  const callbackUrl = `${baseUrl}/api/auth/callback`;
  // ENTRA_REDIRECT_URI takes precedence; fall back to the derived base URL path.
  const entraCallbackUrl = process.env.ENTRA_REDIRECT_URI || `${baseUrl}/api/auth/entra/callback`;
  const entraAuthorityHost = process.env.ENTRA_AUTHORITY_HOST || undefined;
  const stateSecret = process.env.AUTH_STATE_SECRET || crypto.randomBytes(32).toString('hex');
  const secureCookies = process.env.AUTH_SECURE_COOKIES === 'true';

  return {
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    callbackUrl,
    entraClientId,
    entraTenantId,
    entraClientSecret,
    entraAdminGroupIds,
    entraCallbackUrl,
    entraAuthorityHost,
    stateSecret,
    secureCookies,
    enabled: true,
  };
}
