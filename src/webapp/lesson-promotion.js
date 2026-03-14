// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Lesson-to-decision promotion mechanism (S6-3).
 *
 * Recognizes PROMOTE_TO_DECISION flags in lessons-learned.md and
 * creates corresponding entries in decisions.md with source reference.
 *
 * @module lesson-promotion
 */

const PROMOTE_FLAG = 'PROMOTE_TO_DECISION';
const PROMOTED_STATUS = 'PROMOTED';
const LESSON_ID_RE = /^L\d+$/;

/**
 * Find all lessons flagged with PROMOTE_TO_DECISION in a lessons-learned.md table.
 *
 * Supports two table formats:
 *   1) 5-column: | ID | Lesson | Type | Applies To | Status/Action |
 *   2) 6-column: | ID | Lesson | Type | Applies To | Status | Action |
 *
 * The flag can appear in either the last column (5-col format) or the
 * Status column (6-col format).
 *
 * @param {string} content - lessons-learned.md content
 * @returns {Array<{id: string, lesson: string, type: string, appliesTo: string}>}
 */
function findPromotionCandidates(content) {
  if (!content) return [];

  const candidates = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || /^\|\s*-/.test(trimmed) || /^\|\s*ID\s*\|/i.test(trimmed)) {
      continue;
    }
    if (!trimmed.includes(PROMOTE_FLAG)) continue;

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);

    if (cells.length >= 5 && LESSON_ID_RE.test(cells[0])) {
      candidates.push({
        id: cells[0],
        lesson: cells[1],
        type: cells[2],
        appliesTo: cells[3],
      });
    }
  }

  return candidates;
}

/**
 * Mark a lesson as PROMOTED in lessons-learned.md content.
 * Replaces PROMOTE_TO_DECISION with PROMOTED for the given lesson ID.
 *
 * @param {string} content - lessons-learned.md content
 * @param {string} lessonId - Lesson ID (e.g. 'L5')
 * @returns {string} Updated content
 */
function markLessonPromoted(content, lessonId) {
  const lines = content.split('\n');
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.includes(lessonId) && trimmed.includes(PROMOTE_FLAG)) {
      result.push(line.replace(PROMOTE_FLAG, PROMOTED_STATUS));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Build a decision text from a lesson, including source reference.
 *
 * @param {{ id: string, lesson: string, type: string, appliesTo: string }} lesson
 * @returns {{ decision: string, notes: string }}
 */
function buildDecisionFromLesson(lesson) {
  return {
    decision: lesson.lesson,
    notes: `Promoted from lesson ${lesson.id} (type: ${lesson.type}, applies to: ${lesson.appliesTo})`,
  };
}

module.exports = {
  PROMOTE_FLAG,
  PROMOTED_STATUS,
  LESSON_ID_RE,
  findPromotionCandidates,
  markLessonPromoted,
  buildDecisionFromLesson,
};
