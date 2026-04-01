# Agentic SDLC Solution - Error Recovery & Resilience Deep Audit

## Area 5 - State Corruption & Consistency

[🔴 CRITICAL] STATE CORRUPTION: `src/webapp/services/auto-orchestration.ts:213-225`, `src/webapp/services/auto-orchestration.ts:262-281`  
 Scenario: command queue file write/parse failure during claim/finalize lifecycle.  
 Affected state: `BusinessDocs/session/command-queue.json` orchestration state.  
 Current protection: per-file lock via `withFileLock` only.  
 Corruption type: orphaned PROCESSING entry, dropped queue view (empty list on parse failure).  
 Fix: append-only journal + compaction, schema checksum, and crash-recovery repair pass.

[🟠 HIGH] STATE CORRUPTION: `platform/engine/persistence/file-provider.ts:175-187`  
 Scenario: multi-op transaction in file provider fails halfway.  
 Affected state: multi-document workflows in file-backed provider.  
 Current protection: best-effort sequential writes, no true atomic transaction.  
 Corruption type: partial commit/inconsistent multi-record state.  
 Fix: use SQLite provider for transactional domains or introduce write-ahead intent log for file mode.

[🔵 LOW] STATE CORRUPTION: `platform/engine/persistence/sqlite-provider.ts:191-210`  
 Scenario: multi-op write consistency requirements.  
 Affected state: transactional collections in SQLite provider.  
 Current protection: DB transaction wrapper.  
 Corruption type: mitigated.  
 Fix: ensure all critical domains run on SQLite provider in production profile.

[🟡 MEDIUM] STATE CORRUPTION: `src/webapp/services/agent-execution-service.ts:75-84`, `src/webapp/services/agent-execution-service.ts:707-712`  
 Scenario: process restart during in-memory job tracking.  
 Affected state: execution history/cancellation metadata in memory maps.  
 Current protection: none for in-memory map durability.  
 Corruption type: lost runtime control-plane state after restart.  
 Fix: persist execution job metadata to storage provider or queue backend.

[🟡 MEDIUM] STATE CORRUPTION: `src/webapp/ui/src/hooks/use-sse-events.ts:35-52`, `src/webapp/ui/src/hooks/use-sse-events.ts:184-209`  
 Scenario: duplicate or out-of-order SSE events.  
 Affected state: frontend cache/store perception of orchestrator and agent status.  
 Current protection: short dedup window and query invalidation.  
 Corruption type: stale/temporarily inconsistent UI state.  
 Fix: event sequence IDs and resume token replay.

[🟡 MEDIUM] STATE CORRUPTION: `src/webapp/session-store-redis.ts:66-83`  
 Scenario: session expires during long-running workflows.  
 Affected state: user auth continuity and ability to continue operator interventions.  
 Current protection: touch-based extension and TTL session storage.  
 Corruption type: workflow continuity loss from auth context expiration.  
 Fix: add session-expiring-soon signaling and resumable workflow tokens.

## 5B. Concurrent Modification

- Positive: file lock coordination exists (`src/webapp/file-lock.ts:12-41`).
- Gap: lock scope is file-level and local-process; does not cover distributed multi-instance writers unless all writes go through shared durable store.
- Race risk remains in read-modify-write JSON file patterns if callers bypass lock discipline.

## 5C. Cache Consistency

- File cache invalidation is explicit in write helpers (`src/webapp/server.ts:313`, `src/webapp/server.ts:339`).
- No global stale-data SLA across all UI query caches and SSE event loss windows.

## 5D. Session & Auth State

- Session rotation/fixation mitigations are present in auth callback session recreation (`src/webapp/routes/auth.ts:309-311`).
- No explicit long-workflow session handoff model for uninterrupted operator control during auth expiry.

## Area 5 Verdict

Consistency is mixed: SQLite transactional capability is strong, but file-backed orchestration state and in-memory execution maps still create corruption/loss windows under crashes and partial writes.
