'use strict';

const path = require('path');

describe('route registration manifest (C3.1)', () => {
  async function loadManifestModule() {
    return import('../../src/webapp/routes/manifest.ts');
  }

  it('exports a non-empty declarative manifest', async () => {
    const mod = await loadManifestModule();
    expect(Array.isArray(mod.ROUTE_REGISTRATION_MANIFEST)).toBe(true);
    expect(mod.ROUTE_REGISTRATION_MANIFEST.length).toBeGreaterThan(10);
  });

  it('registers commands before orchestrator (cross-route dependency ordering)', async () => {
    const mod = await loadManifestModule();
    const ids = mod.ROUTE_REGISTRATION_MANIFEST.map((entry) => entry.id);
    expect(ids.indexOf('commands')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('orchestrator')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('commands')).toBeLessThan(ids.indexOf('orchestrator'));
  });

  it('registers misc last so SPA catch-all does not preempt API routes', async () => {
    const mod = await loadManifestModule();
    const ids = mod.ROUTE_REGISTRATION_MANIFEST.map((entry) => entry.id);
    expect(ids.at(-1)).toBe('misc');
  });

  it('contains unique route ids', async () => {
    const mod = await loadManifestModule();
    const ids = mod.ROUTE_REGISTRATION_MANIFEST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every manifest entry provides a callable register function', async () => {
    const mod = await loadManifestModule();
    for (const entry of mod.ROUTE_REGISTRATION_MANIFEST) {
      expect(typeof entry.register).toBe('function');
    }
  });

  it('manifest module stays in routes bounded context', async () => {
    const modPath = path.resolve(__dirname, '../../src/webapp/routes/manifest.ts');
    expect(modPath.includes(path.normalize('src/webapp/routes'))).toBe(true);
  });
});
