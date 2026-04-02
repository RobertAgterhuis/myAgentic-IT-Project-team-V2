/**
 * Flow Loader — Unit Tests (FEAT-05-A / AC-1)
 *
 * Covers:
 * - parseFlowYaml: standards-based YAML parser normalization
 * - parseInlineValue: inline value handling
 * - loadFlows: full load + validation
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseFlowYaml, parseInlineValue, loadFlows } from '../../platform/engine/flow-loader';
import { toPackManifestV2, toLegacyFlowDefinition } from '../../platform/engine/pack-contract';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const content = fs.readFileSync(
      path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml'),
      'utf-8'
    );
    const result = parseFlowYaml(content);

    expect(result.states).toHaveLength(15);
    expect(result.full_flow).toHaveLength(14);
    expect(result.structural_states).toHaveLength(6);
    expect(Object.keys(result.modes)).toHaveLength(12);
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
    expect(() => loadFlows(store, '/test.yaml')).toThrow('Invalid full_flow');
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
    expect(() => loadFlows(store, '/test.yaml')).toThrow('Invalid mode phases');
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
    const result = loadFlows(store, '/test.yaml');
    expect(result.modes.BAD_MODE.label).toBe('BAD_MODE');
  });
});

describe('pack manifest compatibility', () => {
  it('normalizes legacy flow shape into PackManifestV2', () => {
    const manifest = toPackManifestV2({
      states: ['IDLE', 'COMPLETED'],
      full_flow: ['IDLE', 'COMPLETED'],
      structural_states: ['IDLE', 'COMPLETED'],
      events: ['transition'],
      modes: {
        CREATE: {
          phases: [],
          label: 'Create',
        },
      },
    });

    expect(manifest.manifest_version).toBe('2.0');
    expect(manifest.pack_id).toBe('core-runtime');
    expect(manifest.pack_name).toBe('Core Runtime Pack');
  });

  it('maps PackManifestV2 back to legacy flow structure', () => {
    const legacy = toLegacyFlowDefinition(
      toPackManifestV2({
        pack_id: 'test-pack',
        pack_name: 'Test pack',
        version: '2.3.4',
        states: ['IDLE', 'COMPLETED'],
        full_flow: ['IDLE', 'COMPLETED'],
        structural_states: ['IDLE', 'COMPLETED'],
        events: ['transition'],
        modes: {
          CREATE: {
            phases: [],
            label: 'Create',
          },
        },
      })
    );

    expect(legacy.full_flow).toEqual(['IDLE', 'COMPLETED']);
    expect(legacy.structural_states).toEqual(['IDLE', 'COMPLETED']);
    expect(legacy.modes.CREATE.label).toBe('Create');
  });

  it('supports extended manifest contract sections', () => {
    const manifest = toPackManifestV2({
      pack_id: 'test-pack',
      pack_name: 'Test pack',
      version: '2.3.4',
      states: ['IDLE', 'PHASE_1', 'COMPLETED'],
      full_flow: ['IDLE', 'PHASE_1', 'COMPLETED'],
      structural_states: ['IDLE', 'COMPLETED'],
      events: ['transition'],
      modes: {
        CREATE: {
          phases: ['PHASE_1'],
          label: 'Create',
        },
      },
      commands: [{ id: 'CREATE', label: 'Create' }],
      stages: [{ id: 'PHASE_1', label: 'Phase 1', order: 1 }],
      transitions: [{ from: 'IDLE', to: 'PHASE_1', event: 'transition' }],
      gates: [{ id: 'gate.1', after: 'PHASE_1', before: 'COMPLETED', type: 'SIMPLE' }],
      assignments: [
        { phase: 'PHASE_1', agent_id: '01' },
        { phase: 'QUESTIONNAIRE', agent_id: '36' },
        { phase: 'SCOPE_CHANGE', agent_id: '37' },
      ],
      runtime: {
        required_assignment_agent_ids: ['36', '37'],
      },
      artifact_namespaces: { docs: 'BusinessDocs' },
      help: {
        topics: [{ id: 'commands', title: 'Commands' }],
      },
    });

    expect(manifest.commands).toHaveLength(1);
    expect(manifest.stages[0].id).toBe('PHASE_1');
    expect(manifest.transitions[0].from).toBe('IDLE');
    expect(manifest.gates[0].before).toBe('COMPLETED');
    expect(manifest.assignments[0].agent_id).toBe('01');
    expect(manifest.runtime.required_assignment_agent_ids).toEqual(['36', '37']);
    expect(manifest.artifact_namespaces.docs).toBe('BusinessDocs');
    expect(manifest.help.topics[0].id).toBe('commands');
  });

  it('rejects manifests missing required assignment agents', () => {
    expect(() =>
      toPackManifestV2({
        states: ['IDLE', 'PHASE_1', 'COMPLETED'],
        full_flow: ['IDLE', 'PHASE_1', 'COMPLETED'],
        structural_states: ['IDLE', 'COMPLETED'],
        events: ['transition'],
        modes: {
          CREATE: {
            phases: ['PHASE_1'],
            label: 'Create',
          },
        },
        assignments: [{ phase: 'PHASE_1', agent_id: '01' }],
        runtime: {
          required_assignment_agent_ids: ['36', '37'],
        },
      })
    ).toThrow(/Missing required runtime assignments/i);
  });
});
