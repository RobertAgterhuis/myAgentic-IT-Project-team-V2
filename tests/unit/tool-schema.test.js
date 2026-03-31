import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

const fs = require('node:fs');
const path = require('node:path');
import * as __req_0 from '../../platform/engine/tool-schema';
const { validateCanonicalTools, SCHEMA_PATH, TOOLS_PATH, AGENTS_PATH } = __req_0;

describe('Canonical tool schema validation (S4-3)', () => {
  it('loads schema, tools and agents files', () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    expect(fs.existsSync(TOOLS_PATH)).toBe(true);
    expect(fs.existsSync(AGENTS_PATH)).toBe(true);
  });

  it('validates tools.json with zero errors', () => {
    const result = validateCanonicalTools();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('has at least 10 tools defined', () => {
    const result = validateCanonicalTools();
    expect(result.toolCount).toBeGreaterThanOrEqual(10);
  });

  it('every tool has platform bindings for all 3 targets', () => {
    const data = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
    for (const tool of data.tools) {
      expect(tool.platformBindings).toBeDefined();
      expect(tool.platformBindings.copilot).toBeDefined();
      expect(tool.platformBindings.claude).toBeDefined();
      expect(tool.platformBindings.openai).toBeDefined();
    }
  });

  it('all agent tool references resolve to defined tools', () => {
    const result = validateCanonicalTools();
    expect(result.missingTools).toEqual([]);
  });

  it('tool IDs follow the tool.* naming convention', () => {
    const data = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
    for (const tool of data.tools) {
      expect(tool.id).toMatch(/^tool\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
    }
  });

  it('each tool has capability flags defined', () => {
    const data = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
    for (const tool of data.tools) {
      expect(typeof tool.capabilities.readOnly).toBe('boolean');
      expect(typeof tool.capabilities.supportsBackground).toBe('boolean');
      expect(typeof tool.capabilities.supportsTimeout).toBe('boolean');
    }
  });

  it('rejects invalid tools data', () => {
    const tmpDir = path.join(__dirname, '..', '..', 'platform', 'schema');
    const badPath = path.join(tmpDir, '_test_bad_tools.json');
    fs.writeFileSync(badPath, JSON.stringify({ invalid: true }), 'utf8');
    try {
      const result = validateCanonicalTools({ toolsPath: badPath });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    } finally {
      fs.unlinkSync(badPath);
    }
  });
});
