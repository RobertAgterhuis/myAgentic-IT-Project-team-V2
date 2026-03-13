'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { generate, loadCanonical, TARGETS } = require('../../scripts/generate-platform');

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'platform', 'generated');

describe('Platform transpiler (S4-4/S4-5/S4-6)', () => {
  beforeAll(() => {
    // Clean output directory before tests
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up generated test output
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
  });

  it('loads canonical data without errors', () => {
    const data = loadCanonical();
    expect(data.agents).toBeDefined();
    expect(data.flows).toBeDefined();
    expect(data.tools).toBeDefined();
    expect(data.agents.agents.length).toBeGreaterThanOrEqual(38);
  });

  it('has all 3 target generators', () => {
    expect(Object.keys(TARGETS)).toEqual(['copilot', 'claude', 'openai']);
  });

  describe('copilot target', () => {
    it('generates copilot instructions', () => {
      const results = generate('copilot');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('copilot');
      expect(results[0].fileCount).toBeGreaterThan(1);

      const mainFile = path.join(OUTPUT_DIR, 'copilot', 'copilot-instructions.md');
      expect(fs.existsSync(mainFile)).toBe(true);

      const content = fs.readFileSync(mainFile, 'utf8');
      expect(content).toContain('Agent Roster');
      expect(content).toContain('Command Modes');
      expect(content).toContain('Tool Catalog');
    });

    it('generates per-agent files', () => {
      const agentDir = path.join(OUTPUT_DIR, 'copilot', 'agents');
      expect(fs.existsSync(agentDir)).toBe(true);

      const files = fs.readdirSync(agentDir);
      expect(files.length).toBeGreaterThanOrEqual(38);
    });

    it('is idempotent (running twice produces identical output)', () => {
      generate('copilot');
      const first = fs.readFileSync(
        path.join(OUTPUT_DIR, 'copilot', 'copilot-instructions.md'),
        'utf8'
      );

      // Remove timestamp line for comparison
      const normalize = (s) => s.replace(/^> Generated at: .+$/m, '');

      generate('copilot');
      const second = fs.readFileSync(
        path.join(OUTPUT_DIR, 'copilot', 'copilot-instructions.md'),
        'utf8'
      );

      expect(normalize(first)).toBe(normalize(second));
    });
  });

  describe('claude target', () => {
    it('generates CLAUDE.md and .claude/ directory', () => {
      const results = generate('claude');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('claude');

      const claudeMd = path.join(OUTPUT_DIR, 'claude', 'CLAUDE.md');
      expect(fs.existsSync(claudeMd)).toBe(true);

      const content = fs.readFileSync(claudeMd, 'utf8');
      expect(content).toContain('200k token context');
      expect(content).toContain('Agent Execution Order');

      const claudeDir = path.join(OUTPUT_DIR, 'claude', '.claude');
      expect(fs.existsSync(claudeDir)).toBe(true);

      const agentFiles = fs.readdirSync(claudeDir);
      expect(agentFiles.length).toBeGreaterThanOrEqual(38);
    });
  });

  describe('openai target', () => {
    it('generates codex.md and .codex/ directory', () => {
      const results = generate('openai');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('openai');

      const codexMd = path.join(OUTPUT_DIR, 'openai', 'codex.md');
      expect(fs.existsSync(codexMd)).toBe(true);

      const content = fs.readFileSync(codexMd, 'utf8');
      expect(content).toContain('Sandbox Execution Model');
      expect(content).toContain('Tool Definitions');

      const codexDir = path.join(OUTPUT_DIR, 'openai', '.codex');
      expect(fs.existsSync(codexDir)).toBe(true);
      expect(fs.existsSync(path.join(codexDir, 'agents.json'))).toBe(true);

      // Verify agents.json is valid JSON
      const agentConfigs = JSON.parse(fs.readFileSync(path.join(codexDir, 'agents.json'), 'utf8'));
      expect(agentConfigs.length).toBeGreaterThanOrEqual(38);
    });
  });

  describe('all targets', () => {
    it('generates for all 3 platforms at once', () => {
      const results = generate('all');
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.target).sort()).toEqual(['claude', 'copilot', 'openai']);
    });
  });

  it('throws on unknown target', () => {
    expect(() => generate('invalid')).toThrow(/Unknown target/);
  });
});
