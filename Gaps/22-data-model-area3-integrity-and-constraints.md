# Area 3 — Data Integrity & Constraints

[🟠 HIGH] INTEGRITY: platform/engine/persistence/file-provider.ts:191
Issue: File provider transaction is sequential best-effort, not atomic.
Trigger: partial failure in multi-write operation leaves mixed state.
Affected data: workspaces/projects/jobs/semantic memory when file provider active.
Mitigation: implement write-ahead journal and commit marker or migrate critical writes to sqlite transaction.

[🟠 HIGH] INTEGRITY: platform/engine/workspace/workspace-manager.ts:248
Issue: project.workspaceId relationship is app-level only; no DB FK enforcement.
Trigger: direct collection writes or partial deletes can leave dangling projects.
Affected data: workspaces/projects collections.
Mitigation: enforce FK in normalized tables or add integrity sweeper rejecting orphan documents.

[🟠 HIGH] INTEGRITY: src/webapp/routes/jobs.ts:25
Issue: each request creates a new PersistentQueue instance; no shared lock/worker ownership.
Trigger: concurrent consumers can race status transitions on the same job records.
Affected data: jobs and jobs-dlq collections.
Mitigation: singleton queue/worker process with lease-based dequeue lock and compare-and-set updates.

[🟡 MEDIUM] INTEGRITY: src/webapp/services/auto-orchestration.ts:216
Issue: direct fs JSON queue reads/writes bypass StorageProvider and DB constraints.
Trigger: malformed file or concurrent writer can corrupt queue/session state.
Affected data: command-queue.json, session-state.json, remediation-tasks.json.
Mitigation: route all command/session mutations through a single persistence abstraction with schema validation.

[🟡 MEDIUM] INTEGRITY: platform/engine/state-persistence.ts:133
Issue: loader validation only checks status string and returns null on parse issues.
Trigger: subtle shape corruption is silently accepted or dropped.
Affected data: session-state.json recovery path.
Mitigation: enforce JSON schema validation with explicit error reporting and quarantine file strategy.

[🟡 MEDIUM] INTEGRITY: src/webapp/services/chat-service.ts:273
Issue: chat session persistence uses direct file writes without locking.
Trigger: simultaneous requests for same session may clobber message history.
Affected data: .agentic/.../chat-history/\*.json
Mitigation: add file lock or move chat history into StorageProvider with optimistic version checks.

[🟡 MEDIUM] INTEGRITY: src/webapp/session-tracker.ts:73
Issue: session tracker is in-memory only.
Trigger: restart loses session timeline and agent detail records.
Affected data: sessions API evidence and investigation trace.
Mitigation: persist session tracker snapshots into durable store.

[🟡 MEDIUM] INTEGRITY: src/webapp/services/git/credential-store.ts:19
Issue: credential encryption key is mandatory env input; missing key hard-fails store construction.
Trigger: misconfigured environment blocks read/write access to credentials.
Affected data: git credentials operations.
Mitigation: startup validation gate and explicit health endpoint for credential vault readiness.

[🔵 LOW] INTEGRITY: src/webapp/audit.ts:114
Issue: audit dual-write swallows SQLite write failures while JSONL succeeds.
Trigger: sqlite append error creates split-brain audit sinks.
Affected data: audit_events table consistency.
Mitigation: emit health/degradation flag when sqlite append fails.

## 3A–3D Summary

- Referential integrity: strong in auth and RAG tables, weak in document/file models.
- Uniqueness and validation: decent in SQL schemas; weaker for JSON files and dynamic document payloads.
- Transactions and atomicity: good in SQLite provider transaction path, weak in file provider and ad-hoc fs write paths.
- Type safety: TypeScript interfaces exist, but persisted JSON structures are often schema-less at rest.
- Date handling: mixed ISO and SQLite datetime strings (src/webapp/auth.ts:135), increasing cross-layer parsing risk.
