---
title: Performance Targets (C4)
parent: Operations
nav_order: 6
description: SLOs and baseline workflow for orchestration, SSE, and tool execution latency.
---

# Performance Targets (C4)

This document defines the initial SLO targets and baseline workflow for Epic E-C4.

## Scope

The targets cover three runtime areas:

1. Orchestration stage latency and failure rate
2. SSE/API response latency and error rate
3. Per-tool execution latency and failure rate

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
npx tsx tests/load/bounded-parallel-dispatch.ts --iterations 30 --agents 12 --maxConcurrency 3
```

Result file:

- `tests/load/bounded-parallel-dispatch-results.json`

### C. Runtime baseline snapshot

File:

- `BusinessDocs/metrics/performance-baseline-c4.json`

This snapshot is generated from current runtime metrics and analytics rollups.

## Dashboard/API Sources

- `GET /api/metrics`
- `GET /api/v1/analytics/trends` (includes `performance.stage_latency` and `performance.tool_latency`)
- `GET /api/v1/analytics/agents`

## Review Cadence

- Per PR: run bounded parallel dispatch scenario and compare p95/p99 deltas
- Per sprint: refresh `BusinessDocs/metrics/performance-baseline-c4.json`
- Release gate: no stage/tool failure-rate regression above +1.0 percentage point from baseline
