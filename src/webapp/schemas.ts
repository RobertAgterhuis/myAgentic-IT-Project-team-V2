// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── JSON Schema Validation (SP-R2-002-005) ───────────────────── *
 * Lightweight validators for key data structures. Each returns
 * { valid: boolean, errors: string[] }. Zero external deps.
 * ─────────────────────────────────────────────────────────────── */

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function str(val: unknown, name: string, errors: string[]): boolean {
  if (typeof val !== 'string') {
    errors.push(`${name} must be a string`);
    return false;
  }
  return true;
}
function opt(val: unknown, name: string, type: string, errors: string[]): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val !== type) {
    errors.push(`${name} must be a ${type} if present`);
    return false;
  }
  return true;
}

/* ── Session State ────────────────────────────────────────────── */

/**
 * Validate a session-state object for required fields and types.
 */

export function validateSessionState(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['session-state must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.session_id, 'session_id', errors);
  str(d.cycle_type, 'cycle_type', errors);
  str(d.status, 'status', errors);
  opt(d.current_phase, 'current_phase', 'string', errors);
  opt(d.current_agent, 'current_agent', 'string', errors);
  opt(d.initiated_at, 'initiated_at', 'string', errors);
  opt(d.last_updated, 'last_updated', 'string', errors);
  if (d.completed_phases !== undefined && !Array.isArray(d.completed_phases)) {
    errors.push('completed_phases must be an array');
  }
  if (d.completed_agents !== undefined && !Array.isArray(d.completed_agents)) {
    errors.push('completed_agents must be an array');
  }
  if (d.github_sync !== undefined) {
    if (typeof d.github_sync !== 'object' || Array.isArray(d.github_sync)) {
      errors.push('github_sync must be an object');
    } else {
      const gs = d.github_sync as Record<string, unknown>;
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
 */
export function validateCommandEntry(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['command entry must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.command, 'command', errors);
  str(d.requested_at, 'requested_at', errors);
  if (!['PENDING', 'PROCESSING', 'DONE', 'ERROR'].includes(d.status as string)) {
    errors.push('status must be one of: PENDING, PROCESSING, DONE, ERROR');
  }
  opt(d.project, 'project', 'string', errors);
  opt(d.description, 'description', 'string', errors);
  opt(d.scope, 'scope', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Validate an entire command queue array.
 */
export function validateCommandQueue(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['command queue must be an array'] };
  }
  const errors: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const r = validateCommandEntry(data[i]);
    if (!r.valid) {
      for (const e of r.errors) errors.push(`[${i}]: ${e}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ── Analytics Event ───────────────────────────────────────────── */

export const VALID_ANALYTICS_EVENTS: string[] = [
  'page_view',
  'tab_switch',
  'command_launch',
  'questionnaire_save',
  'decision_update',
  'error_displayed',
  'feature_usage',
  'session_start',
  'session_end',
];

/**
 * Validate a single analytics event.
 */
export function validateAnalyticsEvent(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['event must be an object'] };
  }
  const d = data as Record<string, unknown>;
  if (!VALID_ANALYTICS_EVENTS.includes(d.event as string)) {
    errors.push(`unknown event type: ${d.event}`);
  }
  if (
    d.properties !== undefined &&
    (typeof d.properties !== 'object' || Array.isArray(d.properties))
  ) {
    errors.push('properties must be a plain object if present');
  }
  opt(d.timestamp, 'timestamp', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Validate an analytics events array.
 */
export function validateAnalyticsEventArray(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['events must be an array'] };
  }
  if (data.length === 0 || data.length > 100) {
    return { valid: false, errors: ['events must be 1–100 items'] };
  }
  const errors: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const r = validateAnalyticsEvent(data[i]);
    if (!r.valid) {
      for (const e of r.errors) errors.push(`[${i}]: ${e}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ── Reevaluate Trigger ───────────────────────────────────────── */

const VALID_SCOPES: string[] = ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING'];

/**
 * Validate a reevaluate-trigger JSON payload.
 */
export function validateReevaluateTrigger(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['reevaluate trigger must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.requested_at, 'requested_at', errors);
  if (!VALID_SCOPES.includes(d.scope as string)) {
    errors.push('scope must be one of: ALL, BUSINESS, TECH, UX, MARKETING');
  }
  str(d.source, 'source', errors);
  str(d.status, 'status', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Decision Create Input ────────────────────────────────────── */

const VALID_DECISION_TYPES: string[] = ['DECIDED', 'OPEN_QUESTION', 'question', 'operational'];
const VALID_DECISION_PRIORITIES: string[] = ['HIGH', 'MEDIUM', 'LOW'];

function hasDecisionCreateFields(data: Record<string, unknown>): boolean {
  return !!(data.type && data.priority && data.scope && data.text);
}

/**
 * Validate the input body for creating a decision.
 */
export function validateDecisionCreate(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['decision create body must be an object'] };
  }
  const d = data as Record<string, unknown>;
  if (!hasDecisionCreateFields(d)) {
    return { valid: false, errors: ['Missing type, priority, scope, or text'] };
  }
  if (!VALID_DECISION_TYPES.includes(d.type as string)) {
    errors.push('Invalid type');
  }
  if (!VALID_DECISION_PRIORITIES.includes(d.priority as string)) {
    errors.push('Invalid priority');
  }
  opt(d.notes, 'notes', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Decision Mutation Input ──────────────────────────────────── */

export const VALID_MUTATION_ACTIONS: string[] = [
  'answer',
  'decide',
  'defer',
  'expire',
  'activate',
  'create',
  'reopen',
  'edit',
  'promote-lesson',
];

/**
 * Validate a decision mutation body (structural check only).
 * Action enum validation is left to the handler dispatch.
 */
export function validateDecisionMutation(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['decision mutation body must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.action, 'action', errors);
  opt(d.id, 'id', 'string', errors);
  opt(d.answer, 'answer', 'string', errors);
  opt(d.reason, 'reason', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Questionnaire Update Entry ───────────────────────────────── */

/**
 * Validate a single questionnaire answer update entry.
 */
export function validateQuestionnaireUpdate(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['questionnaire update must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.questionId, 'questionId', errors);
  if (d.status !== undefined && !['OPEN', 'ANSWERED', 'DEFERRED'].includes(d.status as string)) {
    errors.push(`Invalid status: ${d.status}`);
  }
  opt(d.answer, 'answer', 'string', errors);
  return { valid: errors.length === 0, errors };
}

/* ── Project Brief ────────────────────────────────────────────── */

/**
 * Validate project brief content before write.
 */
export function validateProjectBrief(content: unknown): ValidationResult {
  const errors: string[] = [];
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

export const VALID_DRIFT_TYPES: string[] = [
  'SPRINT_STATUS_MISMATCH',
  'MISSING_SYNC_REPORT',
  'STORY_STATUS_MISMATCH',
  'ORPHANED_ISSUE',
  'MISSING_ISSUE',
];
export const VALID_SEVERITIES: string[] = ['CRITICAL', 'WARNING', 'INFO'];

/**
 * Validate a drift report object.
 */

export function validateDriftReport(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['drift report must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.generated_at, 'generated_at', errors);
  if (!d.summary || typeof d.summary !== 'object') {
    errors.push('summary must be an object');
  } else {
    const summary = d.summary as Record<string, unknown>;
    for (const k of ['total_drifts', 'critical', 'warning', 'info']) {
      if (typeof summary[k] !== 'number') errors.push(`summary.${k} must be a number`);
    }
  }
  if (!Array.isArray(d.drifts)) {
    errors.push('drifts must be an array');
  } else {
    for (let i = 0; i < d.drifts.length; i++) {
      const drift = d.drifts[i] as Record<string, unknown> | null;
      if (!drift || typeof drift !== 'object') {
        errors.push(`drifts[${i}] must be an object`);
        continue;
      }
      str(drift.id, `drifts[${i}].id`, errors);
      if (!VALID_DRIFT_TYPES.includes(drift.type as string))
        errors.push(`drifts[${i}].type is invalid: ${drift.type}`);
      if (!VALID_SEVERITIES.includes(drift.severity as string))
        errors.push(`drifts[${i}].severity is invalid: ${drift.severity}`);
      str(drift.sprint, `drifts[${i}].sprint`, errors);
      str(drift.expected, `drifts[${i}].expected`, errors);
      str(drift.actual, `drifts[${i}].actual`, errors);
      str(drift.recommendation, `drifts[${i}].recommendation`, errors);
    }
  }
  if (!d.in_sync || typeof d.in_sync !== 'object') {
    errors.push('in_sync must be an object');
  } else {
    const inSync = d.in_sync as Record<string, unknown>;
    if (!Array.isArray(inSync.sprints)) errors.push('in_sync.sprints must be an array');
    if (typeof inSync.stories !== 'number') errors.push('in_sync.stories must be a number');
  }
  return { valid: errors.length === 0, errors };
}

/* ── GitHub State Snapshot ────────────────────────────────────── */

export function validateGithubSnapshot(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['snapshot must be an object'] };
  }
  const d = data as Record<string, unknown>;
  str(d.repo, 'repo', errors);
  str(d.captured_at, 'captured_at', errors);
  if (!d.summary || typeof d.summary !== 'object') {
    errors.push('summary must be an object');
  } else {
    const summary = d.summary as Record<string, unknown>;
    for (const k of ['milestones_open', 'milestones_closed', 'issues_open', 'issues_closed']) {
      if (typeof summary[k] !== 'number') errors.push(`summary.${k} must be a number`);
    }
  }
  if (!Array.isArray(d.milestones)) errors.push('milestones must be an array');
  if (!Array.isArray(d.issues)) errors.push('issues must be an array');
  return { valid: errors.length === 0, errors };
}
