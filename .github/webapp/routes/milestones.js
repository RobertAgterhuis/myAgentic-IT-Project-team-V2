// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Milestone management API routes.
 *
 * Endpoints:
 * - POST   /api/milestones
 * - GET    /api/milestones
 * - GET    /api/milestones/:id
 * - PUT    /api/milestones/:id          (SP-9.2 scaffold)
 * - PATCH  /api/milestones/:id/archive  (SP-9.3 scaffold)
 */

const path = require('path');
const { withFileLock } = require('../file-lock');
const { json, parseBody } = require('../middleware');
const { getStore } = require('../store');

const VALID_STATUSES = ['not started', 'in progress', 'complete', 'blocked'];

function getPaths(ctx) {
  const dataDir = path.join(ctx.PROJECT_ROOT, '.github', 'data');
  return {
    dataDir,
    milestonesFile: path.join(dataDir, 'milestones.json'),
  };
}

function normalizeMilestoneId(reqUrl, reqHost) {
  const pathname = new URL(reqUrl, `http://${reqHost}`).pathname;
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 3 ? parts[2] : '';
}

function generateMilestoneId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(16).slice(2, 8);
  return `milestone-${date}-${random}`;
}

function ensureMilestoneStore(paths) {
  const store = getStore();
  if (store.exists(paths.milestonesFile)) return;
  store.mkdirp(paths.dataDir);
  store.writeFile(paths.milestonesFile, JSON.stringify([], null, 2), 'utf8');
}

function readMilestones(paths, cache) {
  ensureMilestoneStore(paths);
  try {
    return JSON.parse(cache.read(paths.milestonesFile));
  } catch {
    return [];
  }
}

function validateName(name) {
  if (typeof name !== 'string') return 'name: required string field';
  if (name.trim().length === 0) return 'name: cannot be empty';
  if (name.length > 255) return 'name: maximum 255 characters';
  return null;
}

function validateStatus(status) {
  if (typeof status !== 'string') {
    return `status: must be one of ${VALID_STATUSES.join(', ')}`;
  }
  if (!VALID_STATUSES.includes(status.toLowerCase())) {
    return `status: must be one of ${VALID_STATUSES.join(', ')}`;
  }
  return null;
}

function validateProgress(progress) {
  if (typeof progress !== 'number') return 'progress: required number field';
  if (!Number.isInteger(progress)) return 'progress: must be an integer';
  if (progress < 0 || progress > 100) return 'progress: must be between 0 and 100';
  return null;
}

function validateCompletion(completion) {
  if (typeof completion !== 'string') return 'completion: required string field (ISO 8601 date)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completion)) {
    return 'completion: must be ISO 8601 format (YYYY-MM-DD)';
  }
  const parsed = new Date(`${completion}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'completion: invalid date';
  return null;
}

function validateMilestone(data) {
  const checks = [
    validateName(data && data.name),
    validateStatus(data && data.status),
    validateProgress(data && data.progress),
    validateCompletion(data && data.completion),
  ];
  const errors = checks.filter(Boolean);
  return { valid: errors.length === 0, errors };
}

function milestoneNameExists(milestones, name, excludeId) {
  const normalized = name.toLowerCase();
  return milestones.some((m) => m.id !== excludeId && m.name.toLowerCase() === normalized);
}

async function createMilestone(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const data = await parseBody(req);
    const validation = validateMilestone(data);
    if (!validation.valid) {
      return json(res, 400, { ok: false, error: 'Validation failed', details: validation.errors });
    }

    let createdMilestone = null;
    const normalizedStatus = data.status.toLowerCase();

    await withFileLock(paths.milestonesFile, () => {
      const milestones = readMilestones(paths, ctx._cache);
      if (milestoneNameExists(milestones, data.name, null)) {
        return json(res, 409, {
          ok: false,
          error: 'Milestone already exists',
          details: [`Milestone with name "${data.name}" already exists`],
        });
      }

      const now = new Date().toISOString();
      createdMilestone = {
        id: generateMilestoneId(),
        name: data.name,
        status: normalizedStatus,
        progress: data.progress,
        completion: data.completion,
        created_at: now,
        updated_at: now,
        archived: false,
      };

      milestones.push(createdMilestone);
      ctx.safeWriteSync(
        paths.milestonesFile,
        JSON.stringify(milestones, null, 2),
        'utf8',
        {
          operation: 'create',
          entityType: 'milestone',
          entityId: createdMilestone.id,
          user: 'webapp',
          summary: `Created milestone ${createdMilestone.id}`,
        }
      );
      return null;
    });

    if (!createdMilestone) return;

    return json(res, 201, {
      ok: true,
      data: createdMilestone,
      message: `Milestone "${createdMilestone.name}" created successfully`,
      timestamp: createdMilestone.created_at,
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, { ok: false, error: err.message });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to create milestone',
      details: err.message,
    });
  }
}

async function listMilestones(req, res, ctx) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const includeArchived = url.searchParams.get('include_archived') === 'true';
    const milestones = readMilestones(getPaths(ctx), ctx._cache);
    const filtered = includeArchived ? milestones : milestones.filter((m) => !m.archived);

    return json(res, 200, {
      ok: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: 'Failed to list milestones',
      details: err.message,
    });
  }
}

async function getMilestone(req, res, ctx) {
  try {
    const milestoneId = normalizeMilestoneId(req.url, req.headers.host);
    const milestones = readMilestones(getPaths(ctx), ctx._cache);
    const milestone = milestones.find((m) => m.id === milestoneId);

    if (!milestone) {
      return json(res, 404, {
        ok: false,
        error: 'Milestone not found',
        details: [`Milestone with ID "${milestoneId}" does not exist`],
      });
    }

    return json(res, 200, {
      ok: true,
      data: milestone,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: 'Failed to get milestone',
      details: err.message,
    });
  }
}

async function updateMilestone(_req, res, _ctx) {
  return json(res, 501, {
    ok: false,
    error: 'Not implemented',
    details: 'PUT /api/milestones/:id implemented in SP-9.2',
  });
}

async function archiveMilestone(_req, res, _ctx) {
  return json(res, 501, {
    ok: false,
    error: 'Not implemented',
    details: 'PATCH /api/milestones/:id/archive implemented in SP-9.3',
  });
}

module.exports = function milestonesRoutes(ctx) {
  return {
    'POST /api/milestones': (req, res) => createMilestone(req, res, ctx),
    'GET /api/milestones': (req, res) => listMilestones(req, res, ctx),
    'GET /api/milestones/:id': (req, res) => getMilestone(req, res, ctx),
    'PUT /api/milestones/:id': (req, res) => updateMilestone(req, res, ctx),
    'PATCH /api/milestones/:id/archive': (req, res) => archiveMilestone(req, res, ctx),
  };
};
