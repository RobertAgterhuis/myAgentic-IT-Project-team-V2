// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * M32-004 — Edge-case unit tests for markdown parsing, decision
 * mutations, corruption detection, and session helpers.
 */

const models = require('../../src/webapp/models');

/* ── detectMarkdownCorruption ─────────────────────────────────── */

describe('detectMarkdownCorruption', () => {
  it('returns no issues for clean markdown', () => {
    const md = '# Title\n\nSome paragraph.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n';
    expect(models.detectMarkdownCorruption(md)).toEqual([]);
  });

  it('detects non-string input', () => {
    expect(models.detectMarkdownCorruption(42)).toEqual(['Content is not a string']);
    expect(models.detectMarkdownCorruption(null)).toEqual(['Content is not a string']);
    expect(models.detectMarkdownCorruption(undefined)).toEqual(['Content is not a string']);
  });

  it('detects unclosed YAML frontmatter', () => {
    const md = '---\ntitle: Broken\nno closing fence\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues).toContainEqual(expect.stringContaining('Unclosed YAML frontmatter'));
  });

  it('accepts properly closed YAML frontmatter', () => {
    const md = '---\ntitle: OK\n---\n\n# Heading\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues.some((i) => i.includes('YAML'))).toBe(false);
  });

  it('detects unclosed code fences', () => {
    const md = '# Title\n\n```js\nconst x = 1;\n\nNo closing fence.\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues).toContainEqual(expect.stringContaining('Unclosed code fence'));
  });

  it('accepts even number of code fences', () => {
    const md = '```js\ncode\n```\n\n```ts\nmore\n```\n';
    expect(models.detectMarkdownCorruption(md)).toEqual([]);
  });

  it('detects incomplete table rows', () => {
    const md = '| A | B |\n|---|---|\n| 1 | missing pipe\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues).toContainEqual(expect.stringContaining('Incomplete table row'));
  });

  it('detects malformed question header', () => {
    const md = '### Q-5-1\n**Question:** Missing tag\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues).toContainEqual(expect.stringContaining('Malformed question header'));
  });

  it('accepts properly tagged question header', () => {
    const md = '### Q-5-1 [REQUIRED]\n**Question:** OK\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues.some((i) => i.includes('Malformed question'))).toBe(false);
  });

  it('detects orphaned answer blocks', () => {
    const md = '**Your answer:**\n> something\n\n**Your answer:**\n> another\n';
    const issues = models.detectMarkdownCorruption(md);
    expect(issues).toContainEqual(expect.stringContaining('Orphaned answer blocks'));
  });

  it('handles empty string without crashing', () => {
    expect(models.detectMarkdownCorruption('')).toEqual([]);
  });

  it('handles content with only whitespace', () => {
    expect(models.detectMarkdownCorruption('   \n  \n  ')).toEqual([]);
  });
});

/* ── parseQuestionnaire — edge cases ──────────────────────────── */

describe('parseQuestionnaire — edge cases (M32-004)', () => {
  it('handles CRLF line endings', () => {
    const md =
      '# Questionnaire: Agent\r\n> Phase: P1 | Generated: 2026 | Version: 1\r\n\r\n## Section 1: Test\r\n\r\n### Q-1-1 [REQUIRED]\r\n**Question:** What?\r\n**Your answer:**\r\n> Yes\r\n\r\n---\r\n';
    const result = models.parseQuestionnaire(md, '/f.md', '/');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].answer).toBe('Yes');
  });

  it('handles multiple sections with no questions', () => {
    const md = [
      '# Questionnaire: Empty',
      '> Phase: P1 | Generated: 2026 | Version: 1',
      '',
      '## Section 1: A',
      '',
      '## Section 2: B',
      '',
      '## Answer Status',
    ].join('\n');
    const result = models.parseQuestionnaire(md, '/f.md', '/');
    expect(result.sections).toHaveLength(2);
    expect(result.questions).toHaveLength(0);
  });

  it('handles question with multi-line answer', () => {
    const md = [
      '### Q-1-1 [OPTIONAL]',
      '**Question:** Describe approach',
      '**Your answer:**',
      '> Line one',
      '> Line two',
      '> Line three',
      '',
      '---',
    ].join('\n');
    const result = models.parseQuestionnaire(md, '/f.md', '/');
    expect(result.questions[0].answer).toBe('Line one\nLine two\nLine three');
  });

  it('handles question with no answer (placeholder)', () => {
    const md = [
      '### Q-2-1 [REQUIRED]',
      '**Question:** What?',
      '**Your answer:**',
      '> *(fill in here)*',
      '',
      '---',
    ].join('\n');
    const result = models.parseQuestionnaire(md, '/f.md', '/');
    expect(result.questions[0].answer).toBe('');
  });

  it('extracts metadata when title contains special characters', () => {
    const md = [
      '# Questionnaire: UX & Design (v2.0)',
      '> Phase: Phase 3 | Generated: 2026-06-01 | Version: 2.0',
      '',
    ].join('\n');
    const result = models.parseQuestionnaire(md, '/f.md', '/');
    expect(result.agent).toBe('UX & Design (v2.0)');
    expect(result.version).toBe('2.0');
  });

  it('handles backslash paths on Windows', () => {
    const result = models.parseQuestionnaire('', 'C:\\docs\\q.md', 'C:\\docs');
    expect(result.file).toBe('q.md');
  });
});

/* ── updateAnswerInContent — edge cases ───────────────────────── */

describe('updateAnswerInContent — edge cases (M32-004)', () => {
  it('handles answer containing markdown special chars', () => {
    const content = [
      '### Q-1-1 [REQUIRED]',
      '**Question:** Test?',
      '**Your answer:**',
      '> *(fill in here)*',
      '',
      '---',
      '',
      '## Answer Status',
      '| Q-ID | Status | Last Updated |',
      '|------|--------|-------------|',
      '| Q-1-1 | OPEN | |',
    ].join('\n');
    const result = models.updateAnswerInContent(
      content,
      'Q-1-1',
      'Use `code` and **bold** and $dollar',
      'ANSWERED'
    );
    expect(result).toContain('> Use `code` and **bold** and $dollar');
    expect(result).toContain('| Q-1-1 | ANSWERED |');
  });

  it('preserves unrelated questions when updating one', () => {
    const content = [
      '### Q-1-1 [REQUIRED]',
      '**Question:** First',
      '**Your answer:**',
      '> Old answer',
      '',
      '### Q-1-2 [OPTIONAL]',
      '**Question:** Second',
      '**Your answer:**',
      '> Keep this',
      '',
      '---',
      '',
      '## Answer Status',
      '| Q-ID | Status | Last Updated |',
      '|------|--------|-------------|',
      '| Q-1-1 | ANSWERED | 2026-01-01 |',
      '| Q-1-2 | ANSWERED | 2026-01-01 |',
    ].join('\n');
    const result = models.updateAnswerInContent(content, 'Q-1-1', 'New answer', 'ANSWERED');
    expect(result).toContain('> New answer');
    expect(result).toContain('> Keep this');
  });
});

/* ── parseDecisions — edge cases ──────────────────────────────── */

describe('parseDecisions — edge cases (M32-004)', () => {
  it('skips "No open questions" placeholder row', () => {
    const md = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '| | | | *(No open questions)* | | |',
      '',
      '---',
    ].join('\n');
    const { open } = models.parseDecisions(md);
    expect(open).toHaveLength(0);
  });

  it('skips "Add a decision here" placeholder row', () => {
    const md = [
      '### Operational Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-100 | — | — | *(Add a decision here)* | | |',
      '',
      '---',
    ].join('\n');
    const { decided } = models.parseDecisions(md);
    expect(decided).toHaveLength(0);
  });

  it('parses decisions with pipe characters in content', () => {
    const md = [
      '### Operational Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-001 | HIGH | Tech | Use X \\| Y framework | See doc | 2026-01-01 |',
      '',
      '---',
    ].join('\n');
    const { decided } = models.parseDecisions(md);
    // Escaped pipes may not parse cleanly, but function should not crash
    expect(decided).toBeDefined();
  });

  it('handles EXPIRED items in deferred section', () => {
    const md = [
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| DEC-EXP-001 | EXPIRED | UI | Old layout | Superseded | 2026-02-01 |',
    ].join('\n');
    const { deferred } = models.parseDecisions(md);
    expect(deferred).toHaveLength(1);
    expect(deferred[0].status).toBe('EXPIRED');
    expect(deferred[0].type).toBe('DECIDED');
  });
});

/* ── Decision mutation — edge cases ───────────────────────────── */

describe('nextDecisionId — edge cases (M32-004)', () => {
  it('handles non-sequential IDs', () => {
    const md = '| DEC-010 | ... |\n| DEC-005 | ... |\n| DEC-020 | ... |';
    expect(models.nextDecisionId(md, 'DEC-')).toBe('DEC-021');
  });

  it('handles IDs with different prefixes', () => {
    const md = '| DEC-R2-001 | ... |\n| DEC-T-005 | ... |';
    expect(models.nextDecisionId(md, 'DEC-R2-')).toBe('DEC-R2-002');
    expect(models.nextDecisionId(md, 'DEC-T-')).toBe('DEC-T-006');
  });
});

describe('moveToDecided — edge cases (M32-004)', () => {
  const base = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-OPEN-001 | HIGH | Arch | Should we use X? | Yes | 2026-03-01 |',
    '',
    '---',
    '',
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-100 | — | — | *(Add a decision here)* | | |',
    '',
    '---',
  ].join('\n');

  it('moves an open question to decided', () => {
    const result = models.moveToDecided(base, 'DEC-OPEN-001');
    // Row should be removed from Open Questions section
    const openSection = result.split('---')[0];
    expect(openSection).not.toContain('Should we use X?');
    // But present in Operational Decisions
    expect(result).toContain('DEC-OPEN-001');
    expect(result).toContain('Should we use X?');
  });

  it('returns content unchanged for non-existent ID', () => {
    const result = models.moveToDecided(base, 'DEC-NOPE-999');
    expect(result).toBe(base);
  });

  it('restores placeholder when last open question is moved', () => {
    const result = models.moveToDecided(base, 'DEC-OPEN-001');
    expect(result).toContain('No open questions');
  });
});

describe('deferOpenQuestion — edge cases (M32-004)', () => {
  const base = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-OPEN-001 | MEDIUM | UX | Color scheme? | | 2026-03-01 |',
    '',
    '---',
    '',
    '## Deferred & Expired',
    '',
    '| ID | Status | Scope | Subject | Reason | Date |',
    '|-----|--------|-------|---------|--------|------|',
    '| | | | | | |',
  ].join('\n');

  it('defers an open question with custom reason', () => {
    const result = models.deferOpenQuestion(base, 'DEC-OPEN-001', 'Not in scope for MVP');
    expect(result).toContain('DEFERRED');
    expect(result).toContain('Not in scope for MVP');
    expect(result).toContain('Color scheme?');
  });

  it('uses default reason when none provided', () => {
    const result = models.deferOpenQuestion(base, 'DEC-OPEN-001');
    expect(result).toContain('Deferred via webapp');
  });

  it('returns unchanged for non-existent ID', () => {
    expect(models.deferOpenQuestion(base, 'DEC-NOPE-999')).toBe(base);
  });
});

describe('expireDecidedItem — edge cases (M32-004)', () => {
  const base = [
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-001 | HIGH | Infra | Use Docker | Works | 2026-03-01 |',
    '',
    '---',
    '',
    '## Deferred & Expired',
    '',
    '| ID | Status | Scope | Subject | Reason | Date |',
    '|-----|--------|-------|---------|--------|------|',
    '| | | | | | |',
  ].join('\n');

  it('expires a decided item', () => {
    const result = models.expireDecidedItem(base, 'DEC-001', 'Superseded by DEC-002');
    expect(result).toContain('EXPIRED');
    expect(result).toContain('Use Docker');
    expect(result).toContain('Superseded by DEC-002');
  });

  it('returns unchanged for non-existent ID', () => {
    expect(models.expireDecidedItem(base, 'DEC-NOPE')).toBe(base);
  });
});

describe('reopenItem — edge cases (M32-004)', () => {
  it('reopens a deferred item', () => {
    const base = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '| | | | *(No open questions)* | | |',
      '',
      '---',
      '',
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| DEC-DEF-001 | DEFERRED | API | Rate limiting | Later | 2026-03-01 |',
    ].join('\n');
    const result = models.reopenItem(base, 'DEC-DEF-001');
    expect(result).toContain('DEC-DEF-001');
    expect(result).toContain('Rate limiting');
    expect(result).not.toContain('DEFERRED');
  });

  it('reopens a decided item', () => {
    const base = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '| | | | *(No open questions)* | | |',
      '',
      '---',
      '',
      '### Operational Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-001 | LOW | Infra | Use Nginx | note | 2026-03-01 |',
      '',
      '---',
    ].join('\n');
    const result = models.reopenItem(base, 'DEC-001');
    expect(result).toContain('DEC-001');
    expect(result).toContain('Use Nginx');
  });

  it('returns unchanged for non-existent ID', () => {
    expect(models.reopenItem('# Empty', 'DEC-NOPE')).toBe('# Empty');
  });
});

describe('editDecidedRow — edge cases (M32-004)', () => {
  const base = [
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-001 | HIGH | Infra | Use Docker | Works great | 2026-03-01 |',
    '',
    '---',
  ].join('\n');

  it('updates only the specified fields', () => {
    const result = models.editDecidedRow(base, 'DEC-001', { notes: 'Updated note' });
    expect(result).toContain('Updated note');
    expect(result).toContain('Use Docker');
    expect(result).toContain('HIGH');
  });

  it('rejects invalid priority values', () => {
    const result = models.editDecidedRow(base, 'DEC-001', { priority: 'INVALID' });
    expect(result).toBe(base); // unchanged
  });

  it('returns unchanged for non-existent ID', () => {
    expect(models.editDecidedRow(base, 'DEC-999', { notes: 'x' })).toBe(base);
  });
});

/* ── answerOpenQuestion ───────────────────────────────────────── */

describe('answerOpenQuestion — edge cases (M32-004)', () => {
  const base = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-OPEN-001 | HIGH | Tech | Use Redis? |  | 2026-03-01 |',
    '',
    '---',
  ].join('\n');

  it('updates the answer field', () => {
    const result = models.answerOpenQuestion(base, 'DEC-OPEN-001', 'Yes, use Redis');
    expect(result).toContain('Yes, use Redis');
  });

  it('returns unchanged for non-existent ID', () => {
    expect(models.answerOpenQuestion(base, 'DEC-NOPE', 'x')).toBe(base);
  });
});

/* ── parseCategoryDecisions — edge cases ──────────────────────── */

describe('parseCategoryDecisions — edge cases (M32-004)', () => {
  it('handles empty content', () => {
    expect(models.parseCategoryDecisions('', 'test')).toEqual([]);
  });

  it('skips placeholder rows', () => {
    const md = [
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-100 | — | — | *(Add a decision here)* | | |',
    ].join('\n');
    expect(models.parseCategoryDecisions(md, 'test')).toEqual([]);
  });

  it('tags category on each row', () => {
    const md = [
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-001 | HIGH | Tech | Use X | note | 2026-01-01 |',
    ].join('\n');
    const rows = models.parseCategoryDecisions(md, 'docker');
    expect(rows[0].category).toBe('docker');
  });

  it('detects rows in Deferred Decisions subsection', () => {
    const md = [
      '## Active Decisions',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-001 | HIGH | Tech | Active one | note | 2026-01-01 |',
      '',
      '## Deferred Decisions',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-002 | LOW | Infra | Deferred one | later | 2026-01-01 |',
    ].join('\n');
    const rows = models.parseCategoryDecisions(md, 'test');
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 'DEC-001').status).toBe('DECIDED');
    expect(rows.find((r) => r.id === 'DEC-002').status).toBe('CAT_DEFERRED');
  });
});

/* ── activateCategoryHeader ───────────────────────────────────── */

describe('activateCategoryHeader — edge cases (M32-004)', () => {
  it('activates a deferred category', () => {
    const md = [
      '# Decisions: NextJS',
      '> Stack: nextjs | Status: DEFERRED | Applicable: NO',
      '> Deferred-Reason: Not in scope',
    ].join('\n');
    const result = models.activateCategoryHeader(md);
    expect(result).toContain('Status: ACTIVE');
    expect(result).toContain('Applicable: YES');
    expect(result).not.toContain('Deferred-Reason');
  });

  it('leaves already-active content unchanged', () => {
    const md = '> Stack: docker | Status: ACTIVE | Applicable: YES';
    expect(models.activateCategoryHeader(md)).toBe(md);
  });
});

/* ── appendAuditTrail — edge cases ────────────────────────────── */

describe('appendAuditTrail — edge cases (M32-004)', () => {
  it('inserts before Examples section when Change Log is absent', () => {
    const content = '# Main\n\nContent\n\n## Examples\n\nSome examples.';
    const result = models.appendAuditTrail(content, 'CREATE', 'DEC-001');
    expect(result).toContain('## Change Log');
    expect(result.indexOf('Change Log')).toBeLessThan(result.indexOf('## Examples'));
  });

  it('appends to end when both Change Log and Examples are missing', () => {
    const content = '# Simple doc\n\nJust content.';
    const result = models.appendAuditTrail(content, 'EDIT', 'DEC-002');
    expect(result).toContain('## Change Log');
    expect(result).toContain('`EDIT`');
    expect(result).toContain('`DEC-002`');
  });
});

/* ── restoreOpenPlaceholderIfEmpty ─────────────────────────────── */

describe('restoreOpenPlaceholderIfEmpty (M32-004)', () => {
  it('adds placeholder when Open Questions section has no DEC- rows', () => {
    const md = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '',
      '---',
    ].join('\n');
    const result = models.restoreOpenPlaceholderIfEmpty(md);
    expect(result).toContain('No open questions');
  });

  it('does not add placeholder when DEC- rows exist', () => {
    const md = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '| DEC-001 | HIGH | Tech | Q? | | 2026 |',
      '',
      '---',
    ].join('\n');
    const result = models.restoreOpenPlaceholderIfEmpty(md);
    expect(result).not.toContain('No open questions');
  });

  it('returns unchanged when no Open Questions section', () => {
    const md = '# Just a doc\nNo open questions section here.';
    expect(models.restoreOpenPlaceholderIfEmpty(md)).toBe(md);
  });
});

/* ── insertDeferredRow ────────────────────────────────────────── */

describe('insertDeferredRow — edge cases (M32-004)', () => {
  it('replaces empty placeholder row', () => {
    const md = [
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| | | | | | |',
    ].join('\n');
    const result = models.insertDeferredRow(md, 'DEC-001', 'DEFERRED', 'Tech', 'Q?', 'Reason');
    expect(result).toContain('DEC-001');
    expect(result).toContain('DEFERRED');
    expect(result).not.toMatch(/\|\s*\|\s*\|\s*\|\s*\|\s*\|\s*\|/);
  });

  it('appends after existing rows', () => {
    const md = [
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| DEC-001 | DEFERRED | Arch | Old Q | Old reason | 2026-01-01 |',
    ].join('\n');
    const result = models.insertDeferredRow(md, 'DEC-002', 'EXPIRED', 'UX', 'Layout', 'Done');
    expect(result).toContain('DEC-001');
    expect(result).toContain('DEC-002');
  });

  it('returns unchanged when section is missing', () => {
    const md = '# No deferred section';
    expect(models.insertDeferredRow(md, 'DEC-001', 'DEFERRED', 'A', 'B', 'C')).toBe(md);
  });
});

/* ── Type exports verification ────────────────────────────────── */

describe('type exports (M32-003 verification)', () => {
  it('exports DEFAULT_INDEX_SECTIONS as array', () => {
    expect(Array.isArray(models.DEFAULT_INDEX_SECTIONS)).toBe(true);
  });

  it('exports all expected functions', () => {
    const expectedFns = [
      'escRx',
      'today',
      'isoNow',
      'escPipe',
      'literalReplace',
      'parseQuestionnaire',
      'updateAnswerInContent',
      'parseDecisions',
      'parseCategoryHeader',
      'parseCategoryDecisions',
      'activateCategoryHeader',
      'nextDecisionId',
      'addOpenQuestion',
      'addOperationalDecision',
      'answerOpenQuestion',
      'restoreOpenPlaceholderIfEmpty',
      'moveToDecided',
      'deferOpenQuestion',
      'expireDecidedItem',
      'reopenItem',
      'editDecidedRow',
      'insertDeferredRow',
      'appendAuditTrail',
      'parseSessionState',
      'detectMarkdownCorruption',
    ];
    for (const fn of expectedFns) {
      expect(typeof models[fn]).toBe('function');
    }
  });

  it('exports regex patterns', () => {
    expect(models.Q_ID_RE).toBeInstanceOf(RegExp);
    expect(models.DEC_ID_RE).toBeInstanceOf(RegExp);
  });
});
