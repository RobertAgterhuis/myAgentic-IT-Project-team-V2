'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  validateCanonicalAgents,
  SCHEMA_PATH,
  AGENTS_PATH,
} = require('../../webapp/orchestrator/agent-schema');

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

  it('contains all agents listed in agent-index.md', () => {
    const indexPath = path.resolve(__dirname, '..', '..', 'docs', 'agent-index.md');
    const indexText = fs.readFileSync(indexPath, 'utf8');
    const ids = new Set();

    for (const line of indexText.split(/\r?\n/)) {
      const match = line.match(/^\|\s*(\d{2})\s*\|/);
      if (match) ids.add(match[1]);
    }

    const agents = JSON.parse(fs.readFileSync(AGENTS_PATH, 'utf8')).agents;
    const mapped = new Set(agents.map((a) => a.id));

    expect(mapped.size).toBe(ids.size);
    for (const id of ids) {
      expect(mapped.has(id)).toBe(true);
    }
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
