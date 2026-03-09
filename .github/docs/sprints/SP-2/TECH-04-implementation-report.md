# Implementation Report — TECH-04: Unify MCP/HTTP Write Paths (Shared FileStore)

> **Story:** TECH-04 | **Sprint:** SP-2 | **Type:** CODE | **SP:** 5  
> **Date:** 2026-03-08 | **Status:** IMPLEMENTED  
> **Agent:** Implementation Agent (20)  

---

## Summary

Refactored `mcp-server.js` so all write operations use the shared `FileStore` (`store.js`), eliminating the dual-write asymmetry where `server.js` had backup+atomic writes but `mcp-server.js` used raw `fs.writeFileSync`.

## Problem

| Channel | Write Path | Backup | Atomic | SSE | Metrics |
|---------|-----------|--------|--------|-----|---------|
| HTTP (`server.js`) | `safeWriteSync` → `store.writeFile()` | ✅ | ✅ | ✅ | ✅ |
| MCP (`mcp-server.js`) | `safeWrite` → `fs.writeFileSync` + `fs.renameSync` | ❌ | ✅ | ❌ | ❌ |

Four dual-write stores were affected: questionnaire files, `decisions.md`, `project-brief.md`, `command-queue.json`.

## Changes

### 1. `mcp-server.js` — `safeWrite` function (line ~60)

**Before (6 lines):**
```js
function safeWrite(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, filePath);
}
```

**After (3 lines):**
```js
function safeWrite(filePath, data) {
  store.writeFile(filePath, data);
  cache.invalidate(filePath);
}
```

### 2. `mcp-server.js` — `saveBrief` function

Removed redundant `fs.mkdirSync(path.dirname(BRIEF_PATH), { recursive: true })` — `store.writeFile()` handles directory creation.

### 3. `mcp-server.js` — `enqueueCommand` function

Removed redundant `fs.mkdirSync(path.dirname(COMMAND_QUEUE_PATH), { recursive: true })` — `store.writeFile()` handles directory creation.

## Result

| Channel | Write Path | Backup | Atomic | SSE | Metrics |
|---------|-----------|--------|--------|-----|---------|
| HTTP (`server.js`) | `safeWriteSync` → `store.writeFile()` | ✅ | ✅ | ✅ | ✅ |
| MCP (`mcp-server.js`) | `safeWrite` → `store.writeFile()` | ✅ | ✅ | ❌* | ❌* |

*SSE and metrics do not apply to MCP channel (stdio transport).

## Test Results

- **Total tests:** 581 passed (21 files)
- **New test:** 1 — "creates a backup of the previous version (unified FileStore)" in `mcp-server.test.js`
- **Coverage:** 87.52% stmts (was 87.47%), 75.15% branch, 93.53% funcs
- **ESLint:** 0 errors on `mcp-server.js`

## Files Changed

| File | Change |
|------|--------|
| `.github/webapp/mcp-server.js` | `safeWrite` body replaced, 2 redundant `mkdirSync` removed |
| `.github/tests/unit/mcp-server.test.js` | +1 backup verification test |

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Both channels use same FileStore | ✅ |
| No dual-write paths remain | ✅ |

## Lessons Applied

- **LL-2** (10 SP cap): Story scoped to 5 SP, completed within budget
- **LL-3** (parallel tracks): Executed alongside BIZ-03 analysis
