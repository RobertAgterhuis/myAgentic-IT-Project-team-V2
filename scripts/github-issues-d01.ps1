#!/usr/bin/env pwsh
# Domain 01 - RAG / Knowledge Retrieval: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms101=101; $ms106=106; $ms115=115

Write-Host "`n=== Domain 01: RAG / Knowledge Retrieval ===" -ForegroundColor Magenta

# ── M-INTEL-1 ──────────────────────────────────────
Write-Host "`n-- M-INTEL-1 (RAG Foundation) --"

$e11 = New-Issue "Epic: RAG Vector Store Infrastructure" (B @(
    "## Epic 1.1 - Vector Store Infrastructure",
    "**Milestone:** M-INTEL-1 - RAG Foundation",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 1)",
    "",
    "Embed a functional vector store stack. No agent integration yet.",
    "",
    "### Non-Negotiables",
    "- RAG provides context only; deterministic stores own workflow truth",
    "- Gate decisions are never RAG-influenced",
    "- Every RAG result carries source attribution",
    "",
    "### Issues",
    "- [ ] Install and configure LanceDB vector store",
    "- [ ] RAG schema: collections, documents, chunks, embedding metadata",
    "- [ ] RagStore service with upsert/query/delete/listCollections",
    "- [ ] EmbeddingProvider abstraction with local transformer backend"
)) @("epic","domain:rag","P0-critical","enhancement") $ms101

New-Issue "RAG-1.1.1 - Install LanceDB and create RAG schema migration" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INTEL-1",
    "",
    "Install lancedb dependency. Create DB schema migration for:",
    "- rag_collections: id, name, description, created_at",
    "- rag_chunks: id, collection_id, source_path, chunk_text, embedding (vector), start_line, chunk_hash",
    "",
    "**Acceptance criteria:**",
    "- npm install lancedb resolves",
    "- Schema migration creates tables",
    "- TypeScript types exported from src/webapp/services/rag/types.ts",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.1.2 - RagStore service: upsert, query, delete, listCollections" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INTEL-1",
    "",
    "Create RagStore service at src/webapp/services/rag/rag-store.ts with methods:",
    "- upsert(collectionId, chunks): upserts chunks with embeddings",
    "- query(collectionId, queryVector, topK, threshold): returns similar chunks",
    "- delete(collectionId, sourceHashes): removes chunks by hash",
    "- listCollections(): returns all registered collections",
    "",
    "**Acceptance criteria:**",
    "- Unit tests pass for all four operations",
    "- Query returns chunks with source_path, score, text",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.1.3 - EmbeddingProvider abstraction with local transformer backend" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-INTEL-1",
    "",
    "Create EmbeddingProvider interface: embedText(text): Promise<number[]>",
    "Implement LocalEmbeddingProvider using @xenova/transformers.",
    "Interface must be swappable for OpenAI text-embedding-3-small in future.",
    "",
    "**Acceptance criteria:**",
    "- embedText() returns float array in tests",
    "- Provider switchable via env var EMBEDDING_PROVIDER=local|openai",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

$e12 = New-Issue "Epic: RAG Indexer Pipeline" (B @(
    "## Epic 1.2 - Indexer Pipeline",
    "**Milestone:** M-INTEL-1 - RAG Foundation",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 1)",
    "",
    "End-to-end indexer: file-walk, chunking, embedding, upsert.",
    "",
    "### Issues",
    "- [ ] RagIndexer service: file-walk, chunking, embedding, upsert",
    "- [ ] Markdown-aware chunker",
    "- [ ] Incremental indexing (skip unchanged files by hash)",
    "- [ ] POST /api/v1/rag/index endpoint"
)) @("epic","domain:rag","P0-critical","enhancement") $ms101

New-Issue "RAG-1.2.1 - RagIndexer service: file-walk, chunking, embedding, upsert" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INTEL-1",
    "",
    "Create RagIndexer service that:",
    "1. Walks a directory or file list",
    "2. Splits files into chunks (using markdown-aware chunker)",
    "3. Embeds each chunk via EmbeddingProvider",
    "4. Upserts chunks to specified collection via RagStore",
    "",
    "**Acceptance criteria:**",
    "- Indexes templates/sdlc/ contracts collection",
    "- Query against indexed collection returns relevant chunks",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.2.2 - Markdown-aware chunker respecting headers, code blocks, tables" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INTEL-1",
    "",
    "Implement chunking strategy that respects markdown structure:",
    "- Split at H1/H2 boundaries first",
    "- Preserve code blocks as atomic chunks (no mid-block splits)",
    "- Tables stay together",
    "- Max chunk size: configurable token limit (default: 512 tokens)",
    "",
    "**Acceptance criteria:**",
    "- Unit tests for chunk boundaries on real .md files from templates/sdlc/",
    "- Code blocks never split mid-block",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.2.3 - Incremental indexing: skip unchanged files by hash" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INTEL-1",
    "",
    "Track file hash (SHA-256) per indexed chunk. On re-index, skip files where hash unchanged.",
    "Remove chunks from DB for deleted files.",
    "",
    "**Acceptance criteria:**",
    "- Second run on same file set produces zero re-embeds",
    "- Modified file is fully re-indexed",
    "- Deleted file's chunks are removed from DB",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.2.4 - POST /api/v1/rag/index endpoint (admin-only)" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-INTEL-1",
    "",
    "Admin-only endpoint to trigger collection indexing.",
    "Input: { collection: string, paths: string[] }",
    "Response: { jobId: string } - job runs asynchronously via existing job queue.",
    "",
    "**Acceptance criteria:**",
    "- Returns job ID; job completes with stats (chunks_indexed, files_skipped, duration_ms)",
    "- Auth-protected: admin role required",
    "- 400 for invalid collection name",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

$e13 = New-Issue "Epic: RAG Query API" (B @(
    "## Epic 1.3 - Query API",
    "**Milestone:** M-INTEL-1 - RAG Foundation",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 1)",
    "",
    "REST query endpoint with source attribution (citation model).",
    "",
    "### Issues",
    "- [ ] POST /api/v1/rag/query endpoint",
    "- [ ] Citation model: source_path, start_line, collection, score"
)) @("epic","domain:rag","P0-critical","enhancement") $ms101

New-Issue "RAG-1.3.1 - POST /api/v1/rag/query REST endpoint" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INTEL-1",
    "",
    "Implement POST /api/v1/rag/query:",
    "Input: { collection: string, query: string, topK: number, threshold?: number }",
    "Output: { chunks: [{ text, source, score, metadata }] }",
    "",
    "**Acceptance criteria:**",
    "- Returns top-5 chunks for a test query against contracts collection",
    "- Auth-protected (operator or admin)",
    "- Empty array (not 404) when no results above threshold",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

New-Issue "RAG-1.3.2 - Citation model: source_path, start_line, collection, score" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-INTEL-1",
    "",
    "Each chunk in query results must include:",
    "source_path (relative), start_line (number or null), collection (string), score (float 0-1)",
    "",
    "**Acceptance criteria:**",
    "- Source attribution verifiable in tests (path matches actual indexed file)",
    "- score field present on all returned chunks",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms101

# ── M-INTEL-2 ──────────────────────────────────────
Write-Host "`n-- M-INTEL-2 (RAG Collections & Agent Integration) --"

$e21 = New-Issue "Epic: BusinessDocs and Codebase Indexing" (B @(
    "## Epic 2.1 - BusinessDocs and Codebase Indexing",
    "**Milestone:** M-INTEL-2 - RAG Full Integration",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 2)",
    "",
    "Index all P0/P1 collections: decisions, phase outputs, codebase, sprint artifacts.",
    "",
    "### Issues",
    "- [ ] Index BusinessDocs/decisions/ as decisions collection",
    "- [ ] Index BusinessDocs/Phase1-Phase4/ as phase-outputs collection",
    "- [ ] Index src/ codebase as codebase collection",
    "- [ ] Index session/sprint artifacts as sprint-artifacts collection"
)) @("epic","domain:rag","P0-critical","enhancement") $ms106

New-Issue "RAG-2.1.1 - Index BusinessDocs/decisions/ as decisions collection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INTEL-2",
    "",
    "Configure and run indexer for BusinessDocs/decisions/ directory.",
    "Collection name: decisions",
    "",
    "**Acceptance criteria:**",
    "- Similarity search returns related decisions for a test query",
    "- All decision .md files indexed",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms106

New-Issue "RAG-2.1.2 - Index BusinessDocs/Phase1-Phase4/ as phase-outputs collection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INTEL-2",
    "",
    "Index all Business phase output documents as phase-outputs collection.",
    "Covers Phase1-Business, Phase2-Tech, Phase3-UX, synthesis, session directories.",
    "",
    "**Acceptance criteria:**",
    "- Cross-phase retrieval works (query from Phase2 returns Phase1 context)",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms106

New-Issue "RAG-2.1.3 - Index src/ codebase as codebase collection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INTEL-2",
    "",
    "Index TypeScript source files under src/ as codebase collection.",
    "Use code-aware chunking: function and class boundaries preferred.",
    "",
    "**Acceptance criteria:**",
    "- Symbol and pattern search works for TypeScript files",
    "- Query for 'auth provider' returns relevant auth.ts chunks",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P1-high","enhancement","tech") $ms106

New-Issue "RAG-2.1.4 - Index session sprint artifacts as sprint-artifacts collection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-INTEL-2",
    "",
    "Index per-run session output artifacts as sprint-artifacts collection.",
    "Collection namespaced per project ID to enable inter-session decision reuse.",
    "",
    "**Acceptance criteria:**",
    "- Inter-session decision reuse demonstrated",
    "- Artifacts from different projects isolated",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P1-high","enhancement","tech") $ms106

$e22 = New-Issue "Epic: Agent Context Injection" (B @(
    "## Epic 2.2 - Agent Context Injection",
    "**Milestone:** M-INTEL-2 - RAG Full Integration",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 2)",
    "",
    "Inject retrieved context into agent execution. Per-agent RAG profiles. Confidence scoring.",
    "",
    "### Issues",
    "- [ ] RagContextInjector middleware in agent-execution-service.ts",
    "- [ ] Per-agent RAG profile (collections + query template)",
    "- [ ] Confidence scoring logged alongside agent outputs"
)) @("epic","domain:rag","P0-critical","enhancement") $ms106

New-Issue "RAG-2.2.1 - RagContextInjector middleware in agent-execution-service.ts" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INTEL-2",
    "",
    "Add RagContextInjector to agent-execution-service.ts.",
    "Before each agent invocation: query relevant collections and prepend [RETRIEVED CONTEXT] block to input.",
    "",
    "Hard constraint: retrieved context tagged as [RETRIEVED CONTEXT] and never treated as ground truth.",
    "Gate decisions and policy evaluations must NEVER be influenced by RAG output.",
    "",
    "**Acceptance criteria:**",
    "- [RETRIEVED CONTEXT] block appears in agent input",
    "- Deterministic state (sessions, approvals, policies) is unaffected",
    "",
    "**Effort:** L (3-4 days)"
)) @("domain:rag","P0-critical","enhancement","tech") $ms106

New-Issue "RAG-2.2.2 - Per-agent RAG profile: collections and query template per agent" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INTEL-2",
    "",
    "Define per-agent RAG profile mapping agent ID to (collections, query template):",
    "- Implementation Agent: codebase + contracts",
    "- Security Agent: decisions + policies",
    "- Business Analyst: phase-outputs + decisions",
    "",
    "**Acceptance criteria:**",
    "- Each agent configured with appropriate collection list",
    "- Profile configurable without code change (JSON config)",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P1-high","enhancement","tech") $ms106

New-Issue "RAG-2.2.3 - RAG retrieval confidence scoring logged with agent outputs" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-INTEL-2",
    "",
    "Log retrieval scores alongside agent output metadata.",
    "Write rag_retrieval_score (average top-K score) to BusinessDocs/metrics/runtime-metrics.json.",
    "",
    "**Acceptance criteria:**",
    "- runtime-metrics.json includes rag_retrieval_score field after agent run",
    "- Score is numeric float between 0 and 1",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P1-high","enhancement","tech") $ms106

$e23 = New-Issue "Epic: Decision Similarity Search" (B @(
    "## Epic 2.3 - Decision Similarity Search",
    "**Milestone:** M-INTEL-2 - RAG Full Integration",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 2)",
    "",
    "Semantic similar-decision endpoint and UI panel in Decisions screen.",
    "",
    "### Issues",
    "- [ ] POST /api/v1/decisions/similar endpoint",
    "- [ ] Related Decisions panel in Decisions UI"
)) @("epic","domain:rag","P1-high","enhancement") $ms106

New-Issue "RAG-2.3.1 - POST /api/v1/decisions/similar endpoint" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-INTEL-2",
    "",
    "Add endpoint: POST /api/v1/decisions/similar",
    "Input: { query: string, topK?: number }",
    "Output: [{ decisionId, title, score, excerpt }]",
    "Uses RAG query on decisions collection.",
    "",
    "**Acceptance criteria:**",
    "- Returns top-3 similar past decisions for a test query",
    "- Auth-protected",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P1-high","enhancement","tech") $ms106

New-Issue "RAG-2.3.2 - Related Decisions panel in Decisions UI" (B @(
    "**Epic:** #$e23",
    "**Milestone:** M-INTEL-2",
    "",
    "Add Related Decisions panel to Decisions page (create and view views).",
    "Shows top-3 similar past decisions from RAG.",
    "",
    "**Acceptance criteria:**",
    "- Related decisions visible when creating/viewing a decision",
    "- Panel shows title, excerpt, and link to source decision",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P1-high","enhancement","ux","ui") $ms106

# ── M-INTEL-3 ──────────────────────────────────────
Write-Host "`n-- M-INTEL-3 (Multi-Repo & Cross-Session Learning) --"

$e31 = New-Issue "Epic: Multi-Repo Workspace-Scoped Indexing" (B @(
    "## Epic 3.1 - Multi-Repo Indexing",
    "**Milestone:** M-INTEL-3 - Cross-Session Learning",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 3)",
    "",
    "Workspace-scoped collection namespacing and cross-repo pattern search.",
    "",
    "### Issues",
    "- [ ] Workspace-scoped collection namespacing",
    "- [ ] Index connected repos on workspace creation/sync",
    "- [ ] Cross-workspace pattern search endpoint"
)) @("epic","domain:rag","P2-medium","enhancement") $ms115

New-Issue "RAG-3.1.1 - Workspace-scoped collection namespacing: {workspaceId}::codebase" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INTEL-3",
    "",
    "Namespace all collections with workspaceId prefix: {workspaceId}::codebase, {workspaceId}::decisions.",
    "Global collections use global:: prefix: global::decisions, global::patterns.",
    "",
    "**Acceptance criteria:**",
    "- No cross-workspace chunk leakage verified in tests",
    "- Existing single-workspace queries unaffected",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P2-medium","enhancement","tech") $ms115

New-Issue "RAG-3.1.2 - Index connected repos on workspace creation and sync" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INTEL-3",
    "",
    "Trigger background indexing job when a workspace is created or synced.",
    "Index all connected repositories into {workspaceId}::codebase collection.",
    "",
    "**Acceptance criteria:**",
    "- New workspace creation triggers background indexing job",
    "- Index job result logged in job history",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P2-medium","enhancement","tech") $ms115

New-Issue "RAG-3.1.3 - Cross-workspace pattern search endpoint" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-INTEL-3",
    "",
    "Add endpoint for searching global collections: global::decisions, global::patterns.",
    "Allows agents to query across all workspaces for shared patterns.",
    "",
    "**Acceptance criteria:**",
    "- Query against global::decisions returns results from all workspaces",
    "- Cross-workspace results include workspace_id attribution",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P2-medium","enhancement","tech") $ms115

$e32 = New-Issue "Epic: Retrospective and Incident Indexing" (B @(
    "## Epic 3.2 - Retrospective and Incident Indexing",
    "**Milestone:** M-INTEL-3 - Cross-Session Learning",
    "**Domain:** RAG / Knowledge Retrieval (Domain 01, Phase 3)",
    "",
    "Index sprint retrospectives and inject lessons learned into HITL approval workflows.",
    "",
    "### Issues",
    "- [ ] Index sprint retrospectives as retrospectives collection",
    "- [ ] Lesson-learned injection in HITL approval UI"
)) @("epic","domain:rag","P2-medium","enhancement") $ms115

New-Issue "RAG-3.2.1 - Index sprint retrospectives as retrospectives collection" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INTEL-3",
    "",
    "Index all sprint retrospective documents as retrospectives collection.",
    "Similar failure patterns should be retrievable via semantic search.",
    "",
    "**Acceptance criteria:**",
    "- Similar failure patterns retrievable via semantic query",
    "- Retrospective chunks include sprint_id metadata",
    "",
    "**Effort:** S (1 day)"
)) @("domain:rag","P2-medium","enhancement","tech") $ms115

New-Issue "RAG-3.2.2 - Lesson-learned injection in HITL approval workflows" (B @(
    "**Epic:** #$e32",
    "**Milestone:** M-INTEL-3",
    "",
    "Surface similar past overrides and decisions in HITL approval UI.",
    "Query decisions + retrospectives collections when an approval request is opened.",
    "",
    "**Acceptance criteria:**",
    "- Approval UI shows 'Similar past overrides' from RAG",
    "- Results include citation links to source decisions",
    "",
    "**Effort:** M (2 days)"
)) @("domain:rag","P2-medium","enhancement","ux","ui") $ms115

Write-Host "`nDomain 01 complete!" -ForegroundColor Cyan
