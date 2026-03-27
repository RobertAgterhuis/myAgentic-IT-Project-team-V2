---
title: Performance Targets (C4)
parent: Operations
nav_order: 6
description: SLOs and baseline workflow for orchestration, SSE, and tool execution latency.
---

# Performance Targets (C4)

This document defines the initial SLO targets and baseline workflow for Epic E-C4.

It also defines the M0.3 autonomy-readiness benchmark evidence used by CI.

## Scope

The targets cover three runtime areas:

1. Orchestration stage latency and failure rate
2. SSE/API response latency and error rate
3. Per-tool execution latency and failure rate
4. Mode-level autonomy readiness for CREATE, AUDIT, and FEATURE workloads

## SLO Targets

### 1. Orchestration stage latency

Measured from time-series metric series `agent_duration_ms` grouped by `state`.

| Metric             | Target      |
| ------------------ | ----------- |
| p50 stage latency  | <= 2500 ms  |
| p95 stage latency  | <= 12000 ms |
| p99 stage latency  | <= 20000 ms |
| stage failure rate | <= 5.0%     |

### 2. SSE/API latency

Measured from runtime metrics endpoint (`GET /api/metrics`) and endpoint breakdown.

| Metric           | Target     |
| ---------------- | ---------- |
| API response p50 | <= 200 ms  |
| API response p95 | <= 1200 ms |
| API response p99 | <= 2500 ms |
| API error rate   | <= 2.0%    |

### 3. Tool execution latency

Measured from time-series metric series `tool_execution_duration_ms` grouped by `tool_id` and `operation`.

| Metric            | Target     |
| ----------------- | ---------- |
| p50 tool latency  | <= 400 ms  |
| p95 tool latency  | <= 2500 ms |
| p99 tool latency  | <= 6000 ms |
| tool failure rate | <= 3.0%    |

### 4. Autonomy readiness workloads

Measured from `BusinessDocs/metrics/autonomy-benchmark-results.json`.

| Metric                  | Target                 |
| ----------------------- | ---------------------- |
| workload latency p50    | <= 2000 ms             |
| workload latency p95    | <= 5000 ms             |
| workload error rate     | <= 5.0%                |
| required workload modes | CREATE, AUDIT, FEATURE |

## Baseline Collection

### A. Endpoint baseline

Run:

```bash
npx tsx tests/load/baseline.ts
```

Result file:

- `tests/load/baseline.json`

### B. Bounded parallel dispatch baseline

Run:

```bash
npx tsx tests/load/bounded-parallel-dispatch.ts --state PHASE_3 --iterations 30 --agents 6 --maxConcurrency 3
```

Result file:

- `tests/load/bounded-parallel-dispatch-results.json`

Latest measured snapshot (2026-03-20):

| Metric                                       | Value                             |
| -------------------------------------------- | --------------------------------- |
| state / iterations / agents / maxConcurrency | PHASE_3 / 30 / 6 / 3              |
| run failure rate                             | 16.67%                            |
| latency p50 / p95 / p99                      | 156.55 ms / 186.47 ms / 188.29 ms |
| queue wait p95                               | 253 ms                            |
| observed concurrency max                     | 3                                 |
| completed throughput p50 / p95               | 37.99 / 47.96 invocations/sec     |

Interpretation:

- Latency is well below the current orchestration-stage SLO thresholds.
- Run-level failure rate remains elevated because the synthetic scenario intentionally injects per-invocation failures (`failRatio=0.03`) and marks a run failed when any invocation fails.
- Concurrency reached the configured cap (`maxConcurrency=3`), confirming bounded parallel lanes are actively exercised.

### C. Runtime baseline snapshot

File:

- `BusinessDocs/metrics/performance-baseline-c4.json`

This snapshot is generated from current runtime metrics and analytics rollups.

### D. Autonomy readiness benchmark suite

Run:

```bash
npm run test:autonomy-benchmark
```

Result file:

- `BusinessDocs/metrics/autonomy-benchmark-results.json`

CI regression gate:

```bash
npm run test:autonomy-readiness-gate
```

Evidence links emitted by the gate:

- `BusinessDocs/metrics/autonomy-benchmark-results.json`
- latest `tests/load/autonomous-lane-traces/*.jsonl`

## Dashboard/API Sources

- `GET /api/metrics`
- `GET /api/v1/analytics/trends` (includes `performance.stage_latency` and `performance.tool_latency`)
- `GET /api/v1/analytics/agents`

## Review Cadence

- Per PR: run bounded parallel dispatch scenario and compare p95/p99 deltas
- Per sprint: refresh `BusinessDocs/metrics/performance-baseline-c4.json`
- Release gate: no stage/tool failure-rate regression above +1.0 percentage point from baseline
