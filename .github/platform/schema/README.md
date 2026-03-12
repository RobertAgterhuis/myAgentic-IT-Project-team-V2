# Canonical Agent Schema

This directory defines the platform-neutral canonical schema for all agents.

## Files

- `agent-canonical.schema.json`: JSON Schema definition for canonical agents.
- `agents.json`: Current mapped agent registry (generated from `docs/agent-index.md`).

## Schema Coverage

Each agent includes:

- `id`, `name`, `role`
- `phase`
- `skillFiles`
- `tools` (platform-agnostic IDs, e.g. `tool.files.read`)
- `guardrails`
- `contracts`
- `dependencies`
- `platformBindings`

Top-level fields:

- `schemaVersion` for evolution/versioning
- `source` and `generatedAt` metadata
- `toolCatalog` dictionary of abstract tool IDs

## Validation

Validation is implemented in:

- `webapp/orchestrator/agent-schema.js`

Unit test:

- `tests/unit/agent-schema.test.js`

Run:

```bash
npm test -- tests/unit/agent-schema.test.js
```

## Example

```json
{
  "id": "01",
  "name": "Business Analyst",
  "role": "Business Analyst specialist role",
  "phase": "PHASE_1",
  "skillFiles": [".github/skills/01-business-analyst.md"],
  "tools": ["tool.files.read", "tool.files.write", "tool.context.search", "tool.validation.contract"],
  "guardrails": [
    ".github/docs/guardrails/00-global-guardrails.md",
    ".github/docs/guardrails/01-business-guardrails.md"
  ],
  "contracts": [
    ".github/docs/contracts/analysis-output-contract.md",
    ".github/docs/contracts/recommendations-output-contract.md",
    ".github/docs/contracts/sprintplan-output-contract.md",
    ".github/docs/contracts/guardrails-output-contract.md",
    ".github/docs/contracts/agent-handoff-contract.md"
  ],
  "dependencies": ["25"],
  "platformBindings": {
    "copilot": { "enabled": true },
    "claude": { "enabled": true },
    "openai": { "enabled": true }
  }
}
```
