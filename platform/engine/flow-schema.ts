/**
 * Flow Schema Validator — Validates flows.json against flow-canonical.schema.json (FEAT-03 / S4-2)
 *
 * @module orchestrator/flow-schema
 */

import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.resolve(__dirname, '..', 'schema', 'flow-canonical.schema.json');
const FLOWS_PATH = path.resolve(__dirname, '..', 'schema', 'flows.json');

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Validate flows.json against the canonical flow schema.
 * @param {object} [options]
 * @param {string} [options.schemaPath] - Override schema path
 * @param {string} [options.flowsPath] - Override flows data path
 * @returns {{ valid: boolean, errors: object[], flowsPath: string, stateCount: number, modeCount: number, gateCount: number }}
 */
function validateCanonicalFlows(options: { schemaPath?: string; flowsPath?: string } = {}) {
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
  const d = data;
  if (valid && Array.isArray(d.states) && Array.isArray(d.fullFlow)) {
    const stateSet = new Set(d.states);
    for (const s of (d.fullFlow || []) as string[]) {
      if (!stateSet.has(s)) {
        semanticErrors.push({ message: `fullFlow references unknown state: ${s}` });
      }
    }
    for (const s of (d.structuralStates || []) as string[]) {
      if (!stateSet.has(s)) {
        semanticErrors.push({ message: `structuralStates references unknown state: ${s}` });
      }
    }
    // Gate references must exist
    for (const gate of (d.gates || []) as Array<{ id: string; after: string; before: string }>) {
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
    for (const [modeName, modeDef] of Object.entries(d.modes || {})) {
      for (const phase of ((modeDef as Record<string, unknown>).phases as unknown[]) || []) {
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

export { SCHEMA_PATH, FLOWS_PATH, validateCanonicalFlows };
