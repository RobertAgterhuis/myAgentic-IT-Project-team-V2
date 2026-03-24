#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');

const THRESHOLDS = {
  statements: Number(process.env.COVERAGE_MIN_STATEMENTS || 70),
  branches: Number(process.env.COVERAGE_MIN_BRANCHES || 55),
  functions: Number(process.env.COVERAGE_MIN_FUNCTIONS || 70),
  lines: Number(process.env.COVERAGE_MIN_LINES || 70),
};

function readSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Coverage summary not found at ${filePath}. Run test coverage first.`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed?.total) {
    throw new Error(`Invalid coverage summary format in ${filePath}.`);
  }

  return parsed.total;
}

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

try {
  const total = readSummary(SUMMARY_PATH);
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
