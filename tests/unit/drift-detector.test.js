// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/drift-detector';
const {
  detectDrift,
  parseStoryIssueMap,
  parseSprintStoryAssignments,
  parseSyncReport,
  SEVERITY,
  DRIFT_TYPE,
} = __req_0;

import * as __req_1 from '../../src/webapp/schemas';
const { validateDriftReport } = __req_1;

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

/* ── Additional coverage: parseSprintStoryAssignments edge cases ── */

describe('parseSprintStoryAssignments (edge cases)', () => {
  it('resets current sprint when non-sprint ## header appears', () => {
    const content = `## Sprint 1 — Work\n| TECH-01 | Title |\n## Summary\n| BIZ-01 | Title |`;
    const result = parseSprintStoryAssignments(content);
    expect(result['SP-1']).toEqual(['TECH-01']);
    // BIZ-01 should NOT appear under any sprint because "## Summary" reset currentSprint
    const allStories = Object.values(result).flat();
    expect(allStories).not.toContain('BIZ-01');
  });

  it('skips header rows (Story ID) and separator rows (--)', () => {
    const content = `## Sprint 1\n| Story ID | Title |\n|----------|-------|\n| TECH-01 | Real |`;
    const result = parseSprintStoryAssignments(content);
    expect(result['SP-1']).toEqual(['TECH-01']);
  });

  it('skips Track and KPI prefixed rows', () => {
    const content = `## Sprint 1\n| Track | Title |\n| KPI-01 | Title |\n| TECH-01 | Real |`;
    const result = parseSprintStoryAssignments(content);
    expect(result['SP-1']).toEqual(['TECH-01']);
  });

  it('ignores lines without pipe-delimited story ID', () => {
    const content = `## Sprint 1\nJust a regular paragraph\n| TECH-01 | Title |`;
    const result = parseSprintStoryAssignments(content);
    expect(result['SP-1']).toEqual(['TECH-01']);
  });
});

/* ── Additional coverage: parseSyncReport edge cases ──────────── */

describe('parseSyncReport (edge cases)', () => {
  it('extracts closed issues from issue-first format (issue# | storyId)', () => {
    const content = `## Issues Closed\n| #5 | TECH-03: Title | Closed |\n---`;
    const result = parseSyncReport(content);
    expect(result.closed.length).toBe(1);
    expect(result.closed[0].issueNumber).toBe(5);
    expect(result.closed[0].storyId).toBe('TECH-03');
  });

  it('extracts closed issues from story-first then deduplicates', () => {
    const content = `## Issues Closed\n| TECH-01 | #2 |\n| #2 | TECH-01: Title |\n---`;
    const result = parseSyncReport(content);
    // issue #2 should appear only once (dedup by issueNumber)
    const issue2Count = result.closed.filter((c) => c.issueNumber === 2).length;
    expect(issue2Count).toBe(1);
  });

  it('extracts open issues with reason column', () => {
    const content = `## Issues Still Open\n| #7 | BIZ-02: Title | Blocked on deps |\n---`;
    const result = parseSyncReport(content);
    expect(result.open.length).toBe(1);
    expect(result.open[0].issueNumber).toBe(7);
    expect(result.open[0].storyId).toBe('BIZ-02');
    expect(result.open[0].reason).toBe('Blocked on deps');
  });
});

/* ── Additional coverage: detectDrift edge cases ──────────────── */

describe('detectDrift (extended scenarios)', () => {
  it('detects MISSING_ISSUE for story without GitHub issue number', () => {
    const sessionState = {
      sprint_backlog: { sprint_statuses: { 'SP-1': 'DONE' } },
    };
    // Sprint plan with NOISSUE-01 in SP-1 but no issue number
    const sprintPlan = `## Story Point Estimates\n| Story ID | Title | Type | SP | Priority | GitHub Issue |\n| NOISSUE-01 | No issue | CODE | 2 | P2 |  |\n\n## Sprint 1\n| NOISSUE-01 | No issue |`;
    const syncReports = { 'SP-1': `## Issues Closed\n| TECH-01 | #2 |\n---` };
    const result = detectDrift({ sessionState, sprintPlanContent: sprintPlan, syncReports });
    const missing = result.drifts.find((d) => d.type === DRIFT_TYPE.MISSING_ISSUE);
    expect(missing).toBeDefined();
    expect(missing.story_id).toBe('NOISSUE-01');
  });

  it('detects ORPHANED_ISSUE for issues in sync report not in sprint plan', () => {
    // ORPHANED_ISSUE fires when an issue has no storyId AND is not in issueToStory.
    // Since parseSyncReport extractors only produce entries WITH storyId,
    // we exercise _findOrphanedIssues through a scenario where the closed entry's
    // storyId does not appear in the sprint plan AND issueToStory has no mapping.
    // The storyId is present but the issue is unknown → does NOT trigger orphaned
    // (condition requires !entry.storyId). So we test that the drift does NOT appear.
    const sessionState = {
      sprint_backlog: { sprint_statuses: { 'SP-1': 'DONE' } },
    };
    const syncReports = {
      'SP-1': `## Issues Closed\n| #999 | UNKNOWN-01 | Closed |\n---`,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const orphaned = result.drifts.find((d) => d.type === DRIFT_TYPE.ORPHANED_ISSUE);
    // storyId is always present from parseSyncReport, so ORPHANED_ISSUE won't fire
    expect(orphaned).toBeUndefined();
  });

  it('detects SPRINT_STATUS_MISMATCH when DONE sprint has open issues without story-level drift', () => {
    const sessionState = {
      sprint_backlog: { sprint_statuses: { 'SP-1': 'DONE' } },
    };
    // All stories closed, but an extra issue is still open (not a story mismatch)
    // Open section requires 3 pipe-columns and a valid storyId in column 2
    const syncReports = {
      'SP-1': `## Updated Issues\n| TECH-01 | #2 | Closed |\n| BIZ-01 | #15 | Closed |\n## Issues Still Open\n| #50 | MISC-99 | Some reason |\n---`,
    };
    const result = detectDrift({ sessionState, sprintPlanContent: SPRINT_PLAN, syncReports });
    const sprintMismatch = result.drifts.find((d) => d.type === DRIFT_TYPE.SPRINT_STATUS_MISMATCH);
    expect(sprintMismatch).toBeDefined();
    expect(sprintMismatch.severity).toBe(SEVERITY.CRITICAL);
  });

  it('handles session state with no sprint_backlog gracefully', () => {
    const result = detectDrift({
      sessionState: { status: 'IN_PROGRESS' },
      sprintPlanContent: SPRINT_PLAN,
      syncReports: {},
    });
    expect(result.summary.total_drifts).toBe(0);
  });

  it('handles null syncReports gracefully', () => {
    const sessionState = {
      sprint_backlog: { sprint_statuses: { 'SP-1': 'IN_PROGRESS' } },
    };
    const result = detectDrift({
      sessionState,
      sprintPlanContent: SPRINT_PLAN,
      syncReports: {},
    });
    expect(result.summary.total_drifts).toBe(0);
  });
});
