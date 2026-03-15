'use strict';

const path = require('node:path');

const _writeLocks = new Map();
const LOCK_TIMEOUT_MS = 30_000;

/**
 * Execute a function under a per-path write lock to prevent concurrent writes.
 * Locks are chained — if a lock is already held, the function waits for it.
 * Shared across server.js and mcp-server.js so both coordinate on the same locks.
 * @param {string} filePath - Path used as the lock key.
 * @param {function(): (Promise<*>|*)} fn - Function to execute under the lock (sync or async).
 * @returns {Promise<*>} The return value of fn.
 */
async function withFileLock(filePath, fn) {
  const key = path.resolve(filePath);
  const prev = _writeLocks.get(key) || Promise.resolve();
  let resolve;
  const current = new Promise((r) => {
    resolve = r;
  });
  _writeLocks.set(key, current);

  // Race the previous lock against a timeout to avoid permanent hangs
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`File lock timeout after ${LOCK_TIMEOUT_MS}ms for ${key}`)), LOCK_TIMEOUT_MS)
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

module.exports = { withFileLock, _writeLocks, LOCK_TIMEOUT_MS };
