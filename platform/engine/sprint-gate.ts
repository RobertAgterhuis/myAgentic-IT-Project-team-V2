/**
 * Sprint Gate — Definition of Ready & Readiness Checks (FEAT-05-D)
 *
 * Runs before each Phase 5 sprint iteration to validate readiness:
 *   Step 0: Load reevaluate triggers and decisions from decisions.md
 *   Step 1: Definition of Ready — stories have ACs, estimates, deps resolved
 *   Step 2: Lessons-learned injection from retrospectives
 *   Step 3: Velocity-based capacity check (planned SP vs trailing average)
 *   Step 4: Blocker check — cross-team dependencies
 *
 * Returns: READY / NOT_READY + list of blockers
 *
 * @module orchestrator/sprint-gate
 */

import _path from 'path';
import { findPromotionCandidates } from '../../src/webapp/lesson-promotion';
import {
  type MetricsStore,
  type SprintMetrics,
  type DoraReport,
  createMetricsStore,
  deserializeMetricsStore,
  serializeMetricsStore,
  computeVelocityTrendEntry,
  recordSprintBoundary,
} from '../sdlc/observability';
import {
  runPolicyEvaluation,
  type EvaluationReport,
  type EvaluationContext,
} from './policy-evaluator';

interface SprintGateStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

interface SprintStory {
  id?: string;
  title?: string;
  acceptanceCriteria?: unknown[];
  estimate?: number;
  dependencies?: Array<{ id?: string; description?: string; status?: string }>;
}

// ─── Constants ───────────────────────────────────────────────

const DECISIONS_PATH = 'BusinessDocs/decisions.md';
const LESSONS_LEARNED_PATH = 'BusinessDocs/retrospectives/lessons-learned.md';
const VELOCITY_LOG_PATH = 'BusinessDocs/retrospectives/velocity-log.json';
const BLOCKER_MATRIX_PATH = 'BusinessDocs/synthesis/cross-team-blocker-matrix.md';
const REEVALUATE_TRIGGER_PATH = 'BusinessDocs/session/reevaluate-trigger.json';

/** Trailing sprint count for velocity average */
const VELOCITY_WINDOW = 3;

/** Maximum over-commit percentage before flagging capacity risk */
const CAPACITY_THRESHOLD = 1.2;

// ─── Step 0: Decisions & Reevaluate Triggers ─────────────────

/**
 * Parse decisions from decisions.md.
 * Extracts uncategorized decisions table and open questions table.
 * @param {string} content - decisions.md content
 * @returns {{ decided: Array, openQuestions: Array, categories: Array }}
 */
function parseDecisions(content: string) {
  const decided = [];
  const openQuestions = [];
  const categories = [];

  const lines = content.split('\n');

  // Parse open questions table
  let inOpenQuestions = false;
  let inUncategorized = false;
  let inCategories = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section starts
    if (/^##\s+Open Questions/i.test(trimmed)) {
      inOpenQuestions = true;
      inUncategorized = false;
      inCategories = false;
      continue;
    }
    if (/^###?\s+Uncategorized Decisions/i.test(trimmed)) {
      inUncategorized = true;
      inOpenQuestions = false;
      inCategories = false;
      continue;
    }
    if (/^##\s+Decision Categories/i.test(trimmed)) {
      inCategories = true;
      inOpenQuestions = false;
      inUncategorized = false;
      continue;
    }
    if (/^##\s+/.test(trimmed) && !inOpenQuestions && !inUncategorized && !inCategories) {
      inOpenQuestions = false;
      inUncategorized = false;
      inCategories = false;
    }

    // Parse table rows (skip header/separator)
    if (
      !trimmed.startsWith('|') ||
      /^\|\s*-/.test(trimmed) ||
      /^\|\s*ID\s*\|/.test(trimmed) ||
      /^\|\s*Stack\s*\|/.test(trimmed)
    ) {
      continue;
    }

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 3) continue;

    if (inOpenQuestions) {
      const [id, priority, scope, question, answer, date] = cells;
      if (id && /^[A-Z]/.test(id) && !question?.includes('No open questions')) {
        openQuestions.push({
          id,
          priority,
          scope,
          question,
          answer: answer || '',
          date: date || '',
        });
      }
    } else if (inUncategorized) {
      const [id, priority, scope, decision, notes, date] = cells;
      if (id && /^DEC-/.test(id) && !decision?.includes('Add a decision here')) {
        decided.push({ id, priority, scope, decision, notes: notes || '', date: date || '' });
      }
    } else if (inCategories) {
      const [stack, file, count, status, applicable] = cells;
      if (stack && status) {
        const fileMatch = (file || '').match(/\[(.+?)\]\((.+?)\)/);
        categories.push({
          stack,
          file: fileMatch ? fileMatch[2] : file || '',
          count: parseInt(count, 10) || 0,
          status: status.toUpperCase(),
          applicable: applicable || '',
        });
      }
    }
  }

  return { decided, openQuestions, categories };
}

/**
 * Load reevaluate trigger from session directory.
 * @param {object} store
 * @param {string} [triggerPath]
 * @returns {{ pending: boolean, scope: string|null, reason: string|null }}
 */
function loadReevaluateTrigger(store: SprintGateStore, triggerPath: string) {
  const fp = triggerPath || REEVALUATE_TRIGGER_PATH;
  if (!store.exists(fp)) return { pending: false, scope: null, reason: null };

  try {
    const data = JSON.parse(store.readFile(fp));
    return {
      pending: data.status === 'PENDING',
      scope: data.scope || null,
      reason: data.reason || null,
    };
  } catch {
    return { pending: false, scope: null, reason: null };
  }
}

/**
 * Step 0: Load decisions and reevaluate triggers.
 * Returns blocking HIGH-priority open questions and active decisions.
 * @param {object} store
 * @param {string} sprintScope - e.g. 'SP-5' or 'Phase 5'
 * @param {object} [paths]
 * @param {object} [templateConfig]
 * @param {Array<{file: string, name: string, defaultStatus: string}>} [templateConfig.decisionCategories] - Template-defined categories
 * @returns {{ decisions: Array, blockingQuestions: Array, reevaluate: object, activeCategories: Array }}
 */
function loadDecisionsAndTriggers(
  store: SprintGateStore,
  sprintScope: string,
  paths: Record<string, string> = {},
  templateConfig: Record<string, unknown> = {}
) {
  const decisionsPath = paths.decisionsPath || DECISIONS_PATH;
  const triggerPath = paths.triggerPath || REEVALUATE_TRIGGER_PATH;

  let decisions = { decided: [], openQuestions: [], categories: [] };
  if (store.exists(decisionsPath)) {
    decisions = parseDecisions(store.readFile(decisionsPath));
  }

  // HIGH-priority open questions whose scope overlaps with this sprint block the gate
  const blockingQuestions = decisions.openQuestions.filter((q) => {
    if (q.priority !== 'HIGH') return false;
    const scope = (q.scope || '').toLowerCase();
    const sprintLower = sprintScope.toLowerCase();
    return scope.includes('all') || scope.includes('phase 5') || scope.includes(sprintLower);
  });

  const reevaluate = loadReevaluateTrigger(store, triggerPath);

  // Merge template-defined categories with parsed categories from the markdown.
  // Template categories provide the authoritative defaultStatus when present.
  let activeCategories;
  if (
    templateConfig.decisionCategories &&
    Array.isArray(templateConfig.decisionCategories) &&
    templateConfig.decisionCategories.length > 0
  ) {
    activeCategories = templateConfig.decisionCategories.filter(
      (c) => c.defaultStatus === 'ACTIVE'
    );
  } else {
    activeCategories = decisions.categories.filter((c) => c.status === 'ACTIVE');
  }

  return {
    decisions: decisions.decided,
    blockingQuestions,
    reevaluate,
    activeCategories,
  };
}

// ─── Step 1: Definition of Ready ─────────────────────────────

/**
 * Validate that all sprint stories meet the Definition of Ready.
 * Each story must have: title, acceptance criteria, estimate, dependencies resolved.
 *
 * @param {Array<object>} stories - Sprint backlog items
 * @returns {{ ready: boolean, issues: Array }}
 */
function checkDefinitionOfReady(stories: SprintStory[]) {
  const issues = [];

  if (!stories || stories.length === 0) {
    issues.push({
      severity: 'CRITICAL',
      rule: 'NO_STORIES',
      description: 'Sprint backlog is empty — no stories to execute',
    });
    return { ready: false, issues };
  }

  for (const story of stories) {
    const id = story.id || story.title || '(unknown)';

    if (!story.title || !story.title.trim()) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'MISSING_TITLE',
        description: `Story "${id}" has no title`,
        storyId: id,
      });
    }

    if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
      issues.push({
        severity: 'CRITICAL',
        rule: 'MISSING_AC',
        description: `Story "${id}" has no acceptance criteria`,
        storyId: id,
      });
    }

    if (story.estimate == null || story.estimate <= 0) {
      issues.push({
        severity: 'MAJOR',
        rule: 'MISSING_ESTIMATE',
        description: `Story "${id}" has no estimate or estimate is zero`,
        storyId: id,
      });
    }

    if (story.dependencies && story.dependencies.length > 0) {
      const unresolved = story.dependencies.filter((d) => d.status !== 'RESOLVED');
      for (const dep of unresolved) {
        issues.push({
          severity: 'CRITICAL',
          rule: 'UNRESOLVED_DEPENDENCY',
          description: `Story "${id}" has unresolved dependency: ${dep.id || dep.description || 'unknown'}`,
          storyId: id,
          dependency: dep,
        });
      }
    }
  }

  const hasCritical = issues.some((i) => i.severity === 'CRITICAL');
  return { ready: !hasCritical, issues };
}

// ─── Step 2: Lessons-Learned Injection ───────────────────────

/**
 * Parse lessons from lessons-learned.md.
 * Extracts "Top N Lessons for Sprint X Injection" section if present,
 * otherwise returns all lessons from the latest sprint section.
 *
 * @param {string} content - lessons-learned.md content
 * @returns {Array<{id: string, lesson: string, type: string, appliesTo: string}>}
 */
function parseLessonsLearned(content: string) {
  const lessons = [];
  const lines = content.split('\n');

  // First try: find "Top N Lessons" injection section
  let inInjection = false;
  for (const line of lines) {
    if (/^##\s+Top\s+\d+\s+Lessons/i.test(line)) {
      inInjection = true;
      continue;
    }
    if (inInjection) {
      if (/^---/.test(line.trim()) || /^##\s+/.test(line)) break;
      const numbered = line.match(/^\d+\.\s+\*\*(\w+)\s*[—–-]\s*(.+?)\*\*/);
      if (numbered) {
        lessons.push({
          id: numbered[1],
          lesson: numbered[2].trim(),
          type: 'injection',
          appliesTo: 'current-sprint',
        });
      }
    }
  }
  if (lessons.length > 0) return lessons;

  // Fallback: parse latest sprint table rows
  let latestSectionStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^##\s+Sprint\s+\d+\s+Lessons/i.test(lines[i])) {
      latestSectionStart = i;
      break;
    }
  }

  if (latestSectionStart >= 0) {
    for (let i = latestSectionStart + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i]) || /^---/.test(lines[i].trim())) break;
      const row = lines[i].trim();
      if (!row.startsWith('|') || /^\|\s*-/.test(row) || /^\|\s*ID\s*\|/.test(row)) continue;
      const cells = row
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 4 && /^L\d+/.test(cells[0])) {
        lessons.push({
          id: cells[0],
          lesson: cells[1],
          type: cells[2],
          appliesTo: cells[3],
        });
      }
    }
  }

  return lessons;
}

/**
 * Step 2: Load and inject lessons learned.
 * Also detects lessons flagged with PROMOTE_TO_DECISION.
 * @param {object} store
 * @param {string} [lessonsPath]
 * @returns {{ lessons: Array, count: number, promotionCandidates: Array }}
 */
function loadLessonsLearned(store: SprintGateStore, lessonsPath: string) {
  const fp = lessonsPath || LESSONS_LEARNED_PATH;
  if (!store.exists(fp)) return { lessons: [], count: 0, promotionCandidates: [] };

  const content = store.readFile(fp);
  const lessons = parseLessonsLearned(content);
  const promotionCandidates = findPromotionCandidates(content);
  return { lessons, count: lessons.length, promotionCandidates };
}

// ─── Step 3: Velocity-Based Capacity Check ───────────────────

/**
 * Parse the velocity log JSON and compute trailing average.
 * @param {string} jsonContent - velocity-log.json content
 * @param {number} [window] - Number of past sprints to average
 * @returns {{ sprints: Array, trailingAverage: number, sprintCount: number }}
 */
function parseVelocityLog(jsonContent: string, window: number) {
  const w = window || VELOCITY_WINDOW;

  let data;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    return { sprints: [], trailingAverage: 0, sprintCount: 0 };
  }

  const sprints = data.sprints || [];
  if (sprints.length === 0) return { sprints: [], trailingAverage: 0, sprintCount: 0 };

  // Use the last `w` sprints for trailing average
  const recent = sprints.slice(-w);
  const totalCompleted = recent.reduce((sum, s) => sum + (s.completed_items || 0), 0);
  const trailingAverage = recent.length > 0 ? totalCompleted / recent.length : 0;

  return { sprints, trailingAverage, sprintCount: recent.length };
}

/**
 * Step 3: Check if planned items fit within velocity capacity.
 * @param {object} store
 * @param {number} plannedItems - Number of items planned for next sprint
 * @param {object} [opts]
 * @returns {{ withinCapacity: boolean, plannedItems: number, trailingAverage: number, ratio: number, issues: Array }}
 */
function checkVelocityCapacity(
  store: SprintGateStore,
  plannedItems: number,
  opts: Record<string, unknown> = {}
) {
  const velocityPath = (opts.velocityPath as string) || VELOCITY_LOG_PATH;
  const threshold = (opts.capacityThreshold as number) || CAPACITY_THRESHOLD;
  const issues = [];

  if (!store.exists(velocityPath)) {
    return {
      withinCapacity: true,
      plannedItems,
      trailingAverage: 0,
      ratio: 0,
      issues: [
        {
          severity: 'INFO',
          rule: 'NO_VELOCITY_DATA',
          description: 'No velocity history available — skipping capacity check',
        },
      ],
    };
  }

  const content = store.readFile(velocityPath);
  const { trailingAverage, sprintCount } = parseVelocityLog(
    content,
    opts.window as number | undefined
  );

  if (sprintCount === 0 || trailingAverage === 0) {
    return {
      withinCapacity: true,
      plannedItems,
      trailingAverage: 0,
      ratio: 0,
      issues: [
        {
          severity: 'INFO',
          rule: 'INSUFFICIENT_VELOCITY_DATA',
          description: 'Not enough velocity data for capacity check',
        },
      ],
    };
  }

  const ratio = plannedItems / trailingAverage;

  if (ratio > threshold) {
    issues.push({
      severity: 'MAJOR',
      rule: 'OVER_CAPACITY',
      description: `Planned ${plannedItems} items but trailing average is ${trailingAverage.toFixed(1)} (ratio: ${ratio.toFixed(2)}, threshold: ${threshold})`,
      plannedItems,
      trailingAverage,
      ratio,
    });
  }

  return {
    withinCapacity: ratio <= threshold,
    plannedItems,
    trailingAverage,
    ratio,
    issues,
  };
}

// ─── Step 4: Blocker Check ───────────────────────────────────

/**
 * Parse the cross-team blocker matrix markdown.
 * @param {string} content
 * @returns {Array<{id: string, sourceTarget: string, description: string, classification: string, status: string}>}
 */
function parseBlockerMatrix(content: string) {
  const blockers = [];
  const lines = content.split('\n');
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|\s*Blocker ID/i.test(trimmed)) {
      inTable = true;
      continue;
    }
    if (inTable && /^\|\s*-/.test(trimmed)) continue;
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false;
      continue;
    }
    if (!inTable) continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length >= 5) {
      blockers.push({
        id: cells[0],
        sourceTarget: cells[1],
        description: cells[2],
        classification: cells[3].toUpperCase(),
        status: cells[4].toUpperCase(),
      });
    }
  }

  return blockers;
}

/**
 * Step 4: Check for open BLOCKING cross-team dependencies.
 * @param {object} store
 * @param {string} [blockerPath]
 * @returns {{ clear: boolean, openBlockers: Array, advisories: Array, issues: Array }}
 */
function checkBlockers(store: SprintGateStore, blockerPath: string) {
  const fp = blockerPath || BLOCKER_MATRIX_PATH;
  const issues = [];

  if (!store.exists(fp)) {
    return {
      clear: true,
      openBlockers: [],
      advisories: [],
      issues: [
        {
          severity: 'INFO',
          rule: 'NO_BLOCKER_MATRIX',
          description: 'Cross-team blocker matrix not found — skipping blocker check',
        },
      ],
    };
  }

  const content = store.readFile(fp);
  const allBlockers = parseBlockerMatrix(content);

  const openBlockers = allBlockers.filter(
    (b) => b.classification === 'BLOCKING' && b.status === 'OPEN'
  );
  const advisories = allBlockers.filter(
    (b) => b.classification === 'ADVISORY' && b.status === 'OPEN'
  );

  for (const blocker of openBlockers) {
    issues.push({
      severity: 'CRITICAL',
      rule: 'OPEN_BLOCKER',
      description: `Open blocker ${blocker.id}: ${blocker.sourceTarget} — ${blocker.description}`,
      blockerId: blocker.id,
    });
  }

  for (const adv of advisories) {
    issues.push({
      severity: 'INFO',
      rule: 'OPEN_ADVISORY',
      description: `Advisory ${adv.id}: ${adv.sourceTarget} — ${adv.description}`,
      blockerId: adv.id,
    });
  }

  return {
    clear: openBlockers.length === 0,
    openBlockers,
    advisories,
    issues,
  };
}

// ─── Sprint Gate Runner ──────────────────────────────────────

/**
 * Run the full Sprint Gate readiness check.
 *
 * @param {object} store - File store
 * @param {object} options
 * @param {string} options.sprintId - e.g. 'SP-5'
 * @param {Array<object>} options.stories - Sprint backlog items
 * @param {number} [options.plannedItems] - Override planned item count
 * @param {object} [options.paths] - Override file paths
 * @returns {{verdict: string, blockers: Array, steps: object, summary: object}}
 */
function runSprintGate(store: SprintGateStore, options: Record<string, unknown>) {
  const {
    sprintId,
    stories = [],
    plannedItems,
    paths = {},
    templateConfig = {},
  } = options as {
    sprintId: string;
    stories?: SprintStory[];
    plannedItems?: number;
    paths?: Record<string, string>;
    templateConfig?: Record<string, unknown>;
  };

  if (!sprintId) {
    return {
      verdict: 'NOT_READY',
      blockers: [
        {
          severity: 'CRITICAL',
          rule: 'NO_SPRINT_ID',
          description: 'Sprint ID is required for Sprint Gate',
        },
      ],
      steps: {},
      summary: {
        sprintId: null,
        verdict: 'NOT_READY',
        totalBlockers: 1,
        storyCount: 0,
        lessonsInjected: 0,
        promotionCandidates: 0,
        velocityRatio: 0,
        openBlockerCount: 0,
        advisoryCount: 0,
        decisionsLoaded: 0,
        activeCategoryCount: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Step 0: Decisions & reevaluate triggers
  const step0 = loadDecisionsAndTriggers(store, sprintId, paths, templateConfig);

  // Step 1: Definition of Ready
  const step1 = checkDefinitionOfReady(stories);

  // Step 2: Lessons-learned injection
  const step2 = loadLessonsLearned(store, paths.lessonsPath);

  // Step 3: Velocity capacity check
  const itemCount = plannedItems != null ? plannedItems : stories.length;
  const step3 = checkVelocityCapacity(store, itemCount, paths);

  // Step 4: Blocker check
  const step4 = checkBlockers(store, paths.blockerPath);

  // Step 5: Policy evaluation (M22)
  let step5: { report: EvaluationReport | null; blockingFailures: number } = {
    report: null,
    blockingFailures: 0,
  };
  const policyContext: EvaluationContext = {
    type: 'gate',
    scope: 'sprint',
    checks: ((options as Record<string, unknown>).policyChecks as Record<string, boolean>) || {},
    data: { sprintId },
  };
  const policyPackPaths = (paths as Record<string, string>).policyPackPaths
    ? String((paths as Record<string, string>).policyPackPaths).split(',')
    : undefined;
  const report = runPolicyEvaluation(store, policyContext, policyPackPaths);
  if (report) {
    step5 = {
      report,
      blockingFailures: report.summary.blocking_failures,
    };
  }

  // Collect all blocking issues
  const allBlockers = [];

  // Step 0 blockers: HIGH-priority open questions and pending reevaluate
  for (const q of step0.blockingQuestions) {
    allBlockers.push({
      severity: 'CRITICAL',
      rule: 'BLOCKING_QUESTION',
      description: `HIGH-priority open question ${q.id}: ${q.question}`,
      questionId: q.id,
    });
  }
  if (step0.reevaluate.pending) {
    allBlockers.push({
      severity: 'CRITICAL',
      rule: 'REEVALUATE_PENDING',
      description: `Reevaluation pending: ${step0.reevaluate.reason || 'no reason given'} (scope: ${step0.reevaluate.scope || 'unknown'})`,
    });
  }

  // Step 1 blockers
  allBlockers.push(...step1.issues.filter((i) => i.severity === 'CRITICAL'));

  // Step 3 blockers (over-capacity is MAJOR, not auto-blocking but tracked)
  allBlockers.push(...step3.issues.filter((i) => i.severity === 'CRITICAL'));

  // Step 4 blockers
  allBlockers.push(...step4.issues.filter((i) => i.severity === 'CRITICAL'));

  // Step 5 blockers: blocking policy failures
  if (step5.report) {
    for (const f of step5.report.failed) {
      if (f.severity === 'blocking') {
        allBlockers.push({
          severity: 'CRITICAL',
          rule: 'POLICY_VIOLATION',
          description: `Policy ${f.policy_id} (${f.policy_name}): ${f.message}`,
          policyId: f.policy_id,
        });
      }
    }
  }

  const verdict = allBlockers.length === 0 ? 'READY' : 'NOT_READY';

  const steps = {
    step0_decisions: {
      decisions: step0.decisions,
      blockingQuestions: step0.blockingQuestions,
      reevaluate: step0.reevaluate,
      activeCategories: step0.activeCategories,
    },
    step1_definitionOfReady: {
      ready: step1.ready,
      issues: step1.issues,
      storyCount: stories.length,
    },
    step2_lessonsLearned: {
      lessons: step2.lessons,
      count: step2.count,
      promotionCandidates: step2.promotionCandidates,
    },
    step3_velocityCapacity: {
      withinCapacity: step3.withinCapacity,
      plannedItems: step3.plannedItems,
      trailingAverage: step3.trailingAverage,
      ratio: step3.ratio,
      issues: step3.issues,
    },
    step4_blockerCheck: {
      clear: step4.clear,
      openBlockers: step4.openBlockers,
      advisories: step4.advisories,
      issues: step4.issues,
    },
    step5_policyEvaluation: step5.report
      ? {
          passed: step5.report.summary.passed,
          failed: step5.report.summary.failed,
          warnings: step5.report.summary.warnings,
          skipped: step5.report.summary.skipped,
          blocking_failures: step5.report.summary.blocking_failures,
          details: step5.report,
        }
      : null,
  };

  const summary = {
    sprintId,
    verdict,
    totalBlockers: allBlockers.length,
    storyCount: stories.length,
    lessonsInjected: step2.count,
    promotionCandidates: step2.promotionCandidates.length,
    velocityRatio: step3.ratio,
    openBlockerCount: step4.openBlockers.length,
    advisoryCount: step4.advisories.length,
    decisionsLoaded: step0.decisions.length,
    activeCategoryCount: step0.activeCategories.length,
    policyFailures: step5.report?.summary.failed ?? 0,
    policyWarnings: step5.report?.summary.warnings ?? 0,
    timestamp: new Date().toISOString(),
  };

  return { verdict, blockers: allBlockers, steps, summary };
}

// ─── Sprint Boundary Trend Computation (M7 / Issue #374) ────

const METRICS_STORE_PATH = 'BusinessDocs/metrics/time-series-metrics.json';

/**
 * Compute and persist velocity trends at a sprint boundary.
 *
 * Reads the velocity log to build sprint history, computes trend entries,
 * records the current sprint's metrics into the time-series store, and
 * optionally includes DORA metrics.
 *
 * @param store - File store for reading/writing
 * @param sprintMetrics - Completed sprint's metrics
 * @param doraReport - Optional DORA report for the sprint period
 * @param opts - Override file paths
 * @returns Computed velocity trend entries and updated metrics store
 */
function computeAndPersistSprintTrends(
  store: SprintGateStore,
  sprintMetrics: SprintMetrics,
  doraReport?: DoraReport,
  opts: { velocityPath?: string; metricsPath?: string; windowSize?: number } = {}
) {
  const velocityPath = opts.velocityPath || VELOCITY_LOG_PATH;
  const metricsPath = opts.metricsPath || METRICS_STORE_PATH;
  const windowSize = opts.windowSize || VELOCITY_WINDOW;

  // Load existing velocity data to build historical context
  let sprintHistory: SprintMetrics[] = [];
  if (store.exists(velocityPath)) {
    try {
      const raw = JSON.parse(store.readFile(velocityPath));
      const sprints = raw.sprints || [];
      sprintHistory = sprints.map((s: Record<string, unknown>) => ({
        sprint_id: (s.sprint_id as string) || '',
        started_at: (s.started_at as string) || (s.date as string) || '',
        ended_at: (s.ended_at as string) || (s.date as string) || '',
        planned_points: (s.planned_items as number) || (s.planned_points as number) || 0,
        completed_points: (s.completed_items as number) || (s.completed_points as number) || 0,
        tasks_completed: (s.tasks_completed as number) || (s.completed_items as number) || 0,
        tasks_carried_over: (s.tasks_carried_over as number) || (s.carried_over as number) || 0,
        defects_found: (s.defects_found as number) || 0,
        defects_fixed: (s.defects_fixed as number) || 0,
      }));
    } catch {
      sprintHistory = [];
    }
  }

  // Include current sprint if not already present
  if (!sprintHistory.some((s) => s.sprint_id === sprintMetrics.sprint_id)) {
    sprintHistory.push(sprintMetrics);
  }

  // Compute trend entries
  const trendEntries = computeVelocityTrendEntry(sprintHistory, windowSize);

  // Load or create time-series metrics store
  let metricsStore: MetricsStore;
  try {
    metricsStore = store.exists(metricsPath)
      ? deserializeMetricsStore(store.readFile(metricsPath))
      : createMetricsStore();
  } catch {
    metricsStore = createMetricsStore();
  }

  // Record sprint boundary data
  recordSprintBoundary(metricsStore, sprintMetrics, doraReport);

  // Persist
  try {
    const dir = metricsPath.replace(/[/\\][^/\\]+$/, '');
    if (dir && !store.exists(dir)) {
      // Use writeFile on the store if mkdirp not available
    }
    (store as unknown as { writeFile(p: string, d: string): void }).writeFile(
      metricsPath,
      serializeMetricsStore(metricsStore)
    );
  } catch {
    // Metrics persistence failure is non-fatal
  }

  return {
    trendEntries,
    currentSprint: trendEntries.find((e) => e.sprint_id === sprintMetrics.sprint_id) || null,
    metricsStore,
  };
}

export {
  DECISIONS_PATH,
  LESSONS_LEARNED_PATH,
  VELOCITY_LOG_PATH,
  BLOCKER_MATRIX_PATH,
  REEVALUATE_TRIGGER_PATH,
  VELOCITY_WINDOW,
  CAPACITY_THRESHOLD,
  METRICS_STORE_PATH,
  parseDecisions,
  loadReevaluateTrigger,
  loadDecisionsAndTriggers,
  checkDefinitionOfReady,
  parseLessonsLearned,
  loadLessonsLearned,
  findPromotionCandidates,
  parseVelocityLog,
  checkVelocityCapacity,
  checkBlockers,
  parseBlockerMatrix,
  runSprintGate,
  computeAndPersistSprintTrends,
};
