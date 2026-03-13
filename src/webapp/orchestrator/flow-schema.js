'use strict';

/**
 * Flow Schema Validator — Validates flows.json against flow-canonical.schema.json (FEAT-03 / S4-2)
 *
 * @module orchestrator/flow-schema
 */

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'platform',
  'schema',
  'flow-canonical.schema.json'
);
const FLOWS_PATH = path.resolve(__dirname, '..', '..', '..', 'platform', 'schema', 'flows.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Validate flows.json against the canonical flow schema.
 * @param {object} [options]
 * @param {string} [options.schemaPath] - Override schema path
 * @param {string} [options.flowsPath] - Override flows data path
 * @returns {{ valid: boolean, errors: object[], flowsPath: string, stateCount: number, modeCount: number, gateCount: number }}
 */
function validateCanonicalFlows(options = {}) {
  const schemaPath = options.schemaPath || SCHEMA_PATH;
  const flowsPath = options.flowsPath || FLOWS_PATH;

  const schema = readJson(schemaPath);
  const data = readJson(flowsPath);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  // Semantic checks: fullFlow states must exist in states
  const semanticErrors = [];
  if (valid && Array.isArray(data.states) && Array.isArray(data.fullFlow)) {
    const stateSet = new Set(data.states);
    for (const s of data.fullFlow) {
      if (!stateSet.has(s)) {
        semanticErrors.push({ message: `fullFlow references unknown state: ${s}` });
      }
    }
    for (const s of data.structuralStates || []) {
      if (!stateSet.has(s)) {
        semanticErrors.push({ message: `structuralStates references unknown state: ${s}` });
      }
    }
    // Gate references must exist
    for (const gate of data.gates || []) {
      if (!stateSet.has(gate.after)) {
        semanticErrors.push({
          message: `gate ${gate.id} references unknown after state: ${gate.after}`,
        });
      }
      if (!stateSet.has(gate.before)) {
        semanticErrors.push({
          message: `gate ${gate.id} references unknown before state: ${gate.before}`,
        });
      }
    }
    // Mode phases must be valid states
    for (const [modeName, modeDef] of Object.entries(data.modes || {})) {
      for (const phase of modeDef.phases || []) {
        if (!stateSet.has(phase)) {
          semanticErrors.push({ message: `mode ${modeName} references unknown phase: ${phase}` });
        }
      }
    }
  }

  return {
    valid: valid && semanticErrors.length === 0,
    errors: [...(validate.errors || []), ...semanticErrors],
    flowsPath,
    stateCount: Array.isArray(data.states) ? data.states.length : 0,
    modeCount: data.modes ? Object.keys(data.modes).length : 0,
    gateCount: Array.isArray(data.gates) ? data.gates.length : 0,
  };
}

module.exports = {
  SCHEMA_PATH,
  FLOWS_PATH,
  validateCanonicalFlows,
};
