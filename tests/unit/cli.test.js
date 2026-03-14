'use strict';

/**
 * CLI & Command Interface — Unit Tests (FEAT-05-E)
 *
 * Covers:
 * - AC-1: CLI `node orchestrator.js create [project]` starts full pipeline
 * - AC-2: CLI supports all commands: CREATE, AUDIT, FEATURE, SCOPE_CHANGE, HOTFIX, REEVALUATE
 * - AC-3: CLI `--platform copilot|claude|codex` flag
 * - AC-4: CLI `--resume` flag to continue from last session state
 * - AC-5: REST API `POST /api/orchestrator/command` endpoint
 * - AC-6: SSE events emitted for each state transition (verified via engine)
 * - AC-7: Status endpoint `GET /api/orchestrator/status` (verified via engine)
 * - AC-8: Interactive mode flag parsing
 */

const path = require('path');
const fs = require('fs');
const {
  parseArgs,
  executeCommand,
  run,
  COMMAND_ALIASES,
  VALID_PLATFORMS,
  HELP_TEXT,
} = require('../../platform/engine/cli');
const { createEngine } = require('../../platform/engine/engine');

// ─── Test Helpers ────────────────────────────────────────────

const FLOWS_PATH = path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml');
const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

function freshEngine(extraFiles = {}) {
  const sessionPath = '/test/cli-session.json';
  const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
  const events = [];
  const sseNotify = (type, data) => events.push({ type, data });
  const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath, sseNotify });
  return { engine, store, events, sessionPath, sseNotify };
}

function capture() {
  const output = [];
  return {
    write: (msg) => output.push(msg),
    output,
    text: () => output.join(''),
  };
}

// ─────────────────────────────────────────────────────────────
// parseArgs
// ─────────────────────────────────────────────────────────────
describe('CLI parseArgs', () => {
  // ── AC-1: create command ────────────────────────────────
  describe('AC-1: create command', () => {
    it('parses "create myProject"', () => {
      const result = parseArgs(['create', 'myProject']);
      expect(result.command).toBe('CREATE');
      expect(result.project).toBe('myProject');
      expect(result.error).toBeNull();
    });

    it('parses "create" without project', () => {
      const result = parseArgs(['create']);
      expect(result.command).toBe('CREATE');
      expect(result.project).toBeNull();
    });

    it('parses "CREATE" case-insensitively', () => {
      const result = parseArgs(['CREATE', 'SomeApp']);
      expect(result.command).toBe('CREATE');
      expect(result.project).toBe('SomeApp');
    });

    it('joins multi-word project names', () => {
      const result = parseArgs(['create', 'My', 'Cool', 'Project']);
      expect(result.command).toBe('CREATE');
      expect(result.project).toBe('My Cool Project');
    });
  });

  // ── AC-2: all commands ──────────────────────────────────
  describe('AC-2: all supported commands', () => {
    const commands = [
      ['create', 'CREATE'],
      ['create_business', 'CREATE_BUSINESS'],
      ['create_tech', 'CREATE_TECH'],
      ['create_ux', 'CREATE_UX'],
      ['create_marketing', 'CREATE_MARKETING'],
      ['audit', 'AUDIT'],
      ['feature', 'FEATURE'],
      ['scope_change', 'SCOPE_CHANGE'],
      ['hotfix', 'HOTFIX'],
      ['reevaluate', 'REEVALUATE'],
    ];

    it.each(commands)('maps "%s" → %s', (input, expected) => {
      const result = parseArgs([input]);
      expect(result.command).toBe(expected);
      expect(result.error).toBeNull();
    });

    it('handles hyphenated "scope-change"', () => {
      const result = parseArgs(['scope-change']);
      expect(result.command).toBe('SCOPE_CHANGE');
    });

    it('rejects unknown command', () => {
      const result = parseArgs(['destroy']);
      expect(result.error).toContain('Unknown command');
    });
  });

  // ── AC-3: --platform flag ──────────────────────────────
  describe('AC-3: --platform flag', () => {
    it('defaults to copilot', () => {
      const result = parseArgs(['create']);
      expect(result.platform).toBe('copilot');
    });

    it('accepts --platform copilot', () => {
      const result = parseArgs(['create', '--platform', 'copilot']);
      expect(result.platform).toBe('copilot');
    });

    it('accepts --platform claude', () => {
      const result = parseArgs(['create', '--platform', 'claude']);
      expect(result.platform).toBe('claude');
    });

    it('accepts --platform codex', () => {
      const result = parseArgs(['create', '--platform', 'codex']);
      expect(result.platform).toBe('codex');
    });

    it('normalizes platform to lowercase', () => {
      const result = parseArgs(['create', '--platform', 'Claude']);
      expect(result.platform).toBe('claude');
    });

    it('rejects invalid platform', () => {
      const result = parseArgs(['create', '--platform', 'gpt4']);
      expect(result.error).toContain('Invalid platform');
    });

    it('errors on missing platform value', () => {
      const result = parseArgs(['create', '--platform']);
      expect(result.error).toContain('--platform requires a value');
    });

    it('errors when platform value is a flag', () => {
      const result = parseArgs(['create', '--platform', '--resume']);
      expect(result.error).toContain('--platform requires a value');
    });
  });

  // ── AC-4: --resume flag ────────────────────────────────
  describe('AC-4: --resume flag', () => {
    it('defaults to false', () => {
      const result = parseArgs(['create']);
      expect(result.resume).toBe(false);
    });

    it('sets resume to true', () => {
      const result = parseArgs(['create', '--resume']);
      expect(result.resume).toBe(true);
    });

    it('works with other flags', () => {
      const result = parseArgs(['audit', '--platform', 'claude', '--resume']);
      expect(result.command).toBe('AUDIT');
      expect(result.platform).toBe('claude');
      expect(result.resume).toBe(true);
    });
  });

  // ── AC-8: --interactive flag ───────────────────────────
  describe('AC-8: --interactive flag', () => {
    it('defaults to false', () => {
      const result = parseArgs(['create']);
      expect(result.interactive).toBe(false);
    });

    it('sets interactive to true', () => {
      const result = parseArgs(['create', '--interactive']);
      expect(result.interactive).toBe(true);
    });
  });

  // ── Help & error cases ─────────────────────────────────
  describe('help and errors', () => {
    it('sets help flag on --help', () => {
      const result = parseArgs(['--help']);
      expect(result.help).toBe(true);
    });

    it('sets help flag on -h', () => {
      const result = parseArgs(['-h']);
      expect(result.help).toBe(true);
    });

    it('errors on unknown flag', () => {
      const result = parseArgs(['create', '--verbose']);
      expect(result.error).toContain('Unknown flag');
    });

    it('errors on empty args', () => {
      const result = parseArgs([]);
      expect(result.error).toContain('No command specified');
    });
  });

  // ── Status command ─────────────────────────────────────
  describe('status command', () => {
    it('parses status command', () => {
      const result = parseArgs(['status']);
      expect(result.command).toBe('_STATUS');
    });
  });
});

// ─────────────────────────────────────────────────────────────
// executeCommand
// ─────────────────────────────────────────────────────────────
describe('CLI executeCommand', () => {
  describe('AC-1: create starts pipeline', () => {
    it('resets engine to CREATE mode and returns status', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['create', 'TestApp']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.mode).toBe('CREATE');
      expect(result.status.state).toBe('IDLE');

      const output = JSON.parse(out.text());
      expect(output.command).toBe('CREATE');
      expect(output.project).toBe('TestApp');
    });
  });

  describe('AC-2: multiple commands', () => {
    it('resets to AUDIT mode', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['audit', 'Legacy']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.mode).toBe('AUDIT');
    });

    it('resets to FEATURE mode', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['feature', 'NewFeature']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.mode).toBe('FEATURE');
    });

    it('resets to HOTFIX mode', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['hotfix']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.mode).toBe('HOTFIX');
    });

    it('resets to CREATE_BUSINESS mode', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['create_business', 'BizProject']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.mode).toBe('CREATE_BUSINESS');
    });
  });

  describe('AC-3: platform is included in output', () => {
    it('includes platform in output JSON', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['create', '--platform', 'claude']);
      executeCommand(engine, parsed, { write: out.write });

      const output = JSON.parse(out.text());
      expect(output.platform).toBe('claude');
    });
  });

  describe('AC-4: resume skips reset', () => {
    it('does not reset engine when --resume is set', () => {
      const { engine } = freshEngine();
      //  Advance to ONBOARDING first
      engine.advance();
      expect(engine.status().state).toBe('ONBOARDING');

      const out = capture();
      const parsed = parseArgs(['create', '--resume']);
      const result = executeCommand(engine, parsed, { write: out.write });

      // Should still be at ONBOARDING — engine was NOT reset
      expect(result.status.state).toBe('ONBOARDING');
    });

    it('resets engine when --resume is NOT set', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      expect(engine.status().state).toBe('ONBOARDING');

      const out = capture();
      const parsed = parseArgs(['create']);
      const result = executeCommand(engine, parsed, { write: out.write });

      // Engine was reset — back to IDLE
      expect(result.status.state).toBe('IDLE');
    });
  });

  describe('AC-7: status command', () => {
    it('returns current status without modifying state', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING

      const out = capture();
      const parsed = parseArgs(['status']);
      const result = executeCommand(engine, parsed, { write: out.write });

      expect(result.ok).toBe(true);
      expect(result.status.state).toBe('ONBOARDING');

      const output = JSON.parse(out.text());
      expect(output.state).toBe('ONBOARDING');
    });
  });

  describe('AC-8: interactive flag in output', () => {
    it('includes interactive flag in output', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['create', '--interactive']);
      executeCommand(engine, parsed, { write: out.write });

      const output = JSON.parse(out.text());
      expect(output.interactive).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// run() integration
// ─────────────────────────────────────────────────────────────
describe('CLI run()', () => {
  it('shows help with --help', () => {
    const out = capture();
    const result = run(['--help'], { write: out.write });
    expect(result.ok).toBe(true);
    expect(out.text()).toContain('Orchestrator CLI');
  });

  it('returns error for missing command', () => {
    const out = capture();
    const result = run([], { write: out.write });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('No command specified');
  });

  it('returns error for parse errors', () => {
    const out = capture();
    const result = run(['create', '--platform', 'gpt4'], { write: out.write });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid platform');
  });

  it('returns error when no store provided', () => {
    const out = capture();
    const result = run(['create'], { write: out.write });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('No store provided');
  });

  it('executes create with a store', () => {
    const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT });
    const out = capture();
    const result = run(['create', 'MyApp'], { write: out.write, store });

    expect(result.ok).toBe(true);
    expect(result.status.mode).toBe('CREATE');
  });

  it('executes status with a pre-built engine', () => {
    const { engine } = freshEngine();
    engine.advance();

    const out = capture();
    const result = run(['status'], { write: out.write, engine });

    expect(result.ok).toBe(true);
    const output = JSON.parse(out.text());
    expect(output.state).toBe('ONBOARDING');
  });

  it('executes audit with --platform claude --resume', () => {
    const { engine } = freshEngine();
    engine.advance(); // → ONBOARDING

    const out = capture();
    const result = run(['audit', '--platform', 'claude', '--resume'], {
      write: out.write,
      engine,
    });

    expect(result.ok).toBe(true);
    // --resume keeps ONBOARDING state
    expect(result.status.state).toBe('ONBOARDING');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-6: SSE events on transitions (tested via engine)
// ─────────────────────────────────────────────────────────────
describe('AC-6: SSE events on command execution', () => {
  it('emits orchestrator:reset SSE event when a command resets the engine', () => {
    const { engine, events } = freshEngine();
    const out = capture();
    const parsed = parseArgs(['audit']);
    executeCommand(engine, parsed, { write: out.write });

    const resetEvents = events.filter((e) => e.type === 'orchestrator:reset');
    expect(resetEvents.length).toBe(1);
    expect(resetEvents[0].data.mode).toBe('AUDIT');
  });

  it('emits orchestrator:transition on advance after command', () => {
    const { engine, events } = freshEngine();
    const out = capture();
    const parsed = parseArgs(['create']);
    executeCommand(engine, parsed, { write: out.write });

    // Now advance
    engine.advance();
    const transitions = events.filter((e) => e.type === 'orchestrator:transition');
    expect(transitions.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Exports sanity checks
// ─────────────────────────────────────────────────────────────
describe('CLI module exports', () => {
  it('exports COMMAND_ALIASES', () => {
    expect(COMMAND_ALIASES.create).toBe('CREATE');
    expect(COMMAND_ALIASES.audit).toBe('AUDIT');
    expect(COMMAND_ALIASES.hotfix).toBe('HOTFIX');
    expect(COMMAND_ALIASES.reevaluate).toBe('REEVALUATE');
  });

  it('exports VALID_PLATFORMS', () => {
    expect(VALID_PLATFORMS).toContain('copilot');
    expect(VALID_PLATFORMS).toContain('claude');
    expect(VALID_PLATFORMS).toContain('codex');
  });

  it('exports HELP_TEXT as a string', () => {
    expect(typeof HELP_TEXT).toBe('string');
    expect(HELP_TEXT).toContain('create');
    expect(HELP_TEXT).toContain('--platform');
    expect(HELP_TEXT).toContain('--resume');
    expect(HELP_TEXT).toContain('--interactive');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-5: POST /api/orchestrator/command (via engine API)
// ─────────────────────────────────────────────────────────────
describe('AC-5: command endpoint (engine-level)', () => {
  it('accepts CREATE command and resets engine', () => {
    const { engine } = freshEngine();
    engine.advance(); // → ONBOARDING

    const result = engine.reset('CREATE');
    expect(result.state).toBe('IDLE');
    expect(result.mode).toBe('CREATE');
  });

  it('accepts AUDIT command', () => {
    const { engine } = freshEngine();
    const result = engine.reset('AUDIT');
    expect(result.mode).toBe('AUDIT');
  });

  it('accepts FEATURE command', () => {
    const { engine } = freshEngine();
    const result = engine.reset('FEATURE');
    expect(result.mode).toBe('FEATURE');
  });

  it('accepts HOTFIX command', () => {
    const { engine } = freshEngine();
    const result = engine.reset('HOTFIX');
    expect(result.mode).toBe('HOTFIX');
  });

  it('accepts SCOPE_CHANGE command', () => {
    const { engine } = freshEngine();
    const result = engine.reset('SCOPE_CHANGE');
    expect(result.mode).toBe('SCOPE_CHANGE');
  });

  it('rejects unknown mode', () => {
    const { engine } = freshEngine();
    expect(() => engine.reset('INVALID')).toThrow(/Unknown mode/);
  });

  it('resume preserves current state (no reset)', () => {
    const { engine } = freshEngine();
    engine.advance(); // → ONBOARDING
    engine.advance(); // → PHASE_1

    // "Resume" means we don't reset — just check status
    const st = engine.status();
    expect(st.state).toBe('PHASE_1');
    expect(st.mode).toBe('CREATE');
  });
});

// ─────────────────────────────────────────────────────────────
// #174: stop, gate-check, elapsed time in status
// ─────────────────────────────────────────────────────────────
describe('#174: stop command', () => {
  describe('parseArgs', () => {
    it('parses "stop" command', () => {
      const result = parseArgs(['stop']);
      expect(result.command).toBe('_STOP');
      expect(result.error).toBeNull();
    });
  });

  describe('executeCommand', () => {
    it('stops a running pipeline and returns stopped status', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      const out = capture();
      const parsed = parseArgs(['stop']);
      const result = executeCommand(engine, parsed, { write: out.write });
      expect(result.ok).toBe(true);
      expect(result.status.state).toBe('ERROR');
      const output = JSON.parse(out.text());
      expect(output.stopped).toBe(true);
    });
  });

  describe('run()', () => {
    it('stops engine via run()', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      const out = capture();
      const result = run(['stop'], { write: out.write, engine });
      expect(result.ok).toBe(true);
      expect(result.status.state).toBe('ERROR');
    });
  });
});

describe('#174: gate-check command', () => {
  describe('parseArgs', () => {
    it('parses "gate-check" command (hyphenated)', () => {
      const result = parseArgs(['gate-check']);
      expect(result.command).toBe('_GATE_CHECK');
      expect(result.error).toBeNull();
    });

    it('parses "gate_check" command (underscored)', () => {
      const result = parseArgs(['gate_check']);
      expect(result.command).toBe('_GATE_CHECK');
    });
  });

  describe('executeCommand', () => {
    it('runs sprint gate check and returns result', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['gate-check']);
      const result = executeCommand(engine, parsed, { write: out.write });
      expect(result.ok).toBe(true);
      expect(result.gateCheck).toBeDefined();
      expect(result.gateCheck.verdict).toBeDefined();
      const output = JSON.parse(out.text());
      expect(output.gateCheck.verdict).toBeDefined();
    });

    it('uses project name as sprintId', () => {
      const { engine } = freshEngine();
      const out = capture();
      const parsed = parseArgs(['gate-check', 'SP-5']);
      const result = executeCommand(engine, parsed, { write: out.write });
      expect(result.ok).toBe(true);
      expect(result.gateCheck.summary.sprintId).toBe('SP-5');
    });
  });
});

describe('#174: status output includes elapsed time and phase metadata', () => {
  it('status() includes elapsedMs field', () => {
    const { engine } = freshEngine();
    const st = engine.status();
    expect(typeof st.elapsedMs).toBe('number');
    expect(st.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('status() includes phaseMetadata array', () => {
    const { engine } = freshEngine();
    engine.advance(); // IDLE → ONBOARDING
    const st = engine.status();
    expect(Array.isArray(st.phaseMetadata)).toBe(true);
    expect(st.phaseMetadata.length).toBeGreaterThan(0);
    const current = st.phaseMetadata.find((p) => p.status === 'current');
    expect(current).toBeDefined();
    expect(current.state).toBe('ONBOARDING');
  });

  it('CLI status command outputs elapsed time', () => {
    const { engine } = freshEngine();
    const out = capture();
    const parsed = parseArgs(['status']);
    executeCommand(engine, parsed, { write: out.write });
    const output = JSON.parse(out.text());
    expect(typeof output.elapsedMs).toBe('number');
    expect(output.phaseMetadata).toBeDefined();
  });
});
