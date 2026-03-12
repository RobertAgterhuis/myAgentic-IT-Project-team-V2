// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';
/* global describe, it, expect */
const {
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
  VALID_ANALYTICS_EVENTS,
} = require('./schemas');

/* ── Story #17: JSON schema validation (SP-R2-002-005) ──────── */

describe('validateSessionState', () => {
  const valid = {
    session_id: 'sess-001',
    cycle_type: 'CREATE',
    status: 'IN_PROGRESS',
    current_phase: 'Phase 2',
    completed_phases: ['Phase 1'],
    completed_agents: ['BA'],
  };

  it('accepts a valid session state', () => {
    const r = validateSessionState(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    expect(validateSessionState(null).valid).toBe(false);
    expect(validateSessionState('str').valid).toBe(false);
    expect(validateSessionState([]).valid).toBe(false);
  });

  it('requires session_id, cycle_type, status', () => {
    const r = validateSessionState({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('session_id must be a string');
    expect(r.errors).toContain('cycle_type must be a string');
    expect(r.errors).toContain('status must be a string');
  });

  it('validates optional fields type', () => {
    const r = validateSessionState({ ...valid, current_phase: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('current_phase must be a string if present');
  });

  it('validates completed_phases is array', () => {
    const r = validateSessionState({ ...valid, completed_phases: 'not-array' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('completed_phases must be an array');
  });
});

describe('validateCommandEntry', () => {
  const valid = {
    command: 'CREATE TECH',
    requested_at: '2026-03-07T10:00:00Z',
    status: 'PENDING',
  };

  it('accepts a valid command entry', () => {
    const r = validateCommandEntry(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects invalid status', () => {
    const r = validateCommandEntry({ ...valid, status: 'UNKNOWN' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/status must be one of/);
  });

  it('requires command and requested_at', () => {
    const r = validateCommandEntry({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('command must be a string');
    expect(r.errors).toContain('requested_at must be a string');
  });
});

describe('validateCommandQueue', () => {
  it('accepts a valid array', () => {
    const r = validateCommandQueue([
      { command: 'CREATE', requested_at: '2026-01-01T00:00:00Z', status: 'DONE' },
    ]);
    expect(r.valid).toBe(true);
  });

  it('rejects non-array', () => {
    const r = validateCommandQueue({});
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/must be an array/);
  });

  it('reports per-entry errors with index', () => {
    const r = validateCommandQueue([{ command: 'X', requested_at: 'now', status: 'BAD' }]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/^\[0\]/);
  });
});

/* ── Story TECH-03: Schema validators for all data stores (SP-3) ── */

describe('validateAnalyticsEvent', () => {
  const valid = { event: 'page_view', properties: { page: '/home' } };

  it('accepts a valid analytics event', () => {
    const r = validateAnalyticsEvent(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('accepts all known event types', () => {
    for (const event of VALID_ANALYTICS_EVENTS) {
      expect(validateAnalyticsEvent({ event }).valid).toBe(true);
    }
  });

  it('rejects non-object input', () => {
    expect(validateAnalyticsEvent(null).valid).toBe(false);
    expect(validateAnalyticsEvent('str').valid).toBe(false);
    expect(validateAnalyticsEvent([]).valid).toBe(false);
  });

  it('rejects unknown event type', () => {
    const r = validateAnalyticsEvent({ event: 'unknown_event' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/unknown event type/);
  });

  it('rejects non-object properties', () => {
    const r = validateAnalyticsEvent({ event: 'page_view', properties: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/properties must be a plain object/);
  });

  it('rejects array properties', () => {
    const r = validateAnalyticsEvent({ event: 'page_view', properties: [] });
    expect(r.valid).toBe(false);
  });

  it('validates optional timestamp type', () => {
    const r = validateAnalyticsEvent({ event: 'page_view', timestamp: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/timestamp/);
  });
});

describe('validateAnalyticsEventArray', () => {
  it('accepts a valid array of events', () => {
    const r = validateAnalyticsEventArray([{ event: 'page_view' }, { event: 'tab_switch' }]);
    expect(r.valid).toBe(true);
  });

  it('rejects non-array', () => {
    expect(validateAnalyticsEventArray({}).valid).toBe(false);
  });

  it('rejects empty array', () => {
    const r = validateAnalyticsEventArray([]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/1–100/);
  });

  it('reports per-entry errors with index', () => {
    const r = validateAnalyticsEventArray([{ event: 'bad' }]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/^\[0\]/);
  });
});

describe('validateReevaluateTrigger', () => {
  const valid = {
    requested_at: '2026-01-01T00:00:00Z',
    scope: 'ALL',
    source: 'questionnaire-webapp',
    status: 'PENDING',
  };

  it('accepts a valid trigger', () => {
    const r = validateReevaluateTrigger(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateReevaluateTrigger(null).valid).toBe(false);
    expect(validateReevaluateTrigger('str').valid).toBe(false);
  });

  it('requires all fields', () => {
    const r = validateReevaluateTrigger({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('requested_at must be a string');
    expect(r.errors).toContain('source must be a string');
    expect(r.errors).toContain('status must be a string');
  });

  it('validates scope enum', () => {
    const r = validateReevaluateTrigger({ ...valid, scope: 'INVALID' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/scope must be one of/);
  });

  it('accepts all valid scopes', () => {
    for (const scope of ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING']) {
      expect(validateReevaluateTrigger({ ...valid, scope }).valid).toBe(true);
    }
  });
});

describe('validateDecisionCreate', () => {
  const valid = { type: 'DECIDED', priority: 'HIGH', scope: 'TECH', text: 'Use Node.js' };

  it('accepts a valid create body', () => {
    const r = validateDecisionCreate(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateDecisionCreate(null).valid).toBe(false);
    expect(validateDecisionCreate([]).valid).toBe(false);
  });

  it('requires type, priority, scope, text', () => {
    const r = validateDecisionCreate({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Missing type, priority, scope, or text');
  });

  it('validates type enum', () => {
    const r = validateDecisionCreate({ ...valid, type: 'BAD' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringMatching(/Invalid type/));
  });

  it('validates priority enum', () => {
    const r = validateDecisionCreate({ ...valid, priority: 'CRITICAL' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContainEqual(expect.stringMatching(/Invalid priority/));
  });

  it('accepts MCP decision types', () => {
    expect(validateDecisionCreate({ ...valid, type: 'question' }).valid).toBe(true);
    expect(validateDecisionCreate({ ...valid, type: 'operational' }).valid).toBe(true);
  });

  it('validates optional notes type', () => {
    const r = validateDecisionCreate({ ...valid, notes: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('notes must be a string if present');
  });
});

describe('validateDecisionMutation', () => {
  const valid = { action: 'answer', id: 'DEC-Q-001', answer: 'Yes' };

  it('accepts a valid mutation body', () => {
    const r = validateDecisionMutation(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateDecisionMutation(null).valid).toBe(false);
  });

  it('requires action', () => {
    const r = validateDecisionMutation({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('action must be a string');
  });

  it('validates action type', () => {
    const r = validateDecisionMutation({ action: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/action must be a string/);
  });

  it('accepts all valid actions', () => {
    for (const action of [
      'answer',
      'decide',
      'defer',
      'expire',
      'activate',
      'create',
      'reopen',
      'edit',
    ]) {
      expect(validateDecisionMutation({ action }).valid).toBe(true);
    }
  });

  it('validates optional field types', () => {
    const r = validateDecisionMutation({ action: 'answer', id: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('id must be a string if present');
  });
});

describe('validateQuestionnaireUpdate', () => {
  const valid = { questionId: 'Q-001', status: 'ANSWERED', answer: 'Yes' };

  it('accepts a valid update', () => {
    const r = validateQuestionnaireUpdate(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateQuestionnaireUpdate(null).valid).toBe(false);
    expect(validateQuestionnaireUpdate('str').valid).toBe(false);
  });

  it('requires questionId', () => {
    const r = validateQuestionnaireUpdate({});
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('questionId must be a string');
  });

  it('validates status enum', () => {
    const r = validateQuestionnaireUpdate({ questionId: 'Q-001', status: 'BAD' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/Invalid status/);
  });

  it('accepts all valid statuses', () => {
    for (const status of ['OPEN', 'ANSWERED', 'DEFERRED']) {
      expect(validateQuestionnaireUpdate({ questionId: 'Q-001', status }).valid).toBe(true);
    }
  });

  it('validates optional answer type', () => {
    const r = validateQuestionnaireUpdate({ questionId: 'Q-001', answer: 123 });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('answer must be a string if present');
  });
});

describe('validateProjectBrief', () => {
  it('accepts a valid brief', () => {
    const r = validateProjectBrief('# My Project\n\nDescription here');
    expect(r.valid).toBe(true);
  });

  it('rejects non-string input', () => {
    expect(validateProjectBrief(null).valid).toBe(false);
    expect(validateProjectBrief(123).valid).toBe(false);
    expect(validateProjectBrief({}).valid).toBe(false);
  });

  it('rejects empty string', () => {
    const r = validateProjectBrief('');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/must not be empty/);
  });

  it('rejects whitespace-only string', () => {
    const r = validateProjectBrief('   \n  ');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/must not be empty/);
  });

  it('rejects content exceeding 50000 chars', () => {
    const r = validateProjectBrief('x'.repeat(50001));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/50.*000/);
  });

  it('accepts content at exactly 50000 chars', () => {
    expect(validateProjectBrief('x'.repeat(50000)).valid).toBe(true);
  });
});
