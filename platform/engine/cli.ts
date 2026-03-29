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
import { assertRuntimeSchemaParity, PHASE_AGENTS } from './dispatcher';

// ─── Argument Parser ─────────────────────────────────────────

const VALID_PLATFORMS = ['copilot', 'claude', 'codex'];

const COMMAND_ALIASES: Readonly<Record<string, string>> = Object.freeze({
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
  approvals: '_APPROVALS',
  approvals_list: '_APPROVALS_LIST',
  approvals_approve: '_APPROVALS_APPROVE',
  approvals_reject: '_APPROVALS_REJECT',
});

interface ParsedArgs {
  command: string | null;
  project: string | null;
  platform: string;
  resume: boolean;
  dryRun: boolean;
  interactive: boolean;
  singleStep: boolean;
  checkpoint: boolean;
  reason: string | null;
  help: boolean;
  error: string | null;
}

interface EngineApi {
  status: () => Record<string, unknown>;
  stop: () => Record<string, unknown>;
  pauseAtCheckpoint: () => Record<string, unknown>;
  sprintGate: (opts: Record<string, unknown>) => Record<string, unknown>;
  reset: (mode: string) => void;
  advance: () => Record<string, unknown>;
  getGovernance?: () => unknown;
}

/**
 * Parse raw argv into a structured options object.
 *
 * @param {string[]} argv - process.argv.slice(2) or equivalent
 * @returns {{ command: string|null, project: string|null, platform: string, resume: boolean, interactive: boolean, help: boolean, error: string|null }}
 */
function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: null,
    project: null,
    platform: 'copilot',
    resume: false,
    dryRun: false,
    interactive: false,
    singleStep: false,
    checkpoint: false,
    reason: null,
    help: false,
    error: null,
  };

  const positional: string[] = [];

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

    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }

    if (arg === '--interactive') {
      result.interactive = true;
      continue;
    }

    if (arg === '--single-step') {
      result.singleStep = true;
      continue;
    }

    if (arg === '--checkpoint') {
      result.checkpoint = true;
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

    if (arg === '--reason') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        result.error = '--reason requires a value';
        return result;
      }
      result.reason = next;
      i++;
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

  // Handle compound commands like "approvals list", "approvals approve APR-1"
  const first = positional[0] ? positional[0].toLowerCase().replace(/[\s-]+/g, '_') : null;
  const second = positional[1] ? positional[1].toLowerCase().replace(/[\s-]+/g, '_') : null;

  if (first === 'approvals' && second) {
    const compoundKey = `${first}_${second}`;
    const mapped = COMMAND_ALIASES[compoundKey];
    if (mapped) {
      result.command = mapped;
      // Remaining positional args become the "project" (used as approval ID)
      if (positional.length > 2) {
        result.project = positional.slice(2).join(' ');
      }
      return result;
    }
    // "approvals" alone maps to list
    result.command = COMMAND_ALIASES['approvals'];
    if (positional.length > 1) {
      result.project = positional.slice(1).join(' ');
    }
    return result;
  }

  // First positional is the command, second (optional) is the project name
  const rawCmd = first;

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
  approvals list              List pending approvals
  approvals approve <id>      Approve a specific request (--reason optional)
  approvals reject <id>       Reject a specific request (--reason required)

Options:
  --platform <name>   AI platform: copilot | claude | codex  (default: copilot)
  --resume            Resume from the last saved session state
  --dry-run           Validate command/runtime config without executing transitions
  --interactive       Enable interactive mode (prompt at gate boundaries)
  --reason <text>     Reason for approval/rejection decision
  --single-step       Process one state transition and exit
  --checkpoint        With 'stop': write checkpoint for clean resume
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
  engine: EngineApi,
  parsed: ParsedArgs,
  deps: { write?: (msg: string) => unknown; promptFn?: (...args: unknown[]) => unknown } = {}
) {
  const write = deps.write || ((msg: string) => process.stdout.write(msg));

  function runDryRunValidation() {
    if (!parsed.command) {
      return {
        ok: false,
        valid: false,
        errors: ['No command specified'],
        checks: [],
      };
    }

    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
    const errors: string[] = [];

    const isMetaCommand = parsed.command.startsWith('_');
    checks.push({
      name: 'command',
      passed: true,
      detail: isMetaCommand ? 'Meta command dry-run validated' : `Mode command ${parsed.command}`,
    });

    if (!isMetaCommand) {
      const modeExists = Object.prototype.hasOwnProperty.call(_MODE_CONFIGS, parsed.command);
      checks.push({
        name: 'mode-config',
        passed: modeExists,
        detail: modeExists
          ? 'Mode exists in MODE_CONFIGS'
          : `Mode ${parsed.command} missing from MODE_CONFIGS`,
      });
      if (!modeExists) {
        errors.push(`Mode ${parsed.command} is not configured`);
      }

      try {
        assertRuntimeSchemaParity(PHASE_AGENTS);
        checks.push({
          name: 'dispatcher-schema-parity',
          passed: true,
          detail: 'Runtime dispatcher phase-agent map matches canonical schema',
        });
      } catch (err) {
        const message = (err as Error).message;
        checks.push({
          name: 'dispatcher-schema-parity',
          passed: false,
          detail: message,
        });
        errors.push(message);
      }
    }

    const platformValid = VALID_PLATFORMS.includes(parsed.platform);
    checks.push({
      name: 'platform',
      passed: platformValid,
      detail: platformValid ? `Platform ${parsed.platform} is supported` : 'Invalid platform',
    });
    if (!platformValid) {
      errors.push(`Invalid platform ${parsed.platform}`);
    }

    return {
      ok: errors.length === 0,
      valid: errors.length === 0,
      dryRun: true,
      command: parsed.command,
      platform: parsed.platform,
      project: parsed.project,
      checks,
      errors,
    };
  }

  if (parsed.dryRun) {
    const validation = runDryRunValidation();
    write(JSON.stringify(validation, null, 2) + '\n');
    return validation;
  }

  if (parsed.command === '_STATUS') {
    const st = engine.status();
    write(JSON.stringify(st, null, 2) + '\n');
    return { ok: true, status: st };
  }

  if (parsed.command === '_STOP') {
    const st = parsed.checkpoint ? engine.pauseAtCheckpoint() : engine.stop();
    write(
      JSON.stringify(
        { ok: true, stopped: true, checkpoint: !!parsed.checkpoint, status: st },
        null,
        2
      ) + '\n'
    );
    return { ok: true, status: st };
  }

  if (parsed.command === '_GATE_CHECK') {
    const sprintId = parsed.project || 'SP-1';
    const result = engine.sprintGate({ sprintId, stories: [] });
    write(JSON.stringify({ ok: true, gateCheck: result }, null, 2) + '\n');
    return { ok: true, gateCheck: result };
  }

  // ── Approval Commands (M6) ──────────────────────────────

  if (parsed.command === '_APPROVALS' || parsed.command === '_APPROVALS_LIST') {
    const governance = engine.getGovernance ? engine.getGovernance() : null;
    if (!governance) {
      write(
        JSON.stringify({ ok: false, error: 'Governance engine not available' }, null, 2) + '\n'
      );
      return { ok: false, error: 'Governance engine not available' };
    }
    const gov = governance as { getPendingApprovals: () => Array<Record<string, unknown>> };
    const pending = gov.getPendingApprovals();
    const rows = pending.map((a) => ({
      id: a.id,
      entity: a.entity_id,
      gate: a.gate_id,
      stage: a.stage,
      requested_by: a.requested_by,
      requested_at: a.requested_at,
      required_role: a.required_role,
    }));
    write(JSON.stringify({ ok: true, pending: rows, count: rows.length }, null, 2) + '\n');
    return { ok: true, pending: rows };
  }

  if (parsed.command === '_APPROVALS_APPROVE') {
    const approvalId = parsed.project;
    if (!approvalId) {
      write(
        JSON.stringify(
          { ok: false, error: 'Approval ID required. Usage: approvals approve <id>' },
          null,
          2
        ) + '\n'
      );
      return { ok: false, error: 'Approval ID required' };
    }
    const governance = engine.getGovernance ? engine.getGovernance() : null;
    if (!governance) {
      write(
        JSON.stringify({ ok: false, error: 'Governance engine not available' }, null, 2) + '\n'
      );
      return { ok: false, error: 'Governance engine not available' };
    }
    try {
      const reason = parsed.reason || 'Approved via CLI';
      const gov = governance as { decide: (...args: unknown[]) => Record<string, unknown> };
      const result = gov.decide(approvalId, 'cli-user', true, reason);
      write(
        JSON.stringify(
          {
            ok: true,
            approval: {
              id: result.id,
              status: result.status,
              decided_by: result.decided_by,
              reason: result.reason,
            },
          },
          null,
          2
        ) + '\n'
      );
      return { ok: true, approval: result };
    } catch (err) {
      const msg = (err as Error).message;
      write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
      return { ok: false, error: msg };
    }
  }

  if (parsed.command === '_APPROVALS_REJECT') {
    const approvalId = parsed.project;
    if (!approvalId) {
      write(
        JSON.stringify(
          { ok: false, error: 'Approval ID required. Usage: approvals reject <id> --reason ...' },
          null,
          2
        ) + '\n'
      );
      return { ok: false, error: 'Approval ID required' };
    }
    if (!parsed.reason) {
      write(
        JSON.stringify(
          { ok: false, error: 'Reason required for rejection. Use --reason "..."' },
          null,
          2
        ) + '\n'
      );
      return { ok: false, error: 'Reason required for rejection' };
    }
    const governance = engine.getGovernance ? engine.getGovernance() : null;
    if (!governance) {
      write(
        JSON.stringify({ ok: false, error: 'Governance engine not available' }, null, 2) + '\n'
      );
      return { ok: false, error: 'Governance engine not available' };
    }
    try {
      const reason = parsed.reason;
      if (!reason) {
        write(
          JSON.stringify(
            { ok: false, error: 'Reason required for rejection. Use --reason "..."' },
            null,
            2
          ) + '\n'
        );
        return { ok: false, error: 'Reason required for rejection' };
      }
      const gov = governance as { decide: (...args: unknown[]) => Record<string, unknown> };
      const result = gov.decide(approvalId, 'cli-user', false, reason);
      write(
        JSON.stringify(
          {
            ok: true,
            approval: {
              id: result.id,
              status: result.status,
              decided_by: result.decided_by,
              reason: result.reason,
            },
          },
          null,
          2
        ) + '\n'
      );
      return { ok: true, approval: result };
    } catch (err) {
      const msg = (err as Error).message;
      write(JSON.stringify({ ok: false, error: msg }, null, 2) + '\n');
      return { ok: false, error: msg };
    }
  }

  // Reset the engine to the requested mode (starts fresh or resumes)
  if (!parsed.command) {
    return { ok: false, error: 'No command specified' };
  }
  if (!parsed.resume) {
    engine.reset(parsed.command);
  }

  // Single-step mode: process one transition and exit
  if (parsed.singleStep) {
    try {
      const result = engine.advance();
      const st = engine.status() as Record<string, unknown>;
      write(
        JSON.stringify(
          {
            ok: true,
            singleStep: true,
            transition: result,
            state: st.state,
            mode: st.mode,
          },
          null,
          2
        ) + '\n'
      );
      return { ok: true, singleStep: true, status: st };
    } catch (err) {
      write(
        JSON.stringify({ ok: false, singleStep: true, error: (err as Error).message }, null, 2) +
          '\n'
      );
      return { ok: false, error: (err as Error).message };
    }
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
    engine?: EngineApi;
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
  const { getStore } = require('../../src/webapp/store');
  const result = run(process.argv.slice(2), { store: getStore() });
  if (!result.ok) {
    process.exitCode = 1;
  }
}
/* c8 ignore stop */

export { parseArgs, executeCommand, run, COMMAND_ALIASES, VALID_PLATFORMS, HELP_TEXT };
