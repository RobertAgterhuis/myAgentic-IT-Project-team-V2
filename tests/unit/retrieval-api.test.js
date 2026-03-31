/**
 * Retrieval API — Unit Tests (I-A4-003)
 *
 * Covers:
 *   - tokenise: stop-word removal, lower-casing, min-length filtering
 *   - nearestHeading: finds the closest preceding Markdown heading
 *   - scoreBlock: relevance scoring by term density
 *   - RetrievalApi.retrieve: keyword search with citation metadata
 *   - RetrievalApi.toContextItems: CitedSnippet → ContextItem conversion
 *   - defaultSources: default source list construction
 *   - Edge cases: empty query, no matches, missing files
 */

import * as __req_0 from '../../platform/engine/retrieval-api';
const { tokenise, nearestHeading, scoreBlock, RetrievalApi, defaultSources } = __req_0;

// ─── Mock FS ──────────────────────────────────────────────────

function createMockFs(files = {}) {
  return {
    exists: (p) => p in files || Object.keys(files).some((f) => f.startsWith(p + '/')),
    isDirectory: (p) =>
      Object.keys(files).some((f) => f.startsWith(p + '/') || f.startsWith(p + '\\')),
    readdir: (p, _recursive) => {
      const prefix = p.endsWith('/') ? p : p + '/';
      return Object.keys(files)
        .filter((f) => f.startsWith(prefix))
        .map((f) => f); // return absolute paths for simplicity
    },
    readFile: (p) => {
      if (!(p in files)) throw new Error(`File not found: ${p}`);
      return files[p];
    },
  };
}

// ─── tokenise ────────────────────────────────────────────────

describe('tokenise', () => {
  it('splits on non-word characters and lowercases', () => {
    expect(tokenise('Hello WORLD')).toEqual(['hello', 'world']);
  });

  it('removes stop words', () => {
    const tokens = tokenise('the quick brown fox and the lazy dog');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('and');
    expect(tokens).toContain('quick');
    expect(tokens).toContain('brown');
  });

  it('removes single-character tokens', () => {
    const tokens = tokenise('a b c foo bar');
    expect(tokens.every((t) => t.length > 1)).toBe(true);
  });

  it('returns empty array for empty string', () => {
    expect(tokenise('')).toEqual([]);
  });

  it('returns empty array when all tokens are stop words', () => {
    expect(tokenise('the and or is')).toEqual([]);
  });
});

// ─── nearestHeading ───────────────────────────────────────────

describe('nearestHeading', () => {
  it('returns the nearest preceding heading', () => {
    const lines = ['## General Rules', 'Some text.', '', 'More text.'];
    expect(nearestHeading(lines, 3)).toBe('General Rules');
  });

  it('returns the correct heading level', () => {
    const lines = ['# Top', '## Sub', 'content'];
    expect(nearestHeading(lines, 2)).toBe('Sub');
  });

  it('returns empty string when no heading precedes', () => {
    const lines = ['just text', 'more text'];
    expect(nearestHeading(lines, 1)).toBe('');
  });

  it('handles heading on the same line as match', () => {
    const lines = ['## My Section'];
    expect(nearestHeading(lines, 0)).toBe('My Section');
  });
});

// ─── scoreBlock ───────────────────────────────────────────────

describe('scoreBlock', () => {
  it('returns 0 for no terms', () => {
    expect(scoreBlock('any text here', [])).toBe(0);
  });

  it('returns 1 when all terms match', () => {
    expect(scoreBlock('use eslint for typescript', ['eslint', 'typescript'])).toBe(1);
  });

  it('returns partial score for subset of terms', () => {
    expect(scoreBlock('use eslint here', ['eslint', 'typescript'])).toBe(0.5);
  });

  it('is case-insensitive', () => {
    expect(scoreBlock('TypeScript ESLint Rules', ['typescript', 'eslint'])).toBe(1);
  });

  it('returns 0 when no terms match', () => {
    expect(scoreBlock('unrelated text', ['typescript', 'eslint'])).toBe(0);
  });
});

// ─── RetrievalApi ─────────────────────────────────────────────

describe('RetrievalApi — retrieve', () => {
  const fileContent = `
# TypeScript Configuration

## ESLint Rules

Use \`@typescript-eslint/no-explicit-any\` to prevent any types.

## Prettier Integration

Use prettier with eslint for consistent formatting.
  `.trim();

  it('returns citations with file, section, and matchedTerms', () => {
    const mockFs = createMockFs({
      'decisions/typescript-eslint.md': fileContent,
    });
    const api = new RetrievalApi(mockFs, [{ path: 'decisions', label: 'decisions' }]);
    const results = api.retrieve('typescript eslint rules');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].citation.file).toBe('decisions/typescript-eslint.md');
    expect(results[0].citation.matchedTerms.length).toBeGreaterThan(0);
    expect(typeof results[0].citation.section).toBe('string');
  });

  it('returns empty array for empty query', () => {
    const mockFs = createMockFs({ 'decisions/file.md': 'some content' });
    const api = new RetrievalApi(mockFs, [{ path: 'decisions' }]);
    expect(api.retrieve('')).toEqual([]);
  });

  it('returns empty array when no terms match', () => {
    const mockFs = createMockFs({
      'decisions/typescript-eslint.md': 'only typescript content',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'decisions' }]);
    const results = api.retrieve('completely unrelated xyz');
    expect(results).toEqual([]);
  });

  it('respects topK limit', () => {
    // File with many matching lines
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i}: eslint rule here`);
    const mockFs = createMockFs({ 'decisions/file.md': lines.join('\n') });
    const api = new RetrievalApi(mockFs, [{ path: 'decisions' }]);
    const results = api.retrieve('eslint rule', { topK: 3 });
    expect(results).toHaveLength(3);
  });

  it('sorts results by relevance descending (then file ascending)', () => {
    const mockFs = createMockFs({
      'docs/a.md': 'eslint typescript prettier',
      'docs/b.md': 'eslint only mention',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'docs' }]);
    const results = api.retrieve('eslint typescript prettier');
    // a.md has all three terms → higher score
    if (results.length >= 2) {
      expect(results[0].citation.file).toBe('docs/a.md');
    }
  });

  it('handles missing source directory gracefully', () => {
    const mockFs = createMockFs({});
    const api = new RetrievalApi(mockFs, [{ path: 'nonexistent-dir' }]);
    const results = api.retrieve('eslint');
    expect(results).toEqual([]);
  });

  it('relevanceScore is in [0, 1]', () => {
    const mockFs = createMockFs({
      'docs/rules.md': 'use typescript eslint for every project',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'docs' }]);
    const results = api.retrieve('typescript eslint');
    for (const r of results) {
      expect(r.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(r.relevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('snippet is capped at snippetMaxChars', () => {
    const longContent = 'eslint '.repeat(200);
    const mockFs = createMockFs({ 'docs/long.md': longContent });
    const api = new RetrievalApi(mockFs, [{ path: 'docs' }]);
    const results = api.retrieve('eslint', { snippetMaxChars: 50 });
    if (results.length > 0) {
      expect(results[0].content.length).toBeLessThanOrEqual(55); // 50 + ellipsis
    }
  });

  it('searches multiple sources', () => {
    const mockFs = createMockFs({
      'decisions/typescript.md': 'typescript eslint rules here',
      'docs/guide.md': 'eslint usage in the project',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'decisions' }, { path: 'docs' }]);
    const results = api.retrieve('eslint');
    const files = results.map((r) => r.citation.file);
    expect(files.some((f) => f.includes('decisions'))).toBe(true);
    expect(files.some((f) => f.includes('docs'))).toBe(true);
  });

  it('skips non-searchable extensions', () => {
    const mockFs = createMockFs({
      'docs/image.png': 'not text',
      'docs/rules.md': 'eslint rules',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'docs' }]);
    const results = api.retrieve('eslint');
    const files = results.map((r) => r.citation.file);
    expect(files.every((f) => !f.endsWith('.png'))).toBe(true);
  });
});

// ─── RetrievalApi — toContextItems ────────────────────────────

describe('RetrievalApi — toContextItems', () => {
  it('converts CitedSnippet to ContextItem array', () => {
    const mockFs = createMockFs({
      'docs/rules.md': 'typescript eslint rules for the project',
    });
    const api = new RetrievalApi(mockFs, [{ path: 'docs' }]);
    const snippets = api.retrieve('typescript eslint');
    const items = api.toContextItems(snippets);
    expect(items.length).toBe(snippets.length);
    for (const item of items) {
      expect(typeof item.key).toBe('string');
      expect(typeof item.content).toBe('string');
      expect(item.tier).toBe('doc');
      expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
      // Content should embed the source citation
      expect(item.content).toContain('Source:');
    }
  });

  it('returns empty array for empty snippets', () => {
    const api = new RetrievalApi(createMockFs({}), []);
    expect(api.toContextItems([])).toEqual([]);
  });

  it('key includes section when present', () => {
    const snippets = [
      {
        content: 'text',
        citation: { file: 'docs/rules.md', section: 'My Section', matchedTerms: ['rules'] },
        relevanceScore: 0.8,
      },
    ];
    const api = new RetrievalApi(createMockFs({}), []);
    const items = api.toContextItems(snippets);
    expect(items[0].key).toBe('docs/rules.md#My Section');
  });

  it('key omits section marker when section is empty', () => {
    const snippets = [
      {
        content: 'text',
        citation: { file: 'docs/rules.md', section: '', matchedTerms: [] },
        relevanceScore: 0.5,
      },
    ];
    const api = new RetrievalApi(createMockFs({}), []);
    const items = api.toContextItems(snippets);
    expect(items[0].key).toBe('docs/rules.md');
  });
});

// ─── defaultSources ───────────────────────────────────────────

describe('defaultSources', () => {
  it('returns three default source entries', () => {
    const sources = defaultSources('/project');
    expect(sources.length).toBe(3);
    expect(sources.some((s) => s.path.includes('decisions'))).toBe(true);
    expect(sources.some((s) => s.path.includes('docs'))).toBe(true);
  });
});
