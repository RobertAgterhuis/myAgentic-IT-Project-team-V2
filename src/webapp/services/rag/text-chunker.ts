// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Text chunking abstractions for the RAG indexing pipeline.
 *
 * TextChunker interface is satisfied by:
 *   - MarkdownChunker — markdown-aware, respects headers / code blocks / tables
 *   - CodeChunker — code-aware, prefers function/class/export boundaries
 *   - AdaptiveChunker — delegates to markdown/code chunkers by file extension
 *
 * @module services/rag/text-chunker
 */

/* ── Interface ────────────────────────────────────────────────── */

export interface TextSegment {
  text: string;
  /** 1-based line number of the first line of this segment. */
  startLine: number;
}

export interface TextChunker {
  /** Split `text` (content of `filePath`) into segments for embedding. */
  chunk(text: string, filePath: string): TextSegment[];
}

function isCodeLikeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|java|cs|rb|php|rs|swift|kt)$/i.test(filePath);
}

/* ── Helpers ──────────────────────────────────────────────────── */

/** Rough token count: 1 token ≈ 4 characters (English prose). */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Split a text block into smaller pieces at empty-line (paragraph) boundaries. */
function splitAtParagraphs(lines: string[], startLine: number, maxTokens: number): TextSegment[] {
  const segments: TextSegment[] = [];
  let current: string[] = [];
  let segStart = startLine;

  function flush() {
    const text = current.join('\n').trim();
    if (text.length > 0) segments.push({ text, startLine: segStart });
    current = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    current.push(line);

    const isBlank = line.trim() === '';
    if (isBlank && approxTokens(current.join('\n')) >= maxTokens) {
      flush();
      segStart = startLine + i + 1;
    }
  }
  flush();
  return segments;
}

/* ── MarkdownChunker ──────────────────────────────────────────── */

export type MarkdownChunkerOptions = {
  /** Maximum tokens per chunk. Default: 512. */
  maxTokens?: number;
};

/**
 * Markdown-aware chunker that:
 *  1. Splits at H1/H2 section boundaries.
 *  2. Preserves fenced code blocks as atomic chunks (never split mid-block).
 *  3. Keeps table rows together.
 *  4. Sub-splits oversized sections at paragraph boundaries.
 */
export class MarkdownChunker implements TextChunker {
  private readonly maxTokens: number;

  constructor(opts: MarkdownChunkerOptions = {}) {
    this.maxTokens = opts.maxTokens ?? 512;
  }

  chunk(text: string, _filePath: string): TextSegment[] {
    const lines = text.split('\n');
    const segments: TextSegment[] = [];

    /* ── Accumulator ──────────────────────────────────────────── */
    let accumLines: string[] = [];
    let accumStart = 1; // 1-based
    let inCodeBlock = false;
    let inTable = false;

    const flush = () => {
      if (accumLines.length === 0) return;
      const raw = accumLines.join('\n').trim();
      if (raw.length === 0) {
        accumLines = [];
        return;
      }
      if (approxTokens(raw) <= this.maxTokens) {
        segments.push({ text: raw, startLine: accumStart });
      } else {
        /* Sub-split at paragraph boundaries. */
        const sub = splitAtParagraphs(accumLines, accumStart, this.maxTokens);
        segments.push(...sub);
      }
      accumLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;

      /* ── Code block toggle ──────────────────────────────────── */
      if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
        } else {
          inCodeBlock = false;
          /* Include the closing fence in the current accumulator — do not flush here,
             so the entire code block stays in one chunk. */
          accumLines.push(line);
          continue;
        }
      }

      /* ── If inside a code block: never split ───────────────── */
      if (inCodeBlock) {
        accumLines.push(line);
        continue;
      }

      /* ── Table detection ────────────────────────────────────── */
      const trimmed = line.trim();
      const isTableRow = trimmed.startsWith('|') || /^\|?[-:]+[-| :]*\|?$/.test(trimmed);

      if (isTableRow) {
        inTable = true;
        accumLines.push(line);
        continue;
      }
      if (inTable && trimmed !== '') {
        /* Non-table, non-blank line after a table row → table ended, continue normally. */
        inTable = false;
      } else if (inTable && trimmed === '') {
        /* Blank line ends a table. */
        inTable = false;
      }

      /* ── H1 / H2 boundary → flush and start new section ────── */
      const isH1orH2 = /^#{1,2}\s/.test(line);
      if (isH1orH2 && accumLines.length > 0) {
        flush();
        accumStart = lineNo;
      }

      accumLines.push(line);

      /* ── Auto-flush when accumulator exceeded max tokens ────── */
      if (!inTable && !inCodeBlock && approxTokens(accumLines.join('\n')) >= this.maxTokens) {
        /* Only split at a blank line (paragraph boundary). */
        if (trimmed === '') {
          flush();
          accumStart = lineNo + 1;
        }
      }
    }

    flush();
    return segments.filter((s) => s.text.length > 0);
  }
}

export type CodeChunkerOptions = {
  /** Maximum tokens per chunk. Default: 512. */
  maxTokens?: number;
};

/**
 * Code-aware chunker that prefers boundaries at common declarations.
 * Falls back to token/blank-line slicing when blocks become oversized.
 */
export class CodeChunker implements TextChunker {
  private readonly maxTokens: number;

  constructor(opts: CodeChunkerOptions = {}) {
    this.maxTokens = opts.maxTokens ?? 512;
  }

  chunk(text: string, _filePath: string): TextSegment[] {
    const lines = text.split('\n');
    const segments: TextSegment[] = [];
    const declarationRegex =
      /^\s*(export\s+)?(async\s+)?(function\s+\w+|class\s+\w+|interface\s+\w+|type\s+\w+\s*=|const\s+\w+\s*=\s*(async\s*)?\(?[^=]*\)?\s*=>|def\s+\w+|func\s+\w+|public\s+class\s+\w+|private\s+class\s+\w+)/;

    let accum: string[] = [];
    let accumStart = 1;

    const flushAccum = () => {
      if (accum.length === 0) return;
      const raw = accum.join('\n').trim();
      if (!raw) {
        accum = [];
        return;
      }

      if (approxTokens(raw) <= this.maxTokens) {
        segments.push({ text: raw, startLine: accumStart });
      } else {
        segments.push(...splitAtParagraphs(accum, accumStart, this.maxTokens));
      }
      accum = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;
      const isBoundary = declarationRegex.test(line);

      if (isBoundary && accum.length > 0) {
        flushAccum();
        accumStart = lineNo;
      }

      accum.push(line);

      if (approxTokens(accum.join('\n')) >= this.maxTokens && line.trim() === '') {
        flushAccum();
        accumStart = lineNo + 1;
      }
    }

    flushAccum();
    return segments.filter((segment) => segment.text.length > 0);
  }
}

/** Delegates chunking strategy by file extension. */
export class AdaptiveChunker implements TextChunker {
  constructor(
    private readonly markdownChunker: TextChunker = new MarkdownChunker(),
    private readonly codeChunker: TextChunker = new CodeChunker()
  ) {}

  chunk(text: string, filePath: string): TextSegment[] {
    if (isCodeLikeFile(filePath)) {
      return this.codeChunker.chunk(text, filePath);
    }
    return this.markdownChunker.chunk(text, filePath);
  }
}
