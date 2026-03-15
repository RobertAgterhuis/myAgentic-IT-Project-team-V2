#!/usr/bin/env tsx

/**
 * Orchestrator CLI — Command‐line interface (FEAT-05-E)
 *
 * Usage:
 *   node cli.js <command> [project] [options]
 *
 * Commands:
 *   create [project]          Start a full CREATE pipeline
 *   create_business [project] Business-only CREATE
 *   create_tech [project]     Tech-only CREATE
 *   create_ux [project]       UX-only CREATE
 *   create_marketing [project] Marketing-only CREATE
 *   audit [project]           Start a full AUDIT pipeline
 *   feature [project]         Start a FEATURE cycle
 *   scope_change [project]    Start a SCOPE CHANGE re-analysis
 *   hotfix [project]          Start an emergency HOTFIX
 *   reevaluate [project]      Start a REEVALUATE cycle
 *   status                    Show current engine status (phase, agent, elapsed time)
 *   stop                      Stop the running pipeline
 *   gate-check                Run sprint gate readiness check
 *
 * Options:
 *   --platform <name>   AI platform: copilot | claude | codex (default: copilot)
 *   --resume            Resume from the last saved session state
 *   --interactive       Enable interactive mode (prompt at gate boundaries)
 *   --help              Show this help message
 *
 * @module orchestrator/cli
 */

import { createEngine } from './engine';
import { MODE_CONFIGS as _MODE_CONFIGS } from './state-machine';

// ─── Argument Parser ─────────────────────────────────────────

const VALID_PLATFORMS = ['copilot', 'claude', 'codex'];

const COMMAND_ALIASES = Object.freeze({
  create: 'CREATE',
  create_business: 'CREATE_BUSINESS',
  create_tech: 'CREATE_TECH',
  create_ux: 'CREATE_UX',
  create_marketing: 'CREATE_MARKETING',
  audit: 'AUDIT',
  feature: 'FEATURE',
  scope_change: 'SCOPE_CHANGE',
  hotfix: 'HOTFIX',
  reevaluate: 'REEVALUATE',
  status: '_STATUS',
  stop: '_STOP',
  gate_check: '_GATE_CHECK',
});

/**
 * Parse raw argv into a structured options object.
 *
 * @param {string[]} argv - process.argv.slice(2) or equivalent
 * @returns {{ command: string|null, project: string|null, platform: string, resume: boolean, interactive: boolean, help: boolean, error: string|null }}
 */
function parseArgs(argv: string[]) {
  const result = {
    command: null,
    project: null,
    platform: 'copilot',
    resume: false,
    interactive: false,
    help: false,
    error: null,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
    }

    if (arg === '--resume') {
      result.resume = true;
      continue;
    }

    if (arg === '--interactive') {
      result.interactive = true;
      continue;
    }

    if (arg === '--platform') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        result.error = '--platform requires a value: copilot | claude | codex';
        return result;
      }
      const normalized = next.toLowerCase();
      if (!VALID_PLATFORMS.includes(normalized)) {
        result.error = `Invalid platform "${next}". Must be one of: ${VALID_PLATFORMS.join(', ')}`;
        return result;
      }
      result.platform = normalized;
      i++; // skip value
      continue;
    }

    if (arg.startsWith('-')) {
      result.error = `Unknown flag: ${arg}`;
      return result;
    }

    positional.push(arg);
  }

  if (positional.length === 0 && !result.help) {
    result.error = 'No command specified. Use --help for usage.';
    return result;
  }

  // First positional is the command, second (optional) is the project name
  const rawCmd = positional[0] ? positional[0].toLowerCase().replace(/[\s-]+/g, '_') : null;

  if (rawCmd) {
    const mapped = COMMAND_ALIASES[rawCmd];
    if (!mapped) {
      result.error = `Unknown command: "${positional[0]}". Valid commands: ${Object.keys(COMMAND_ALIASES).join(', ')}`;
      return result;
    }
    result.command = mapped;
  }

  if (positional.length > 1) {
    result.project = positional.slice(1).join(' ');
  }

  return result;
}

// ─── Help Text ───────────────────────────────────────────────

const HELP_TEXT = `
Orchestrator CLI — Multi-agent pipeline command interface

Usage:
  node cli.js <command> [project] [options]

Commands:
  create [project]            Start a full CREATE pipeline
  create_business [project]   Business-only CREATE
  create_tech [project]       Tech-only CREATE
  create_ux [project]         UX-only CREATE
  create_marketing [project]  Marketing-only CREATE
  audit [project]             Start a full AUDIT pipeline
  feature [project]           Start a FEATURE cycle
  scope_change [project]      Start a SCOPE CHANGE re-analysis
  hotfix [project]            Start an emergency HOTFIX
  reevaluate [project]        Start a REEVALUATE cycle
  status                      Show current engine status (phase, agent, elapsed time)
  stop                        Stop the running pipeline
  gate-check                  Run sprint gate readiness check

Options:
  --platform <name>   AI platform: copilot | claude | codex  (default: copilot)
  --resume            Resume from the last saved session state
  --interactive       Enable interactive mode (prompt at gate boundaries)
  --help, -h          Show this help message
`.trim();

// ─── Command Dispatcher ──────────────────────────────────────

/**
 * Execute a parsed CLI command against an engine instance.
 *
 * @param {object} engine - Engine instance from createEngine()
 * @param {object} parsed - Parsed arguments from parseArgs()
 * @param {object} [deps] - Injectable dependencies for testability
 * @param {Function} [deps.write] - Output function (default: process.stdout.write)
 * @param {Function} [deps.promptFn] - stdin prompt function for interactive mode
 * @returns {{ ok: boolean, status?: object, error?: string }}
 */
function executeCommand(
  engine: Record<string, (...args: unknown[]) => unknown>,
  parsed: Record<string, unknown>,
  deps: { write?: (msg: string) => unknown; promptFn?: (...args: unknown[]) => unknown } = {}
) {
  const write = deps.write || ((msg: string) => process.stdout.write(msg));

  if (parsed.command === '_STATUS') {
    const st = engine.status();
    write(JSON.stringify(st, null, 2) + '\n');
    return { ok: true, status: st };
  }

  if (parsed.command === '_STOP') {
    const st = engine.stop();
    write(JSON.stringify({ ok: true, stopped: true, status: st }, null, 2) + '\n');
    return { ok: true, status: st };
  }

  if (parsed.command === '_GATE_CHECK') {
    const sprintId = parsed.project || 'SP-1';
    const result = engine.sprintGate({ sprintId, stories: [] });
    write(JSON.stringify({ ok: true, gateCheck: result }, null, 2) + '\n');
    return { ok: true, gateCheck: result };
  }

  // Reset the engine to the requested mode (starts fresh or resumes)
  if (!parsed.resume) {
    engine.reset(parsed.command);
  }

  const st = engine.status() as Record<string, unknown>;

  write(
    JSON.stringify(
      {
        ok: true,
        command: parsed.command,
        project: parsed.project,
        platform: parsed.platform,
        resume: parsed.resume,
        interactive: parsed.interactive,
        state: st.state,
        mode: st.mode,
      },
      null,
      2
    ) + '\n'
  );

  return { ok: true, status: st };
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Run the CLI. Called when the script is executed directly.
 *
 * @param {string[]} argv - Defaults to process.argv.slice(2)
 * @param {object} [deps] - Injectable dependencies
 * @param {object} [deps.store] - Store override
 * @param {Function} [deps.sseNotify] - SSE override
 * @param {Function} [deps.write] - Output writer
 * @param {object} [deps.engine] - Pre-built engine (skips createEngine)
 * @returns {{ ok: boolean, status?: object, error?: string }}
 */
function run(
  argv: string[],
  deps: {
    write?: (msg: string) => unknown;
    engine?: Record<string, (...args: unknown[]) => unknown>;
    store?: unknown;
    sseNotify?: (...args: unknown[]) => void;
    promptFn?: (...args: unknown[]) => unknown;
  } = {}
) {
  const args = argv || process.argv.slice(2);
  const write = deps.write || ((msg: string) => process.stdout.write(msg));

  const parsed = parseArgs(args);

  if (parsed.help) {
    write(HELP_TEXT + '\n');
    return { ok: true };
  }

  if (parsed.error) {
    write('Error: ' + parsed.error + '\n');
    return { ok: false, error: parsed.error };
  }

  // Build or reuse engine
  let engine;
  if (deps.engine) {
    engine = deps.engine;
  } else {
    const store = deps.store;
    if (!store) {
      write('Error: No store provided.\n');
      return { ok: false, error: 'No store provided' };
    }
    engine = createEngine({
      store,
      sseNotify: deps.sseNotify || (() => {}),
    });
  }

  return executeCommand(engine, parsed, { write: deps.write, promptFn: deps.promptFn });
}

// ── Auto-run when executed directly ──────────────────────────
/* c8 ignore start */
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getStore } = require('../../src/webapp/store');
  const result = run(process.argv.slice(2), { store: getStore() });
  if (!result.ok) {
    process.exitCode = 1;
  }
}
/* c8 ignore stop */

export { parseArgs, executeCommand, run, COMMAND_ALIASES, VALID_PLATFORMS, HELP_TEXT };
