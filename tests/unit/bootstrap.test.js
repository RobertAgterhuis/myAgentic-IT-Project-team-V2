'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BOOTSTRAP_MODULE = '../../src/webapp/bootstrap.ts';
const realExistsSync = fs.existsSync.bind(fs);

function normalize(filePath) {
  return String(filePath).replace(/\\/g, '/');
}

function isOptionalEnvFile(filePath) {
  return ['/.env', '/.env.local', '/src/webapp/.env', '/src/webapp/.env.local'].some((suffix) =>
    normalize(filePath).endsWith(suffix)
  );
}

function createTargetModulePath(name) {
  return `tests/fixtures/${name}`;
}

async function importBootstrap(tag) {
  vi.resetModules();
  await import(`${BOOTSTRAP_MODULE}?case=${tag}`);
}

describe('webapp bootstrap', () => {
  const originalArgv = [...process.argv];
  const originalLoadEnvFile = process.loadEnvFile;
  const originalLocalStorage = globalThis.localStorage;
  const originalBootstrapEntry = globalThis.__WEBAPP_BOOTSTRAP_ENTRY;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.argv = [...originalArgv];
    globalThis.__BOOTSTRAP_TEST_IMPORTS = [];

    if (originalLoadEnvFile === undefined) {
      delete process.loadEnvFile;
    } else {
      process.loadEnvFile = originalLoadEnvFile;
    }

    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }

    if (originalBootstrapEntry === undefined) {
      delete globalThis.__WEBAPP_BOOTSTRAP_ENTRY;
    } else {
      globalThis.__WEBAPP_BOOTSTRAP_ENTRY = originalBootstrapEntry;
    }
  });

  it('loads optional env files, installs the localStorage shim, and imports the target module', async () => {
    const loadEnvFile = vi.fn();
    process.loadEnvFile = loadEnvFile;
    process.argv = ['node', 'bootstrap', createTargetModulePath('bootstrap-target-a.mjs')];

    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (isOptionalEnvFile(filePath)) return true;
      return realExistsSync(filePath);
    });

    await importBootstrap('success');

    const targetPath = path.resolve(
      process.cwd(),
      createTargetModulePath('bootstrap-target-a.mjs')
    );
    await vi.waitFor(() => {
      expect(globalThis.__BOOTSTRAP_TEST_IMPORTS).toContain(targetPath);
    });

    expect(loadEnvFile).toHaveBeenCalledTimes(4);
    expect(loadEnvFile.mock.calls.map(([filePath]) => normalize(filePath))).toEqual([
      `${normalize(process.cwd())}/.env`,
      `${normalize(process.cwd())}/.env.local`,
      `${normalize(process.cwd())}/src/webapp/.env`,
      `${normalize(process.cwd())}/src/webapp/.env.local`,
    ]);

    expect(globalThis.__WEBAPP_BOOTSTRAP_ENTRY).toBe(targetPath);
    expect(globalThis.localStorage.getItem('missing')).toBeNull();
    expect(globalThis.localStorage.key(0)).toBeNull();
    expect(globalThis.localStorage.length).toBe(0);
    expect(() => globalThis.localStorage.setItem('key', 'value')).not.toThrow();
    expect(() => globalThis.localStorage.removeItem('key')).not.toThrow();
    expect(() => globalThis.localStorage.clear()).not.toThrow();
  });

  it('keeps startup resilient when env loading throws', async () => {
    process.loadEnvFile = vi.fn(() => {
      throw new Error('boom');
    });
    process.argv = ['node', 'bootstrap', createTargetModulePath('bootstrap-target-b.mjs')];

    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (isOptionalEnvFile(filePath)) return true;
      return realExistsSync(filePath);
    });

    await importBootstrap('throwing-env-loader');

    const targetPath = path.resolve(
      process.cwd(),
      createTargetModulePath('bootstrap-target-b.mjs')
    );
    await vi.waitFor(() => {
      expect(globalThis.__BOOTSTRAP_TEST_IMPORTS).toContain(targetPath);
    });

    expect(globalThis.__WEBAPP_BOOTSTRAP_ENTRY).toBe(targetPath);
  });

  it('still imports the target when process.loadEnvFile is unavailable', async () => {
    delete process.loadEnvFile;
    process.argv = ['node', 'bootstrap', createTargetModulePath('bootstrap-target-a.mjs')];

    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (isOptionalEnvFile(filePath)) return true;
      return realExistsSync(filePath);
    });

    await importBootstrap('missing-load-env-file');

    const targetPath = path.resolve(
      process.cwd(),
      createTargetModulePath('bootstrap-target-a.mjs')
    );
    await vi.waitFor(() => {
      expect(globalThis.__BOOTSTRAP_TEST_IMPORTS).toContain(targetPath);
    });

    expect(globalThis.__WEBAPP_BOOTSTRAP_ENTRY).toBe(targetPath);
  });
});
