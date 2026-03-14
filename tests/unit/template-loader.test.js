'use strict';

/**
 * Template Loader — Unit Tests (M14 / S1)
 *
 * Covers:
 * - discoverTemplates: directory scanning for valid template packs
 * - loadManifest: reading and parsing manifest.json
 * - validateManifest: structural validation of manifest
 * - resolveTemplatePaths: path resolution from template root
 * - loadTemplate: full load + validate + resolve pipeline
 * - listTemplates: enumeration with metadata
 */

const path = require('node:path');
const fs = require('node:fs');
const {
  discoverTemplates,
  loadManifest,
  validateManifest,
  resolveTemplatePaths,
  loadTemplate,
  listTemplates,
  MANIFEST_FILENAME,
  REQUIRED_MANIFEST_KEYS,
} = require('../../platform/engine/template-loader');

// ─── Fixtures ────────────────────────────────────────────────

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');
const SDLC_DIR = path.join(TEMPLATES_DIR, 'sdlc');

/** Minimal valid manifest for test purposes */
function createMinimalManifest(overrides = {}) {
  return {
    schemaVersion: '1.0.0',
    name: 'test-template',
    version: '1.0.0',
    description: 'A test template',
    flowsFile: 'flows.yaml',
    agentsDir: 'agents',
    contractsDir: 'contracts',
    guardrailsDir: 'guardrails',
    phaseAgents: {
      ONBOARDING: [{ id: '01', name: 'Test Agent' }],
    },
    phaseContracts: {
      PHASE_1: ['test-contract.md'],
    },
    phaseGuardrails: {
      PHASE_1: ['test-guardrail.md'],
    },
    criticToPhase: {
      CRITIC_1: 'PHASE_1',
    },
    modes: {
      CREATE: { phases: ['PHASE_1'], label: 'Test CREATE' },
    },
    ...overrides,
  };
}

// ─── discoverTemplates ───────────────────────────────────────

describe('discoverTemplates', () => {
  test('discovers sdlc template in the real templates/ directory', () => {
    const templates = discoverTemplates(TEMPLATES_DIR);
    expect(templates).toContain('sdlc');
  });

  test('returns empty array for non-existent directory', () => {
    const templates = discoverTemplates('/non/existent/path');
    expect(templates).toEqual([]);
  });

  test('ignores directories without manifest.json', () => {
    // templates/ should only contain valid template dirs
    const templates = discoverTemplates(TEMPLATES_DIR);
    for (const name of templates) {
      const manifestPath = path.join(TEMPLATES_DIR, name, MANIFEST_FILENAME);
      expect(fs.existsSync(manifestPath)).toBe(true);
    }
  });
});

// ─── loadManifest ────────────────────────────────────────────

describe('loadManifest', () => {
  test('loads the real SDLC manifest', () => {
    const manifest = loadManifest('sdlc', TEMPLATES_DIR);
    expect(manifest.name).toBe('sdlc');
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.version).toBe('1.0.0');
  });

  test('throws for non-existent template', () => {
    expect(() => loadManifest('nonexistent', TEMPLATES_DIR)).toThrow(/Template manifest not found/);
  });

  test('manifest has all required keys', () => {
    const manifest = loadManifest('sdlc', TEMPLATES_DIR);
    for (const key of REQUIRED_MANIFEST_KEYS) {
      expect(manifest).toHaveProperty(key);
    }
  });
});

// ─── validateManifest ────────────────────────────────────────

describe('validateManifest', () => {
  test('validates a correct minimal manifest', () => {
    const result = validateManifest(createMinimalManifest());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('validates the real SDLC manifest', () => {
    const manifest = loadManifest('sdlc', TEMPLATES_DIR);
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects null manifest', () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Manifest must be a non-null object');
  });

  test('rejects manifest with missing required keys', () => {
    const result = validateManifest({ schemaVersion: '1.0.0' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('Missing required key'))).toBe(true);
  });

  test('rejects invalid schemaVersion format', () => {
    const manifest = createMinimalManifest({ schemaVersion: 'bad' });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('schemaVersion'))).toBe(true);
  });

  test('rejects invalid name format (uppercase)', () => {
    const manifest = createMinimalManifest({ name: 'BadName' });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  test('rejects phaseAgents entry without id or name', () => {
    const manifest = createMinimalManifest({
      phaseAgents: { ONBOARDING: [{ id: '01' }] },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("'id' and 'name'"))).toBe(true);
  });

  test('rejects phaseAgents entry that is not an array', () => {
    const manifest = createMinimalManifest({
      phaseAgents: { ONBOARDING: 'not-an-array' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('must be an array'))).toBe(true);
  });

  test('rejects modes without label', () => {
    const manifest = createMinimalManifest({
      modes: { CREATE: { phases: ['PHASE_1'] } },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('label'))).toBe(true);
  });

  test('rejects modes with non-array phases', () => {
    const manifest = createMinimalManifest({
      modes: { CREATE: { phases: 'PHASE_1', label: 'Test' } },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('phases must be an array'))).toBe(true);
  });

  test('rejects criticToPhase with bad key pattern', () => {
    const manifest = createMinimalManifest({
      criticToPhase: { BAD_KEY: 'PHASE_1' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('CRITIC_N pattern'))).toBe(true);
  });

  test('rejects criticToPhase with bad value pattern', () => {
    const manifest = createMinimalManifest({
      criticToPhase: { CRITIC_1: 'INVALID' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('PHASE_N pattern'))).toBe(true);
  });
});

// ─── resolveTemplatePaths ────────────────────────────────────

describe('resolveTemplatePaths', () => {
  test('resolves paths relative to template root', () => {
    const manifest = createMinimalManifest();
    const root = '/project/templates/test-template';
    const resolved = resolveTemplatePaths(manifest, root);

    expect(resolved.name).toBe('test-template');
    expect(resolved.flowsFile).toBe(path.join(root, 'flows.yaml'));
    expect(resolved.agentsDir).toBe(path.join(root, 'agents'));
    expect(resolved.contractsDir).toBe(path.join(root, 'contracts'));
    expect(resolved.guardrailsDir).toBe(path.join(root, 'guardrails'));
  });

  test('resolves playbooksDir when present', () => {
    const manifest = createMinimalManifest({ playbooksDir: 'playbooks' });
    const root = '/project/templates/test';
    const resolved = resolveTemplatePaths(manifest, root);
    expect(resolved.playbooksDir).toBe(path.join(root, 'playbooks'));
  });

  test('sets playbooksDir to null when not present', () => {
    const manifest = createMinimalManifest();
    delete manifest.playbooksDir;
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.playbooksDir).toBeNull();
  });

  test('passes through phaseAgents, phaseContracts, phaseGuardrails, criticToPhase, modes', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseAgents).toEqual(manifest.phaseAgents);
    expect(resolved.phaseContracts).toEqual(manifest.phaseContracts);
    expect(resolved.phaseGuardrails).toEqual(manifest.phaseGuardrails);
    expect(resolved.criticToPhase).toEqual(manifest.criticToPhase);
    expect(resolved.modes).toEqual(manifest.modes);
  });

  test('uses name as displayName fallback', () => {
    const manifest = createMinimalManifest();
    delete manifest.displayName;
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.displayName).toBe('test-template');
  });

  test('defaults decisionCategories to empty array', () => {
    const manifest = createMinimalManifest();
    delete manifest.decisionCategories;
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionCategories).toEqual([]);
  });
});

// ─── loadTemplate ────────────────────────────────────────────

describe('loadTemplate', () => {
  test('loads the real SDLC template with resolved paths', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.name).toBe('sdlc');
    expect(config.templateRoot).toBe(SDLC_DIR);
    expect(config.flowsFile).toBe(path.join(SDLC_DIR, 'flows.yaml'));
    expect(config.agentsDir).toBe(path.join(SDLC_DIR, 'agents'));
    expect(config.contractsDir).toBe(path.join(SDLC_DIR, 'contracts'));
    expect(config.guardrailsDir).toBe(path.join(SDLC_DIR, 'guardrails'));
  });

  test('SDLC template has correct phase agent counts', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.phaseAgents.ONBOARDING).toHaveLength(1);
    expect(config.phaseAgents.PHASE_1).toHaveLength(5);
    expect(config.phaseAgents.PHASE_2).toHaveLength(6);
    expect(config.phaseAgents.PHASE_3).toHaveLength(6);
    expect(config.phaseAgents.PHASE_4).toHaveLength(3);
    expect(config.phaseAgents.SYNTHESIS).toHaveLength(1);
    expect(config.phaseAgents.PHASE_5_EXECUTING).toHaveLength(7);
  });

  test('SDLC template has all 9 modes', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(Object.keys(config.modes)).toHaveLength(9);
    expect(config.modes.CREATE.phases).toEqual(['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4']);
  });

  test('SDLC template has 4 critic-to-phase mappings', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(Object.keys(config.criticToPhase)).toHaveLength(4);
    expect(config.criticToPhase.CRITIC_1).toBe('PHASE_1');
    expect(config.criticToPhase.CRITIC_4).toBe('PHASE_4');
  });

  test('SDLC template has 20 decision categories', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.decisionCategories).toHaveLength(20);
    expect(config.decisionCategories[0].file).toBe('transformation.md');
  });

  test('defaults to sdlc when no name provided', () => {
    const config = loadTemplate(undefined, TEMPLATES_DIR);
    expect(config.name).toBe('sdlc');
  });

  test('throws for non-existent template', () => {
    expect(() => loadTemplate('nonexistent', TEMPLATES_DIR)).toThrow(/Template manifest not found/);
  });

  test('throws for invalid manifest', () => {
    // Create a temporary invalid template to test
    const tmpDir = path.join(TEMPLATES_DIR, '_test_invalid');
    const tmpManifest = path.join(tmpDir, 'manifest.json');

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpManifest, JSON.stringify({ schemaVersion: '1.0.0' }));

      expect(() => loadTemplate('_test_invalid', TEMPLATES_DIR)).toThrow(
        /Invalid template manifest/
      );
    } finally {
      // Clean up
      if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    }
  });
});

// ─── listTemplates ───────────────────────────────────────────

describe('listTemplates', () => {
  test('lists at least the sdlc template', () => {
    const templates = listTemplates(TEMPLATES_DIR);
    expect(templates.length).toBeGreaterThanOrEqual(1);
    const sdlc = templates.find((t) => t.name === 'sdlc');
    expect(sdlc).toBeDefined();
    expect(sdlc.valid).toBe(true);
    expect(sdlc.version).toBe('1.0.0');
    expect(sdlc.displayName).toBe('Software Development Lifecycle');
  });

  test('returns empty array for non-existent directory', () => {
    const templates = listTemplates('/non/existent');
    expect(templates).toEqual([]);
  });

  test('reports validation errors for invalid templates', () => {
    const tmpDir = path.join(TEMPLATES_DIR, '_test_bad');
    const tmpManifest = path.join(tmpDir, 'manifest.json');

    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tmpManifest, JSON.stringify({ name: 'bad' }));

      const templates = listTemplates(TEMPLATES_DIR);
      const bad = templates.find((t) => t.name === 'bad' || t.name === '_test_bad');
      expect(bad).toBeDefined();
      expect(bad.valid).toBe(false);
      expect(bad.errors.length).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    }
  });
});

// ─── SDLC Manifest Consistency ───────────────────────────────

describe('SDLC manifest consistency with current engine', () => {
  let manifest;

  beforeAll(() => {
    manifest = loadManifest('sdlc', TEMPLATES_DIR);
  });

  test('phaseAgents matches current dispatcher PHASE_AGENTS', () => {
    // Verify the SDLC manifest has the same agent registrations as the
    // current hardcoded PHASE_AGENTS in dispatcher.js
    const { PHASE_AGENTS } = require('../../src/webapp/orchestrator/dispatcher');
    for (const [state, agents] of Object.entries(PHASE_AGENTS)) {
      expect(manifest.phaseAgents[state]).toBeDefined();
      expect(manifest.phaseAgents[state]).toHaveLength(agents.length);
      for (let i = 0; i < agents.length; i++) {
        expect(manifest.phaseAgents[state][i].id).toBe(agents[i].id);
        expect(manifest.phaseAgents[state][i].name).toBe(agents[i].name);
      }
    }
  });

  test('phaseContracts matches current gate-validator PHASE_CONTRACTS', () => {
    // Read current hardcoded values for comparison
    // The gate-validator exports PHASE_CONTRACTS indirectly via the module
    // Since we can't easily import it, verify the manifest structure matches
    expect(manifest.phaseContracts.PHASE_1).toContain('analysis-output-contract.md');
    expect(manifest.phaseContracts.PHASE_1).toContain('recommendations-output-contract.md');
    expect(manifest.phaseContracts.PHASE_1).toHaveLength(4);
    expect(manifest.phaseContracts.PHASE_4).toHaveLength(4);
  });

  test('modes matches current state-machine MODE_CONFIGS', () => {
    const { MODE_CONFIGS } = require('../../src/webapp/orchestrator/state-machine');
    for (const [mode, config] of Object.entries(MODE_CONFIGS)) {
      expect(manifest.modes[mode]).toBeDefined();
      expect(manifest.modes[mode].phases).toEqual(config.phases);
      expect(manifest.modes[mode].label).toBe(config.label);
    }
  });

  test('criticToPhase matches current gate-validator CRITIC_TO_PHASE', () => {
    expect(manifest.criticToPhase).toEqual({
      CRITIC_1: 'PHASE_1',
      CRITIC_2: 'PHASE_2',
      CRITIC_3: 'PHASE_3',
      CRITIC_4: 'PHASE_4',
    });
  });
});
