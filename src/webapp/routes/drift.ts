// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Drift detection route handler — GET /api/drift.
 *
 * Thin HTTP wrapper over SessionService (M20-003).
 *
 * @module routes/drift
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import { detectDrift } from '../drift-detector';
import { SessionService, toServiceContext } from '../services';
import { json } from '../middleware';

export = function createDriftRoutes(ctx): Record<string, unknown> {
  const svc = new SessionService(toServiceContext(ctx));

  function handleGetDrift(_req, res) {
    const report = svc.checkDrift(detectDrift);
    json(res, 200, report);
  }

  return {
    'GET /api/drift': handleGetDrift,
  };
};
