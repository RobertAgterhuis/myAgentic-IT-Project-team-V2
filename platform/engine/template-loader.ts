/**
 * Template Loader — Discovers, validates, and loads template packs (M14 / S1)
 *
 * Scans the templates/ directory for valid template packs (directories
 * containing a manifest.json), validates the manifest against the JSON
 * Schema, and returns a structured template configuration that the engine
 * uses to configure state machine, dispatcher, and gate validator.
 *
 * @module platform/engine/template-loader
 */

import fs from 'node:fs';
import path from 'node:path';

// ─── Constants ───────────────────────────────────────────────

const MANIFEST_FILENAME = 'manifest.json';
const DEFAULT_TEMPLATES_DIR = 'templates';
const DEFAULT_TEMPLATE = 'sdlc';

// ─── Schema Validation ──────────────────────────────────────

/**
 * Required top-level keys in a valid manifest.
 * Used for lightweight validation when JSON Schema (ajv) is not available.
 */
const REQUIRED_MANIFEST_KEYS = [
  'schemaVersion',
  'name',
  'version',
  'description',
  'flowsFile',
  'agentsDir',
  'contractsDir',
  'guardrailsDir',
  'phaseAgents',
  'phaseContracts',
  'phaseGuardrails',
  'criticToPhase',
  'modes',
];

// ─── Core Functions ──────────────────────────────────────────

/**
 * Discover available template packs in the templates directory.
 *
 * @param {string} [templatesDir] - Absolute path to the templates directory.
 *   Defaults to `<projectRoot>/templates`.
 * @returns {string[]} Array of template names (directory names).
 */
function discoverTemplates(templatesDir?: string) {
  const dir = templatesDir || path.resolve(process.cwd(), DEFAULT_TEMPLATES_DIR);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const manifestPath = path.join(dir, entry.name, MANIFEST_FILENAME);
      return fs.existsSync(manifestPath);
    })
    .map((entry) => entry.name);
}

/**
 * Load and parse a template manifest from disk.
 *
 * @param {string} templateName - Template directory name (e.g. 'sdlc').
 * @param {string} [templatesDir] - Override templates base directory.
 * @returns {object} Parsed manifest object.
 * @throws {Error} If manifest file is missing or contains invalid JSON.
 */
function loadManifest(templateName?: string, templatesDir?: string) {
  const dir = templatesDir || path.resolve(process.cwd(), DEFAULT_TEMPLATES_DIR);
  const manifestPath = path.join(dir, templateName, MANIFEST_FILENAME);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Template manifest not found: ${manifestPath}. ` +
        `Ensure template '${templateName}' exists in '${dir}'.`
    );
  }

  const raw = fs.readFileSync(manifestPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in template manifest '${manifestPath}': ${err.message}`);
  }
}

/**
 * Validate a manifest object against required structure.
 * Performs lightweight validation without requiring ajv.
 *
 * @param {object} manifest - Parsed manifest object.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateManifest(manifest: Record<string, unknown>) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object'] };
  }

  // Check required top-level keys
  for (const key of REQUIRED_MANIFEST_KEYS) {
    if (!(key in manifest)) {
      errors.push(`Missing required key: '${key}'`);
    }
  }

  // Validate schemaVersion format
  if (manifest.schemaVersion && !/^\d+\.\d+\.\d+$/.test(manifest.schemaVersion as string)) {
    errors.push(`Invalid schemaVersion format: '${manifest.schemaVersion}' (expected semver)`);
  }

  // Validate name is lowercase kebab
  if (manifest.name && !/^[a-z][a-z0-9-]*$/.test(manifest.name as string)) {
    errors.push(`Invalid name: '${manifest.name}' (must be lowercase kebab-case)`);
  }

  // Validate phaseAgents structure
  if (manifest.phaseAgents && typeof manifest.phaseAgents === 'object') {
    for (const [state, agents] of Object.entries(manifest.phaseAgents)) {
      if (!Array.isArray(agents)) {
        errors.push(`phaseAgents['${state}'] must be an array`);
        continue;
      }
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        if (!agent.id || !agent.name) {
          errors.push(`phaseAgents['${state}'][${i}] must have 'id' and 'name'`);
        }
      }
    }
  }

  // Validate modes structure
  if (manifest.modes && typeof manifest.modes === 'object') {
    for (const [mode, config] of Object.entries(manifest.modes) as [
      string,
      Record<string, unknown>,
    ][]) {
      if (!config.label) {
        errors.push(`modes['${mode}'] must have a 'label'`);
      }
      if (!Array.isArray(config.phases)) {
        errors.push(`modes['${mode}'].phases must be an array`);
      }
    }
  }

  // Validate criticToPhase maps CRITIC_N → PHASE_N
  if (manifest.criticToPhase && typeof manifest.criticToPhase === 'object') {
    for (const [critic, phase] of Object.entries(manifest.criticToPhase)) {
      if (!/^CRITIC_\d+$/.test(critic)) {
        errors.push(`criticToPhase key '${critic}' must match CRITIC_N pattern`);
      }
      if (!/^PHASE_\d+$/.test(phase as string)) {
        errors.push(`criticToPhase['${critic}'] value '${phase}' must match PHASE_N pattern`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolve template-relative paths to absolute paths.
 *
 * @param {object} manifest - Validated manifest object.
 * @param {string} templateRoot - Absolute path to the template directory.
 * @returns {object} Resolved configuration with absolute paths.
 */
function resolveTemplatePaths(manifest: Record<string, unknown>, templateRoot: string) {
  return {
    name: manifest.name,
    version: manifest.version,
    displayName: manifest.displayName || manifest.name,
    description: manifest.description,
    templateRoot,
    flowsFile: path.join(templateRoot, manifest.flowsFile as string),
    agentsDir: path.join(templateRoot, manifest.agentsDir as string),
    contractsDir: path.join(templateRoot, manifest.contractsDir as string),
    guardrailsDir: path.join(templateRoot, manifest.guardrailsDir as string),
    playbooksDir: manifest.playbooksDir
      ? path.join(templateRoot, manifest.playbooksDir as string)
      : null,
    decisionsDir: manifest.decisionsDir
      ? path.join(templateRoot, manifest.decisionsDir as string)
      : null,
    decisionIndexSeed: manifest.decisionIndexSeed
      ? path.join(templateRoot, manifest.decisionIndexSeed as string)
      : null,
    phaseAgents: manifest.phaseAgents,
    phaseContracts: manifest.phaseContracts,
    phaseGuardrails: manifest.phaseGuardrails,
    criticToPhase: manifest.criticToPhase,
    modes: manifest.modes,
    decisionCategories: manifest.decisionCategories || [],
  };
}

/**
 * Load a template by name: discover, parse, validate, and resolve paths.
 * This is the main entry point used by the engine.
 *
 * @param {string} [templateName] - Template to load. Defaults to 'sdlc'.
 * @param {string} [templatesDir] - Override templates base directory.
 * @returns {object} Fully resolved template configuration.
 * @throws {Error} If template not found or manifest invalid.
 */
function loadTemplate(templateName?: string, templatesDir?: string) {
  const name = templateName || DEFAULT_TEMPLATE;
  const dir = templatesDir || path.resolve(process.cwd(), DEFAULT_TEMPLATES_DIR);

  const manifest = loadManifest(name, dir);
  const validation = validateManifest(manifest);

  if (!validation.valid) {
    throw new Error(
      `Invalid template manifest for '${name}':\n` +
        validation.errors.map((e) => `  - ${e}`).join('\n')
    );
  }

  const templateRoot = path.join(dir, name);
  return resolveTemplatePaths(manifest, templateRoot);
}

/**
 * List all available templates with their metadata.
 *
 * @param {string} [templatesDir] - Override templates base directory.
 * @returns {Array<{name: string, displayName: string, version: string, description: string, valid: boolean, errors: string[]}>}
 */
function listTemplates(templatesDir?: string) {
  const dir = templatesDir || path.resolve(process.cwd(), DEFAULT_TEMPLATES_DIR);
  const names = discoverTemplates(dir);

  return names.map((name) => {
    try {
      const manifest = loadManifest(name, dir);
      const validation = validateManifest(manifest);
      return {
        name: manifest.name || name,
        displayName: manifest.displayName || manifest.name || name,
        version: manifest.version || 'unknown',
        description: manifest.description || '',
        valid: validation.valid,
        errors: validation.errors,
      };
    } catch (err) {
      return {
        name,
        displayName: name,
        version: 'unknown',
        description: '',
        valid: false,
        errors: [err.message],
      };
    }
  });
}

/**
 * Seed decision files from a template into a project directory.
 *
 * Copies all decision category files and the index seed from the template's
 * decisions directory into the target project directory. Only seeds when the
 * target decisions directory does not already exist (never overwrites).
 *
 * @param {string} templateName - Template to seed from (e.g. 'sdlc').
 * @param {string} targetDir - Absolute path to the project root (e.g. BusinessDocs/).
 * @param {string} [templatesDir] - Override templates base directory.
 * @returns {{ seeded: boolean, files: string[], indexFile: string|null }}
 */
function seedDecisions(templateName?: string, targetDir?: string, templatesDir?: string) {
  const config = loadTemplate(templateName, templatesDir);

  if (!config.decisionsDir || !fs.existsSync(config.decisionsDir)) {
    return { seeded: false, files: [], indexFile: null };
  }

  const targetDecisionsDir = path.join(targetDir, 'decisions');

  // Never overwrite existing decisions
  if (fs.existsSync(targetDecisionsDir)) {
    return { seeded: false, files: [], indexFile: null };
  }

  fs.mkdirSync(targetDecisionsDir, { recursive: true });

  // Copy category files (exclude _index-seed.md)
  const seedFiles = fs
    .readdirSync(config.decisionsDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  const copiedFiles = [];

  for (const file of seedFiles) {
    const srcPath = path.join(config.decisionsDir, file);
    const destPath = path.join(targetDecisionsDir, file);
    fs.copyFileSync(srcPath, destPath);
    copiedFiles.push(file);
  }

  // Copy index seed to target root as decisions.md
  let indexFile = null;
  if (config.decisionIndexSeed && fs.existsSync(config.decisionIndexSeed)) {
    const destIndex = path.join(targetDir, 'decisions.md');
    if (!fs.existsSync(destIndex)) {
      fs.copyFileSync(config.decisionIndexSeed, destIndex);
      indexFile = 'decisions.md';
    }
  }

  return { seeded: true, files: copiedFiles, indexFile };
}

export {
  MANIFEST_FILENAME,
  DEFAULT_TEMPLATES_DIR,
  DEFAULT_TEMPLATE,
  REQUIRED_MANIFEST_KEYS,
  discoverTemplates,
  loadManifest,
  validateManifest,
  resolveTemplatePaths,
  loadTemplate,
  listTemplates,
  seedDecisions,
};
