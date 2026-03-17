#!/usr/bin/env tsx
/* eslint-disable no-console */
// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Storage migration utility (M23-006).
 *
 * Migrates data between StorageProvider implementations (file ↔ sqlite).
 * Reads all documents from the source, writes them to the target, and
 * validates that the migration is complete.
 *
 * Usage:
 *   npx tsx scripts/migrate-storage.ts --from file --to sqlite [--dry-run]
 *   npx tsx scripts/migrate-storage.ts --from sqlite --to file [--dry-run]
 *
 * Options:
 *   --from <provider>   Source provider type: "file" or "sqlite"
 *   --to <provider>     Target provider type: "file" or "sqlite"
 *   --dry-run           Show what would be migrated without writing
 *   --source-path <p>   Override path for source provider
 *   --target-path <p>   Override path for target provider
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  createStorageProvider,
  type StorageProvider,
  type ProviderType,
  type Document,
} from '../platform/engine/persistence';

/* ── CLI argument parsing ──────────────────────────────────────── */

interface MigrateOptions {
  from: ProviderType;
  to: ProviderType;
  dryRun: boolean;
  sourcePath?: string;
  targetPath?: string;
}

function parseArgs(argv: string[]): MigrateOptions {
  const opts: MigrateOptions = { from: 'file', to: 'sqlite', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--from':
        opts.from = argv[++i] as ProviderType;
        break;
      case '--to':
        opts.to = argv[++i] as ProviderType;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--source-path':
        opts.sourcePath = argv[++i];
        break;
      case '--target-path':
        opts.targetPath = argv[++i];
        break;
    }
  }
  if (!['file', 'sqlite'].includes(opts.from) || !['file', 'sqlite'].includes(opts.to)) {
    throw new Error('--from and --to must be "file" or "sqlite"');
  }
  if (opts.from === opts.to) {
    throw new Error('Source and target providers must be different');
  }
  return opts;
}

/* ── Collection discovery ──────────────────────────────────────── */

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Discover collection names from a file-based provider. */
function discoverFileCollections(basePath: string): string[] {
  if (!fs.existsSync(basePath)) return [];
  return fs
    .readdirSync(basePath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);
}

/** Discover collection names from a SQLite provider. */
function discoverSqliteCollections(provider: StorageProvider): string[] {
  // SQLite tables are named col_{collection} — query sqlite_master
  const db = (provider as Record<string, unknown>)._db as {
    prepare(sql: string): { all(): Array<{ name: string }> };
  } | null;
  if (!db) return [];
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'col_%'")
    .all();
  return rows.map((r) => r.name.replace(/^col_/, ''));
}

function discoverCollections(
  provider: StorageProvider,
  providerType: ProviderType,
  basePath?: string
): string[] {
  if (providerType === 'file') {
    const bp = basePath || path.join(PROJECT_ROOT, '.agentic', 'storage');
    return discoverFileCollections(bp);
  }
  return discoverSqliteCollections(provider);
}

/* ── Content hash ──────────────────────────────────────────────── */

function hashDocument(doc: Document): string {
  const sorted = JSON.stringify(doc, Object.keys(doc).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

/* ── Migration ─────────────────────────────────────────────────── */

interface MigrationResult {
  collection: string;
  documentCount: number;
  skipped: number;
  errors: string[];
}

async function migrateCollection(
  source: StorageProvider,
  target: StorageProvider,
  collection: string,
  dryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = { collection, documentCount: 0, skipped: 0, errors: [] };

  const docs = await source.list(collection);
  result.documentCount = docs.length;

  if (dryRun) {
    console.log(`  [DRY RUN] ${collection}: ${docs.length} document(s) would be migrated`);
    return result;
  }

  for (const doc of docs) {
    try {
      await target.write(collection, doc.id, doc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${collection}/${doc.id}: ${msg}`);
    }
  }

  return result;
}

async function validateMigration(
  source: StorageProvider,
  target: StorageProvider,
  collections: string[]
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  for (const collection of collections) {
    const sourceDocs = await source.list(collection);
    const targetDocs = await target.list(collection);

    if (sourceDocs.length !== targetDocs.length) {
      issues.push(
        `${collection}: count mismatch — source=${sourceDocs.length}, target=${targetDocs.length}`
      );
      continue;
    }

    const targetMap = new Map(targetDocs.map((d) => [d.id, d]));
    for (const srcDoc of sourceDocs) {
      const tgtDoc = targetMap.get(srcDoc.id);
      if (!tgtDoc) {
        issues.push(`${collection}/${srcDoc.id}: missing in target`);
        continue;
      }
      const srcHash = hashDocument(srcDoc);
      const tgtHash = hashDocument(tgtDoc);
      if (srcHash !== tgtHash) {
        issues.push(`${collection}/${srcDoc.id}: content hash mismatch`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/* ── Main ──────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  console.log(`\nStorage Migration: ${opts.from} → ${opts.to}`);
  if (opts.dryRun) console.log('  Mode: DRY RUN (no writes)\n');
  else console.log('');

  const sourceConfig = {
    provider: opts.from,
    basePath:
      opts.sourcePath ||
      (opts.from === 'file' ? path.join(PROJECT_ROOT, '.agentic', 'storage') : undefined),
    dbPath:
      opts.sourcePath ||
      (opts.from === 'sqlite' ? path.join(PROJECT_ROOT, '.agentic', 'data.db') : undefined),
  };
  const targetConfig = {
    provider: opts.to,
    basePath:
      opts.targetPath ||
      (opts.to === 'file' ? path.join(PROJECT_ROOT, '.agentic', 'storage') : undefined),
    dbPath:
      opts.targetPath ||
      (opts.to === 'sqlite' ? path.join(PROJECT_ROOT, '.agentic', 'data.db') : undefined),
  };

  const source = await createStorageProvider(sourceConfig);
  const target = await createStorageProvider(targetConfig);

  try {
    const collections = discoverCollections(
      source,
      opts.from,
      opts.from === 'file' ? sourceConfig.basePath : undefined
    );

    if (collections.length === 0) {
      console.log('No collections found in source. Nothing to migrate.');
      return;
    }

    console.log(`Found ${collections.length} collection(s): ${collections.join(', ')}\n`);

    const results: MigrationResult[] = [];
    let totalDocs = 0;
    let totalErrors = 0;

    for (const collection of collections) {
      const result = await migrateCollection(source, target, collection, opts.dryRun);
      results.push(result);
      totalDocs += result.documentCount;
      totalErrors += result.errors.length;
      if (!opts.dryRun) {
        const status = result.errors.length ? '⚠' : '✓';
        console.log(
          `  ${status} ${collection}: ${result.documentCount} doc(s), ${result.errors.length} error(s)`
        );
      }
    }

    console.log(`\nTotal: ${totalDocs} document(s) across ${collections.length} collection(s)`);
    if (totalErrors > 0) {
      console.log(`\n⚠ ${totalErrors} error(s):`);
      for (const r of results) {
        for (const e of r.errors) console.log(`  - ${e}`);
      }
    }

    if (!opts.dryRun) {
      console.log('\nValidating migration...');
      const validation = await validateMigration(source, target, collections);
      if (validation.valid) {
        console.log('✓ Migration validated — all documents match.');
      } else {
        console.log(`⚠ Validation found ${validation.issues.length} issue(s):`);
        for (const issue of validation.issues) console.log(`  - ${issue}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((err: Error) => {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
});
