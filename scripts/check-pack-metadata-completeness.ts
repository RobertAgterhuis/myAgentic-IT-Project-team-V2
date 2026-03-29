#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { loadFlows } from '../platform/engine/flow-loader';
import { getStore } from '../src/webapp/store';

type Violation = {
  file: string;
  message: string;
};

const root = process.cwd();
const templatesRoot = path.join(root, 'templates');
const flowsPath = path.join(root, 'platform', 'engine', 'flows.yaml');
const allowedCommandCategories = new Set(['create', 'audit', 'on-demand', 'session']);

const violations: Violation[] = [];

function rel(filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function addViolation(filePath: string, message: string): void {
  violations.push({ file: rel(filePath), message });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateTemplateManifest(manifestPath: string): void {
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    addViolation(manifestPath, `invalid JSON: ${(error as Error).message}`);
    return;
  }

  const requiredStringFields = ['schemaVersion', 'name', 'version', 'displayName', 'description'];
  for (const field of requiredStringFields) {
    if (!isNonEmptyString(manifest[field])) {
      addViolation(manifestPath, `missing or empty '${field}'`);
    }
  }

  const modes = manifest.modes;
  if (!modes || typeof modes !== 'object' || Array.isArray(modes)) {
    addViolation(manifestPath, `missing or invalid 'modes' object`);
  } else {
    const modeEntries = Object.entries(modes as Record<string, unknown>);
    if (modeEntries.length === 0) {
      addViolation(manifestPath, `'modes' must define at least one mode`);
    }
    for (const [modeName, modeValue] of modeEntries) {
      if (!modeValue || typeof modeValue !== 'object' || Array.isArray(modeValue)) {
        addViolation(manifestPath, `mode '${modeName}' must be an object`);
        continue;
      }

      const mode = modeValue as Record<string, unknown>;
      if (!Array.isArray(mode.phases)) {
        addViolation(manifestPath, `mode '${modeName}' must define 'phases' array`);
      } else if (mode.phases.some((phase) => !isNonEmptyString(phase))) {
        addViolation(manifestPath, `mode '${modeName}' contains invalid phase entries`);
      }

      if (!isNonEmptyString(mode.label)) {
        addViolation(manifestPath, `mode '${modeName}' must define non-empty 'label'`);
      }
    }
  }

  const commands = manifest.commands;
  if (!Array.isArray(commands) || commands.length === 0) {
    addViolation(manifestPath, `'commands' must be a non-empty array`);
  } else {
    const commandIds = new Set<string>();
    for (const [index, commandValue] of commands.entries()) {
      if (!commandValue || typeof commandValue !== 'object' || Array.isArray(commandValue)) {
        addViolation(manifestPath, `commands[${index}] must be an object`);
        continue;
      }

      const command = commandValue as Record<string, unknown>;
      const id = command.id;
      if (!isNonEmptyString(id)) {
        addViolation(manifestPath, `commands[${index}].id must be a non-empty string`);
      } else {
        if (commandIds.has(id)) {
          addViolation(manifestPath, `duplicate command id '${id}'`);
        }
        commandIds.add(id);
      }

      if (!isNonEmptyString(command.label)) {
        addViolation(manifestPath, `commands[${index}].label must be a non-empty string`);
      }

      if (!isNonEmptyString(command.description)) {
        addViolation(manifestPath, `commands[${index}].description must be a non-empty string`);
      }

      if (!isNonEmptyString(command.category)) {
        addViolation(manifestPath, `commands[${index}].category must be a non-empty string`);
      } else if (!allowedCommandCategories.has(command.category)) {
        addViolation(
          manifestPath,
          `commands[${index}].category '${command.category}' must be one of: ${[...allowedCommandCategories].join(', ')}`
        );
      }
    }
  }

  const stages = manifest.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    addViolation(manifestPath, `'stages' must be a non-empty array`);
  } else {
    const stageIds = new Set<string>();
    for (const [index, stageValue] of stages.entries()) {
      if (!stageValue || typeof stageValue !== 'object' || Array.isArray(stageValue)) {
        addViolation(manifestPath, `stages[${index}] must be an object`);
        continue;
      }

      const stage = stageValue as Record<string, unknown>;
      const id = stage.id;
      if (!isNonEmptyString(id)) {
        addViolation(manifestPath, `stages[${index}].id must be a non-empty string`);
      } else {
        if (stageIds.has(id)) {
          addViolation(manifestPath, `duplicate stage id '${id}'`);
        }
        stageIds.add(id);
      }

      if (!isNonEmptyString(stage.label)) {
        addViolation(manifestPath, `stages[${index}].label must be a non-empty string`);
      }

      if (typeof stage.order !== 'number' || !Number.isFinite(stage.order)) {
        addViolation(manifestPath, `stages[${index}].order must be a finite number`);
      }
    }
  }
}

function validateTemplates(): void {
  if (!fs.existsSync(templatesRoot)) {
    addViolation(templatesRoot, `templates directory not found`);
    return;
  }

  const entries = fs.readdirSync(templatesRoot, { withFileTypes: true });
  const templateDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (templateDirs.length === 0) {
    addViolation(templatesRoot, `no template directories found`);
    return;
  }

  for (const dirName of templateDirs) {
    const manifestPath = path.join(templatesRoot, dirName, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      addViolation(path.join(templatesRoot, dirName), `missing manifest.json`);
      continue;
    }
    validateTemplateManifest(manifestPath);
  }
}

function validateRuntimePackMetadata(): void {
  if (!fs.existsSync(flowsPath)) {
    addViolation(flowsPath, `flows.yaml not found`);
    return;
  }

  try {
    const flows = loadFlows(getStore(), flowsPath) as Record<string, unknown>;

    const requiredStrings = ['manifest_version', 'pack_id', 'pack_name', 'version'];
    for (const field of requiredStrings) {
      if (!isNonEmptyString(flows[field])) {
        addViolation(flowsPath, `missing or empty '${field}' in runtime flow pack metadata`);
      }
    }

    for (const field of ['commands', 'stages', 'gates']) {
      const value = flows[field];
      if (!Array.isArray(value) || value.length === 0) {
        addViolation(
          flowsPath,
          `'${field}' must be a non-empty array in runtime flow pack metadata`
        );
      }
    }

    const runtimeGraph = flows.runtimeGraph as { warnings?: unknown } | undefined;
    if (!runtimeGraph || typeof runtimeGraph !== 'object') {
      addViolation(flowsPath, `runtimeGraph is missing from compiled flow metadata`);
    } else if (Array.isArray(runtimeGraph.warnings) && runtimeGraph.warnings.length > 0) {
      addViolation(
        flowsPath,
        `runtimeGraph contains warnings: ${(runtimeGraph.warnings as unknown[]).join('; ')}`
      );
    }
  } catch (error) {
    addViolation(flowsPath, `failed to load flow metadata: ${(error as Error).message}`);
  }
}

function main(): void {
  validateTemplates();
  validateRuntimePackMetadata();

  if (violations.length > 0) {
    console.error('Pack metadata completeness check failed.');
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.message}`);
    }
    process.exit(1);
  }

  process.stdout.write('Pack metadata completeness check passed.\n');
}

main();
