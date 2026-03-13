// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const path = require('path');
const { resolveSessionFile } = require('./session-state-resolver');

/* ── Helpers ────────────────────────────────────────────────────── */

function makeStore(existingPaths, statMap = {}) {
  return {
    exists: (fp) => existingPaths.includes(fp),
    stat: (fp) => statMap[fp] || null,
  };
}

function makeCache(readMap = {}) {
  return {
    read: (fp) => {
      if (readMap[fp] !== undefined) return readMap[fp];
      throw new Error('not found');
    },
  };
}

const DIR = '/docs/session';
const FILE_A = path.join(DIR, 'session-state.json');
const FILE_B = path.join(DIR, 'session-state-audit.json');

/* ── Tests ──────────────────────────────────────────────────────── */

describe('resolveSessionFile', () => {
  it('returns null when no candidate files exist', () => {
    const store = makeStore([]);
    const cache = makeCache();
    expect(resolveSessionFile(store, cache, DIR)).toBeNull();
  });

  it('returns the only candidate when one file exists', () => {
    const store = makeStore([FILE_A]);
    const cache = makeCache();
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_A);
  });

  it('returns the other candidate when only audit file exists', () => {
    const store = makeStore([FILE_B]);
    const cache = makeCache();
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_B);
  });

  it('prefers file with newer last_updated timestamp', () => {
    const store = makeStore([FILE_A, FILE_B]);
    const cache = makeCache({
      [FILE_A]: JSON.stringify({ last_updated: '2026-01-01T00:00:00Z' }),
      [FILE_B]: JSON.stringify({ last_updated: '2026-06-01T00:00:00Z' }),
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_B);
  });

  it('prefers file A when it has the newer timestamp', () => {
    const store = makeStore([FILE_A, FILE_B]);
    const cache = makeCache({
      [FILE_A]: JSON.stringify({ last_updated: '2026-12-01T00:00:00Z' }),
      [FILE_B]: JSON.stringify({ last_updated: '2026-01-01T00:00:00Z' }),
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_A);
  });

  it('falls back to mtime when last_updated is missing', () => {
    const store = makeStore([FILE_A, FILE_B], {
      [FILE_A]: { mtimeMs: 1000 },
      [FILE_B]: { mtimeMs: 2000 },
    });
    const cache = makeCache({
      [FILE_A]: JSON.stringify({}),
      [FILE_B]: JSON.stringify({}),
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_B);
  });

  it('falls back to mtime when JSON parse fails', () => {
    const store = makeStore([FILE_A, FILE_B], {
      [FILE_A]: { mtimeMs: 3000 },
      [FILE_B]: { mtimeMs: 1000 },
    });
    const cache = makeCache({
      [FILE_A]: 'not json',
      [FILE_B]: 'also not json',
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_A);
  });

  it('falls back to mtime when last_updated is invalid date', () => {
    const store = makeStore([FILE_A, FILE_B], {
      [FILE_A]: { mtimeMs: 100 },
      [FILE_B]: { mtimeMs: 500 },
    });
    const cache = makeCache({
      [FILE_A]: JSON.stringify({ last_updated: 'not-a-date' }),
      [FILE_B]: JSON.stringify({ last_updated: 'also-not' }),
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_B);
  });

  it('handles cache read throwing for one file gracefully', () => {
    const store = makeStore([FILE_A, FILE_B], {
      [FILE_A]: { mtimeMs: 100 },
      [FILE_B]: { mtimeMs: 200 },
    });
    // FILE_A throws on read, FILE_B has valid timestamp
    const cache = makeCache({
      [FILE_B]: JSON.stringify({ last_updated: '2026-06-01T00:00:00Z' }),
    });
    expect(resolveSessionFile(store, cache, DIR)).toBe(FILE_B);
  });

  it('handles stat returning null gracefully', () => {
    const store = makeStore([FILE_A, FILE_B], {
      [FILE_A]: null,
      [FILE_B]: null,
    });
    const cache = makeCache({
      [FILE_A]: JSON.stringify({}),
      [FILE_B]: JSON.stringify({}),
    });
    // Both score 0 from last_updated (none) and 0 from mtime (null stat)
    // sort is stable, first wins
    const result = resolveSessionFile(store, cache, DIR);
    expect([FILE_A, FILE_B]).toContain(result);
  });

  it('handles store.stat throwing gracefully', () => {
    const store = {
      exists: (fp) => [FILE_A, FILE_B].includes(fp),
      stat: () => { throw new Error('stat failed'); },
    };
    const cache = makeCache({
      [FILE_A]: JSON.stringify({}),
      [FILE_B]: JSON.stringify({}),
    });
    const result = resolveSessionFile(store, cache, DIR);
    expect([FILE_A, FILE_B]).toContain(result);
  });
});
