'use strict';

const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relPath), 'utf8');
}

function lineCount(relPath) {
  return read(relPath).split(/\r?\n/).length;
}

describe('architecture fitness gates (C3.3)', () => {
  it('server.ts uses declarative route manifest and does not import route modules directly', () => {
    const source = read('src/webapp/server.ts');
    expect(source).toContain("from './routes/manifest'");

    const directRouteImports = source.match(/from '\.\/routes\/(?!manifest')[^']+'/g) || [];
    expect(directRouteImports).toHaveLength(0);
  });

  it('server.ts registers routes through registerRoutesFromManifest', () => {
    const source = read('src/webapp/server.ts');
    expect(source).toContain('registerRoutesFromManifest(app, ctx)');
  });

  it('agent-runtime-adapter delegates prompt assembly, tool loop, profile and resolution concerns', () => {
    const source = read('platform/engine/agent-runtime-adapter.ts');

    expect(source).toContain("from './runtime-adapter/prompt-assembly.js'");
    expect(source).toContain("from './runtime-adapter/tool-loop.js'");
    expect(source).toContain("from './runtime-adapter/profile.js'");
    expect(source).toContain("from './runtime-adapter/adapter-resolution.js'");

    expect(source).not.toContain('private async _completeWithToolExecution');
    expect(source).not.toContain('function formatRetrievedContextBlock(');
  });

  it('enforces module size thresholds for bounded components', () => {
    const thresholds = [
      { path: 'src/webapp/routes/manifest.ts', max: 300 },
      { path: 'platform/engine/runtime-adapter/prompt-assembly.ts', max: 400 },
      { path: 'platform/engine/runtime-adapter/tool-loop.ts', max: 400 },
      { path: 'platform/engine/runtime-adapter/profile.ts', max: 200 },
      { path: 'platform/engine/runtime-adapter/adapter-resolution.ts', max: 250 },
      // Guardrail ceilings to prevent further centralization growth.
      { path: 'src/webapp/server.ts', max: 1200 },
      { path: 'platform/engine/agent-runtime-adapter.ts', max: 1600 },
    ];

    const violations = thresholds
      .map((entry) => ({ ...entry, lines: lineCount(entry.path) }))
      .filter((entry) => entry.lines > entry.max)
      .map((entry) => `${entry.path}: ${entry.lines} > ${entry.max}`);

    expect(violations).toEqual([]);
  });

  it('runtime-adapter modules do not import webapp layer', () => {
    const files = [
      'platform/engine/runtime-adapter/prompt-assembly.ts',
      'platform/engine/runtime-adapter/tool-loop.ts',
      'platform/engine/runtime-adapter/profile.ts',
      'platform/engine/runtime-adapter/adapter-resolution.ts',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source.includes("from '../../src/webapp")).toBe(false);
      expect(source.includes("from '../../../src/webapp")).toBe(false);
      expect(source.includes("from './..../src/webapp")).toBe(false);
    }
  });
});
