import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const path = require('path');
import * as __req_0 from '../../src/webapp/services/context-adapter';
const { toServiceContext } = __req_0;
import * as __req_1 from '../../src/webapp/store';
const { InMemoryStore, setStore } = __req_1;

describe('context-adapter', () => {
  it('maps explicit fields from route context to service context', () => {
    const cache = { read: vi.fn() };
    const audit = { log: vi.fn(), read: vi.fn(() => [{ id: 'a1' }]) };
    const safeWriteSync = vi.fn();

    const ctx = {
      PROJECT_ROOT: '/project',
      BUSINESS_DOCS: '/project/BusinessDocs',
      SESSION_DIR: '/project/BusinessDocs/session',
      DECISIONS_FILE: '/project/BusinessDocs/decisions.md',
      DECISIONS_DIR: '/project/BusinessDocs/decisions',
      COMMAND_QUEUE: '/project/BusinessDocs/session/command-queue.json',
      HELP_DIR: '/project/docs/help',
      _cache: cache,
      _audit: audit,
      safeWriteSync,
      _ragStore: { listCollections: vi.fn(() => []) },
      _embeddingProvider: { embedText: vi.fn(async () => [1, 2, 3]) },
      _semanticMemoryStore: { list: vi.fn(async () => []) },
    };

    const svc = toServiceContext(ctx);

    expect(svc.cache).toBe(cache);
    expect(svc.audit).toBe(audit);
    expect(svc.safeWrite).toBe(safeWriteSync);
    expect(svc.projectRoot).toBe('/project');
    expect(svc.businessDocs).toBe('/project/BusinessDocs');
    expect(svc.sessionDir).toBe('/project/BusinessDocs/session');
    expect(svc.decisionsFile).toBe('/project/BusinessDocs/decisions.md');
    expect(svc.decisionsDir).toBe('/project/BusinessDocs/decisions');
    expect(svc.commandQueue).toBe('/project/BusinessDocs/session/command-queue.json');
    expect(svc.helpDir).toBe('/project/docs/help');
    expect(svc.ragStore).toBe(ctx._ragStore);
    expect(svc.embeddingProvider).toBe(ctx._embeddingProvider);
    expect(svc.semanticMemoryStore).toBe(ctx._semanticMemoryStore);
  });

  it('derives sessionDir from SESSION_FILE when SESSION_DIR is missing', () => {
    const sessionFile = path.join('/tmp', 'BusinessDocs', 'session', 'session-state.json');
    const svc = toServiceContext({
      SESSION_FILE: sessionFile,
      safeWriteSync: vi.fn(),
    });

    expect(svc.sessionDir).toBe(path.dirname(sessionFile));
  });

  it('uses fallback cache and fallback audit when context does not provide them', () => {
    const svc = toServiceContext({ safeWriteSync: vi.fn() });

    expect(typeof svc.cache.read).toBe('function');
    expect(typeof svc.audit.log).toBe('function');
    expect(svc.audit.read()).toEqual([]);
  });

  it('reuses the same fallback cache instance across conversions', () => {
    const a = toServiceContext({ safeWriteSync: vi.fn() });
    const b = toServiceContext({ safeWriteSync: vi.fn() });

    expect(a.cache).toBe(b.cache);
  });

  it('returns the currently injected store from the getter', () => {
    const storeA = new InMemoryStore({});
    const storeB = new InMemoryStore({});

    setStore(storeA);
    const svc = toServiceContext({ safeWriteSync: vi.fn() });
    expect(svc.store).toBe(storeA);

    setStore(storeB);
    expect(svc.store).toBe(storeB);
  });
});
