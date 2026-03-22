# Domain 01 — RAG / Knowledge Retrieval

> Source: `ideas/ideas.md` — Section "RAG"  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

> Validation refresh: March 22, 2026 (external consultant scoping session)

---

## 1. Executive Summary

The consultant's central recommendation is: **"RAG would make the platform smarter; it should not make it less deterministic."**

The platform currently has strong file/state persistence, artifact lineage, workflow state, and deterministic governance stores. It has **zero semantic retrieval capability**. Adding a RAG layer as a _context-assistance plane_ alongside the deterministic control plane would produce the highest single gain in agent reasoning quality, cross-phase traceability, and decision reuse — without putting governance authority at risk.

The correct architectural pattern is:

```
Deterministic Control Plane   +   RAG-Assisted Context Plane
(session state, approvals,        (source code, docs, decisions,
 policies, job state, audit)       contracts, phase outputs,
                                   retrospectives, workspace knowledge)
```

### Consultant Validation Outcome (March 22, 2026)

Decision: **ADOPT LanceDB OSS embedded as the default RAG backend**.

Validation result against the current solution:

- The current platform has deterministic storage only (`file` or `sqlite`) and no vector retrieval layer.
- There is no active semantic retrieval API in the runtime path yet.
- Existing roadmap already points to LanceDB in M-INTEL-1 issue definitions, so consultant advice is aligned.

Scope lock after validation:

- **Source of truth remains deterministic stores** (session state, approvals, governance records, audit).
- RAG is a context plane only.
- `sqlite-vec` is allowed for lab-only spikes, not production baseline.
- Chroma and Qdrant remain deferred alternatives (re-evaluate after corpus and concurrency growth).

---

## 2. Current State Analysis

### What exists today

| Component                | Location                          | Notes                                    |
| ------------------------ | --------------------------------- | ---------------------------------------- |
| File-based agent outputs | `BusinessDocs/`                   | Phase 1–4 artifacts stored as markdown   |
| Decision logs            | `BusinessDocs/decisions/`         | Structured decision records              |
| Contracts & guardrails   | `templates/sdlc/`                 | Per-agent contracts and phase guardrails |
| Session state            | `src/webapp/services/session/`    | Deterministic runtime state              |
| Artifact store           | `src/webapp/routes/artifacts.ts`  | Artifact lineage tracking                |
| Workspace metadata       | `src/webapp/routes/workspaces.ts` | Workspace/project records                |
| Retrospectives           | `BusinessDocs/` (scattered)       | Unstructured, not indexed                |

### What is missing

- No vector store or embedding pipeline
- No chunking/indexing of any workspace files
- No semantic search API
- No agent context injection from retrieval results
- No cross-repo awareness beyond file paths
- No similarity search across decisions, risks, or agent outputs

### Gap Score: FULL — zero RAG capability exists today

---

## 3. Architecture Design

### Planes

```
┌─────────────────────────────────────────────────────────┐
│  DETERMINISTIC CONTROL PLANE (existing — do not touch)   │
│  session-state, approvals, policies, jobs, audit trail   │
└────────────────────────────┬────────────────────────────┘
                             │ context injection
                             ▼
┌─────────────────────────────────────────────────────────┐
│  RAG CONTEXT PLANE (new)                                  │
│  Indexer → Vector Store → Retriever → Context Injector   │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  AGENT EXECUTION LAYER                                    │
│  Before each agent invocation, relevant context chunks   │
│  are retrieved and injected into the agent's input.      │
└─────────────────────────────────────────────────────────┘
```

### RAG Collections (Priority Order)

| Priority | Collection                         | Source                      | Reasoning                               |
| -------- | ---------------------------------- | --------------------------- | --------------------------------------- |
| P0       | Repository code and symbols        | Workspace repos             | Most valuable for implementation agents |
| P0       | Contracts and guardrails           | `templates/sdlc/`           | Required for architectural compliance   |
| P1       | BusinessDocs outputs               | `BusinessDocs/`             | Phase artifact cross-phase traceability |
| P1       | Decision logs and exceptions       | `BusinessDocs/decisions/`   | Decision reuse and similarity search    |
| P1       | Phase synthesis reports            | `BusinessDocs/synthesis/`   | High-value strategy context             |
| P2       | Previous agent execution artifacts | Per-run output files        | Reduce context re-reading               |
| P2       | Retrospectives and incident traces | `BusinessDocs/` (scattered) | Lessons learned                         |
| P2       | Workspace/repository metadata      | DB workspace records        | Cross-repo awareness                    |

### Technology Choices

| Component     | Recommended                                                       | Rationale                                       |
| ------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Embeddings    | `@xenova/transformers` (local) or OpenAI `text-embedding-3-small` | Local-first for privacy; cloud for quality      |
| Vector store  | `lancedb` (embedded, TypeScript-native)                           | Consultant-validated best fit for current stack |
| Chunking      | `langchain`/`llamaindex` splitters or custom token-aware chunker  | Markdown-aware splitting for `.md` files        |
| Retrieval API | Custom REST endpoint: `POST /api/v1/rag/query`                    | Consistent with existing API patterns           |
| Indexer       | Background job via existing job queue                             | Non-blocking, incremental                       |

Deferred alternatives:

- `sqlite-vec`: keep for ultra-light prototype spikes only (pre-v1 risk and brute-force search profile).
- Qdrant: re-evaluate for scale-out and dedicated vector infra requirements.
- Chroma: re-evaluate only if a service-first model is explicitly preferred.

---

## 4. What RAG Must NOT Do (Guard Rails)

These are hard constraints derived from the consultant's explicit warnings:

- **MUST NOT** store authoritative session state in vectors
- **MUST NOT** participate in gate validation or policy evaluation
- **MUST NOT** be used as a permission/authorization model
- **MUST NOT** replace structured governance records (approvals, exceptions, audit trail)
- **MUST NOT** be the source of truth for any workflow decision

Every retrieval result that influences agent output must be clearly tagged as `[RETRIEVED CONTEXT]` and not treated as ground truth by the agent.

---

## 5. Phased Implementation Plan

### Phase 1 — Foundation (Milestone: M-INTEL-1)

**Goal:** Embed a functional vector store with indexing for the highest-value collections. No agent integration yet.

#### Epic 1.1 — Vector Store Infrastructure

- **Issue 1.1.1** — Select and install vector store dependency (`lancedb` initial choice)
  - Acceptance: `npm install lancedb` resolves; schema migration creates tables
  - Effort: S (1 day)
- **Issue 1.1.2** — Define RAG schema: collections, documents, chunks, embedding metadata
  - Acceptance: TypeScript types exported from `src/webapp/services/rag/types.ts`
  - Effort: S (1 day)
- **Issue 1.1.3** — Create `RagStore` service with `upsert`, `query`, `delete`, `listCollections`
  - Acceptance: unit tests pass for all four operations
  - Effort: M (2–3 days)
- **Issue 1.1.4** — Create embedding service abstraction (`EmbeddingProvider` interface) with local transformer backend
  - Acceptance: `embedText(text: string): Promise<number[]>` works in tests
  - Effort: M (2 days)

#### Epic 1.2 — Indexer Pipeline

- **Issue 1.2.1** — Create `RagIndexer` service: file-walk, chunking, embedding, upsert
  - Acceptance: indexes `templates/sdlc/` contracts collection; query returns relevant chunks
  - Effort: M (2–3 days)
- **Issue 1.2.2** — Add markdown-aware chunker (respects headers, code blocks, tables)
  - Acceptance: unit tests for chunk boundaries on real `.md` files
  - Effort: S (1 day)
- **Issue 1.2.3** — Add incremental indexing (track file hash; skip unchanged files)
  - Acceptance: second run on same file set does zero re-embeds
  - Effort: M (2 days)
- **Issue 1.2.4** — Expose `POST /api/v1/rag/index` endpoint (admin-only) to trigger collection indexing
  - Acceptance: returns job ID; job completes with stats
  - Effort: S (1 day)

#### Epic 1.3 — Query API

- **Issue 1.3.1** — Implement `POST /api/v1/rag/query` REST endpoint
  - Input: `{ collection: string, query: string, topK: number, threshold?: number }`
  - Output: `{ chunks: [{ text, source, score, metadata }] }`
  - Acceptance: returns top-5 chunks for a test query; auth-protected
  - Effort: M (2 days)
- **Issue 1.3.2** — Add result citation model: each chunk includes `source_path`, `start_line`, `collection`, `score`
  - Acceptance: source attribution verifiable in tests
  - Effort: S (1 day)

---

### Phase 2 — Collections & Integration (Milestone: M-INTEL-2)

**Goal:** Index all P0/P1 collections; inject context into agent execution paths.

#### Epic 2.1 — BusinessDocs Indexing

- **Issue 2.1.1** — Index `BusinessDocs/decisions/` as `decisions` collection
  - Acceptance: similarity search returns related decisions
  - Effort: S (1 day)
- **Issue 2.1.2** — Index `BusinessDocs/Phase1-Business/` through `Phase4` as `phase-outputs` collection
  - Acceptance: cross-phase retrieval works
  - Effort: S (1 day)
- **Issue 2.1.3** — Index workspace source code chunks (`src/`) as `codebase` collection
  - Acceptance: symbol and pattern search works for TypeScript files
  - Effort: M (2 days)
- **Issue 2.1.4** — Index session sprint artifacts per run as `sprint-artifacts` collection
  - Acceptance: inter-session decision reuse demonstrated
  - Effort: M (2 days)

#### Epic 2.2 — Agent Context Injection

- **Issue 2.2.1** — Add `RagContextInjector` middleware in `agent-execution-service.ts`
  - Before each agent invocation: query relevant collections; prepend `[RETRIEVED CONTEXT]` block
  - Acceptance: context appears in agent input; does not break deterministic state
  - Effort: L (3–4 days)
- **Issue 2.2.2** — Add per-agent RAG profile (which collections to query, with what query template)
  - Acceptance: Implementation Agent gets `codebase + contracts`; Security Agent gets `decisions + policies`
  - Effort: M (2 days)
- **Issue 2.2.3** — Add confidence scoring: log retrieval scores alongside agent outputs
  - Acceptance: `BusinessDocs/metrics/runtime-metrics.json` includes rag_retrieval_score
  - Effort: S (1 day)

#### Epic 2.3 — Decision Similarity Search

- **Issue 2.3.1** — Add `POST /api/v1/decisions/similar` endpoint (uses RAG query on `decisions` collection)
  - Acceptance: returns top-3 similar past decisions for a given query
  - Effort: M (2 days)
- **Issue 2.3.2** — Surface similar decisions in the Decisions UI page
  - Acceptance: "Related decisions" panel visible when creating/viewing a decision
  - Effort: M (2 days)

---

### Phase 3 — Cross-Repo & Multi-Workspace (Milestone: M-INTEL-3)

**Goal:** Enable multi-repo awareness and workspace-scoped retrieval.

#### Epic 3.1 — Multi-Repo Indexing

- **Issue 3.1.1** — Add workspace-scoped collection namespacing: `{workspaceId}::codebase`
  - Acceptance: isolation verified; no cross-workspace leakage
  - Effort: M (2 days)
- **Issue 3.1.2** — Index connected repositories on workspace creation/sync
  - Acceptance: new workspace triggers background indexing job
  - Effort: M (2 days)
- **Issue 3.1.3** — Add cross-workspace "pattern search" endpoint
  - Acceptance: agents can query `global::decisions` and `global::patterns`
  - Effort: M (2 days)

#### Epic 3.2 — Retrospective & Incident Indexing

- **Issue 3.2.1** — Index sprint retrospectives as `retrospectives` collection
  - Acceptance: similar failure patterns retrievable
  - Effort: S (1 day)
- **Issue 3.2.2** — Add lesson-learned injection to HITL approval workflows
  - Acceptance: approval UI surfaces "similar past overrides" from RAG
  - Effort: M (2 days)

---

## 6. Milestones

### M-INTEL-1 — RAG Foundation

- **Target:** Phase 1 complete
- **Deliverables:** Vector store operational; indexer for `contracts` and `decisions` collections; query API
- **Exit criteria:** `GET /api/v1/rag/query` returns relevant chunks; index job completes in < 60s for full `templates/sdlc/`

### M-INTEL-2 — RAG Full Integration

- **Target:** Phase 2 complete
- **Deliverables:** All P0/P1 collections indexed; agent context injection live; decision similarity in UI
- **Exit criteria:** All phase agents receive retrieved context; similarity search demo-able in Decisions UI

### M-INTEL-3 — Multi-Repo Intelligence

- **Target:** Phase 3 complete
- **Deliverables:** Workspace-scoped collections; cross-repo pattern search; retrospective injection in HITL
- **Exit criteria:** Two workspaces indexed without cross-leakage; HITL approval shows related past decisions

---

## 7. Risks

| Risk                                                           | Likelihood | Impact   | Mitigation                                                                   |
| -------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------- |
| Embedding quality insufficient for domain-specific content     | Medium     | High     | Evaluate `text-embedding-3-small` vs local; A/B test chunk retrieval quality |
| RAG context injected into gates/decisions (protocol violation) | Low        | Critical | Strict `[RETRIEVED CONTEXT]` tagging; code review gate in CI                 |
| Index size exceeds LanceDB embedded limits at scale            | Medium     | Medium   | Plan `pgvector` migration path early; design schema for backend swap         |
| Embedding model licensing conflict                             | Low        | Medium   | Prefer Apache2/MIT models; audit before production deploy                    |
| Latency impact on agent invocation                             | Medium     | Medium   | Async pre-fetch; cache top-k for session duration; timeout safety            |

---

## 8. Non-Negotiables (Derived from Consultant)

1. Deterministic stores own workflow truth — RAG provides context only.
2. Gate decisions are never RAG-influenced.
3. Tool authorization is never RAG-based.
4. Every RAG result must carry source attribution.
5. Session state is never stored in or derived from vectors.

6. Retrieval responses must support hybrid relevance strategy in roadmap scope (semantic + lexical), with filtering by workspace/phase/agent when applicable.

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] No UNCERTAIN items (all recommendations directly sourced from `ideas/ideas.md`)
- [x] INSUFFICIENT_DATA: embedding model final selection (requires benchmarking — tracked in Risk #1)
- [x] Analysis is concrete and codebase-specific
- [x] Phased plan is actionable with effort estimates
- [x] Non-negotiables documented
- [x] Deliverable written to file
