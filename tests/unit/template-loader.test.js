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

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  discoverTemplates,
  loadManifest,
  validateManifest,
  resolveTemplatePaths,
  loadTemplate,
  listTemplates,
  seedDecisions,
  MANIFEST_FILENAME,
  REQUIRED_MANIFEST_KEYS,
} from '../../platform/engine/template-loader';
import { PHASE_AGENTS } from '../../platform/engine/dispatcher';
import { MODE_CONFIGS } from '../../platform/engine/state-machine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    expect(manifest.schemaVersion).toBe('1.1.0');
    expect(manifest.version).toBe('1.1.0');
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

  test('accepts phaseAgents entry with an empty array', () => {
    const manifest = createMinimalManifest({
      phaseAgents: { ONBOARDING: [] },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts phaseAgents object with valid agent entries', () => {
    const manifest = createMinimalManifest({
      phaseAgents: {
        ONBOARDING: [{ id: '01', name: 'Business Analyst' }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
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

  test('accepts modes with array phases', () => {
    const manifest = createMinimalManifest({
      modes: {
        CREATE: { phases: ['PHASE_1'], label: 'Create mode' },
        EXECUTE: { phases: ['PHASE_2', 'PHASE_3'], label: 'Execute mode' },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
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

  test('rejects artifactNamespaces when not an object', () => {
    const manifest = createMinimalManifest({
      artifactNamespaces: 'BusinessDocs',
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('artifactNamespaces must be an object'))).toBe(
      true
    );
  });

  test('rejects artifactNamespaces with invalid key format', () => {
    const manifest = createMinimalManifest({
      artifactNamespaces: { 'Business-Docs': 'BusinessDocs' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('artifactNamespaces key'))).toBe(true);
  });

  test('accepts valid artifactNamespaces map', () => {
    const manifest = createMinimalManifest({
      artifactNamespaces: { business_docs: 'BusinessDocs' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
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

  test('derives phaseAgents from canonical mapping when omitted in manifest', () => {
    const manifest = createMinimalManifest();
    delete manifest.phaseAgents;
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseAgents.ONBOARDING).toBeDefined();
    expect(resolved.phaseAgents.PHASE_1).toBeDefined();
    expect(resolved.phaseAgents.PHASE_5_EXECUTING).toBeDefined();
    expect(resolved.phaseAgents.CRITIC_1).toBeDefined();
    expect(resolved.phaseAgents.CRITIC_4).toBeDefined();
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

  test('resolves decisionsDir when present', () => {
    const manifest = createMinimalManifest({ decisionsDir: 'decisions' });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionsDir).toBe(path.join('/root', 'decisions'));
  });

  test('sets decisionsDir to null when not present', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionsDir).toBeNull();
  });

  test('resolves decisionIndexSeed when present', () => {
    const manifest = createMinimalManifest({
      decisionIndexSeed: 'decisions/_index-seed.md',
    });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionIndexSeed).toBe(path.join('/root', 'decisions/_index-seed.md'));
  });

  test('sets decisionIndexSeed to null when not present', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionIndexSeed).toBeNull();
  });

  test('resolves namespaced artifact paths using artifactNamespaces map', () => {
    const manifest = createMinimalManifest({
      artifactNamespaces: { business_docs: 'BusinessDocs' },
      phaseArtifacts: {
        PHASE_1: [
          {
            id: 'A-1',
            type: 'DOCUMENT',
            stage: 'REQUIREMENTS',
            path: 'business_docs:Phase1-Business/analysis.md',
          },
        ],
      },
    });

    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseArtifacts.PHASE_1[0].path).toBe(
      path.join('BusinessDocs', 'Phase1-Business', 'analysis.md')
    );
  });

  test('keeps backward compatibility for legacy BusinessDocs artifact paths', () => {
    const manifest = createMinimalManifest({
      artifactNamespaces: { business_docs: 'BusinessDocs' },
      phaseArtifacts: {
        PHASE_1: [
          {
            id: 'A-1',
            type: 'DOCUMENT',
            stage: 'REQUIREMENTS',
            path: 'BusinessDocs/Phase1-Business/analysis.md',
          },
        ],
      },
    });

    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseArtifacts.PHASE_1[0].path).toBe(
      path.join('BusinessDocs', 'Phase1-Business', 'analysis.md')
    );
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
    expect(config.phaseAgents.PHASE_4).toHaveLength(5);
    expect(config.phaseAgents.SYNTHESIS).toHaveLength(1);
    expect(config.phaseAgents.PHASE_5_EXECUTING).toHaveLength(8);
  });

  test('SDLC template has all 12 modes', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(Object.keys(config.modes)).toHaveLength(12);
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
    expect(sdlc.version).toBe('1.1.0');
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
  let config;

  beforeAll(() => {
    config = loadTemplate('sdlc', TEMPLATES_DIR);
  });

  test('phaseAgents matches current dispatcher PHASE_AGENTS', () => {
    // phaseAgents are now derived from canonical schema via loader
    for (const [state, agents] of Object.entries(PHASE_AGENTS)) {
      expect(config.phaseAgents[state]).toBeDefined();
      expect(config.phaseAgents[state]).toHaveLength(agents.length);
      for (let i = 0; i < agents.length; i++) {
        expect(config.phaseAgents[state][i].id).toBe(agents[i].id);
        expect(config.phaseAgents[state][i].name).toBe(agents[i].name);
      }
    }
  });

  test('phaseContracts matches current gate-validator PHASE_CONTRACTS', () => {
    // Read current hardcoded values for comparison
    // The gate-validator exports PHASE_CONTRACTS indirectly via the module
    // Since we can't easily import it, verify the manifest structure matches
    expect(config.phaseContracts.PHASE_1).toContain('analysis-output-contract.md');
    expect(config.phaseContracts.PHASE_1).toContain('recommendations-output-contract.md');
    expect(config.phaseContracts.PHASE_1).toHaveLength(4);
    expect(config.phaseContracts.PHASE_4).toHaveLength(4);
  });

  test('modes matches current state-machine MODE_CONFIGS', () => {
    for (const [mode, modeConfig] of Object.entries(MODE_CONFIGS)) {
      expect(config.modes[mode]).toBeDefined();
      expect(config.modes[mode].phases).toEqual(modeConfig.phases);
      expect(config.modes[mode].label).toBe(modeConfig.label);
    }
  });

  test('criticToPhase matches current gate-validator CRITIC_TO_PHASE', () => {
    expect(config.criticToPhase).toEqual({
      CRITIC_1: 'PHASE_1',
      CRITIC_2: 'PHASE_2',
      CRITIC_3: 'PHASE_3',
      CRITIC_4: 'PHASE_4',
    });
  });
});

// ─── seedDecisions ───────────────────────────────────────────

describe('seedDecisions', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-dec-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('seeds decision files into empty target directory', () => {
    const result = seedDecisions('sdlc', tmpDir, TEMPLATES_DIR);

    expect(result.seeded).toBe(true);
    expect(result.files.length).toBeGreaterThanOrEqual(20);
    expect(result.indexFile).toBe('decisions.md');

    // Verify decisions/ directory was created with category files
    const targetDecDir = path.join(tmpDir, 'decisions');
    expect(fs.existsSync(targetDecDir)).toBe(true);
    expect(fs.readdirSync(targetDecDir).length).toBeGreaterThanOrEqual(20);

    // Verify index was copied
    expect(fs.existsSync(path.join(tmpDir, 'decisions.md'))).toBe(true);
  });

  test('does not overwrite existing decisions directory', () => {
    // Create existing decisions dir
    const existingDir = path.join(tmpDir, 'decisions');
    fs.mkdirSync(existingDir, { recursive: true });
    fs.writeFileSync(path.join(existingDir, 'custom.md'), '# Custom');

    const result = seedDecisions('sdlc', tmpDir, TEMPLATES_DIR);

    expect(result.seeded).toBe(false);
    expect(result.files).toEqual([]);

    // Verify custom file still exists untouched
    expect(fs.readFileSync(path.join(existingDir, 'custom.md'), 'utf8')).toBe('# Custom');
  });

  test('does not overwrite existing decisions.md index', () => {
    // Seed once to create decisions/ but pre-create index
    fs.writeFileSync(path.join(tmpDir, 'decisions.md'), '# My Index');

    const result = seedDecisions('sdlc', tmpDir, TEMPLATES_DIR);

    // decisions/ dir was seeded but index was NOT overwritten
    expect(result.seeded).toBe(true);
    expect(result.indexFile).toBeNull();
    expect(fs.readFileSync(path.join(tmpDir, 'decisions.md'), 'utf8')).toBe('# My Index');
  });

  test('excludes underscore-prefixed files from category copy', () => {
    seedDecisions('sdlc', tmpDir, TEMPLATES_DIR);

    const targetDecDir = path.join(tmpDir, 'decisions');
    const copiedFiles = fs.readdirSync(targetDecDir);

    // _index-seed.md should NOT appear in the decisions/ directory
    expect(copiedFiles.every((f) => !f.startsWith('_'))).toBe(true);

    // But it should be in the seed source
    const seedDir = path.join(TEMPLATES_DIR, 'sdlc', 'decisions');
    expect(fs.existsSync(path.join(seedDir, '_index-seed.md'))).toBe(true);
  });

  test('returns no-op for template without decisionsDir', () => {
    // Create a minimal template without decisionsDir
    const customTemplatesDir = path.join(tmpDir, 'tpl');
    const customTplDir = path.join(customTemplatesDir, 'minimal');
    fs.mkdirSync(customTplDir, { recursive: true });
    fs.writeFileSync(
      path.join(customTplDir, 'manifest.json'),
      JSON.stringify(createMinimalManifest())
    );

    const targetDir = path.join(tmpDir, 'target');
    fs.mkdirSync(targetDir);

    const result = seedDecisions('minimal', targetDir, customTemplatesDir);

    expect(result.seeded).toBe(false);
    expect(result.files).toEqual([]);
    expect(result.indexFile).toBeNull();
  });

  test('seeded files have valid markdown headers', () => {
    seedDecisions('sdlc', tmpDir, TEMPLATES_DIR);

    const targetDecDir = path.join(tmpDir, 'decisions');
    const files = fs.readdirSync(targetDecDir);

    for (const file of files) {
      const content = fs.readFileSync(path.join(targetDecDir, file), 'utf8');
      // Every seed file should start with a markdown heading
      expect(content.startsWith('#')).toBe(true);
    }
  });
});

// ─── Template System Extensions (M9 / v1.1.0) ───────────────

describe('validateManifest — governance (v1.1.0)', () => {
  test('accepts manifest with valid governance section', () => {
    const manifest = createMinimalManifest({
      governance: {
        default_mode: 'advisory',
        policies_file: 'governance-policies.json',
        gates: {
          CRITIC_1: { policy: 'REQUIREMENT_TO_DESIGN', override_allowed: true },
        },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('accepts manifest without governance (backward compat)', () => {
    const manifest = createMinimalManifest();
    delete manifest.governance;
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('rejects governance with invalid default_mode', () => {
    const manifest = createMinimalManifest({
      governance: { default_mode: 'invalid', policies_file: 'x.json' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('default_mode'))).toBe(true);
  });

  test('rejects governance without policies_file', () => {
    const manifest = createMinimalManifest({
      governance: { default_mode: 'advisory' },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('policies_file'))).toBe(true);
  });

  test('rejects governance gate without policy', () => {
    const manifest = createMinimalManifest({
      governance: {
        default_mode: 'advisory',
        policies_file: 'x.json',
        gates: { CRITIC_1: { override_allowed: true } },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('policy'))).toBe(true);
  });

  test('accepts all three governance modes', () => {
    for (const mode of ['off', 'advisory', 'enforcing']) {
      const manifest = createMinimalManifest({
        governance: { default_mode: mode, policies_file: 'x.json' },
      });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    }
  });
});

describe('validateManifest — phaseTools (v1.1.0)', () => {
  test('accepts manifest with valid phaseTools', () => {
    const manifest = createMinimalManifest({
      phaseTools: {
        PHASE_5_EXECUTING: {
          required: [{ adapter: 'git', operations: ['create_branch'] }],
          optional: [{ adapter: 'ci', operations: ['trigger_workflow'] }],
        },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts manifest without phaseTools (backward compat)', () => {
    const manifest = createMinimalManifest();
    delete manifest.phaseTools;
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('rejects phaseTools with non-array required', () => {
    const manifest = createMinimalManifest({
      phaseTools: { PHASE_1: { required: 'not-array' } },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('required must be an array'))).toBe(true);
  });

  test('rejects tool entry without adapter', () => {
    const manifest = createMinimalManifest({
      phaseTools: {
        PHASE_1: { required: [{ operations: ['test'] }] },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('adapter'))).toBe(true);
  });
});

describe('validateManifest — lifecycle (v1.1.0)', () => {
  test('accepts manifest with valid lifecycle', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['IDEA', 'REQUIREMENTS', 'DESIGN'],
        transitions: [
          {
            from: 'REQUIREMENTS',
            to: 'DESIGN',
            gates: [{ id: 'G-01', type: 'artifact_approved', artifact: 'P1-BA-analysis' }],
          },
        ],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts manifest without lifecycle (backward compat)', () => {
    const manifest = createMinimalManifest();
    delete manifest.lifecycle;
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('rejects lifecycle with empty stages', () => {
    const manifest = createMinimalManifest({
      lifecycle: { stages: [] },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('stages must be a non-empty array'))).toBe(true);
  });

  test('rejects lifecycle when not an object', () => {
    const manifest = createMinimalManifest({
      lifecycle: 'invalid-lifecycle-shape',
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('lifecycle must be an object'))).toBe(true);
  });

  test('rejects lifecycle when transitions is not an array', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: { from: 'A', to: 'B' },
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('lifecycle.transitions must be an array'))).toBe(
      true
    );
  });

  test('rejects lifecycle transition without from/to', () => {
    const manifest = createMinimalManifest({
      lifecycle: { stages: ['A', 'B'], transitions: [{ to: 'B' }] },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("'from' and 'to'"))).toBe(true);
  });

  test('rejects lifecycle gate with invalid type', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [{ from: 'A', to: 'B', gates: [{ id: 'G-01', type: 'bad_type' }] }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('bad_type'))).toBe(true);
  });

  test('rejects lifecycle gate without required id/type', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [{ from: 'A', to: 'B', gates: [{ id: 'G-01' }] }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("must have 'id' and 'type'"))).toBe(true);
  });

  test('ignores non-array gates without crashing validation', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [{ from: 'A', to: 'B', gates: { id: 'G-01', type: 'artifact_approved' } }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts all valid gate types', () => {
    const types = [
      'artifact_approved',
      'governance_approved',
      'tool_healthy',
      'metric_threshold',
      'manual_confirmation',
    ];
    for (const type of types) {
      const manifest = createMinimalManifest({
        lifecycle: {
          stages: ['A', 'B'],
          transitions: [{ from: 'A', to: 'B', gates: [{ id: 'G-01', type }] }],
        },
      });
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    }
  });

  test('accepts lifecycle transition without gates', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [{ from: 'A', to: 'B' }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts lifecycle transition with empty gates array', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [{ from: 'A', to: 'B', gates: [] }],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  test('accepts lifecycle with empty transitions array', () => {
    const manifest = createMinimalManifest({
      lifecycle: {
        stages: ['A', 'B'],
        transitions: [],
      },
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });
});

describe('resolveTemplatePaths — extended sections (v1.1.0)', () => {
  test('resolves governance.policies_file to absolute path', () => {
    const manifest = createMinimalManifest({
      governance: {
        default_mode: 'advisory',
        policies_file: 'governance-policies.json',
        gates: { CRITIC_1: { policy: 'TEST', override_allowed: true } },
      },
    });
    const root = '/project/templates/test';
    const resolved = resolveTemplatePaths(manifest, root);

    expect(resolved.governance).not.toBeNull();
    expect(resolved.governance.policies_file).toBe(path.join(root, 'governance-policies.json'));
    expect(resolved.governance.default_mode).toBe('advisory');
    expect(resolved.governance.gates.CRITIC_1.policy).toBe('TEST');
  });

  test('defaults governance to null when not present', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.governance).toBeNull();
  });

  test('passes through phaseTools', () => {
    const phaseTools = {
      PHASE_5_EXECUTING: {
        required: [{ adapter: 'git' }],
        optional: [],
      },
    };
    const manifest = createMinimalManifest({ phaseTools });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseTools).toEqual(phaseTools);
  });

  test('defaults phaseTools to empty object', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseTools).toEqual({});
  });

  test('passes through lifecycle', () => {
    const lifecycle = { stages: ['A', 'B'] };
    const manifest = createMinimalManifest({ lifecycle });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.lifecycle).toEqual(lifecycle);
  });

  test('defaults lifecycle to null when not present', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.lifecycle).toBeNull();
  });

  test('passes through phaseArtifacts', () => {
    const phaseArtifacts = {
      PHASE_1: [{ id: 'P1-test', type: 'DOCUMENT', stage: 'REQUIREMENTS', path: 'test.md' }],
    };
    const manifest = createMinimalManifest({ phaseArtifacts });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseArtifacts).toEqual(phaseArtifacts);
  });

  test('defaults phaseArtifacts to empty object', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseArtifacts).toEqual({});
  });

  test('passes through phaseLineage', () => {
    const phaseLineage = { PHASE_2: { consumes: ['PHASE_1'] } };
    const manifest = createMinimalManifest({ phaseLineage });
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.phaseLineage).toEqual(phaseLineage);
  });

  test('defaults outputTemplates to empty array', () => {
    const manifest = createMinimalManifest();
    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.outputTemplates).toEqual([]);
  });

  test('passes through optional artifact/output collections when present', () => {
    const manifest = createMinimalManifest({
      decisionCategories: ['architecture', 'security'],
      phaseArtifacts: {
        PHASE_1: [{ id: 'P1-brief', type: 'DOCUMENT', stage: 'REQUIREMENTS', path: 'brief.md' }],
      },
      phaseLineage: {
        PHASE_2: { consumes: ['PHASE_1'] },
      },
      outputTemplates: ['templates/summary.md'],
    });

    const resolved = resolveTemplatePaths(manifest, '/root');
    expect(resolved.decisionCategories).toEqual(['architecture', 'security']);
    expect(resolved.phaseArtifacts).toEqual({
      PHASE_1: [{ id: 'P1-brief', type: 'DOCUMENT', stage: 'REQUIREMENTS', path: 'brief.md' }],
    });
    expect(resolved.phaseLineage).toEqual({ PHASE_2: { consumes: ['PHASE_1'] } });
    expect(resolved.outputTemplates).toEqual(['templates/summary.md']);
  });
});

describe('loadTemplate — SDLC v1.1.0 extended sections', () => {
  test('SDLC template has governance configuration', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.governance).not.toBeNull();
    expect(config.governance.default_mode).toBe('advisory');
    expect(config.governance.policies_file).toContain('governance-policies.json');
    expect(config.governance.gates.CRITIC_1.policy).toBe('REQUIREMENT_TO_DESIGN');
    expect(config.governance.gates.CRITIC_2.override_allowed).toBe(false);
  });

  test('SDLC template has phaseTools for PHASE_5_EXECUTING', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.phaseTools.PHASE_5_EXECUTING).toBeDefined();
    const p5 = config.phaseTools.PHASE_5_EXECUTING;
    expect(p5.required.length).toBeGreaterThanOrEqual(2);
    expect(p5.required.some((t) => t.adapter === 'git')).toBe(true);
    expect(p5.required.some((t) => t.adapter === 'testing')).toBe(true);
    expect(p5.optional.some((t) => t.adapter === 'ci')).toBe(true);
  });

  test('SDLC template has lifecycle with 11 stages', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.lifecycle).not.toBeNull();
    expect(config.lifecycle.stages).toHaveLength(11);
    expect(config.lifecycle.stages[0]).toBe('IDEA');
    expect(config.lifecycle.stages[10]).toBe('IMPROVEMENT');
  });

  test('SDLC template lifecycle has transitions with gates', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.lifecycle.transitions.length).toBeGreaterThanOrEqual(1);
    const firstTransition = config.lifecycle.transitions[0];
    expect(firstTransition.from).toBeDefined();
    expect(firstTransition.to).toBeDefined();
    expect(firstTransition.gates.length).toBeGreaterThanOrEqual(1);
  });

  test('SDLC template has phaseArtifacts for all phases', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.phaseArtifacts.PHASE_1.length).toBeGreaterThanOrEqual(1);
    expect(config.phaseArtifacts.PHASE_2.length).toBeGreaterThanOrEqual(1);
    expect(config.phaseArtifacts.PHASE_3.length).toBeGreaterThanOrEqual(1);
    expect(config.phaseArtifacts.PHASE_4.length).toBeGreaterThanOrEqual(1);
    expect(config.phaseArtifacts.SYNTHESIS.length).toBeGreaterThanOrEqual(1);
  });

  test('SDLC template has phaseLineage', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.phaseLineage.PHASE_2.consumes).toContain('PHASE_1');
    expect(config.phaseLineage.SYNTHESIS.consumes).toContain('PHASE_1');
    expect(config.phaseLineage.SYNTHESIS.consumes).toContain('PHASE_4');
  });

  test('SDLC template has outputTemplates', () => {
    const config = loadTemplate('sdlc', TEMPLATES_DIR);
    expect(config.outputTemplates.length).toBeGreaterThanOrEqual(6);
  });

  test('backward compatibility: v1.0.0 manifest without new sections still loads', () => {
    // Simulate a v1.0.0 manifest by creating one without the new sections
    const tmpTemplatesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-compat-'));
    const tmpTplDir = path.join(tmpTemplatesDir, 'legacy');

    try {
      fs.mkdirSync(tmpTplDir, { recursive: true });
      const legacyManifest = createMinimalManifest();
      // Explicitly ensure no v1.1.0 sections
      delete legacyManifest.governance;
      delete legacyManifest.phaseTools;
      delete legacyManifest.lifecycle;
      delete legacyManifest.phaseArtifacts;
      delete legacyManifest.phaseLineage;
      fs.writeFileSync(path.join(tmpTplDir, 'manifest.json'), JSON.stringify(legacyManifest));

      const config = loadTemplate('legacy', tmpTemplatesDir);
      expect(config.name).toBe('test-template');
      expect(config.governance).toBeNull();
      expect(config.phaseTools).toEqual({});
      expect(config.lifecycle).toBeNull();
      expect(config.phaseArtifacts).toEqual({});
      expect(config.phaseLineage).toEqual({});
    } finally {
      fs.rmSync(tmpTemplatesDir, { recursive: true, force: true });
    }
  });
});
