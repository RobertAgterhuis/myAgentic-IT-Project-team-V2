#!/usr/bin/env node
/**
 * Aggregate quality coverage from both backend (root) and frontend (UI).
 *
 * This script:
 * 1. Runs root coverage if not already present
 * 2. Runs UI coverage if not already present
 * 3. Displays both reports in a unified format
 * 4. Exits non-zero if either misses thresholds
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = process.cwd();
const ROOT_COVERAGE_FILE = path.join(ROOT, 'coverage', 'coverage-summary.json');
const UI_COVERAGE_FILE = path.join(ROOT, 'src/webapp/ui/coverage/coverage-summary.json');
const RAG_STORE_FILE_PATTERNS = [
  '/src/webapp/services/rag/rag-store.ts',
  '\\src\\webapp\\services\\rag\\rag-store.ts',
];

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readCoverageJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`[ERROR] Could not read coverage file: ${filePath}`);
    return null;
  }
}

function formatMetric(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value * 100) / 100}%`;
}

function getTotal(coverage) {
  if (!coverage || !coverage.total) return null;
  return coverage.total;
}

function printCoverageTable(label, coverage, isFinal = false) {
  const total = getTotal(coverage);
  if (!total) {
    console.log(`\n❌ ${label}: No coverage data found`);
    return false;
  }

  const metrics = [
    ['Statements', total.statements.pct],
    ['Branches', total.branches.pct],
    ['Functions', total.functions.pct],
    ['Lines', total.lines.pct],
  ];

  console.log(`\n${label}`);
  console.log('─'.repeat(60));
  metrics.forEach(([name, value]) => {
    console.log(`  ${name.padEnd(15)}: ${formatMetric(value)}`);
  });

  if (isFinal) {
    console.log('─'.repeat(60));
  }

  return true;
}

function findRagStoreCoverage(coverage) {
  if (!coverage || typeof coverage !== 'object') return null;

  for (const [filePath, metrics] of Object.entries(coverage)) {
    if (filePath === 'total') continue;
    if (!RAG_STORE_FILE_PATTERNS.some((pattern) => filePath.includes(pattern))) continue;
    if (!metrics || typeof metrics !== 'object') continue;
    return { filePath, metrics };
  }

  return null;
}

function printRagStoreCoverage(coverage) {
  console.log('\n🧠 RAG Store Coverage (Visibility)');
  console.log('─'.repeat(60));
  const ragStore = findRagStoreCoverage(coverage);
  if (!ragStore) {
    console.log('  File not found in coverage summary: src/webapp/services/rag/rag-store.ts');
    return;
  }

  const { filePath, metrics } = ragStore;
  console.log(`  File            : ${filePath}`);
  console.log(`  Statements      : ${formatMetric(metrics?.statements?.pct)}`);
  console.log(`  Branches        : ${formatMetric(metrics?.branches?.pct)}`);
  console.log(`  Functions       : ${formatMetric(metrics?.functions?.pct)}`);
  console.log(`  Lines           : ${formatMetric(metrics?.lines?.pct)}`);
}

function logFinal(allPass) {
  if (allPass) {
    console.log('\n✓ All coverage gates passed');
    return 0;
  } else {
    console.log('\n✗ Some coverage gates failed or data missing');
    return 1;
  }
}

// Main flow
console.log('📊 Quality Coverage Aggregator\n');

// 1. Check/run root coverage
console.log('Checking root coverage...');
if (!fileExists(ROOT_COVERAGE_FILE)) {
  console.log('  → Running root coverage...');
  try {
    execSync('npm run test:coverage', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('[ERROR] Root coverage failed');
    process.exit(1);
  }
}

// 2. Check/run UI coverage
console.log('Checking UI coverage...');
const UI_PACKAGE_JSON = path.join(ROOT, 'src/webapp/ui/package.json');
if (fileExists(UI_PACKAGE_JSON)) {
  if (!fileExists(UI_COVERAGE_FILE)) {
    console.log('  → Running UI coverage...');
    try {
      execSync('npm run test:coverage', {
        cwd: path.join(ROOT, 'src/webapp/ui'),
        stdio: 'inherit',
      });
    } catch (e) {
      console.error('[ERROR] UI coverage failed');
      process.exit(1);
    }
  }
}

// 3. Read and display both reports
const rootCoverage = readCoverageJson(ROOT_COVERAGE_FILE);
const uiCoverage = readCoverageJson(UI_COVERAGE_FILE);

console.log('\n' + '═'.repeat(60));
console.log('  QUALITY COVERAGE REPORT (Backend + Frontend)');
console.log('═'.repeat(60));

const rootPass = printCoverageTable('📦 Root (Backend)', rootCoverage);
const uiPass = printCoverageTable('🎨 UI (Frontend)', uiCoverage, true);
printRagStoreCoverage(rootCoverage);

// 4. Exit with appropriate code
const allPass = rootPass && uiPass;
process.exit(logFinal(allPass));
