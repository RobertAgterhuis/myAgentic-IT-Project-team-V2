#!/usr/bin/env node
/**
 * Post-Deploy Health Gate Script
 *
 * Validates that the platform is fully operational after a deployment.
 * Runs six health gates and exits non-zero on any failure.
 *
 * Usage:
 *   node scripts/post-deploy-check.mjs
 *   node scripts/post-deploy-check.mjs --profile production-distributed --base-url http://127.0.0.1:8080
 *
 * Exit codes:
 *   0  — all gates passed (deployment stable)
 *   1  — one or more gates failed (trigger rollback)
 *
 * Issue: #726 (I-C5-003)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name, fallback = undefined) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const PROFILE = getArg('--profile', process.env.RUNTIME_PROFILE ?? 'production-single-node');
const BASE_URL = getArg('--base-url', process.env.HEALTH_BASE_URL ?? 'http://127.0.0.1:3000');
const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const TIMEOUT_MS = Number(getArg('--timeout', '10000'));

const isDistributed = PROFILE === 'production-distributed';

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const SKIP = '\x1b[33m–\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

function log(icon, id, message) {
  process.stdout.write(`  ${icon}  [${id}] ${message}\n`);
}

// ---------------------------------------------------------------------------
// Gate helpers
// ---------------------------------------------------------------------------

/**
 * HTTP GET with a timeout. Returns { ok, status, body }.
 */
async function httpGet(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Gate definitions
// ---------------------------------------------------------------------------

const results = [];

async function gate(id, description, fn) {
  process.stdout.write(`  ${INFO}  [${id}] ${description} ... `);
  try {
    const { passed, detail } = await fn();
    if (passed) {
      process.stdout.write(`${PASS}\n`);
      results.push({ id, passed: true });
    } else {
      process.stdout.write(`${FAIL}  ${detail ?? ''}\n`);
      results.push({ id, passed: false, detail });
    }
  } catch (err) {
    process.stdout.write(`${FAIL}  ${err.message}\n`);
    results.push({ id, passed: false, detail: err.message });
  }
}

function skip(id, description, reason) {
  log(SKIP, id, `${description} — SKIPPED (${reason})`);
  results.push({ id, passed: true, skipped: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n\x1b[1mPost-Deploy Health Gate Check\x1b[0m`);
console.log(`  Profile  : ${PROFILE}`);
console.log(`  Base URL : ${BASE_URL}`);
console.log(`  Time     : ${new Date().toISOString()}\n`);

// G-01 — Liveness
await gate('G-01', `GET ${BASE_URL}/health/live → 200`, async () => {
  const { ok, status } = await httpGet(`${BASE_URL}/health/live`, 5000);
  return { passed: ok, detail: `HTTP ${status}` };
});

// G-02 — Readiness
await gate('G-02', `GET ${BASE_URL}/health/ready → 200`, async () => {
  const { ok, status } = await httpGet(`${BASE_URL}/health/ready`, TIMEOUT_MS);
  return { passed: ok, detail: `HTTP ${status}` };
});

// G-03 — Orchestrator status
await gate('G-03', `GET ${BASE_URL}/api/orchestrator/status → 200 with status field`, async () => {
  const { ok, status, body } = await httpGet(`${BASE_URL}/api/orchestrator/status`);
  if (!ok) return { passed: false, detail: `HTTP ${status}` };
  try {
    const json = JSON.parse(body);
    if (!('status' in json)) return { passed: false, detail: 'missing "status" field' };
    return { passed: true };
  } catch {
    return { passed: false, detail: 'response is not valid JSON' };
  }
});

// G-04 — Metrics endpoint
await gate('G-04', `GET ${BASE_URL}/api/metrics → 200 with dispatcher field`, async () => {
  const { ok, status, body } = await httpGet(`${BASE_URL}/api/metrics`);
  if (!ok) return { passed: false, detail: `HTTP ${status}` };
  try {
    const json = JSON.parse(body);
    if (!('dispatcher' in json)) return { passed: false, detail: 'missing "dispatcher" field' };
    return { passed: true };
  } catch {
    return { passed: false, detail: 'response is not valid JSON' };
  }
});

// G-05 — Redis connectivity (distributed profile only)
if (isDistributed) {
  await gate('G-05', `Redis connectivity (${REDIS_URL})`, async () => {
    try {
      const result = execSync(`redis-cli -u "${REDIS_URL}" ping`, {
        timeout: 5000,
        encoding: 'utf-8',
      }).trim();
      return { passed: result === 'PONG', detail: result };
    } catch (err) {
      return { passed: false, detail: err.message };
    }
  });
} else {
  skip('G-05', 'Redis connectivity', `profile is ${PROFILE}`);
}

// G-06 — Session state readable (single-node only)
if (!isDistributed) {
  await gate('G-06', 'Session state file is valid JSON', async () => {
    const stateFile = resolve(ROOT, 'docs', 'session', 'session-state.json');
    if (!existsSync(stateFile)) {
      // Missing state is acceptable on a fresh deploy
      return { passed: true, detail: 'file not found — fresh deploy assumed' };
    }
    try {
      JSON.parse(readFileSync(stateFile, 'utf-8'));
      return { passed: true };
    } catch (err) {
      return { passed: false, detail: `JSON parse error: ${err.message}` };
    }
  });
} else {
  skip('G-06', 'Session state file', 'distributed profile uses Redis session store');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const failed = results.filter((r) => !r.passed);
const passed = results.filter((r) => r.passed && !r.skipped);
const skipped = results.filter((r) => r.skipped);

console.log(`\n${'─'.repeat(60)}`);
console.log(
  `  ${PASS}  Passed : ${passed.length}   ${SKIP}  Skipped : ${skipped.length}   ${FAIL}  Failed : ${failed.length}`
);

if (failed.length > 0) {
  console.log(`\n\x1b[31mHealth gate FAILED. Trigger rollback.\x1b[0m`);
  console.log(`  Failed gates: ${failed.map((r) => r.id).join(', ')}`);
  console.log(`  Runbook     : docs/operations/runbooks.md`);
  console.log(`  Rollback    : docs/operations/post-deploy-health-gates.md\n`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32mAll health gates passed. Deployment is stable.\x1b[0m\n`);
  process.exit(0);
}
