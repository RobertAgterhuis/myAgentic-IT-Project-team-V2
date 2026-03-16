// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * In-memory rate limiter with periodic pruning.
 * @module rate-limiter
 */

export interface RateLimiterOptions {
  /** Time window in milliseconds (default: 60000). */
  windowMs?: number;
  /** Maximum requests per window (default: 30). */
  maxRequests?: number;
  /** Interval for pruning stale entries (default: same as windowMs). */
  pruneIntervalMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  reset: number;
}

export interface RateLimiter {
  /** Check if request from this IP is allowed. */
  check(ip: string): RateLimitResult;
  /** Stop the prune timer and clear all entries. */
  destroy(): void;
  /** Visible for testing only. */
  readonly _map: Map<string, RateLimitEntry>;
}

export function createRateLimiter(options?: RateLimiterOptions): RateLimiter {
  const windowMs = options?.windowMs ?? 60_000;
  const maxRequests = options?.maxRequests ?? 30;
  const pruneIntervalMs = options?.pruneIntervalMs ?? windowMs;

  const map = new Map<string, RateLimitEntry>();

  const pruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of map) {
      if (now > entry.reset) map.delete(ip);
    }
  }, pruneIntervalMs);
  pruneTimer.unref();

  function check(ip: string): RateLimitResult {
    const now = Date.now();
    let entry = map.get(ip);
    if (!entry || now > entry.reset) {
      entry = { count: 1, reset: now + windowMs };
      map.set(ip, entry);
      return { allowed: true };
    }
    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);
      return { allowed: false, retryAfter };
    }
    return { allowed: true };
  }

  function destroy(): void {
    clearInterval(pruneTimer);
    map.clear();
  }

  return { check, destroy, _map: map };
}
