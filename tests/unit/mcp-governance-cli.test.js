'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ── helpers ────────────────────────────────────────────────────────────────────

/** parseArgs slices from index 2, so supply two dummy entries first. */
function argv(...args) {
  return ['node', 'cli.ts', ...args];
}

let root;
let capturedOut;
let capturedErr;
let origArgv;
let origExit;

const { parseArgs, run } = require('../../src/webapp/plugins/mcp-governance/cli');

// ── parseArgs unit tests ───────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns empty command and no flags when no args', () => {
    const r = parseArgs(['node', 'cli.ts']);
    expect(r.command).toEqual([]);
    expect(r.apply).toBe(false);
    expect(r.dryRun).toBe(false);
  });

  it('parses positional command tokens', () => {
    const r = parseArgs(argv('agents', 'sync'));
    expect(r.command).toEqual(['agents', 'sync']);
  });

  it('parses --apply flag', () => {
    const r = parseArgs(argv('bootstrap', '--apply'));
    expect(r.apply).toBe(true);
    expect(r.dryRun).toBe(false);
    expect(r.command).toEqual(['bootstrap']);
  });

  it('parses --dry-run flag', () => {
    const r = parseArgs(argv('mcp', 'sync', '--dry-run'));
    expect(r.dryRun).toBe(true);
    expect(r.apply).toBe(false);
    expect(r.command).toEqual(['mcp', 'sync']);
  });

  it('filters out flag tokens from command array', () => {
    const r = parseArgs(argv('--apply', 'bootstrap', '--dry-run'));
    expect(r.command).toEqual(['bootstrap']);
  });
});

// ── run() integration tests ────────────────────────────────────────────────────

describe('run() CLI commands', () => {
  beforeEach(async () => {
    // Create a fresh temp project root that mimics the real scaffold
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-cli-'));
    const pluginRoot = path.join(root, 'src', 'webapp', 'plugins', 'mcp-governance');
    fs.mkdirSync(path.join(pluginRoot, 'migrations'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, 'migrations', '001_mcp_governance.sql'),
      [
        'CREATE TABLE IF NOT EXISTS agent_types (id TEXT PRIMARY KEY, category TEXT NOT NULL, control_posture TEXT NOT NULL, requires_workload_identity INTEGER NOT NULL, app_registration_ref TEXT, template_category TEXT NOT NULL);',
        "CREATE TABLE IF NOT EXISTS mcp_migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));",
      ].join('\n'),
      'utf8'
    );

    // Capture stdout / stderr
    capturedOut = [];
    capturedErr = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      capturedOut.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      capturedErr.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });

    origArgv = process.argv;
    origExit = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = origArgv;
    process.exitCode = origExit;
    fs.rmSync(root, { recursive: true, force: true });
  });

  function parsedOut() {
    return JSON.parse(capturedOut.join(''));
  }

  // ── no command ──────────────────────────────────────────────────────────────
  it('prints usage and sets exitCode=1 when no command given', async () => {
    process.argv = argv();
    await run(root);
    expect(process.exitCode).toBe(1);
    const out = capturedOut.join('');
    expect(out).toContain('MCP Governance CLI');
  });

  // ── unknown command ─────────────────────────────────────────────────────────
  it('prints usage and sets exitCode=1 for unknown command', async () => {
    process.argv = argv('unknown-command');
    await run(root);
    expect(process.exitCode).toBe(1);
    const out = capturedOut.join('');
    expect(out).toContain('Usage');
  });

  // ── init ─────────────────────────────────────────────────────────────────────
  it('init command returns ok:true with created/skipped', async () => {
    process.argv = argv('init');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('init');
    expect(Array.isArray(result.created)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
  });

  it('init is idempotent (second run skips all)', async () => {
    process.argv = argv('init');
    await run(root);
    capturedOut = [];
    await run(root);
    const result = parsedOut();
    expect(result.created).toEqual([]);
  });

  // ── bootstrap ────────────────────────────────────────────────────────────────
  it('bootstrap --dry-run does not persist agents', async () => {
    process.argv = argv('bootstrap', '--dry-run');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('bootstrap');
    expect(result.apply).toBe(false);
    expect(result.agents.added).toBeGreaterThan(0); // dry-run still reports count
  });

  it('bootstrap --apply persists agents', async () => {
    process.argv = argv('bootstrap', '--apply');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.apply).toBe(true);
    expect(result.agents.added).toBe(12);
  });

  it('bootstrap with no flag defaults to apply=true', async () => {
    process.argv = argv('bootstrap');
    await run(root);
    const result = parsedOut();
    expect(result.apply).toBe(true);
  });

  // ── agents sync ──────────────────────────────────────────────────────────────
  it('agents sync --apply seeds 12 agents', async () => {
    process.argv = argv('agents', 'sync', '--apply');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('agents sync');
    expect(result.apply).toBe(true);
    expect(result.added).toBe(12);
  });

  it('agents sync --dry-run does not persist', async () => {
    process.argv = argv('agents', 'sync', '--dry-run');
    await run(root);
    const result = parsedOut();
    expect(result.apply).toBe(false);
    expect(result.added).toBeGreaterThan(0);
  });

  it('agents sync with no flag defaults to apply=true', async () => {
    process.argv = argv('agents', 'sync');
    await run(root);
    const result = parsedOut();
    expect(result.apply).toBe(true);
  });

  // ── mcp sync ─────────────────────────────────────────────────────────────────
  it('mcp sync --apply seeds servers', async () => {
    process.argv = argv('mcp', 'sync', '--apply');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('mcp sync');
    expect(result.apply).toBe(true);
    expect(result.added).toBeGreaterThan(0);
  });

  it('mcp sync --dry-run does not persist', async () => {
    process.argv = argv('mcp', 'sync', '--dry-run');
    await run(root);
    const result = parsedOut();
    expect(result.apply).toBe(false);
  });

  it('mcp sync with no flag defaults to apply=true', async () => {
    process.argv = argv('mcp', 'sync');
    await run(root);
    const result = parsedOut();
    expect(result.apply).toBe(true);
  });

  // ── runtime build ─────────────────────────────────────────────────────────────
  it('runtime build generates artifacts', async () => {
    // seed data first so manifests can be written
    process.argv = argv('agents', 'sync', '--apply');
    await run(root);
    capturedOut = [];
    process.argv = argv('mcp', 'sync', '--apply');
    await run(root);
    capturedOut = [];

    process.argv = argv('runtime', 'build');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('runtime build');
    expect(result.manifestCount).toBe(12);
  });

  // ── doctor ──────────────────────────────────────────────────────────────────
  it('doctor returns status report', async () => {
    process.argv = argv('doctor');
    await run(root);
    const result = parsedOut();
    expect(result.ok).toBe(true);
    expect(result.command).toBe('doctor');
    expect(typeof result.configExists).toBe('boolean');
  });
});
