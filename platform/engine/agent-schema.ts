import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.resolve(__dirname, '..', 'schema', 'agent-canonical.schema.json');
const AGENTS_PATH = path.resolve(__dirname, '..', 'schema', 'agents.json');

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateCanonicalAgents(options: { schemaPath?: string; agentsPath?: string } = {}) {
  const schemaPath = options.schemaPath || SCHEMA_PATH;
  const agentsPath = options.agentsPath || AGENTS_PATH;

  const schema = readJson(schemaPath);
  const data = readJson(agentsPath);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || [],
    schemaPath,
    agentsPath,
    agentCount: Array.isArray(data.agents) ? data.agents.length : 0,
  };
}

export { SCHEMA_PATH, AGENTS_PATH, validateCanonicalAgents };
