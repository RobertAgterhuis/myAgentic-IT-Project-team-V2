# Area 8 — Backup, Recovery & Data Durability

[🟡 MEDIUM] DURABILITY: local snapshot backups
Status: EXISTS
Evidence: src/webapp/store.ts:32, platform/engine/persistence/file-provider.ts:63
Risk: backups are local point copies only; no centralized retention governance.
Mitigation: policy-driven backup schedule and restore validation automation.

[🔴 CRITICAL] DURABILITY: database backup strategy
Status: MISSING
Evidence: NOT FOUND for automated SQLite backup/restore orchestration across auth.db, data.db, rag.sqlite, credentials.sqlite.
Risk: single-file DB corruption or accidental deletion can cause permanent data loss.
Mitigation: scheduled snapshot/export backups with checksum validation and tested restore drills.

[🟠 HIGH] DURABILITY: point-in-time recovery
Status: PARTIAL
Evidence: transition intent/events and run logs exist (platform/engine/state-persistence.ts:282, platform/engine/transition-event-log.ts:48), but no full PITR for databases/files.
Risk: cannot restore complete multi-store state to arbitrary timestamp.
Mitigation: unified event journal + periodic snapshots + replay tooling.

[🟡 MEDIUM] DURABILITY: data export portability
Status: PARTIAL
Evidence: many stores are plain JSON/Markdown and SQLite; no unified export endpoint for all user/workflow data.
Risk: operational lock-in and manual export burden.
Mitigation: implement full workspace export/import package with manifest and checksums.

[🟠 HIGH] DURABILITY: disaster recovery path
Status: PARTIAL
Evidence: runtime scaffold recreates directories only (src/webapp/runtime-scaffold.ts:21), not data restoration.
Risk: service can restart, but business data may be irrecoverably gone.
Mitigation: documented and automated DR workflow including backup restore and integrity checks.

[🟡 MEDIUM] DURABILITY: test/prod data isolation
Status: PARTIAL
Evidence: many paths default to .agentic under cwd (src/webapp/server.ts:254, src/webapp/auth.ts:1219).
Risk: environment misconfiguration can mix datasets.
Mitigation: strict environment-specific data roots and startup guardrails.

[🟠 HIGH] DURABILITY: unbounded growth
Status: EXISTS (risk)
Evidence: persistent jobs have no cleanup policy (platform/engine/jobs/persistent-queue.ts:203), chat-history files accumulate (src/webapp/services/chat-service.ts:145), multiple logs/artifacts are append-based.
Risk: storage bloat and degraded query/list performance.
Mitigation: retention policies, archival tiers, and compaction jobs per data domain.
