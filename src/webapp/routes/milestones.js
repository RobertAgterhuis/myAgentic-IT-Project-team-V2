// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Milestone management API routes.
 *
 * Endpoints:
 * - POST   /api/milestones
 * - GET    /api/milestones
 * - GET    /api/milestones/:id
 * - PUT    /api/milestones/:id          (SP-9.2)
 * - PATCH  /api/milestones/:id/archive  (SP-9.3)
 * - POST   /api/milestone-templates     (SP-9.9)
 * - GET    /api/milestone-templates     (SP-9.9)
 * - DELETE /api/milestone-templates/:id (SP-9.9)
 * - POST   /api/milestone-templates/:id/apply (SP-9.9)
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
    templatesFile: path.join(dataDir, 'milestone-templates.json'),
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

function createRouteError(status, error, details) {
  return { status, error, details };
}

function validateOptionalField(data, field, validator) {
  if (data[field] === undefined) return null;
  const fieldError = validator(data[field]);
  if (fieldError) {
    throw createRouteError(400, 'Validation failed', [fieldError]);
  }
  return true;
}

function collectMilestoneUpdates(data, milestones, milestoneId) {
  const updatedFields = {};

  if (validateOptionalField(data, 'name', validateName)) {
    if (milestoneNameExists(milestones, data.name, milestoneId)) {
      throw createRouteError(409, 'Milestone already exists', [
        `Milestone with name "${data.name}" already exists`,
      ]);
    }
    updatedFields.name = data.name;
  }

  if (validateOptionalField(data, 'status', validateStatus)) {
    updatedFields.status = data.status.toLowerCase();
  }

  if (validateOptionalField(data, 'progress', validateProgress)) {
    updatedFields.progress = data.progress;
  }

  if (validateOptionalField(data, 'completion', validateCompletion)) {
    updatedFields.completion = data.completion;
  }

  return updatedFields;
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
      ctx.safeWriteSync(paths.milestonesFile, JSON.stringify(milestones, null, 2), 'utf8', {
        operation: 'create',
        entityType: 'milestone',
        entityId: createdMilestone.id,
        user: 'webapp',
        summary: `Created milestone ${createdMilestone.id}`,
      });
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

async function updateMilestone(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const milestoneId = normalizeMilestoneId(req.url, req.headers.host);
    const data = await parseBody(req);

    let updatedMilestone = null;
    await withFileLock(paths.milestonesFile, () => {
      const milestones = readMilestones(paths, ctx._cache);
      const index = milestones.findIndex((m) => m.id === milestoneId);

      if (index === -1) {
        throw createRouteError(404, 'Milestone not found', [
          `Milestone with ID "${milestoneId}" does not exist`,
        ]);
      }

      const milestone = milestones[index];
      const updatedFields = collectMilestoneUpdates(data, milestones, milestoneId);

      // Merge updates into milestone (preserve id and created_at)
      updatedMilestone = {
        ...milestone,
        ...updatedFields,
        updated_at: new Date().toISOString(),
      };

      milestones[index] = updatedMilestone;

      ctx.safeWriteSync(paths.milestonesFile, JSON.stringify(milestones, null, 2), 'utf8', {
        operation: 'update',
        entityType: 'milestone',
        entityId: milestoneId,
        user: 'webapp',
        summary: `Updated milestone ${milestoneId}`,
      });

      return null;
    });

    if (!updatedMilestone) return;

    return json(res, 200, {
      ok: true,
      data: updatedMilestone,
      message: `Milestone "${updatedMilestone.name}" updated successfully`,
      timestamp: updatedMilestone.updated_at,
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, {
        ok: false,
        error: err.error || err.message,
        details: err.details,
      });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to update milestone',
      details: err.message,
    });
  }
}

async function archiveMilestone(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const milestoneId = normalizeMilestoneId(req.url, req.headers.host);

    let archivedMilestone = null;
    await withFileLock(paths.milestonesFile, () => {
      const milestones = readMilestones(paths, ctx._cache);
      const index = milestones.findIndex((m) => m.id === milestoneId);

      if (index === -1) {
        return json(res, 404, {
          ok: false,
          error: 'Milestone not found',
          details: [`Milestone with ID "${milestoneId}" does not exist`],
        });
      }

      const milestone = milestones[index];

      // Mark as archived
      archivedMilestone = {
        ...milestone,
        archived: true,
        updated_at: new Date().toISOString(),
      };

      milestones[index] = archivedMilestone;

      ctx.safeWriteSync(paths.milestonesFile, JSON.stringify(milestones, null, 2), 'utf8', {
        operation: 'archive',
        entityType: 'milestone',
        entityId: milestoneId,
        user: 'webapp',
        summary: `Archived milestone ${milestoneId}`,
      });

      return null;
    });

    if (!archivedMilestone) return;

    return json(res, 200, {
      ok: true,
      data: archivedMilestone,
      message: `Milestone "${archivedMilestone.name}" archived successfully`,
      timestamp: archivedMilestone.updated_at,
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, { ok: false, error: err.message });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to archive milestone',
      details: err.message,
    });
  }
}

// ============================================================================
// TEMPLATE MANAGEMENT (SP-9.9)
// ============================================================================

function ensureTemplateStore(paths) {
  const store = getStore();
  if (store.exists(paths.templatesFile)) return;
  store.mkdirp(paths.dataDir);
  store.writeFile(paths.templatesFile, JSON.stringify([], null, 2), 'utf8');
}

function readTemplates(paths, cache) {
  ensureTemplateStore(paths);
  try {
    return JSON.parse(cache.read(paths.templatesFile));
  } catch {
    return [];
  }
}

function generateTemplateId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(16).slice(2, 8);
  return `template-${date}-${random}`;
}

function validateTemplateName(name) {
  if (typeof name !== 'string') return 'name: required string field';
  if (name.trim().length === 0) return 'name: cannot be empty';
  if (name.length > 100) return 'name: maximum 100 characters';
  return null;
}

function validateTemplate(data) {
  const checks = [
    validateTemplateName(data && data.name),
    validateStatus(data && data.defaultStatus),
    validateProgress(data && data.defaultProgress),
  ];
  const errors = checks.filter(Boolean);
  return { valid: errors.length === 0, errors };
}

async function createTemplate(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const data = await parseBody(req);
    const validation = validateTemplate(data);
    if (!validation.valid) {
      return json(res, 400, { ok: false, error: 'Validation failed', details: validation.errors });
    }

    let createdTemplate = null;
    const normalizedStatus = data.defaultStatus.toLowerCase();

    await withFileLock(paths.templatesFile, () => {
      const templates = readTemplates(paths, ctx._cache);

      // Check for duplicate template name
      const existingTemplate = templates.find(
        (t) => t.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingTemplate) {
        return json(res, 409, {
          ok: false,
          error: 'Template already exists',
          details: [`Template with name "${data.name}" already exists`],
        });
      }

      const now = new Date().toISOString();
      createdTemplate = {
        id: generateTemplateId(),
        name: data.name,
        namePattern: data.namePattern || data.name,
        defaultStatus: normalizedStatus,
        defaultProgress: data.defaultProgress,
        created_at: now,
        updated_at: now,
      };

      templates.push(createdTemplate);
      ctx.safeWriteSync(paths.templatesFile, JSON.stringify(templates, null, 2), 'utf8', {
        operation: 'create',
        entityType: 'milestone-template',
        entityId: createdTemplate.id,
        user: 'webapp',
        summary: `Created milestone template ${createdTemplate.id}`,
      });
      return null;
    });

    if (!createdTemplate) return;

    return json(res, 201, {
      ok: true,
      data: createdTemplate,
      message: `Template "${createdTemplate.name}" created successfully`,
      timestamp: createdTemplate.created_at,
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, { ok: false, error: err.message });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to create template',
      details: err.message,
    });
  }
}

async function listTemplates(req, res, ctx) {
  try {
    const templates = readTemplates(getPaths(ctx), ctx._cache);

    return json(res, 200, {
      ok: true,
      data: templates,
      count: templates.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: 'Failed to list templates',
      details: err.message,
    });
  }
}

async function deleteTemplate(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const templateId = normalizeMilestoneId(req.url, req.headers.host);

    let deletedTemplate = null;
    await withFileLock(paths.templatesFile, () => {
      const templates = readTemplates(paths, ctx._cache);
      const index = templates.findIndex((t) => t.id === templateId);

      if (index === -1) {
        return json(res, 404, {
          ok: false,
          error: 'Template not found',
          details: [`Template with ID "${templateId}" does not exist`],
        });
      }

      deletedTemplate = templates[index];
      templates.splice(index, 1);

      ctx.safeWriteSync(paths.templatesFile, JSON.stringify(templates, null, 2), 'utf8', {
        operation: 'delete',
        entityType: 'milestone-template',
        entityId: templateId,
        user: 'webapp',
        summary: `Deleted milestone template ${templateId}`,
      });

      return null;
    });

    if (!deletedTemplate) return;

    return json(res, 200, {
      ok: true,
      message: `Template "${deletedTemplate.name}" deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, { ok: false, error: err.message });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to delete template',
      details: err.message,
    });
  }
}

async function applyTemplate(req, res, ctx) {
  const paths = getPaths(ctx);

  try {
    const templateId = normalizeMilestoneId(req.url, req.headers.host);
    const data = await parseBody(req);

    // Read template
    const templates = readTemplates(paths, ctx._cache);
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      return json(res, 404, {
        ok: false,
        error: 'Template not found',
        details: [`Template with ID "${templateId}" does not exist`],
      });
    }

    // Apply template to create milestone
    const milestoneName = data.name || template.namePattern;
    const completion = data.completion;

    // Validate completion date if provided
    if (!completion) {
      return json(res, 400, {
        ok: false,
        error: 'Validation failed',
        details: ['completion: required field when applying template'],
      });
    }

    const completionError = validateCompletion(completion);
    if (completionError) {
      return json(res, 400, {
        ok: false,
        error: 'Validation failed',
        details: [completionError],
      });
    }

    let createdMilestone = null;
    await withFileLock(paths.milestonesFile, () => {
      const milestones = readMilestones(paths, ctx._cache);
      if (milestoneNameExists(milestones, milestoneName, null)) {
        return json(res, 409, {
          ok: false,
          error: 'Milestone already exists',
          details: [`Milestone with name "${milestoneName}" already exists`],
        });
      }

      const now = new Date().toISOString();
      createdMilestone = {
        id: generateMilestoneId(),
        name: milestoneName,
        status: template.defaultStatus,
        progress: template.defaultProgress,
        completion: completion,
        created_at: now,
        updated_at: now,
        archived: false,
        template_id: templateId,
      };

      milestones.push(createdMilestone);
      ctx.safeWriteSync(paths.milestonesFile, JSON.stringify(milestones, null, 2), 'utf8', {
        operation: 'create',
        entityType: 'milestone',
        entityId: createdMilestone.id,
        user: 'webapp',
        summary: `Created milestone ${createdMilestone.id} from template ${templateId}`,
      });
      return null;
    });

    if (!createdMilestone) return;

    return json(res, 201, {
      ok: true,
      data: createdMilestone,
      message: `Milestone "${createdMilestone.name}" created from template "${template.name}"`,
      timestamp: createdMilestone.created_at,
    });
  } catch (err) {
    if (err && err.status) {
      return json(res, err.status, {
        ok: false,
        error: err.error || err.message,
        details: err.details,
      });
    }
    return json(res, 500, {
      ok: false,
      error: 'Failed to apply template',
      details: err.message,
    });
  }
}

module.exports = function milestonesRoutes(ctx) {
  return {
    'POST /api/milestones': (req, res) => createMilestone(req, res, ctx),
    'GET /api/milestones': (req, res) => listMilestones(req, res, ctx),
    'GET /api/milestones/:id': (req, res) => getMilestone(req, res, ctx),
    'PUT /api/milestones/:id': (req, res) => updateMilestone(req, res, ctx),
    'PATCH /api/milestones/:id/archive': (req, res) => archiveMilestone(req, res, ctx),
    'POST /api/milestone-templates': (req, res) => createTemplate(req, res, ctx),
    'GET /api/milestone-templates': (req, res) => listTemplates(req, res, ctx),
    'DELETE /api/milestone-templates/:id': (req, res) => deleteTemplate(req, res, ctx),
    'POST /api/milestone-templates/:id/apply': (req, res) => applyTemplate(req, res, ctx),
  };
};
