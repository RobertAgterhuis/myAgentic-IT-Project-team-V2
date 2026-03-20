// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Analytics API routes — GET /api/v1/analytics/*
 *
 * Endpoints:
 *   GET /api/v1/analytics/trends          — Time-series trend data (velocity, DORA)
 *   GET /api/v1/analytics/agents          — Agent performance statistics
 *   GET /api/v1/analytics/metrics         — Raw metric series listing
 *   GET /api/v1/analytics/metrics/:name   — Query specific metric series
 *
 * M7 / Issue #375
 *
 * @module routes/analytics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import path from 'path';
import { getStore } from '../store';
import { errorResponse } from '../utils/errors';
import * as RS from '../route-schemas';
import {
  deserializeMetricsStore,
  createMetricsStore,
  computeAgentStats,
  queryMetric,
  computeVelocityTrendEntry,
  computeStageLatencyStats,
  computeToolLatencyStats,
} from '../../../platform/sdlc/observability';
import type { MetricsStore, SprintMetrics } from '../../../platform/sdlc/observability';

const METRICS_STORE_REL = 'BusinessDocs/metrics/time-series-metrics.json';
const VELOCITY_LOG_REL = 'BusinessDocs/retrospectives/velocity-log.json';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const PROJECT_ROOT = ctx.PROJECT_ROOT;

  /** Load the time-series metrics store from disk. */
  function loadMetricsStore(): MetricsStore {
    const store = getStore();
    const filePath = path.join(PROJECT_ROOT, METRICS_STORE_REL);
    if (!store.exists(filePath)) return createMetricsStore();
    try {
      return deserializeMetricsStore(store.readFile(filePath));
    } catch {
      return createMetricsStore();
    }
  }

  /** Load sprint history from velocity-log.json for trend computation. */
  function loadSprintHistory(): SprintMetrics[] {
    const store = getStore();
    const filePath = path.join(PROJECT_ROOT, VELOCITY_LOG_REL);
    if (!store.exists(filePath)) return [];
    try {
      const raw = JSON.parse(store.readFile(filePath));
      const sprints = raw.sprints || [];
      return sprints.map((s: Record<string, unknown>) => ({
        sprint_id: (s.sprint_id as string) || '',
        started_at: (s.started_at as string) || (s.date as string) || '',
        ended_at: (s.ended_at as string) || (s.date as string) || '',
        planned_points: (s.planned_items as number) || (s.planned_points as number) || 0,
        completed_points: (s.completed_items as number) || (s.completed_points as number) || 0,
        tasks_completed: (s.tasks_completed as number) || (s.completed_items as number) || 0,
        tasks_carried_over: (s.tasks_carried_over as number) || (s.carried_over as number) || 0,
        defects_found: (s.defects_found as number) || 0,
        defects_fixed: (s.defects_fixed as number) || 0,
      }));
    } catch {
      return [];
    }
  }

  // ── GET /api/v1/analytics/trends ─────────────────────────

  app.get(
    '/api/v1/analytics/trends',
    { schema: { tags: ['analytics'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metricsStore = loadMetricsStore();
        const sprintHistory = loadSprintHistory();
        const velocityTrends = computeVelocityTrendEntry(sprintHistory);
        const doraLeadTime = queryMetric(metricsStore, 'dora_lead_time_hours');
        const doraDeployFreq = queryMetric(metricsStore, 'dora_deploy_frequency');
        const doraFailureRate = queryMetric(metricsStore, 'dora_change_failure_rate');
        const doraMttr = queryMetric(metricsStore, 'dora_mttr_hours');
        const sprintPlanned = queryMetric(metricsStore, 'sprint_planned_points');
        const sprintCompleted = queryMetric(metricsStore, 'sprint_completed_points');
        const sprintDefects = queryMetric(metricsStore, 'sprint_defects_found');
        const stageLatency = computeStageLatencyStats(metricsStore);
        const toolLatency = computeToolLatencyStats(metricsStore);

        return reply.send({
          ok: true,
          data: {
            velocity: velocityTrends,
            dora: {
              lead_time: doraLeadTime,
              deployment_frequency: doraDeployFreq,
              change_failure_rate: doraFailureRate,
              mttr: doraMttr,
            },
            sprints: {
              planned_points: sprintPlanned,
              completed_points: sprintCompleted,
              defects_found: sprintDefects,
            },
            performance: {
              stage_latency: stageLatency,
              tool_latency: toolLatency,
            },
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return reply
          .code(500)
          .send(
            errorResponse('TRENDS_ERROR', `Failed to compute trends: ${(err as Error).message}`)
          );
      }
    }
  );

  // ── GET /api/v1/analytics/agents ─────────────────────────

  app.get(
    '/api/v1/analytics/agents',
    { schema: { tags: ['analytics'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metricsStore = loadMetricsStore();
        const stats = computeAgentStats(metricsStore);
        return reply.send({
          ok: true,
          data: stats,
          count: stats.length,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return reply
          .code(500)
          .send(
            errorResponse(
              'AGENT_STATS_ERROR',
              `Failed to compute agent stats: ${(err as Error).message}`
            )
          );
      }
    }
  );

  // ── GET /api/v1/analytics/metrics ────────────────────────

  app.get(
    '/api/v1/analytics/metrics',
    { schema: { tags: ['analytics'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const metricsStore = loadMetricsStore();
        const metrics = Object.values(metricsStore.metrics).map((m) => ({
          name: m.name,
          unit: m.unit,
          data_points_count: m.data_points.length,
          latest: m.data_points.length > 0 ? m.data_points[m.data_points.length - 1] : null,
        }));
        return reply.send({
          ok: true,
          data: metrics,
          count: metrics.length,
          last_updated: metricsStore.last_updated,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return reply
          .code(500)
          .send(
            errorResponse('METRICS_LIST_ERROR', `Failed to list metrics: ${(err as Error).message}`)
          );
      }
    }
  );

  // ── GET /api/v1/analytics/metrics/:name ──────────────────

  app.get<{ Params: { name: string }; Querystring: { from?: string; to?: string } }>(
    '/api/v1/analytics/metrics/:name',
    { schema: RS.analyticsV1MetricQuery },
    async (request, reply: FastifyReply) => {
      const metricName = decodeURIComponent(request.params.name);
      if (!metricName) {
        return reply
          .code(400)
          .send(errorResponse('MISSING_METRIC_NAME', 'Metric name is required'));
      }
      try {
        const metricsStore = loadMetricsStore();
        const from = request.query.from || undefined;
        const to = request.query.to || undefined;
        const dataPoints = queryMetric(metricsStore, metricName, from, to);
        const metric = metricsStore.metrics[metricName];
        if (!metric) {
          return reply
            .code(404)
            .send(errorResponse('METRIC_NOT_FOUND', `Metric "${metricName}" not found`));
        }
        return reply.send({
          ok: true,
          data: {
            name: metric.name,
            unit: metric.unit,
            data_points: dataPoints,
            total_count: metric.data_points.length,
            filtered_count: dataPoints.length,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return reply
          .code(500)
          .send(
            errorResponse('METRIC_QUERY_ERROR', `Failed to query metric: ${(err as Error).message}`)
          );
      }
    }
  );
}
