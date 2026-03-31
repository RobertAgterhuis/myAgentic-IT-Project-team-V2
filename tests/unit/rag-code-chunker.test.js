let CodeChunker, AdaptiveChunker;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag/text-chunker.ts');
  CodeChunker = mod.CodeChunker;
  AdaptiveChunker = mod.AdaptiveChunker;
});

describe('CodeChunker', () => {
  test('prefers declaration boundaries for classes and functions', () => {
    const chunker = new CodeChunker({ maxTokens: 80 });
    const source = [
      'export class AuthProvider {',
      '  constructor(config) {',
      '    this.config = config;',
      '  }',
      '}',
      '',
      'export function createAuthProvider(config) {',
      '  return new AuthProvider(config);',
      '}',
      '',
      'export const providerName = "github";',
    ].join('\n');

    const chunks = chunker.chunk(source, 'src/auth.ts');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((chunk) => chunk.text.includes('class AuthProvider'))).toBe(true);
    expect(chunks.some((chunk) => chunk.text.includes('function createAuthProvider'))).toBe(true);
  });
});

describe('AdaptiveChunker', () => {
  test('routes TypeScript files through code-aware chunking', () => {
    const chunker = new AdaptiveChunker();
    const source = [
      'export class AuthProvider {}',
      '',
      'export function buildProvider() {',
      '  return new AuthProvider();',
      '}',
    ].join('\n');

    const chunks = chunker.chunk(source, 'src/auth.ts');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
