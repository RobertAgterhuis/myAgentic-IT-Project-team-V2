import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Tests for github-state-snapshot.js (INFRA-02-A)
 * and validateGithubSnapshot / github_sync validation in schemas.ts (INFRA-02-D)
 */

const _path = require('path');

/* ── Mock deps via _setDeps (dependency injection) ───────────── */

import * as __req_0 from '../../scripts/github-state-snapshot';
const snapshot = __req_0.default ?? __req_0;

const mockExecSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(true);
const mockMkdirSync = vi.fn();

const mockFs = {
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
};

/* ── Sample API responses ────────────────────────────────────── */

const sampleMilestoneOpen = {
  number: 1,
  title: 'Sprint 1',
  state: 'open',
  open_issues: 3,
  closed_issues: 2,
  due_on: '2026-04-01T00:00:00Z',
  description: 'First sprint',
};

const sampleMilestoneClosed = {
  number: 2,
  title: 'Sprint 2',
  state: 'closed',
  open_issues: 0,
  closed_issues: 5,
  due_on: null,
  description: 'Completed sprint',
};

const sampleIssueOpen = {
  number: 10,
  title: 'Implement feature X',
  state: 'open',
  labels: [{ name: 'enhancement' }],
  milestone: { number: 1, title: 'Sprint 1' },
  assignees: [{ login: 'dev1' }],
  created_at: '2026-03-15T10:00:00Z',
  closed_at: null,
};

const sampleIssueClosed = {
  number: 11,
  title: 'Fix bug Y',
  state: 'closed',
  labels: [{ name: 'bug' }],
  milestone: null,
  assignees: [],
  created_at: '2026-03-10T08:00:00Z',
  closed_at: '2026-03-12T14:00:00Z',
};

const samplePR = {
  number: 20,
  title: 'PR: feature',
  state: 'open',
  pull_request: { url: 'https://api.github.com/repos/o/r/pulls/20' },
  labels: [],
  milestone: null,
  assignees: [],
  created_at: '2026-03-16T09:00:00Z',
  closed_at: null,
};

/* ── helpers ──────────────────────────────────────────────────── */

function setupGhMock(openMilestones, closedMilestones, openIssues, closedIssues) {
  mockExecSync.mockImplementation((cmd) => {
    if (cmd.includes('milestones?state=open')) return JSON.stringify(openMilestones);
    if (cmd.includes('milestones?state=closed')) return JSON.stringify(closedMilestones);
    if (cmd.includes('issues?state=open')) return JSON.stringify(openIssues);
    if (cmd.includes('issues?state=closed')) return JSON.stringify(closedIssues);
    return '[]';
  });
}

/* ── Test suite ──────────────────────────────────────────────── */

describe('github-state-snapshot', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockWriteFileSync.mockReset();
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReset();
    snapshot._setDeps({ execSync: mockExecSync, fs: mockFs });
  });

  describe('fetchMilestones', () => {
    it('fetches and maps open + closed milestones', () => {
      setupGhMock([sampleMilestoneOpen], [sampleMilestoneClosed], [], []);
      const result = snapshot.fetchMilestones();
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[0].state).toBe('open');
      expect(result[1].number).toBe(2);
      expect(result[1].state).toBe('closed');
    });

    it('handles null (404) response gracefully', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('milestones')) {
          const err = new Error('gh failed');
          err.stderr = '404 Not Found';
          throw err;
        }
        return '[]';
      });
      const result = snapshot.fetchMilestones();
      expect(result).toHaveLength(0);
    });

    it('truncates long descriptions to 200 chars', () => {
      const longDesc = 'A'.repeat(300);
      setupGhMock([{ ...sampleMilestoneOpen, description: longDesc }], [], [], []);
      const result = snapshot.fetchMilestones();
      expect(result[0].description.length).toBe(200);
    });
  });

  describe('fetchIssues', () => {
    it('fetches and maps open + closed issues', () => {
      setupGhMock([], [], [sampleIssueOpen], [sampleIssueClosed]);
      const result = snapshot.fetchIssues();
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(10);
      expect(result[0].labels).toEqual(['enhancement']);
      expect(result[0].milestone.title).toBe('Sprint 1');
      expect(result[1].number).toBe(11);
      expect(result[1].milestone).toBeNull();
    });

    it('filters out pull requests', () => {
      setupGhMock([], [], [sampleIssueOpen, samplePR], []);
      const result = snapshot.fetchIssues();
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(10);
    });

    it('handles null (404) response gracefully', () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('issues')) {
          const err = new Error('gh failed');
          err.stderr = '404 Not Found';
          throw err;
        }
        return '[]';
      });
      const result = snapshot.fetchIssues();
      expect(result).toHaveLength(0);
    });
  });

  describe('createSnapshot', () => {
    it('produces a valid snapshot object', () => {
      setupGhMock(
        [sampleMilestoneOpen],
        [sampleMilestoneClosed],
        [sampleIssueOpen],
        [sampleIssueClosed]
      );
      const snap = snapshot.createSnapshot();
      expect(snap.repo).toBe('RobertAgterhuis/myAgentic-IT-Project-team-V2');
      expect(snap.captured_at).toBeTruthy();
      expect(snap.summary.milestones_open).toBe(1);
      expect(snap.summary.milestones_closed).toBe(1);
      expect(snap.summary.issues_open).toBe(1);
      expect(snap.summary.issues_closed).toBe(1);
      expect(snap.milestones).toHaveLength(2);
      expect(snap.issues).toHaveLength(2);
    });

    it('writes snapshot to disk when not --stdout', () => {
      setupGhMock([], [], [], []);
      snapshot.createSnapshot();
      expect(mockWriteFileSync).toHaveBeenCalledWith(snapshot.OUTPUT_FILE, expect.any(String));
      const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(written.repo).toBeTruthy();
    });

    it('creates directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      setupGhMock([], [], [], []);
      snapshot.createSnapshot();
      expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('module exports', () => {
    it('exports all expected functions and constants', () => {
      expect(typeof snapshot.createSnapshot).toBe('function');
      expect(typeof snapshot.fetchMilestones).toBe('function');
      expect(typeof snapshot.fetchIssues).toBe('function');
      expect(typeof snapshot.OWNER).toBe('string');
      expect(typeof snapshot.REPO).toBe('string');
      expect(typeof snapshot.OUTPUT_FILE).toBe('string');
    });
  });
});

/* ── validateGithubSnapshot tests (INFRA-02-D) ───────────────── */

import * as __req_1 from '../../src/webapp/schemas';
const { validateGithubSnapshot, validateSessionState } = __req_1;

describe('validateGithubSnapshot', () => {
  const valid = {
    repo: 'Owner/Repo',
    captured_at: '2026-03-20T12:00:00Z',
    summary: { milestones_open: 1, milestones_closed: 2, issues_open: 5, issues_closed: 10 },
    milestones: [{ number: 1, title: 'M1', state: 'open' }],
    issues: [{ number: 10, title: 'I1', state: 'open' }],
  };

  it('accepts a valid snapshot', () => {
    const r = validateGithubSnapshot(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects non-object input', () => {
    expect(validateGithubSnapshot(null).valid).toBe(false);
    expect(validateGithubSnapshot('x').valid).toBe(false);
    expect(validateGithubSnapshot([]).valid).toBe(false);
  });

  it('requires repo and captured_at strings', () => {
    const r = validateGithubSnapshot({ summary: valid.summary, milestones: [], issues: [] });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('repo must be a string');
    expect(r.errors).toContain('captured_at must be a string');
  });

  it('requires summary to be an object with numeric fields', () => {
    const r = validateGithubSnapshot({
      ...valid,
      summary: { milestones_open: 'x', milestones_closed: 0, issues_open: 0, issues_closed: 0 },
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/milestones_open must be a number/);
  });

  it('requires milestones and issues to be arrays', () => {
    const r = validateGithubSnapshot({ ...valid, milestones: 'bad', issues: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('milestones must be an array');
    expect(r.errors).toContain('issues must be an array');
  });
});

/* ── github_sync validation in validateSessionState (INFRA-02-D) */

describe('validateSessionState — github_sync', () => {
  const base = {
    session_id: 'sess-001',
    cycle_type: 'CREATE',
    status: 'IN_PROGRESS',
  };

  it('accepts session state without github_sync (backwards-compat)', () => {
    const r = validateSessionState(base);
    expect(r.valid).toBe(true);
  });

  it('accepts valid github_sync object', () => {
    const r = validateSessionState({
      ...base,
      github_sync: {
        last_synced: '2026-03-20T12:00:00Z',
        milestones_open: 1,
        milestones_closed: 2,
        issues_open: 5,
        issues_closed: 10,
        drift_findings: [],
      },
    });
    expect(r.valid).toBe(true);
  });

  it('accepts github_sync with null last_synced', () => {
    const r = validateSessionState({
      ...base,
      github_sync: {
        last_synced: null,
        milestones_open: 0,
        milestones_closed: 0,
        issues_open: 0,
        issues_closed: 0,
        drift_findings: [],
      },
    });
    expect(r.valid).toBe(true);
  });

  it('rejects github_sync as array', () => {
    const r = validateSessionState({ ...base, github_sync: [] });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('github_sync must be an object');
  });

  it('rejects github_sync as string', () => {
    const r = validateSessionState({ ...base, github_sync: 'bad' });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('github_sync must be an object');
  });

  it('rejects non-number milestones_open', () => {
    const r = validateSessionState({
      ...base,
      github_sync: { milestones_open: 'x' },
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('github_sync.milestones_open must be a number');
  });

  it('rejects non-number issues_closed', () => {
    const r = validateSessionState({
      ...base,
      github_sync: { issues_closed: true },
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('github_sync.issues_closed must be a number');
  });

  it('rejects non-array drift_findings', () => {
    const r = validateSessionState({
      ...base,
      github_sync: { drift_findings: 'bad' },
    });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('github_sync.drift_findings must be an array');
  });
});
