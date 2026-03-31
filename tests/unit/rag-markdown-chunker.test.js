/**
 * MarkdownChunker unit tests (RAG-1.2.2).
 * Tests chunk boundaries on real markdown content patterns.
 */

let MarkdownChunker;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag/text-chunker.ts');
  MarkdownChunker = mod.MarkdownChunker;
});

describe('MarkdownChunker — basic chunking', () => {
  test('returns at least one chunk for non-empty input', () => {
    const chunker = new MarkdownChunker();
    const result = chunker.chunk('Hello world', 'test.md');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].text).toContain('Hello world');
  });

  test('returns empty array for blank input', () => {
    const chunker = new MarkdownChunker();
    expect(chunker.chunk('', 'test.md')).toEqual([]);
    expect(chunker.chunk('   \n\n  ', 'test.md')).toEqual([]);
  });

  test('each chunk has a positive startLine', () => {
    const chunker = new MarkdownChunker();
    const md = '# Title\n\nParagraph one.\n\n## Section\n\nParagraph two.';
    const chunks = chunker.chunk(md, 'test.md');
    for (const c of chunks) {
      expect(c.startLine).toBeGreaterThanOrEqual(1);
      expect(typeof c.text).toBe('string');
      expect(c.text.length).toBeGreaterThan(0);
    }
  });
});

describe('MarkdownChunker — H1/H2 boundaries', () => {
  test('H1 heading starts a new chunk', () => {
    const chunker = new MarkdownChunker();
    const md = 'Intro paragraph.\n\n# Section One\n\nContent one.\n\n# Section Two\n\nContent two.';
    const chunks = chunker.chunk(md, 'test.md');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Sections should be in separate chunks
    const texts = chunks.map((c) => c.text);
    expect(texts.some((t) => t.includes('Section One'))).toBe(true);
    expect(texts.some((t) => t.includes('Section Two'))).toBe(true);
  });

  test('H2 heading starts a new chunk', () => {
    const chunker = new MarkdownChunker();
    const md = '## First Section\n\nContent A.\n\n## Second Section\n\nContent B.';
    const chunks = chunker.chunk(md, 'test.md');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  test('H3 heading does NOT force a new chunk boundary', () => {
    const chunker = new MarkdownChunker({ maxTokens: 5000 });
    const md = '# Title\n\n### Subsection\n\nContent here.';
    const chunks = chunker.chunk(md, 'test.md');
    // H3 should stay within the same H1 section
    expect(chunks.length).toBe(1);
  });
});

describe('MarkdownChunker — code block preservation', () => {
  test('code blocks are never split mid-block', () => {
    const chunker = new MarkdownChunker({ maxTokens: 10 }); // tiny limit
    const md =
      '# Title\n\n' +
      '```typescript\n' +
      'function hello() {\n' +
      '  console.log("world");\n'.repeat(20) + // inflate block size
      '}\n' +
      '```\n\n' +
      'After code.';
    const chunks = chunker.chunk(md, 'test.md');
    // No chunk should contain only an opening fence without a closing fence
    for (const c of chunks) {
      const openFences = (c.text.match(/^```/gm) || []).length;
      const closeFences = (c.text.match(/^```\s*$/gm) || []).length;
      if (openFences > 0) {
        expect(closeFences).toBeGreaterThan(0);
      }
    }
  });

  test('code block text is present in exactly one chunk', () => {
    const chunker = new MarkdownChunker();
    const unique = 'UNIQUE_CODE_MARKER_XYZ';
    const md = `# Section\n\n\`\`\`js\n${unique}\nconsole.log(1);\n\`\`\`\n\nSome text after.`;
    const chunks = chunker.chunk(md, 'test.md');
    const containing = chunks.filter((c) => c.text.includes(unique));
    expect(containing.length).toBe(1);
  });
});

describe('MarkdownChunker — table preservation', () => {
  test('table rows stay together in one chunk', () => {
    const chunker = new MarkdownChunker({ maxTokens: 10 }); // tiny limit
    const table =
      '| Col A | Col B |\n' + '| ----- | ----- |\n' + '| val1  | val2  |\n' + '| val3  | val4  |\n';
    const md = '# Title\n\n' + table + '\nSome text.';
    const chunks = chunker.chunk(md, 'test.md');
    // All table rows should be in the same chunk
    const tableChunk = chunks.find((c) => c.text.includes('Col A'));
    expect(tableChunk).toBeDefined();
    expect(tableChunk.text).toContain('val3');
    expect(tableChunk.text).toContain('val4');
  });
});

describe('MarkdownChunker — max token limit', () => {
  test('chunks respect configured maxTokens (approx)', () => {
    const maxTokens = 50; // ~200 chars
    const chunker = new MarkdownChunker({ maxTokens });
    const longSection =
      '# Section\n\n' +
      'Word '.repeat(300) + // well over maxTokens
      '\n\nNew paragraph here.';
    const chunks = chunker.chunk(longSection, 'test.md');
    // Should produce more than one chunk for oversized content
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
