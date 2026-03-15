// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as path from 'path';

/* ── Domain Models (SP-R2-002-003) ────────────────────────────── *
 * Consolidates parsing logic for Questionnaire, Decision, and
 * Pipeline (session-state) data. These are pure functions that
 * operate on content strings — no fs dependency.
 * ─────────────────────────────────────────────────────────────── */

/* ── Type Definitions ─────────────────────────────────────────── */

interface QuestionnaireMetadata {
  agent: string;
  phase: string;
  generated: string;
  version: string;
}

interface QuestionStatusEntry {
  status: string;
  lastUpdated: string;
}

interface QuestionItem {
  id: string;
  classification: string;
  question: string;
  whyNeeded: string;
  expectedFormat: string;
  example: string;
  answer: string;
  section: string;
  status: string;
  lastUpdated: string;
}

interface QuestionnaireSection {
  title: string;
  questions: QuestionItem[];
}

interface ParsedQuestionnaire {
  file: string;
  agent: string;
  phase: string;
  generated: string;
  version: string;
  sections: QuestionnaireSection[];
  questions: QuestionItem[];
}

interface DecisionItem {
  id: string;
  type: string;
  status: string;
  priority?: string;
  scope: string;
  question?: string;
  answer?: string;
  decision?: string;
  notes?: string;
  subject?: string;
  reason?: string;
  date: string;
  category?: string;
}

interface ParsedDecisions {
  open: DecisionItem[];
  decided: DecisionItem[];
  deferred: DecisionItem[];
}

interface IndexSection {
  heading: string;
  idPattern: string;
}

interface ParseDecisionsOptions {
  indexSections?: IndexSection[];
}

interface CategoryHeader {
  name: string;
  stack: string;
  status: string;
  applicable: string;
  reason: string;
}

interface OpenQuestionEntry {
  id: string;
  priority: string;
  scope: string;
  question: string;
  answer?: string;
  date: string;
}

interface OperationalDecisionEntry {
  id: string;
  priority: string;
  scope: string;
  decision: string;
  notes?: string;
  date: string;
}

interface EditDecidedFields {
  priority?: string;
  scope?: string;
  text?: string;
  notes?: string;
}

/* ── Shared utilities ─────────────────────────────────────────── */

/** Escape special regex characters in a string. */
export function escRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Today's date as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Current timestamp in ISO 8601 format. */
export function isoNow(): string {
  return new Date().toISOString();
}

/** Escape pipe characters for safe markdown table embedding. */
export function escPipe(s: string): string {
  return (s || '').replace(/\|/g, '\\|');
}

/**
 * Replace a literal substring (no regex expansion of $ in replacement).
 */
export function literalReplace(str: string, search: string, replacement: string): string {
  return str.replace(search, () => replacement);
}

/** Regex for validating question IDs (e.g. Q-05-001). */
export const Q_ID_RE: RegExp = /^Q-\d{1,3}-\d{1,4}$/;
/** Regex for validating decision IDs (e.g. DEC-R2-001). */
export const DEC_ID_RE: RegExp = /^DEC-[\w-]{1,30}$/;

/* ── Questionnaire Model ──────────────────────────────────────── */

function parseQuestionnaireMetadata(content: string): QuestionnaireMetadata {
  const meta: QuestionnaireMetadata = { agent: '', phase: '', generated: '', version: '' };
  const titleM: RegExpMatchArray | null = content.match(/^#\s+Questionnaire:\s*(.+)/m);
  if (titleM) meta.agent = titleM[1].trim();
  const metaM: RegExpMatchArray | null = content.match(
    />\s*Phase:\s*(.+?)\s*\|\s*Generated:\s*(.+?)\s*\|\s*Version:\s*(.+)/m
  );
  if (metaM) {
    meta.phase = metaM[1].trim();
    meta.generated = metaM[2].trim();
    meta.version = metaM[3].trim();
  }
  return meta;
}

function parseStatusMap(content: string): Record<string, QuestionStatusEntry> {
  const statusMap: Record<string, QuestionStatusEntry> = {};
  const tableStart: number = content.indexOf('## Answer Status');
  if (tableStart === -1) return statusMap;
  const re: RegExp = /\|\s*(Q-\d+-\d+)\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content.slice(tableStart))))
    statusMap[m[1]] = { status: m[2], lastUpdated: m[3].trim() };
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

/* ── Decision Model ───────────────────────────────────────────── */

function parseDecisionTable(
  content: string,
  sectionRegex: RegExp,
  rowRegex: RegExp,
  mapRow: (m: RegExpExecArray) => DecisionItem | null
): DecisionItem[] {
  const section: RegExpMatchArray | null = content.match(sectionRegex);
  if (!section) return [];
  const results: DecisionItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(section[1]))) {
    const item: DecisionItem | null = mapRow(m);
    if (item) results.push(item);
  }
  return results;
}

/**
 * Default index subsections parsed from decisions.md.
 * Each entry defines a heading and a regex for matching decision IDs.
 * Templates can override this via `decisionCategories[].indexSection`.
 */
export const DEFAULT_INDEX_SECTIONS: IndexSection[] = [
  { heading: 'Transformation Decisions', idPattern: 'DEC-T-[\\d]+' },
  { heading: 'Reevaluation Decisions', idPattern: 'DEC-R2-[\\d]+' },
];

/**
 * Parse the decisions markdown into structured open, decided, and deferred lists.
 */
export function parseDecisions(
  content: string,
  options: ParseDecisionsOptions = {}
): ParsedDecisions {
  if (!content) return { open: [], decided: [], deferred: [] };

  const sections: IndexSection[] = options.indexSections || DEFAULT_INDEX_SECTIONS;

  const open: DecisionItem[] = parseDecisionTable(
    content,
    /## Open Questions[^\n]*\n([\s\S]*?)(?=\n---|\n## )/,
    /\|\s*(DEC-[\w-]+)\s*\|\s*(HIGH|MEDIUM|LOW)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([\d-]*)\s*\|/g,
    (m: RegExpExecArray): DecisionItem | null =>
      m[4].includes('No open questions')
        ? null
        : {
            id: m[1],
            type: 'OPEN_QUESTION',
            status: 'OPEN',
            priority: m[2],
            scope: m[3].trim(),
            question: m[4].trim(),
            answer: m[5].trim(),
            date: m[6].trim(),
          }
  );

  // Parse template-defined index subsections (data-driven)
  const sectionDecided: DecisionItem[] = [];
  for (const sec of sections) {
    const heading: string = sec.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRx: RegExp = new RegExp(
      `### ${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n### |\\n---|\\n## )`
    );
    const idPat: string = sec.idPattern || 'DEC-[\\w-]+';
    const rowRx: RegExp = new RegExp(
      `\\|\\s*(${idPat})\\s*\\|\\s*(HIGH|MEDIUM|LOW)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([\\d-]*)\\s*\\|`,
      'g'
    );
    const items: DecisionItem[] = parseDecisionTable(
      content,
      sectionRx,
      rowRx,
      (m: RegExpExecArray): DecisionItem => ({
        id: m[1],
        type: 'DECIDED',
        status: 'DECIDED',
        priority: m[2],
        scope: m[3].trim(),
        decision: m[4].trim(),
        notes: m[5].trim(),
        date: m[6].trim(),
      })
    );
    sectionDecided.push(...items);
  }

  const ops: DecisionItem[] = parseDecisionTable(
    content,
    /### (?:Operational|Uncategorized) Decisions[^\n]*\n([\s\S]*?)(?=\n---|\n## )/,
    /\|\s*(DEC-[\d]+)\s*\|\s*(HIGH|MEDIUM|LOW|—)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([\d-]*)\s*\|/g,
    (m: RegExpExecArray): DecisionItem | null =>
      m[4].includes('Add a decision here')
        ? null
        : {
            id: m[1],
            type: 'DECIDED',
            status: 'DECIDED',
            priority: m[2],
            scope: m[3].trim(),
            decision: m[4].trim(),
            notes: m[5].trim(),
            date: m[6].trim(),
          }
  );

  const deferred: DecisionItem[] = parseDecisionTable(
    content,
    /## Deferred & Expired[^\n]*\n([\s\S]*?)(?=\n---|\n## |$)/,
    /\|\s*(DEC-[\w-]+)\s*\|\s*(DEFERRED|EXPIRED)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([\d-]*)\s*\|/g,
    (m: RegExpExecArray): DecisionItem => ({
      id: m[1],
      type: m[2] === 'DEFERRED' ? 'OPEN_QUESTION' : 'DECIDED',
      status: m[2],
      scope: m[3].trim(),
      subject: m[4].trim(),
      reason: m[5].trim(),
      date: m[6].trim(),
    })
  );

  return { open, decided: [...sectionDecided, ...ops], deferred };
}

/* ── Category file parsers (multi-file decisions) ─────────────── */

/**
 * Parse the header metadata block from a category decision file.
 */
// eslint-disable-next-line complexity
export function parseCategoryHeader(content: string): CategoryHeader {
  const name: string = (content.match(/^# Decisions:\s*(.+)/m) || [])[1]?.trim() || 'Unknown';
  const stack: string = (content.match(/Stack:\s*([^\s|]+)/) || [])[1] || 'unknown';
  const status: string = (content.match(/Status:\s*(ACTIVE|DEFERRED)/) || [])[1] || 'ACTIVE';
  const applicable: string = (content.match(/Applicable:\s*(YES|NO|PARTIAL)/) || [])[1] || 'YES';
  const reason: string = (content.match(/Deferred-Reason:\s*(.+)/) || [])[1]?.trim() || '';
  return { name, stack, status, applicable, reason };
}

/**
 * Parse decided items from a category decision file.
 * Handles both single-table and split Active/Deferred table layouts.
 */
export function parseCategoryDecisions(content: string, category: string): DecisionItem[] {
  const rows: DecisionItem[] = [];
  const re: RegExp =
    /\|\s*(DEC-[\w-]+)\s*\|\s*(HIGH|MEDIUM|LOW|—)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([\d-]*)\s*\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    if (m[4].includes('Add a decision here')) continue;
    // Detect if this row is in a "Deferred Decisions" subsection
    const before: string = content.slice(0, m.index);
    const inDeferred: boolean = /## Deferred Decisions[^\n]*$/m.test(before.slice(-200));
    rows.push({
      id: m[1],
      type: 'DECIDED',
      status: inDeferred ? 'CAT_DEFERRED' : 'DECIDED',
      priority: m[2],
      scope: m[3].trim(),
      decision: m[4].trim(),
      notes: m[5].trim(),
      date: m[6].trim(),
      category,
    });
  }
  return rows;
}

/**
 * Mutate a category file header from DEFERRED to ACTIVE.
 * Updates Status: DEFERRED → ACTIVE, Applicable: NO → YES,
 * and removes the Deferred-Reason line.
 */
export function activateCategoryHeader(content: string): string {
  content = content.replace(/Status:\s*DEFERRED/, 'Status: ACTIVE');
  content = content.replace(/Applicable:\s*NO/, 'Applicable: YES');
  content = content.replace(/^> Deferred-Reason:.*\n?/m, '');
  return content;
}

/* ── Shared table-row insertion helper ─────────────────────────── */

/**
 * Insert a markdown table row, replacing a placeholder marker or
 * appending after the last row in a section. Used by addOpenQuestion,
 * addOperationalDecision, and moveToDecided.
 */
function insertTableRow(content: string, marker: RegExp, sectionRe: RegExp, row: string): string {
  if (marker.test(content)) {
    return content.replace(marker, () => row);
  }
  const secEnd: RegExpMatchArray | null = content.match(sectionRe);
  if (secEnd) {
    return content.replace(secEnd[0], secEnd[1] + '\n' + row + '\n\n---');
  }
  return content;
}

/* ── Decision content mutation functions ──────────────────────── */

/**
 * Compute the next sequential decision ID for a given prefix.
 */
export function nextDecisionId(content: string, prefix: string): string {
  const re: RegExp = new RegExp(`${escRx(prefix)}(\\d+)`, 'g');
  let max = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) max = Math.max(max, parseInt(m[1], 10));
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/**
 * Add a new open question row to the Open Questions table.
 */
export function addOpenQuestion(content: string, entry: OpenQuestionEntry): string {
  const marker: RegExp = /\|\s*\|\s*\|\s*\|\s*\*\(No open questions\)\*\s*\|\s*\|\s*\|/;
  const row: string = `| ${escPipe(entry.id)} | ${escPipe(entry.priority)} | ${escPipe(entry.scope)} | ${escPipe(entry.question)} | ${escPipe(entry.answer || '')} | ${escPipe(entry.date)} |`;
  return insertTableRow(
    content,
    marker,
    /(## Open Questions[^\n]*\n[\s\S]*?\|[^\n]+\|)\s*\n+---/,
    row
  );
}

/**
 * Add an operational decision row to the Operational Decisions table.
 */
export function addOperationalDecision(content: string, entry: OperationalDecisionEntry): string {
  const marker: RegExp =
    /\|\s*DEC-100\s*\|\s*—\s*\|\s*—\s*\|\s*\*\(Add a decision here\)\*\s*\|[^\n]*\|/;
  const row: string = `| ${escPipe(entry.id)} | ${escPipe(entry.priority)} | ${escPipe(entry.scope)} | ${escPipe(entry.decision)} | ${escPipe(entry.notes || '')} | ${escPipe(entry.date)} |`;
  return insertTableRow(
    content,
    marker,
    /(### (?:Operational|Uncategorized) Decisions[^\n]*\n[\s\S]*?\|[^\n]+\|)\s*\n+---/,
    row
  );
}

/**
 * Update the answer field of an existing open question.
 */
export function answerOpenQuestion(content: string, id: string, answer: string): string {
  const esc: string = escRx(id);
  const re: RegExp = new RegExp(
    `(\\|\\s*${esc}\\s*\\|\\s*(?:HIGH|MEDIUM|LOW)\\s*\\|\\s*[^|]*\\|\\s*[^|]*\\|)\\s*[^|]*\\|\\s*[\\d-]*\\s*\\|`
  );
  const m: RegExpMatchArray | null = content.match(re);
  if (!m) return content;
  const replacement: string = `${m[1]} ${escPipe(answer)} | ${today()} |`;
  return literalReplace(content, m[0], replacement);
}

export function restoreOpenPlaceholderIfEmpty(content: string): string {
  const idx: number = content.indexOf('## Open Questions');
  if (idx === -1) return content;
  const endIdx: number = content.indexOf('\n---', idx);
  if (endIdx === -1) return content;
  const section: string = content.slice(idx, endIdx);
  if (/\|\s*DEC-/.test(section) || /No open questions/.test(section)) return content;
  return content.slice(0, endIdx) + '\n| | | | *(No open questions)* | | |' + content.slice(endIdx);
}

/**
 * Move an open question to the decided (Operational Decisions) table.
 */
export function moveToDecided(content: string, id: string): string {
  const esc: string = escRx(id);
  const rowRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(HIGH|MEDIUM|LOW)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([\\d-]*)\\s*\\|[^\\n]*\\n?`
  );
  const m: RegExpMatchArray | null = content.match(rowRe);
  if (!m) return content;
  const priority: string = m[1];
  const scope: string = m[2].trim();
  const question: string = m[3].trim();
  const answer: string = m[4].trim();
  content = content.replace(m[0], '');
  content = restoreOpenPlaceholderIfEmpty(content);
  const entry: OperationalDecisionEntry = {
    id,
    priority,
    scope,
    decision: question,
    notes: answer,
    date: today(),
  };
  const marker: RegExp =
    /\|\s*DEC-100\s*\|\s*—\s*\|\s*—\s*\|\s*\*\(Add a decision here\)\*\s*\|[^\n]*\|/;
  const row: string = `| ${escPipe(entry.id)} | ${escPipe(entry.priority)} | ${escPipe(entry.scope)} | ${escPipe(entry.decision)} | ${escPipe(entry.notes || '')} | ${escPipe(entry.date)} |`;
  content = insertTableRow(
    content,
    marker,
    /(### (?:Operational|Uncategorized) Decisions[^\n]*\n[\s\S]*?\|[^\n]+\|)\s*\n+---/,
    row
  );
  return content;
}

/**
 * Defer an open question — remove from Open, add to Deferred & Expired.
 */
export function deferOpenQuestion(content: string, id: string, reason?: string): string {
  const esc: string = escRx(id);
  const rowRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(HIGH|MEDIUM|LOW)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|`
  );
  const m: RegExpMatchArray | null = content.match(rowRe);
  if (!m) return content;
  const scope: string = m[2].trim();
  const question: string = m[3].trim();
  content = content.replace(new RegExp(`\\|\\s*${esc}\\s*\\|[^\\n]*\\n?`), '');
  content = restoreOpenPlaceholderIfEmpty(content);
  return insertDeferredRow(
    content,
    id,
    'DEFERRED',
    scope,
    question,
    reason || 'Deferred via webapp'
  );
}

/**
 * Expire a decided item — remove from decided, add to Deferred & Expired as EXPIRED.
 */
export function expireDecidedItem(content: string, id: string, reason?: string): string {
  const esc: string = escRx(id);
  const rowRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(HIGH|MEDIUM|LOW|—)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|`
  );
  const m: RegExpMatchArray | null = content.match(rowRe);
  if (!m) return content;
  const scope: string = m[2].trim();
  const text: string = m[3].trim();
  content = content.replace(new RegExp(`\\|\\s*${esc}\\s*\\|[^\\n]*\\n?`), '');
  return insertDeferredRow(content, id, 'EXPIRED', scope, text, reason || 'Expired via webapp');
}

/**
 * Reopen a deferred/expired/decided item back into the open questions table.
 */
export function reopenItem(content: string, id: string): string {
  const esc: string = escRx(id);
  const defRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(?:DEFERRED|EXPIRED)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|`
  );
  let m: RegExpMatchArray | null = content.match(defRe);
  if (m) {
    const scope: string = m[1].trim();
    const subject: string = m[2].trim();
    content = content.replace(new RegExp(`\\|\\s*${esc}\\s*\\|[^\\n]*\\n?`), '');
    return addOpenQuestion(content, {
      id,
      priority: 'HIGH',
      scope,
      question: subject,
      answer: '',
      date: today(),
    });
  }
  const decRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(HIGH|MEDIUM|LOW|—)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|`
  );
  m = content.match(decRe);
  if (m) {
    const priority: string = m[1] === '—' ? 'MEDIUM' : m[1];
    const scope: string = m[2].trim();
    const text: string = m[3].trim();
    content = content.replace(new RegExp(`\\|\\s*${esc}\\s*\\|[^\\n]*\\n?`), '');
    return addOpenQuestion(content, {
      id,
      priority,
      scope,
      question: text,
      answer: '',
      date: today(),
    });
  }
  return content;
}

/**
 * Edit fields of an existing decided row in-place.
 */
export function editDecidedRow(content: string, id: string, fields: EditDecidedFields): string {
  const esc: string = escRx(id);
  const rowRe: RegExp = new RegExp(
    `\\|\\s*${esc}\\s*\\|\\s*(HIGH|MEDIUM|LOW|—)\\s*\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([^|]*)\\|\\s*([\\d-]*)\\s*\\|`
  );
  const m: RegExpMatchArray | null = content.match(rowRe);
  if (!m) return content;
  const p: string = fields.priority || m[1].trim();
  if (p && !['HIGH', 'MEDIUM', 'LOW', '—'].includes(p)) return content;
  const s: string = fields.scope !== undefined ? fields.scope : m[2].trim();
  const t: string = fields.text !== undefined ? fields.text : m[3].trim();
  const n: string = fields.notes !== undefined ? fields.notes : m[4].trim();
  const replacement: string = `| ${escPipe(id)} | ${escPipe(p)} | ${escPipe(s)} | ${escPipe(t)} | ${escPipe(n)} | ${today()} |`;
  return literalReplace(content, m[0], replacement);
}

function isDataRow(line: string): boolean {
  const t: string = line.trim();
  return t.startsWith('|') && t.endsWith('|') && !/^\|[\s-]+\|$/.test(t) && !/^\|\s*ID\b/.test(t);
}

function findTableInsertionLine(lines: string[]): number {
  let lastRow = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isDataRow(lines[i])) lastRow = i;
  }
  if (lastRow >= 0) return lastRow + 1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|[-\s|]+/.test(lines[i])) return i + 1;
  }
  return -1;
}

export function insertDeferredRow(
  content: string,
  id: string,
  status: string,
  scope: string,
  subject: string,
  reason: string
): string {
  const row: string = `| ${escPipe(id)} | ${escPipe(status)} | ${escPipe(scope)} | ${escPipe(subject)} | ${escPipe(reason)} | ${today()} |`;
  const defIdx: number = content.indexOf('## Deferred & Expired');
  if (defIdx === -1) return content;
  const afterDef: string = content.slice(defIdx + 1);
  const nextH: number = afterDef.search(/\n## /);
  const sectionEnd: number = nextH !== -1 ? defIdx + 1 + nextH : content.length;
  const section: string = content.slice(defIdx, sectionEnd);

  if (/\|\s*\|\s*\|\s*\|\s*\|\s*\|\s*\|/.test(section)) {
    return (
      content.slice(0, defIdx) +
      section.replace(/\|\s*\|\s*\|\s*\|\s*\|\s*\|\s*\|/, row) +
      content.slice(sectionEnd)
    );
  }
  const lines: string[] = section.split('\n');
  const insertAt: number = findTableInsertionLine(lines);
  if (insertAt >= 0) {
    lines.splice(insertAt, 0, row);
    return content.slice(0, defIdx) + lines.join('\n') + content.slice(sectionEnd);
  }
  return content;
}

/**
 * Append an audit trail entry to the Change Log section.
 */
export function appendAuditTrail(content: string, action: string, id: string): string {
  const entry: string = `- ${isoNow()} | \`${action}\` | \`${id}\` | source: webapp`;
  if (/## Change Log/.test(content)) {
    return content.replace(/(## Change Log\n\n?)/, '$1' + entry + '\n');
  }
  const exIdx: number = content.indexOf('\n## Examples');
  if (exIdx !== -1) {
    return (
      content.slice(0, exIdx) + '\n---\n\n## Change Log\n\n' + entry + '\n' + content.slice(exIdx)
    );
  }
  return content.trimEnd() + '\n\n---\n\n## Change Log\n\n' + entry + '\n';
}

/* ── Pipeline Model (session-state helpers) ───────────────────── */

/**
 * Parse a session-state JSON string into an object.
 */
export function parseSessionState(content: string): unknown {
  if (!content) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

/* ── Markdown Corruption Detection (GAP-009) ──────────────────── */

/**
 * Detect structural corruption in a markdown file.
 * Checks for: broken YAML frontmatter, incomplete table rows,
 * unclosed fences, and malformed question blocks.
 */
// eslint-disable-next-line complexity
export function detectMarkdownCorruption(content: unknown): string[] {
  if (typeof content !== 'string') return ['Content is not a string'];
  const issues: string[] = [];

  // Check for broken YAML frontmatter (opened but not closed)
  if (/^---\s*\n/.test(content)) {
    const secondFence: number = content.indexOf('\n---', 4);
    if (secondFence === -1)
      issues.push('Unclosed YAML frontmatter (opening --- without closing ---)');
  }

  // Check for unclosed code fences
  const fenceMatches: RegExpMatchArray | null = content.match(/^```/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    issues.push('Unclosed code fence (odd number of ``` delimiters)');
  }

  // Check for incomplete table rows (lines starting with | but not ending with |)
  const lines: string[] = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    if (/^\|/.test(line) && !/\|\s*$/.test(line) && !/^\|[-|:\s]+$/.test(line)) {
      issues.push(`Incomplete table row at line ${i + 1}`);
      break; // report only first occurrence
    }
  }

  // Check for malformed question blocks (### Q-nn-nnnn without [REQUIRED] or [OPTIONAL])
  const qHeaders: RegExpMatchArray | null = content.match(/^###\s+Q-\d+-\d+(?!\s+\[)/gm);
  if (qHeaders && qHeaders.length > 0) {
    issues.push(
      `Malformed question header (missing [REQUIRED]/[OPTIONAL] tag): ${qHeaders[0].trim()}`
    );
  }

  // Check for orphaned answer blocks (** Your answer:** outside a question context)
  const answerBlocks: number = (content.match(/\*\*Your answer:\*\*/g) || []).length;
  const questionBlocks: number = (content.match(/^###\s+Q-\d+-\d+/gm) || []).length;
  if (answerBlocks > 0 && answerBlocks > questionBlocks) {
    issues.push(`Orphaned answer blocks: ${answerBlocks} answers for ${questionBlocks} questions`);
  }

  return issues;
}
