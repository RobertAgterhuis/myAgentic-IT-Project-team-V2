/**
 * Flow Loader — Standards-based YAML parser for flows.yaml (FEAT-05-A / AC-1)
 *
 * Uses a maintained YAML parser and then normalizes the shape expected by the
 * orchestrator runtime.
 *
 * @module orchestrator/flow-loader
 */

import path from 'path';
import { parse } from 'yaml';

// ─── YAML Parsing & Normalization ───────────────────────────

/**
 * Parse the flows.yaml subset into a JS object.
 * Handles: comments (#), top-level keys, arrays (- item),
 * nested maps (two-level), inline strings, and inline arrays ([]).
 *
 * @param {string} content - Raw YAML content
 * @returns {object} Parsed flow definition
 */
type ModeConfig = Record<string, string | string[]>;
interface ParsedFlowYaml {
  states?: string[];
  full_flow?: string[];
  structural_states?: string[];
  events?: string[];
  modes?: Record<string, ModeConfig>;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInlineValue(val: string) {
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(',').map((s) => s.trim());
  }
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

function normalizeModeConfig(modeName: string, modeConfig: unknown): ModeConfig {
  if (!isRecord(modeConfig)) {
    throw new Error(`Invalid mode config for "${modeName}": expected mapping`);
  }

  const normalized: ModeConfig = {};
  for (const [key, value] of Object.entries(modeConfig)) {
    if (Array.isArray(value)) {
      if (value.some((item) => typeof item !== 'string')) {
        throw new Error(`Invalid mode property "${modeName}.${key}": expected array of strings`);
      }
      normalized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      normalized[key] = value;
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    throw new Error(`Invalid mode property "${modeName}.${key}": expected string or array`);
  }

  return normalized;
}

function parseFlowYaml(content: string): ParsedFlowYaml {
  let parsed: unknown;
  try {
    parsed = parse(content, { uniqueKeys: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parsing error';
    throw new Error(`Invalid flows.yaml: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid flows.yaml: root value must be a mapping');
  }

  const result: ParsedFlowYaml = { ...parsed };

  if (parsed.modes !== undefined) {
    if (!isRecord(parsed.modes)) {
      throw new Error('Invalid flows.yaml: modes must be a mapping');
    }
    const normalizedModes: Record<string, ModeConfig> = {};
    for (const [modeName, modeConfig] of Object.entries(parsed.modes)) {
      normalizedModes[modeName] = normalizeModeConfig(modeName, modeConfig);
    }
    result.modes = normalizedModes;
  }

  return result;
}

// ─── Flow Loader ────────────────────────────────────────────

interface FlowStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

/**
 * Load and validate flows.yaml.
 * @param {object} store - Store abstraction (read/exists)
 * @param {string} [flowsPath] - Override path to flows.yaml
 * @returns {object} Validated flow definition { states, full_flow, structural_states, modes, events }
 * @throws {Error} If file is missing or validation fails
 */
function loadFlows(store: FlowStore, flowsPath?: string) {
  const filePath = flowsPath || path.join(__dirname, 'flows.yaml');

  if (!store.exists(filePath)) {
    throw new Error(`Flow definition not found: ${filePath}`);
  }

  const content = store.readFile(filePath);
  const parsed = parseFlowYaml(content);

  // Validate required sections
  const required: Array<keyof ParsedFlowYaml> = [
    'states',
    'full_flow',
    'structural_states',
    'modes',
    'events',
  ];
  for (const key of required) {
    if (!parsed[key]) {
      throw new Error(`flows.yaml missing required section: ${key}`);
    }
  }

  const states = Array.isArray(parsed.states) ? parsed.states : [];
  const fullFlow = Array.isArray(parsed.full_flow) ? parsed.full_flow : [];
  const structuralStates = Array.isArray(parsed.structural_states) ? parsed.structural_states : [];
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  const modes = parsed.modes ?? {};

  // Validate that full_flow entries are in states
  const stateSet = new Set(states);
  for (const s of fullFlow) {
    if (!stateSet.has(s)) {
      throw new Error(`full_flow references unknown state: ${s}`);
    }
  }

  // Validate mode phases reference real states
  for (const [modeName, modeConfig] of Object.entries(modes)) {
    if (!modeConfig.phases) {
      throw new Error(`Mode "${modeName}" missing phases property`);
    }
    if (!modeConfig.label) {
      throw new Error(`Mode "${modeName}" missing label property`);
    }
  }

  return {
    states,
    full_flow: fullFlow,
    structural_states: structuralStates,
    modes,
    events,
  };
}

export { parseFlowYaml, parseInlineValue, loadFlows };
