# Area 6 — Migration, Seeding & Schema Evolution

[🟠 HIGH] MIGRATION: platform/engine/persistence/sqlite-provider.ts:85
Issue: dynamic collection tables auto-create without versioned migration history.
Risk: schema drift and inconsistent generated table shape across releases.
Mitigation: introduce migration ledger and explicit versioned SQL migrations for provider schema.

[🟡 MEDIUM] MIGRATION: src/webapp/auth.ts:153
Issue: auth schema evolves through inline migration logic at runtime.
Risk: app startup path mixes business logic and migration behavior; rollback/testing complexity.
Mitigation: extract versioned auth migrations with up/down strategy and startup schema checks.

[🟡 MEDIUM] MIGRATION: src/webapp/services/rag/types.ts:50
Issue: RAG migrations are inline constants with no migration history table.
Risk: hard to track applied schema versions across environments.
Mitigation: add rag_migrations ledger and explicit migration runner.

[⚪ INFO] MIGRATION: src/webapp/plugins/mcp-governance/service.ts:178
Issue: governance plugin has versioned migrations table mcp_migrations and SQL files.
Risk: lower compared to other modules, but isolated approach increases inconsistency with rest of stack.
Mitigation: standardize migration framework across all SQLite domains.

[🟠 HIGH] MIGRATION: repository-wide
Issue: no unified migration orchestration for all persistent domains (auth, rag, provider collections, credentials, identity).
Risk: partial upgrades and hidden schema incompatibilities.
Mitigation: central migration command that validates and applies all domain migrations atomically per startup phase.

## 6A Migrations

- Exists: governance SQL migrations with tracking table (src/webapp/plugins/mcp-governance/service.ts:196, src/webapp/plugins/mcp-governance/migrations/001_mcp_governance.sql:1).
- Partial: auth and RAG use runtime inline DDL (src/webapp/auth.ts:153, src/webapp/services/rag/types.ts:50).
- Missing: unified migration framework and rollback strategy across all stores.

## 6B Seeding

- No formal seed scripts found for required baseline data in core domains.
- Bootstrap behavior exists only for first auth user role assignment (src/webapp/auth.ts:398).

## 6C Schema Drift Risk

- High drift potential due to mixed schema authorities: inline SQL strings, dynamic table generation, JSON file formats, and markdown models.
- Raw queries tightly coupled to current schema names (auth, identity, governance routes/services), with limited startup schema conformance checks.
