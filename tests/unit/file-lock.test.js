'use strict';
/* Unit tests for the shared file-lock module.
 * Tests concurrency primitives and cross-module lock coordination. */

const { withFileLock, _writeLocks } = require('../../src/webapp/file-lock');

describe('withFileLock — concurrency', () => {
  it('serializes concurrent writes to the same path', async () => {
    const order = [];

    const p1 = withFileLock('/test/file.md', async () => {
      order.push('start-1');
      await new Promise((r) => setTimeout(r, 30));
      order.push('end-1');
      return 'result-1';
    });

    const p2 = withFileLock('/test/file.md', async () => {
      order.push('start-2');
      await new Promise((r) => setTimeout(r, 10));
      order.push('end-2');
      return 'result-2';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('result-1');
    expect(r2).toBe('result-2');
    // Lock ensures task 1 completes before task 2 starts
    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
  });

  it('allows parallel writes to different paths', async () => {
    const order = [];

    const p1 = withFileLock('/path/a.md', async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('a-end');
    });

    const p2 = withFileLock('/path/b.md', async () => {
      order.push('b-start');
      await new Promise((r) => setTimeout(r, 5));
      order.push('b-end');
    });

    await Promise.all([p1, p2]);
    // Both should interleave since they're on different paths
    expect(order[0]).toBe('a-start');
    expect(order[1]).toBe('b-start');
  });

  it('cleans up lock map after completion', async () => {
    const path = '/test/cleanup.md';
    await withFileLock(path, async () => 'done');
    expect(_writeLocks.has(require('node:path').resolve(path))).toBe(false);
  });

  it('cleans up lock map even after error', async () => {
    const path = '/test/error-cleanup.md';
    await expect(
      withFileLock(path, async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');
    expect(_writeLocks.has(require('node:path').resolve(path))).toBe(false);
  });

  it('serializes three chained writes to the same path', async () => {
    const order = [];
    const p1 = withFileLock('/test/triple.md', async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 15));
    });
    const p2 = withFileLock('/test/triple.md', async () => {
      order.push(2);
      await new Promise((r) => setTimeout(r, 5));
    });
    const p3 = withFileLock('/test/triple.md', async () => {
      order.push(3);
    });
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('shares the same lock instance across server.js and file-lock.js imports', () => {
    // Both modules must resolve to the same singleton lock map
    const serverLock = require('../../src/webapp/server').withFileLock;
    const fileLockModule = require('../../src/webapp/file-lock').withFileLock;
    expect(serverLock).toBe(fileLockModule);
  });

  it('releases lock even when fn throws', async () => {
    await expect(
      withFileLock('/test/err.md', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    // Subsequent lock on same path should still work
    const result = await withFileLock('/test/err.md', async () => 'ok');
    expect(result).toBe('ok');
  });
});
