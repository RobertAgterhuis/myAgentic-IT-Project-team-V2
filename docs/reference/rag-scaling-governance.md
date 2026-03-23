---
title: RAG Scaling Governance
nav_order: 11
---

# RAG Scaling Governance (M-INTEL-3)

This document records the acceptance evidence for issue #912
(Multi-Repo Workspace-Scoped Indexing) and defines the migration trigger policy
for scaling beyond the current LanceDB-first backend.

## 1) LanceDB-first Policy

- Current storage remains LanceDB-first for vectors through the `RagStore`
  implementation in `src/webapp/services/rag/rag-store.ts`.
- Workspace/global namespacing and retrieval behavior are implemented without
  introducing a secondary vector backend.

## 2) Isolation and Leakage Controls

- Workspace-scoped namespaces are enforced via explicit collection IDs:
  - `{workspaceId}::codebase`
  - `{workspaceId}::decisions`
- Global namespaces are explicit and separate:
  - `global::decisions`
  - `global::patterns`
  - `global::retrospectives`
- Cross-workspace pattern query responses include `workspace_id` attribution for
  each result, supporting auditability and review.

Implementation references:

- `src/webapp/services/rag-grounding-service.ts`
- `src/webapp/routes/rag.ts`

## 3) Migration Trigger Criteria

Backend migration is considered only when measured production telemetry crosses
one or more thresholds consistently:

- Corpus size threshold: total indexed chunks > 5,000,000.
- Query latency threshold: p95 semantic query latency > 750 ms for 7 consecutive
  days.
- Concurrency threshold: sustained semantic query throughput > 100 requests/sec
  (5-minute rolling average) with SLA-impacting queue growth.

All three metrics must be collected from runtime telemetry and linked to the
decision record before any replacement recommendation is made.

## 4) Evidence-Driven Replacement Rule

- No backend replacement proposal is accepted without:
  - a telemetry snapshot covering at least 7 days,
  - a benchmark comparison against current LanceDB behavior,
  - explicit cost/latency trade-off notes.

## 5) Control-Plane Authority Boundaries

Any scale-backend plan must preserve deterministic control-plane authority:

- Workspace identity and namespace resolution stay authoritative in webapp
  control-plane code.
- Global collection access remains explicit, policy-gated, and auditable.
- Storage backend changes must not alter approval/governance authority paths.

## 6) Issue Mapping

- #913: Workspace-scoped namespacing
- #914: Workspace/repository indexing triggers + job history
- #915: Cross-workspace pattern query endpoint
- #917: Retrospectives indexing metadata
- #918: HITL lesson injection with citations
