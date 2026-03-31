import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

const fs = require('node:fs');
const path = require('node:path');
import * as __req_0 from '../../scripts/generate-platform';
const { generate, loadCanonical, TARGETS } = __req_0;

const ROOT = path.resolve(__dirname, '..', '..');

// Directories written by the generators
const COPILOT_DIR = path.join(ROOT, '.github', 'instructions');
const COPILOT_INSTRUCTIONS = path.join(ROOT, '.github', 'copilot-instructions.md');
const CLAUDE_DIR = path.join(ROOT, '.claude');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');
const CODEX_DIR = path.join(ROOT, '.codex');
const ARCHITECTURE_INDEX_MD = path.join(ROOT, 'docs', 'reference', 'architecture-index.md');
const ARCHITECTURE_INDEX_JSON = path.join(ROOT, 'docs', 'reference', 'architecture-index.json');

describe('Platform transpiler (S4-4/S4-5/S4-6)', () => {
  afterAll(() => {
    // Clean up generated test output
    for (const dir of [COPILOT_DIR, CLAUDE_DIR, CODEX_DIR]) {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
    if (fs.existsSync(CLAUDE_MD)) fs.unlinkSync(CLAUDE_MD);
    if (fs.existsSync(COPILOT_INSTRUCTIONS)) fs.unlinkSync(COPILOT_INSTRUCTIONS);
  });

  it('loads canonical data without errors', () => {
    const data = loadCanonical();
    expect(data.agents).toBeDefined();
    expect(data.flows).toBeDefined();
    expect(data.tools).toBeDefined();
    expect(data.protocols).toBeDefined();
    expect(data.agents.agents.length).toBeGreaterThanOrEqual(38);
    expect(data.protocols.protocols.length).toBeGreaterThanOrEqual(5);
  });

  it('has all 3 target generators', () => {
    expect(Object.keys(TARGETS)).toEqual(['copilot', 'claude', 'openai']);
  });

  // ─── Dry-run mode ──────────────────────────────────────────
  describe('dry-run mode', () => {
    beforeAll(() => {
      // Ensure clean state — remove any previously generated files
      for (const dir of [COPILOT_DIR, CLAUDE_DIR, CODEX_DIR]) {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
      }
      if (fs.existsSync(CLAUDE_MD)) fs.unlinkSync(CLAUDE_MD);
      if (fs.existsSync(COPILOT_INSTRUCTIONS)) fs.unlinkSync(COPILOT_INSTRUCTIONS);
    });

    it('returns file list without writing to disk', () => {
      const results = generate('copilot', { dryRun: true });
      expect(results).toHaveLength(1);
      expect(results[0].dryRun).toBe(true);
      expect(results[0].files).toBeDefined();
      expect(results[0].files.length).toBe(results[0].fileCount);

      // Verify no files were actually written
      for (const f of results[0].files) {
        expect(fs.existsSync(f.path)).toBe(false);
      }
    });

    it('dry-run works for all targets', () => {
      const results = generate('all', { dryRun: true });
      expect(results).toHaveLength(3);
      for (const r of results) {
        expect(r.dryRun).toBe(true);
        expect(r.files.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── Copilot target ────────────────────────────────────────
  describe('copilot target', () => {
    it('generates scoped .instructions.md files', () => {
      const results = generate('copilot');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('copilot');
      expect(results[0].fileCount).toBe(4);

      const protocols = path.join(COPILOT_DIR, 'protocols.instructions.md');
      expect(fs.existsSync(protocols)).toBe(true);
      const content = fs.readFileSync(protocols, 'utf8');
      expect(content).toContain('Anti-Hallucination');
      expect(content).toContain('HANDOFF CHECKLIST');
    });

    it('has YAML frontmatter with applyTo on scoped files', () => {
      const phaseAgents = path.join(COPILOT_DIR, 'phase-agents.instructions.md');
      const content = fs.readFileSync(phaseAgents, 'utf8');
      expect(content).toMatch(/^---\napplyTo:/);
      expect(content).toContain('templates/sdlc/**');
    });

    it('protocols file has no applyTo (applies globally)', () => {
      const protocols = path.join(COPILOT_DIR, 'protocols.instructions.md');
      const content = fs.readFileSync(protocols, 'utf8');
      expect(content).not.toContain('applyTo:');
    });

    it('is idempotent (running twice produces identical output)', () => {
      generate('copilot');
      const first = fs.readFileSync(path.join(COPILOT_DIR, 'protocols.instructions.md'), 'utf8');
      generate('copilot');
      const second = fs.readFileSync(path.join(COPILOT_DIR, 'protocols.instructions.md'), 'utf8');
      expect(first).toBe(second);
    });
  });

  // ─── Claude target ─────────────────────────────────────────
  describe('claude target', () => {
    it('generates CLAUDE.md and .claude/ directory', () => {
      const results = generate('claude');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('claude');

      expect(fs.existsSync(CLAUDE_MD)).toBe(true);
      const content = fs.readFileSync(CLAUDE_MD, 'utf8');
      expect(content).toContain('Anti-Hallucination');
      expect(content).toContain('Agent Execution Order');

      expect(fs.existsSync(CLAUDE_DIR)).toBe(true);
    });

    it('generates settings.json with MCP config', () => {
      const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.mcpServers).toBeDefined();
    });

    it('generates command files', () => {
      const commandsDir = path.join(CLAUDE_DIR, 'commands');
      expect(fs.existsSync(commandsDir)).toBe(true);
      const files = fs.readdirSync(commandsDir);
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => f.endsWith('.md'))).toBe(true);
    });
  });

  // ─── OpenAI target ─────────────────────────────────────────
  describe('openai target', () => {
    it('generates .codex/ with instructions.md and agents.json', () => {
      const results = generate('openai');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('openai');
      expect(results[0].fileCount).toBe(2);

      const instrFile = path.join(CODEX_DIR, 'instructions.md');
      expect(fs.existsSync(instrFile)).toBe(true);
      const content = fs.readFileSync(instrFile, 'utf8');
      expect(content).toContain('Sandbox Execution Model');
      expect(content).toContain('Tool Definitions');
      expect(content).toContain('Anti-Hallucination');

      const agentsFile = path.join(CODEX_DIR, 'agents.json');
      expect(fs.existsSync(agentsFile)).toBe(true);
      const agentConfigs = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
      expect(agentConfigs.length).toBeGreaterThanOrEqual(38);
    });
  });

  // ─── All targets ───────────────────────────────────────────
  describe('all targets', () => {
    it('generates for all 3 platforms at once', () => {
      const results = generate('all');
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.target).sort()).toEqual(['claude', 'copilot', 'openai']);
    });

    it('generates architecture index artifacts in docs/reference', () => {
      generate('all');
      expect(fs.existsSync(ARCHITECTURE_INDEX_MD)).toBe(true);
      expect(fs.existsSync(ARCHITECTURE_INDEX_JSON)).toBe(true);

      const markdown = fs.readFileSync(ARCHITECTURE_INDEX_MD, 'utf8');
      const json = JSON.parse(fs.readFileSync(ARCHITECTURE_INDEX_JSON, 'utf8'));

      expect(markdown).toContain('Architecture Index');
      expect(markdown).toContain('Phase-Agent Mapping');
      expect(json).toHaveProperty('phases');
      expect(json).toHaveProperty('fullFlow');
    });
  });

  // ─── Protocol validation ───────────────────────────────────
  describe('protocol data', () => {
    it('protocols.json contains all 6 mandatory protocols', () => {
      const data = loadCanonical();
      const protoIds = data.protocols.protocols.map((p) => p.id);
      expect(protoIds).toContain('PROTO-001');
      expect(protoIds).toContain('PROTO-002');
      expect(protoIds).toContain('PROTO-003');
      expect(protoIds).toContain('PROTO-004');
      expect(protoIds).toContain('PROTO-005');
      expect(protoIds).toContain('PROTO-006');
    });

    it('handoff checklist has 9 items', () => {
      const data = loadCanonical();
      expect(data.protocols.handoffChecklist.items).toHaveLength(9);
    });

    it('all protocols are marked mandatory', () => {
      const data = loadCanonical();
      for (const proto of data.protocols.protocols) {
        expect(proto.mandatory).toBe(true);
      }
    });
  });

  it('throws on unknown target', () => {
    expect(() => generate('invalid')).toThrow(/Unknown target/);
  });
});
