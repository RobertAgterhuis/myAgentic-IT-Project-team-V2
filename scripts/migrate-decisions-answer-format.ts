#!/usr/bin/env tsx
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import { FileStore } from '../src/webapp/store';
import { migrateDecidedRowsToAnswerFormat } from '../src/webapp/models';

interface Options {
  write: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    write: argv.includes('--write'),
  };
}

function collectDecisionFiles(projectRoot: string): string[] {
  const businessDocs = path.join(projectRoot, 'BusinessDocs');
  const decisionsDir = path.join(businessDocs, 'decisions');
  const files = [path.join(businessDocs, 'decisions.md')];

  if (fs.existsSync(decisionsDir)) {
    for (const entry of fs.readdirSync(decisionsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path.join(decisionsDir, entry.name));
      }
    }
  }

  return files;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..');
  const store = new FileStore();
  const files = collectDecisionFiles(projectRoot);

  let changedFiles = 0;
  let changedRows = 0;

  for (const filePath of files) {
    if (!store.exists(filePath)) continue;

    const original = store.readFile(filePath, 'utf8');
    const migrated = migrateDecidedRowsToAnswerFormat(original);
    if (migrated.changedRows === 0) continue;

    changedFiles += 1;
    changedRows += migrated.changedRows;

    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    console.log(
      `${options.write ? 'UPDATED' : 'WOULD UPDATE'} ${relativePath} (${migrated.changedRows} row(s))`
    );

    if (options.write) {
      store.writeFile(filePath, migrated.content, 'utf8');
    }
  }

  console.log(
    `${options.write ? 'Migration complete' : 'Dry run complete'}: ${changedFiles} file(s), ${changedRows} row(s)`
  );
}

main();
