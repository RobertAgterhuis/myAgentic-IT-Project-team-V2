#!/usr/bin/env node
// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/* ── JSON Schema Validation (SP-R2-002-005) ───────────────────── *
 * Lightweight validators for key data structures. Each returns
 * { valid: boolean, errors: string[] }. Zero external deps.
 * ─────────────────────────────────────────────────────────────── */

function str(val, name, errors) {
  if (typeof val !== 'string') { errors.push(`${name} must be a string`); return false; }
  return true;
}
function opt(val, name, type, errors) {
  if (val === undefined || val === null) return true;
  if (typeof val !== type) { errors.push(`${name} must be a ${type} if present`); return false; }
  return true;
}

/* ── Session State ────────────────────────────────────────────── */

/**
 * Validate a session-state object for required fields and types.
 * @param {object} data - Parsed session state.
 * @returns {{ valid: boolean, errors: string[] }}
 */
// eslint-disable-next-line complexity
function validateSessionState(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['session-state must be an object'] };
  }
  str(data.session_id, 'session_id', errors);
  str(data.cycle_type, 'cycle_type', errors);
  str(data.status, 'status', errors);
  opt(data.current_phase, 'current_phase', 'string', errors);
  opt(data.current_agent, 'current_agent', 'string', errors);
  opt(data.initiated_at, 'initiated_at', 'string', errors);
  opt(data.last_updated, 'last_updated', 'string', errors);
  if (data.completed_phases !== undefined && !Array.isArray(data.completed_phases)) {
    errors.push('completed_phases must be an array');
  }
  if (data.completed_agents !== undefined && !Array.isArray(data.completed_agents)) {
    errors.push('completed_agents must be an array');
  }
  if (data.github_sync !== undefined) {
    if (typeof data.github_sync !== 'object' || Array.isArray(data.github_sync)) {
      errors.push('github_sync must be an object');
    } else {
      const gs = data.github_sync;
      opt(gs.last_synced, 'github_sync.last_synced', 'string', errors);
      if (gs.milestones_open !== undefined && typeof gs.milestones_open !== 'number') {
        errors.push('github_sync.milestones_open must be a number');
      }
      if (gs.milestones_closed !== undefined && typeof gs.milestones_closed !== 'number') {
        errors.push('github_sync.milestones_closed must be a number');
      }
      if (gs.issues_open !== undefined && typeof gs.issues_open !== 'number') {
        errors.push('github_sync.issues_open must be a number');
      }
      if (gs.issues_closed !== undefined && typeof gs.issues_closed !== 'number') {
        errors.push('github_sync.issues_closed must be a number');
      }
      if (gs.drift_findings !== undefined && !Array.isArray(gs.drift_findings)) {
        errors.push('github_sync.drift_findings must be an array');
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ── Command Queue Entry ──────────────────────────────────────── */

/**
 * Validate a single command queue entry.
 * @param {object} data - Parsed command entry.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCommandEntry(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['command entry must be an object'] };
  }
  str(data.command, 'command', errors);
  str(data.requested_at, 'requested_at', errors);
  if (!['PENDING', 'PROCESSING', 'DONE', 'ERROR'].includes(data.status)) {
    errors.push('status must be one of: PENDING, PROCESSING, DONE, ERROR');
  }
  opt(data.project, 'project', 'string', errors);
  opt(data.description, 'description', 'string', errors);
  opt(data.scope, 'scope', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Validate an entire command queue array.
 * @param {Array} data - Array of command entries.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCommandQueue(data) {
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['command queue must be an array'] };
  }
  const errors = [];
  for (let i = 0; i < data.length; i++) {
    const r = validateCommandEntry(data[i]);
    if (!r.valid) {
      for (const e of r.errors) errors.push(`[${i}]: ${e}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ── Analytics Event ───────────────────────────────────────────── */

const VALID_ANALYTICS_EVENTS = [
  'page_view', 'tab_switch', 'command_launch', 'questionnaire_save',
  'decision_update', 'error_displayed', 'feature_usage',
  'session_start', 'session_end',
];

/**
 * Validate a single analytics event.
 * @param {object} data - Event object.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAnalyticsEvent(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['event must be an object'] };
  }
  if (!VALID_ANALYTICS_EVENTS.includes(data.event)) {
    errors.push(`unknown event type: ${data.event}`);
  }
  if (data.properties !== undefined && (typeof data.properties !== 'object' || Array.isArray(data.properties))) {
    errors.push('properties must be a plain object if present');
  }
  opt(data.timestamp, 'timestamp', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Validate an analytics events array.
 * @param {Array} data - Array of event objects.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAnalyticsEventArray(data) {
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['events must be an array'] };
  }
  if (data.length === 0 || data.length > 100) {
    return { valid: false, errors: ['events must be 1–100 items'] };
  }
  const errors = [];
  for (let i = 0; i < data.length; i++) {
    const r = validateAnalyticsEvent(data[i]);
    if (!r.valid) {
      for (const e of r.errors) errors.push(`[${i}]: ${e}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ── Reevaluate Trigger ───────────────────────────────────────── */

const VALID_SCOPES = ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING'];

/**
 * Validate a reevaluate-trigger JSON payload.
 * @param {object} data - Trigger object.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateReevaluateTrigger(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['reevaluate trigger must be an object'] };
  }
  str(data.requested_at, 'requested_at', errors);
  if (!VALID_SCOPES.includes(data.scope)) {
    errors.push('scope must be one of: ALL, BUSINESS, TECH, UX, MARKETING');
  }
  str(data.source, 'source', errors);
  str(data.status, 'status', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Decision Create Input ────────────────────────────────────── */

const VALID_DECISION_TYPES     = ['DECIDED', 'OPEN_QUESTION', 'question', 'operational'];
const VALID_DECISION_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function hasDecisionCreateFields(data) {
  return data.type && data.priority && data.scope && data.text;
}

/**
 * Validate the input body for creating a decision.
 * @param {object} data - Create body.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDecisionCreate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['decision create body must be an object'] };
  }
  if (!hasDecisionCreateFields(data)) {
    return { valid: false, errors: ['Missing type, priority, scope, or text'] };
  }
  if (!VALID_DECISION_TYPES.includes(data.type)) {
    errors.push('Invalid type');
  }
  if (!VALID_DECISION_PRIORITIES.includes(data.priority)) {
    errors.push('Invalid priority');
  }
  opt(data.notes, 'notes', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Decision Mutation Input ──────────────────────────────────── */

const VALID_MUTATION_ACTIONS = ['answer', 'decide', 'defer', 'expire', 'activate', 'create', 'reopen', 'edit'];

/**
 * Validate a decision mutation body (structural check only).
 * Action enum validation is left to the handler dispatch.
 * @param {object} data - Mutation body.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDecisionMutation(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['decision mutation body must be an object'] };
  }
  str(data.action, 'action', errors);
  opt(data.id, 'id', 'string', errors);
  opt(data.answer, 'answer', 'string', errors);
  opt(data.reason, 'reason', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Questionnaire Update Entry ───────────────────────────────── */

/**
 * Validate a single questionnaire answer update entry.
 * @param {object} data - Update entry with questionId, status, answer.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateQuestionnaireUpdate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['questionnaire update must be an object'] };
  }
  str(data.questionId, 'questionId', errors);
  if (data.status !== undefined && !['OPEN', 'ANSWERED', 'DEFERRED'].includes(data.status)) {
    errors.push(`Invalid status: ${data.status}`);
  }
  opt(data.answer, 'answer', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Project Brief ────────────────────────────────────────────── */

/**
 * Validate project brief content before write.
 * @param {string} content - The brief markdown content.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateProjectBrief(content) {
  const errors = [];
  if (typeof content !== 'string') {
    return { valid: false, errors: ['project brief must be a string'] };
  }
  if (content.trim().length === 0) {
    errors.push('project brief must not be empty');
  }
  if (content.length > 50000) {
    errors.push('project brief exceeds 50 000 character limit');
  }
  return { valid: errors.length === 0, errors };
}

/* ── Drift Report (INFRA-02-C) ────────────────────────────────── */

const VALID_DRIFT_TYPES = [
  'SPRINT_STATUS_MISMATCH', 'MISSING_SYNC_REPORT',
  'STORY_STATUS_MISMATCH', 'ORPHANED_ISSUE', 'MISSING_ISSUE',
];
const VALID_SEVERITIES = ['CRITICAL', 'WARNING', 'INFO'];

/**
 * Validate a drift report object.
 * @param {object} data - Drift report to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
// eslint-disable-next-line complexity
function validateDriftReport(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['drift report must be an object'] };
  }
  str(data.generated_at, 'generated_at', errors);
  if (!data.summary || typeof data.summary !== 'object') {
    errors.push('summary must be an object');
  } else {
    for (const k of ['total_drifts', 'critical', 'warning', 'info']) {
      if (typeof data.summary[k] !== 'number') errors.push(`summary.${k} must be a number`);
    }
  }
  if (!Array.isArray(data.drifts)) {
    errors.push('drifts must be an array');
  } else {
    for (let i = 0; i < data.drifts.length; i++) {
      const d = data.drifts[i];
      if (!d || typeof d !== 'object') { errors.push(`drifts[${i}] must be an object`); continue; }
      str(d.id, `drifts[${i}].id`, errors);
      if (!VALID_DRIFT_TYPES.includes(d.type)) errors.push(`drifts[${i}].type is invalid: ${d.type}`);
      if (!VALID_SEVERITIES.includes(d.severity)) errors.push(`drifts[${i}].severity is invalid: ${d.severity}`);
      str(d.sprint, `drifts[${i}].sprint`, errors);
      str(d.expected, `drifts[${i}].expected`, errors);
      str(d.actual, `drifts[${i}].actual`, errors);
      str(d.recommendation, `drifts[${i}].recommendation`, errors);
    }
  }
  if (!data.in_sync || typeof data.in_sync !== 'object') {
    errors.push('in_sync must be an object');
  } else {
    if (!Array.isArray(data.in_sync.sprints)) errors.push('in_sync.sprints must be an array');
    if (typeof data.in_sync.stories !== 'number') errors.push('in_sync.stories must be a number');
  }
  return { valid: errors.length === 0, errors };
}

/* ── GitHub State Snapshot ────────────────────────────────────── */

// eslint-disable-next-line complexity
function validateGithubSnapshot(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['snapshot must be an object'] };
  }
  str(data.repo, 'repo', errors);
  str(data.captured_at, 'captured_at', errors);
  if (!data.summary || typeof data.summary !== 'object') {
    errors.push('summary must be an object');
  } else {
    for (const k of ['milestones_open', 'milestones_closed', 'issues_open', 'issues_closed']) {
      if (typeof data.summary[k] !== 'number') errors.push(`summary.${k} must be a number`);
    }
  }
  if (!Array.isArray(data.milestones)) errors.push('milestones must be an array');
  if (!Array.isArray(data.issues)) errors.push('issues must be an array');
  return { valid: errors.length === 0, errors };
}

/* ── Exports ──────────────────────────────────────────────────── */

module.exports = {
  validateSessionState,
  validateCommandEntry,
  validateCommandQueue,
  validateAnalyticsEvent,
  validateAnalyticsEventArray,
  validateReevaluateTrigger,
  validateDecisionCreate,
  validateDecisionMutation,
  validateQuestionnaireUpdate,
  validateProjectBrief,
  validateDriftReport,
  validateGithubSnapshot,
  VALID_ANALYTICS_EVENTS,
  VALID_MUTATION_ACTIONS,
  VALID_DRIFT_TYPES,
  VALID_SEVERITIES,
};
