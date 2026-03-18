// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Questionnaire model — parsing and mutation logic for
 * questionnaire markdown files.
 */

import * as path from 'path';
import { escRx, today } from './utils';
import {
  parseTokens,
  findHeading,
  findAllHeadings,
  extractSectionTokens,
  extractTable,
  extractBlockquoteText,
} from './markdown-parser';
import type {
  QuestionnaireMetadata,
  QuestionStatusEntry,
  QuestionItem,
  QuestionnaireSection,
  ParsedQuestionnaire,
} from './types';

/* ── Internal helpers (AST-based — M32-002) ───────────────────── */

function parseQuestionnaireMetadata(content: string): QuestionnaireMetadata {
  const meta: QuestionnaireMetadata = { agent: '', phase: '', generated: '', version: '' };
  const tokens = parseTokens(content);

  // H1 title — "Questionnaire: <agent>"
  const h1 = findHeading(tokens, 1, /^Questionnaire:\s*/);
  if (h1) meta.agent = h1.content.replace(/^Questionnaire:\s*/, '').trim();

  // Blockquote metadata — "> Phase: X | Generated: Y | Version: Z"
  const bqText = extractBlockquoteText(tokens);
  const metaM = bqText.match(/Phase:\s*(.+?)\s*\|\s*Generated:\s*(.+?)\s*\|\s*Version:\s*(.+)/);
  if (metaM) {
    meta.phase = metaM[1].trim();
    meta.generated = metaM[2].trim();
    meta.version = metaM[3].trim();
  }
  return meta;
}

function parseStatusMap(content: string): Record<string, QuestionStatusEntry> {
  const statusMap: Record<string, QuestionStatusEntry> = {};
  const tokens = parseTokens(content);

  // Find the "Answer Status" H2 section and its table
  const headings = findAllHeadings(tokens, 2, /^Answer\s+Status$/i);
  if (!headings.length) return statusMap;

  const sectionTokens = extractSectionTokens(tokens, headings[0].index);
  const table = extractTable(sectionTokens);
  if (!table) return statusMap;

  for (const row of table.rows) {
    if (row.length < 3) continue;
    const id = row[0].trim();
    if (!/^Q-\d+-\d+$/.test(id)) continue;
    statusMap[id] = { status: row[1].trim(), lastUpdated: row[2].trim() };
  }
  return statusMap;
}

function skipToAnswerEnd(lines: string[], startIdx: number): { answer: string; nextIndex: number } {
  const ansLines: string[] = [];
  let i: number = startIdx;
  while (i < lines.length) {
    const line: string = lines[i];
    if (/^---/.test(line) || /^###/.test(line) || /^##\s/.test(line)) break;
    const stripped: string = line.replace(/^>\s?/, '');
    if (stripped !== '*(fill in here)*') ansLines.push(stripped);
    i++;
  }
  return { answer: ansLines.join('\n').trim(), nextIndex: i };
}

function applyQuestionField(line: string, cur: QuestionItem): void {
  let fm: RegExpMatchArray | null;
  if ((fm = line.match(/^\*\*Question:\*\*\s*(.+)/))) cur.question = fm[1].trim();
  else if ((fm = line.match(/^\*\*Why we need this:\*\*\s*(.+)/))) cur.whyNeeded = fm[1].trim();
  else if ((fm = line.match(/^\*\*Expected format:\*\*\s*(.+)/))) cur.expectedFormat = fm[1].trim();
  else if ((fm = line.match(/^\*\*Example:\*\*\s*(.+)/))) cur.example = fm[1].trim();
}

/* ── Exported functions ───────────────────────────────────────── */

/**
 * Parse a questionnaire markdown file into a structured object.
 * Extracts metadata, sections, questions, answers, and status.
 */
export function parseQuestionnaire(
  content: string,
  filePath: string,
  basePath: string
): ParsedQuestionnaire {
  const lines: string[] = content.split(/\r?\n/);
  const meta: QuestionnaireMetadata = parseQuestionnaireMetadata(content);
  const q: ParsedQuestionnaire = {
    file: path.relative(basePath, filePath).replace(/\\/g, '/'),
    agent: meta.agent,
    phase: meta.phase,
    generated: meta.generated,
    version: meta.version,
    sections: [],
    questions: [],
  };
  const statusMap: Record<string, QuestionStatusEntry> = parseStatusMap(content);

  let sec: QuestionnaireSection | null = null;
  let cur: QuestionItem | null = null;

  function finalize(): void {
    if (!cur) return;
    const st: QuestionStatusEntry | undefined = statusMap[cur.id];
    cur.status = st ? st.status : 'OPEN';
    cur.lastUpdated = st ? st.lastUpdated : '';
    q.questions.push(cur);
    if (sec) sec.questions.push(cur);
    cur = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    if (/^##\s+Answer\s+Status/i.test(line)) {
      finalize();
      break;
    }

    const secM: RegExpMatchArray | null = line.match(/^##\s+Section\s+\d+:\s*(.+)/);
    if (secM) {
      finalize();
      sec = { title: secM[1].trim(), questions: [] };
      q.sections.push(sec);
      continue;
    }

    const qM: RegExpMatchArray | null = line.match(/^###\s+(Q-\d+-\d+)\s+\[(REQUIRED|OPTIONAL)]/);
    if (qM) {
      finalize();
      cur = {
        id: qM[1],
        classification: qM[2],
        question: '',
        whyNeeded: '',
        expectedFormat: '',
        example: '',
        answer: '',
        section: sec ? sec.title : '',
        status: 'OPEN',
        lastUpdated: '',
      };
      continue;
    }

    if (!cur) continue;
    if (/^\*\*Your answer:\*\*/.test(line)) {
      const result = skipToAnswerEnd(lines, i + 1);
      cur.answer = result.answer;
      i = result.nextIndex - 1;
      continue;
    }

    applyQuestionField(line, cur);
  }
  finalize();
  return q;
}

/* ── Answer mutation helpers ──────────────────────────────────── */

function skipOldAnswerLines(lines: string[], i: number): number {
  while (
    i < lines.length &&
    !/^---/.test(lines[i]) &&
    !/^###/.test(lines[i]) &&
    !/^##\s/.test(lines[i])
  )
    i++;
  return i;
}

function formatAnswerLines(newAnswer: string): string[] {
  if (newAnswer && newAnswer.trim()) {
    return newAnswer.split('\n').map((l: string) => `> ${l}`);
  }
  return ['> *(fill in here)*'];
}

function replaceAnswerBlock(lines: string[], escapedId: string, newAnswer: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (new RegExp(`^###\\s+${escapedId}\\s+\\[`).test(lines[i])) {
      result.push(lines[i++]);
      while (i < lines.length && !/^\*\*Your answer:\*\*/.test(lines[i])) result.push(lines[i++]);
      if (i < lines.length) {
        result.push(lines[i++]); // **Your answer:**
        i = skipOldAnswerLines(lines, i);
        result.push(...formatAnswerLines(newAnswer), '');
      }
      continue;
    }
    result.push(lines[i++]);
  }
  return result;
}

function replaceStatusRow(lines: string[], questionId: string, newStatus: string): string[] {
  const result: string[] = [];
  const esc: string = escRx(questionId);
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`\\|\\s*${esc}\\s*\\|`).test(lines[i])) {
      result.push(`| ${questionId} | ${newStatus} | ${today()} |`);
    } else {
      result.push(lines[i]);
    }
  }
  return result;
}

/**
 * Update a question's answer and status in questionnaire markdown content.
 */
export function updateAnswerInContent(
  content: string,
  questionId: string,
  newAnswer: string,
  newStatus: string
): string {
  const lines: string[] = content.split(/\r?\n/);
  const esc: string = escRx(questionId);
  const withAnswer: string[] = replaceAnswerBlock(lines, esc, newAnswer);
  const withStatus: string[] = replaceStatusRow(withAnswer, questionId, newStatus);
  return withStatus.join('\n');
}
