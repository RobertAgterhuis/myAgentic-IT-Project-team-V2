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

const cwd = process.cwd();
loadEnvIfPresent(path.join(cwd, '.env'));
loadEnvIfPresent(path.join(cwd, '.env.local'));
loadEnvIfPresent(path.join(cwd, 'src', 'webapp', '.env'));
loadEnvIfPresent(path.join(cwd, 'src', 'webapp', '.env.local'));

const targetModule = process.argv[2] || 'src/webapp/server.ts';
const targetPath = path.resolve(cwd, targetModule);

void (async () => {
  await import(pathToFileURL(targetPath).href);
})();
