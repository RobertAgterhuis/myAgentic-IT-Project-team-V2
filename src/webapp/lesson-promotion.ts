// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Lesson-to-decision promotion mechanism (S6-3).
 *
 * Recognizes PROMOTE_TO_DECISION flags in lessons-learned.md and
 * creates corresponding entries in decisions.md with source reference.
 */

export const PROMOTE_FLAG = 'PROMOTE_TO_DECISION';
export const PROMOTED_STATUS = 'PROMOTED';
export const LESSON_ID_RE = /^L\d+$/;

export interface LessonCandidate {
  id: string;
  lesson: string;
  type: string;
  appliesTo: string;
}

export function findPromotionCandidates(content: string): LessonCandidate[] {
  if (!content) return [];

  const candidates: LessonCandidate[] = [];
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

export function markLessonPromoted(content: string, lessonId: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

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

export function buildDecisionFromLesson(lesson: LessonCandidate): {
  decision: string;
  notes: string;
} {
  return {
    decision: lesson.lesson,
    notes: `Promoted from lesson ${lesson.id} (type: ${lesson.type}, applies to: ${lesson.appliesTo})`,
  };
}
