// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Per-endpoint metrics collector with periodic flushing.
 * @module metrics-collector
 */

export interface MetricsCollectorOptions {
  /** Interval for auto-flushing metrics to disk (default: 60000). */
  flushIntervalMs?: number;
  /** File path for persisting metrics. */
  outputPath: string;
  /** Maximum response-time samples to keep per endpoint (default: 1000). */
  maxSamples?: number;
  /** Store adapter: mkdirp + writeFile + readFile + exists. */
  store: {
    mkdirp(dir: string): void;
    writeFile(path: string, data: string): void;
    readFile(path: string): string;
    exists(path: string): boolean;
  };
  /** Optional structured logger. */
  log?: (level: string, event: string, meta?: Record<string, unknown>) => void;
}

export interface EndpointMetric {
  count: number;
  times: number[];
}

export interface ServerMetrics {
  requestCount: number;
  errorCount: number;
  responseTimes: number[];
  fileOpsCount: number;
  startedAt: number;
  perEndpoint: Record<string, EndpointMetric>;
}

export interface MetricsCollector {
  /** Record a request metric. */
  record(method: string, endpoint: string, durationMs: number, statusCode: number): void;
  /** Flush current metrics to disk. */
  flush(): void;
  /** Get a readonly snapshot of current metrics. */
  getSnapshot(): Readonly<ServerMetrics>;
  /** Increment the file-ops counter. */
  incrementFileOps(): void;
  /** Compute percentiles from an array of durations. */
  computePercentiles(times: number[]): { p50: number; p95: number; p99: number };
  /** Reload metrics from disk into the live state object. */
  load(): void;
  /** Stop the auto-flush timer. */
  destroy(): void;
  /** Live mutable reference to internal metrics state (for backward-compat wiring). */
  readonly _state: ServerMetrics;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function createMetricsCollector(options: MetricsCollectorOptions): MetricsCollector {
  const maxSamples = options.maxSamples ?? 1000;
  const flushIntervalMs = options.flushIntervalMs ?? 60_000;
  const { outputPath, store } = options;
  const log = options.log ?? (() => {});

  const metrics: ServerMetrics = {
    requestCount: 0,
    errorCount: 0,
    responseTimes: [],
    fileOpsCount: 0,
    startedAt: Date.now(),
    perEndpoint: {},
  };

  function loadFromDisk(): void {
    try {
      if (store.exists(outputPath)) {
        const raw = store.readFile(outputPath);
        const saved = JSON.parse(raw);
        if (typeof saved.requestCount === 'number') metrics.requestCount = saved.requestCount;
        if (typeof saved.errorCount === 'number') metrics.errorCount = saved.errorCount;
        if (typeof saved.fileOpsCount === 'number') metrics.fileOpsCount = saved.fileOpsCount;
        if (saved?.perEndpoint && typeof saved.perEndpoint === 'object') {
          for (const [key, val] of Object.entries(
            saved.perEndpoint as Record<string, Record<string, unknown>>
          )) {
            if (val && typeof val.count === 'number') {
              const times = Array.isArray(val.times) ? val.times.slice(-maxSamples) : [];
              metrics.perEndpoint[key] = { count: val.count, times };
            }
          }
        }
        log('info', 'metrics_loaded', { file: outputPath, requestCount: metrics.requestCount });
      }
    } catch (err: unknown) {
      log('warn', 'metrics_load_failed', { error: (err as Error).message });
    }
  }

  // Restore from disk on creation
  loadFromDisk();

  function record(method: string, endpoint: string, durationMs: number, statusCode: number): void {
    metrics.requestCount++;
    if (statusCode >= 400) metrics.errorCount++;
    metrics.responseTimes.push(durationMs);
    if (metrics.responseTimes.length > maxSamples) metrics.responseTimes.shift();
    const key = `${method} ${endpoint}`;
    if (!metrics.perEndpoint[key]) metrics.perEndpoint[key] = { count: 0, times: [] };
    const ep = metrics.perEndpoint[key];
    ep.count++;
    ep.times.push(durationMs);
    if (ep.times.length > maxSamples) ep.times.shift();
  }

  function flush(): void {
    try {
      const dir = outputPath.replace(/[/\\][^/\\]+$/, '');
      store.mkdirp(dir);
      const endpointSnapshot: Record<string, EndpointMetric> = {};
      for (const [key, val] of Object.entries(metrics.perEndpoint)) {
        endpointSnapshot[key] = { count: val.count, times: val.times.slice(-maxSamples) };
      }
      const snapshot = {
        flushed_at: new Date().toISOString(),
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        fileOpsCount: metrics.fileOpsCount,
        responseTimes: metrics.responseTimes.slice(-maxSamples),
        perEndpoint: endpointSnapshot,
      };
      store.writeFile(outputPath, JSON.stringify(snapshot, null, 2));
      log('debug', 'metrics_flushed', { file: outputPath });
    } catch (err: unknown) {
      log('warn', 'metrics_flush_failed', { error: (err as Error).message });
    }
  }

  function getSnapshot(): Readonly<ServerMetrics> {
    return { ...metrics };
  }

  function incrementFileOps(): void {
    metrics.fileOpsCount++;
  }

  function computePercentiles(times: number[]): { p50: number; p95: number; p99: number } {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  }

  // Auto-flush timer
  const flushTimer = setInterval(flush, flushIntervalMs);
  flushTimer.unref();

  function destroy(): void {
    clearInterval(flushTimer);
  }

  return {
    record,
    flush,
    getSnapshot,
    incrementFileOps,
    computePercentiles,
    destroy,
    load: loadFromDisk,
    _state: metrics,
  };
}
