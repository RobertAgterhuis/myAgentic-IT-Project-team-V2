// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';

const _writeLocks = new Map<string, Promise<unknown>>();
const LOCK_TIMEOUT_MS = 30_000;

/**
 * Execute a function under a per-path write lock to prevent concurrent writes.
 * Locks are chained — if a lock is already held, the function waits for it.
 * Shared across server.ts and mcp-server.ts so both coordinate on the same locks.
 */
async function withFileLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const key = path.resolve(filePath);
  const prev = _writeLocks.get(key) || Promise.resolve();
  let resolve!: (value?: unknown) => void;
  const current = new Promise((r) => {
    resolve = r;
  });
  _writeLocks.set(key, current);

  // Race the previous lock against a timeout to avoid permanent hangs
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`File lock timeout after ${LOCK_TIMEOUT_MS}ms for ${key}`)),
      LOCK_TIMEOUT_MS
    )
  );
  try {
    await Promise.race([prev, timeout]);
  } catch (err) {
    // Evict the stale predecessor so future callers don't wait on it
    if (_writeLocks.get(key) !== current) _writeLocks.set(key, current);
    throw err;
  }

  try {
    return await fn();
  } finally {
    if (_writeLocks.get(key) === current) _writeLocks.delete(key);
    resolve();
  }
}

export { withFileLock, _writeLocks, LOCK_TIMEOUT_MS };
