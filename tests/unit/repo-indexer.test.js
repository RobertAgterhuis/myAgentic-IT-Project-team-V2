'use strict';

/**
 * Repository Indexer — Unit Tests (M25-007)
 *
 * Validates RepoIndexer stack detection, monorepo discovery,
 * service inventory, and persistence via mock StorageProvider.
 */

const { RepoIndexer } = require('../../platform/engine/workspace/repo-indexer');

// ─── Mock StorageProvider ────────────────────────────────────

function createMockStorage() {
  const collections = {};

  function getCollection(name) {
    if (!collections[name]) collections[name] = {};
    return collections[name];
  }

  return {
    name: 'mock',
    async read(collection, id) {
      return getCollection(collection)[id] ?? null;
    },
    async write(collection, id, data) {
      getCollection(collection)[id] = { ...data };
    },
    async delete(collection, id) {
      delete getCollection(collection)[id];
    },
    async list(collection) {
      return Object.values(getCollection(collection));
    },
    async query(collection, q) {
      return this.list(collection, q);
    },
    async transaction(ops) {
      for (const op of ops) {
        if (op.type === 'write') await this.write(op.collection, op.id, op.data);
        if (op.type === 'delete') await this.delete(op.collection, op.id);
      }
    },
    async initialize() {},
    async close() {},
    async health() {
      return { status: 'healthy', provider: 'mock', latencyMs: 0 };
    },
    metrics() {
      return { reads: 0, writes: 0, deletes: 0, errors: 0, readLatencies: [], writeLatencies: [] };
    },
  };
}

// ─── Mock FsScanner ──────────────────────────────────────────

/**
 * Creates an in-memory FsScanner.
 * @param {Record<string, string>} files — path→content map
 * @param {Set<string>} dirs — set of directory paths
 * @param {Record<string, string[]>} dirEntries — directory→entries map (entries end with / for dirs)
 */
function createMockFs(files = {}, dirs = new Set(), dirEntries = {}) {
  return {
    async exists(filePath) {
      return filePath in files || dirs.has(filePath);
    },
    async readdir(dirPath) {
      return dirEntries[dirPath] ?? [];
    },
    async readFile(filePath) {
      if (filePath in files) return files[filePath];
      throw new Error(`ENOENT: ${filePath}`);
    },
  };
}

// ─── Helper repo ─────────────────────────────────────────────

function makeRepo(id, name) {
  return {
    id,
    name: name || id,
    provider: 'github',
    url: `https://github.com/org/${id}`,
    defaultBranch: 'main',
    services: [],
    tags: [],
  };
}

// ─── Stack Detection ─────────────────────────────────────────

describe('RepoIndexer — stack detection', () => {
  let indexer;
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    indexer = new RepoIndexer(storage);
  });

  it('detects Node.js + TypeScript project', async () => {
    const fs = createMockFs({
      '/repo/package.json': '{}',
      '/repo/tsconfig.json': '{}',
    });

    const entry = await indexer.indexRepository(makeRepo('backend'), fs, '/repo');

    expect(entry.repoId).toBe('backend');
    expect(entry.rootStack).toContain('node');
    expect(entry.rootStack).toContain('typescript');
    expect(entry.fileIndicators).toContain('package.json');
    expect(entry.fileIndicators).toContain('tsconfig.json');
    expect(entry.services).toHaveLength(1);
    expect(entry.services[0].stack).toContain('node');
  });

  it('detects Python project', async () => {
    const fs = createMockFs({
      '/repo/pyproject.toml': '[project]',
      '/repo/Dockerfile': 'FROM python:3.12',
    });

    const entry = await indexer.indexRepository(makeRepo('ml-service'), fs, '/repo');

    expect(entry.rootStack).toContain('python');
    expect(entry.rootStack).toContain('docker');
  });

  it('detects Go project', async () => {
    const fs = createMockFs({
      '/repo/go.mod': 'module example.com/api',
    });

    const entry = await indexer.indexRepository(makeRepo('go-api'), fs, '/repo');

    expect(entry.rootStack).toContain('go');
    expect(entry.services[0].type).toBe('api');
  });

  it('detects .NET project via *.csproj glob', async () => {
    const dirEntries = { '/repo': ['Program.cs', 'App.csproj'] };
    const fs = createMockFs({}, new Set(), dirEntries);

    const entry = await indexer.indexRepository(makeRepo('dotnet-svc'), fs, '/repo');

    expect(entry.rootStack).toContain('dotnet');
    expect(entry.rootStack).toContain('csharp');
  });

  it('detects Next.js as web service', async () => {
    const fs = createMockFs({
      '/repo/package.json': '{}',
      '/repo/next.config.mjs': 'export default {}',
    });

    const entry = await indexer.indexRepository(makeRepo('frontend'), fs, '/repo');

    expect(entry.rootStack).toContain('nextjs');
    expect(entry.services[0].type).toBe('web');
  });

  it('detects Terraform as infra', async () => {
    const fs = createMockFs({
      '/repo/main.tf': 'resource "azurerm_resource_group" "rg" {}',
    });

    const entry = await indexer.indexRepository(makeRepo('infra'), fs, '/repo');

    expect(entry.rootStack).toContain('terraform');
    expect(entry.services[0].type).toBe('infra');
  });

  it('returns empty stack for empty repo', async () => {
    const fs = createMockFs({});

    const entry = await indexer.indexRepository(makeRepo('empty'), fs, '/repo');

    expect(entry.rootStack).toEqual([]);
    expect(entry.services).toHaveLength(1);
    expect(entry.services[0].type).toBe('other');
  });
});

// ─── Monorepo Detection ──────────────────────────────────────

describe('RepoIndexer — monorepo', () => {
  let indexer;

  beforeEach(() => {
    indexer = new RepoIndexer(createMockStorage());
  });

  it('detects npm workspaces and enumerates services', async () => {
    const fs = createMockFs(
      {
        '/mono/package.json': JSON.stringify({ workspaces: ['packages/*'] }),
        '/mono/packages/api/package.json': '{}',
        '/mono/packages/api/tsconfig.json': '{}',
        '/mono/packages/web/package.json': '{}',
        '/mono/packages/web/next.config.mjs': '',
      },
      new Set(),
      {
        '/mono/packages': ['api/', 'web/'],
      }
    );

    const entry = await indexer.indexRepository(makeRepo('mono'), fs, '/mono');

    expect(entry.services.length).toBeGreaterThanOrEqual(2);
    const serviceIds = entry.services.map((s) => s.id);
    expect(serviceIds).toContain('api');
    expect(serviceIds).toContain('web');

    const webSvc = entry.services.find((s) => s.id === 'web');
    expect(webSvc.type).toBe('web');
    expect(webSvc.stack).toContain('nextjs');
  });

  it('detects lerna-style workspaces', async () => {
    const fs = createMockFs(
      {
        '/mono/package.json': '{}',
        '/mono/lerna.json': JSON.stringify({ packages: ['packages/*'] }),
        '/mono/packages/lib/package.json': '{}',
      },
      new Set(),
      {
        '/mono/packages': ['lib/'],
      }
    );

    const entry = await indexer.indexRepository(makeRepo('lerna-mono'), fs, '/mono');

    expect(entry.services.length).toBeGreaterThanOrEqual(1);
    expect(entry.services.some((s) => s.id === 'lib')).toBe(true);
  });
});

// ─── Persistence ─────────────────────────────────────────────

describe('RepoIndexer — persistence', () => {
  let indexer;
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    indexer = new RepoIndexer(storage);
  });

  it('persists index and retrieves it', async () => {
    const fs = createMockFs({ '/repo/go.mod': 'module x' });
    await indexer.indexRepository(makeRepo('go-svc'), fs, '/repo');

    const stored = await indexer.getIndex('go-svc');
    expect(stored).not.toBeNull();
    expect(stored.repoId).toBe('go-svc');
    expect(stored.rootStack).toContain('go');
  });

  it('returns null for unindexed repo', async () => {
    const stored = await indexer.getIndex('nonexistent');
    expect(stored).toBeNull();
  });

  it('lists all indexed repos', async () => {
    const fs1 = createMockFs({ '/a/go.mod': '' });
    const fs2 = createMockFs({ '/b/Cargo.toml': '' });

    await indexer.indexRepository(makeRepo('svc-a'), fs1, '/a');
    await indexer.indexRepository(makeRepo('svc-b'), fs2, '/b');

    const all = await indexer.listIndexes();
    expect(all).toHaveLength(2);
  });
});

// ─── Service Path & Name ─────────────────────────────────────

describe('RepoIndexer — service metadata', () => {
  it('uses relative path for monorepo services', async () => {
    const indexer = new RepoIndexer(createMockStorage());
    const fs = createMockFs(
      {
        '/mono/package.json': JSON.stringify({ workspaces: ['apps/*'] }),
        '/mono/apps/dashboard/package.json': '{}',
        '/mono/apps/dashboard/vite.config.ts': '',
      },
      new Set(),
      {
        '/mono/apps': ['dashboard/'],
      }
    );

    const entry = await indexer.indexRepository(makeRepo('mono'), fs, '/mono');
    const dash = entry.services.find((s) => s.id === 'dashboard');
    expect(dash).toBeDefined();
    expect(dash.path).toBe('apps/dashboard');
    expect(dash.name).toBe('dashboard');
  });
});
