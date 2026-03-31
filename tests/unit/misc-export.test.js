// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/routes/misc-export';
const { collectPhaseOutputs } = __req_0;

describe('collectPhaseOutputs', () => {
  function makeStore(files) {
    return {
      exists(filePath) {
        return Object.prototype.hasOwnProperty.call(files, filePath);
      },
    };
  }

  function makeCache(files) {
    return {
      read(filePath) {
        if (!Object.prototype.hasOwnProperty.call(files, filePath)) {
          throw new Error('missing');
        }
        return files[filePath];
      },
    };
  }

  function safePath(basePath, relativePath) {
    if (relativePath.includes('..')) throw new Error('unsafe');
    return `${basePath}/${relativePath}`;
  }

  it('collects string and object phase outputs', () => {
    const files = {
      '/repo/out/a.txt': 'alpha',
      '/repo/out/b.txt': 'beta',
      '/repo/out/c.txt': 'gamma',
    };

    const out = collectPhaseOutputs(
      {
        phase1: 'out/a.txt',
        phase2: {
          agentA: 'out/b.txt',
          agentB: 'out/c.txt',
        },
      },
      {
        store: makeStore(files),
        cache: makeCache(files),
        projectRoot: '/repo',
        maxExportSize: 1024,
        safePath,
      }
    );

    expect(out).toEqual({
      phase1: 'alpha',
      phase2: {
        agentA: 'beta',
        agentB: 'gamma',
      },
    });
  });

  it('ignores invalid, null, and missing outputs', () => {
    const files = {
      '/repo/out/ok.txt': 'ok',
    };

    const out = collectPhaseOutputs(
      {
        phase1: '',
        phase2: 'null',
        phase3: '../escape.txt',
        phase4: 'out/missing.txt',
        phase5: {
          a: 'out/ok.txt',
          b: '../escape.txt',
          c: 'null',
        },
      },
      {
        store: makeStore(files),
        cache: makeCache(files),
        projectRoot: '/repo',
        maxExportSize: 1024,
        safePath,
      }
    );

    expect(out).toEqual({
      phase5: {
        a: 'ok',
      },
    });
  });

  it('enforces max export size cap', () => {
    const files = {
      '/repo/out/a.txt': '1234',
      '/repo/out/b.txt': '5678',
    };

    const out = collectPhaseOutputs(
      {
        phase1: 'out/a.txt',
        phase2: 'out/b.txt',
      },
      {
        store: makeStore(files),
        cache: makeCache(files),
        projectRoot: '/repo',
        maxExportSize: 6,
        safePath,
      }
    );

    expect(out).toEqual({
      phase1: '1234',
    });
  });
});
