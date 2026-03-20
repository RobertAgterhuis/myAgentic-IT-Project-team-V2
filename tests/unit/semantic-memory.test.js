'use strict';

/**
 * Semantic Memory Store — Unit Tests (I-A4-001)
 *
 * Covers:
 *   - Three tiers: run, project, org
 *   - Retention policies and TTL-based eviction
 *   - Write / read / list / clear / evict API
 *   - byteLength utility
 *   - Metrics (per-tier entry counts and byte sums)
 */

const {
  SemanticMemoryStore,
  InMemoryStorage,
  byteLength,
  TIER_RETENTION_MS,
} = require('../../platform/engine/semantic-memory');

// ─── Helpers ─────────────────────────────────────────────────

function createStore() {
  return new SemanticMemoryStore(new InMemoryStorage());
}

// ─── byteLength ───────────────────────────────────────────────

describe('byteLength', () => {
  it('counts ASCII bytes', () => {
    expect(byteLength('hello')).toBe(5);
  });

  it('counts multi-byte UTF-8 characters', () => {
    // '€' = 3 bytes, '𝄞' = 4 bytes
    expect(byteLength('€')).toBe(3);
    expect(byteLength('𝄞')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(byteLength('')).toBe(0);
  });
});

// ─── TIER_RETENTION_MS ──────────────────────────────────────

describe('TIER_RETENTION_MS', () => {
  it('run tier has zero retention (no auto-expiry)', () => {
    expect(TIER_RETENTION_MS.run).toBe(0);
  });

  it('project tier has 30-day retention', () => {
    expect(TIER_RETENTION_MS.project).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('org tier has 90-day retention', () => {
    expect(TIER_RETENTION_MS.org).toBe(90 * 24 * 60 * 60 * 1000);
  });
});

// ─── SemanticMemoryStore — basic CRUD ────────────────────────

describe('SemanticMemoryStore — write / read', () => {
  it('writes and reads an entry for each tier', async () => {
    const store = createStore();
    for (const tier of ['run', 'project', 'org']) {
      await store.write(tier, 'k1', `content-${tier}`, { topic: 'test' });
      const entry = await store.read(tier, 'k1');
      expect(entry).not.toBeNull();
      expect(entry.content).toBe(`content-${tier}`);
      expect(entry.key).toBe('k1');
      expect(entry.topic).toBe('test');
      expect(typeof entry.writtenAt).toBe('number');
    }
  });

  it('returns null for missing key', async () => {
    const store = createStore();
    const entry = await store.read('org', 'no-such-key');
    expect(entry).toBeNull();
  });

  it('overwrites existing entry on second write', async () => {
    const store = createStore();
    await store.write('project', 'key', 'first');
    await store.write('project', 'key', 'second');
    const entry = await store.read('project', 'key');
    expect(entry.content).toBe('second');
  });
});

// ─── SemanticMemoryStore — TTL / eviction ─────────────────────

describe('SemanticMemoryStore — TTL eviction', () => {
  it('run tier entries never expire on read (TTL=0)', async () => {
    const store = createStore();
    await store.write('run', 'k', 'value');
    // Simulate a very far future time
    const farFuture = Date.now() + 9999 * 24 * 60 * 60 * 1000;
    const entry = await store.read('run', 'k', farFuture);
    expect(entry).not.toBeNull();
  });

  it('project entry is evicted as expired after TTL', async () => {
    const store = createStore();
    await store.write('project', 'k', 'old');
    // simulate now = writtenAt + 31 days (> 30 day TTL)
    const entry = await store.read('project', 'k', Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(entry).toBeNull();
  });

  it('project entry is returned when not yet expired', async () => {
    const store = createStore();
    await store.write('project', 'k', 'fresh');
    const entry = await store.read(
      'project',
      'k',
      Date.now() + 1 * 24 * 60 * 60 * 1000 // +1 day
    );
    expect(entry).not.toBeNull();
  });

  it('org entry is evicted after 90 days', async () => {
    const store = createStore();
    await store.write('org', 'k', 'stale');
    const expired = await store.read('org', 'k', Date.now() + 91 * 24 * 60 * 60 * 1000);
    expect(expired).toBeNull();
  });
});

// ─── SemanticMemoryStore — list ───────────────────────────────

describe('SemanticMemoryStore — list', () => {
  it('returns all non-expired entries sorted by key', async () => {
    const store = createStore();
    await store.write('org', 'zebra', 'z');
    await store.write('org', 'alpha', 'a');
    await store.write('org', 'middle', 'm');
    const entries = await store.list('org');
    expect(entries.map((e) => e.key)).toEqual(['alpha', 'middle', 'zebra']);
  });

  it('evicts expired entries during list', async () => {
    const store = createStore();
    await store.write('project', 'old', 'expired');
    await store.write('project', 'new', 'fresh');
    const future = Date.now() + 31 * 24 * 60 * 60 * 1000;
    const entries = await store.list('project', future);
    expect(entries.every((e) => e.key !== 'old')).toBe(true);
  });

  it('returns empty array for empty tier', async () => {
    const store = createStore();
    const entries = await store.list('run');
    expect(entries).toEqual([]);
  });
});

// ─── SemanticMemoryStore — evict ──────────────────────────────

describe('SemanticMemoryStore — evict', () => {
  it('returns 0 for run tier (TTL=0, nothing expires)', async () => {
    const store = createStore();
    await store.write('run', 'k1', 'v1');
    await store.write('run', 'k2', 'v2');
    const removed = await store.evict('run', Date.now() + 99999999999);
    expect(removed).toBe(0);
  });

  it('evicts only expired project entries', async () => {
    const store = createStore();
    await store.write('project', 'stale1', 'old');
    await store.write('project', 'stale2', 'old');
    const removedAt31 = await store.evict('project', Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(removedAt31).toBe(2);
    const remaining = await store.list('project');
    expect(remaining).toHaveLength(0);
  });
});

// ─── SemanticMemoryStore — clear ──────────────────────────────

describe('SemanticMemoryStore — clear', () => {
  it('removes all entries in a tier', async () => {
    const store = createStore();
    await store.write('run', 'a', 'val');
    await store.write('run', 'b', 'val');
    await store.clear('run');
    const entries = await store.list('run');
    expect(entries).toHaveLength(0);
  });

  it('does not affect other tiers', async () => {
    const store = createStore();
    await store.write('run', 'x', 'run-val');
    await store.write('org', 'x', 'org-val');
    await store.clear('run');
    const orgEntry = await store.read('org', 'x');
    expect(orgEntry).not.toBeNull();
  });
});

// ─── SemanticMemoryStore — metrics ────────────────────────────

describe('SemanticMemoryStore — metrics', () => {
  it('returns zero metrics for empty store', async () => {
    const store = createStore();
    const m = await store.metrics();
    expect(m.totalBytes).toBe(0);
    expect(m.run.entries).toBe(0);
    expect(m.project.entries).toBe(0);
    expect(m.org.entries).toBe(0);
  });

  it('counts entries and bytes per tier', async () => {
    const store = createStore();
    await store.write('run', 'r1', 'hello');
    await store.write('org', 'o1', 'world!');
    const m = await store.metrics();
    expect(m.run.entries).toBe(1);
    expect(m.run.bytes).toBe(byteLength('hello'));
    expect(m.org.entries).toBe(1);
    expect(m.org.bytes).toBe(byteLength('world!'));
    expect(m.totalBytes).toBe(byteLength('hello') + byteLength('world!'));
  });

  it('does not count expired entries in metrics', async () => {
    const store = createStore();
    await store.write('project', 'old', 'stale content');
    const future = Date.now() + 31 * 24 * 60 * 60 * 1000;
    const m = await store.metrics(future);
    expect(m.project.entries).toBe(0);
    expect(m.project.bytes).toBe(0);
  });
});
