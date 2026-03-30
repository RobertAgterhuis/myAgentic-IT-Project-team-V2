// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * M3 Task Assembly API Routes
 *
 * Exposes endpoints for task-aware agent team assembly.
 *
 * Endpoints:
 *   POST /api/m3/assemble-team          — Assemble an agent team for a task
 *   GET  /api/m3/team-configs           — List pre-built team configurations
 *   GET  /api/m3/team-configs/:id       — Get a specific team configuration
 *   POST /api/m3/validate-task          — Validate a task definition (dry-run)
 *
 * @module routes/task-assembly
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import {
  assembleTeam,
  validateTaskDefinition,
  listTeamConfigurations,
  getTeamConfiguration,
  type TaskDefinition,
} from '../../../platform/engine/task-assembly';

export async function registerRoutes(app: FastifyInstance, _ctx: ServerContext): Promise<void> {
  /**
   * POST /api/m3/assemble-team
   * Assemble an agent team for the provided task definition.
   *
   * Body: TaskDefinition
   * Response: AssembledTeam
   */
  app.post<{ Body: TaskDefinition }>('/api/m3/assemble-team', async (request, reply) => {
    const task = request.body;

    const { valid, errors } = validateTaskDefinition(task);
    if (!valid) {
      return reply.status(400).send({
        ok: false,
        error: 'Invalid task definition',
        details: errors,
      });
    }

    try {
      const team = assembleTeam(task);
      return reply.status(200).send({ ok: true, team });
    } catch (err) {
      app.log.error({ err }, 'assembleTeam failed');
      return reply.status(500).send({ ok: false, error: 'Team assembly failed' });
    }
  });

  /**
   * GET /api/m3/team-configs
   * List all pre-built team configurations.
   */
  app.get('/api/m3/team-configs', async (_request, reply) => {
    const configs = listTeamConfigurations();
    return reply.send({ ok: true, configs, total: configs.length });
  });

  /**
   * GET /api/m3/team-configs/:id
   * Get a specific pre-built configuration by id or commandMode.
   */
  app.get<{ Params: { id: string } }>('/api/m3/team-configs/:id', async (request, reply) => {
    const config = getTeamConfiguration(request.params.id);
    if (!config) {
      return reply.status(404).send({
        ok: false,
        error: `Team configuration "${request.params.id}" not found`,
      });
    }
    return reply.send({ ok: true, config });
  });

  /**
   * POST /api/m3/validate-task
   * Validate a task definition without assembling a team.
   *
   * Body: TaskDefinition (partial is allowed)
   * Response: { ok, valid, errors }
   */
  app.post('/api/m3/validate-task', async (request, reply) => {
    const { valid, errors } = validateTaskDefinition(request.body);
    return reply.send({ ok: true, valid, errors });
  });
}
