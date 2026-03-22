// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Redis Session Store (M33-004) ────────────────────────────── *
 * Provides a Redis-backed session store for horizontal scaling.   *
 * Sessions are stored as JSON with Redis TTL for automatic expiry.*
 * Implements the same CRUD contract as AuthStore's session methods.*
 * ─────────────────────────────────────────────────────────────── */

import crypto from 'crypto';
import type Redis from 'ioredis';
import type { Session } from './auth';

const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user-sessions:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RedisSessionStore {
  createSession(userId: string, ttlMs?: number): Promise<Session>;
  findSession(id: string): Promise<Session | null>;
  touchSession(id: string, ttlMs?: number): Promise<void>;
  destroySession(id: string): Promise<void>;
  destroyUserSessions(userId: string): Promise<void>;
  cleanExpired(): Promise<number>;
}

/**
 * Create a Redis-backed session store.
 *
 * Sessions are stored as `session:<id>` keys with a JSON value.
 * A secondary set `user-sessions:<userId>` tracks session IDs per user.
 * Redis TTL handles automatic expiry.
 */
export function createRedisSessionStore(redis: Redis): RedisSessionStore {
  async function createSession(userId: string, ttlMs?: number): Promise<Session> {
    const id = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const ttl = ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(now.getTime() + ttl);

    const session: Session = {
      id,
      user_id: userId,
      primary_provider: 'github',
      csrf_token: csrfToken,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_active: now.toISOString(),
    };

    const ttlSeconds = Math.ceil(ttl / 1000);
    await redis.setex(SESSION_PREFIX + id, ttlSeconds, JSON.stringify(session));
    await redis.sadd(USER_SESSIONS_PREFIX + userId, id);

    return session;
  }

  async function findSession(id: string): Promise<Session | null> {
    const raw = await redis.get(SESSION_PREFIX + id);
    if (!raw) return null;

    const session: Session = JSON.parse(raw);

    // Double-check expiry (belt-and-suspenders with Redis TTL)
    if (new Date(session.expires_at) <= new Date()) {
      await redis.del(SESSION_PREFIX + id);
      return null;
    }

    return session;
  }

  async function touchSession(id: string, ttlMs?: number): Promise<void> {
    const raw = await redis.get(SESSION_PREFIX + id);
    if (!raw) return;

    const session: Session = JSON.parse(raw);
    const ttl = ttlMs ?? DEFAULT_TTL_MS;
    const ttlSeconds = Math.ceil(ttl / 1000);

    session.last_active = new Date().toISOString();
    session.expires_at = new Date(Date.now() + ttl).toISOString();

    await redis.setex(SESSION_PREFIX + id, ttlSeconds, JSON.stringify(session));
  }

  async function destroySession(id: string): Promise<void> {
    const raw = await redis.get(SESSION_PREFIX + id);
    if (raw) {
      const session: Session = JSON.parse(raw);
      await redis.srem(USER_SESSIONS_PREFIX + session.user_id, id);
    }
    await redis.del(SESSION_PREFIX + id);
  }

  async function destroyUserSessions(userId: string): Promise<void> {
    const sessionIds = await redis.smembers(USER_SESSIONS_PREFIX + userId);
    if (sessionIds.length > 0) {
      await redis.del(...sessionIds.map((sid) => SESSION_PREFIX + sid));
    }
    await redis.del(USER_SESSIONS_PREFIX + userId);
  }

  async function cleanExpired(): Promise<number> {
    // Redis TTL handles expiry automatically. This is a no-op.
    // Returns 0 as Redis has already cleaned expired keys.
    return 0;
  }

  return {
    createSession,
    findSession,
    touchSession,
    destroySession,
    destroyUserSessions,
    cleanExpired,
  };
}
