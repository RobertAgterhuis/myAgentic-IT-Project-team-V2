// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const {
  detectDrift,
  parseStoryIssueMap,
  parseSprintStoryAssignments,
  parseSyncReport,
  SEVERITY,
  DRIFT_TYPE,
} = require('../../src/webapp/drift-detector');

const { validateDriftReport } = require('../../src/webapp/schemas');

/* ── Fixtures ─────────────────────────────────────────────────── */

const SPRINT_PLAN = `
# Sprint Plan

## Story Point Estimates (All Stories)

| Story ID | Title | Type | SP | Priority | GitHub Issue | Reevaluation Status |
|----------|-------|------|-----|----------|-------------|---------------------|
| TECH-01 | File locking | CODE | 8 | P0 | #2 | UNCHANGED |
| TECH-02 | Server decomposition | CODE | 13 | P1 | #3 | UNCHANGED |
| BIZ-01 | Product roadmap | ANALYSIS | 3 | P1 | #15 | UNCHANGED |
| UX-01 | ARIA landmarks | CODE | 3 | P1 | #9 | UNCHANGED |
| NOISSUE-01 | Some story | CODE | 2 | P2 | | UNCHANGED |

## Sprint 1 — Critical Data Integrity

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-01 | File locking | CODE | Dev | ... | 8 | NONE | NONE |
| BIZ-01 | Product roadmap | ANALYSIS | Dev | ... | 3 | NONE | NONE |

## Sprint 2 — Execution Foundation

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| TECH-02 | Server decomposition | CODE | Dev | ... | 13 | NONE | NONE |

## Sprint 3 — Accessibility

### Stories

| Story ID | Title | Type | Team | Acceptance Criteria | SP | Dependencies | Blocker |
|----------|-------|------|------|---------------------|-----|--------------|---------|
| UX-01 | ARIA landmarks | CODE | Dev | ... | 3 | NONE | NONE |
`;

const SYNC_REPORT_SP1_OK = `
# GitHub Sync Report — SP-1

## Updated Issues

| Story ID | Issue # | Action |
|----------|---------|--------|
| TECH-01 | #2 | Closed (IMPLEMENTED) |
| BIZ-01 | #15 | Closed (IMPLEMENTED) |

## Issues Not Updated (not in SP-1 scope)

| Issue # | Story ID | Reason |
|---------|----------|--------|
| #3 | TECH-02 | In SP-2 |
`;

const SYNC_REPORT_SP1_WITH_OPEN = `
# GitHub Sync Report — SP-1

## Updated Issues

| Story ID | Issue # | Action |
|----------|---------|--------|
| TECH-01 | #2 | Closed (IMPLEMENTED) |

## Issues Still Open

| Issue # | Story ID | Reason |
|---------|----------|--------|
| #15 | BIZ-01 | Not yet complete |
`;

const SYNC_REPORT_SP2_CLOSE_ACTION = `
# GitHub Sync Report — SP-2

## Actions Performed

| Action | Issue | Title | Result |
|--------|-------|-------|--------|
| CLOSE | #3 | TECH-02: Server decomposition | Closed |
`;

/* ── parseStoryIssueMap ───────────────────────────────────────── */

describe('parseStoryIssueMap', () => {
  it('extracts story-to-issue mappings from sprint plan', () => {
    const result = parseStoryIssueMap(SPRINT_PLAN);
    expect(result.length).toBeGreaterThanOrEqual(4);
    const tech01 = result.find((r) => r.storyId === 'TECH-01');
    expect(tech01).toBeDefined();
    expect(tech01.issueNumber).toBe(2);
    expect(tech01.title).toBe('File locking');
  });

  it('returns null issueNumber for stories without issue', () => {
    const result = parseStoryIssueMap(SPRINT_PLAN);
    const noIssue = result.find((r) => r.storyId === 'NOISSUE-01');
    expect(noIssue).toBeDefined();
    expect(noIssue.issueNumber).toBeNull();
  });

  it('returns empty array for non-string input', () => {
    expect(parseStoryIssueMap(null)).toEqual([]);
    expect(parseStoryIssueMap(42)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseStoryIssueMap('')).toEqual([]);
  });
});

/* ── parseSprintStoryAssignments ──────────────────────────────── */

describe('parseSprintStoryAssignments', () => {
  it('maps sprint IDs to assigned story IDs', () => {
    const result = parseSprintStoryAssignments(SPRINT_PLAN);
    expect(result['SP-1']).toContain('TECH-01');
    expect(result['SP-1']).toContain('BIZ-01');
    expect(result['SP-2']).toContain('TECH-02');
    expect(result['SP-3']).toContain('UX-01');
  });

  it('returns empty object for non-string input', () => {
    expect(parseSprintStoryAssignments(null)).toEqual({});
    expect(parseSprintStoryAssignments(undefined)).toEqual({});
  });
});

/* ── parseSyncReport ──────────────────────────────────────────── */

describe('parseSyncReport', () => {
  it('extracts closed issues from story-first format', () => {
    const result = parseSyncReport(SYNC_REPORT_SP1_OK);
    expect(result.closed.length).toBeGreaterThanOrEqual(2);
    expect(result.closed.some((c) => c.issueNumber === 2)).toBe(true);
    expect(result.closed.some((c) => c.issueNumber === 15)).toBe(true);
  });

  it('extracts open issues from sync report', () => {
    const result = parseSyncReport(SYNC_REPORT_SP1_WITH_OPEN);
    expect(result.open.length).toBeGreaterThanOrEqual(1);
    expect(result.open.some((o) => o.issueNumber === 15)).toBe(true);
  });

  it('extracts CLOSE action rows', () => {
    const result = parseSyncReport(SYNC_REPORT_SP2_CLOSE_ACTION);
    expect(result.closed.some((c) => c.issueNumber === 3)).toBe(true);
  });

  it('returns empty arrays for non-string input', () => {
    expect(parseSyncReport(null)).toEqual({ closed: [], open: [] });
    expect(parseSyncReport(42)).toEqual({ closed: [], open: [] });
  });
});

/* ── detectDrift ──────────────────────────────────────────────── */

describe('detectDrift', () => {
  it('returns empty report for missing session state', () => {
    const result = detectDrift({ sessionState: null, sprintPlanContent: '', syncReports: {} });
    expect(result.summary.total_drifts).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('detects no drift when all sprints are in sync', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_OK,
      'SP-2': SYNC_REPORT_SP2_CLOSE_ACTION,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const critical = result.drifts.filter((d) => d.severity === SEVERITY.CRITICAL);
    expect(critical.length).toBe(0);
  });

  it('detects MISSING_SYNC_REPORT for completed sprint without report', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_OK,
      'SP-2': null,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const missing = result.drifts.filter((d) => d.type === DRIFT_TYPE.MISSING_SYNC_REPORT);
    expect(missing.length).toBe(1);
    expect(missing[0].sprint).toBe('SP-2');
    expect(missing[0].severity).toBe(SEVERITY.WARNING);
  });

  it('detects STORY_STATUS_MISMATCH when sprint is DONE but issue is open', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_WITH_OPEN,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const mismatch = result.drifts.filter((d) => d.type === DRIFT_TYPE.STORY_STATUS_MISMATCH);
    expect(mismatch.length).toBeGreaterThanOrEqual(1);
    expect(mismatch[0].severity).toBe(SEVERITY.CRITICAL);
    expect(mismatch[0].issue_number).toBe(15);
    expect(mismatch[0].story_id).toBe('BIZ-01');
  });

  it('skips DEFERRED sprints without flagging drift', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-9': 'DEFERRED' },
      },
      phase_outputs: { phase_5: {} },
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports: {} });
    expect(result.drifts.length).toBe(0);
  });

  it('produces a valid drift report according to schema', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'DONE', 'SP-3': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_OK,
      'SP-2': SYNC_REPORT_SP2_CLOSE_ACTION,
      'SP-3': null,
    };
    const report = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const validation = validateDriftReport(report);
    expect(validation.valid).toBe(true);
    if (!validation.valid) {
      // Print errors for debugging when test fails
      console.log('Validation errors:', validation.errors);
    }
  });

  it('summary counts match drift array', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_WITH_OPEN,
      'SP-2': null,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    expect(result.summary.total_drifts).toBe(result.drifts.length);
    expect(result.summary.critical).toBe(
      result.drifts.filter((d) => d.severity === SEVERITY.CRITICAL).length
    );
    expect(result.summary.warning).toBe(
      result.drifts.filter((d) => d.severity === SEVERITY.WARNING).length
    );
    expect(result.summary.info).toBe(
      result.drifts.filter((d) => d.severity === SEVERITY.INFO).length
    );
  });

  it('tracks in-sync sprints correctly', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'DONE' },
      },
      phase_outputs: { phase_5: {} },
    };
    const syncReports = {
      'SP-1': SYNC_REPORT_SP1_OK,
      'SP-2': SYNC_REPORT_SP2_CLOSE_ACTION,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    expect(result.in_sync.sprints).toContain('SP-1');
    expect(result.in_sync.stories).toBeGreaterThan(0);
  });
});

/* ── validateDriftReport (schema) ─────────────────────────────── */

describe('validateDriftReport', () => {
  const validReport = {
    generated_at: '2026-03-09T00:00:00Z',
    summary: { total_drifts: 1, critical: 1, warning: 0, info: 0 },
    drifts: [
      {
        id: 'DRIFT-001',
        type: 'STORY_STATUS_MISMATCH',
        severity: 'CRITICAL',
        sprint: 'SP-1',
        story_id: 'TECH-01',
        issue_number: 2,
        expected: 'Issue #2 closed',
        actual: 'Issue #2 open',
        recommendation: 'Close issue #2',
      },
    ],
    in_sync: { sprints: ['SP-2'], stories: 5 },
  };

  it('accepts a valid drift report', () => {
    expect(validateDriftReport(validReport).valid).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateDriftReport(null).valid).toBe(false);
    expect(validateDriftReport('str').valid).toBe(false);
    expect(validateDriftReport([]).valid).toBe(false);
  });

  it('rejects missing summary', () => {
    const r = validateDriftReport({ ...validReport, summary: null });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('summary'))).toBe(true);
  });

  it('rejects invalid drift type', () => {
    const bad = { ...validReport, drifts: [{ ...validReport.drifts[0], type: 'INVALID' }] };
    const r = validateDriftReport(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('rejects invalid severity', () => {
    const bad = { ...validReport, drifts: [{ ...validReport.drifts[0], severity: 'LOW' }] };
    const r = validateDriftReport(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('severity'))).toBe(true);
  });

  it('rejects missing in_sync', () => {
    const r = validateDriftReport({ ...validReport, in_sync: null });
    expect(r.valid).toBe(false);
  });

  it('rejects non-array drifts', () => {
    const r = validateDriftReport({ ...validReport, drifts: 'not-array' });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('drifts'))).toBe(true);
  });
});
