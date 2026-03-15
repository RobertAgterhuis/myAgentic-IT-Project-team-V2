/**
 * Tool Schema Validator — Validates tools.json against tool-canonical.schema.json (FEAT-03 / S4-3)
 *
 * Also verifies that all agent tool references in agents.json resolve to a
 * defined tool in tools.json.
 *
 * @module orchestrator/tool-schema
 */

import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.resolve(__dirname, '..', 'schema', 'tool-canonical.schema.json');
const TOOLS_PATH = path.resolve(__dirname, '..', 'schema', 'tools.json');
const AGENTS_PATH = path.resolve(__dirname, '..', 'schema', 'agents.json');

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Validate tools.json against the canonical tool schema.
 * @param {object} [options]
 * @param {string} [options.schemaPath] - Override schema path
 * @param {string} [options.toolsPath] - Override tools data path
 * @param {string} [options.agentsPath] - Override agents data path for cross-reference check
 * @returns {{ valid: boolean, errors: object[], toolsPath: string, toolCount: number, unreferencedTools: string[], missingTools: string[] }}
 */
function validateCanonicalTools(
  options: { schemaPath?: string; toolsPath?: string; agentsPath?: string } = {}
) {
  const schemaPath = options.schemaPath || SCHEMA_PATH;
  const toolsPath = options.toolsPath || TOOLS_PATH;
  const agentsPath = options.agentsPath || AGENTS_PATH;

  const schema = readJson(schemaPath);
  const data = readJson(toolsPath);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  // Cross-reference: check that agent tools map to defined tool IDs
  const definedToolIds = new Set(((data.tools || []) as Array<{ id: string }>).map((t) => t.id));
  const referencedToolIds = new Set();
  const missingTools = [];

  if (fs.existsSync(agentsPath)) {
    const agents = readJson(agentsPath);
    for (const agent of (agents.agents || []) as Array<{
      id: string;
      name: string;
      tools: string[];
    }>) {
      for (const toolId of agent.tools || []) {
        referencedToolIds.add(toolId);
        if (!definedToolIds.has(toolId)) {
          missingTools.push(
            `agent ${agent.id} (${agent.name}) references undefined tool: ${toolId}`
          );
        }
      }
    }
  }

  // Tools defined but never referenced by any agent
  const unreferencedTools = [...definedToolIds].filter((id) => !referencedToolIds.has(id));

  return {
    valid: valid && missingTools.length === 0,
    errors: [...(validate.errors || []), ...missingTools.map((m) => ({ message: m }))],
    toolsPath,
    toolCount: Array.isArray(data.tools) ? data.tools.length : 0,
    unreferencedTools,
    missingTools,
  };
}

export { SCHEMA_PATH, TOOLS_PATH, AGENTS_PATH, validateCanonicalTools };
