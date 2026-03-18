// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Markdown AST parser — M32-002.
 *
 * Wraps markdown-it to produce a structured token stream and provides
 * AST-style helper functions used by questionnaire.ts and decisions.ts
 * (replacing ad-hoc regex parsing).
 *
 * @module models/markdown-parser
 */

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true });

export type Token = MarkdownIt.Token;

/* ── Core parse ─────────────────────────────────────────────────── */

/** Parse markdown source into a flat token array (block-level). */
export function parseTokens(content: string): Token[] {
  return md.parse(content, {});
}

/* ── Heading helpers ────────────────────────────────────────────── */

/** Find the inline content token that follows a heading_open of the given depth. */
export function findHeading(tokens: Token[], depth: number, pattern?: RegExp): Token | null {
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open' && t.tag === `h${depth}`) {
      const inline = tokens[i + 1];
      if (!inline || inline.type !== 'inline') continue;
      if (!pattern || pattern.test(inline.content)) return inline;
    }
  }
  return null;
}

/** Find ALL heading inline tokens of a given depth, optionally matching a pattern. */
export function findAllHeadings(
  tokens: Token[],
  depth: number,
  pattern?: RegExp
): { token: Token; index: number }[] {
  const results: { token: Token; index: number }[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i].type === 'heading_open' && tokens[i].tag === `h${depth}`) {
      const inline = tokens[i + 1];
      if (!inline || inline.type !== 'inline') continue;
      if (!pattern || pattern.test(inline.content)) {
        results.push({ token: inline, index: i });
      }
    }
  }
  return results;
}

/* ── Section extraction ─────────────────────────────────────────── */

/**
 * Extract tokens between a heading (at `startIndex`) and the next heading
 * of the same or lower depth (or a `---` thematic break at depth ≤ heading, or EOF).
 * Returns the tokens from startIndex+3 (skip heading_open, inline, heading_close)
 * up to (exclusive) the next boundary.
 */
export function extractSectionTokens(tokens: Token[], startIndex: number): Token[] {
  const openTag = tokens[startIndex]?.tag; // e.g. 'h2'
  const depth = parseInt(openTag?.slice(1) || '6', 10);
  const bodyStart = startIndex + 3; // skip heading_open, inline, heading_close
  const section: Token[] = [];

  for (let i = bodyStart; i < tokens.length; i++) {
    const t = tokens[i];
    // Stop at same-or-higher heading or thematic break (---)
    if (t.type === 'heading_open') {
      const d = parseInt(t.tag.slice(1), 10);
      if (d <= depth) break;
    }
    if (t.type === 'hr') break;
    section.push(t);
  }
  return section;
}

/* ── Table helpers ──────────────────────────────────────────────── */

/**
 * Extract markdown-it table into a typed row array.
 *
 * Returns { header: string[], rows: string[][] } from the first table
 * found in the given token slice. Each cell is the raw inline content.
 */
export function extractTable(tokens: Token[]): { header: string[]; rows: string[][] } | null {
  let inTable = false;
  let inHead = false;
  let inBody = false;
  const header: string[] = [];
  const rows: string[][] = [];
  let currentRow: string[] = [];

  for (const t of tokens) {
    if (t.type === 'table_open') {
      inTable = true;
      continue;
    }
    if (t.type === 'table_close') {
      inTable = false;
      continue;
    }
    if (!inTable) continue;

    if (t.type === 'thead_open') {
      inHead = true;
      continue;
    }
    if (t.type === 'thead_close') {
      inHead = false;
      continue;
    }
    if (t.type === 'tbody_open') {
      inBody = true;
      continue;
    }
    if (t.type === 'tbody_close') {
      inBody = false;
      continue;
    }

    if (t.type === 'tr_open') {
      currentRow = [];
      continue;
    }
    if (t.type === 'tr_close') {
      if (inHead) header.push(...currentRow);
      else if (inBody) rows.push(currentRow);
      continue;
    }

    if (t.type === 'inline' && (t.nesting === undefined || t.nesting === 0)) {
      currentRow.push(t.content.trim());
    }
  }

  return header.length || rows.length ? { header, rows } : null;
}

/**
 * Extract ALL tables from a token array.
 * Returns array of { header, rows } for each table found.
 */
export function extractAllTables(tokens: Token[]): { header: string[]; rows: string[][] }[] {
  const tables: { header: string[]; rows: string[][] }[] = [];
  let inTable = false;
  let inHead = false;
  let inBody = false;
  let header: string[] = [];
  let rows: string[][] = [];
  let currentRow: string[] = [];

  for (const t of tokens) {
    if (t.type === 'table_open') {
      inTable = true;
      header = [];
      rows = [];
      continue;
    }
    if (t.type === 'table_close') {
      inTable = false;
      if (header.length || rows.length) tables.push({ header, rows });
      continue;
    }
    if (!inTable) continue;

    if (t.type === 'thead_open') {
      inHead = true;
      continue;
    }
    if (t.type === 'thead_close') {
      inHead = false;
      continue;
    }
    if (t.type === 'tbody_open') {
      inBody = true;
      continue;
    }
    if (t.type === 'tbody_close') {
      inBody = false;
      continue;
    }

    if (t.type === 'tr_open') {
      currentRow = [];
      continue;
    }
    if (t.type === 'tr_close') {
      if (inHead) header.push(...currentRow);
      else if (inBody) rows.push(currentRow);
      continue;
    }

    if (t.type === 'inline') {
      currentRow.push(t.content.trim());
    }
  }

  return tables;
}

/* ── Blockquote helpers ─────────────────────────────────────────── */

/** Extract text content from blockquote tokens. Returns joined lines. */
export function extractBlockquoteText(tokens: Token[]): string {
  const lines: string[] = [];
  let inBq = false;
  for (const t of tokens) {
    if (t.type === 'blockquote_open') {
      inBq = true;
      continue;
    }
    if (t.type === 'blockquote_close') {
      inBq = false;
      continue;
    }
    if (inBq && t.type === 'inline') lines.push(t.content);
  }
  return lines.join('\n');
}

/* ── Inline field extraction ────────────────────────────────────── */

/**
 * Extract `**Key:** value` fields from inline tokens.
 * Returns a map of key → value. Keys are lowercased and spaces replaced
 * with underscores (e.g. "Why we need this" → "why_we_need_this").
 */
export function extractBoldFields(tokens: Token[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const t of tokens) {
    if (t.type !== 'inline') continue;
    const m = t.content.match(/^\*\*(.+?):\*\*\s*(.*)/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
      fields[key] = m[2].trim();
    }
  }
  return fields;
}

/* ── Frontmatter helpers ────────────────────────────────────────── */

/**
 * Check whether the content starts with YAML frontmatter fences.
 * Returns true if the first non-empty line is `---`.
 */
export function hasFrontmatter(content: string): boolean {
  return /^---\s*\n/.test(content);
}

/* ── Code fence helpers ─────────────────────────────────────────── */

/** Count code fence opens/closes in a token array. */
export function countCodeFences(tokens: Token[]): number {
  return tokens.filter((t) => t.type === 'fence').length;
}

/* ── Section-by-heading index ──────────────────────────────────── */

/**
 * Build an index of H2 / H3 sections in the document.
 * Returns an array of { depth, title, tokenStart, tokenEnd } entries.
 */
export function buildSectionIndex(
  tokens: Token[],
  minDepth = 2,
  maxDepth = 3
): { depth: number; title: string; tokenStart: number; tokenEnd: number }[] {
  const sections: { depth: number; title: string; tokenStart: number; tokenEnd: number }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'heading_open') continue;
    const d = parseInt(t.tag.slice(1), 10);
    if (d < minDepth || d > maxDepth) continue;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== 'inline') continue;
    sections.push({ depth: d, title: inline.content, tokenStart: i, tokenEnd: -1 });
  }

  // Fill tokenEnd for each section (up to the next section of same/lower depth, or EOF)
  for (let j = 0; j < sections.length; j++) {
    sections[j].tokenEnd = j + 1 < sections.length ? sections[j + 1].tokenStart : tokens.length;
  }

  return sections;
}
