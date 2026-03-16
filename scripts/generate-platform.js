'use strict';

/**
 * Platform Transpiler — Generates platform-specific instruction files from
 * canonical schema data (FEAT-03 / S4-4, S4-5, S4-6).
 *
 * Supported targets: copilot, claude, openai
 *
 * Usage:
 *   node scripts/generate-platform.js [target]
 *   node scripts/generate-platform.js copilot
 *   node scripts/generate-platform.js claude
 *   node scripts/generate-platform.js openai
 *   node scripts/generate-platform.js all
 *
 * @module scripts/generate-platform
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'platform', 'schema');
const OUTPUT_DIR = path.join(ROOT, 'platform', 'generated');
const MANIFEST_PATH = path.join(ROOT, 'templates', 'sdlc', 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonOptional(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load all canonical data.
 */
function loadCanonical() {
  return {
    agents: readJson(path.join(SCHEMA_DIR, 'agents.json')),
    flows: readJson(path.join(SCHEMA_DIR, 'flows.json')),
    tools: readJson(path.join(SCHEMA_DIR, 'tools.json')),
    manifest: readJsonOptional(MANIFEST_PATH),
  };
}

// ─── Copilot Target (S4-4) ──────────────────────────────────

function generateCopilot(canonical) {
  const outDir = path.join(OUTPUT_DIR, 'copilot');
  ensureDir(outDir);

  const { agents, flows, tools, manifest } = canonical;
  const lines = [];

  lines.push('# GitHub Copilot Agent Instructions (Auto-Generated)');
  lines.push('');
  lines.push(`> Generated from canonical schema v${agents.schemaVersion}`);
  lines.push(`> Generated at: ${new Date().toISOString()}`);
  lines.push(`> Source: platform/schema/`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Agent roster
  lines.push('## Agent Roster');
  lines.push('');
  lines.push('| ID | Name | Phase | Dependencies |');
  lines.push('| --- | --- | --- | --- |');
  for (const agent of agents.agents) {
    const deps = agent.dependencies.length > 0 ? agent.dependencies.join(', ') : 'none';
    lines.push(`| ${agent.id} | ${agent.name} | ${agent.phase} | ${deps} |`);
  }
  lines.push('');

  // Flow modes
  lines.push('## Command Modes');
  lines.push('');
  for (const [modeName, modeDef] of Object.entries(flows.modes)) {
    const phaseList = modeDef.phases.length > 0 ? modeDef.phases.join(' → ') : '(none)';
    lines.push(`- **${modeName}**: ${modeDef.label} — ${phaseList}`);
  }
  lines.push('');

  // Gates
  lines.push('## Gates');
  lines.push('');
  for (const gate of flows.gates) {
    lines.push(`### ${gate.id}`);
    lines.push(`- After: ${gate.after} | Before: ${gate.before} | Type: ${gate.type}`);
    lines.push('- Conditions:');
    for (const c of gate.conditions) {
      lines.push(`  - ${c}`);
    }
    lines.push('');
  }

  // Tool catalog
  lines.push('## Tool Catalog');
  lines.push('');
  lines.push('| Abstract ID | Copilot Native | Category | Read-Only |');
  lines.push('| --- | --- | --- | --- |');
  for (const tool of tools.tools) {
    const binding = tool.platformBindings?.copilot;
    const native = binding ? binding.nativeName : '—';
    lines.push(`| ${tool.id} | ${native} | ${tool.category} | ${tool.capabilities.readOnly} |`);
  }
  lines.push('');

  // Extended manifest context (v1.1.0+)
  if (manifest) {
    if (manifest.phaseArtifacts) {
      lines.push('## Phase Artifacts');
      lines.push('');
      for (const [phase, artifacts] of Object.entries(manifest.phaseArtifacts)) {
        lines.push(`### ${phase}`);
        lines.push('');
        lines.push('| ID | Type | Stage | Path |');
        lines.push('| --- | --- | --- | --- |');
        for (const a of artifacts) {
          lines.push(`| ${a.id} | ${a.type} | ${a.stage} | ${a.path} |`);
        }
        lines.push('');
      }
    }

    if (manifest.phaseTools && Object.keys(manifest.phaseTools).length > 0) {
      lines.push('## Phase Tool Requirements');
      lines.push('');
      for (const [phase, toolCfg] of Object.entries(manifest.phaseTools)) {
        const req = (toolCfg.required || []).map((t) => t.adapter);
        const opt = (toolCfg.optional || []).map((t) => t.adapter);
        if (req.length > 0 || opt.length > 0) {
          lines.push(`- **${phase}**: required=[${req.join(', ')}] optional=[${opt.join(', ')}]`);
        }
      }
      lines.push('');
    }

    if (manifest.governance) {
      lines.push('## Governance');
      lines.push('');
      lines.push(`- Default mode: ${manifest.governance.default_mode}`);
      if (manifest.governance.gates) {
        for (const [gate, cfg] of Object.entries(manifest.governance.gates)) {
          lines.push(`- ${gate}: policy=${cfg.policy}, override=${cfg.override_allowed}`);
        }
      }
      lines.push('');
    }

    if (manifest.lifecycle) {
      lines.push('## Lifecycle Stages');
      lines.push('');
      lines.push(`Stages: ${manifest.lifecycle.stages.join(' → ')}`);
      lines.push('');
      if (manifest.lifecycle.transitions) {
        lines.push('### Transitions');
        lines.push('');
        for (const t of manifest.lifecycle.transitions) {
          const gateCount = t.gates ? t.gates.length : 0;
          lines.push(`- ${t.from} → ${t.to} (${gateCount} gate${gateCount !== 1 ? 's' : ''})`);
        }
        lines.push('');
      }
    }
  }

  const content = lines.join('\n');
  const outPath = path.join(outDir, 'copilot-instructions.md');
  fs.writeFileSync(outPath, content, 'utf8');

  // Per-agent skill summaries
  const agentDir = path.join(outDir, 'agents');
  ensureDir(agentDir);

  for (const agent of agents.agents) {
    const agentLines = [];
    agentLines.push(`---`);
    agentLines.push(`applyTo: "${agent.skillFiles[0]}"`);
    agentLines.push(`---`);
    agentLines.push('');
    agentLines.push(`# ${agent.name} (Agent ${agent.id})`);
    agentLines.push('');
    agentLines.push(`**Role:** ${agent.role}`);
    agentLines.push(`**Phase:** ${agent.phase}`);
    agentLines.push('');
    agentLines.push('## Tools');
    agentLines.push('');
    for (const toolId of agent.tools) {
      const toolDef = tools.tools.find((t) => t.id === toolId);
      const native = toolDef?.platformBindings?.copilot?.nativeName || toolId;
      agentLines.push(`- \`${toolId}\` → \`${native}\``);
    }
    agentLines.push('');
    agentLines.push('## Guardrails');
    agentLines.push('');
    for (const g of agent.guardrails) {
      agentLines.push(`- ${g}`);
    }
    agentLines.push('');
    agentLines.push('## Contracts');
    agentLines.push('');
    for (const c of agent.contracts) {
      agentLines.push(`- ${c}`);
    }
    agentLines.push('');

    if (agent.dependencies.length > 0) {
      agentLines.push('## Dependencies');
      agentLines.push('');
      for (const dep of agent.dependencies) {
        const depAgent = agents.agents.find((a) => a.id === dep);
        agentLines.push(`- Agent ${dep}: ${depAgent ? depAgent.name : 'unknown'}`);
      }
      agentLines.push('');
    }

    // Extended context from manifest (v1.1.0+)
    if (manifest && manifest.phaseArtifacts) {
      const phaseArtifacts = manifest.phaseArtifacts[agent.phase];
      if (phaseArtifacts && phaseArtifacts.length > 0) {
        agentLines.push('## Artifacts');
        agentLines.push('');
        for (const a of phaseArtifacts) {
          agentLines.push(`- \`${a.id}\` (${a.type}) → ${a.path}`);
        }
        agentLines.push('');
      }
    }

    if (manifest && manifest.phaseTools) {
      const toolCfg = manifest.phaseTools[agent.phase];
      if (toolCfg) {
        const req = (toolCfg.required || []).map((t) => t.adapter);
        const opt = (toolCfg.optional || []).map((t) => t.adapter);
        if (req.length > 0 || opt.length > 0) {
          agentLines.push('## Tool Requirements');
          agentLines.push('');
          if (req.length > 0) agentLines.push(`- Required: ${req.join(', ')}`);
          if (opt.length > 0) agentLines.push(`- Optional: ${opt.join(', ')}`);
          agentLines.push('');
        }
      }
    }

    const safeName = agent.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+$/, '');
    fs.writeFileSync(
      path.join(agentDir, `${agent.id}-${safeName}.md`),
      agentLines.join('\n'),
      'utf8'
    );
  }

  return { target: 'copilot', outputDir: outDir, fileCount: agents.agents.length + 1 };
}

// ─── Claude Target (S4-5) ──────────────────────────────────

function generateClaude(canonical) {
  const outDir = path.join(OUTPUT_DIR, 'claude');
  ensureDir(outDir);

  const { agents, flows, tools } = canonical;

  // CLAUDE.md — root-level project file
  const lines = [];
  lines.push('# CLAUDE.md — Project Configuration');
  lines.push('');
  lines.push(`> Auto-generated from canonical schema v${agents.schemaVersion}`);
  lines.push('');
  lines.push('## Project Overview');
  lines.push('');
  lines.push('This is an agentic multi-agent SDLC platform. The system uses');
  lines.push(
    `${agents.agents.length} specialized agents across ${Object.keys(flows.modes).length} command modes.`
  );
  lines.push('');
  lines.push('## Memory Management');
  lines.push('');
  lines.push('Claude Code has a 200k token context window. Key rules:');
  lines.push('- Write all deliverables to disk files, NOT inline chat');
  lines.push('- Use targeted file reads with line ranges');
  lines.push('- Split outputs > 400 lines across files');
  lines.push('');
  lines.push('## Agent Execution Order');
  lines.push('');
  lines.push('```');
  lines.push(flows.fullFlow.join(' → '));
  lines.push('```');
  lines.push('');

  // Agent list
  lines.push('## Agents');
  lines.push('');
  for (const agent of agents.agents) {
    lines.push(`### ${agent.id} — ${agent.name}`);
    lines.push('');
    lines.push(`- **Phase:** ${agent.phase}`);
    lines.push(`- **Skill:** ${agent.skillFiles.join(', ')}`);
    const agentTools = agent.tools.map((tid) => {
      const t = tools.tools.find((x) => x.id === tid);
      return t?.platformBindings?.claude ? `${tid} → ${t.platformBindings.claude.nativeName}` : tid;
    });
    lines.push(`- **Tools:** ${agentTools.join(', ')}`);
    lines.push('');
  }

  // Gates
  lines.push('## Gates');
  lines.push('');
  for (const gate of flows.gates) {
    lines.push(`- **${gate.id}** (${gate.type}): ${gate.after} → ${gate.before}`);
  }
  lines.push('');

  fs.writeFileSync(path.join(outDir, 'CLAUDE.md'), lines.join('\n'), 'utf8');

  // .claude/ directory with agent configs
  const claudeDir = path.join(outDir, '.claude');
  ensureDir(claudeDir);

  for (const agent of agents.agents) {
    const agentLines = [];
    agentLines.push(`# Agent ${agent.id}: ${agent.name}`);
    agentLines.push('');
    agentLines.push(`Role: ${agent.role}`);
    agentLines.push(`Phase: ${agent.phase}`);
    agentLines.push('');
    agentLines.push('## Allowed Tools');
    agentLines.push('');
    for (const toolId of agent.tools) {
      const toolDef = tools.tools.find((t) => t.id === toolId);
      const native = toolDef?.platformBindings?.claude?.nativeName || toolId;
      agentLines.push(`- ${native} (${toolId})`);
    }
    agentLines.push('');
    agentLines.push('## Guardrails');
    agentLines.push('');
    for (const g of agent.guardrails) {
      agentLines.push(`- ${g}`);
    }
    agentLines.push('');

    fs.writeFileSync(path.join(claudeDir, `agent-${agent.id}.md`), agentLines.join('\n'), 'utf8');
  }

  return { target: 'claude', outputDir: outDir, fileCount: agents.agents.length + 1 };
}

// ─── OpenAI / Codex Target (S4-6) ──────────────────────────

function generateOpenAI(canonical) {
  const outDir = path.join(OUTPUT_DIR, 'openai');
  ensureDir(outDir);

  const { agents, flows, tools } = canonical;

  // codex.md — root instruction file
  const lines = [];
  lines.push('# Codex Agent Instructions');
  lines.push('');
  lines.push(`> Auto-generated from canonical schema v${agents.schemaVersion}`);
  lines.push('');
  lines.push('## Sandbox Execution Model');
  lines.push('');
  lines.push('- All file operations run in a sandboxed environment');
  lines.push('- Use `shell` tool for git operations');
  lines.push('- No persistent state between invocations');
  lines.push('');
  lines.push('## Agent Roles');
  lines.push('');

  for (const agent of agents.agents) {
    lines.push(`### ${agent.id}: ${agent.name}`);
    lines.push(`- Phase: ${agent.phase} | Role: ${agent.role}`);
    const deps = agent.dependencies.length > 0 ? `(after: ${agent.dependencies.join(', ')})` : '';
    lines.push(`- Dependencies: ${deps || 'none'}`);
    lines.push('');
  }

  // Tool function-calling schemas
  lines.push('## Tool Definitions');
  lines.push('');
  lines.push('```json');
  const functionDefs = tools.tools.map((tool) => ({
    name: tool.platformBindings?.openai?.nativeName || tool.id,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map((p) => [p.name, { type: p.type, description: p.description }])
      ),
      required: tool.parameters.filter((p) => p.required).map((p) => p.name),
    },
  }));
  lines.push(JSON.stringify(functionDefs, null, 2));
  lines.push('```');
  lines.push('');

  // Flow
  lines.push('## Execution Flow');
  lines.push('');
  lines.push(`States: ${flows.states.join(', ')}`);
  lines.push('');
  lines.push('Full flow:');
  lines.push('```');
  lines.push(flows.fullFlow.join(' → '));
  lines.push('```');
  lines.push('');

  // Modes
  lines.push('## Command Modes');
  lines.push('');
  for (const [modeName, modeDef] of Object.entries(flows.modes)) {
    lines.push(`- **${modeName}**: ${modeDef.label}`);
  }
  lines.push('');

  // Guardrails adapted for sandbox
  lines.push('## Guardrails (Sandbox Adapted)');
  lines.push('');
  lines.push('- All file writes must use relative paths within the workspace');
  lines.push('- No network access except git operations');
  lines.push('- Outputs must be written to disk, not returned inline');
  lines.push('- Maximum output length per tool call: 100KB');
  lines.push('');

  fs.writeFileSync(path.join(outDir, 'codex.md'), lines.join('\n'), 'utf8');

  // .codex/ directory
  const codexDir = path.join(outDir, '.codex');
  ensureDir(codexDir);

  // Agent config as JSON for function-calling
  const agentConfigs = agents.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    phase: agent.phase,
    tools: agent.tools.map((tid) => {
      const t = tools.tools.find((x) => x.id === tid);
      return t?.platformBindings?.openai?.nativeName || tid;
    }),
    guardrails: agent.guardrails,
    contracts: agent.contracts,
    dependencies: agent.dependencies,
  }));

  fs.writeFileSync(
    path.join(codexDir, 'agents.json'),
    JSON.stringify(agentConfigs, null, 2),
    'utf8'
  );

  return { target: 'openai', outputDir: outDir, fileCount: 2 };
}

// ─── Main Entry Point ───────────────────────────────────────

const TARGETS = {
  copilot: generateCopilot,
  claude: generateClaude,
  openai: generateOpenAI,
};

function generate(target) {
  const canonical = loadCanonical();
  if (target === 'all') {
    return Object.entries(TARGETS).map(([_name, fn]) => fn(canonical));
  }
  if (!TARGETS[target]) {
    throw new Error(
      `Unknown target: ${target}. Valid targets: ${Object.keys(TARGETS).join(', ')}, all`
    );
  }
  return [TARGETS[target](canonical)];
}

// CLI entry
if (require.main === module) {
  const target = process.argv[2] || 'all';
  try {
    const results = generate(target);
    for (const r of results) {
      console.log(`✓ ${r.target}: ${r.fileCount} files → ${r.outputDir}`);
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

module.exports = { generate, loadCanonical, TARGETS };
