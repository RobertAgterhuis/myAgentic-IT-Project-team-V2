# Area 4 — Data Lifecycle & Mutation Patterns

## 4A. CRUD Completeness (selected high-impact models)

MODEL: workspaces
CREATE: platform/engine/workspace/workspace-manager.ts:119 — exists
READ (single): platform/engine/workspace/workspace-manager.ts:138 — exists
READ (list/query): platform/engine/workspace/workspace-manager.ts:144 — exists
UPDATE: platform/engine/workspace/workspace-manager.ts:149 — exists
DELETE: platform/engine/workspace/workspace-manager.ts:162 — exists
Missing operations: soft delete/recovery

MODEL: projects
CREATE: platform/engine/workspace/workspace-manager.ts:213 — exists
READ (single): platform/engine/workspace/workspace-manager.ts:241 — exists
READ (list/query): platform/engine/workspace/workspace-manager.ts:247 — exists
UPDATE: platform/engine/workspace/workspace-manager.ts:255 — exists
DELETE: platform/engine/workspace/workspace-manager.ts:268 — exists
Missing operations: integrity repair for orphan workspace references

MODEL: jobs
CREATE: platform/engine/jobs/persistent-queue.ts:94 — exists
READ (single): platform/engine/jobs/persistent-queue.ts:184 — exists
READ (list/query): platform/engine/jobs/persistent-queue.ts:203 — exists
UPDATE: platform/engine/jobs/persistent-queue.ts:131, platform/engine/jobs/persistent-queue.ts:176 — exists
DELETE: missing explicit purge path for completed jobs
Missing operations: retention cleanup/purge API

MODEL: command-queue file
CREATE: src/webapp/services/commands-service.ts:56 — exists
READ (single/latest): src/webapp/services/commands-service.ts:48 — exists
READ (list): src/webapp/services/commands-service.ts:35 — exists
UPDATE: src/webapp/services/auto-orchestration.ts:245 — exists
DELETE: no explicit deletion; status transitions only
Missing operations: archival/purge beyond capped append strategy

MODEL: session-state file
CREATE/UPDATE: platform/engine/state-persistence.ts:151 — exists
READ: platform/engine/state-persistence.ts:120 — exists
DELETE: missing
Cleanup: missing global retention policy

[🟠 HIGH] LIFECYCLE: jobs
Phase: cleanup
Issue: completed/failed job documents are never purged by lifecycle policy.
Evidence: platform/engine/jobs/persistent-queue.ts:203, platform/engine/jobs/persistent-queue.ts:224
Impact: unbounded growth and degraded list/query performance.
Mitigation: add retention windows and periodic compaction/deletion by status+age.

[🟠 HIGH] LIFECYCLE: session tracker
Phase: create/read
Issue: critical runtime timeline exists only in memory.
Evidence: src/webapp/session-tracker.ts:73, src/webapp/routes/sessions.ts:25
Impact: data loss on restart; post-incident reconstruction gap.
Mitigation: persist tracked sessions/timeline events to durable store.

[🟡 MEDIUM] LIFECYCLE: command queue file
Phase: update
Issue: queue updates are status-mutation based with no immutable event stream.
Evidence: src/webapp/services/auto-orchestration.ts:245, src/webapp/services/commands-service.ts:126
Impact: weak auditability of command state transitions.
Mitigation: append-only command event log + materialized current-state view.

[🟡 MEDIUM] LIFECYCLE: chat history
Phase: create/update
Issue: per-session chat file writes are synchronous and unlocked.
Evidence: src/webapp/services/chat-service.ts:296
Impact: potential lost writes during concurrent requests.
Mitigation: serialized write queue per session ID or DB-backed append model.

[🟡 MEDIUM] LIFECYCLE: RAG vectors/tables
Phase: delete/cleanup
Issue: collection-level cleanup depends on explicit calls; no global retention/TTL.
Evidence: src/webapp/services/rag/rag-store.ts:258, src/webapp/routes/rag.ts:193
Impact: storage accumulation over time.
Mitigation: scheduled collection compaction and stale source eviction policy.
