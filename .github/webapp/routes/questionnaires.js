// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Questionnaire route handlers — GET /api/questionnaires, POST /api/save.
 * @module routes/questionnaires
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const path = require('path');
const { getStore } = require('../store');
const schemas = require('../schemas');
const models = require('../models');
const { withFileLock } = require('../file-lock');
const { attachSecretWarnings } = require('../utils/secret-utils');
const { errorResponse } = require('../utils/errors');
const { VALIDATION: V } = require('../strings');
const {
  structuredLog,
  json,
  parseBody,
  assertString,
  safePath,
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
} = require('../middleware');

module.exports = function createQuestionnaireRoutes(ctx) {
  const {
    _cache,
    safeWriteSync,
    sseNotify,
    scheduleRebuildIndex,
    BUSINESS_DOCS,
    PROJECT_ROOT,
    Q_INDEX_FILE,
  } = ctx;

  function discoverQuestionnaires() {
    const store = getStore();
    if (!store.exists(BUSINESS_DOCS)) return [];
    const results = [];
    (function walk(dir, depth) {
      if (depth > 20) return;
      let entries;
      try {
        entries = store.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        try {
          if (entry.isDirectory()) walk(full, depth + 1);
          else if (entry.isFile() && entry.name.endsWith('-questionnaire.md')) results.push(full);
        } catch {
          /* skip inaccessible entry */
        }
      }
    })(BUSINESS_DOCS, 0);
    return results.sort();
  }

  async function rebuildQuestionnaireIndex() {
    const files = discoverQuestionnaires();
    if (files.length === 0) return;

    await withFileLock(Q_INDEX_FILE, async () => {
      const rows = [];
      for (const f of files) {
        let content;
        try {
          content = _cache.read(f);
        } catch {
          continue;
        }
        const p = models.parseQuestionnaire(content, f, BUSINESS_DOCS);
        const total = p.questions.length;
        const answered = p.questions.filter((q) => q.status === 'ANSWERED').length;
        const status =
          total === 0
            ? 'OPEN'
            : answered === total
              ? 'COMPLETE'
              : answered > 0
                ? 'PARTIAL'
                : 'OPEN';
        rows.push(`| ${p.file} | ${p.phase} | ${p.agent} | ${total} | ${answered} | ${status} |`);
      }

      const md = [
        '# Questionnaire Index',
        `> Last updated: ${models.isoNow()}`,
        '',
        '| File | Phase | Agent | Questions | Answered | Status |',
        '|------|-------|-------|-----------|----------|--------|',
        ...rows,
        '',
      ].join('\n');

      safeWriteSync(Q_INDEX_FILE, md);
    });
  }

  // Expose for ctx.scheduleRebuildIndex wiring
  ctx._rebuildQuestionnaireIndex = rebuildQuestionnaireIndex;

  async function apiGetQuestionnaires(_req, res) {
    const files = discoverQuestionnaires();
    const questionnaires = [];
    const corruptionWarnings = [];
    for (const f of files) {
      let content;
      try {
        content = _cache.read(f);
      } catch {
        continue;
      }
      const issues = models.detectMarkdownCorruption(content);
      if (issues.length > 0) {
        const relative = path.relative(PROJECT_ROOT, f).replace(/\\/g, '/');
        structuredLog('warn', 'markdown_corruption', { file: relative, issues });
        corruptionWarnings.push({ file: relative, issues });
      }
      questionnaires.push(models.parseQuestionnaire(content, f, BUSINESS_DOCS));
    }
    const response = { questionnaires };
    if (corruptionWarnings.length > 0) response.corruptionWarnings = corruptionWarnings;
    json(res, 200, response);
  }

  function validateSaveUpdates(updates) {
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > 200)
      return V.UPDATES_RANGE;
    for (const u of updates) {
      const r = schemas.validateQuestionnaireUpdate(u);
      if (!r.valid) return r.errors[0];
      if (!models.Q_ID_RE.test(u.questionId)) return V.invalidQID(u.questionId);
    }
    return null;
  }

  function sanitizeSaveUpdates(updates) {
    for (const u of updates) {
      if (u.answer) u.answer = sanitizeMarkdown(sanitizeQID(u.answer));
    }
  }

  function detectSaveSecrets(updates) {
    const warnings = [];
    for (const u of updates) {
      if (u.answer) warnings.push(...detectSecrets(u.answer));
    }
    const unique = [...new Set(warnings)];
    if (unique.length > 0) structuredLog('warn', 'secret_pattern_in_save', { patterns: unique });
    return unique;
  }

  async function apiSave(req, res) {
    const body = await parseBody(req);
    assertString(body.file, 'file', 500);
    const validationError = validateSaveUpdates(body.updates);
    if (validationError) return json(res, 400, errorResponse('VALIDATION_ERROR', validationError));

    const filePath = safePath(BUSINESS_DOCS, body.file);
    if (!getStore().exists(filePath))
      return json(res, 404, errorResponse('FILE_NOT_FOUND', 'File not found'));

    sanitizeSaveUpdates(body.updates);

    await withFileLock(filePath, () => {
      let content = getStore().readFile(filePath);
      for (const u of body.updates)
        content = models.updateAnswerInContent(content, u.questionId, u.answer, u.status);
      safeWriteSync(filePath, content, undefined, {
        operation: 'update',
        entityType: 'questionnaire',
        entityId: body.updates.map((u) => u.questionId).join(','),
        user: 'webapp',
        summary: `Updated ${body.updates.length} answer(s) in ${body.file}`,
      });
    });

    const uniqueWarnings = detectSaveSecrets(body.updates);
    scheduleRebuildIndex();
    sseNotify('questionnaire_save', { file: body.file, count: body.updates.length });
    const response = { ok: true, saved: body.updates.length };
    attachSecretWarnings(response, uniqueWarnings);
    json(res, 200, response);
  }

  return {
    'GET /api/questionnaires': apiGetQuestionnaires,
    'POST /api/save': apiSave,
  };
};
