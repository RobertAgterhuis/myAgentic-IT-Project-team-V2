// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Server configuration constants — paths, ports, and tuning knobs.
 * Extracted from server.ts for M17-005 composition root.
 * @module config
 */

import path from 'path';

export const PORT: number = (() => {
  const p = parseInt(process.env.PORT as string, 10);
  return p >= 1 && p <= 65535 ? p : 3000;
})();

export const HOST: string =
  typeof process.env.HOST === 'string' && process.env.HOST.trim()
    ? process.env.HOST.trim()
    : '127.0.0.1';

export const WEBAPP_DIR = __dirname;
export const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
export const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
export const GITHUB_DOCS = path.join(PROJECT_ROOT, 'docs');
export const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
export const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');
export const SESSION_AUDIT_FILE = path.join(SESSION_DIR, 'session-state-audit.json');
export const Q_INDEX_FILE = path.join(BUSINESS_DOCS, 'questionnaire-index.md');
export const DECISIONS_FILE = path.join(BUSINESS_DOCS, 'decisions.md');
export const DECISIONS_DIR = path.join(BUSINESS_DOCS, 'decisions');
export const COMMAND_QUEUE = path.join(SESSION_DIR, 'command-queue.json');
export const HELP_DIR = path.join(PROJECT_ROOT, 'docs', 'help');
export const ANALYTICS_FILE = path.join(BUSINESS_DOCS, 'analytics-events.json');
export const METRICS_FILE = path.join(BUSINESS_DOCS, 'metrics', 'runtime-metrics.json');

export const SSE_HEARTBEAT_MS = 30000;
export const ANALYTICS_MAX_EVENTS = 5000;
export const METRICS_FLUSH_INTERVAL_MS = 60000;
export const SNAPSHOT_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 30;

/* ── Persistence layer (M23-005) ──────────────────────────────── */
export type StorageProviderType = 'file' | 'sqlite';
export const STORAGE_PROVIDER: StorageProviderType = (() => {
  const v = process.env.STORAGE_PROVIDER;
  if (v === 'sqlite') return 'sqlite';
  return 'file';
})();
export const STORAGE_PATH: string | undefined = process.env.STORAGE_PATH || undefined;

/* ── Redis / BullMQ (M33-002) ─────────────────────────────────── */
export const REDIS_URL: string | undefined = process.env.REDIS_URL || undefined;
export type QueueProviderType = 'memory' | 'persistent' | 'bullmq';
export const QUEUE_PROVIDER: QueueProviderType = (() => {
  const v = process.env.QUEUE_PROVIDER;
  if (v === 'bullmq') return 'bullmq';
  if (v === 'persistent') return 'persistent';
  return 'memory';
})();

/* ── Session store (M33-004) ──────────────────────────────────── */
export type SessionStoreType = 'sqlite' | 'redis';
export const SESSION_STORE: SessionStoreType = (() => {
  const v = process.env.SESSION_STORE;
  if (v === 'redis') return 'redis';
  return 'sqlite';
})();
