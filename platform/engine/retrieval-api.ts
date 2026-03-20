// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Retrieval API — Citation-Enforced Context Retrieval (I-A4-003)
 *
 * Searches decisions, documentation, and other indexed sources for
 * snippets that match a query.  Every returned snippet carries full
 * citation metadata so agent outputs can link back to the source.
 *
 * Architecture:
 *   - Keyword-based retrieval (no vector DB dependency).
 *   - Configurable source list (decisions/, docs/, custom paths).
 *   - File system is injected for testability (same pattern as RepoIndexer).
 *   - Results are ranked by term-frequency relevance and returned as
 *     `CitedSnippet` objects compatible with the `ContextItem` type
 *     consumed by the ContextBudgeter.
 *
 * Acceptance criteria (I-A4-003):
 *   - Retrieved snippets carry `citation` with file, section, matchedTerms.
 *   - Empty query or no matches returns an empty array (no throws).
 *   - Relevance score is derived deterministically from term frequency.
 *
 * @module engine/retrieval-api
 */

import type { ContextItem } from './context-budgeter';

// ─── Citation types ───────────────────────────────────────────

/** Source reference for a retrieved snippet. */
export interface Citation {
  /** Relative file path (e.g. `BusinessDocs/decisions/typescript-eslint.md`). */
  file: string;
  /**
   * Section heading under which the match was found.
   * Empty string if no heading precedes the match.
   */
  section: string;
  /** Query terms that matched in this snippet. */
  matchedTerms: string[];
}

/** A retrieved text snippet with its citation. */
export interface CitedSnippet {
  /** Excerpt text (trimmed, up to `snippetMaxChars` characters). */
  content: string;
  /** Full citation. */
  citation: Citation;
  /** Relevance score in [0, 1] based on matched-term density. */
  relevanceScore: number;
}

// ─── Source definition ────────────────────────────────────────

/** A source that the retrieval API should search. */
export interface RetrievalSource {
  /**
   * Absolute or relative path to the file or directory.
   * If a directory, all `.md` and `.txt` files are scanned recursively.
   */
  path: string;
  /** Human-readable label used in citation output. */
  label?: string;
}

// ─── Options ─────────────────────────────────────────────────

export interface RetrievalOptions {
  /** Maximum results to return. Default: 10. */
  topK?: number;
  /** Maximum characters per snippet. Default: 600. */
  snippetMaxChars?: number;
  /** Context lines around a match to include in the snippet. Default: 3. */
  contextLines?: number;
  /** Minimum relevance score to include. Default: 0. */
  minScore?: number;
}

const RETRIEVAL_DEFAULTS: Required<RetrievalOptions> = {
  topK: 10,
  snippetMaxChars: 600,
  contextLines: 3,
  minScore: 0,
};

// ─── File system abstraction ──────────────────────────────────

/** Minimal FS interface required by the retrieval API. */
export interface RetrievalFs {
  /** Returns true if the path exists (file or directory). */
  exists(p: string): boolean;
  /** Returns file names (relative) in a directory. Recursive optional. */
  readdir(p: string, recursive?: boolean): string[];
  /** Reads file content as UTF-8 text. */
  readFile(p: string): string;
  /** Returns true if `p` is a directory. */
  isDirectory(p: string): boolean;
}

// ─── Tokeniser ────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'do',
  'does',
  'for',
  'from',
  'has',
  'have',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
]);

/**
 * Tokenise a query string into lower-case alpha-numeric terms,
 * filtering out stop words and single-character tokens.
 */
export function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ─── Section extraction ───────────────────────────────────────

/** Find the nearest Markdown heading above a line index. */
export function nearestHeading(lines: string[], lineIndex: number): string {
  for (let i = lineIndex; i >= 0; i--) {
    const m = lines[i].match(/^#{1,6}\s+(.+)/);
    if (m) return m[1].trim();
  }
  return '';
}

// ─── Relevance scoring ────────────────────────────────────────

/**
 * Compute a relevance score in [0,1] for a block of text given a set
 * of query terms.  Score = matched unique terms / total query terms,
 * weighted by term-frequency (capped at 1 per term to avoid spamming).
 */
export function scoreBlock(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const lower = text.toLowerCase();
  let matched = 0;
  for (const term of terms) {
    if (lower.includes(term)) matched++;
  }
  return matched / terms.length;
}

// ─── File collection ──────────────────────────────────────────

const SEARCHABLE_EXTENSIONS = new Set(['.md', '.txt']);

function isSearchable(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return SEARCHABLE_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

/**
 * Collect all searchable files under a source path.
 * If the source is a file itself, returns it directly.
 */
function collectFiles(source: RetrievalSource, fs: RetrievalFs): string[] {
  const { path: p } = source;
  if (!fs.exists(p)) return [];
  if (!fs.isDirectory(p)) {
    return isSearchable(p) ? [p] : [];
  }
  // Directory: collect recursively
  const entries = fs.readdir(p, true);
  return entries
    .filter((e) => isSearchable(e))
    .map((e) => {
      // readdir may return relative or absolute paths; normalise with joining
      // only when e does not already start with p
      if (e.startsWith(p)) return e;
      return p.endsWith('/') ? p + e : `${p}/${e}`;
    });
}

// ─── Single-file search ───────────────────────────────────────

interface RawMatch {
  file: string;
  section: string;
  snippet: string;
  matchedTerms: string[];
  score: number;
}

function searchFile(
  filePath: string,
  terms: string[],
  fs: RetrievalFs,
  opts: Required<RetrievalOptions>
): RawMatch[] {
  let content: string;
  try {
    content = fs.readFile(filePath);
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const matches: RawMatch[] = [];
  const seen = new Set<number>(); // avoid overlapping windows

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // Check if any term matches on this line
    const matchedOnLine = terms.filter((t) => lineLower.includes(t));
    if (matchedOnLine.length === 0) continue;

    // Build context window
    const start = Math.max(0, i - opts.contextLines);
    const end = Math.min(lines.length - 1, i + opts.contextLines);

    // Skip if this window heavily overlaps a previously added one
    if (seen.has(start)) continue;
    seen.add(start);

    const windowLines = lines.slice(start, end + 1);
    const windowText = windowLines.join('\n');

    // Score the full window
    const score = scoreBlock(windowText, terms);
    if (score < opts.minScore) continue;

    const section = nearestHeading(lines, i);
    const snippet =
      windowText.length > opts.snippetMaxChars
        ? windowText.slice(0, opts.snippetMaxChars) + '…'
        : windowText;

    matches.push({
      file: filePath,
      section,
      snippet,
      matchedTerms: matchedOnLine,
      score,
    });
  }

  return matches;
}

// ─── RetrievalApi ─────────────────────────────────────────────

/**
 * Citation-enforced retrieval API.
 *
 * Usage:
 *   const api = new RetrievalApi(fs, sources);
 *   const snippets = api.retrieve('typescript eslint rules');
 *   // snippets[0].citation → { file, section, matchedTerms }
 */
export class RetrievalApi {
  private _fs: RetrievalFs;
  private _sources: RetrievalSource[];

  constructor(fs: RetrievalFs, sources: RetrievalSource[] = []) {
    this._fs = fs;
    this._sources = sources;
  }

  /**
   * Retrieve cited snippets matching `query` from all configured sources.
   *
   * @param query   - Free-text query. Empty query returns [].
   * @param options - Retrieval configuration overrides.
   * @returns Array of CitedSnippet, ordered by relevance DESC then file ASC.
   */
  retrieve(query: string, options: RetrievalOptions = {}): CitedSnippet[] {
    const opts: Required<RetrievalOptions> = { ...RETRIEVAL_DEFAULTS, ...options };
    const terms = tokenise(query);
    if (terms.length === 0) return [];

    const allMatches: RawMatch[] = [];

    for (const source of this._sources) {
      const files = collectFiles(source, this._fs);
      for (const file of files) {
        const matches = searchFile(file, terms, this._fs, opts);
        allMatches.push(...matches);
      }
    }

    // Sort: relevance DESC, file ASC (deterministic)
    allMatches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.file.localeCompare(b.file);
    });

    return allMatches.slice(0, opts.topK).map((m) => ({
      content: m.snippet,
      citation: {
        file: m.file,
        section: m.section,
        matchedTerms: m.matchedTerms,
      },
      relevanceScore: Math.round(m.score * 1000) / 1000,
    }));
  }

  /**
   * Convert retrieved snippets to `ContextItem` objects for use with
   * the ContextBudgeter.  Each item key is built from file + section.
   *
   * @param snippets - Output from `retrieve()`
   * @returns Array of ContextItem ready for `budget()`
   */
  toContextItems(snippets: CitedSnippet[]): ContextItem[] {
    return snippets.map((s) => {
      const sectionPart = s.citation.section ? `#${s.citation.section}` : '';
      const key = `${s.citation.file}${sectionPart}`;
      return {
        key,
        content: `${s.content}\n\n_Source: [${s.citation.file}](${s.citation.file})${s.citation.section ? ` § ${s.citation.section}` : ''}_`,
        relevanceScore: s.relevanceScore,
        tier: 'doc' as const,
      };
    });
  }
}

// ─── Default source list helper ───────────────────────────────

/**
 * Build a standard source list for the current project layout.
 *
 * @param baseDir - Project root directory
 */
export function defaultSources(baseDir: string): RetrievalSource[] {
  return [
    { path: `${baseDir}/BusinessDocs/decisions`, label: 'decisions' },
    { path: `${baseDir}/docs`, label: 'docs' },
    { path: `${baseDir}/BusinessDocs/decisions.md`, label: 'decisions-index' },
  ];
}
