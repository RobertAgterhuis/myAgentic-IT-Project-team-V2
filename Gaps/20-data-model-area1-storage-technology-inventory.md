# Agentic SDLC Solution — Data Model & Persistence Deep Audit

## Area 1 — Storage Technology Inventory

STORAGE LAYER: Core document persistence
Technology: File system JSON documents
Client/ORM: platform StorageProvider FileStorageProvider + fs module
Configured in: platform/engine/persistence/factory.ts:31, platform/engine/persistence/file-provider.ts:31
Connection string: src/webapp/config.ts:203, src/webapp/server.ts:250
Used by: workspace manager, persistent queue, semantic memory bridge, MCP governance fallback reads/writes
Migration system: no formal versioned migrations
Seeding: no
Status: ACTIVE

STORAGE LAYER: Core document persistence (optional)
Technology: SQLite single-file DB
Client/ORM: better-sqlite3 via SQLiteStorageProvider
Configured in: platform/engine/persistence/factory.ts:38, platform/engine/persistence/sqlite-provider.ts:52
Connection string: src/webapp/config.ts:203, src/webapp/server.ts:254
Used by: same StorageProvider consumers when STORAGE_PROVIDER=sqlite
Migration system: implicit table auto-create on first access, no version ledger
Seeding: no
Status: ACTIVE (profile/env dependent)

STORAGE LAYER: Remote storage bridge (optional)
Technology: External HTTP persistence service
Client/ORM: RemoteStorageProvider + fetch
Configured in: platform/engine/persistence/factory.ts:46, platform/engine/persistence/remote-provider.ts:70
Connection string: platform/engine/persistence/remote-provider.ts:70, platform/engine/persistence/remote-provider.ts:71
Used by: StorageProvider consumers when STORAGE_PROVIDER=remote
Migration system: delegated to remote service (not in repo)
Seeding: delegated
Status: CONFIGURED

STORAGE LAYER: Orchestrator/session runtime files
Technology: File system JSON/JSONL/Markdown
Client/ORM: FileStore/getStore + direct fs in multiple services
Configured in: src/webapp/config.ts:159, src/webapp/config.ts:172, platform/engine/state-persistence.ts:15
Connection string: path constants under BusinessDocs/session
Used by: engine state, run history, command queue, remediation tasks, transition events, governance state
Migration system: legacy alias normalization only for selected fields (not schema migrations)
Seeding: no
Status: ACTIVE

STORAGE LAYER: Authentication store
Technology: SQLite
Client/ORM: better-sqlite3
Configured in: src/webapp/auth.ts:147, src/webapp/auth.ts:1219
Connection string: src/webapp/auth.ts:1219
Used by: AuthManager/AuthStore and auth routes
Migration system: inline DDL + conditional ALTER in code
Seeding: bootstrap first user role only
Status: ACTIVE

STORAGE LAYER: Audit trail
Technology: Dual-write JSONL + SQLite
Client/ORM: fs append + better-sqlite3
Configured in: src/webapp/audit.ts:46, src/webapp/audit.ts:76
Connection string: src/webapp/audit.ts:46
Used by: safeWrite pipeline and auth/governance events
Migration system: inline table/trigger create
Seeding: no
Status: ACTIVE

STORAGE LAYER: Git credential vault
Technology: SQLite
Client/ORM: better-sqlite3 with AES-GCM encrypted payloads
Configured in: src/webapp/services/git/credential-store.ts:81, src/webapp/routes/git.ts:26
Connection string: src/webapp/routes/git.ts:26, src/webapp/routes/auth.ts:139
Used by: git credential routes, auth token sync to git providers
Migration system: inline table create
Seeding: no
Status: ACTIVE

STORAGE LAYER: RAG metadata + vectors
Technology: SQLite metadata + LanceDB vectors
Client/ORM: better-sqlite3 + @lancedb/lancedb
Configured in: src/webapp/server.ts:108, src/webapp/services/rag/rag-store.ts:53
Connection string: src/webapp/server.ts:107, src/webapp/server.ts:108, src/webapp/server.ts:109
Used by: rag index routes, rag indexer, grounding service
Migration system: inline RAG DDL constants
Seeding: no
Status: ACTIVE

STORAGE LAYER: Redis shared infra (optional/required by distributed profile)
Technology: Redis
Client/ORM: ioredis
Configured in: src/webapp/redis.ts:16, src/webapp/config.ts:207
Connection string: src/webapp/redis.ts:16
Used by: SSE pub/sub, BullMQ connectivity checks; session redis store implementation exists
Migration system: n/a
Seeding: no
Status: ACTIVE for pub/sub; PARTIAL for session store wiring

STORAGE LAYER: In-memory stores/caches
Technology: process memory maps
Client/ORM: JS Map structures
Configured in: src/webapp/session-tracker.ts:73, src/webapp/services/chat-service.ts:145, platform/engine/jobs/memory-queue.ts:41, platform/engine/semantic-memory.ts:99
Connection string: n/a
Used by: session tracker, chat cache, optional memory queue, semantic memory default storage
Migration system: none
Seeding: none
Status: ACTIVE (non-durable)

### Area 1 Answers

- Distinct storage mechanisms observed: 8.
  1. File system documents, 2) SQLite DB files, 3) remote HTTP persistence, 4) Redis, 5) LanceDB, 6) in-memory maps, 7) JSONL append logs, 8) markdown files as operational state.
- Single source of truth: no. State is scattered across BusinessDocs/session files, .agentic SQLite files, optional provider collections, and in-memory trackers.
- Appropriateness:
  - SQLite for auth/credentials/RAG metadata is appropriate.
  - File-based orchestration state is workable but fragile under concurrent writers and schema evolution.
  - LanceDB for vectors is appropriate.
- Restart durability: partial. File and SQLite data survive; in-memory session tracker/chat cache/memory queue do not.
- Configured but weakly connected or partially unused:
  - Redis session store implementation exists at src/webapp/session-store-redis.ts:33 but no invocation path was found in startup wiring.
  - Remote provider is selectable but no in-repo remote migration/contract enforcement exists.
