import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

const fs = require('fs');
const os = require('os');
const path = require('path');
import * as __req_0 from '../../src/webapp/store';
const { FileStore, InMemoryStore, BACKUPS_DIR_NAME, MAX_BACKUPS_PER_FILE } = __req_0;

/**
 * Store async variants — Unit Tests (M4/Epic-663)
 *
 * Tests for async file I/O operations added to FileStore and InMemoryStore.
 */

describe('Store async variants (M4/Epic-663)', () => {
  describe('FileStore async API', () => {
    let store;
    let tmpDir;

    beforeEach(() => {
      store = new FileStore();
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-async-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('writes asynchronously and creates a backup when overwriting', async () => {
      const fp = path.join(tmpDir, 'async.txt');
      fs.writeFileSync(fp, 'v1', 'utf8');

      await store.writeFileAsync(fp, 'v2', 'utf8');

      expect(fs.readFileSync(fp, 'utf8')).toBe('v2');
      const backupDir = path.join(tmpDir, BACKUPS_DIR_NAME, path.basename(fp));
      expect(fs.existsSync(backupDir)).toBe(true);
      const backups = fs.readdirSync(backupDir);
      expect(backups.length).toBeGreaterThan(0);
    });

    it('reads and checks file existence asynchronously', async () => {
      const fp = path.join(tmpDir, 'readme.txt');
      fs.writeFileSync(fp, 'payload', 'utf8');

      await expect(store.existsAsync(fp)).resolves.toBe(true);
      await expect(store.existsAsync(path.join(tmpDir, 'missing.txt'))).resolves.toBe(false);
      await expect(store.readFileAsync(fp, 'utf8')).resolves.toBe('payload');
    });

    it('rejects async reads for missing files', async () => {
      await expect(store.readFileAsync(path.join(tmpDir, 'missing.txt'), 'utf8')).rejects.toThrow();
    });

    it('handles concurrent async operations', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        store.writeFileAsync(path.join(tmpDir, `file${i}.txt`), `content${i}`, 'utf8')
      );

      await Promise.all(promises);

      for (let i = 0; i < 3; i++) {
        const result = await store.readFileAsync(path.join(tmpDir, `file${i}.txt`), 'utf8');
        expect(result).toBe(`content${i}`);
      }
    });

    it('continues writing when async backup directory creation fails', async () => {
      const fp = path.join(tmpDir, 'backup-error.txt');
      fs.writeFileSync(fp, 'v1', 'utf8');
      const mkdirSpy = vi
        .spyOn(fs.promises, 'mkdir')
        .mockRejectedValueOnce(new Error('mkdir failed'));

      try {
        await store.writeFileAsync(fp, 'v2', 'utf8');
        expect(fs.readFileSync(fp, 'utf8')).toBe('v2');
      } finally {
        mkdirSpy.mockRestore();
      }
    });

    it('prunes async backups beyond the configured limit', async () => {
      const fp = path.join(tmpDir, 'async-prune.txt');
      fs.writeFileSync(fp, 'v0', 'utf8');

      for (let i = 1; i <= MAX_BACKUPS_PER_FILE + 2; i++) {
        await store.writeFileAsync(fp, `v${i}`, 'utf8');
      }

      const backupDir = path.join(tmpDir, BACKUPS_DIR_NAME, path.basename(fp));
      expect(fs.readdirSync(backupDir).length).toBeLessThanOrEqual(MAX_BACKUPS_PER_FILE);
    });

    it('cleans up the async temp file when rename fails', async () => {
      const fp = path.join(tmpDir, 'async-rename-fail.txt');
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(54321);
      const renameSpy = vi
        .spyOn(fs.promises, 'rename')
        .mockRejectedValueOnce(new Error('rename failed'));
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValueOnce(undefined);

      try {
        await expect(store.writeFileAsync(fp, 'data', 'utf8')).rejects.toThrow(/File write failed/);
        expect(unlinkSpy).toHaveBeenCalledWith(`${fp}.tmp.${process.pid}.54321`);
      } finally {
        nowSpy.mockRestore();
        renameSpy.mockRestore();
        unlinkSpy.mockRestore();
      }
    });
  });

  describe('InMemoryStore async API', () => {
    it('async methods delegate to sync internals', async () => {
      const store = new InMemoryStore();

      await store.writeFileAsync('/tmp/async-mem.txt', 'memory-data', 'utf8');

      await expect(store.existsAsync('/tmp/async-mem.txt')).resolves.toBe(true);
      await expect(store.readFileAsync('/tmp/async-mem.txt', 'utf8')).resolves.toBe('memory-data');
    });

    it('handles async read of non-existent file with error', async () => {
      const store = new InMemoryStore();

      await expect(store.readFileAsync('/tmp/missing.txt')).rejects.toThrow(/ENOENT/);
    });

    it('async operations preserve backup history', async () => {
      const store = new InMemoryStore();

      await store.writeFileAsync('/tmp/hist.txt', 'v1', 'utf8');
      await store.writeFileAsync('/tmp/hist.txt', 'v2', 'utf8');

      const resolved = path.resolve('/tmp/hist.txt');
      expect(store._backups.has(resolved)).toBe(true);
      const backups = store._backups.get(resolved);
      expect(backups.length).toBeGreaterThan(0);

      const content = await store.readFileAsync('/tmp/hist.txt', 'utf8');
      expect(content).toBe('v2');
    });
  });
});
