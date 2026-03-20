'use strict';

/**
 * Flow Loader — Unit Tests (FEAT-05-A / AC-1)
 *
 * Covers:
 * - parseFlowYaml: standards-based YAML parser normalization
 * - parseInlineValue: inline value handling
 * - loadFlows: full load + validation
 */

const path = require('path');
const { parseFlowYaml, parseInlineValue, loadFlows } = require('../../platform/engine/flow-loader');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    readFile: (fp) => {
      if (!(fp in files)) throw new Error(`File not found: ${fp}`);
      return files[fp];
    },
  };
}

const MINIMAL_YAML = `
states:
  - IDLE
  - ONBOARDING
  - COMPLETED
  - ERROR

full_flow:
  - IDLE
  - ONBOARDING
  - COMPLETED

structural_states:
  - IDLE
  - ONBOARDING
  - COMPLETED

modes:
  CREATE:
    phases: []
    label: Full CREATE cycle

events:
  - transition
  - error
`;

// ─────────────────────────────────────────────────────────────
// parseInlineValue
// ─────────────────────────────────────────────────────────────
describe('parseInlineValue', () => {
  it('parses inline array', () => {
    expect(parseInlineValue('[PHASE_1, PHASE_2]')).toEqual(['PHASE_1', 'PHASE_2']);
  });

  it('parses empty inline array', () => {
    expect(parseInlineValue('[]')).toEqual([]);
  });

  it('parses double-quoted string', () => {
    expect(parseInlineValue('"hello world"')).toBe('hello world');
  });

  it('parses single-quoted string', () => {
    expect(parseInlineValue("'hello'")).toBe('hello');
  });

  it('returns plain string as-is', () => {
    expect(parseInlineValue('CREATE')).toBe('CREATE');
  });
});

// ─────────────────────────────────────────────────────────────
// parseFlowYaml
// ─────────────────────────────────────────────────────────────
describe('parseFlowYaml', () => {
  it('parses top-level arrays', () => {
    const result = parseFlowYaml(MINIMAL_YAML);
    expect(result.states).toEqual(['IDLE', 'ONBOARDING', 'COMPLETED', 'ERROR']);
    expect(result.full_flow).toEqual(['IDLE', 'ONBOARDING', 'COMPLETED']);
  });

  it('ignores comment lines', () => {
    const yaml = '# comment\nstates:\n  - IDLE\n  # another comment\n  - COMPLETED\n';
    const result = parseFlowYaml(yaml);
    expect(result.states).toEqual(['IDLE', 'COMPLETED']);
  });

  it('parses nested mode configs', () => {
    const yaml = `modes:\n  CREATE:\n    phases:\n      - PHASE_1\n      - PHASE_2\n    label: Full CREATE cycle\n`;
    const result = parseFlowYaml(yaml);
    expect(result.modes.CREATE.phases).toEqual(['PHASE_1', 'PHASE_2']);
    expect(result.modes.CREATE.label).toBe('Full CREATE cycle');
  });

  it('parses inline array in mode config', () => {
    const yaml = `modes:\n  HOTFIX:\n    phases: []\n    label: Emergency HOTFIX\n`;
    const result = parseFlowYaml(yaml);
    expect(result.modes.HOTFIX.phases).toEqual([]);
    expect(result.modes.HOTFIX.label).toBe('Emergency HOTFIX');
  });

  it('handles empty lines gracefully', () => {
    const yaml = '\n\nstates:\n  - IDLE\n\n  - COMPLETED\n\n';
    const result = parseFlowYaml(yaml);
    expect(result.states).toEqual(['IDLE', 'COMPLETED']);
  });

  it('preserves quoted scalar values containing # and : characters', () => {
    const yaml = `modes:\n  CREATE:\n    phases: []\n    label: "Full CREATE: #1"\n`;
    const result = parseFlowYaml(yaml);
    expect(result.modes.CREATE.label).toBe('Full CREATE: #1');
  });

  it('throws with a clear error when YAML is invalid', () => {
    const yaml = 'modes:\n  CREATE:\n    phases: [PHASE_1\n';
    expect(() => parseFlowYaml(yaml)).toThrow('Invalid flows.yaml');
  });

  it('throws when modes is not a mapping', () => {
    const yaml = 'modes:\n  - CREATE\n';
    expect(() => parseFlowYaml(yaml)).toThrow('modes must be a mapping');
  });

  it('throws when a mode property has unsupported type', () => {
    const yaml = `modes:\n  CREATE:\n    phases:\n      nested: true\n    label: Full CREATE\n`;
    expect(() => parseFlowYaml(yaml)).toThrow('expected string or array');
  });

  it('parses the full flows.yaml file', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml'),
      'utf-8'
    );
    const result = parseFlowYaml(content);

    expect(result.states).toHaveLength(15);
    expect(result.full_flow).toHaveLength(14);
    expect(result.structural_states).toHaveLength(6);
    expect(Object.keys(result.modes)).toHaveLength(9);
    expect(result.events).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────
// loadFlows
// ─────────────────────────────────────────────────────────────
describe('loadFlows', () => {
  it('loads and validates a valid flows file', () => {
    const flowsPath = '/test/flows.yaml';
    const store = createMockStore({ [flowsPath]: MINIMAL_YAML });
    const result = loadFlows(store, flowsPath);

    expect(result.states).toEqual(['IDLE', 'ONBOARDING', 'COMPLETED', 'ERROR']);
    expect(result.full_flow).toEqual(['IDLE', 'ONBOARDING', 'COMPLETED']);
    expect(result.modes.CREATE).toBeDefined();
    expect(result.events).toEqual(['transition', 'error']);
  });

  it('throws when file is missing', () => {
    const store = createMockStore({});
    expect(() => loadFlows(store, '/missing.yaml')).toThrow('Flow definition not found');
  });

  it('throws when required section is missing', () => {
    const yaml = 'states:\n  - IDLE\n';
    const store = createMockStore({ '/test.yaml': yaml });
    expect(() => loadFlows(store, '/test.yaml')).toThrow('missing required section');
  });

  it('throws when full_flow references unknown state', () => {
    const yaml = `
states:
  - IDLE
  - COMPLETED

full_flow:
  - IDLE
  - UNKNOWN_STATE
  - COMPLETED

structural_states:
  - IDLE
  - COMPLETED

modes:
  CREATE:
    phases: []
    label: test

events:
  - transition
`;
    const store = createMockStore({ '/test.yaml': yaml });
    expect(() => loadFlows(store, '/test.yaml')).toThrow('unknown state: UNKNOWN_STATE');
  });

  it('throws when mode is missing phases', () => {
    const yaml = `
states:
  - IDLE
  - COMPLETED

full_flow:
  - IDLE
  - COMPLETED

structural_states:
  - IDLE
  - COMPLETED

modes:
  BAD_MODE:
    label: Missing phases

events:
  - transition
`;
    const store = createMockStore({ '/test.yaml': yaml });
    expect(() => loadFlows(store, '/test.yaml')).toThrow('missing phases');
  });

  it('throws when mode is missing label', () => {
    const yaml = `
states:
  - IDLE
  - COMPLETED

full_flow:
  - IDLE
  - COMPLETED

structural_states:
  - IDLE
  - COMPLETED

modes:
  BAD_MODE:
    phases: []

events:
  - transition
`;
    const store = createMockStore({ '/test.yaml': yaml });
    expect(() => loadFlows(store, '/test.yaml')).toThrow('missing label');
  });
});
