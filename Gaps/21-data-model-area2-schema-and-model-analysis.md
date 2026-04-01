# Area 2 — Schema & Data Model Analysis

## 2A. Model Inventory

MODEL: users
Defined in: src/webapp/auth.ts:153
Type: DB table (SQLite)
Fields: id, provider_account_id, email, name, avatar_url, role, primary_provider, created_at, last_login
Primary key: id TEXT
Relationships: linked_accounts.user_id -> users.id, sessions.user_id -> users.id
Indexes: unique provider_account_id (migration path), role check via CHECK
Constraints: role enum CHECK, provider_account_id unique
Timestamps: created_at, last_login
Created by: AuthStore.upsertUser src/webapp/auth.ts:371
Read by: AuthStore find methods src/webapp/auth.ts:330, src/webapp/auth.ts:346
Status: ACTIVE

MODEL: linked_accounts
Defined in: src/webapp/auth.ts:165
Type: DB table
Fields: user_id, provider, provider_id, provider_username, access_token_encrypted, refresh_token_encrypted, token_expires_at, tenant_id, scopes, created_at, updated_at
Primary key: composite (user_id, provider)
Relationships: FK user_id -> users.id ON DELETE CASCADE
Indexes: unique(provider, provider_id)
Constraints: PK + unique constraints, defaults
Timestamps: created_at, updated_at
Created by: \_upsertLinkedAccount src/webapp/auth.ts:285
Read by: \_listLinkedAccounts/\_getLinkedAccountTokens src/webapp/auth.ts:250, src/webapp/auth.ts:269
Status: ACTIVE

MODEL: sessions
Defined in: src/webapp/auth.ts:178
Type: DB table
Fields: id, user_id, primary_provider, csrf_token, created_at, expires_at, last_active
Primary key: id TEXT
Relationships: FK user_id -> users.id ON DELETE CASCADE
Indexes: idx_sessions_user, idx_sessions_expires
Constraints: NOT NULLs and FK
Timestamps: created_at, last_active, expires_at
Created by: createSession src/webapp/auth.ts:594
Read by: findSession src/webapp/auth.ts:614
Status: ACTIVE

MODEL: audit_events
Defined in: src/webapp/audit.ts:82
Type: DB table + append-only triggers
Fields: id, timestamp, operation, entity_type, entity_id, user, summary, record_hash
Primary key: id INTEGER AUTOINCREMENT
Relationships: none
Indexes: none explicit
Constraints: append-only by triggers audit_events_no_update/no_delete
Timestamps: timestamp
Created by: \_appendSqlite src/webapp/audit.ts:114
Read by: not directly queried in service (JSONL read path is primary)
Status: ACTIVE

MODEL: git_credentials
Defined in: src/webapp/services/git/credential-store.ts:88
Type: DB table
Fields: workspace_id, provider, ciphertext, tag, iv
Primary key: composite (workspace_id, provider)
Relationships: none
Indexes: PK implicit
Constraints: NOT NULL fields
Timestamps: none
Created by: setCredential src/webapp/services/git/credential-store.ts:113
Read by: getCredential/listProviders src/webapp/services/git/credential-store.ts:94, src/webapp/services/git/credential-store.ts:133
Status: ACTIVE

MODEL: rag_collections
Defined in: src/webapp/services/rag/types.ts:50
Type: DB table
Fields: id, name, description, created_at
Primary key: id
Relationships: parent of rag_chunks via FK
Indexes: unique(name)
Constraints: NOT NULL + unique name
Timestamps: created_at
Created by: ensureCollection src/webapp/services/rag/rag-store.ts:130
Read by: listCollections src/webapp/services/rag/rag-store.ts:272
Status: ACTIVE

MODEL: rag_chunks
Defined in: src/webapp/services/rag/types.ts:58
Type: DB table
Fields: id, collection_id, source_path, chunk_text, start_line, chunk_hash
Primary key: id
Relationships: FK collection_id -> rag_collections(id) ON DELETE CASCADE
Indexes: unique(collection_id, chunk_hash)
Constraints: NOT NULL, FK
Timestamps: none
Created by: upsert src/webapp/services/rag/rag-store.ts:150
Read by: query join-back path src/webapp/services/rag/rag-store.ts:211
Status: ACTIVE

MODEL: rag_file_index
Defined in: src/webapp/services/rag/types.ts:69
Type: DB table
Fields: collection_id, source_path, file_hash, indexed_at
Primary key: composite (collection_id, source_path)
Relationships: none enforced to rag_collections
Indexes: PK implicit
Constraints: NOT NULL fields
Timestamps: indexed_at
Created by: setFileHash src/webapp/services/rag/rag-store.ts:303
Read by: getFileHash/listIndexedFiles src/webapp/services/rag/rag-store.ts:294, src/webapp/services/rag/rag-store.ts:320
Status: ACTIVE

MODEL: StorageProvider collection tables (dynamic)
Defined in: platform/engine/persistence/sqlite-provider.ts:85
Type: generated SQLite tables per collection (col\_<name>)
Fields: id, data(JSON text), generated status/type, created_at, updated_at
Primary key: id
Relationships: none
Indexes: status, type, updated_at per generated table
Constraints: only id PK + data NOT NULL
Timestamps: created_at, updated_at
Created by: write/list from all provider consumers
Read by: all provider consumers
Status: ACTIVE

MODEL: workspaces (document model)
Defined in: platform/engine/workspace/workspace-manager.ts:20
Type: document collection
Fields: id, name, repositories[], teams[], policies[], owner, created_at, updated_at
Primary key: id (document id)
Relationships: logical relation to projects.workspaceId only, no DB FK
Indexes: provider dependent only (none explicit for file provider)
Constraints: app-level validation only
Timestamps: created_at, updated_at
Created by: createWorkspace src/webapp/routes/workspaces.ts:187
Read by: list/get workspace routes
Status: ACTIVE

MODEL: projects (document model)
Defined in: platform/engine/workspace/workspace-manager.ts:21
Type: document collection
Fields: id, workspaceId, name, repositories[], sessions[], status, created_at, updated_at
Primary key: id
Relationships: logical link to workspaceId (not enforced by storage layer)
Indexes: none explicit
Constraints: app-level only
Timestamps: created_at, updated_at
Created by: createProject in workspace manager
Read by: workspace routes
Status: ACTIVE

MODEL: jobs / jobs-dlq
Defined in: platform/engine/jobs/persistent-queue.ts:15
Type: document collections
Fields: Job object (id,type,payload,priority,status,retryCount,maxRetries,timestamps,result/error)
Primary key: id
Relationships: none
Indexes: only if sqlite provider and status/type generated columns are used
Constraints: app-level status transitions only
Timestamps: createdAt, startedAt, completedAt
Created by: enqueue/fail/complete in PersistentQueue
Read by: jobs routes and queue operations
Status: ACTIVE

MODEL: session-state.json (file format)
Defined in: platform/engine/state-persistence.ts:120
Type: file format document
Fields: status, mode, state_history, gate_results, last_updated, plus merged extras
Primary key: NONE
Relationships: path references to phase outputs only
Indexes: NONE
Constraints: minimal (status string check only in loader)
Timestamps: last_updated
Created by: saveSessionState src platform/engine/state-persistence.ts:151
Read by: engine and routes/services
Status: ACTIVE

MODEL: run-history.json (file format)
Defined in: platform/engine/state-persistence.ts:247
Type: file array log
Fields: runEntry object (mode,status,started/ended,state_history,gate_results)
Primary key: NONE
Relationships: none
Indexes: NONE
Constraints: capped to 50 entries
Timestamps: run entry timestamps
Created by: saveRunHistory
Read by: engine runHistory API
Status: ACTIVE

MODEL: command-queue.json (file format)
Defined in: src/webapp/config.ts:172, src/webapp/services/commands-service.ts:35
Type: file array queue
Fields: command, project, description, scope, execution_mode, requested_at, status, source, completed_at/error
Primary key: NONE
Relationships: none
Indexes: NONE
Constraints: queue length capped 50 in service
Timestamps: requested_at, completed_at
Created by: CommandService.queue
Read by: commands route + auto-orchestration dispatcher
Status: ACTIVE

MODEL: transition-events.json / transition-lease.json
Defined in: platform/engine/transition-event-log.ts:34, platform/engine/transition-lease.ts:84
Type: file event log and lease record
Fields: transition id/from/to/status/timestamp and lease owner/token/expiry
Primary key: NONE
Relationships: logical transition IDs
Indexes: NONE
Constraints: app-level duplicate suppression for transition events
Timestamps: yes
Created by: engine transition hooks
Read by: crash recovery/replay and lease checks
Status: ACTIVE

## 2B. Schema Design Quality

- Primary keys: mostly present in SQLite models. File models have no key constraints.
- Foreign keys: present in auth and RAG schemas; absent in document/file models.
- Data types: many semi-structured documents are stored as JSON text without schema constraints in dynamic provider tables (platform/engine/persistence/sqlite-provider.ts:87).
- Nullable overloading: several JSON document collections accept arbitrary shape, making model drift likely.
- Normalization: mixed. Auth is normalized; workspace/project/job/session file models are denormalized and duplicated across stores.
- Soft delete: absent in most models. Deletes are hard deletes.
- Timestamps: inconsistent; some tables include them, some critical tables (git_credentials) do not.

## 2C. Missing Models

MISSING MODEL: unified workflow_runs table
Expected because: workflow execution spans command queue, session state, run history, agent runs, and jobs.
Currently: fragmented across multiple files and collections.
Impact: no atomic lifecycle view, hard forensic reconstruction, weak resumability guarantees.

MISSING MODEL: tool_call_log structured store
Expected because: agentic system executes tools and needs replay/audit.
Currently: partial logs in text/session artifacts; no canonical query model.
Impact: difficult incident analysis and compliance-grade traceability.

MISSING MODEL: artifact_versions
Expected because: generated artifacts are regenerated and compared over time.
Currently: path-based files and occasional registry metadata; no durable per-version diff model.
Impact: weak rollback and provenance for generated outputs.

MISSING MODEL: retention_policy registry
Expected because: logs/artifacts/history grow continuously.
Currently: ad hoc limits (run-history 50, command queue 50) with no global retention model.
Impact: uneven cleanup and unbounded growth in multiple stores.
