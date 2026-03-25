#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function loadEnvIfPresent(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  if (typeof process.loadEnvFile !== 'function') return;

  try {
    process.loadEnvFile(filePath);
  } catch {
    // Keep startup resilient: missing/invalid env files should not block boot.
  }
}

// browserfs bundles a webpack build that accesses `localStorage` at module
// evaluation time. On Node 22+ localStorage is a built-in but requires
// --localstorage-file; provide a no-op shim before any dependent modules are
// loaded to prevent the warning.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

const cwd = process.cwd();
loadEnvIfPresent(path.join(cwd, '.env'));
loadEnvIfPresent(path.join(cwd, '.env.local'));
loadEnvIfPresent(path.join(cwd, 'src', 'webapp', '.env'));
loadEnvIfPresent(path.join(cwd, 'src', 'webapp', '.env.local'));

const targetModule = process.argv[2] || 'src/webapp/server.ts';
const targetPath = path.resolve(cwd, targetModule);

// Signal to the target module that it is being run as the main entry point
// (dynamic import() does not set require.main, so we use a global flag).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__WEBAPP_BOOTSTRAP_ENTRY = targetPath;

void (async () => {
  await import(pathToFileURL(targetPath).href);
})();
