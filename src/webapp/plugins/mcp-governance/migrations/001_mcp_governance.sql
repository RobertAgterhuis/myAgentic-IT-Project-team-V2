CREATE TABLE IF NOT EXISTS agent_types (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  control_posture TEXT NOT NULL,
  requires_workload_identity INTEGER NOT NULL,
  app_registration_ref TEXT,
  template_category TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mcp_server_registry (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  risk TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  health_status TEXT NOT NULL,
  tenant_enabled INTEGER NOT NULL DEFAULT 1,
  workspace_enabled_json TEXT NOT NULL DEFAULT '{}',
  last_health_check TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_server_policy (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  env_scope TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (agent_id, server_id, env_scope)
);

CREATE TABLE IF NOT EXISTS agent_tool_policy (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  override_mode TEXT NOT NULL,
  permission TEXT,
  approval_required INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  env_scope TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (agent_id, server_id, tool_id, env_scope)
);

CREATE TABLE IF NOT EXISTS mcp_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);
