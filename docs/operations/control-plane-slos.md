---
title: Control Plane SLOs
parent: Operations
nav_order: 9
permalink: /control-plane-slos/
description: >
  Service-level objectives for orchestrator control-plane dependencies and
  operator response expectations.
---

This document defines the minimum SLO set for orchestrator control-plane
operability and maps each target to a measurable API signal.

## SLO Targets

| SLO ID      | Objective                | Target      | Observable field                            |
| ----------- | ------------------------ | ----------- | ------------------------------------------- |
| `CP-SLO-01` | Unavailable dependencies | `0`         | `slos.observed.unavailable_dependencies`    |
| `CP-SLO-02` | Degraded dependencies    | `0`         | `slos.observed.degraded_dependencies`       |
| `CP-SLO-03` | Dependency probe latency | `<= 500 ms` | `slos.observed.dependency_probe_latency_ms` |

## Observation Endpoint

- Endpoint: `GET /api/orchestrator/dependencies/health`
- Response fields:
  - `overall_status` (`healthy`, `degraded`, `unavailable`)
  - `dependencies.state_machine`
  - `dependencies.dispatcher`
  - `dependencies.policy_service`
  - `slos.targets`
  - `slos.observed`
  - `slos.alerts`

## Alert Rules

Threshold breaches return structured alerts in `slos.alerts`:

| Alert code                           | Trigger                             | Severity   |
| ------------------------------------ | ----------------------------------- | ---------- |
| `CP_UNAVAILABLE_DEPENDENCIES_BREACH` | `unavailable_dependencies > 0`      | `critical` |
| `CP_DEGRADED_DEPENDENCIES_BREACH`    | `degraded_dependencies > 0`         | `warning`  |
| `CP_PROBE_LATENCY_BREACH`            | `dependency_probe_latency_ms > 500` | `warning`  |

## Operational Expectations

1. If `overall_status` is `unavailable`, execute the rollback sequence in
   [Incident Runbooks](runbooks#orchestrator-control-plane-incident-commands).
2. If `overall_status` is `degraded`, operators should pause new transitions,
   inspect dependency metadata, and either resume or escalate within 15 minutes.
3. Every SLO breach must create an incident timeline entry with the triggering
   alert code and UTC timestamp.
