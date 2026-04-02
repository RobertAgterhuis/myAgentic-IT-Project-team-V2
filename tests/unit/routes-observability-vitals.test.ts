// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerObservabilityRoutes } from '../../src/webapp/routes/misc-observability';

function createMetricsState() {
  return {
    startedAt: Date.now() - 5_000,
    requestCount: 0,
    errorCount: 0,
    responseTimes: [],
    fileOpsCount: 0,
    perEndpoint: {},
  };
}

describe('registerObservabilityRoutes web vitals ingestion', () => {
  let app: FastifyInstance;
  let projectRoot: string;
  let businessDocs: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'observability-routes-'));
    businessDocs = path.join(projectRoot, 'BusinessDocs');
    fs.mkdirSync(path.join(businessDocs, 'metrics'), { recursive: true });

    app = Fastify({ logger: false });
    registerObservabilityRoutes({
      app,
      sseManager: {
        size: 0,
        addClient() {},
      },
      metrics: createMetricsState(),
      cache: {
        stats: () => ({ hits: 0, misses: 0 }),
      },
      computePercentiles: (times: number[]) => ({
        p50: times[0] || 0,
        p95: times[0] || 0,
        p99: times[0] || 0,
      }),
      flushMetrics() {},
      projectRoot,
      businessDocs,
      safeWriteSync(filePath, data, encoding) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, data, encoding || 'utf8');
      },
    });
  });

  afterEach(async () => {
    await app.close();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('persists accepted vitals samples and exposes them on /api/metrics', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/v1/metrics/vitals',
      payload: {
        name: 'LCP',
        value: 2140,
        rating: 'good',
        id: 'lcp-1',
        navigationType: 'navigate',
      },
    });

    expect(postRes.statusCode).toBe(202);

    const persistedPath = path.join(businessDocs, 'metrics', 'web-vitals.json');
    const persisted = JSON.parse(fs.readFileSync(persistedPath, 'utf8')) as {
      total_samples: number;
      metrics: {
        LCP: {
          count: number;
          p75: number;
          latest_value: number;
        };
      };
      samples: Array<{ name: string; id: string }>;
    };

    expect(persisted.total_samples).toBe(1);
    expect(persisted.metrics.LCP.count).toBe(1);
    expect(persisted.metrics.LCP.p75).toBe(2140);
    expect(persisted.metrics.LCP.latest_value).toBe(2140);
    expect(persisted.samples).toEqual([
      expect.objectContaining({
        name: 'LCP',
        id: 'lcp-1',
      }),
    ]);

    const getRes = await app.inject({ method: 'GET', url: '/api/metrics' });
    expect(getRes.statusCode).toBe(200);

    const metrics = getRes.json() as {
      web_vitals: {
        total_samples: number;
        metrics: {
          LCP: {
            count: number;
            p75: number;
            latest_value: number;
          };
        };
      };
    };

    expect(metrics.web_vitals.total_samples).toBe(1);
    expect(metrics.web_vitals.metrics.LCP.count).toBe(1);
    expect(metrics.web_vitals.metrics.LCP.p75).toBe(2140);
    expect(metrics.web_vitals.metrics.LCP.latest_value).toBe(2140);
  });

  it('rejects invalid vitals payloads', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/metrics/vitals',
      payload: {
        name: 'TTFB',
        value: 'fast',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        error: 'Invalid web vitals payload',
        message: 'Invalid web vitals payload',
      })
    );
  });
});
