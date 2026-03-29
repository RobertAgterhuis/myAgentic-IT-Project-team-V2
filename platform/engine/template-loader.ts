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
import { compileAgentPhaseMap } from './dispatcher';

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
  'phaseContracts',
  'phaseGuardrails',
  'criticToPhase',
  'modes',
];

const DEFAULT_ARTIFACT_NAMESPACES = Object.freeze({
  business_docs: 'BusinessDocs',
});

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
  const resolvedTemplateName = templateName || DEFAULT_TEMPLATE;
  const manifestPath = path.join(dir, resolvedTemplateName, MANIFEST_FILENAME);

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
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in template manifest '${manifestPath}': ${message}`);
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
  const errors: string[] = [];

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

  // Validate phaseAgents structure (optional; defaults from canonical schema)
  const phaseAgents = manifest.phaseAgents;
  if (phaseAgents !== undefined && typeof phaseAgents !== 'object') {
    errors.push('phaseAgents must be an object when provided');
  } else if (phaseAgents && typeof phaseAgents === 'object') {
    for (const [state, agents] of Object.entries(phaseAgents)) {
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
      const hasArrayPhases = Array.isArray(config.phases);
      if (!hasArrayPhases) {
        errors.push(`modes['${mode}'].phases must be an array`);
      }
    }
  }

  // Validate artifactNamespaces structure (optional)
  if (manifest.artifactNamespaces !== undefined) {
    if (typeof manifest.artifactNamespaces !== 'object' || manifest.artifactNamespaces === null) {
      errors.push('artifactNamespaces must be an object');
    } else {
      for (const [key, namespacePath] of Object.entries(manifest.artifactNamespaces)) {
        if (!/^[a-z][a-z0-9_]*$/.test(key)) {
          errors.push(
            `artifactNamespaces key '${key}' must be lowercase snake_case starting with a letter`
          );
        }
        if (typeof namespacePath !== 'string' || namespacePath.trim() === '') {
          errors.push(`artifactNamespaces['${key}'] must be a non-empty string`);
        }
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

  // Validate governance structure (optional, v1.1.0+)
  if (manifest.governance !== undefined) {
    const gov = manifest.governance as Record<string, unknown>;
    if (typeof gov !== 'object' || gov === null) {
      errors.push('governance must be an object');
    } else {
      const validModes = ['off', 'advisory', 'enforcing'];
      if (!gov.default_mode || !validModes.includes(gov.default_mode as string)) {
        errors.push(`governance.default_mode must be one of: ${validModes.join(', ')}`);
      }
      if (!gov.policies_file || typeof gov.policies_file !== 'string') {
        errors.push('governance.policies_file must be a non-empty string');
      }
      if (gov.gates !== undefined) {
        if (typeof gov.gates !== 'object' || gov.gates === null) {
          errors.push('governance.gates must be an object');
        } else {
          for (const [gateId, gateCfg] of Object.entries(
            gov.gates as Record<string, Record<string, unknown>>
          )) {
            if (!gateCfg.policy || typeof gateCfg.policy !== 'string') {
              errors.push(`governance.gates['${gateId}'].policy must be a non-empty string`);
            }
          }
        }
      }
    }
  }

  // Validate phaseTools structure (optional, v1.1.0+)
  if (manifest.phaseTools !== undefined) {
    if (typeof manifest.phaseTools !== 'object' || manifest.phaseTools === null) {
      errors.push('phaseTools must be an object');
    } else {
      for (const [phase, toolCfg] of Object.entries(
        manifest.phaseTools as Record<string, Record<string, unknown>>
      )) {
        if (toolCfg.required !== undefined && !Array.isArray(toolCfg.required)) {
          errors.push(`phaseTools['${phase}'].required must be an array`);
        }
        if (toolCfg.optional !== undefined && !Array.isArray(toolCfg.optional)) {
          errors.push(`phaseTools['${phase}'].optional must be an array`);
        }
        const allTools = [
          ...((toolCfg.required || []) as Array<Record<string, unknown>>),
          ...((toolCfg.optional || []) as Array<Record<string, unknown>>),
        ];
        for (let i = 0; i < allTools.length; i++) {
          if (!allTools[i].adapter || typeof allTools[i].adapter !== 'string') {
            errors.push(`phaseTools['${phase}'] tool[${i}] must have an 'adapter' string`);
          }
        }
      }
    }
  }

  // Validate lifecycle structure (optional, v1.1.0+)
  if (manifest.lifecycle !== undefined) {
    const lc = manifest.lifecycle as Record<string, unknown>;
    if (typeof lc !== 'object' || lc === null) {
      errors.push('lifecycle must be an object');
    } else {
      if (!Array.isArray(lc.stages) || lc.stages.length === 0) {
        errors.push('lifecycle.stages must be a non-empty array');
      }
      if (lc.transitions !== undefined) {
        if (!Array.isArray(lc.transitions)) {
          errors.push('lifecycle.transitions must be an array');
        } else {
          const validGateTypes = [
            'artifact_approved',
            'governance_approved',
            'tool_healthy',
            'metric_threshold',
            'manual_confirmation',
          ];
          for (let i = 0; i < lc.transitions.length; i++) {
            const t = lc.transitions[i] as Record<string, unknown>;
            if (!t.from || !t.to) {
              errors.push(`lifecycle.transitions[${i}] must have 'from' and 'to'`);
            }
            if (t.gates && Array.isArray(t.gates)) {
              for (let g = 0; g < (t.gates as Array<Record<string, unknown>>).length; g++) {
                const gate = (t.gates as Array<Record<string, unknown>>)[g];
                if (!gate.id || !gate.type) {
                  errors.push(`lifecycle.transitions[${i}].gates[${g}] must have 'id' and 'type'`);
                } else if (!validGateTypes.includes(gate.type as string)) {
                  errors.push(
                    `lifecycle.transitions[${i}].gates[${g}].type '${gate.type}' is invalid (${validGateTypes.join(', ')})`
                  );
                }
              }
            }
          }
        }
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
  const computedPhaseAgents = compileAgentPhaseMap();
  const decisionCategories =
    manifest.decisionCategories !== undefined && manifest.decisionCategories !== null
      ? manifest.decisionCategories
      : [];
  const phaseArtifacts =
    manifest.phaseArtifacts !== undefined && manifest.phaseArtifacts !== null
      ? manifest.phaseArtifacts
      : {};
  const phaseLineage =
    manifest.phaseLineage !== undefined && manifest.phaseLineage !== null
      ? manifest.phaseLineage
      : {};
  const outputTemplates =
    manifest.outputTemplates !== undefined && manifest.outputTemplates !== null
      ? manifest.outputTemplates
      : [];
  const artifactNamespaces = {
    ...DEFAULT_ARTIFACT_NAMESPACES,
    ...((manifest.artifactNamespaces as Record<string, string>) || {}),
  };
  const resolveArtifactPath = (rawPath: string) => {
    const namespaced = rawPath.match(/^([a-z][a-z0-9_]*):(.+)$/i);
    if (namespaced) {
      const namespaceKey = namespaced[1].toLowerCase();
      const relativePath = namespaced[2].replace(/^\/+/, '');
      const namespaceRoot = artifactNamespaces[namespaceKey];
      return namespaceRoot ? path.join(namespaceRoot, relativePath) : rawPath;
    }

    if (rawPath.startsWith('BusinessDocs/') && artifactNamespaces.business_docs) {
      return path.join(artifactNamespaces.business_docs, rawPath.slice('BusinessDocs/'.length));
    }

    return rawPath;
  };
  const resolvedPhaseArtifacts = Object.fromEntries(
    Object.entries(phaseArtifacts as Record<string, Array<Record<string, unknown>>>).map(
      ([phase, declarations]) => [
        phase,
        (declarations || []).map((declaration) => ({
          ...declaration,
          path:
            typeof declaration.path === 'string'
              ? resolveArtifactPath(declaration.path)
              : declaration.path,
        })),
      ]
    )
  );

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
    phaseAgents: manifest.phaseAgents || computedPhaseAgents,
    phaseContracts: manifest.phaseContracts,
    phaseGuardrails: manifest.phaseGuardrails,
    artifactNamespaces,
    criticToPhase: manifest.criticToPhase,
    modes: manifest.modes,
    decisionCategories,
    phaseArtifacts: resolvedPhaseArtifacts,
    phaseLineage,
    outputTemplates,
    governance: manifest.governance
      ? {
          ...(manifest.governance as Record<string, unknown>),
          policies_file: path.join(
            templateRoot,
            (manifest.governance as Record<string, string>).policies_file
          ),
        }
      : null,
    phaseTools: manifest.phaseTools || {},
    lifecycle: manifest.lifecycle || null,
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
      const message = err instanceof Error ? err.message : String(err);
      return {
        name,
        displayName: name,
        version: 'unknown',
        description: '',
        valid: false,
        errors: [message],
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
  const resolvedTargetDir = targetDir || process.cwd();

  if (!config.decisionsDir || !fs.existsSync(config.decisionsDir)) {
    return { seeded: false, files: [], indexFile: null };
  }

  const targetDecisionsDir = path.join(resolvedTargetDir, 'decisions');

  // Never overwrite existing decisions
  if (fs.existsSync(targetDecisionsDir)) {
    return { seeded: false, files: [], indexFile: null };
  }

  fs.mkdirSync(targetDecisionsDir, { recursive: true });

  // Copy category files (exclude _index-seed.md)
  const seedFiles = fs
    .readdirSync(config.decisionsDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  const copiedFiles: string[] = [];

  for (const file of seedFiles) {
    const srcPath = path.join(config.decisionsDir, file);
    const destPath = path.join(targetDecisionsDir, file);
    fs.copyFileSync(srcPath, destPath);
    copiedFiles.push(file);
  }

  // Copy index seed to target root as decisions.md
  let indexFile: string | null = null;
  if (config.decisionIndexSeed && fs.existsSync(config.decisionIndexSeed)) {
    const destIndex = path.join(resolvedTargetDir, 'decisions.md');
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
