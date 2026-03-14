'use strict';

/**
 * Flow Loader — Minimal YAML-subset parser for flows.yaml (FEAT-05-A / AC-1)
 *
 * Zero external dependencies. Parses the simple structure used in flows.yaml:
 *   - Top-level keys (no nesting beyond mode config)
 *   - Arrays of strings (prefixed with "  - ")
 *   - Nested maps (modes → { phases: [], label: string })
 *
 * @module orchestrator/flow-loader
 */

const path = require('path');

// ─── Minimal YAML Parser ────────────────────────────────────

/**
 * Parse the flows.yaml subset into a JS object.
 * Handles: comments (#), top-level keys, arrays (- item),
 * nested maps (two-level), inline strings, and inline arrays ([]).
 *
 * @param {string} content - Raw YAML content
 * @returns {object} Parsed flow definition
 */
function parseFlowYaml(content) {
  const result = {};
  let currentKey = null;
  let currentMode = null;
  let modeKey = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.replace(/#.*$/, '').trimEnd();

    if (stripped.length === 0) continue;

    const indent = raw.search(/\S/);

    // Top-level key (indent 0, ends with ':')
    if (indent === 0 && stripped.endsWith(':')) {
      currentKey = stripped.slice(0, -1).trim();
      currentMode = null;
      modeKey = null;
      if (!result[currentKey]) result[currentKey] = null;
      continue;
    }

    // Top-level key with inline value (indent 0, contains ':')
    if (indent === 0 && stripped.includes(':')) {
      const colonIdx = stripped.indexOf(':');
      const key = stripped.slice(0, colonIdx).trim();
      const val = stripped.slice(colonIdx + 1).trim();
      result[key] = parseInlineValue(val);
      currentKey = null;
      currentMode = null;
      continue;
    }

    if (currentKey === null) continue;

    // Mode-level nested map entry (indent 2, ends with ':')
    if (indent === 2 && stripped.trimStart().endsWith(':')) {
      const name = stripped.trimStart().slice(0, -1);
      if (currentKey === 'modes') {
        if (!result.modes) result.modes = {};
        result.modes[name] = {};
        currentMode = name;
        modeKey = null;
      }
      continue;
    }

    // Mode property (indent 4, has ':')
    if (indent === 4 && currentMode && stripped.includes(':')) {
      const colonIdx = stripped.trimStart().indexOf(':');
      const propName = stripped.trimStart().slice(0, colonIdx).trim();
      const propVal = stripped
        .trimStart()
        .slice(colonIdx + 1)
        .trim();

      if (propVal.length > 0 && propVal !== '') {
        result.modes[currentMode][propName] = parseInlineValue(propVal);
        modeKey = null;
      } else {
        // Property without inline value (array follows)
        modeKey = propName;
        result.modes[currentMode][propName] = [];
      }
      continue;
    }

    // Array item under mode property (indent 6, starts with "- ")
    if (indent === 6 && currentMode && modeKey && stripped.trimStart().startsWith('- ')) {
      const item = stripped.trimStart().slice(2).trim();
      result.modes[currentMode][modeKey].push(item);
      continue;
    }

    // Top-level array item (indent 2, starts with "- ")
    if (indent === 2 && stripped.trimStart().startsWith('- ')) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      const item = stripped.trimStart().slice(2).trim();
      result[currentKey].push(item);
      continue;
    }
  }

  return result;
}

/**
 * Parse an inline YAML value.
 * Handles: inline arrays [a, b], quoted strings, plain strings.
 */
function parseInlineValue(val) {
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(',').map((s) => s.trim());
  }
  // Quoted string
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

// ─── Flow Loader ────────────────────────────────────────────

/**
 * Load and validate flows.yaml.
 * @param {object} store - Store abstraction (read/exists)
 * @param {string} [flowsPath] - Override path to flows.yaml
 * @returns {object} Validated flow definition { states, full_flow, structural_states, modes, events }
 * @throws {Error} If file is missing or validation fails
 */
function loadFlows(store, flowsPath) {
  const filePath = flowsPath || path.join(__dirname, 'flows.yaml');

  if (!store.exists(filePath)) {
    throw new Error(`Flow definition not found: ${filePath}`);
  }

  const content = store.readFile(filePath);
  const parsed = parseFlowYaml(content);

  // Validate required sections
  const required = ['states', 'full_flow', 'structural_states', 'modes', 'events'];
  for (const key of required) {
    if (!parsed[key]) {
      throw new Error(`flows.yaml missing required section: ${key}`);
    }
  }

  // Validate that full_flow entries are in states
  const stateSet = new Set(parsed.states);
  for (const s of parsed.full_flow) {
    if (!stateSet.has(s)) {
      throw new Error(`full_flow references unknown state: ${s}`);
    }
  }

  // Validate mode phases reference real states
  for (const [modeName, modeConfig] of Object.entries(parsed.modes)) {
    if (!modeConfig.phases) {
      throw new Error(`Mode "${modeName}" missing phases property`);
    }
    if (!modeConfig.label) {
      throw new Error(`Mode "${modeName}" missing label property`);
    }
  }

  return {
    states: parsed.states,
    full_flow: parsed.full_flow,
    structural_states: parsed.structural_states,
    modes: parsed.modes,
    events: parsed.events,
  };
}

module.exports = {
  parseFlowYaml,
  parseInlineValue,
  loadFlows,
};
