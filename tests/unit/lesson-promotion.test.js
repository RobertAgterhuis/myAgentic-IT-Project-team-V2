/**
 * Lesson Promotion — Unit Tests (S6-3)
 *
 * Tests for the PROMOTE_TO_DECISION mechanism:
 *   - Finding promotion candidates in lessons-learned.md
 *   - Marking lessons as PROMOTED
 *   - Building decision text from lessons with source reference
 */

import * as __req_0 from '../../src/webapp/lesson-promotion';
const {
  PROMOTE_FLAG,
  PROMOTED_STATUS,
  findPromotionCandidates,
  markLessonPromoted,
  buildDecisionFromLesson,
} = __req_0;

// ─── Helpers ─────────────────────────────────────────────────

function buildLessonsTable(lessons) {
  const lines = [
    '# Lessons Learned — Cumulative Log',
    '',
    '## Sprint 4 Lessons',
    '',
    '| ID | Lesson | Type | Applies To | Sprint N Action |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const l of lessons) {
    lines.push(`| ${l.id} | ${l.lesson} | ${l.type} | ${l.appliesTo} | ${l.action || 'Monitor'} |`);
  }
  return lines.join('\n');
}

// ═════════════════════════════════════════════════════════════
// findPromotionCandidates
// ═════════════════════════════════════════════════════════════

describe('findPromotionCandidates', () => {
  test('finds lessons with PROMOTE_TO_DECISION flag', () => {
    const md = buildLessonsTable([
      {
        id: 'L1',
        lesson: 'Write tests first',
        type: 'Process',
        appliesTo: 'All',
        action: 'Monitor',
      },
      {
        id: 'L2',
        lesson: 'Split large stories',
        type: 'VELOCITY',
        appliesTo: 'Tech',
        action: PROMOTE_FLAG,
      },
      {
        id: 'L3',
        lesson: 'Review deps weekly',
        type: 'Planning',
        appliesTo: 'All',
        action: PROMOTE_FLAG,
      },
    ]);
    const candidates = findPromotionCandidates(md);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].id).toBe('L2');
    expect(candidates[0].lesson).toBe('Split large stories');
    expect(candidates[0].type).toBe('VELOCITY');
    expect(candidates[0].appliesTo).toBe('Tech');
    expect(candidates[1].id).toBe('L3');
  });

  test('returns empty when no lessons have the flag', () => {
    const md = buildLessonsTable([
      { id: 'L1', lesson: 'Write tests', type: 'Process', appliesTo: 'All', action: 'Monitor' },
    ]);
    expect(findPromotionCandidates(md)).toHaveLength(0);
  });

  test('returns empty for empty content', () => {
    expect(findPromotionCandidates('')).toHaveLength(0);
  });

  test('returns empty for null/undefined content', () => {
    expect(findPromotionCandidates(null)).toHaveLength(0);
    expect(findPromotionCandidates(undefined)).toHaveLength(0);
  });

  test('ignores header and separator rows', () => {
    const md = [
      '| ID | Lesson | Type | Applies To | Sprint N Action |',
      '| --- | --- | --- | --- | --- |',
      `| L1 | Test first | Process | All | ${PROMOTE_FLAG} |`,
    ].join('\n');
    const candidates = findPromotionCandidates(md);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('L1');
  });

  test('ignores already PROMOTED lessons', () => {
    const md = buildLessonsTable([
      {
        id: 'L1',
        lesson: 'Already promoted',
        type: 'Process',
        appliesTo: 'All',
        action: PROMOTED_STATUS,
      },
      {
        id: 'L2',
        lesson: 'Pending promotion',
        type: 'VELOCITY',
        appliesTo: 'Tech',
        action: PROMOTE_FLAG,
      },
    ]);
    const candidates = findPromotionCandidates(md);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('L2');
  });

  test('handles multiple sprint sections', () => {
    const md = [
      '# Lessons Learned',
      '',
      '## Sprint 3 Lessons',
      '',
      '| ID | Lesson | Type | Applies To | Sprint N Action |',
      '| --- | --- | --- | --- | --- |',
      `| L1 | Old lesson | Process | All | ${PROMOTE_FLAG} |`,
      '',
      '## Sprint 4 Lessons',
      '',
      '| ID | Lesson | Type | Applies To | Sprint N Action |',
      '| --- | --- | --- | --- | --- |',
      `| L2 | New lesson | VELOCITY | Tech | ${PROMOTE_FLAG} |`,
    ].join('\n');
    const candidates = findPromotionCandidates(md);
    expect(candidates).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════
// markLessonPromoted
// ═════════════════════════════════════════════════════════════

describe('markLessonPromoted', () => {
  test('replaces PROMOTE_TO_DECISION with PROMOTED for the given lesson', () => {
    const md = buildLessonsTable([
      { id: 'L1', lesson: 'Write tests', type: 'Process', appliesTo: 'All', action: 'Monitor' },
      {
        id: 'L2',
        lesson: 'Split stories',
        type: 'VELOCITY',
        appliesTo: 'Tech',
        action: PROMOTE_FLAG,
      },
    ]);
    const result = markLessonPromoted(md, 'L2');
    expect(result).toContain(PROMOTED_STATUS);
    expect(result).not.toContain(PROMOTE_FLAG);
    // L1 row should be unchanged
    expect(result).toContain('Monitor');
  });

  test('only marks the specified lesson ID', () => {
    const md = buildLessonsTable([
      { id: 'L1', lesson: 'First', type: 'A', appliesTo: 'All', action: PROMOTE_FLAG },
      { id: 'L2', lesson: 'Second', type: 'B', appliesTo: 'Tech', action: PROMOTE_FLAG },
    ]);
    const result = markLessonPromoted(md, 'L1');
    expect(result).toMatch(/L1.*PROMOTED/);
    expect(result).toMatch(/L2.*PROMOTE_TO_DECISION/);
  });

  test('returns content unchanged when lesson ID not found', () => {
    const md = buildLessonsTable([
      { id: 'L1', lesson: 'Test', type: 'A', appliesTo: 'All', action: PROMOTE_FLAG },
    ]);
    const result = markLessonPromoted(md, 'L99');
    expect(result).toBe(md);
  });
});

// ═════════════════════════════════════════════════════════════
// buildDecisionFromLesson
// ═════════════════════════════════════════════════════════════

describe('buildDecisionFromLesson', () => {
  test('creates decision text with source reference', () => {
    const lesson = {
      id: 'L5',
      lesson: 'Split large stories early',
      type: 'VELOCITY',
      appliesTo: 'Tech',
    };
    const { decision, notes } = buildDecisionFromLesson(lesson);
    expect(decision).toBe('Split large stories early');
    expect(notes).toContain('L5');
    expect(notes).toContain('VELOCITY');
    expect(notes).toContain('Tech');
    expect(notes).toMatch(/Promoted from lesson L5/);
  });

  test('includes all lesson metadata in notes', () => {
    const lesson = { id: 'L12', lesson: 'Validate contracts', type: 'QUALITY', appliesTo: 'All' };
    const { notes } = buildDecisionFromLesson(lesson);
    expect(notes).toContain('type: QUALITY');
    expect(notes).toContain('applies to: All');
  });
});
