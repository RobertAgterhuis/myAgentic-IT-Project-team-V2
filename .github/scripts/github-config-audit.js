#!/usr/bin/env node
/**
 * github-config-audit.js — Audits and remediates GitHub repository configuration
 * against best-practice baseline. Run via: npm run audit:github
 *
 * Guardrails: G-GLOB-63, G-GLOB-64
 *
 * Prerequisites: `gh` CLI installed and authenticated.
 *
 * Usage:
 *   node scripts/github-config-audit.js                  # audit + auto-fix
 *   node scripts/github-config-audit.js --audit-only     # audit only, no changes
 */
'use strict';

const { execSync } = require('child_process');
const path         = require('path');
const fs           = require('fs');

const OWNER = 'RobertAgterhuis';
const REPO  = 'myAgentic-IT-Project-team-V2';
const REPORT_DIR  = path.resolve(__dirname, '..', 'docs', 'audit');
const REPORT_FILE = path.join(REPORT_DIR, 'github-config-audit.json');

const auditOnly = process.argv.includes('--audit-only');

// ---------- helpers ----------

function gh(endpoint, method, body) {
  const args = [`gh`, `api`, endpoint];
  if (method && method !== 'GET') args.push('--method', method);
  if (body) args.push('--input', '-');

  const opts = { encoding: 'utf-8', stdio: body ? ['pipe', 'pipe', 'pipe'] : [null, 'pipe', 'pipe'] };
  if (body) opts.input = JSON.stringify(body);

  try {
    return JSON.parse(execSync(args.join(' '), opts));
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : '';
    // 404 means the resource doesn't exist (e.g., no branch protection)
    if (stderr.includes('404') || stderr.includes('Not Found')) return null;
    throw e;
  }
}

function ghPatch(endpoint, body) { return gh(endpoint, 'PATCH', body); }
function ghPut(endpoint, body)   { return gh(endpoint, 'PUT', body); }

// ---------- checks ----------

const results = [];
let fixCount = 0;

function check(name, actual, expected, fixFn) {
  const pass = actual === expected;
  const entry = { check: name, expected, actual, pass, fixed: false };
  if (!pass && !auditOnly && fixFn) {
    try {
      fixFn();
      entry.fixed = true;
      fixCount++;
    } catch (e) {
      entry.fix_error = e.message;
    }
  }
  results.push(entry);
  const icon = pass ? '\u2705' : entry.fixed ? '\uD83D\uDD27' : '\u274C';
  console.log(`  ${icon} ${name}: ${actual} (expected: ${expected})${entry.fixed ? ' \u2192 FIXED' : ''}`);
}

// ---------- main ----------

console.log(`\n\uD83D\uDD0D GitHub Configuration Audit: ${OWNER}/${REPO}`);
console.log(`   Mode: ${auditOnly ? 'AUDIT ONLY' : 'AUDIT + AUTO-FIX'}\n`);

// 1. Repository settings
console.log('--- Repository Settings ---');
const repo = gh(`repos/${OWNER}/${REPO}`);

check('default_branch', repo.default_branch, 'main');

check('allow_squash_merge', repo.allow_squash_merge, true,
  () => ghPatch(`repos/${OWNER}/${REPO}`, { allow_squash_merge: true }));

check('allow_merge_commit', repo.allow_merge_commit, false,
  () => ghPatch(`repos/${OWNER}/${REPO}`, { allow_merge_commit: false }));

check('allow_rebase_merge', repo.allow_rebase_merge, false,
  () => ghPatch(`repos/${OWNER}/${REPO}`, { allow_rebase_merge: false }));

check('delete_branch_on_merge', repo.delete_branch_on_merge, true,
  () => ghPatch(`repos/${OWNER}/${REPO}`, { delete_branch_on_merge: true }));

check('has_issues', repo.has_issues, true,
  () => ghPatch(`repos/${OWNER}/${REPO}`, { has_issues: true }));

// 2. Branch protection
console.log('\n--- Branch Protection (main) ---');
const prot = gh(`repos/${OWNER}/${REPO}/branches/main/protection`);

const hasProt = prot !== null;
check('branch_protection_exists', hasProt, true,
  () => ghPut(`repos/${OWNER}/${REPO}/branches/main/protection`, {
    required_status_checks: { strict: true, contexts: [] },
    enforce_admins: false,
    required_pull_request_reviews: { required_approving_review_count: 0, dismiss_stale_reviews: true },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    required_linear_history: true
  }));

if (hasProt) {
  check('require_pr_reviews', prot.required_pull_request_reviews != null, true);
  check('allow_force_pushes', prot.allow_force_pushes?.enabled, false);
  check('allow_deletions', prot.allow_deletions?.enabled, false);
  check('required_linear_history', prot.required_linear_history?.enabled, true);
}

// 3. Security features
console.log('\n--- Security Features ---');
let vulnAlerts = false;
try {
  execSync(`gh api repos/${OWNER}/${REPO}/vulnerability-alerts --method GET`, { stdio: 'pipe' });
  vulnAlerts = true;
} catch (e) {
  if (e.status === 204 || (e.stderr && e.stderr.toString().includes('204'))) vulnAlerts = true;
}
check('vulnerability_alerts', vulnAlerts, true,
  () => { try { execSync(`gh api repos/${OWNER}/${REPO}/vulnerability-alerts --method PUT`, { stdio: 'pipe' }); } catch {} });

// 4. Templates
console.log('\n--- Templates ---');
const prTemplate = fs.existsSync(path.resolve(__dirname, '..', 'PULL_REQUEST_TEMPLATE.md'));
check('pr_template_exists', prTemplate, true);

// 5. Hooks
console.log('\n--- Git Hooks ---');
const preCommitHook = fs.existsSync(path.resolve(__dirname, '..', 'hooks', 'pre-commit'));
check('pre_commit_hook_exists', preCommitHook, true);

// ---------- report ----------

const report = {
  repo: `${OWNER}/${REPO}`,
  audited_at: new Date().toISOString(),
  mode: auditOnly ? 'audit-only' : 'audit-and-fix',
  total_checks: results.length,
  passed: results.filter(r => r.pass).length,
  failed: results.filter(r => !r.pass && !r.fixed).length,
  fixed: fixCount,
  checks: results
};

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

console.log(`\n--- Summary ---`);
console.log(`  Total: ${report.total_checks} | Passed: ${report.passed} | Fixed: ${report.fixed} | Failed: ${report.failed}`);
console.log(`  Report: ${REPORT_FILE}\n`);

process.exit(report.failed > 0 ? 1 : 0);
