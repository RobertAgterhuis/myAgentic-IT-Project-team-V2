# A4 — Memory & Context Management

**Dimension:** Agentic System Design — Memory Architecture, Context Windowing, RAG  
**Score: 8 / 10**

---

## What Was Evaluated

How agent memory is persisted and retrieved across calls. Whether RAG is real. How context is assembled and constrained. Whether memory tiers are meaningful.

---

## Findings

### 1. Three-Tier Semantic Memory — Real, Well-Tested

`platform/engine/semantic-memory.ts` (56 lines, **96% line coverage**, 100% function coverage) implements:

| Tier      | Scope               | Retention           | Use                            |
| --------- | ------------------- | ------------------- | ------------------------------ |
| `run`     | Single pipeline run | Transient (0ms TTL) | Per-invocation scratch         |
| `project` | Workspace / project | 30 days             | Cross-run project knowledge    |
| `org`     | Organization        | 90 days             | Long-term institutional memory |

TTL eviction is lazy (evicts on read/write, not background timer). The `MemoryStorage` interface is pluggable — default `InMemoryStorage` for tests, production uses `StorageProvider` (file or SQLite, configured via `STORAGE_PROVIDER` env var).

The 100% function coverage is noteworthy — this is one of the best-tested files in the codebase.

Source: `platform/engine/semantic-memory.ts` lines 1–80.

### 2. Context Budgeter — Real, Production-Grade

`platform/engine/context-budgeter.ts` (44 lines, **93% line coverage**, 100% function coverage) implements a Rank → Summarize → Truncate pipeline:

1. **Rank** — Sort context items by `relevanceScore DESC, key ASC` (stable sort)
2. **Summarize** — Items over `maxItemBytes` get a summary subsection
3. **Truncate** — Items over budget are dropped; partial items are truncated at byte level

**Metrics captured:**

```typescript
{
  originalBytes: number;
  budgetedBytes: number;
  droppedCount: number;
  truncatedCount: number;
  inputCount: number;
  outputCount: number;
}
```

This is byte-level budget enforcement, not token estimation — accurate for the LLM API payload but doesn't account for tokenizer encoding differences (a GPT-4 token ≠ a fixed byte count). The practical effect is conservative: actual token consumption will be lower than the byte cap implies for typical English text.

Source: `platform/engine/context-budgeter.ts` lines 1–80.

### 3. RAG Stack — Real, Hybrid Architecture

`src/webapp/services/rag/rag-store.ts` (covered in earlier exploration):

**Persistence layer:**

- SQLite (`better-sqlite3`): `rag_collections` + `rag_chunks` tables, WAL mode, foreign keys enabled
- LanceDB (`@lancedb/lancedb ^0.27.1`): one table per collection (`rag_<collectionId>`) for vector similarity search

**Local embeddings:**

- `@xenova/transformers ^2.17.2` — runs inference locally, no external embedding API required
- Enables offline operation without an OpenAI embedding call

**Similarity scoring:**

```typescript
distanceToScore(d: number) => 1 / (1 + d)  // L2 distance → [0,1]
```

**Incremental indexing:**

- `FileIndexEntry` with hash tracking — unchanged files are skipped on re-index
- Prevents redundant embedding computation on large codebases

**Platform integration:**

- `platform/engine/retrieval-api.ts` (70 lines, **95% line coverage**) — the typed API surface for the engine to query RAG
- Dispatcher injects `ragContext` into `AgentExecutionContext` at invocation time

Source: `src/webapp/services/rag/rag-store.ts`, `platform/engine/retrieval-api.ts`.

### 4. Context Injection Pipeline — Documented

The dispatcher (`platform/engine/dispatcher.ts`) assembles context from:

1. Predecessor agent outputs (from state-persistence)
2. Questionnaire answers (structured `QUESTIONNAIRE INPUT` block)
3. RAG context (from `retrieval-api.ts`)
4. Session state
5. Workspace context

This is injected into the `AgentExecutionContext` struct and passed through the `AgentRuntimeAdapter` to construct the final `AgentPromptEnvelope`. Different trust levels (`TRUST_LEVEL: 'HIGH' | 'MEDIUM' | 'LOW'`) are assigned per context source.

### 5. State Persistence — Well-Tested

`platform/engine/state-persistence.ts` (84 lines, **89% line coverage**) persists pipeline run state between transitions. Two backends via factory pattern:

- `file-provider.ts` (92% line coverage)
- `sqlite-provider.ts` (90% line coverage)

Persistent state enables the engine to resume interrupted runs without losing progress.

---

## Strengths

1. **RAG is real** — SQLite + LanceDB + local embeddings is a production-viable architecture. Uses offline embeddings (no API key required for RAG).
2. **Three-tier memory with real TTLs** — Not a single flat store. The org/project/run separation enables genuine long-term learning at the organizational level.
3. **Context budgeter at 93% coverage** — Well-tested byte-level budgeting prevents context overflow.
4. **Incremental RAG indexing** — Hash-based skip prevents O(n) re-embedding on every pipeline run.
5. **Retrieval API well-tested (95%)** — The engine-facing RAG query surface is reliable.

---

## Weaknesses

1. **Byte budget ≠ token count** — The context budgeter operates on bytes. For non-Latin scripts or code-heavy context, this diverges from actual token consumption. Should use a tokenizer estimate (e.g., `tiktoken` for OpenAI models, heuristic `chars/4` is standard fallback).
2. **Lazy TTL eviction only** — Memory items are only evicted when read or written. A long-lived project memory with no recent access will persist beyond its TTL until next read. This is acceptable for correctness but means storage may grow unbounded in practice if projects are abandoned without a final read.
3. **No RAG unit tests visible in coverage** — `rag-store.ts` is not listed in `coverage-summary.json`. This suggests it may be excluded from unit test coverage (possibly integration-tested only or untested). The retrieval-api.ts is covered but the underlying store implementation status is unclear.
4. **SemanticMemory and RAG are disconnected** — `SemanticMemory` (engine-tier) and `rag-store.ts` (webapp-tier) are separate systems with no synchronization. Knowledge added to the RAG store does not flow into SemanticMemory and vice versa. An agent cannot query "what the RAG knows" directly through the memory API — it must go through the retrieval API separately.

---

## Recommended Improvements

1. Replace byte budget with a token estimation function: `estimateTokens(text) => Math.ceil(text.length / 4)` as a fast heuristic for English, with model-specific multipliers for code.
2. Add a background sweep for expired memory tier items (run nightly or on startup) to bound storage growth.
3. Add explicit coverage for `rag-store.ts` — the SQLite schema initialization and LanceDB collection creation paths need unit tests.
4. Connect `SemanticMemory` and `rag-store.ts` via a unified `KnowledgeProvider` interface so agents have a single query surface for both structured and vector-indexed knowledge.

---

## Source References

| File                                   | Lines Read                                       | Key Finding                            |
| -------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| `platform/engine/semantic-memory.ts`   | 1–80                                             | 3-tier memory, TTL, pluggable storage  |
| `platform/engine/context-budgeter.ts`  | 1–80                                             | Byte budget, Rank→Summarize→Truncate   |
| `platform/engine/retrieval-api.ts`     | (coverage summary)                               | 95% coverage, RAG query surface        |
| `platform/engine/state-persistence.ts` | (coverage summary)                               | 89% coverage, file/sqlite backends     |
| `src/webapp/services/rag/rag-store.ts` | 1–100                                            | SQLite+LanceDB hybrid, distanceToScore |
| `platform/engine/dispatcher.ts`        | 1–100                                            | Context injection pipeline             |
| `coverage/coverage-summary.json`       | semantic-memory, context-budgeter, retrieval-api | Coverage numbers                       |
