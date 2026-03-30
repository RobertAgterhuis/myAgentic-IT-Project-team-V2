'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureRuntimeScaffold } = require('../../src/webapp/runtime-scaffold');

describe('runtime scaffold', () => {
  it('creates .agentic and runtime subdirectories for a fresh project root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-scaffold-'));

    const result = ensureRuntimeScaffold(root);

    expect(fs.existsSync(path.join(root, '.agentic'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.agentic', 'storage'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.agentic', 'mcp-governance'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'BusinessDocs', 'session'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'BusinessDocs', 'audit'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'BusinessDocs', 'metrics'))).toBe(true);

    expect(result.created.length).toBeGreaterThan(0);
  });

  it('is idempotent when folders already exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-scaffold-existing-'));

    ensureRuntimeScaffold(root);
    const result = ensureRuntimeScaffold(root);

    expect(result.created).toEqual([]);
    expect(result.skipped.length).toBeGreaterThan(0);
  });
});
