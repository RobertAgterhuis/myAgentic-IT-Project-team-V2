/**
 * Shared type definitions for the Agentic SDLC Platform.
 * These ambient declarations supplement JSDoc annotations in .js files
 * and resolve common TypeScript inference gaps.
 */

/* ── Store interface ─────────────────────────────────────────── */

interface StoreInterface {
  exists(filePath: string): boolean;
  readFile(filePath: string, encoding?: string): string;
  writeFile(filePath: string, data: string, encoding?: string): void;
  readdir(dirPath: string, options?: { withFileTypes?: boolean }): unknown[];
  mkdirp(dirPath: string): void;
  stat(filePath: string): import('fs').Stats;
  mtime(filePath: string): number;
}

/* ── Server context (ctx) ────────────────────────────────────── */

interface ServerContext {
  _cache: import('../cache').FileCache;
  _sseClients: Set<import('http').ServerResponse>;
  _metrics: RuntimeMetrics;
  _audit: { log(meta: AuditMeta): void; read(limit?: number): AuditEntry[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeWriteSync(filePath: string, data: string, encoding?: string, auditMeta?: AuditMeta): void;
  sseNotify(eventType: string, data: object): void;
  computePercentiles(times: number[]): { p50: number; p95: number; p99: number };
  recordMetric(method: string, pathname: string, durationMs: number, statusCode: number): void;
  scheduleRebuildIndex(): void;
  flushMetrics(): void;
  PROJECT_ROOT: string;
  BUSINESS_DOCS: string;
  GITHUB_DOCS: string;
  SESSION_DIR: string;
  SESSION_FILE: string;
  Q_INDEX_FILE: string;
  SESSION_AUDIT_FILE: string;
  resolveSessionFile(): string;
  DECISIONS_FILE: string;
  DECISIONS_DIR: string;
  COMMAND_QUEUE: string;
  HELP_DIR: string;
  ANALYTICS_FILE: string;
  METRICS_FILE: string;
  WEBAPP_DIR: string;
  _rebuildQuestionnaireIndex?: () => Promise<void>;
  _readCommandQueue?: () => unknown[];
  _getLatestCommand?: () => unknown;
}

/* ── Metrics ─────────────────────────────────────────────────── */

interface RuntimeMetrics {
  requestCount: number;
  errorCount: number;
  responseTimes: number[];
  fileOpsCount: number;
  startedAt: number;
  perEndpoint: Record<string, { count: number; times: number[] }>;
}

/* ── Audit ───────────────────────────────────────────────────── */

interface AuditMeta {
  operation: string;
  entityType: string;
  entityId: string | null;
  user: string;
  summary: string;
}

interface AuditEntry extends AuditMeta {
  timestamp: string;
}

/* ── Route handler ───────────────────────────────────────────── */

type RouteHandler = (
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse
) => void | Promise<void>;

type RouteMap = Record<string, RouteHandler>;

/* ── Error extensions ────────────────────────────────────────── */

interface AppError extends Error {
  status?: number;
  errorCode?: string;
  code?: string;
}

/* ── Milestone ───────────────────────────────────────────────── */

interface Milestone {
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stories?: Record<string, unknown>[];
  [key: string]: unknown;
}

/* ── Command entry ───────────────────────────────────────────── */

interface CommandEntry {
  command: string;
  text?: string;
  project?: string | null;
  description?: string | null;
  scope?: string | null;
  requested_at?: string;
  timestamp?: string;
  status: string;
  source?: string;
  brief_saved?: boolean;
}
