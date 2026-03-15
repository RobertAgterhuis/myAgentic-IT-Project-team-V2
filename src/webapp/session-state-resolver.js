'use strict';

const path = require('path');

/**
 * Resolve the active session-state file.
 * Preference order:
 * 1) Newest valid JSON by `last_updated` timestamp.
 * 2) Newest file mtime if timestamp is missing/invalid.
 */
function resolveSessionFile(store, cache, sessionDir) {
  const candidates = [
    path.join(sessionDir, 'session-state.json'),
    path.join(sessionDir, 'session-state-audit.json'),
  ];

  const existing = candidates.filter((fp) => store.exists(fp));
  if (existing.length === 0) return null;
  if (existing.length === 1) return existing[0];

  const scored = existing.map((fp) => ({ fp, score: _scoreFile(store, cache, fp) }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].fp;
}

function _scoreFile(store, cache, fp) {
  const byUpdated = _scoreByLastUpdated(cache, fp);
  if (byUpdated > 0) return byUpdated;
  return _scoreByMtime(store, fp);
}

function _scoreByLastUpdated(cache, fp) {
  try {
    const raw = cache.read(fp);
    const parsed = JSON.parse(raw);
    const t = Date.parse(parsed && parsed.last_updated ? parsed.last_updated : '');
    return Number.isNaN(t) ? 0 : t;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[session-state-resolver] _scoreByLastUpdated failed for %s: %s', fp, err.message);
    return 0;
  }
}

function _scoreByMtime(store, fp) {
  try {
    const stat = store.stat(fp);
    return stat && stat.mtimeMs ? stat.mtimeMs : 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[session-state-resolver] _scoreByMtime failed for %s: %s', fp, err.message);
    return 0;
  }
}

module.exports = {
  resolveSessionFile,
};
