import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

const fs = require('node:fs');
import * as __req_0 from '../../platform/engine/agent-schema';
const { validateCanonicalAgents, SCHEMA_PATH, AGENTS_PATH } = __req_0;

describe('Canonical agent schema validation', () => {
  it('loads schema and agents files', () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    expect(fs.existsSync(AGENTS_PATH)).toBe(true);
  });

  it('validates agents.json with zero errors', () => {
    const result = validateCanonicalAgents();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.agentCount).toBeGreaterThanOrEqual(38);
  });

  it('uses platform-agnostic tool identifiers', () => {
    const data = JSON.parse(fs.readFileSync(AGENTS_PATH, 'utf8'));
    for (const agent of data.agents) {
      for (const tool of agent.tools) {
        expect(tool.startsWith('tool.')).toBe(true);
      }
    }
  });
});
