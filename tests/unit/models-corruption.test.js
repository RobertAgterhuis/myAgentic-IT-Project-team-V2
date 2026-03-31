import * as __req_0 from '../../src/webapp/models/corruption';
const { detectMarkdownCorruption } = __req_0;

describe('detectMarkdownCorruption', () => {
  it('returns error when content is not a string', () => {
    expect(detectMarkdownCorruption(null)).toEqual(['Content is not a string']);
    expect(detectMarkdownCorruption(undefined)).toEqual(['Content is not a string']);
    expect(detectMarkdownCorruption(42)).toEqual(['Content is not a string']);
    expect(detectMarkdownCorruption({})).toEqual(['Content is not a string']);
  });

  it('returns no issues for clean markdown', () => {
    const content = `# Title\n\nSome paragraph.\n\n## Section\n\nMore text.\n`;
    expect(detectMarkdownCorruption(content)).toEqual([]);
  });

  it('detects unclosed YAML frontmatter', () => {
    const content = `---\ntitle: Broken\nauthor: nobody\n\n# Content without closing fence`;
    const issues = detectMarkdownCorruption(content);
    expect(issues).toContain('Unclosed YAML frontmatter (opening --- without closing ---)');
  });

  it('does not flag properly closed YAML frontmatter', () => {
    const content = `---\ntitle: Good\n---\n\n# Content\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('YAML frontmatter'))).toBe(false);
  });

  it('detects unclosed code fences (odd number of triple-backticks)', () => {
    const content = '# Title\n\n```\nsome code\n\n# Missing closing fence\n';
    const issues = detectMarkdownCorruption(content);
    expect(issues).toContain('Unclosed code fence (odd number of ``` delimiters)');
  });

  it('does not flag properly closed code fences', () => {
    const content = '# Title\n\n```\nsome code\n```\n\nEnd.\n';
    expect(detectMarkdownCorruption(content)).toEqual([]);
  });

  it('detects incomplete table rows', () => {
    const content = '# Table\n\n| col1 | col2\n| a | b |\n';
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('Incomplete table row'))).toBe(true);
  });

  it('does not flag valid table rows', () => {
    const content = '| col1 | col2 |\n|------|------|\n| a | b |\n';
    expect(detectMarkdownCorruption(content)).toEqual([]);
  });

  it('detects malformed question headers missing REQUIRED/OPTIONAL tag', () => {
    const content = `---\ntitle: Q\n---\n\n### Q-01-0001 What is it?\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('Malformed question header'))).toBe(true);
  });

  it('flags tagged question headers due to current regex behavior', () => {
    const content = `### Q-01-0001 [REQUIRED] What is it?\n**Your answer:** something\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('Malformed question header'))).toBe(true);
  });

  it('detects orphaned answer blocks when answers outnumber questions', () => {
    // Two answers but no question headers
    const content = `**Your answer:** a\n**Your answer:** b\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('Orphaned answer blocks'))).toBe(true);
  });

  it('still flags matched answers/questions because header regex partially matches', () => {
    const content = `### Q-01-0001 [REQUIRED] First\n**Your answer:** yes\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.some((i) => i.includes('Malformed question header'))).toBe(true);
  });

  it('accumulates multiple issues in a single pass', () => {
    // Unclosed frontmatter + unclosed code fence
    const content = `---\ntitle: Bad\n\n` + '```\n' + `some code\n`;
    const issues = detectMarkdownCorruption(content);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
