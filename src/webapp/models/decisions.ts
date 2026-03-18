// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Decision model — parsing, mutation, and category logic for
 * the decisions markdown file(s).
 */

import { escRx, today, isoNow, escPipe, literalReplace } from './utils';
import {
  parseTokens,
  findHeading,
  findAllHeadings,
  extractSectionTokens,
  extractTable,
  extractAllTables,
  buildSectionIndex,
} from './markdown-parser';
import type {
  DecisionItem,
  ParsedDecisions,
  IndexSection,
  ParseDecisionsOptions,
  CategoryHeader,
  OpenQuestionEntry,
  OperationalDecisionEntry,
  EditDecidedFields,
} from './types';

/* ── Internal helpers ─────────────────────────────────────────── */

/** Map a 6-column table row to a DecisionItem for open questions. */
function mapOpenRow(cells: string[]): DecisionItem | null {
  if (cells.length < 6) return null;
  const id = cells[0].trim();
  if (!/^DEC-[\w-]+$/.test(id)) return null;
  if (cells[3].includes('No open questions')) return null;
  return {
    id,
    type: 'OPEN_QUESTION',
    status: 'OPEN',
    priority: cells[1].trim(),
    scope: cells[2].trim(),
    question: cells[3].trim(),
    answer: cells[4].trim(),
    date: cells[5].trim(),
  };
}

/** Map a 6-column table row to a decided DecisionItem. */
function mapDecidedRow(cells: string[]): DecisionItem | null {
  if (cells.length < 6) return null;
  const id = cells[0].trim();
  if (!/^DEC-[\w-]+$/.test(id)) return null;
  if (cells[3].includes('Add a decision here')) return null;
  return {
    id,
    type: 'DECIDED',
    status: 'DECIDED',
    priority: cells[1].trim(),
    scope: cells[2].trim(),
    decision: cells[3].trim(),
    notes: cells[4].trim(),
    date: cells[5].trim(),
  };
}

/** Map a 6-column table row to a deferred/expired DecisionItem. */
function mapDeferredRow(cells: string[]): DecisionItem | null {
  if (cells.length < 6) return null;
  const id = cells[0].trim();
  if (!/^DEC-[\w-]+$/.test(id)) return null;
  const status = cells[1].trim();
  return {
    id,
    type: status === 'DEFERRED' ? 'OPEN_QUESTION' : 'DECIDED',
    status,
    scope: cells[2].trim(),
    subject: cells[3].trim(),
    reason: cells[4].trim(),
    date: cells[5].trim(),
  };
}

/** Extract decision items from a set of AST section tokens using a row mapper. */
function extractDecisionRows(
  tokens: import('./markdown-parser').Token[],
  startIdx: number,
  mapper: (cells: string[]) => DecisionItem | null
): DecisionItem[] {
  const sectionToks = extractSectionTokens(tokens, startIdx);
  const table = extractTable(sectionToks);
  if (!table) return [];
  const results: DecisionItem[] = [];
  for (const row of table.rows) {
    const item = mapper(row);
    if (item) results.push(item);
  }
  return results;
}

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

/* ── Exported constants ───────────────────────────────────────── */

/**
 * Default index subsections parsed from decisions.md.
 * Each entry defines a heading and a regex for matching decision IDs.
 * Templates can override this via `decisionCategories[].indexSection`.
 */
export const DEFAULT_INDEX_SECTIONS: IndexSection[] = [
  { heading: 'Transformation Decisions', idPattern: 'DEC-T-[\\d]+' },
  { heading: 'Reevaluation Decisions', idPattern: 'DEC-R2-[\\d]+' },
];

/* ── Parse functions ──────────────────────────────────────────── */

/**
 * Parse the decisions markdown into structured open, decided, and deferred lists.
 * Uses AST-based section/table extraction (M32-002).
 */
export function parseDecisions(
  content: string,
  options: ParseDecisionsOptions = {}
): ParsedDecisions {
  if (!content) return { open: [], decided: [], deferred: [] };

  const tokens = parseTokens(content);
  const sections: IndexSection[] = options.indexSections || DEFAULT_INDEX_SECTIONS;

  // ── Open Questions (H2 section) ──
  const openH2 = findAllHeadings(tokens, 2, /^Open Questions/);
  const open: DecisionItem[] = openH2.length
    ? extractDecisionRows(tokens, openH2[0].index, mapOpenRow)
    : [];

  // ── Template-defined subsections (H3 headings, data-driven) ──
  const sectionDecided: DecisionItem[] = [];
  for (const sec of sections) {
    const re = new RegExp(`^${sec.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    const h3Matches = findAllHeadings(tokens, 3, re);
    for (const h3 of h3Matches) {
      sectionDecided.push(...extractDecisionRows(tokens, h3.index, mapDecidedRow));
    }
  }

  // ── Operational / Uncategorized Decisions (H3 section) ──
  const opsH3 = findAllHeadings(tokens, 3, /^(?:Operational|Uncategorized) Decisions/);
  const ops: DecisionItem[] = opsH3.length
    ? extractDecisionRows(tokens, opsH3[0].index, mapDecidedRow)
    : [];

  // ── Deferred & Expired (H2 section) ──
  const defH2 = findAllHeadings(tokens, 2, /^Deferred & Expired/);
  const deferred: DecisionItem[] = defH2.length
    ? extractDecisionRows(tokens, defH2[0].index, mapDeferredRow)
    : [];

  return { open, decided: [...sectionDecided, ...ops], deferred };
}

/* ── Category file parsers (multi-file decisions) ─────────────── */

/**
 * Parse the header metadata block from a category decision file.
 * Uses AST for H1 title extraction (M32-002).
 */
export function parseCategoryHeader(content: string): CategoryHeader {
  const tokens = parseTokens(content);
  const h1 = findHeading(tokens, 1, /^Decisions:\s*/);
  const name = h1 ? h1.content.replace(/^Decisions:\s*/, '').trim() : 'Unknown';
  // Inline metadata (blockquote-style) — kept as regex (simple key: value patterns)
  const stack: string = (content.match(/Stack:\s*([^\s|]+)/) || [])[1] || 'unknown';
  const status: string = (content.match(/Status:\s*(ACTIVE|DEFERRED)/) || [])[1] || 'ACTIVE';
  const applicable: string = (content.match(/Applicable:\s*(YES|NO|PARTIAL)/) || [])[1] || 'YES';
  const reason: string = (content.match(/Deferred-Reason:\s*(.+)/) || [])[1]?.trim() || '';
  return { name, stack, status, applicable, reason };
}

/**
 * Parse decided items from a category decision file.
 * Uses AST-based table extraction (M32-002).
 * Handles both single-table and split Active/Deferred table layouts.
 */
export function parseCategoryDecisions(content: string, category: string): DecisionItem[] {
  const tokens = parseTokens(content);
  const sections = buildSectionIndex(tokens, 2, 2);
  const rows: DecisionItem[] = [];

  // Build list of token-range segments, each tagged with deferred status
  const segments: { isDeferred: boolean; start: number; end: number }[] = [];

  if (sections.length === 0) {
    // No H2 headings — treat entire document as a single non-deferred segment
    segments.push({ isDeferred: false, start: 0, end: tokens.length });
  } else {
    // Tokens before the first H2 heading (table directly under H1 metadata)
    if (sections[0].tokenStart > 0) {
      segments.push({ isDeferred: false, start: 0, end: sections[0].tokenStart });
    }
    for (const sec of sections) {
      segments.push({
        isDeferred: /^Deferred Decisions/i.test(sec.title),
        start: sec.tokenStart,
        end: sec.tokenEnd,
      });
    }
  }

  for (const seg of segments) {
    const segTokens = tokens.slice(seg.start, seg.end);
    const tables = extractAllTables(segTokens);
    for (const table of tables) {
      for (const cells of table.rows) {
        if (cells.length < 6) continue;
        const id = cells[0].trim();
        if (!/^DEC-[\w-]+$/.test(id)) continue;
        if (cells[3].includes('Add a decision here')) continue;
        rows.push({
          id,
          type: 'DECIDED',
          status: seg.isDeferred ? 'CAT_DEFERRED' : 'DECIDED',
          priority: cells[1].trim(),
          scope: cells[2].trim(),
          decision: cells[3].trim(),
          notes: cells[4].trim(),
          date: cells[5].trim(),
          category,
        });
      }
    }
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
    decision: answer || question,
    notes: '',
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

export function migrateDecidedRowsToAnswerFormat(content: string): {
  content: string;
  changedRows: number;
} {
  const lines = content.split('\n');
  let inDecidedTable = false;
  let changedRows = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (/^#{1,6}\s/.test(trimmed) || trimmed === '---') {
      inDecidedTable = false;
    }

    if (
      /^\|\s*ID\s*\|\s*Priority\s*\|\s*Scope\s*\|\s*Decision\s*\|\s*Notes\s*\|\s*Date\s*\|$/i.test(
        trimmed
      )
    ) {
      inDecidedTable = true;
      continue;
    }

    if (!inDecidedTable || !trimmed.startsWith('|')) continue;
    if (/^\|\s*[-\s|]+\|$/.test(trimmed)) continue;

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (cells.length !== 6) continue;
    if (!/^DEC-[\w-]+$/.test(cells[0])) continue;
    if (!cells[3].endsWith('?')) continue;
    if (!cells[4]) continue;

    lines[index] = `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[4]} |  | ${cells[5]} |`;
    changedRows += 1;
  }

  return { content: lines.join('\n'), changedRows };
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
