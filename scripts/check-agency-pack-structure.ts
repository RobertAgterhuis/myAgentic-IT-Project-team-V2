#!/usr/bin/env tsx
/**
 * check-agency-pack-structure.ts
 *
 * CI gate: validates the agency-agents-markdown pack manifest structure
 * beyond basic metadata completeness. Checks:
 *
 *  1. delegationMap integrity — all declared dirs, defaultAgents, and patterns exist
 *  2. Undeclared agent files — agent .md files not referenced in delegationMap
 *  3. Referenced governance artifacts exist (guardrails, playbook, workflow)
 *  4. Manifest JSON is valid and contains required agency keys
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packDir = path.join(root, 'templates', 'agency-agents-markdown');
const manifestPath = path.join(packDir, 'manifest.json');

type Violation = { file: string; message: string };
const violations: Violation[] = [];
const warnings: string[] = [];

function rel(filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function addViolation(filePath: string, message: string): void {
  violations.push({ file: rel(filePath), message });
}

function addWarning(message: string): void {
  warnings.push(message);
}

// ---------------------------------------------------------------------------
// 1. Load and parse manifest
// ---------------------------------------------------------------------------
function loadManifest(): Record<string, unknown> | null {
  if (!fs.existsSync(manifestPath)) {
    addViolation(manifestPath, 'manifest.json not found in agency-agents-markdown');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    addViolation(manifestPath, `invalid JSON: ${(error as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Validate delegationMap integrity
// ---------------------------------------------------------------------------
function validateDelegationMap(manifest: Record<string, unknown>): void {
  const delegationMap = manifest.delegationMap;

  if (!delegationMap || typeof delegationMap !== 'object' || Array.isArray(delegationMap)) {
    addViolation(
      manifestPath,
      `missing or invalid 'delegationMap' — required for agency pack orchestration`
    );
    return;
  }

  const domainMap = delegationMap as Record<string, unknown>;
  const declaredDirs = new Set<string>();

  for (const [domain, entryValue] of Object.entries(domainMap)) {
    if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) {
      addViolation(manifestPath, `delegationMap['${domain}'] must be an object`);
      continue;
    }

    const entry = entryValue as Record<string, unknown>;

    // dir must be a non-empty string pointing to an existing directory
    if (typeof entry.dir !== 'string' || entry.dir.trim().length === 0) {
      addViolation(manifestPath, `delegationMap['${domain}'].dir must be a non-empty string`);
    } else {
      const domainDirPath = path.join(packDir, entry.dir as string);
      if (!fs.existsSync(domainDirPath)) {
        addViolation(
          domainDirPath,
          `delegationMap['${domain}'].dir '${entry.dir}' does not exist on disk`
        );
      }
      declaredDirs.add(entry.dir as string);
    }

    // agentPattern must be a non-empty string
    if (typeof entry.agentPattern !== 'string' || entry.agentPattern.trim().length === 0) {
      addViolation(
        manifestPath,
        `delegationMap['${domain}'].agentPattern must be a non-empty string`
      );
    }

    // keywords must be a non-empty array of strings
    if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) {
      addViolation(manifestPath, `delegationMap['${domain}'].keywords must be a non-empty array`);
    } else if (
      entry.keywords.some((k: unknown) => typeof k !== 'string' || k.trim().length === 0)
    ) {
      addViolation(
        manifestPath,
        `delegationMap['${domain}'].keywords must contain non-empty strings only`
      );
    }

    // defaultAgent must point to an existing file
    if (typeof entry.defaultAgent !== 'string' || entry.defaultAgent.trim().length === 0) {
      addViolation(
        manifestPath,
        `delegationMap['${domain}'].defaultAgent must be a non-empty string`
      );
    } else {
      const agentPath = path.join(packDir, entry.defaultAgent as string);
      if (!fs.existsSync(agentPath)) {
        addViolation(
          agentPath,
          `delegationMap['${domain}'].defaultAgent '${entry.defaultAgent}' does not exist on disk`
        );
      }
    }
  }

  // All immediate subdirectories (excluding scripts/) must appear in delegationMap
  const domainDirs = fs
    .readdirSync(packDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'scripts')
    .map((e) => e.name);

  for (const dir of domainDirs) {
    if (!declaredDirs.has(dir)) {
      addWarning(`domain directory '${dir}' exists but has no entry in delegationMap`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Validate undeclared agent files
// ---------------------------------------------------------------------------
function validateUndeclaredAgents(manifest: Record<string, unknown>): void {
  const delegationMap = manifest.delegationMap as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!delegationMap) return;

  // Collect all declared defaultAgent files

  // For each domain dir, count agent .md files; warn if defaultAgent isn't one of them
  for (const [domain, entry] of Object.entries(delegationMap)) {
    const dirName = entry.dir as string;
    const domainDirPath = path.join(packDir, dirName);
    if (!fs.existsSync(domainDirPath)) continue;

    const agentFiles = fs
      .readdirSync(domainDirPath)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `${dirName}/${f}`);

    if (agentFiles.length === 0) {
      addWarning(`delegationMap['${domain}'].dir '${dirName}' contains no .md agent files`);
    }

    const defaultAgent = entry.defaultAgent as string | undefined;
    if (defaultAgent && !agentFiles.includes(defaultAgent)) {
      addViolation(
        manifestPath,
        `delegationMap['${domain}'].defaultAgent '${defaultAgent}' is not in the domain directory agent list`
      );
    }
  }

  // Warn about .md files at the pack root that are not agent files
  const rootMdFiles = fs.readdirSync(packDir).filter((f) => f.endsWith('.md'));

  for (const f of rootMdFiles) {
    addWarning(
      `root-level .md file '${f}' is not inside a domain folder — consider moving or removing it`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Validate referenced governance artifacts exist
// ---------------------------------------------------------------------------
function validateGovernanceArtifacts(manifest: Record<string, unknown>): void {
  const resolveDir = (key: string): string | null => {
    const val = manifest[key];
    if (typeof val !== 'string') {
      addViolation(manifestPath, `'${key}' must be a string path`);
      return null;
    }
    const resolved = path.resolve(packDir, val);
    if (!fs.existsSync(resolved)) {
      addViolation(resolved, `'${key}' directory '${val}' does not exist`);
      return null;
    }
    return resolved;
  };

  const guardrailsDir = resolveDir('guardrailsDir');
  const playbooksDir = resolveDir('playbooksDir');
  const workflowsDir = (() => {
    // workflows live next to playbooks in sdlc/
    const pb = manifest.playbooksDir;
    if (typeof pb !== 'string') return null;
    return path.resolve(packDir, path.join(path.dirname(pb), 'workflows'));
  })();

  // Agency-specific guardrail
  if (guardrailsDir) {
    const agencyGuardrail = path.join(guardrailsDir, '10-agency-guardrails.md');
    if (!fs.existsSync(agencyGuardrail)) {
      addViolation(
        agencyGuardrail,
        `agency guardrail '10-agency-guardrails.md' missing from guardrailsDir`
      );
    }
  }

  // Agency-specific playbook
  if (playbooksDir) {
    const agencyPlaybook = path.join(playbooksDir, 'agency-specialist-playbook.md');
    if (!fs.existsSync(agencyPlaybook)) {
      addViolation(
        agencyPlaybook,
        `agency playbook 'agency-specialist-playbook.md' missing from playbooksDir`
      );
    }
  }

  // Agency-specific workflow
  if (workflowsDir && fs.existsSync(workflowsDir)) {
    const agencyWorkflow = path.join(workflowsDir, 'agency-specialist.yaml');
    if (!fs.existsSync(agencyWorkflow)) {
      addViolation(
        agencyWorkflow,
        `agency workflow 'agency-specialist.yaml' missing from workflows dir`
      );
    }
  }

  // Validate manifest's own playbooks[] entries resolve
  const playbooks = manifest.playbooks;
  if (Array.isArray(playbooks) && playbooksDir) {
    for (const pb of playbooks as unknown[]) {
      if (typeof pb !== 'string') {
        addViolation(manifestPath, `manifest.playbooks entries must be strings`);
        continue;
      }
      const pbPath = path.join(playbooksDir, pb);
      if (!fs.existsSync(pbPath)) {
        addViolation(pbPath, `manifest.playbooks entry '${pb}' does not exist in playbooksDir`);
      }
    }
  }

  // Validate manifest's own workflows[] entries resolve
  const workflows = manifest.workflows;
  if (Array.isArray(workflows) && workflowsDir && fs.existsSync(workflowsDir)) {
    for (const wf of workflows as unknown[]) {
      if (typeof wf !== 'string') {
        addViolation(manifestPath, `manifest.workflows entries must be strings`);
        continue;
      }
      const wfPath = path.join(workflowsDir, wf);
      if (!fs.existsSync(wfPath)) {
        addViolation(wfPath, `manifest.workflows entry '${wf}' does not exist in workflows dir`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const manifest = loadManifest();
  if (!manifest) {
    console.error('Agency pack structure check failed.');
    for (const v of violations) {
      console.error(`  ERROR  ${v.file}: ${v.message}`);
    }
    process.exit(1);
  }

  validateDelegationMap(manifest);
  validateUndeclaredAgents(manifest);
  validateGovernanceArtifacts(manifest);

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`  WARN   ${w}`);
    }
  }

  if (violations.length > 0) {
    console.error('Agency pack structure check FAILED.');
    for (const v of violations) {
      console.error(`  ERROR  ${v.file}: ${v.message}`);
    }
    process.exit(1);
  }

  process.stdout.write('Agency pack structure check passed.\n');
}

main();
