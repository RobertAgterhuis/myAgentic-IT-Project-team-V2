#!/usr/bin/env node
/**
 * install-hooks.js — Copies Git hooks from .github/hooks/ to .git/hooks/
 * Run automatically via `npm install` (package.json "prepare" script)
 * Guardrail: G-GLOB-60 local enforcement
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const HOOKS_SRC  = path.resolve(__dirname, '..', 'hooks');
const GIT_HOOKS  = path.resolve(__dirname, '..', '..', '.git', 'hooks');

if (!fs.existsSync(HOOKS_SRC)) {
  console.log('[install-hooks] No .github/hooks/ directory found, skipping.');
  process.exit(0);
}

if (!fs.existsSync(GIT_HOOKS)) {
  console.log('[install-hooks] No .git/hooks/ directory found (not a git repo?), skipping.');
  process.exit(0);
}

const hooks = fs.readdirSync(HOOKS_SRC).filter(f => !f.startsWith('.'));

for (const hook of hooks) {
  const src  = path.join(HOOKS_SRC, hook);
  const dest = path.join(GIT_HOOKS, hook);

  fs.copyFileSync(src, dest);

  // Make executable on Unix-like systems
  try { fs.chmodSync(dest, 0o755); } catch { /* Windows — chmod not needed */ }

  console.log(`[install-hooks] Installed: ${hook}`);
}

console.log(`[install-hooks] ${hooks.length} hook(s) installed.`);
