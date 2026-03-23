'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const TARGET_FILES = [
  'platform/sdlc/adapters/git-adapter.ts',
  'platform/engine/agent-runtime-adapter.ts',
  'src/webapp/services/agent-execution-service.ts',
];

const FORBIDDEN_PATTERNS = [
  /execa\(['"]git['"]/i,
  /exec\(['"]git['"]/i,
  /spawn\(['"]git['"]/i,
  /execFile\(['"]git['"]/i,
  /shellExec\(['"]git['"]/i,
];

describe('git shell call guard (#968)', () => {
  test('agent runner code paths contain no direct shell git invocations', () => {
    const violations = [];

    for (const relativePath of TARGET_FILES) {
      const fullPath = path.join(ROOT, relativePath);
      const source = fs.readFileSync(fullPath, 'utf8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(source)) {
          violations.push({ file: relativePath, pattern: String(pattern) });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
