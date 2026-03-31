/**
 * Adapter Result Cache — Unit Tests
 *
 * Tests the idempotency cache that prevents duplicate side-effect
 * operations during engine resume.
 */

import * as __req_0 from '../../platform/engine/adapter-result-cache';
const { AdapterResultCache } = __req_0;

function createMemoryStore() {
  const files = {};
  return {
    exists: (p) => p in files,
    readFile: (p) => files[p],
    writeFile: (p, d) => {
      files[p] = d;
    },
    mkdirp: () => {},
    _files: files,
  };
}

describe('AdapterResultCache', () => {
  let store;
  let cache;

  beforeEach(() => {
    store = createMemoryStore();
    cache = new AdapterResultCache({ store, cachePath: 'test-cache.json' });
  });

  describe('get/set/has', () => {
    it('returns undefined for missing entries', () => {
      expect(cache.get('git', 'create-branch', { name: 'x' })).toBeUndefined();
    });

    it('stores and retrieves a result', () => {
      const result = { success: true, branch: 'feature-1' };
      cache.set('git', 'create-branch', { name: 'feature-1' }, result);
      expect(cache.get('git', 'create-branch', { name: 'feature-1' })).toEqual(result);
    });

    it('has() returns true for cached entries', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { ok: true });
      expect(cache.has('git', 'create-branch', { name: 'x' })).toBe(true);
    });

    it('has() returns false for missing entries', () => {
      expect(cache.has('git', 'create-branch', { name: 'x' })).toBe(false);
    });

    it('differentiates by params', () => {
      cache.set('git', 'create-branch', { name: 'a' }, { branch: 'a' });
      cache.set('git', 'create-branch', { name: 'b' }, { branch: 'b' });
      expect(cache.get('git', 'create-branch', { name: 'a' })).toEqual({ branch: 'a' });
      expect(cache.get('git', 'create-branch', { name: 'b' })).toEqual({ branch: 'b' });
    });

    it('differentiates by operation', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { type: 'branch' });
      cache.set('git', 'create-tag', { name: 'x' }, { type: 'tag' });
      expect(cache.get('git', 'create-branch', { name: 'x' })).toEqual({ type: 'branch' });
      expect(cache.get('git', 'create-tag', { name: 'x' })).toEqual({ type: 'tag' });
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { ok: true }, 1); // 1ms TTL

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* busy wait */
      }

      expect(cache.get('git', 'create-branch', { name: 'x' })).toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('invalidate() removes a specific entry', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { ok: true });
      const deleted = cache.invalidate('git', 'create-branch', { name: 'x' });
      expect(deleted).toBe(true);
      expect(cache.has('git', 'create-branch', { name: 'x' })).toBe(false);
    });

    it('invalidate() returns false for missing entry', () => {
      expect(cache.invalidate('git', 'create-branch', { name: 'x' })).toBe(false);
    });

    it('invalidateAdapter() removes all entries for an adapter', () => {
      cache.set('git', 'create-branch', { name: 'a' }, { ok: true });
      cache.set('git', 'create-tag', { name: 'b' }, { ok: true });
      cache.set('testing', 'run-unit', {}, { ok: true });
      const count = cache.invalidateAdapter('git');
      expect(count).toBe(2);
      expect(cache.has('testing', 'run-unit', {})).toBe(true);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('git', 'create-branch', { name: 'a' }, { ok: true });
      cache.set('testing', 'run-unit', {}, { ok: true });
      cache.clear();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('stats', () => {
    it('reports size and adapter names', () => {
      cache.set('git', 'create-branch', { name: 'a' }, { ok: true });
      cache.set('testing', 'run-unit', {}, { ok: true });
      const s = cache.stats();
      expect(s.size).toBe(2);
      expect(s.adapters).toContain('git');
      expect(s.adapters).toContain('testing');
    });
  });

  describe('persistence', () => {
    it('persists entries to disk on set()', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { ok: true });
      expect(store.exists('test-cache.json')).toBe(true);
      const data = JSON.parse(store.readFile('test-cache.json'));
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].adapter).toBe('git');
    });

    it('reloads entries from disk on construction', () => {
      cache.set('git', 'create-branch', { name: 'x' }, { result: 42 });

      // Create a fresh cache with same store
      const cache2 = new AdapterResultCache({ store, cachePath: 'test-cache.json' });
      expect(cache2.get('git', 'create-branch', { name: 'x' })).toEqual({ result: 42 });
    });

    it('survives corrupted cache file', () => {
      store.writeFile('test-cache.json', 'NOT JSON!!!');
      const cache2 = new AdapterResultCache({ store, cachePath: 'test-cache.json' });
      expect(cache2.stats().size).toBe(0);
    });
  });
});
