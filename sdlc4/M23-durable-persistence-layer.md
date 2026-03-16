# M23: Durable Persistence Layer

> **Impact:** HIGH | **Breaking changes:** NONE if additive (new storage layer
> alongside existing FileStore, then gradual migration) | **Blocks:** nothing |
> **Blocked by:** nothing
>
> **Audit reference:** Weakness #1 and Phase 1 recommendation — "File-based
> JSON/Markdown storage and local HTTP control-plane assumptions are fine for
> solo/local-first use, but they are limiting for multi-user, multi-repo,
> concurrent, or enterprise scenarios." Phase 1: "You need an event store or
> relational persistence for sessions, commands, decisions, artifacts, lineage,
> approvals." Score: Operational scalability 5.5/10.
>
> **Validation:** CONFIRMED. `FileStore` in `src/webapp/store.ts` uses
> `fs.readFileSync`/`fs.writeFileSync` with temp-then-rename. `file-lock.ts`
> provides file-level locking. `state-persistence.ts` writes `session-state.json`.
> All state is file-backed JSON or Markdown on the local filesystem. No database
> anywhere.

---

## Rationale

File-backed persistence is the single biggest architectural constraint for
platform evolution. Every future capability (multi-user, concurrent sessions,
search, audit queries, lineage graph) is harder with files than with a database.
However, the migration must preserve the local-first philosophy — the solution
should support **both** file-backed (for local/solo use) and database-backed
(for platform/team use) through the existing adapter pattern.

---

## Issues

### M23-001: Define persistence interface (StorageProvider)

**Labels:** `architecture`, `persistence`

Create `platform/engine/persistence/storage-provider.ts`:

```typescript
interface StorageProvider {
  // Document operations
  read(collection: string, id: string): Promise<Document | null>;
  write(collection: string, id: string, data: Document): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list(collection: string, filter?: Filter): Promise<Document[]>;

  // Atomic operations
  transaction(ops: Operation[]): Promise<void>;

  // Query
  query(collection: string, query: Query): Promise<Document[]>;

  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}
```

Collections map to current file-backed concepts: `sessions`, `decisions`,
`questionnaires`, `commands`, `artifacts`, `audit-events`, `metrics`.

**Acceptance criteria:**

- [ ] Interface covers all current FileStore operations
- [ ] Interface supports transactions for multi-file updates
- [ ] Interface is async-first (for database compatibility)
- [ ] Types exported from persistence barrel

---

### M23-002: Implement FileStorageProvider (wrap existing FileStore)

**Labels:** `persistence`, `refactor`

Create `platform/engine/persistence/file-provider.ts` that wraps the existing
`FileStore` behind the `StorageProvider` interface:

- map `collection` to directory paths
- map `read/write/delete` to file operations
- `list` scans directory
- `query` filters in-memory after list
- `transaction` uses sequential file-lock writes
- Preserve atomic write semantics (temp-then-rename)
- Preserve backup-on-write behavior

**Acceptance criteria:**

- [ ] FileStorageProvider passes StorageProvider contract tests
- [ ] Behavior is identical to current FileStore
- [ ] Existing tests still pass
- [ ] No data format changes

---

### M23-003: Implement SQLiteStorageProvider

**Labels:** `persistence`, `feature`

Create `platform/engine/persistence/sqlite-provider.ts`:

- Use `better-sqlite3` (synchronous, zero-config, single-file database)
- Auto-create tables per collection on first write
- JSON column for document storage (flexible schema)
- Indexed columns for common queries (id, status, date, type)
- WAL mode for concurrent read performance
- Transaction support using native SQLite transactions

**Acceptance criteria:**

- [ ] SQLiteStorageProvider passes StorageProvider contract tests
- [ ] Creates database file automatically on first use
- [ ] Supports all CRUD operations with proper indexing
- [ ] Transaction support works correctly
- [ ] Database file is in a configurable location (default: `.agentic/data.db`)

---

### M23-004: Create storage provider contract test suite

**Labels:** `testing`, `persistence`

Create `tests/unit/persistence/storage-contract.test.ts`:

- Data-driven test suite that runs against any `StorageProvider` implementation
- Tests: CRUD operations, list with filters, query, transactions,
  concurrent writes, error handling, health check
- Both FileStorageProvider and SQLiteStorageProvider must pass all tests

**Acceptance criteria:**

- [ ] Contract test suite with 20+ test cases
- [ ] Both providers pass all contract tests
- [ ] Test suite is parameterized (add new providers and they auto-test)

---

### M23-005: Migrate server to use StorageProvider

**Labels:** `refactor`, `persistence`

Update `src/webapp/server.ts` and all service/route modules to use
`StorageProvider` instead of direct `FileStore`:

- Inject `StorageProvider` via dependency injection at server startup
- Provider selection via configuration (`STORAGE_PROVIDER=file|sqlite`)
- Default: `file` (preserves current behavior, zero breaking change)
- All 16 route modules use provider, not FileStore directly

**Acceptance criteria:**

- [ ] Server starts with `STORAGE_PROVIDER=file` (default) — identical behavior
- [ ] Server starts with `STORAGE_PROVIDER=sqlite` — uses SQLite
- [ ] All integration tests pass with both providers
- [ ] MCP server also uses StorageProvider

---

### M23-006: Implement data migration utility

**Labels:** `persistence`, `tooling`

Create `scripts/migrate-storage.ts`:

- Reads all data from source provider (e.g., file)
- Writes all data to target provider (e.g., sqlite)
- Validates migration completeness (document count, content hash)
- Supports dry-run mode
- Idempotent (safe to run multiple times)

**Acceptance criteria:**

- [ ] Migration from file→sqlite works correctly
- [ ] Migration from sqlite→file works correctly (reversible)
- [ ] Dry-run mode shows what would be migrated without writing
- [ ] Validation confirms zero data loss

---

### M23-007: Add persistence health to observability

**Labels:** `observability`, `persistence`

Wire `StorageProvider.health()` into the server health endpoint and metrics:

- `/api/health` includes storage health status
- Metrics include: read latency (p50/p95), write latency, error count
- Dashboard page shows storage provider type and health

**Acceptance criteria:**

- [ ] Health endpoint reports storage status
- [ ] Metrics include storage operation latency
- [ ] Observability page shows storage provider info
