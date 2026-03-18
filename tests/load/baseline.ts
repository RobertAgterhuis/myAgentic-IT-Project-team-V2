// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* eslint-disable no-console */

/* ── Load Test Baseline (M33-008) ─────────────────────────────── *
 * Captures P50/P95/P99 latency baselines for critical endpoints.  *
 * Uses autocannon (Node.js HTTP benchmarking tool).               *
 *                                                                 *
 * Usage:                                                          *
 *   npx tsx tests/load/baseline.ts                                *
 *   npx tsx tests/load/baseline.ts http://localhost:3000          *
 * ─────────────────────────────────────────────────────────────── */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const BASE_URL = process.argv[2] || 'http://127.0.0.1:3000';

interface EndpointConfig {
  name: string;
  method: string;
  path: string;
  body?: string;
  headers?: Record<string, string>;
}

const ENDPOINTS: EndpointConfig[] = [
  { name: 'health-live', method: 'GET', path: '/health/live' },
  { name: 'health-ready', method: 'GET', path: '/health/ready' },
  { name: 'api-health', method: 'GET', path: '/api/health' },
  { name: 'api-session', method: 'GET', path: '/api/session' },
  { name: 'api-progress', method: 'GET', path: '/api/progress' },
];

interface LatencyResult {
  endpoint: string;
  method: string;
  path: string;
  requests: number;
  duration_s: number;
  rps: number;
  latency_ms: { p50: number; p95: number; p99: number; avg: number; max: number };
  errors: number;
  timeouts: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function benchEndpoint(config: EndpointConfig): Promise<LatencyResult> {
  const url = `${BASE_URL}${config.path}`;
  const durations: number[] = [];
  let errors = 0;
  let timeouts = 0;

  const DURATION_MS = 10_000; // 10 seconds per endpoint
  const CONCURRENCY = 10;
  const start = Date.now();

  const controller = new AbortController();
  setTimeout(() => controller.abort(), DURATION_MS + 2000);

  // Simple concurrent HTTP load generator
  async function worker(): Promise<void> {
    while (Date.now() - start < DURATION_MS) {
      const reqStart = performance.now();
      try {
        const resp = await fetch(url, {
          method: config.method,
          headers: config.headers,
          body: config.body,
          signal: controller.signal,
        });
        const elapsed = performance.now() - reqStart;
        durations.push(elapsed);
        if (!resp.ok) errors++;
        // Consume body to free connection
        await resp.text();
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') break;
        const elapsed = performance.now() - reqStart;
        if (elapsed > 5000) timeouts++;
        else errors++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const elapsed = (Date.now() - start) / 1000;
  durations.sort((a, b) => a - b);

  return {
    endpoint: config.name,
    method: config.method,
    path: config.path,
    requests: durations.length,
    duration_s: Math.round(elapsed * 10) / 10,
    rps: Math.round(durations.length / elapsed),
    latency_ms: {
      p50: Math.round(percentile(durations, 50) * 100) / 100,
      p95: Math.round(percentile(durations, 95) * 100) / 100,
      p99: Math.round(percentile(durations, 99) * 100) / 100,
      avg:
        durations.length > 0
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100
          : 0,
      max: durations.length > 0 ? Math.round(durations[durations.length - 1] * 100) / 100 : 0,
    },
    errors,
    timeouts,
  };
}

async function main(): Promise<void> {
  console.log(`Load test baseline — target: ${BASE_URL}`);
  console.log(`Endpoints: ${ENDPOINTS.length}, 10s per endpoint, concurrency: 10\n`);

  // Verify server is reachable
  try {
    const resp = await fetch(`${BASE_URL}/health/live`);
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
  } catch {
    console.error(`Cannot reach ${BASE_URL}/health/live — is the server running?`);
    process.exit(1);
  }

  const results: LatencyResult[] = [];

  for (const ep of ENDPOINTS) {
    process.stdout.write(`  ${ep.name} ... `);
    const result = await benchEndpoint(ep);
    results.push(result);
    console.log(
      `${result.rps} rps | P50=${result.latency_ms.p50}ms P95=${result.latency_ms.p95}ms P99=${result.latency_ms.p99}ms | errors=${result.errors}`
    );
  }

  const baseline = {
    generated_at: new Date().toISOString(),
    target: BASE_URL,
    node_version: process.version,
    results,
  };

  const outPath = join(
    dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
    'baseline.json'
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(baseline, null, 2) + '\n');

  console.log(`\nBaseline written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
