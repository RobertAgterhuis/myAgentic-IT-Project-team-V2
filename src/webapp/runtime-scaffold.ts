// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';

export interface RuntimeScaffoldResult {
  created: string[];
  skipped: string[];
}

function ensureDir(dirPath: string, result: RuntimeScaffoldResult): void {
  if (fs.existsSync(dirPath)) {
    result.skipped.push(dirPath);
    return;
  }
  fs.mkdirSync(dirPath, { recursive: true });
  result.created.push(dirPath);
}

/**
 * Ensure minimal runtime directories exist so install/build/start can recover
 * from a deleted .agentic folder.
 */
export function ensureRuntimeScaffold(projectRoot = process.cwd()): RuntimeScaffoldResult {
  const result: RuntimeScaffoldResult = { created: [], skipped: [] };

  const dirs = [
    path.join(projectRoot, '.agentic'),
    path.join(projectRoot, '.agentic', 'storage'),
    path.join(projectRoot, '.agentic', 'mcp-governance'),
    path.join(projectRoot, 'BusinessDocs', 'session'),
    path.join(projectRoot, 'BusinessDocs', 'audit'),
    path.join(projectRoot, 'BusinessDocs', 'metrics'),
  ];

  for (const dirPath of dirs) {
    ensureDir(dirPath, result);
  }

  return result;
}
