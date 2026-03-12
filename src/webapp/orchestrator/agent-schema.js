'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '.github',
  'platform',
  'schema',
  'agent-canonical.schema.json'
);
const AGENTS_PATH = path.resolve(__dirname, '..', '..', '..', '.github', 'platform', 'schema', 'agents.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateCanonicalAgents(options = {}) {
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

module.exports = {
  SCHEMA_PATH,
  AGENTS_PATH,
  validateCanonicalAgents,
};
