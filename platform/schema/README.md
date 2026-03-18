# Canonical Schema (FEAT-03 / M4)

This directory defines the platform-neutral canonical schemas for all agents,
flows, and tools. These schemas are the foundation for multi-platform support
and framework extraction.

## Files

### Agent Schema (S4-1)

- `agent-canonical.schema.json`: JSON Schema definition for canonical agents.
- `agents.json`: Current mapped agent registry (38 agents from `docs/reference/agent-index.md`).

### Flow Schema (S4-2)

- `flow-canonical.schema.json`: JSON Schema for phase sequences, gates, handoffs, and command modes.
- `flows.json`: Canonical flow data (states, full flow, modes, gates).

### Tool Contract Schema (S4-3)

- `tool-canonical.schema.json`: JSON Schema for abstract tool definitions with capability flags.
- `tools.json`: Canonical tool catalog (12 tools with platform bindings for Copilot/Claude/OpenAI).

## Schema Coverage

### Agent Schema

- `id`, `name`, `role`, `phase`
- `skillFiles`, `tools` (platform-agnostic IDs)
- `guardrails`, `contracts`, `dependencies`
- `platformBindings` (copilot, claude, openai)

### Flow Schema

- `states`: All valid FSM states
- `fullFlow`: Ordered CREATE cycle transition chain
- `structuralStates`: Always-included states
- `modes`: Command mode configurations (CREATE, AUDIT, FEATURE, etc.)
- `gates`: Critic/Risk checkpoints with conditions

### Tool Schema

- `id`, `description`, `category`
- `capabilities`: readOnly, supportsBackground, supportsTimeout
- `parameters`: Typed parameter definitions
- `returnType`, `sideEffects`
- `platformBindings`: Native tool names per platform

## Validation

Validators:

- `platform/engine/agent-schema.js` — Agent schema validation
- `platform/engine/flow-schema.js` — Flow schema validation
- `platform/engine/tool-schema.js` — Tool schema validation (+ cross-reference check)

Unit tests:

- `tests/unit/agent-schema.test.js`
- `tests/unit/flow-schema.test.js`
- `tests/unit/tool-schema.test.js`

## Transpiler (S4-4/S4-5/S4-6)

Generate platform-specific instructions from canonical schemas:

```bash
node scripts/generate-platform.js all       # All 3 targets
node scripts/generate-platform.js copilot   # GitHub Copilot instructions
node scripts/generate-platform.js claude    # CLAUDE.md + .claude/ directory
node scripts/generate-platform.js openai    # codex.md + .codex/ directory
```

Transpiler tests: `tests/unit/transpiler.test.js`

Run all schema tests:

```bash
npx vitest run tests/unit/agent-schema.test.js tests/unit/flow-schema.test.js tests/unit/tool-schema.test.js tests/unit/transpiler.test.js
```

## Example

```json
{
  "id": "01",
  "name": "Business Analyst",
  "role": "Business Analyst specialist role",
  "phase": "PHASE_1",
  "skillFiles": ["templates/sdlc/agents/01-business-analyst.md"],
  "tools": [
    "tool.files.read",
    "tool.files.write",
    "tool.context.search",
    "tool.validation.contract"
  ],
  "guardrails": [
    "templates/sdlc/guardrails/00-global-guardrails.md",
    "templates/sdlc/guardrails/01-business-guardrails.md"
  ],
  "contracts": [
    "templates/sdlc/contracts/analysis-output-contract.md",
    "templates/sdlc/contracts/recommendations-output-contract.md",
    "templates/sdlc/contracts/sprintplan-output-contract.md",
    "templates/sdlc/contracts/guardrails-output-contract.md",
    "templates/sdlc/contracts/agent-handoff-contract.md"
  ],
  "dependencies": ["25"],
  "platformBindings": {
    "copilot": { "enabled": true },
    "claude": { "enabled": true },
    "openai": { "enabled": true }
  }
}
```
