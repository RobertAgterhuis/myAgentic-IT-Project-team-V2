// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Progress route handler — GET /api/progress.
 *
 * Thin HTTP wrapper over SessionService (M20-003).
 *
 * @module routes/progress
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import { SessionService, toServiceContext } from '../services';
import { json } from '../middleware';

function createProgressRoutes(ctx): Record<string, unknown> {
  const { _getLatestCommand } = ctx;

  const svc = new SessionService(toServiceContext(ctx));

  async function apiGetProgress(_req, res) {
    const command = _getLatestCommand();
    const session = svc.readSessionState();

    if (!session) {
      return json(res, 200, {
        active: false,
        phases: svc.buildEmptyPhases(),
        session: null,
        command,
      });
    }

    const sprints = session.sprint_backlog
      ? {
          total: session.sprint_backlog.total_sprints || 0,
          statuses: session.sprint_backlog.sprint_statuses || {},
        }
      : null;

    json(res, 200, {
      active: true,
      session: svc.buildSessionSummary(session),
      phases: svc.buildPhaseProgress(session),
      sprints,
      command,
    });
  }

  return {
    'GET /api/progress': apiGetProgress,
  };
}

export = createProgressRoutes;
