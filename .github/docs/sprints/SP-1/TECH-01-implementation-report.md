# Implementation Report — TECH-01: File Locking for All JSON Stores

> **Sprint:** SP-1 Critical Data Integrity  
> **Story:** TECH-01 — File locking for all JSON stores  
> **Story Points:** 8 SP  
> **Type:** CODE  
> **Status:** IMPLEMENTED  
> **Date:** 2026-03-08  

---

## Summary

Extracted the `withFileLock` concurrency primitive into a shared module (`file-lock.js`) and applied it to **all 10 previously unprotected write paths** across both `server.js` and `mcp-server.js`. This eliminates the data corruption risk when the HTTP API and MCP server write to the same files concurrently.

## Problem Statement

- `server.js` had 4 write paths calling `safeWriteSync()` without `withFileLock` protection.
- `mcp-server.js` had 6 write paths using its own `safeWrite()` function with NO locking at all.
- Both servers run in the same Node.js process and can write to the same files (decisions.md, questionnaires, command-queue.json, project-brief.md) concurrently.
- Risk: read-modify-write races causing data loss or corruption during unattended agent execution.

## Changes Made

### New File
- **`.github/webapp/file-lock.js`** — Shared module exporting `withFileLock` and `_writeLocks`. Uses promise-chaining per resolved path key (no external dependencies).

### Modified Files

#### `.github/webapp/server.js`
1. **Added import** of `withFileLock` from `./file-lock.js` (line 16)
2. **Removed inline** `_writeLocks` Map and `withFileLock` function (was lines 309–331)
3. **Wrapped** `rebuildQuestionnaireIndex()` — now async, Q_INDEX_FILE locked
4. **Wrapped** `apiReevaluate()` — reevaluate-trigger.json locked
5. **Wrapped** `saveProjectBrief()` — now async, project-brief.md locked
6. **Wrapped** `appendToCommandQueue()` — now async, COMMAND_QUEUE locked
7. **Updated** `apiPostCommand()` — added `await` for `saveProjectBrief` and `appendToCommandQueue`
8. **Updated** `scheduleRebuildIndex()` — added `.catch()` for unhandled rejection from async `rebuildQuestionnaireIndex`

#### `.github/webapp/mcp-server.js`
1. **Added import** of `withFileLock` from `./file-lock.js` (line 33)
2. **Wrapped** `applySaveAnswers()` — questionnaire file locked via `withFileLock(abs, ...)`
3. **Wrapped** `create_decision` tool — DECISIONS_PATH locked
4. **Wrapped** `answer_decision` tool — DECISIONS_PATH locked
5. **Wrapped** `decide_question` tool — DECISIONS_PATH locked
6. **Wrapped** `saveBrief()` — now async, project-brief.md locked
7. **Wrapped** `enqueueCommand()` — now async, command-queue.json locked
8. **Updated** `queue_command` tool caller — added `await` for `saveBrief` and `enqueueCommand`

#### `.github/tests/unit/file-lock.test.js`
1. **Updated import** from `../../webapp/server` → `../../webapp/file-lock`
2. **Added 4 new tests:**
   - Lock map cleanup after completion
   - Lock map cleanup after error (ensures no leaked locks)
   - Triple chained writes serialization
   - Singleton verification: `server.withFileLock === fileLock.withFileLock`

## Acceptance Criteria Verification

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Concurrent writes to any JSON store serialize correctly | ✅ PASS — All writes now go through `withFileLock` with per-path lock keys |
| AC2 | All existing tests pass | ✅ PASS — 580/580 tests (was 576, +4 new) |
| AC3 | New locking tests added | ✅ PASS — 4 new tests covering cleanup, error handling, chaining, and singleton |

## Architecture Notes

- **No new dependencies.** Uses in-memory promise-chaining (same pattern as before, now shared).
- **Single lock map.** Both server.js and mcp-server.js resolve to the same `file-lock.js` module instance via Node.js require cache, so all writes coordinate on the same `_writeLocks` Map.
- **Lock granularity:** Per-file path (resolved to absolute). Different files can write in parallel.
- **Backward compatible.** `server.js` still exports `withFileLock` for any consumer that imports from it.

## HANDOFF CHECKLIST
- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated — N/A (none)
- [x] All INSUFFICIENT_DATA: items are documented and escalated — N/A (none)
- [x] Output complies with the contract in /.github/docs/contracts/
- [x] Guardrails from /.github/docs/guardrails/ have been checked
- [x] Output is machine-readable and ready as input for the next agent
- [x] No contradictory statements in this document
- [x] All findings include a source reference
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL
