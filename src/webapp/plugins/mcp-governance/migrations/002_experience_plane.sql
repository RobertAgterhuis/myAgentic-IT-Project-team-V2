-- Migration 002: MCP Experience Plane & Reconcile Loop
-- Adds mcp_overrides and reconcile_runs tables (M-INFRA-3c: #848, #851, #852)

CREATE TABLE IF NOT EXISTS mcp_overrides (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  tool_id TEXT,
  permission_level TEXT NOT NULL CHECK(permission_level IN ('N','D','R','P','W','A','X')),
  override_reason TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'system',
  justification TEXT NOT NULL DEFAULT '',
  expiry TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expired_at TEXT
);

CREATE TABLE IF NOT EXISTS reconcile_runs (
  id TEXT PRIMARY KEY,
  ran_at TEXT DEFAULT (datetime('now')),
  ran_by TEXT NOT NULL DEFAULT 'system',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  changes_applied_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK(status IN ('success','failed','dry_run')),
  error TEXT
);

INSERT OR IGNORE INTO mcp_migrations (id, applied_at) VALUES ('002_experience_plane', datetime('now'));
