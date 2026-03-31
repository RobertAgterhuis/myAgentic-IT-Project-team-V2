#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');

const THRESHOLDS = {
  statements: Number(process.env.COVERAGE_MIN_STATEMENTS || 67.3),
  branches: Number(process.env.COVERAGE_MIN_BRANCHES || 55),
  functions: Number(process.env.COVERAGE_MIN_FUNCTIONS || 66),
  lines: Number(process.env.COVERAGE_MIN_LINES || 67),
};

const RAG_STORE_FILE_PATTERNS = [
  '/src/webapp/services/rag/rag-store.ts',
  '\\src\\webapp\\services\\rag\\rag-store.ts',
];

const REFLECTION_FILE_PATTERNS = {
  dispatcher: ['/platform/engine/dispatcher.ts', '\\platform\\engine\\dispatcher.ts'],
  selfRevision: ['/platform/engine/self-revision.ts', '\\platform\\engine\\self-revision.ts'],
};

const REFLECTION_THRESHOLDS = {
  statements: Number(process.env.COVERAGE_MIN_REFLECTION_STATEMENTS || 0),
  branches: Number(process.env.COVERAGE_MIN_REFLECTION_BRANCHES || 0),
  functions: Number(process.env.COVERAGE_MIN_REFLECTION_FUNCTIONS || 0),
  lines: Number(process.env.COVERAGE_MIN_REFLECTION_LINES || 0),
};

function metricValue(total, metric) {
  const value = total?.[metric]?.pct;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Missing or invalid coverage metric: ${metric}`);
  }
  return value;
}

function formatPct(value) {
  return `${value.toFixed(2)}%`;
}

function findRagStoreCoverage(summary) {
  if (!summary || typeof summary !== 'object') return null;

  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === 'total') continue;
    if (!RAG_STORE_FILE_PATTERNS.some((pattern) => filePath.includes(pattern))) continue;
    if (!metrics || typeof metrics !== 'object') continue;
    return { filePath, metrics };
  }

  return null;
}

function findFileCoverage(summary, patterns) {
  if (!summary || typeof summary !== 'object') return null;

  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === 'total') continue;
    if (!patterns.some((pattern) => filePath.includes(pattern))) continue;
    if (!metrics || typeof metrics !== 'object') continue;
    return { filePath, metrics };
  }

  return null;
}

try {
  if (!fs.existsSync(SUMMARY_PATH)) {
    throw new Error(`Coverage summary not found at ${SUMMARY_PATH}. Run test coverage first.`);
  }

  const raw = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  const total = raw?.total;
  if (!total) {
    throw new Error(`Invalid coverage summary format in ${SUMMARY_PATH}.`);
  }
  const failures = [];

  console.log('Coverage Threshold Gate');
  console.log(`Summary: ${SUMMARY_PATH}`);

  for (const metric of Object.keys(THRESHOLDS)) {
    const actual = metricValue(total, metric);
    const required = THRESHOLDS[metric];
    const passed = actual >= required;

    console.log(
      `- ${metric.padEnd(10)} actual=${formatPct(actual)} required=${formatPct(required)} ${passed ? 'PASS' : 'FAIL'}`
    );

    if (!passed) {
      failures.push({ metric, actual, required });
    }
  }

  const ragStoreCoverage = findRagStoreCoverage(raw);
  console.log('\nRAG Store Coverage Visibility');
  if (!ragStoreCoverage) {
    console.log('- file: src/webapp/services/rag/rag-store.ts (not found in coverage summary)');
  } else {
    const { filePath, metrics } = ragStoreCoverage;
    const statements = metrics?.statements?.pct;
    const branches = metrics?.branches?.pct;
    const functions = metrics?.functions?.pct;
    const lines = metrics?.lines?.pct;
    console.log(`- file: ${filePath}`);
    console.log(`- statements: ${typeof statements === 'number' ? formatPct(statements) : 'N/A'}`);
    console.log(`- branches:   ${typeof branches === 'number' ? formatPct(branches) : 'N/A'}`);
    console.log(`- functions:  ${typeof functions === 'number' ? formatPct(functions) : 'N/A'}`);
    console.log(`- lines:      ${typeof lines === 'number' ? formatPct(lines) : 'N/A'}`);
  }

  const reflectionTargets = Object.entries(REFLECTION_FILE_PATTERNS).map(([label, patterns]) => ({
    label,
    coverage: findFileCoverage(raw, patterns),
  }));

  console.log('\nReflection Flow Coverage Gate');
  for (const target of reflectionTargets) {
    if (!target.coverage) {
      console.log(`- ${target.label}: file not found in coverage summary`);
      if (Object.values(REFLECTION_THRESHOLDS).some((value) => value > 0)) {
        failures.push({ metric: `${target.label}:missing`, actual: 0, required: 1 });
      }
      continue;
    }

    console.log(`- ${target.label}: ${target.coverage.filePath}`);
    for (const metric of Object.keys(REFLECTION_THRESHOLDS)) {
      const required = REFLECTION_THRESHOLDS[metric];
      const actual = metricValue(target.coverage.metrics, metric);
      const passed = actual >= required;
      console.log(
        `  - ${metric.padEnd(10)} actual=${formatPct(actual)} required=${formatPct(required)} ${passed ? 'PASS' : 'FAIL'}`
      );
      if (!passed) {
        failures.push({ metric: `${target.label}:${metric}`, actual, required });
      }
    }
  }

  if (failures.length > 0) {
    console.error('\nCoverage threshold gate failed.');
    for (const failure of failures) {
      console.error(
        `- ${failure.metric}: ${formatPct(failure.actual)} < ${formatPct(failure.required)}`
      );
    }
    process.exit(1);
  }

  console.log('\nCoverage threshold gate passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Coverage threshold gate error: ${message}`);
  process.exit(1);
}
