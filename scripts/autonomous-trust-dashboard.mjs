#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const traceDir = path.join(root, 'tests', 'load', 'autonomous-lane-traces');
const outputPath = path.join(traceDir, 'trust-dashboard.json');

function safeParseJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function classifyRun(traceEntries) {
  const explicit = traceEntries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      if (typeof entry.runClass === 'string') return entry.runClass.toLowerCase();
      const details = entry.details;
      if (details && typeof details === 'object' && typeof details.runClass === 'string') {
        return details.runClass.toLowerCase();
      }
      return null;
    })
    .find((value) => value === 'mocked' || value === 'manual' || value === 'autonomous');

  if (explicit) return explicit;

  const hasSandboxEvidence = traceEntries.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const details = entry.details;
    if (!details || typeof details !== 'object') return false;
    return (
      typeof details.sandboxSessionId === 'string' ||
      typeof details.replayBundle === 'string' ||
      typeof details.outputPath === 'string'
    );
  });

  return hasSandboxEvidence ? 'autonomous' : 'mocked';
}

function classifyStatus(traceEntries) {
  const acceptance = [...traceEntries]
    .reverse()
    .find((entry) => entry?.phase === 'acceptance' && typeof entry?.status === 'string');
  if (!acceptance) return 'unknown';

  const status = String(acceptance.status).toLowerCase();
  if (status === 'completed' || status === 'success') return 'success';
  if (status === 'failed' || status === 'error') return 'failed';
  return 'unknown';
}

function toIsoTimestamp(value) {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function main() {
  if (!fs.existsSync(traceDir)) {
    console.error(`Trace directory not found: ${traceDir}`);
    process.exit(1);
  }

  const traceFiles = fs
    .readdirSync(traceDir)
    .filter((name) => /^autonomous-lane-.*\.jsonl$/i.test(name))
    .sort();

  const runRecords = [];

  for (const fileName of traceFiles) {
    const absolutePath = path.join(traceDir, fileName);
    const raw = fs.readFileSync(absolutePath, 'utf8').trim();
    if (!raw) continue;

    const entries = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(safeParseJson)
      .filter((entry) => entry && typeof entry === 'object');

    if (entries.length === 0) continue;

    const runClass = classifyRun(entries);
    const outcome = classifyStatus(entries);
    const firstTimestamp = toIsoTimestamp(entries[0]?.timestamp || null);
    const lastTimestamp = toIsoTimestamp(entries[entries.length - 1]?.timestamp || null);

    runRecords.push({
      fileName,
      runClass,
      outcome,
      firstTimestamp,
      lastTimestamp,
      phases: [
        ...new Set(
          entries.map((entry) => entry.phase).filter((value) => typeof value === 'string')
        ),
      ],
    });
  }

  const categories = ['mocked', 'manual', 'autonomous'];
  const split = {};
  for (const category of categories) {
    const runs = runRecords.filter((record) => record.runClass === category);
    const successCount = runs.filter((record) => record.outcome === 'success').length;
    const failedCount = runs.filter((record) => record.outcome === 'failed').length;
    split[category] = {
      totalRuns: runs.length,
      successCount,
      failedCount,
      successRate: runs.length > 0 ? Number((successCount / runs.length).toFixed(4)) : 0,
    };
  }

  const dashboard = {
    generatedAt: new Date().toISOString(),
    traceDirectory: path.relative(root, traceDir).replace(/\\/g, '/'),
    totals: {
      runCount: runRecords.length,
      successCount: runRecords.filter((record) => record.outcome === 'success').length,
      failedCount: runRecords.filter((record) => record.outcome === 'failed').length,
      unknownCount: runRecords.filter((record) => record.outcome === 'unknown').length,
    },
    split,
    runs: runRecords,
  };

  fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2), 'utf8');

  console.log('Autonomous Trust Dashboard');
  console.log('==========================');
  for (const category of categories) {
    const row = split[category];
    console.log(
      `${category.padEnd(10)} total=${String(row.totalRuns).padEnd(4)} success=${String(row.successCount).padEnd(4)} failed=${String(row.failedCount).padEnd(4)} rate=${(row.successRate * 100).toFixed(1)}%`
    );
  }
  console.log(`\nWrote ${path.relative(root, outputPath).replace(/\\/g, '/')}`);
}

main();
