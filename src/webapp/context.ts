// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Typed server context for the Fastify application (M30-002).
 *
 * Replaces the untyped `Record<string, unknown>` context object with a
 * properly typed interface. Decorated onto every Fastify request via
 * `fastify.decorateRequest()`.
 *
 * @module context
 */

import type { FileCache } from './cache';
import type { SSEManager } from './sse-manager';
import type { ServerMetrics } from './metrics-collector';
import type { AuthManager } from './auth';

/** Shape returned by createAuthMiddleware(). */
export interface AuthMiddleware {
  authenticate(
    req: import('http').IncomingMessage & { user?: unknown; session?: unknown },
    res: import('http').ServerResponse,
    pathname: string
  ): Promise<boolean>;
  requireRole(
    req: import('http').IncomingMessage & { user?: unknown; session?: unknown },
    res: import('http').ServerResponse,
    requiredRole: 'admin' | 'operator' | 'viewer',
    pathname?: string
  ): boolean;
  isPublicPath(pathname: string): boolean;
}
import type { StorageProvider } from '../../platform/engine/persistence';
import type { StorageProviderType } from './config';

/* ── Audit interface (subset exposed to routes) ───────────────── */

export interface AuditFacade {
  log(meta: {
    operation: string;
    entityType: string;
    entityId: string | null;
    user: string;
    summary: string;
  }): void;
  read(limit?: number): object[];
}

/* ── Typed Server Context ─────────────────────────────────────── */

export interface ServerContext {
  /* ── Infrastructure ────────────────────────────────────────── */
  readonly _cache: FileCache;
  readonly sseManager: SSEManager;
  readonly _metrics: ServerMetrics;
  readonly _audit: AuditFacade;

  /* ── Write helpers ─────────────────────────────────────────── */
  safeWriteSync(
    filePath: string,
    data: string,
    encoding?: BufferEncoding,
    auditMeta?: {
      operation?: string;
      entityType?: string;
      entityId?: string | null;
      user?: string;
      summary?: string;
    }
  ): void;
  /** Non-blocking async write — preferred for production request paths (M4/Epic-663). */
  safeWriteAsync(
    filePath: string,
    data: string,
    encoding?: BufferEncoding,
    auditMeta?: {
      operation?: string;
      entityType?: string;
      entityId?: string | null;
      user?: string;
      summary?: string;
    }
  ): Promise<void>;
  sseNotify(eventType: string, data: Record<string, unknown>): void;

  /* ── Metrics helpers ───────────────────────────────────────── */
  computePercentiles(times: number[]): { p50: number; p95: number; p99: number };
  recordMetric(method: string, pathname: string, durationMs: number, statusCode: number): void;
  scheduleRebuildIndex(): void;
  flushMetrics(): void;

  /* ── Path constants ────────────────────────────────────────── */
  readonly PROJECT_ROOT: string;
  readonly BUSINESS_DOCS: string;
  readonly GITHUB_DOCS: string;
  readonly SESSION_DIR: string;
  readonly SESSION_FILE: string;
  readonly Q_INDEX_FILE: string;
  readonly SESSION_AUDIT_FILE: string;
  readonly DECISIONS_FILE: string;
  readonly DECISIONS_DIR: string;
  readonly COMMAND_QUEUE: string;
  readonly HELP_DIR: string;
  readonly ANALYTICS_FILE: string;
  readonly METRICS_FILE: string;
  readonly WEBAPP_DIR: string;
  readonly HOST: string;
  readonly PORT: number;
  readonly SSE_HEARTBEAT_MS: number;
  readonly ANALYTICS_MAX_EVENTS: number;

  /* ── Session ───────────────────────────────────────────────── */
  resolveSessionFile(): string;

  /* ── Storage (M23-005) ─────────────────────────────────────── */
  getStorageProvider(): StorageProvider | null;
  readonly STORAGE_PROVIDER: StorageProviderType;

  /* ── Auth (M29) ────────────────────────────────────────────── */
  readonly _authManager: AuthManager | null;
  readonly _authMiddleware: AuthMiddleware | null;

  /* ── Cross-route wiring (set after route registration) ─────── */
  _rebuildQuestionnaireIndex?: () => Promise<void>;
  _readCommandQueue?: () => unknown[];
  _getLatestCommand?: () => unknown;
  _getEngine?: () => unknown;
}

/* ── Legacy adapter: typed context → Record<string, unknown> ── */

/**
 * Convert a typed ServerContext to the legacy untyped `ctx` for backward
 * compatibility during incremental migration. Route modules that still
 * use `(ctx: Record<string, unknown>)` can consume this.
 */
export function toLegacyCtx(ctx: ServerContext): Record<string, unknown> {
  return ctx as unknown as Record<string, unknown>;
}
