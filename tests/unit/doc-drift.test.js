import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

/**
 * M15-048 — Documentation / implementation drift detection.
 *
 * These tests catch stale references that have been fixed before and must
 * not regress.  They run as part of the normal Vitest suite in CI.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

/* ── helpers ────────────────────────────────────────────────────── */

/** Recursively collect files under `dir` matching a predicate. */
function walk(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, results);
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function mdFiles(dir) {
  return walk(path.join(ROOT, dir), (n) => n.endsWith('.md'));
}

function readLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

function relPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

/* ── test data ──────────────────────────────────────────────────── */

// Directories checked for doc-drift (user-facing documentation)
const DOC_DIRS = ['docs', 'src/webapp'];
// Additional template dirs
const TEMPLATE_DIRS = ['templates/sdlc'];

const allDocFiles = [...DOC_DIRS, ...TEMPLATE_DIRS].flatMap(mdFiles);

/* ── 1. No server.js references in documentation ───────────────── */

describe('doc-drift: no stale server.js references', () => {
  // sdlc3/ is intentionally excluded — it describes the migration issues
  // scripts/ is excluded — the migration checklist references the old name
  const checked = allDocFiles;

  it('no docs reference server.js (should be server.ts)', () => {
    const hits = [];
    for (const file of checked) {
      const lines = readLines(file);
      lines.forEach((line, i) => {
        if (/\bserver\.js\b/.test(line)) {
          hits.push(`${relPath(file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});

/* ── 2. No unqualified "zero dependency" in webapp scope ────────── */

describe('doc-drift: zero-dependency claims', () => {
  // Only flag "zero" + "depend" in the same line for webapp-level docs.
  // Platform engine files genuinely have zero npm deps — those are fine.
  const webappDocs = mdFiles('src/webapp');
  const topDocs = mdFiles('docs');
  const checked = [...webappDocs, ...topDocs];

  it('no inaccurate zero-dependency claims in webapp/docs scope', () => {
    const hits = [];
    const allowList = [
      // file-lock.ts genuinely has zero external deps (only node:path)
      'file-lock',
      'node:path',
      // platform engine/sdlc references in technical-manual are accurate
      'platform/engine',
      'platform/sdlc',
    ];
    for (const file of checked) {
      const lines = readLines(file);
      lines.forEach((line, i) => {
        if (/zero.*dependenc/i.test(line)) {
          const lower = line.toLowerCase();
          const allowed = allowList.some((ctx) => lower.includes(ctx));
          if (!allowed) {
            hits.push(`${relPath(file)}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    expect(hits).toEqual([]);
  });
});

/* ── 3. Dockerfile CMD matches package.json start script ────────── */

describe('doc-drift: Dockerfile CMD consistency', () => {
  it('Dockerfile CMD runs the same entrypoint as package.json start', () => {
    const dockerfile = fs.readFileSync(path.join(ROOT, 'infra', 'Dockerfile'), 'utf8');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

    // Extract the file path from the start script (e.g. "tsx src/webapp/server.ts")
    const startMatch = pkg.scripts.start.match(/(?:tsx|node)\s+(src\/\S+\.(?:ts|js))/);
    expect(startMatch).toBeTruthy();
    const entrypoint = startMatch[1];

    // Dockerfile CMD should reference the same entrypoint
    expect(dockerfile).toContain(entrypoint);
  });
});

/* ── 4. Health endpoint consistency ─────────────────────────────── */

describe('doc-drift: health endpoint consistency', () => {
  it('Docker and Playwright both reference /api/health', () => {
    const dockerfile = fs.readFileSync(path.join(ROOT, 'infra', 'Dockerfile'), 'utf8');
    const playwrightCfg = fs.readFileSync(path.join(ROOT, 'playwright.config.ts'), 'utf8');

    // Both should reference the readiness endpoint
    expect(dockerfile).toContain('/api/health');
    expect(playwrightCfg).toContain('/api/health');
  });
});

/* ── 5. No unqualified "autonomous" in public-facing docs ───────── */

describe('doc-drift: positioning language', () => {
  // Docs that are public-facing (not internal agent/guardrail system docs)
  const publicDocs = [...mdFiles('docs'), ...mdFiles('src/webapp')];

  it('no unqualified "autonomous" claims in public docs', () => {
    const hits = [];
    const allowList = [
      // ga-definition.md says "GA does NOT mean fully autonomous" — that's fine
      'does not mean',
      'not mean',
      'post-ga',
      'fully autonomous',
      'autonomous-lane-traces',
    ];
    for (const file of publicDocs) {
      const lines = readLines(file);
      lines.forEach((line, i) => {
        if (/\bautonomous/i.test(line)) {
          const lower = line.toLowerCase();
          const allowed = allowList.some((ctx) => lower.includes(ctx));
          if (!allowed) {
            hits.push(`${relPath(file)}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
