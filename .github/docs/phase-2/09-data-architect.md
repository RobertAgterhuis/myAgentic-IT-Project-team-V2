# Analysis – Data Architect – 2026-03-08

## Metadata
- Agent: Data Architect (09)
- Phase: 2
- Input received from: Security Architect (08)
- Date: 2026-03-08
- Software under analysis: myAgentic-IT-Project-team-V2
- Mode: AUDIT

## Scope Change Impact
NOT_APPLICABLE — normal cycle

## Step 0: Questionnaire Context
NOT_INJECTED — first audit cycle

---

## 1. Data Model Inventory

### 1.1 Data Stores

| Store | Type | Format | Location | Access Pattern | Source |
|-------|------|--------|----------|---------------|--------|
| Session State | JSON file | Single JSON object | `.github/docs/session/session-state.json` | Read-parse-modify-write (full file) | `schemas.js:validateSessionState` |
| Command Queue | JSON file | Array of command entries | `.github/docs/session/command-queue.json` | Read-parse-modify-write (full file) | `schemas.js:validateCommandQueue` |
| Questionnaires | Markdown files | Structured markdown with headers/tables | `BusinessDocs/*/Questionnaires/*.md` | Parse on read via `models.parseQuestionnaire()` | `models.js` |
| Decisions | Markdown file(s) | Structured markdown with decision entries | `.github/docs/decisions.md`, `.github/docs/decisions/*.md` | Parse on read via `models.parseDecisions()` | `models.js` |
| Questionnaire Index | Markdown file | Summary table | `BusinessDocs/questionnaire-index.md` | Parse on read | `models.js` |
| Audit Trail | JSONL file | Append-only JSON Lines | `.github/docs/audit/audit-log.jsonl` | Append on write, tail on read | `audit.js` |
| Agent Outputs | Markdown files | Phase deliverables | `.github/docs/phase-N/*.md` | Write once, read by next agent | Orchestrator protocol |
| Design Tokens | JSON file | Design token object | `.github/docs/brand/design-tokens.json` | Read by Storybook Agent | Brand Agent protocol |
| Backups | Binary copies | Timestamped file snapshots | `**/.backups/<filename>/<timestamp>` | Auto-created on write, pruned to 10 | `store.js:46-63` |

### 1.2 Data Entities

| Entity | Primary key | Lifecycle | Validation | Source |
|--------|-------------|-----------|------------|--------|
| Session | `session_id` | Created once per cycle, updated per agent handoff | `validateSessionState()` | `schemas.js` |
| Command | `command` + `requested_at` | PENDING → PROCESSING → DONE/ERROR | `validateCommandEntry()` | `schemas.js` |
| Question | `Q-XX-NNN` (parsed from markdown) | OPEN → ANSWERED/DEFERRED | Parsed structure only | `models.js` |
| Decision | `DEC-XX-NNN` (parsed from markdown) | OPEN → DECIDED/DEFERRED | Parsed structure only | `models.js` |
| Audit Entry | Implicit (append position) | Immutable once written | None (append-only) | `audit.js` |

---

## 2. Data Lineage Map (G-ARCH-08)

```
User Input (web UI / Copilot chat)
  │
  ├→ server.js (HTTP) ──→ sanitizeMarkdown/sanitizeQID ──→ FileStore.writeFile()
  │                                                           │
  │                                                           ├→ .backups/ (snapshot)
  │                                                           └→ Target file (session/questionnaire/decision)
  │                                                                │
  │                                                                └→ AuditTrail.log() ──→ audit-log.jsonl
  │
  ├→ mcp-server.js (MCP) ──→ safeWrite() ──→ Target file
  │                                            │
  │                                            └→ audit.log() ──→ audit-log.jsonl
  │
  └→ FileCache.read() ←── FileStore.readFile() ←── Any read operation
       │
       └→ In-memory cache (Map) with mtime invalidation
```

### 2.1 Lineage Gaps

| Gap | Description | Impact | Source |
|-----|-------------|--------|--------|
| Dual write paths | HTTP server uses `FileStore.writeFile()` (with backup), MCP server uses local `safeWrite()` (without backup) | MCP writes lack backup snapshots | `mcp-server.js:56-59` vs `store.js:65-82` |
| No read auditing | Audit trail records writes only; reads are not logged | Cannot trace who accessed what data | `audit.js:80-90` |
| Cache invalidation on MCP writes | `mcp-server.js:safeWrite()` calls `cache.invalidate()` after MCP writes | Cache consistency maintained but fragile (depends on manual invalidation) | `mcp-server.js:59` |

---

## 3. Data Quality Assessment

| Dimension | Score | Findings | Source |
|-----------|-------|----------|--------|
| Schema enforcement | 4/10 | Only `session-state` and `command-queue` have validators; questionnaires and decisions rely on markdown parsing patterns | `schemas.js` (2 validators), `models.js` |
| Referential integrity | 3/10 | No foreign key enforcement; `decision-category` files reference decision IDs but no validation that referenced IDs exist | `models.js`, `decisions/*.md` |
| Data durability | 7/10 | Atomic writes prevent corruption; backups provide rollback; audit trail provides mutation record | `store.js`, `audit.js` |
| Data consistency | 5/10 | No file locking; concurrent reads during mid-write could read stale data; mtime cache helps but race window exists | `store.js`, `cache.js` |
| Completeness | 6/10 | Markdown parsing tolerates malformed input gracefully (`detectMarkdownCorruption` exists); strict mode available | `models.js:578` |

**Overall Data Quality Score: 5.0/10**

---

## 4. Gaps

### 4.1 No Schema for Agent Outputs
- **Description:** 25 output contracts exist as markdown documentation but have no machine-readable schemas. Agent outputs are markdown files with no structural validation.
- **Priority:** High — directly blocks "state consistency" transformation goal
- **Source:** `.github/docs/contracts/` (25 files, all markdown only)

### 4.2 No Schema for Questionnaire/Decision Entities
- **Description:** Questions and decisions are parsed from markdown using regex/pattern matching (`models.parseQuestionnaire`, `models.parseDecisions`). No JSON Schema or formal grammar exists.
- **Priority:** Medium
- **Source:** `models.js`

### 4.3 Dual Write Path Creates Inconsistency
- **Description:** HTTP server writes via `FileStore` (with backup) while MCP server writes via `safeWrite()` (without backup). This means MCP mutations have no backup snapshots.
- **Priority:** Medium
- **Source:** `mcp-server.js:56-59` (lacks `_createBackup` call)

---

## 5. KPI Baseline
| KPI | Current value | Source |
|-----|---------------|--------|
| Data stores | 9 types | Inventory above |
| Machine-validated schemas | 2/9 (22%) | `schemas.js` |
| Data quality score | 5.0/10 | Assessment above |
| Referential integrity checks | 0 | Absence of FK validation |
| Backup coverage | HTTP writes only | `store.js` vs `mcp-server.js` |

---

## HANDOFF CHECKLIST
- [x] Data lineage documented (G-ARCH-08)
- [x] All data stores inventoried
- [x] Schema enforcement assessed
- [x] Data quality scored
- [x] All findings sourced
- [x] Deliverable written to file per MEMORY MANAGEMENT PROTOCOL
