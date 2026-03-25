import type { Database as DatabaseType } from 'better-sqlite3';

export type SqliteJournalMode = 'WAL' | 'DELETE';
export type SqliteSynchronousMode = 'NORMAL' | 'FULL';

export interface SqliteConcurrencyConfig {
  journalMode: SqliteJournalMode;
  synchronous: SqliteSynchronousMode;
  busyTimeoutMs: number;
  connectionModel: 'single-connection';
  pooling: 'none';
}

export interface SqliteConcurrencyOverrides {
  journalMode?: SqliteJournalMode;
  synchronous?: SqliteSynchronousMode;
  busyTimeoutMs?: number;
}

const DEFAULT_BUSY_TIMEOUT_MS = 5_000;

function normalizeJournalMode(value: string | undefined): SqliteJournalMode {
  return String(value || '')
    .trim()
    .toUpperCase() === 'DELETE'
    ? 'DELETE'
    : 'WAL';
}

function normalizeSynchronous(value: string | undefined): SqliteSynchronousMode {
  return String(value || '')
    .trim()
    .toUpperCase() === 'FULL'
    ? 'FULL'
    : 'NORMAL';
}

function normalizeBusyTimeoutMs(value: number | string | undefined): number {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value || DEFAULT_BUSY_TIMEOUT_MS), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUSY_TIMEOUT_MS;
}

export function resolveSqliteConcurrencyConfig(
  overrides: SqliteConcurrencyOverrides = {},
  env: NodeJS.ProcessEnv = process.env
): SqliteConcurrencyConfig {
  return {
    journalMode: overrides.journalMode ?? normalizeJournalMode(env.SQLITE_JOURNAL_MODE),
    synchronous: overrides.synchronous ?? normalizeSynchronous(env.SQLITE_SYNCHRONOUS),
    busyTimeoutMs: overrides.busyTimeoutMs ?? normalizeBusyTimeoutMs(env.SQLITE_BUSY_TIMEOUT_MS),
    connectionModel: 'single-connection',
    pooling: 'none',
  };
}

export function applySqliteConcurrencyPragmas(
  db: DatabaseType,
  config: SqliteConcurrencyConfig
): SqliteConcurrencyConfig {
  db.pragma(`journal_mode = ${config.journalMode}`);
  db.pragma('foreign_keys = ON');
  db.pragma(`synchronous = ${config.synchronous}`);
  db.pragma(`busy_timeout = ${config.busyTimeoutMs}`);
  return config;
}
