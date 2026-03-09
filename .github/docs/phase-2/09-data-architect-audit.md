# Analysis - Data Architect (09) Audit - 2026-03-09

## Metadata
- Agent: Data Architect (09)
- Phase: 2 (Architecture and Design)
- Mode: AUDIT
- Input received from: Security Architect (08), Domain Expert (02), repository artifacts
- Questionnaire context: NOT_INJECTED
- Software under analysis: myAgentic-IT-Project-team-V2

## Executive Summary
The data layer is still fundamentally file-based and workable for single-process/local workflows, with meaningful hardening added since earlier findings: atomic write + temp rename, snapshot backups, and per-file in-process locks are implemented in core routes (`.github/webapp/store.js:46`, `.github/webapp/store.js:74`, `.github/webapp/file-lock.js:15`, `.github/webapp/routes/questionnaires.js:131`, `.github/webapp/routes/decisions.js:225`).

However, the architecture remains vulnerable to data-quality drift because most domain entities are parser-driven markdown/JSON structures without full entity-level schema enforcement. Phase 1 baseline is still the safest reference for governance reporting: 22% machine-validated core entities (2/9) and 7/9 unvalidated (`.github/docs/phase-1/02-domain-expert-audit.md:337`, `.github/docs/phase-1/02-domain-expert-audit.md:339`, `.github/docs/phase-1/02-domain-expert-audit.md:340`, `.github/docs/phase-1/02-domain-expert-audit.md:641`).

SECURITY_FLAG: No cross-process locking or transactional multi-entity commit exists; integrity guarantees are per-file and per-process only (`.github/webapp/file-lock.js:15`, `.github/webapp/store.js:65`).

## Data Model Audit
### 1. Core 9 entities (Phase 1 baseline)
The Phase 1 Domain Expert audit explicitly tracks this 9-entity core model:
1. Session State
2. Command Queue
3. Decisions
4. Questionnaires
5. Questionnaire Index
6. Audit Trail
7. Reevaluate Trigger
8. Official Documents
9. Design Tokens

Source: `.github/docs/phase-1/02-domain-expert-audit.md:323` through `.github/docs/phase-1/02-domain-expert-audit.md:333`.

### 2. Documentation coverage in `docs/data-dictionary.md`
`docs/data-dictionary.md` documents most operational entities, but not the same exact 9 baseline list. It includes Help Content and splits in additional entities (Official Documents + Document Registry), which creates taxonomy drift versus Phase 1 baseline (`docs/data-dictionary.md:30` through `docs/data-dictionary.md:38`).

### 3. Relationships, cardinality, constraints
Documented relationships/cardinality exist at conceptual level:
- Session State -> Command Queue: 1:N
- Session State -> Reevaluate Trigger: 1:0..1
- Decisions <-> Questionnaires: N:M
- Questionnaires -> Audit Log: 1:N
- Decisions -> Audit Log: 1:N

Source: `docs/data-dictionary.md:301` through `docs/data-dictionary.md:306`.

Audit judgment:
- Cardinality is documented but not enforced by FK constraints (file system model, no relational engine).
- Constraints are mostly implemented at route/input level and parser assumptions, not persisted-entity invariants.

## Schema Validation
### 1. Which 2 are validated vs which 7 are not (requested 22% baseline)
Based on Phase 1 audited baseline:
- Validated (2): Session State, Command Queue (`.github/docs/phase-1/02-domain-expert-audit.md:339`, `.github/docs/phase-1/02-domain-expert-audit.md:340`).
- Not fully machine-validated (7): Decisions, Questionnaires, Questionnaire Index, Audit Trail, Reevaluate Trigger, Official Documents, Design Tokens (`.github/docs/phase-1/02-domain-expert-audit.md:341` through `.github/docs/phase-1/02-domain-expert-audit.md:345`).

### 2. Current code-level nuance
Current `schemas.js` includes more validators than the baseline narrative (analytics, reevaluate trigger, decision mutation inputs, questionnaire update inputs, drift, snapshot) (`.github/webapp/schemas.js:126`, `.github/webapp/schemas.js:172`, `.github/webapp/schemas.js:200`, `.github/webapp/schemas.js:228`, `.github/webapp/schemas.js:247`, `.github/webapp/schemas.js:294`, `.github/webapp/schemas.js:333`).

Audit interpretation:
- This improves API input hygiene.
- It does not fully replace entity-level schema enforcement for markdown-based entities (decisions/questionnaires/index/docs), where parsers remain permissive (`.github/webapp/models.js:85`, `.github/webapp/models.js:233`, `.github/webapp/models.js:549`).

### 3. Business impact of unvalidated entities
- Invalid questionnaire/decision structures can propagate into official docs and downstream agent reasoning.
- Parser tolerance prevents hard failures but can mask data quality defects.
- Risk remains high for unattended automation goals.

Source: `.github/docs/phase-1/02-domain-expert-audit.md:520`, `.github/docs/phase-1/critic-risk-validation-audit.md:147`.

## File-Based Storage Audit
### 1. Persistence mechanism
- FileStore uses backup-before-overwrite and temp-write-then-rename atomic pattern (`.github/webapp/store.js:46`, `.github/webapp/store.js:69`, `.github/webapp/store.js:74`).
- Backup retention is capped at 10 versions (`.github/webapp/store.js:28`, `.github/webapp/store.js:59`).
- Audit log is append-only JSONL with rotation (`.github/webapp/audit.js:60`, `.github/webapp/audit.js:89`).

### 2. Concurrency and locking
- Locking is implemented via in-memory per-path lock chaining (`.github/webapp/file-lock.js:15`).
- Core mutating routes use `withFileLock(...)` (questionnaires, decisions, command queue, analytics, reevaluate trigger) (`.github/webapp/routes/questionnaires.js:131`, `.github/webapp/routes/decisions.js:225`, `.github/webapp/routes/commands.js:95`, `.github/webapp/routes/misc.js:71`, `.github/webapp/routes/misc.js:262`).

SECURITY_FLAG: Lock scope is process-local; there is no OS-level/distributed lock for multi-process writers, so concurrent writes from multiple node processes can still race.

### 3. Recovery behavior on write failure
- Temp file is cleaned up in catch path and write error is bubbled (`.github/webapp/store.js:77`, `.github/webapp/store.js:79`).
- Backup snapshots provide rollback artifacts but no automated rollback workflow.

## Data Integrity and Consistency
### 1. Referential integrity
- No FK-like verification for documented conceptual relationships (e.g., decision-questionnaire linkage) is enforced at persistence layer.
- IDs are format-validated (`Q_ID_RE`, `DEC_ID_RE`) but existence consistency across entities is not fully validated (`.github/webapp/models.js:32`, `.github/webapp/models.js:34`, `.github/webapp/routes/decisions.js:88`).

### 2. Orphan prevention
- Not systematically implemented.
- Model functions parse/transform records but do not maintain cross-entity reference indexes.

### 3. Notable consistency risk
- Milestone data path bypasses route-level file locking and centralized `safeWriteSync`, creating possible lost-update window under concurrent writes (`.github/webapp/routes/milestones.js:72`, `.github/webapp/server.js:167`).

## Audit Trail and Change Tracking
- `safeWriteSync` writes file, invalidates cache, and emits audit entry (`.github/webapp/server.js:167`, `.github/webapp/server.js:173`).
- Audit entries include timestamp, operation, entity_type, entity_id, user, summary (`.github/webapp/audit.js:80` through `.github/webapp/audit.js:86`).
- Decision markdown also appends human-readable change log entries (`.github/webapp/models.js:523`).

Gaps:
- No read-audit tracking.
- No immutable actor identity model (defaults to `system`/`webapp`).
- No entity-level diff snapshots beyond free-text summary.

## Performance Characteristics (Data Layer)
- File I/O is synchronous (`readFileSync`, `writeFileSync`, `renameSync`, `appendFileSync`) (`.github/webapp/store.js:38`, `.github/webapp/store.js:73`, `.github/webapp/store.js:74`, `.github/webapp/audit.js:89`).
- Cache is read-through with mtime invalidation; writes explicitly invalidate touched paths (`.github/webapp/cache.js:24`, `.github/webapp/cache.js:63`, `.github/webapp/server.js:169`).

Scale bottleneck assessment:
- Synchronous file I/O and full-file rewrite semantics will degrade with higher write concurrency and larger documents.
- Existing financial audit already flags need for DB migration at medium adoption scale (`.github/docs/phase-1/04-financial-analyst-audit.md:340`).

## Data Retention and Archival
- Implemented technical retention:
- Backup snapshots: 10 per file (`.github/webapp/store.js:28`).
- Audit log: size-based rotation (`.github/webapp/audit.js:60`).

Missing governance retention:
- No policy-level retention/deletion matrix per data class in current docs (`.github/docs/phase-2/08-security-architect-audit.md:69`, `.github/docs/phase-2/08-security-architect-audit.md:70`).

GDPR delete/right-to-erasure status:
- No dedicated deletion workflow/API for questionnaire/decision/session/audit entities.
- Manual file deletion guidance exists for session reset only (`docs/user-manual.md:263`).

## Schema Evolution
Current behavior is loosely backward-compatible for additive changes:
- `validateSessionState` checks required fields and selected optionals but does not reject unknown extra fields (`.github/webapp/schemas.js:27`).
- Most readers deserialize and pass objects through without strict schema version gates (`.github/webapp/routes/misc.js:56`).

Answer to requested question:
- Yes, adding a new field to Session is likely non-breaking for current readers.
- Caveat: without explicit `schema_version` + migration policy, forward/backward compatibility remains implicit, not guaranteed.

## Findings
| ID | Severity | Finding | Source |
|---|---|---|---|
| DA-AUD-001 | High | Core governance baseline remains 22% validated entities (2/9), leaving 7 entities without full machine-enforced schema. | `.github/docs/phase-1/02-domain-expert-audit.md:337`, `.github/docs/phase-1/02-domain-expert-audit.md:641` |
| DA-AUD-002 | High | Parser-driven markdown entities (decisions/questionnaires/index/docs) are not protected by strict persisted-entity schema contracts. | `.github/webapp/models.js:85`, `.github/webapp/models.js:233`, `docs/data-dictionary.md:32`, `docs/data-dictionary.md:33` |
| DA-AUD-003 | Medium | Locking is in-process only; multi-process writers remain a race risk. SECURITY_FLAG | `.github/webapp/file-lock.js:15` |
| DA-AUD-004 | Medium | Referential integrity is conceptual/documented, not enforced as hard constraints. | `docs/data-dictionary.md:301`, `docs/data-dictionary.md:303`, `.github/webapp/routes/decisions.js:88` |
| DA-AUD-005 | Medium | Retention/deletion policy is not formally defined per data category. | `.github/docs/phase-2/08-security-architect-audit.md:70`, `.github/docs/phase-2/08-security-architect-audit.md:160` |
| DA-AUD-006 | Medium | Milestone persistence path writes without route-level lock coordination, risking concurrent overwrite under load. | `.github/webapp/routes/milestones.js:72`, `.github/webapp/routes/milestones.js:54`, `.github/webapp/file-lock.js:15` |
| DA-AUD-007 | Low | Data taxonomy drift exists between phase baseline (9 entities) and data dictionary catalog entries, which can create reporting inconsistencies. | `.github/docs/phase-1/02-domain-expert-audit.md:323`, `docs/data-dictionary.md:30`, `docs/data-dictionary.md:38` |

## Recommendations
1. P1: Introduce entity-contract validators for the 7 unvalidated core entities (starting with Decisions and Questionnaires), and fail writes when structural rules are violated.
2. P1: Add schema versioning (`schema_version`) and migration handlers for session, queue, and milestone payloads to make evolution explicit.
3. P1: Add cross-process lock strategy (OS file lock or single-writer process model) for non-local/simultaneous writer scenarios. SECURITY_FLAG
4. P2: Implement referential integrity checks as pre-write assertions (decision-questionnaire links, index consistency checks) with orphan detection reports.
5. P2: Normalize persistence path usage so all mutating routes use one write pipeline (`withFileLock` + `safeWriteSync` + audit metadata).
6. P2: Publish retention/deletion matrix and implement deletion workflows per entity class (session, questionnaire answers, decisions, audit records).

## UNCERTAIN / INSUFFICIENT_DATA
- `INSUFFICIENT_DATA: Required legal retention periods by data class` - Missing authoritative policy owner and durations.
- `INSUFFICIENT_DATA: Expected multi-process deployment topology` - Unknown whether concurrent writers across processes/containers are in-scope for near-term releases.

### QUESTIONNAIRE_REQUEST
1. What are mandatory retention periods for session state, questionnaires, decisions, and audit logs?
2. Is multi-process or multi-container concurrent write access an explicit GA requirement?
3. Which entity must support hard deletion (not soft-delete) for compliance workflows?

## Handoff
- Deliverable written: `.github/docs/phase-2/09-data-architect-audit.md`.
- Scope covered: data model, schema, storage, integrity, auditability, performance, retention, evolution.
- Phase 1 baseline (9 entities, 22%) reconciled with current code-level validator expansion.
- Primary risk: parser-driven entities without strict persisted-entity contracts.
- SECURITY_FLAG items marked: lock scope and concurrent-writer integrity risk.
- Open data-policy gaps converted to `QUESTIONNAIRE_REQUEST` items.
- Ready for Critic/Risk validation handoff.
