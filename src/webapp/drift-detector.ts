// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Drift Detection: session-state vs GitHub board (INFRA-02-C) ─
 * Compares the orchestrator's session-state.json against GitHub sync
 * reports to detect discrepancies between what the system believes
 * is true and what was actually synced to the GitHub board.
 *
 * Design constraints:
 * - Zero external API calls — works entirely from local files
 * - Pure functions — no side effects, fully testable
 * - Follows existing zero-dep convention
 * ─────────────────────────────────────────────────────────────── */

/* ── Constants ────────────────────────────────────────────────── */

export const SEVERITY = Object.freeze({
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const);

export const DRIFT_TYPE = Object.freeze({
  SPRINT_STATUS_MISMATCH: 'SPRINT_STATUS_MISMATCH',
  MISSING_SYNC_REPORT: 'MISSING_SYNC_REPORT',
  STORY_STATUS_MISMATCH: 'STORY_STATUS_MISMATCH',
  ORPHANED_ISSUE: 'ORPHANED_ISSUE',
  MISSING_ISSUE: 'MISSING_ISSUE',
} as const);

/* ── Types ─────────────────────────────────────────────────────── */

type SeverityValue = (typeof SEVERITY)[keyof typeof SEVERITY];
type DriftTypeValue = (typeof DRIFT_TYPE)[keyof typeof DRIFT_TYPE];

interface StoryIssueEntry {
  storyId: string;
  title: string;
  issueNumber: number | null;
}

interface ClosedEntry {
  issueNumber: number;
  storyId: string;
}

interface OpenEntry {
  issueNumber: number;
  storyId: string;
  reason: string;
}

interface SyncData {
  closed: ClosedEntry[];
  open: OpenEntry[];
}

interface DriftEntry {
  id: string;
  type: DriftTypeValue;
  severity: SeverityValue;
  sprint: string;
  story_id: string | null;
  issue_number: number | null;
  expected: string;
  actual: string;
  recommendation: string;
}

interface DriftContext {
  drifts: DriftEntry[];
  counter: number;
}

interface DriftReportSummary {
  total_drifts: number;
  critical: number;
  warning: number;
  info: number;
}

interface DriftReport {
  generated_at: string;
  summary: DriftReportSummary;
  drifts: DriftEntry[];
  in_sync: { sprints: string[]; stories: number };
  error?: string;
}

interface DetectDriftParams {
  sessionState: unknown;
  sprintPlanContent: string;
  syncReports: Record<string, string | null>;
}

interface SessionState {
  sprint_backlog?: {
    sprint_statuses?: Record<string, string>;
  };
}

interface ClassifyResult {
  newSprint?: string | null;
  storyId?: string;
}

/* ── Sprint Plan Parser ───────────────────────────────────────── */

/**
 * Parse the story-to-issue mapping table from a sprint plan markdown file.
 * Expects rows like: | TECH-01 | Title | TYPE | 8 | P0 | #2 | ... |
 */
export function parseStoryIssueMap(content: string): StoryIssueEntry[] {
  if (typeof content !== 'string') return [];
  const results: StoryIssueEntry[] = [];
  const lines = content.split('\n');
  // Match table rows in the "Story Point Estimates" section
  const rowRe = /^\|\s*([\w-]+)\s*\|([^|]*)\|[^|]*\|[^|]*\|[^|]*\|\s*(?:#(\d+))?\s*\|/;
  for (const line of lines) {
    const m = line.match(rowRe);
    if (!m) continue;
    const storyId = m[1].trim();
    // Skip header/separator rows
    if (storyId === 'Story ID' || storyId.startsWith('--')) continue;
    results.push({
      storyId,
      title: m[2].trim(),
      issueNumber: m[3] ? parseInt(m[3], 10) : null,
    });
  }
  return results;
}

/**
 * Parse per-sprint story assignments from the sprint plan.
 * Returns a map of sprint ID → array of story IDs assigned to that sprint.
 */
export function parseSprintStoryAssignments(content: string): Record<string, string[]> {
  if (typeof content !== 'string') return {};
  const assignments: Record<string, string[]> = {};
  let currentSprint: string | null = null;
  const sprintHeaderRe = /^##\s+Sprint\s+(\d+)\b/;

  for (const line of content.split('\n')) {
    const result = _classifySprintLine(line, currentSprint, sprintHeaderRe);
    if (result.newSprint !== undefined) {
      currentSprint = result.newSprint;
      if (currentSprint && !assignments[currentSprint]) assignments[currentSprint] = [];
    }
    if (result.storyId && currentSprint) {
      assignments[currentSprint].push(result.storyId);
    }
  }
  return assignments;
}

function _classifySprintLine(
  line: string,
  currentSprint: string | null,
  sprintHeaderRe: RegExp
): ClassifyResult {
  const hm = line.match(sprintHeaderRe);
  if (hm) return { newSprint: `SP-${hm[1]}` };
  if (!currentSprint) return {};
  if (/^##\s+[^#]/.test(line) && !sprintHeaderRe.test(line)) return { newSprint: null };
  const sm = line.match(/^\|\s*([\w-]+)\s*\|/);
  if (!sm) return {};
  const sid = sm[1].trim();
  if (_isValidStoryId(sid)) return { storyId: sid };
  return {};
}

function _isValidStoryId(sid: string): boolean {
  return (
    sid !== 'Story ID' &&
    !sid.startsWith('--') &&
    !sid.startsWith('Track') &&
    !sid.startsWith('KPI') &&
    /^[A-Z]/.test(sid)
  );
}

/* ── Sync Report Parser ───────────────────────────────────────── */

/**
 * Parse a GitHub sync report to extract issue statuses.
 */
export function parseSyncReport(content: string): SyncData {
  if (typeof content !== 'string') return { closed: [], open: [] };
  const closedSectionRe =
    /(?:Issues?\s*Closed|Updated\s*Issues|Actions?\s*Performed)([\s\S]*?)(?=\n##|\n---|\n$)/i;
  const openSectionRe = /(?:Issues?\s*(?:Still\s*)?Open)([\s\S]*?)(?=\n##|\n---|\n$)/i;
  const closed = _parseClosedSection(content, closedSectionRe);
  _parseCloseActions(content, closed);
  const open = _parseOpenSection(content, openSectionRe);
  return { closed, open };
}

function _parseClosedSection(content: string, sectionRe: RegExp): ClosedEntry[] {
  const match = content.match(sectionRe);
  if (!match) return [];
  const closed = _extractIssueFirstRows(match[1]);
  _extractStoryFirstRows(match[1], closed);
  return closed;
}

function _extractIssueFirstRows(text: string): ClosedEntry[] {
  const results: ClosedEntry[] = [];
  const re = /\|\s*#?(\d+)\s*\|([^|]*)\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[1], 10);
    const storyMatch = m[2].trim().match(/^([\w]+-\d+)/);
    if (storyMatch && !isNaN(num)) {
      results.push({ issueNumber: num, storyId: storyMatch[1] });
    }
  }
  return results;
}

function _extractStoryFirstRows(text: string, closed: ClosedEntry[]): void {
  const re = /\|\s*([\w-]+)\s*\|\s*#(\d+)\s*\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sid = m[1].trim();
    const num = parseInt(m[2], 10);
    if (/^[A-Z]/.test(sid) && !isNaN(num) && !closed.some((c) => c.issueNumber === num)) {
      closed.push({ issueNumber: num, storyId: sid });
    }
  }
}

function _parseCloseActions(content: string, closed: ClosedEntry[]): void {
  const re = /\|\s*CLOSE\s*\|\s*#?(\d+)\s*\|\s*([\w-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const sid = m[2].trim();
    if (!closed.some((c) => c.issueNumber === num)) {
      closed.push({ issueNumber: num, storyId: sid });
    }
  }
}

function _parseOpenSection(content: string, sectionRe: RegExp): OpenEntry[] {
  const open: OpenEntry[] = [];
  const match = content.match(sectionRe);
  if (!match) return open;
  const re = /\|\s*#?(\d+)\s*\|([^|]*)\|([^|]*)\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(match[1])) !== null) {
    const num = parseInt(m[1], 10);
    const storyMatch = m[2].trim().match(/^([\w]+-\d+)/);
    if (storyMatch && !isNaN(num)) {
      open.push({ issueNumber: num, storyId: storyMatch[1], reason: m[3].trim() });
    }
  }
  return open;
}

/* ── Drift Detection Engine ───────────────────────────────────── */

/**
 * Detect drift between session-state and GitHub board sync reports.
 */
export function detectDrift({
  sessionState,
  sprintPlanContent,
  syncReports,
}: DetectDriftParams): DriftReport {
  if (!sessionState || typeof sessionState !== 'object') {
    return _emptyReport('Session state is missing or invalid');
  }

  const state = sessionState as SessionState;
  const sprintStatuses: Record<string, string> =
    (state.sprint_backlog && state.sprint_backlog.sprint_statuses) || {};
  const storyIssueMap = parseStoryIssueMap(sprintPlanContent || '');
  const sprintAssignments = parseSprintStoryAssignments(sprintPlanContent || '');
  const lookups = _buildIssueLookups(storyIssueMap);
  const ctx: DriftContext = { drifts: [], counter: 0 };

  const syncedSprints = _checkPerSprintDrift(
    sprintStatuses,
    syncReports,
    sprintAssignments,
    lookups.storyToIssue,
    ctx
  );
  _findOrphanedIssues(syncReports, lookups.issueToStory, ctx);
  _findSprintLevelMismatches(sprintStatuses, syncReports, ctx);

  return _buildReport(ctx.drifts, storyIssueMap, syncedSprints);
}

function _buildIssueLookups(storyIssueMap: StoryIssueEntry[]): {
  storyToIssue: Record<string, number>;
  issueToStory: Record<number, string>;
} {
  const storyToIssue: Record<string, number> = {};
  const issueToStory: Record<number, string> = {};
  for (const entry of storyIssueMap) {
    if (entry.issueNumber) {
      storyToIssue[entry.storyId] = entry.issueNumber;
      issueToStory[entry.issueNumber] = entry.storyId;
    }
  }
  return { storyToIssue, issueToStory };
}

function _addDrift(
  ctx: DriftContext,
  type: DriftTypeValue,
  severity: SeverityValue,
  sprint: string,
  overrides: Partial<DriftEntry>
): void {
  ctx.drifts.push({
    id: `DRIFT-${String(++ctx.counter).padStart(3, '0')}`,
    type,
    severity,
    sprint,
    story_id: null,
    issue_number: null,
    expected: '',
    actual: '',
    recommendation: '',
    ...overrides,
  });
}

function _checkPerSprintDrift(
  sprintStatuses: Record<string, string>,
  syncReports: Record<string, string | null>,
  sprintAssignments: Record<string, string[]>,
  storyToIssue: Record<string, number>,
  ctx: DriftContext
): string[] {
  const syncedSprints: string[] = [];
  for (const [sprintId, status] of Object.entries(sprintStatuses)) {
    const reportContent = syncReports ? syncReports[sprintId] : null;
    _processSprint(
      sprintId,
      status,
      reportContent,
      sprintAssignments,
      storyToIssue,
      ctx,
      syncedSprints
    );
  }
  return syncedSprints;
}

function _processSprint(
  sprintId: string,
  status: string,
  reportContent: string | null | undefined,
  sprintAssignments: Record<string, string[]>,
  storyToIssue: Record<string, number>,
  ctx: DriftContext,
  syncedSprints: string[]
): void {
  if (status === 'DONE' && !reportContent) {
    _addDrift(ctx, DRIFT_TYPE.MISSING_SYNC_REPORT, SEVERITY.WARNING, sprintId, {
      expected: `Sync report exists for completed sprint ${sprintId}`,
      actual: `No sync report found for ${sprintId}`,
      recommendation: `Run GitHub Integration Agent for ${sprintId} to generate sync report`,
    });
    return;
  }
  if (status === 'DEFERRED' || !reportContent) return;

  const syncData = parseSyncReport(reportContent);
  if (status === 'DONE') {
    const assignedStories = sprintAssignments[sprintId] || [];
    _checkStoryStatuses(assignedStories, syncData, storyToIssue, sprintId, ctx);
    syncedSprints.push(sprintId);
  }
}

function _checkStoryStatuses(
  assignedStories: string[],
  syncData: SyncData,
  storyToIssue: Record<string, number>,
  sprintId: string,
  ctx: DriftContext
): void {
  for (const storyId of assignedStories) {
    const issueNum = storyToIssue[storyId];
    if (!issueNum) {
      _addDrift(ctx, DRIFT_TYPE.MISSING_ISSUE, SEVERITY.INFO, sprintId, {
        story_id: storyId,
        expected: `Story ${storyId} has a corresponding GitHub issue`,
        actual: `No GitHub issue number found in sprint plan for ${storyId}`,
        recommendation: `Create GitHub issue for ${storyId} and update sprint plan`,
      });
      continue;
    }
    const isClosed = syncData.closed.some((c) => c.issueNumber === issueNum);
    const isStillOpen = syncData.open.some((o) => o.issueNumber === issueNum);
    if (!isClosed && isStillOpen) {
      const openEntry = syncData.open.find((o) => o.issueNumber === issueNum);
      _addDrift(ctx, DRIFT_TYPE.STORY_STATUS_MISMATCH, SEVERITY.CRITICAL, sprintId, {
        story_id: storyId,
        issue_number: issueNum,
        expected: `Issue #${issueNum} (${storyId}) closed — sprint ${sprintId} marked DONE`,
        actual: `Issue #${issueNum} still open: ${openEntry ? openEntry.reason : 'unknown reason'}`,
        recommendation: `Close issue #${issueNum} or update ${sprintId} status to reflect incomplete work`,
      });
    }
  }
}

function _findOrphanedIssues(
  syncReports: Record<string, string | null>,
  issueToStory: Record<number, string>,
  ctx: DriftContext
): void {
  for (const [sprintId, reportContent] of Object.entries(syncReports || {})) {
    if (!reportContent) continue;
    const syncData = parseSyncReport(reportContent);
    const allSyncIssues = [...syncData.closed, ...syncData.open];
    for (const entry of allSyncIssues) {
      if (!issueToStory[entry.issueNumber] && !entry.storyId) {
        _addDrift(ctx, DRIFT_TYPE.ORPHANED_ISSUE, SEVERITY.INFO, sprintId, {
          issue_number: entry.issueNumber,
          expected: `Issue #${entry.issueNumber} maps to a story in the sprint plan`,
          actual: `Issue #${entry.issueNumber} found in sync report but not in sprint plan`,
          recommendation: `Add to sprint plan or close as out-of-scope`,
        });
      }
    }
  }
}

function _findSprintLevelMismatches(
  sprintStatuses: Record<string, string>,
  syncReports: Record<string, string | null>,
  ctx: DriftContext
): void {
  for (const [sprintId, status] of Object.entries(sprintStatuses)) {
    if (status !== 'DONE') continue;
    const reportContent = syncReports ? syncReports[sprintId] : null;
    if (!reportContent) continue;
    const syncData = parseSyncReport(reportContent);
    if (syncData.open.length === 0) continue;
    const hasStoryDrift = ctx.drifts.some(
      (d) => d.sprint === sprintId && d.type === DRIFT_TYPE.STORY_STATUS_MISMATCH
    );
    if (hasStoryDrift) continue;
    const openIds = syncData.open.map((o) => `#${o.issueNumber}`).join(', ');
    _addDrift(ctx, DRIFT_TYPE.SPRINT_STATUS_MISMATCH, SEVERITY.CRITICAL, sprintId, {
      expected: `All issues closed for completed sprint ${sprintId}`,
      actual: `Sprint ${sprintId} DONE but issues still open: ${openIds}`,
      recommendation: `Close open issues or re-evaluate sprint status`,
    });
  }
}

function _buildReport(
  drifts: DriftEntry[],
  storyIssueMap: StoryIssueEntry[],
  syncedSprints: string[]
): DriftReport {
  const driftStoryIds = new Set(drifts.filter((d) => d.story_id).map((d) => d.story_id));
  const summary: DriftReportSummary = {
    total_drifts: drifts.length,
    critical: drifts.filter((d) => d.severity === SEVERITY.CRITICAL).length,
    warning: drifts.filter((d) => d.severity === SEVERITY.WARNING).length,
    info: drifts.filter((d) => d.severity === SEVERITY.INFO).length,
  };
  return {
    generated_at: new Date().toISOString(),
    summary,
    drifts,
    in_sync: {
      sprints: syncedSprints.filter((s) => !drifts.some((d) => d.sprint === s)),
      stories: storyIssueMap.length - driftStoryIds.size,
    },
  };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function _emptyReport(reason: string): DriftReport {
  return {
    generated_at: new Date().toISOString(),
    summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
    drifts: [],
    in_sync: { sprints: [], stories: 0 },
    error: reason,
  };
}
