// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Drift detection route handler — GET /api/drift.
 * Compares session-state sprint statuses against GitHub sync reports
 * to detect discrepancies between orchestrator state and board state.
 *
 * @module routes/drift
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const path = require('path');
const fs = require('fs');
const { detectDrift } = require('../drift-detector');
const { json } = require('../middleware');

module.exports = function createDriftRoutes(ctx) {
  const { SESSION_FILE, resolveSessionFile, PROJECT_ROOT, BUSINESS_DOCS } = ctx;

  const SPRINTS_DIR = path.join(BUSINESS_DOCS, 'sprints');
  const PHASE5_DIR = path.join(BUSINESS_DOCS, 'phase-5');

  /**
   * Read session-state.json safely.
   * @returns {object|null}
   */
  function readSessionState() {
    try {
      const sessionFile =
        typeof resolveSessionFile === 'function' ? resolveSessionFile() : SESSION_FILE;
      if (!sessionFile || !fs.existsSync(sessionFile)) return null;
      return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    } catch {
      return null;
    }
  }

  /**
   * Read the sprint plan content.
   * @param {object} sessionState - Parsed session state.
   * @returns {string|null}
   */
  function readSprintPlan(sessionState) {
    const planPath =
      sessionState && sessionState.sprint_backlog && sessionState.sprint_backlog.path;
    if (!planPath) return null;
    const abs = path.resolve(PROJECT_ROOT, planPath);
    try {
      return fs.readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
  }

  /**
   * Discover and read all available GitHub sync reports.
   * Searches both BusinessDocs/sprints/SP-N/ and BusinessDocs/phase-5/sprint-SP-N/ directories.
   * @param {object} sprintStatuses - Map of sprint ID → status.
   * @returns {Record<string, string|null>}
   */
  function readSyncReports(sprintStatuses) {
    const reports = {};
    for (const sprintId of Object.keys(sprintStatuses)) {
      reports[sprintId] = null;

      // Try: BusinessDocs/sprints/SP-N/github-sync-report.md
      const path1 = path.join(SPRINTS_DIR, sprintId, 'github-sync-report.md');
      if (fs.existsSync(path1)) {
        try {
          reports[sprintId] = fs.readFileSync(path1, 'utf8');
          continue;
        } catch {
          /* fall through */
        }
      }

      // Try: BusinessDocs/phase-5/sprint-SP-N/github-sync-report.md
      const path2 = path.join(PHASE5_DIR, `sprint-${sprintId}`, 'github-sync-report.md');
      if (fs.existsSync(path2)) {
        try {
          reports[sprintId] = fs.readFileSync(path2, 'utf8');
        } catch {
          /* ignore */
        }
      }
    }
    return reports;
  }

  /* ── GET /api/drift ─────────────────────────────────────────── */

  function handleGetDrift(_req, res) {
    const sessionState = readSessionState();
    if (!sessionState) {
      return json(res, 200, {
        generated_at: new Date().toISOString(),
        summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
        drifts: [],
        in_sync: { sprints: [], stories: 0 },
        error: 'No session state found',
      });
    }

    const sprintPlanContent = readSprintPlan(sessionState);
    const sprintStatuses =
      (sessionState.sprint_backlog && sessionState.sprint_backlog.sprint_statuses) || {};
    const syncReports = readSyncReports(sprintStatuses);

    const report = detectDrift({ sessionState, sprintPlanContent, syncReports });
    json(res, 200, report);
  }

  return {
    'GET /api/drift': handleGetDrift,
  };
};
