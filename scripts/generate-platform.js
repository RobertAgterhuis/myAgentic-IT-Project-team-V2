'use strict';

/**
 * Platform Transpiler — Generates platform-specific instruction files from
 * canonical schema data (FEAT-03 / S4-4, S4-5, S4-6).
 *
 * Supported targets: copilot, claude, openai
 *
 * Output paths (real platform conventions):
 *   copilot → .github/instructions/*.instructions.md
 *   claude  → CLAUDE.md + .claude/settings.json + .claude/commands/*.md
 *   openai  → .codex/instructions.md + .codex/agents.json
 *
 * Usage:
 *   node scripts/generate-platform.js [target] [--dry-run]
 *   node scripts/generate-platform.js copilot
 *   node scripts/generate-platform.js claude
 *   node scripts/generate-platform.js openai
 *   node scripts/generate-platform.js all
 *   node scripts/generate-platform.js all --dry-run
 *
 * @module scripts/generate-platform
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'platform', 'schema');
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
 * Load all canonical data including protocols.
 */
function loadCanonical() {
  return {
    agents: readJson(path.join(SCHEMA_DIR, 'agents.json')),
    flows: readJson(path.join(SCHEMA_DIR, 'flows.json')),
    tools: readJson(path.join(SCHEMA_DIR, 'tools.json')),
    protocols: readJson(path.join(SCHEMA_DIR, 'protocols.json')),
    manifest: readJsonOptional(MANIFEST_PATH),
  };
}

/**
 * Render protocols to markdown.
 */
function renderProtocols(protocols) {
  const lines = [];
  lines.push('## Universal Agent Protocols');
  lines.push('');
  for (const proto of protocols.protocols) {
    lines.push(`### ${proto.name}${proto.mandatory ? ' (MANDATORY)' : ''}`);
    lines.push('');
    for (const rule of proto.rules) {
      lines.push(`${rule.id}. ${rule.text}`);
    }
    lines.push('');
  }

  lines.push('### Handoff Checklist');
  lines.push('');
  lines.push('```markdown');
  lines.push('## HANDOFF CHECKLIST');
  for (const item of protocols.handoffChecklist.items) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push('```');
  lines.push('');
  lines.push(`**${protocols.handoffChecklist.enforcementRule}**`);
  lines.push('');

  return lines;
}

// ─── Copilot Target (S4-4) ──────────────────────────────────
// Outputs to: .github/instructions/*.instructions.md

function generateCopilot(canonical, dryRun) {
  const outDir = path.join(ROOT, '.github', 'instructions');
  const files = [];

  const { agents, flows, tools, protocols, manifest } = canonical;

  // 1. protocols.instructions.md — no applyTo = always loaded
  const protoLines = [];
  protoLines.push('---');
  protoLines.push('# No applyTo — always loaded in every Copilot conversation');
  protoLines.push('---');
  protoLines.push('');
  protoLines.push('# Universal Agent Protocols (Auto-Generated)');
  protoLines.push('');
  protoLines.push(`> Generated from canonical schema v${agents.schemaVersion}`);
  protoLines.push(`> Source: platform/schema/protocols.json`);
  protoLines.push('');
  protoLines.push(...renderProtocols(protocols));

  files.push({
    path: path.join(outDir, 'protocols.instructions.md'),
    content: protoLines.join('\n'),
  });

  // 2. phase-agents.instructions.md — scoped to templates/sdlc/
  const agentLines = [];
  agentLines.push('---');
  agentLines.push('applyTo: "templates/sdlc/**"');
  agentLines.push('---');
  agentLines.push('');
  agentLines.push('# Phase Agents & Command Modes (Auto-Generated)');
  agentLines.push('');
  agentLines.push(`> Generated from canonical schema v${agents.schemaVersion}`);
  agentLines.push('');

  // Agent roster
  agentLines.push('## Agent Roster');
  agentLines.push('');
  agentLines.push('| ID | Name | Phase | Dependencies |');
  agentLines.push('| --- | --- | --- | --- |');
  for (const agent of agents.agents) {
    const deps = agent.dependencies.length > 0 ? agent.dependencies.join(', ') : 'none';
    agentLines.push(`| ${agent.id} | ${agent.name} | ${agent.phase} | ${deps} |`);
  }
  agentLines.push('');

  // Flow modes
  agentLines.push('## Command Modes');
  agentLines.push('');
  for (const [modeName, modeDef] of Object.entries(flows.modes)) {
    const phaseList = modeDef.phases.length > 0 ? modeDef.phases.join(' → ') : '(none)';
    agentLines.push(`- **${modeName}**: ${modeDef.label} — ${phaseList}`);
  }
  agentLines.push('');

  // Gates
  agentLines.push('## Gates');
  agentLines.push('');
  for (const gate of flows.gates) {
    agentLines.push(`### ${gate.id}`);
    agentLines.push(`- After: ${gate.after} | Before: ${gate.before} | Type: ${gate.type}`);
    agentLines.push('- Conditions:');
    for (const c of gate.conditions) {
      agentLines.push(`  - ${c}`);
    }
    agentLines.push('');
  }

  // Tool catalog
  agentLines.push('## Tool Catalog');
  agentLines.push('');
  agentLines.push('| Abstract ID | Copilot Native | Category | Read-Only |');
  agentLines.push('| --- | --- | --- | --- |');
  for (const tool of tools.tools) {
    const binding = tool.platformBindings?.copilot;
    const native = binding ? binding.nativeName : '—';
    agentLines.push(
      `| ${tool.id} | ${native} | ${tool.category} | ${tool.capabilities.readOnly} |`
    );
  }
  agentLines.push('');

  // Extended manifest context
  if (manifest) {
    if (manifest.phaseArtifacts) {
      agentLines.push('## Phase Artifacts');
      agentLines.push('');
      for (const [phase, artifacts] of Object.entries(manifest.phaseArtifacts)) {
        agentLines.push(`### ${phase}`);
        agentLines.push('');
        agentLines.push('| ID | Type | Stage | Path |');
        agentLines.push('| --- | --- | --- | --- |');
        for (const a of artifacts) {
          agentLines.push(`| ${a.id} | ${a.type} | ${a.stage} | ${a.path} |`);
        }
        agentLines.push('');
      }
    }

    if (manifest.phaseTools && Object.keys(manifest.phaseTools).length > 0) {
      agentLines.push('## Phase Tool Requirements');
      agentLines.push('');
      for (const [phase, toolCfg] of Object.entries(manifest.phaseTools)) {
        const req = (toolCfg.required || []).map((t) => t.adapter);
        const opt = (toolCfg.optional || []).map((t) => t.adapter);
        if (req.length > 0 || opt.length > 0) {
          agentLines.push(
            `- **${phase}**: required=[${req.join(', ')}] optional=[${opt.join(', ')}]`
          );
        }
      }
      agentLines.push('');
    }

    if (manifest.governance) {
      agentLines.push('## Governance');
      agentLines.push('');
      agentLines.push(`- Default mode: ${manifest.governance.default_mode}`);
      if (manifest.governance.gates) {
        for (const [gate, cfg] of Object.entries(manifest.governance.gates)) {
          agentLines.push(`- ${gate}: policy=${cfg.policy}, override=${cfg.override_allowed}`);
        }
      }
      agentLines.push('');
    }

    if (manifest.lifecycle) {
      agentLines.push('## Lifecycle Stages');
      agentLines.push('');
      agentLines.push(`Stages: ${manifest.lifecycle.stages.join(' → ')}`);
      agentLines.push('');
      if (manifest.lifecycle.transitions) {
        agentLines.push('### Transitions');
        agentLines.push('');
        for (const t of manifest.lifecycle.transitions) {
          const gateCount = t.gates ? t.gates.length : 0;
          agentLines.push(`- ${t.from} → ${t.to} (${gateCount} gate${gateCount !== 1 ? 's' : ''})`);
        }
        agentLines.push('');
      }
    }
  }

  files.push({
    path: path.join(outDir, 'phase-agents.instructions.md'),
    content: agentLines.join('\n'),
  });

  // 3. webapp.instructions.md — scoped to src/webapp/
  const webappLines = [];
  webappLines.push('---');
  webappLines.push('applyTo: "src/webapp/**"');
  webappLines.push('---');
  webappLines.push('');
  webappLines.push('# Webapp Development Context (Auto-Generated)');
  webappLines.push('');
  webappLines.push(`> Generated from canonical schema v${agents.schemaVersion}`);
  webappLines.push('');
  webappLines.push('## Stack');
  webappLines.push('');
  webappLines.push('- React 18 + TypeScript 5.9');
  webappLines.push('- Vite build system');
  webappLines.push('- TailwindCSS 4 for styling');
  webappLines.push('- Zustand for state management');
  webappLines.push('- TanStack Query for server state');
  webappLines.push('- better-sqlite3 12.8 for local persistence');
  webappLines.push('');
  webappLines.push('## Conventions');
  webappLines.push('');
  webappLines.push('- Components in `src/webapp/ui/src/components/`');
  webappLines.push('- Routes in `src/webapp/ui/src/pages/`');
  webappLines.push('- API handlers in `src/webapp/routes/`');
  webappLines.push('- MCP server in `src/webapp/mcp-server.ts`');
  webappLines.push('- Design tokens from `platform/schema/` via `scripts/build-tokens.mjs`');
  webappLines.push('');

  files.push({
    path: path.join(outDir, 'webapp.instructions.md'),
    content: webappLines.join('\n'),
  });

  if (dryRun) {
    return { target: 'copilot', outputDir: outDir, fileCount: files.length, files, dryRun: true };
  }

  ensureDir(outDir);
  for (const f of files) {
    fs.writeFileSync(f.path, f.content, 'utf8');
  }

  return { target: 'copilot', outputDir: outDir, fileCount: files.length };
}

// ─── Claude Target (S4-5) ──────────────────────────────────
// Outputs to: CLAUDE.md + .claude/settings.json + .claude/commands/*.md

function generateClaude(canonical, dryRun) {
  const files = [];

  const { agents, flows, tools, protocols } = canonical;

  // CLAUDE.md — root-level project file
  const lines = [];
  lines.push('# CLAUDE.md — Project Configuration');
  lines.push('');
  lines.push(`> Auto-generated from canonical schema v${agents.schemaVersion}`);
  lines.push(`> Source: platform/schema/`);
  lines.push('');
  lines.push('## Project Overview');
  lines.push('');
  lines.push('This is an agentic multi-agent SDLC platform. The system uses');
  lines.push(
    `${agents.agents.length} specialized agents across ${Object.keys(flows.modes).length} command modes.`
  );
  lines.push('');

  // Universal protocols
  lines.push(...renderProtocols(protocols));

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

  files.push({
    path: path.join(ROOT, 'CLAUDE.md'),
    content: lines.join('\n'),
  });

  // .claude/settings.json — MCP server config + permissions
  const claudeDir = path.join(ROOT, '.claude');
  const settings = {
    mcpServers: {
      'agentic-it-project-team': {
        command: 'node',
        args: ['--import', 'tsx', 'src/webapp/mcp-server.ts'],
      },
    },
    permissions: {
      allow: ['Read', 'Write', 'Grep', 'Glob', 'Bash(npm:*)', 'Bash(node:*)', 'Bash(gh:*)'],
    },
  };

  files.push({
    path: path.join(claudeDir, 'settings.json'),
    content: JSON.stringify(settings, null, 2) + '\n',
  });

  // .claude/commands/ — one command file per key agent
  const commandsDir = path.join(claudeDir, 'commands');
  const keyAgents = agents.agents.filter(
    (a) =>
      a.name.toLowerCase().includes('orchestrator') ||
      a.name.toLowerCase().includes('critic') ||
      a.name.toLowerCase().includes('synthesis') ||
      a.name.toLowerCase().includes('implementation') ||
      a.name.toLowerCase().includes('onboarding')
  );

  for (const agent of keyAgents) {
    const safeName = agent.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+$/, '');
    const cmdLines = [];
    cmdLines.push(`# ${agent.name}`);
    cmdLines.push('');
    cmdLines.push(`Role: ${agent.role}`);
    cmdLines.push(`Phase: ${agent.phase}`);
    cmdLines.push('');
    cmdLines.push('## Allowed Tools');
    cmdLines.push('');
    for (const toolId of agent.tools) {
      const toolDef = tools.tools.find((t) => t.id === toolId);
      const native = toolDef?.platformBindings?.claude?.nativeName || toolId;
      cmdLines.push(`- ${native} (${toolId})`);
    }
    cmdLines.push('');
    cmdLines.push('## Guardrails');
    cmdLines.push('');
    for (const g of agent.guardrails) {
      cmdLines.push(`- ${g}`);
    }
    cmdLines.push('');

    files.push({
      path: path.join(commandsDir, `${safeName}.md`),
      content: cmdLines.join('\n'),
    });
  }

  if (dryRun) {
    return {
      target: 'claude',
      outputDir: claudeDir,
      fileCount: files.length,
      files,
      dryRun: true,
    };
  }

  ensureDir(claudeDir);
  ensureDir(commandsDir);
  for (const f of files) {
    ensureDir(path.dirname(f.path));
    fs.writeFileSync(f.path, f.content, 'utf8');
  }

  return { target: 'claude', outputDir: claudeDir, fileCount: files.length };
}

// ─── OpenAI / Codex Target (S4-6) ──────────────────────────
// Outputs to: .codex/instructions.md + .codex/agents.json

function generateOpenAI(canonical, dryRun) {
  const codexDir = path.join(ROOT, '.codex');
  const files = [];

  const { agents, flows, tools, protocols } = canonical;

  // .codex/instructions.md — root instruction file
  const lines = [];
  lines.push('# Codex Agent Instructions');
  lines.push('');
  lines.push(`> Auto-generated from canonical schema v${agents.schemaVersion}`);
  lines.push(`> Source: platform/schema/`);
  lines.push('');
  lines.push('## Sandbox Execution Model');
  lines.push('');
  lines.push('- All file operations run in a sandboxed environment');
  lines.push('- Use `shell` tool for git operations');
  lines.push('- No persistent state between invocations');
  lines.push('- All file writes must use workspace-relative paths');
  lines.push('');

  // Universal protocols (sandbox-adapted)
  lines.push(...renderProtocols(protocols));

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
  lines.push('## MCP Server (Known Limitation)');
  lines.push('');
  lines.push('Codex does not yet support MCP natively. The MCP server can be');
  lines.push('invoked via shell wrapper:');
  lines.push('```');
  lines.push('node --import tsx src/webapp/mcp-server.ts');
  lines.push('```');
  lines.push('This requires explicit setup and is not integrated into the sandbox.');
  lines.push('');

  files.push({
    path: path.join(codexDir, 'instructions.md'),
    content: lines.join('\n'),
  });

  // .codex/agents.json — Agent config for function-calling
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

  files.push({
    path: path.join(codexDir, 'agents.json'),
    content: JSON.stringify(agentConfigs, null, 2) + '\n',
  });

  if (dryRun) {
    return { target: 'openai', outputDir: codexDir, fileCount: files.length, files, dryRun: true };
  }

  ensureDir(codexDir);
  for (const f of files) {
    fs.writeFileSync(f.path, f.content, 'utf8');
  }

  return { target: 'openai', outputDir: codexDir, fileCount: files.length };
}

// ─── Main Entry Point ───────────────────────────────────────

const TARGETS = {
  copilot: generateCopilot,
  claude: generateClaude,
  openai: generateOpenAI,
};

function generate(target, { dryRun = false } = {}) {
  const canonical = loadCanonical();
  if (target === 'all') {
    return Object.entries(TARGETS).map(([_name, fn]) => fn(canonical, dryRun));
  }
  if (!TARGETS[target]) {
    throw new Error(
      `Unknown target: ${target}. Valid targets: ${Object.keys(TARGETS).join(', ')}, all`
    );
  }
  return [TARGETS[target](canonical, dryRun)];
}

// CLI entry
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const target = args.find((a) => !a.startsWith('--')) || 'all';
  try {
    const results = generate(target, { dryRun });
    for (const r of results) {
      if (r.dryRun) {
        console.log(`[dry-run] ${r.target}: ${r.fileCount} files → ${r.outputDir}`);
        for (const f of r.files) {
          console.log(`  → ${path.relative(ROOT, f.path)}`);
        }
      } else {
        console.log(`✓ ${r.target}: ${r.fileCount} files → ${r.outputDir}`);
      }
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

module.exports = { generate, loadCanonical, TARGETS };
