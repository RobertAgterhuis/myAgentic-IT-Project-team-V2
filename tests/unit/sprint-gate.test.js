'use strict';

/**
 * Sprint Gate — Unit Tests (FEAT-05-D)
 *
 * Covers all 7 ACs:
 *   AC-1: Sprint Gate fires before Phase 5 (state machine integration)
 *   AC-2: Load reevaluate triggers and decisions from decisions.md
 *   AC-3: Definition of Ready — stories have ACs, estimates, deps resolved
 *   AC-4: Lessons-learned injection from retrospectives
 *   AC-5: Velocity-based capacity check (planned SP vs trailing average)
 *   AC-6: Blocker check — cross-team BLOCKING + OPEN items
 *   AC-7: READY/NOT_READY verdict with blockers list
 */

const {
  parseDecisions,
  loadReevaluateTrigger,
  loadDecisionsAndTriggers,
  checkDefinitionOfReady,
  parseLessonsLearned,
  loadLessonsLearned,
  parseVelocityLog,
  checkVelocityCapacity,
  parseBlockerMatrix,
  checkBlockers,
  runSprintGate,
  DECISIONS_PATH,
  LESSONS_LEARNED_PATH,
  VELOCITY_LOG_PATH,
  BLOCKER_MATRIX_PATH,
  REEVALUATE_TRIGGER_PATH,
  VELOCITY_WINDOW,
  CAPACITY_THRESHOLD,
} = require('../../platform/engine/sprint-gate');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

/** Build a valid decisions.md with open questions and categories */
function buildDecisionsMd(opts = {}) {
  const openQ = opts.openQuestions || [];
  const decided = opts.decided || [];
  const categories = opts.categories || [];

  const lines = [
    '# Decisions Log',
    '',
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Your answer | Date |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  if (openQ.length === 0) {
    lines.push('| — | — | — | No open questions remaining | — | — |');
  } else {
    for (const q of openQ) {
      lines.push(
        `| ${q.id} | ${q.priority} | ${q.scope} | ${q.question} | ${q.answer || ''} | ${q.date || ''} |`
      );
    }
  }
  lines.push(
    '',
    '## Decision Categories',
    '',
    '| Stack | File | Count | Status | Applicable |',
    '| --- | --- | --- | --- | --- |'
  );
  for (const c of categories) {
    lines.push(
      `| ${c.stack} | [${c.file}](decisions/${c.file}) | ${c.count} | ${c.status} | ${c.applicable} |`
    );
  }
  lines.push(
    '',
    '### Uncategorized Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '| --- | --- | --- | --- | --- | --- |'
  );
  for (const d of decided) {
    lines.push(
      `| ${d.id} | ${d.priority} | ${d.scope} | ${d.decision} | ${d.notes || ''} | ${d.date || ''} |`
    );
  }
  return lines.join('\n');
}

/** Build a valid lessons-learned.md */
function buildLessonsLearnedMd(opts = {}) {
  const sprintLessons = opts.sprintLessons || [];
  const topN = opts.topLessons || [];

  const lines = [
    '# Lessons Learned — Cumulative Log',
    '',
    '## Sprint 4 Lessons',
    '',
    '| ID | Lesson | Type | Applies To | Sprint N Action |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const l of sprintLessons) {
    lines.push(`| ${l.id} | ${l.lesson} | ${l.type} | ${l.appliesTo} | ${l.action || 'Monitor'} |`);
  }
  if (topN.length > 0) {
    lines.push('', '## Top 3 Lessons for Sprint 5 Injection', '');
    topN.forEach((l, i) => {
      lines.push(`${i + 1}. **${l.id} — ${l.lesson}**`);
    });
  }
  return lines.join('\n');
}

/** Build a valid velocity-log.json */
function buildVelocityLogJson(sprints = []) {
  return JSON.stringify(
    {
      schema: '1.0',
      project: 'test-project',
      sprints: sprints.map((s) => ({
        sprint_id: s.id,
        planned_items: s.planned,
        completed_items: s.completed,
        velocity_percent:
          s.completed && s.planned ? Math.round((s.completed / s.planned) * 100) : 0,
        daily_velocity: [],
      })),
    },
    null,
    2
  );
}

/** Build a valid cross-team-blocker-matrix.md */
function buildBlockerMatrixMd(blockers = []) {
  const lines = [
    '# Cross-Team Blocker Matrix',
    '',
    '| Blocker ID | Source -> Target | Description | Classification | Resolution Status | Source |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const b of blockers) {
    lines.push(
      `| ${b.id} | ${b.sourceTarget} | ${b.description} | ${b.classification} | ${b.status} | ${b.source || 'analysis'} |`
    );
  }
  return lines.join('\n');
}

/** Build a valid story object */
function buildStory(overrides = {}) {
  return {
    id: 'STORY-1',
    title: 'Implement login flow',
    acceptanceCriteria: ['User can log in with email and password'],
    estimate: 3,
    dependencies: [],
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════
// EXPORTS & CONSTANTS
// ═════════════════════════════════════════════════════════════

describe('sprint-gate constants', () => {
  test('exports expected default paths', () => {
    expect(DECISIONS_PATH).toBe('BusinessDocs/decisions.md');
    expect(LESSONS_LEARNED_PATH).toBe('BusinessDocs/retrospectives/lessons-learned.md');
    expect(VELOCITY_LOG_PATH).toBe('BusinessDocs/retrospectives/velocity-log.json');
    expect(BLOCKER_MATRIX_PATH).toBe('BusinessDocs/synthesis/cross-team-blocker-matrix.md');
    expect(REEVALUATE_TRIGGER_PATH).toBe('BusinessDocs/session/reevaluate-trigger.json');
  });

  test('exports velocity window and capacity threshold', () => {
    expect(VELOCITY_WINDOW).toBe(3);
    expect(CAPACITY_THRESHOLD).toBe(1.2);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-2: DECISIONS & REEVALUATE TRIGGERS
// ═════════════════════════════════════════════════════════════

describe('parseDecisions', () => {
  test('parses open questions from decisions.md', () => {
    const md = buildDecisionsMd({
      openQuestions: [
        { id: 'Q1', priority: 'HIGH', scope: 'Phase 5', question: 'What auth provider?' },
        { id: 'Q2', priority: 'LOW', scope: 'All', question: 'Preferred DB?' },
      ],
    });
    const result = parseDecisions(md);
    expect(result.openQuestions).toHaveLength(2);
    expect(result.openQuestions[0].id).toBe('Q1');
    expect(result.openQuestions[0].priority).toBe('HIGH');
    expect(result.openQuestions[1].id).toBe('Q2');
  });

  test('parses uncategorized decisions', () => {
    const md = buildDecisionsMd({
      decided: [{ id: 'DEC-001', priority: 'HIGH', scope: 'Tech', decision: 'Use PostgreSQL' }],
    });
    const result = parseDecisions(md);
    expect(result.decided).toHaveLength(1);
    expect(result.decided[0].id).toBe('DEC-001');
    expect(result.decided[0].decision).toBe('Use PostgreSQL');
  });

  test('parses category table with ACTIVE/DEFERRED status', () => {
    const md = buildDecisionsMd({
      categories: [
        {
          stack: 'Architecture',
          file: 'architecture.md',
          count: 5,
          status: 'ACTIVE',
          applicable: 'Phase 2',
        },
        { stack: 'Legal', file: 'legal.md', count: 2, status: 'DEFERRED', applicable: 'Phase 2' },
      ],
    });
    const result = parseDecisions(md);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].status).toBe('ACTIVE');
    expect(result.categories[1].status).toBe('DEFERRED');
  });

  test('ignores placeholder rows', () => {
    const md = buildDecisionsMd();
    const result = parseDecisions(md);
    expect(result.openQuestions).toHaveLength(0);
    expect(result.decided).toHaveLength(0);
  });

  test('handles empty string', () => {
    const result = parseDecisions('');
    expect(result.decided).toHaveLength(0);
    expect(result.openQuestions).toHaveLength(0);
    expect(result.categories).toHaveLength(0);
  });
});

describe('loadReevaluateTrigger', () => {
  test('returns pending: false when file missing', () => {
    const store = createMockStore({});
    const result = loadReevaluateTrigger(store);
    expect(result).toEqual({ pending: false, scope: null, reason: null });
  });

  test('detects PENDING trigger', () => {
    const store = createMockStore({
      [REEVALUATE_TRIGGER_PATH]: JSON.stringify({
        status: 'PENDING',
        scope: 'TECH',
        reason: 'Architecture pivot',
      }),
    });
    const result = loadReevaluateTrigger(store);
    expect(result.pending).toBe(true);
    expect(result.scope).toBe('TECH');
    expect(result.reason).toBe('Architecture pivot');
  });

  test('returns pending: false for non-PENDING status', () => {
    const store = createMockStore({
      [REEVALUATE_TRIGGER_PATH]: JSON.stringify({ status: 'COMPLETED' }),
    });
    const result = loadReevaluateTrigger(store);
    expect(result.pending).toBe(false);
  });

  test('handles malformed JSON gracefully', () => {
    const store = createMockStore({
      [REEVALUATE_TRIGGER_PATH]: '{{bad json',
    });
    const result = loadReevaluateTrigger(store);
    expect(result).toEqual({ pending: false, scope: null, reason: null });
  });
});

describe('loadDecisionsAndTriggers', () => {
  test('returns blocking HIGH-priority open questions scoped to sprint', () => {
    const store = createMockStore({
      [DECISIONS_PATH]: buildDecisionsMd({
        openQuestions: [
          { id: 'Q1', priority: 'HIGH', scope: 'Phase 5', question: 'Auth provider?' },
          { id: 'Q2', priority: 'LOW', scope: 'Phase 5', question: 'Color scheme?' },
          { id: 'Q3', priority: 'HIGH', scope: 'Phase 2', question: 'DB choice?' },
        ],
      }),
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.blockingQuestions).toHaveLength(1);
    expect(result.blockingQuestions[0].id).toBe('Q1');
  });

  test('HIGH-priority questions with scope "All" are blocking', () => {
    const store = createMockStore({
      [DECISIONS_PATH]: buildDecisionsMd({
        openQuestions: [{ id: 'Q1', priority: 'HIGH', scope: 'All', question: 'Global question?' }],
      }),
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.blockingQuestions).toHaveLength(1);
  });

  test('includes active categories', () => {
    const store = createMockStore({
      [DECISIONS_PATH]: buildDecisionsMd({
        categories: [
          { stack: 'Tech', file: 'tech.md', count: 3, status: 'ACTIVE', applicable: 'Phase 2' },
          { stack: 'Legal', file: 'legal.md', count: 1, status: 'DEFERRED', applicable: 'Phase 2' },
        ],
      }),
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.activeCategories).toHaveLength(1);
    expect(result.activeCategories[0].stack).toBe('Tech');
  });

  test('handles missing decisions file gracefully', () => {
    const store = createMockStore({});
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.blockingQuestions).toHaveLength(0);
    expect(result.decisions).toHaveLength(0);
  });

  test('detects pending reevaluate trigger', () => {
    const store = createMockStore({
      [DECISIONS_PATH]: buildDecisionsMd(),
      [REEVALUATE_TRIGGER_PATH]: JSON.stringify({
        status: 'PENDING',
        scope: 'ALL',
        reason: 'Market shift',
      }),
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.reevaluate.pending).toBe(true);
    expect(result.reevaluate.reason).toBe('Market shift');
  });
});

// ═════════════════════════════════════════════════════════════
// AC-3: DEFINITION OF READY
// ═════════════════════════════════════════════════════════════

describe('checkDefinitionOfReady', () => {
  test('passes when all stories meet DoR', () => {
    const stories = [buildStory({ id: 'S-1' }), buildStory({ id: 'S-2', estimate: 5 })];
    const result = checkDefinitionOfReady(stories);
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('fails on empty backlog', () => {
    const result = checkDefinitionOfReady([]);
    expect(result.ready).toBe(false);
    expect(result.issues[0].rule).toBe('NO_STORIES');
  });

  test('fails on null/undefined stories', () => {
    const result = checkDefinitionOfReady(null);
    expect(result.ready).toBe(false);
  });

  test('flags missing title', () => {
    const result = checkDefinitionOfReady([buildStory({ title: '' })]);
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.rule === 'MISSING_TITLE')).toBe(true);
  });

  test('flags missing acceptance criteria', () => {
    const result = checkDefinitionOfReady([buildStory({ acceptanceCriteria: [] })]);
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.rule === 'MISSING_AC')).toBe(true);
  });

  test('flags zero estimate as MAJOR (not CRITICAL)', () => {
    const result = checkDefinitionOfReady([buildStory({ estimate: 0 })]);
    // MAJOR doesn't block, so ready = true (only CRITICAL blocks)
    expect(result.ready).toBe(true);
    expect(result.issues.some((i) => i.rule === 'MISSING_ESTIMATE')).toBe(true);
    expect(result.issues.find((i) => i.rule === 'MISSING_ESTIMATE').severity).toBe('MAJOR');
  });

  test('flags unresolved dependencies', () => {
    const stories = [
      buildStory({
        dependencies: [
          { id: 'DEP-1', status: 'RESOLVED' },
          { id: 'DEP-2', status: 'OPEN', description: 'Needs API v2' },
        ],
      }),
    ];
    const result = checkDefinitionOfReady(stories);
    expect(result.ready).toBe(false);
    expect(result.issues.some((i) => i.rule === 'UNRESOLVED_DEPENDENCY')).toBe(true);
  });

  test('passes when all dependencies are resolved', () => {
    const stories = [
      buildStory({
        dependencies: [{ id: 'DEP-1', status: 'RESOLVED' }],
      }),
    ];
    const result = checkDefinitionOfReady(stories);
    expect(result.ready).toBe(true);
  });

  test('accumulates multiple issues from multiple stories', () => {
    const stories = [
      buildStory({ id: 'S-1', title: '' }),
      buildStory({ id: 'S-2', acceptanceCriteria: [] }),
    ];
    const result = checkDefinitionOfReady(stories);
    expect(result.ready).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-4: LESSONS-LEARNED INJECTION
// ═════════════════════════════════════════════════════════════

describe('parseLessonsLearned', () => {
  test('extracts "Top N Lessons" injection section', () => {
    const md = buildLessonsLearnedMd({
      topLessons: [
        { id: 'L5', lesson: 'Split large stories early' },
        { id: 'L8', lesson: 'Run integration tests in CI' },
        { id: 'L12', lesson: 'Validate contracts before gate' },
      ],
    });
    const lessons = parseLessonsLearned(md);
    expect(lessons).toHaveLength(3);
    expect(lessons[0].id).toBe('L5');
    expect(lessons[0].lesson).toBe('Split large stories early');
    expect(lessons[0].type).toBe('injection');
  });

  test('falls back to latest sprint table when no injection section', () => {
    const md = buildLessonsLearnedMd({
      sprintLessons: [
        { id: 'L1', lesson: 'Write tests first', type: 'Process', appliesTo: 'All' },
        { id: 'L2', lesson: 'Review deps weekly', type: 'Planning', appliesTo: 'Tech' },
      ],
    });
    const lessons = parseLessonsLearned(md);
    expect(lessons).toHaveLength(2);
    expect(lessons[0].id).toBe('L1');
    expect(lessons[1].type).toBe('Planning');
  });

  test('returns empty array for empty content', () => {
    expect(parseLessonsLearned('')).toHaveLength(0);
  });

  test('returns empty array for content without lessons tables', () => {
    expect(parseLessonsLearned('# Title\n\nSome text.')).toHaveLength(0);
  });
});

describe('loadLessonsLearned', () => {
  test('loads and parses from store', () => {
    const store = createMockStore({
      [LESSONS_LEARNED_PATH]: buildLessonsLearnedMd({
        topLessons: [{ id: 'L1', lesson: 'Always run tests' }],
      }),
    });
    const result = loadLessonsLearned(store);
    expect(result.count).toBe(1);
    expect(result.lessons[0].id).toBe('L1');
  });

  test('returns empty when file does not exist', () => {
    const store = createMockStore({});
    const result = loadLessonsLearned(store);
    expect(result.count).toBe(0);
    expect(result.lessons).toHaveLength(0);
  });

  test('accepts custom path', () => {
    const customPath = 'custom/lessons.md';
    const store = createMockStore({
      [customPath]: buildLessonsLearnedMd({
        sprintLessons: [{ id: 'L7', lesson: 'Custom lesson', type: 'Technical', appliesTo: 'Dev' }],
      }),
    });
    const result = loadLessonsLearned(store, customPath);
    expect(result.count).toBe(1);
  });

  test('returns promotionCandidates for PROMOTE_TO_DECISION flagged lessons', () => {
    const md = [
      '# Lessons Learned',
      '',
      '## Sprint 4 Lessons',
      '',
      '| ID | Lesson | Type | Applies To | Sprint N Action |',
      '| --- | --- | --- | --- | --- |',
      '| L1 | Write tests first | Process | All | Monitor |',
      '| L2 | Split large stories | VELOCITY | Tech | PROMOTE_TO_DECISION |',
    ].join('\n');
    const store = createMockStore({ [LESSONS_LEARNED_PATH]: md });
    const result = loadLessonsLearned(store);
    expect(result.promotionCandidates).toHaveLength(1);
    expect(result.promotionCandidates[0].id).toBe('L2');
    expect(result.promotionCandidates[0].lesson).toBe('Split large stories');
  });

  test('returns empty promotionCandidates when no flagged lessons', () => {
    const store = createMockStore({
      [LESSONS_LEARNED_PATH]: buildLessonsLearnedMd({
        sprintLessons: [{ id: 'L1', lesson: 'Normal lesson', type: 'Process', appliesTo: 'All' }],
      }),
    });
    const result = loadLessonsLearned(store);
    expect(result.promotionCandidates).toHaveLength(0);
  });

  test('returns empty promotionCandidates when file does not exist', () => {
    const store = createMockStore({});
    const result = loadLessonsLearned(store);
    expect(result.promotionCandidates).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-5: VELOCITY-BASED CAPACITY CHECK
// ═════════════════════════════════════════════════════════════

describe('parseVelocityLog', () => {
  test('computes trailing average from last 3 sprints', () => {
    const json = buildVelocityLogJson([
      { id: 'SP-1', planned: 10, completed: 8 },
      { id: 'SP-2', planned: 10, completed: 9 },
      { id: 'SP-3', planned: 10, completed: 7 },
      { id: 'SP-4', planned: 10, completed: 10 },
    ]);
    const result = parseVelocityLog(json);
    // Last 3: SP-2(9), SP-3(7), SP-4(10) → avg = 26/3 ≈ 8.67
    expect(result.trailingAverage).toBeCloseTo(8.67, 1);
    expect(result.sprintCount).toBe(3);
  });

  test('handles fewer sprints than window', () => {
    const json = buildVelocityLogJson([{ id: 'SP-1', planned: 10, completed: 8 }]);
    const result = parseVelocityLog(json);
    expect(result.trailingAverage).toBe(8);
    expect(result.sprintCount).toBe(1);
  });

  test('returns zero for empty sprints', () => {
    const json = buildVelocityLogJson([]);
    const result = parseVelocityLog(json);
    expect(result.trailingAverage).toBe(0);
    expect(result.sprintCount).toBe(0);
  });

  test('handles invalid JSON gracefully', () => {
    const result = parseVelocityLog('{{broken');
    expect(result.trailingAverage).toBe(0);
  });

  test('respects custom window size', () => {
    const json = buildVelocityLogJson([
      { id: 'SP-1', planned: 10, completed: 6 },
      { id: 'SP-2', planned: 10, completed: 8 },
      { id: 'SP-3', planned: 10, completed: 10 },
    ]);
    // Window=2: last 2 → SP-2(8) + SP-3(10) = 9
    const result = parseVelocityLog(json, 2);
    expect(result.trailingAverage).toBe(9);
    expect(result.sprintCount).toBe(2);
  });
});

describe('checkVelocityCapacity', () => {
  test('within capacity when planned <= trailing avg * threshold', () => {
    const store = createMockStore({
      [VELOCITY_LOG_PATH]: buildVelocityLogJson([
        { id: 'SP-1', planned: 10, completed: 8 },
        { id: 'SP-2', planned: 10, completed: 9 },
        { id: 'SP-3', planned: 10, completed: 10 },
      ]),
    });
    // Avg = 9, threshold 1.2 → max = 10.8
    const result = checkVelocityCapacity(store, 10);
    expect(result.withinCapacity).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('over capacity when planned exceeds trailing avg * threshold', () => {
    const store = createMockStore({
      [VELOCITY_LOG_PATH]: buildVelocityLogJson([
        { id: 'SP-1', planned: 10, completed: 5 },
        { id: 'SP-2', planned: 10, completed: 5 },
        { id: 'SP-3', planned: 10, completed: 5 },
      ]),
    });
    // Avg = 5, threshold 1.2, max = 6. Planned = 10 → over capacity
    const result = checkVelocityCapacity(store, 10);
    expect(result.withinCapacity).toBe(false);
    expect(result.issues[0].rule).toBe('OVER_CAPACITY');
  });

  test('skips check when velocity file missing', () => {
    const store = createMockStore({});
    const result = checkVelocityCapacity(store, 10);
    expect(result.withinCapacity).toBe(true);
    expect(result.issues[0].rule).toBe('NO_VELOCITY_DATA');
  });

  test('reports ratio correctly', () => {
    const store = createMockStore({
      [VELOCITY_LOG_PATH]: buildVelocityLogJson([
        { id: 'SP-1', planned: 10, completed: 10 },
        { id: 'SP-2', planned: 10, completed: 10 },
        { id: 'SP-3', planned: 10, completed: 10 },
      ]),
    });
    const result = checkVelocityCapacity(store, 12);
    expect(result.ratio).toBe(1.2);
    expect(result.withinCapacity).toBe(true); // 1.2 <= 1.2
  });

  test('accepts custom capacity threshold', () => {
    const store = createMockStore({
      [VELOCITY_LOG_PATH]: buildVelocityLogJson([{ id: 'SP-1', planned: 10, completed: 10 }]),
    });
    // Avg = 10, planned = 11, threshold 1.0 → 11/10 = 1.1 > 1.0
    const result = checkVelocityCapacity(store, 11, { capacityThreshold: 1.0 });
    expect(result.withinCapacity).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-6: BLOCKER CHECK
// ═════════════════════════════════════════════════════════════

describe('parseBlockerMatrix', () => {
  test('parses blocker table with classification and status', () => {
    const md = buildBlockerMatrixMd([
      {
        id: 'BLK-001',
        sourceTarget: 'Tech → UX',
        description: 'API schema pending',
        classification: 'BLOCKING',
        status: 'OPEN',
      },
      {
        id: 'BLK-002',
        sourceTarget: 'UX → Marketing',
        description: 'Brand colors TBD',
        classification: 'ADVISORY',
        status: 'RESOLVED',
      },
    ]);
    const result = parseBlockerMatrix(md);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('BLK-001');
    expect(result[0].classification).toBe('BLOCKING');
    expect(result[0].status).toBe('OPEN');
    expect(result[1].status).toBe('RESOLVED');
  });

  test('returns empty array for empty content', () => {
    expect(parseBlockerMatrix('')).toHaveLength(0);
  });

  test('normalizes classification and status to uppercase', () => {
    const md = [
      '| Blocker ID | Source -> Target | Description | Classification | Resolution Status | Source |',
      '| --- | --- | --- | --- | --- | --- |',
      '| BLK-001 | A → B | Desc | blocking | open | test |',
    ].join('\n');
    const result = parseBlockerMatrix(md);
    expect(result[0].classification).toBe('BLOCKING');
    expect(result[0].status).toBe('OPEN');
  });
});

describe('checkBlockers', () => {
  test('clear when no BLOCKING+OPEN items', () => {
    const store = createMockStore({
      [BLOCKER_MATRIX_PATH]: buildBlockerMatrixMd([
        {
          id: 'BLK-001',
          sourceTarget: 'A → B',
          description: 'Done',
          classification: 'BLOCKING',
          status: 'RESOLVED',
        },
        {
          id: 'BLK-002',
          sourceTarget: 'C → D',
          description: 'FYI',
          classification: 'ADVISORY',
          status: 'OPEN',
        },
      ]),
    });
    const result = checkBlockers(store);
    expect(result.clear).toBe(true);
    expect(result.openBlockers).toHaveLength(0);
    expect(result.advisories).toHaveLength(1);
  });

  test('not clear when BLOCKING+OPEN items exist', () => {
    const store = createMockStore({
      [BLOCKER_MATRIX_PATH]: buildBlockerMatrixMd([
        {
          id: 'BLK-001',
          sourceTarget: 'Tech → UX',
          description: 'API schema',
          classification: 'BLOCKING',
          status: 'OPEN',
        },
      ]),
    });
    const result = checkBlockers(store);
    expect(result.clear).toBe(false);
    expect(result.openBlockers).toHaveLength(1);
    expect(result.issues.some((i) => i.rule === 'OPEN_BLOCKER')).toBe(true);
  });

  test('handles missing blocker matrix file', () => {
    const store = createMockStore({});
    const result = checkBlockers(store);
    expect(result.clear).toBe(true);
    expect(result.issues[0].rule).toBe('NO_BLOCKER_MATRIX');
  });

  test('categorizes DEFERRED blockers as resolved (not open)', () => {
    const store = createMockStore({
      [BLOCKER_MATRIX_PATH]: buildBlockerMatrixMd([
        {
          id: 'BLK-001',
          sourceTarget: 'A → B',
          description: 'Deferred item',
          classification: 'BLOCKING',
          status: 'DEFERRED',
        },
      ]),
    });
    const result = checkBlockers(store);
    expect(result.clear).toBe(true);
    expect(result.openBlockers).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-7: SPRINT GATE RUNNER — VERDICT
// ═════════════════════════════════════════════════════════════

describe('runSprintGate', () => {
  function buildFullStore(overrides = {}) {
    return createMockStore({
      [DECISIONS_PATH]: overrides.decisions || buildDecisionsMd(),
      [LESSONS_LEARNED_PATH]:
        overrides.lessons ||
        buildLessonsLearnedMd({
          topLessons: [{ id: 'L5', lesson: 'Split large stories' }],
        }),
      [VELOCITY_LOG_PATH]:
        overrides.velocity ||
        buildVelocityLogJson([
          { id: 'SP-1', planned: 10, completed: 8 },
          { id: 'SP-2', planned: 10, completed: 9 },
          { id: 'SP-3', planned: 10, completed: 10 },
        ]),
      [BLOCKER_MATRIX_PATH]:
        overrides.blockers ||
        buildBlockerMatrixMd([
          {
            id: 'BLK-001',
            sourceTarget: 'A → B',
            description: 'Resolved',
            classification: 'BLOCKING',
            status: 'RESOLVED',
          },
        ]),
      ...(overrides.extra || {}),
    });
  }

  test('returns READY when all checks pass', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory(), buildStory({ id: 'S-2', title: 'Logout' })],
    });
    expect(result.verdict).toBe('READY');
    expect(result.blockers).toHaveLength(0);
    expect(result.summary.sprintId).toBe('SP-5');
    expect(result.summary.storyCount).toBe(2);
  });

  test('returns NOT_READY when stories lack ACs', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory({ acceptanceCriteria: [] })],
    });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers.some((b) => b.rule === 'MISSING_AC')).toBe(true);
  });

  test('returns NOT_READY when HIGH-priority open question exists', () => {
    const store = buildFullStore({
      decisions: buildDecisionsMd({
        openQuestions: [
          { id: 'Q1', priority: 'HIGH', scope: 'Phase 5', question: 'Critical question?' },
        ],
      }),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers.some((b) => b.rule === 'BLOCKING_QUESTION')).toBe(true);
  });

  test('returns NOT_READY when reevaluate trigger is pending', () => {
    const store = buildFullStore({
      extra: {
        [REEVALUATE_TRIGGER_PATH]: JSON.stringify({
          status: 'PENDING',
          scope: 'ALL',
          reason: 'Pivot',
        }),
      },
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers.some((b) => b.rule === 'REEVALUATE_PENDING')).toBe(true);
  });

  test('returns NOT_READY when open BLOCKING items exist', () => {
    const store = buildFullStore({
      blockers: buildBlockerMatrixMd([
        {
          id: 'BLK-005',
          sourceTarget: 'Tech → UX',
          description: 'Unresolved',
          classification: 'BLOCKING',
          status: 'OPEN',
        },
      ]),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers.some((b) => b.rule === 'OPEN_BLOCKER')).toBe(true);
  });

  test('injects lessons-learned into step2', () => {
    const store = buildFullStore({
      lessons: buildLessonsLearnedMd({
        topLessons: [
          { id: 'L5', lesson: 'Split stories early' },
          { id: 'L8', lesson: 'Validate contracts' },
        ],
      }),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.steps.step2_lessonsLearned.count).toBe(2);
    expect(result.steps.step2_lessonsLearned.lessons[0].id).toBe('L5');
  });

  test('reports velocity ratio in step3', () => {
    const store = buildFullStore({
      velocity: buildVelocityLogJson([
        { id: 'SP-1', planned: 10, completed: 10 },
        { id: 'SP-2', planned: 10, completed: 10 },
        { id: 'SP-3', planned: 10, completed: 10 },
      ]),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
      plannedItems: 12,
    });
    // 12 / 10 = 1.2 → within threshold (1.2)
    expect(result.steps.step3_velocityCapacity.ratio).toBe(1.2);
    expect(result.steps.step3_velocityCapacity.withinCapacity).toBe(true);
  });

  test('returns NOT_READY when backlog is empty', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [],
    });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers.some((b) => b.rule === 'NO_STORIES')).toBe(true);
  });

  test('requires sprintId', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, { stories: [buildStory()] });
    expect(result.verdict).toBe('NOT_READY');
    expect(result.blockers[0].rule).toBe('NO_SPRINT_ID');
  });

  test('uses stories.length as default plannedItems for velocity check', () => {
    const store = buildFullStore({
      velocity: buildVelocityLogJson([
        { id: 'SP-1', planned: 10, completed: 2 },
        { id: 'SP-2', planned: 10, completed: 2 },
        { id: 'SP-3', planned: 10, completed: 2 },
      ]),
    });
    // 10 stories, avg = 2, ratio = 5.0 → over capacity
    const stories = Array.from({ length: 10 }, (_, i) => buildStory({ id: `S-${i + 1}` }));
    const result = runSprintGate(store, { sprintId: 'SP-5', stories });
    expect(result.steps.step3_velocityCapacity.plannedItems).toBe(10);
    // Over capacity is MAJOR not CRITICAL, doesn't auto-block
    expect(result.steps.step3_velocityCapacity.withinCapacity).toBe(false);
  });

  test('summary includes all aggregated metrics', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    const s = result.summary;
    expect(s).toHaveProperty('sprintId', 'SP-5');
    expect(s).toHaveProperty('verdict', 'READY');
    expect(s).toHaveProperty('totalBlockers');
    expect(s).toHaveProperty('storyCount');
    expect(s).toHaveProperty('lessonsInjected');
    expect(s).toHaveProperty('velocityRatio');
    expect(s).toHaveProperty('openBlockerCount');
    expect(s).toHaveProperty('advisoryCount');
    expect(s).toHaveProperty('decisionsLoaded');
    expect(s).toHaveProperty('activeCategoryCount');
    expect(s).toHaveProperty('timestamp');
  });

  test('steps object contains all 5 step results', () => {
    const store = buildFullStore();
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.steps).toHaveProperty('step0_decisions');
    expect(result.steps).toHaveProperty('step1_definitionOfReady');
    expect(result.steps).toHaveProperty('step2_lessonsLearned');
    expect(result.steps).toHaveProperty('step3_velocityCapacity');
    expect(result.steps).toHaveProperty('step4_blockerCheck');
  });

  test('handles gracefully when all data files are missing', () => {
    const store = createMockStore({});
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    // Should still produce a verdict (READY since no blockers detected from missing files)
    expect(result.verdict).toBe('READY');
    expect(result.steps.step2_lessonsLearned.count).toBe(0);
  });

  test('accepts custom paths for all data files', () => {
    const customPaths = {
      decisionsPath: 'custom/decisions.md',
      lessonsPath: 'custom/lessons.md',
      velocityPath: 'custom/velocity.json',
      blockerPath: 'custom/blockers.md',
      triggerPath: 'custom/trigger.json',
    };
    const store = createMockStore({
      'custom/decisions.md': buildDecisionsMd(),
      'custom/lessons.md': buildLessonsLearnedMd(),
      'custom/velocity.json': buildVelocityLogJson([{ id: 'SP-1', planned: 5, completed: 5 }]),
      'custom/blockers.md': buildBlockerMatrixMd([]),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
      paths: customPaths,
    });
    expect(result.verdict).toBe('READY');
  });

  test('collects blockers from multiple steps simultaneously', () => {
    const store = buildFullStore({
      decisions: buildDecisionsMd({
        openQuestions: [{ id: 'Q1', priority: 'HIGH', scope: 'All', question: 'Critical?' }],
      }),
      blockers: buildBlockerMatrixMd([
        {
          id: 'BLK-001',
          sourceTarget: 'A → B',
          description: 'Open blocker',
          classification: 'BLOCKING',
          status: 'OPEN',
        },
      ]),
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory({ acceptanceCriteria: [] })], // also fails DoR
    });
    expect(result.verdict).toBe('NOT_READY');
    // At least 3 blockers: BLOCKING_QUESTION + MISSING_AC + OPEN_BLOCKER
    expect(result.blockers.length).toBeGreaterThanOrEqual(3);
    const rules = result.blockers.map((b) => b.rule);
    expect(rules).toContain('BLOCKING_QUESTION');
    expect(rules).toContain('MISSING_AC');
    expect(rules).toContain('OPEN_BLOCKER');
  });

  test('includes promotionCandidates in step2 output', () => {
    const lessonsWithPromotion = [
      '# Lessons Learned',
      '',
      '## Sprint 4 Lessons',
      '',
      '| ID | Lesson | Type | Applies To | Sprint N Action |',
      '| --- | --- | --- | --- | --- |',
      '| L1 | Write tests first | Process | All | Monitor |',
      '| L2 | Split large stories | VELOCITY | Tech | PROMOTE_TO_DECISION |',
      '| L3 | Review deps weekly | Planning | All | PROMOTE_TO_DECISION |',
    ].join('\n');
    const store = buildFullStore({ lessons: lessonsWithPromotion });
    const result = runSprintGate(store, {
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.steps.step2_lessonsLearned.promotionCandidates).toHaveLength(2);
    expect(result.steps.step2_lessonsLearned.promotionCandidates[0].id).toBe('L2');
    expect(result.summary.promotionCandidates).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════
// AC-1: STATE MACHINE INTEGRATION (via engine)
// ═════════════════════════════════════════════════════════════

describe('engine integration — sprintGate', () => {
  // These tests verify that engine.js correctly wires runSprintGate
  // and emits SSE events (AC-1: Sprint Gate fires before Phase 5)

  const path = require('path');
  const fs = require('fs');
  const { createEngine } = require('../../platform/engine/engine');
  const FLOWS_PATH = path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml');
  const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

  function storeWithFlows(extraFiles = {}) {
    return createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
  }

  test('engine exposes sprintGate method', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });
    expect(typeof engine.sprintGate).toBe('function');
  });

  test('engine.sprintGate emits orchestrator:sprint_gate_ready SSE on READY', () => {
    const sseEvents = [];
    const store = storeWithFlows({
      [DECISIONS_PATH]: buildDecisionsMd(),
      [LESSONS_LEARNED_PATH]: buildLessonsLearnedMd(),
      [VELOCITY_LOG_PATH]: buildVelocityLogJson([{ id: 'SP-1', planned: 10, completed: 10 }]),
      [BLOCKER_MATRIX_PATH]: buildBlockerMatrixMd([]),
    });
    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sseNotify: (type, data) => sseEvents.push({ type, data }),
    });
    const result = engine.sprintGate({
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.verdict).toBe('READY');
    const readyEvent = sseEvents.find((e) => e.type === 'orchestrator:sprint_gate_ready');
    expect(readyEvent).toBeDefined();
    expect(readyEvent.data.sprintId).toBe('SP-5');
  });

  test('engine.sprintGate emits orchestrator:sprint_gate_blocked SSE on NOT_READY', () => {
    const sseEvents = [];
    const store = storeWithFlows({
      [DECISIONS_PATH]: buildDecisionsMd(),
      [BLOCKER_MATRIX_PATH]: buildBlockerMatrixMd([
        {
          id: 'BLK-001',
          sourceTarget: 'A → B',
          description: 'Blocks',
          classification: 'BLOCKING',
          status: 'OPEN',
        },
      ]),
    });
    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sseNotify: (type, data) => sseEvents.push({ type, data }),
    });
    const result = engine.sprintGate({
      sprintId: 'SP-5',
      stories: [buildStory()],
    });
    expect(result.verdict).toBe('NOT_READY');
    const blockedEvent = sseEvents.find((e) => e.type === 'orchestrator:sprint_gate_blocked');
    expect(blockedEvent).toBeDefined();
    expect(blockedEvent.data.blockerCount).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════
// #173 Hardening: edge-case coverage
// ═════════════════════════════════════════════════════════════

describe('parseBlockerMatrix — table end on non-pipe line', () => {
  test('stops parsing when table ends with non-pipe content', () => {
    const md = [
      '| Blocker ID | Source -> Target | Description | Classification | Resolution Status | Source |',
      '| --- | --- | --- | --- | --- | --- |',
      '| BLK-001 | A → B | Desc | BLOCKING | OPEN | test |',
      '',
      'Some paragraph text after the table.',
      '| BLK-002 | C → D | Desc2 | ADVISORY | OPEN | test |',
    ].join('\n');
    const result = parseBlockerMatrix(md);
    // Should only parse BLK-001 since table ended at empty line
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('BLK-001');
  });
});

describe('loadDecisionsAndTriggers — decision parsing edge cases', () => {
  test('ignores unknown ## heading in decisions file', () => {
    const decisionsContent = [
      '## Random Section', // unknown heading before any section — covers L77-79
      '',
      'Some text.',
      '',
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '| --- | --- | --- | --- | --- | --- |',
      '| Q-01 | HIGH | Tech | What DB? | PostgreSQL | 2026-01-01 |',
      '',
      '## Uncategorized Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '| --- | --- | --- | --- | --- | --- |',
      '| DEC-01 | HIGH | Tech | Use REST | n/a | 2026-01-01 |',
    ].join('\n');
    const store = createMockStore({
      [DECISIONS_PATH]: decisionsContent,
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.blockingQuestions).toHaveLength(0); // Q-01 scope is Tech, not SP-5/All
    expect(result.decisions).toHaveLength(1);
  });

  test('handles decisions file with only categories section', () => {
    const decisionsContent = [
      '## Decision Categories',
      '',
      '| Stack | File | Count | Status | Applicable |',
      '| --- | --- | --- | --- | --- |',
      '| Backend | [file](path) | 3 | ACTIVE | Yes |',
    ].join('\n');
    const store = createMockStore({
      [DECISIONS_PATH]: decisionsContent,
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5');
    expect(result.activeCategories).toHaveLength(1);
    expect(result.activeCategories[0].stack).toBe('Backend');
    expect(result.activeCategories[0].status).toBe('ACTIVE');
  });
});

/* ── loadDecisionsAndTriggers — templateConfig injection (S7) ── */

describe('loadDecisionsAndTriggers — templateConfig injection (S7)', () => {
  test('uses template decisionCategories for activeCategories when provided', () => {
    const decisionsContent = [
      '## Decision Categories',
      '',
      '| Stack | File | Count | Status | Applicable |',
      '| --- | --- | --- | --- | --- |',
      '| Backend | [file](path) | 3 | ACTIVE | Yes |',
      '| Frontend | [file](path) | 5 | DEFERRED | No |',
    ].join('\n');
    const store = createMockStore({
      [DECISIONS_PATH]: decisionsContent,
    });
    const templateConfig = {
      decisionCategories: [
        { file: 'back.md', name: 'Backend', defaultStatus: 'DEFERRED' },
        { file: 'front.md', name: 'Frontend', defaultStatus: 'ACTIVE' },
      ],
    };
    const result = loadDecisionsAndTriggers(store, 'SP-5', {}, templateConfig);
    // Template says Frontend is ACTIVE (overriding the markdown's DEFERRED)
    expect(result.activeCategories).toHaveLength(1);
    expect(result.activeCategories[0].name).toBe('Frontend');
  });

  test('falls back to markdown categories when templateConfig is empty', () => {
    const decisionsContent = [
      '## Decision Categories',
      '',
      '| Stack | File | Count | Status | Applicable |',
      '| --- | --- | --- | --- | --- |',
      '| Backend | [file](path) | 3 | ACTIVE | Yes |',
    ].join('\n');
    const store = createMockStore({
      [DECISIONS_PATH]: decisionsContent,
    });
    const result = loadDecisionsAndTriggers(store, 'SP-5', {}, {});
    expect(result.activeCategories).toHaveLength(1);
    expect(result.activeCategories[0].stack).toBe('Backend');
  });

  test('runSprintGate passes templateConfig to step 0', () => {
    const decisionsContent = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '| --- | --- | --- | --- | --- | --- |',
    ].join('\n');
    const store = createMockStore({
      [DECISIONS_PATH]: decisionsContent,
    });
    const result = runSprintGate(store, {
      sprintId: 'SP-1',
      stories: [
        { title: 'S', acceptanceCriteria: ['AC'], estimate: 3, dependenciesResolved: true },
      ],
      templateConfig: {
        decisionCategories: [{ file: 'a.md', name: 'Alpha', defaultStatus: 'ACTIVE' }],
      },
    });
    expect(result.steps.step0_decisions.activeCategories).toHaveLength(1);
    expect(result.steps.step0_decisions.activeCategories[0].name).toBe('Alpha');
  });
});

describe('checkBlockers — blocker classification edge', () => {
  test('non-BLOCKING non-ADVISORY items are not listed in openBlockers or advisories', () => {
    const md = [
      '| Blocker ID | Source -> Target | Description | Classification | Resolution Status | Source |',
      '| --- | --- | --- | --- | --- | --- |',
      '| BLK-001 | A → B | Some note | INFO | OPEN | test |',
    ].join('\n');
    const store = createMockStore({
      [BLOCKER_MATRIX_PATH]: md,
    });
    const result = checkBlockers(store);
    expect(result.clear).toBe(true);
    expect(result.openBlockers).toHaveLength(0);
    expect(result.advisories).toHaveLength(0);
  });
});
