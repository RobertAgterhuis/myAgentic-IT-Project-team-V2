// Copyright (c) 2026 Robert Agterhuis. MIT License.
import * as __req_0 from '../../src/webapp/models';
const models = __req_0.default ?? __req_0;

/* ── Story #14: Domain model extraction (SP-R2-002-003) ──────── */

/* ── Shared utilities ─────────────────────────────────────────── */

describe('escRx', () => {
  it('escapes regex special characters', () => {
    expect(models.escRx('a.b+c')).toBe('a\\.b\\+c');
  });
});

describe('Q_ID_RE / DEC_ID_RE', () => {
  it('matches valid Q-IDs', () => {
    expect(models.Q_ID_RE.test('Q-1-1')).toBe(true);
    expect(models.Q_ID_RE.test('Q-99-1234')).toBe(true);
    expect(models.Q_ID_RE.test('Q-1-12345')).toBe(false);
  });

  it('matches valid DEC-IDs', () => {
    expect(models.DEC_ID_RE.test('DEC-R2-001')).toBe(true);
    expect(models.DEC_ID_RE.test('DEC-T-005')).toBe(true);
    expect(models.DEC_ID_RE.test('BAD')).toBe(false);
  });
});

/* ── Questionnaire parsing ─────────────────────────────────────── */

describe('parseQuestionnaire', () => {
  const sample = [
    '# Questionnaire: Software Architect',
    '> Phase: Phase 2 | Generated: 2026-03-01 | Version: 1.0',
    '',
    '## Section 1: Architecture',
    '',
    '### Q-5-1 [REQUIRED]',
    '**Question:** What is the target platform?',
    '**Why we need this:** To choose runtime',
    '**Expected format:** Free text',
    '**Example:** Node.js on Linux',
    '**Your answer:**',
    '> Localhost Node.js',
    '',
    '---',
    '',
    '## Answer Status',
    '| Q-ID | Status | Last Updated |',
    '|------|--------|-------------|',
    '| Q-5-1 | ANSWERED | 2026-03-02 |',
  ].join('\n');

  it('extracts agent, phase, version', () => {
    const q = models.parseQuestionnaire(sample, '/docs/q.md', '/docs');
    expect(q.agent).toBe('Software Architect');
    expect(q.phase).toBe('Phase 2');
    expect(q.version).toBe('1.0');
  });

  it('parses questions with answers and status', () => {
    const q = models.parseQuestionnaire(sample, '/docs/q.md', '/docs');
    expect(q.questions).toHaveLength(1);
    expect(q.questions[0].id).toBe('Q-5-1');
    expect(q.questions[0].classification).toBe('REQUIRED');
    expect(q.questions[0].question).toBe('What is the target platform?');
    expect(q.questions[0].answer).toBe('Localhost Node.js');
    expect(q.questions[0].status).toBe('ANSWERED');
  });

  it('sets relative file path', () => {
    const q = models.parseQuestionnaire(sample, '/docs/sub/q.md', '/docs');
    expect(q.file).toBe('sub/q.md');
  });
});

/* ── updateAnswerInContent ─────────────────────────────────────── */

describe('updateAnswerInContent', () => {
  const content = [
    '### Q-5-1 [REQUIRED]',
    '**Question:** Something?',
    '**Your answer:**',
    '> *(fill in here)*',
    '',
    '---',
    '',
    '## Answer Status',
    '| Q-ID | Status | Last Updated |',
    '|------|--------|-------------|',
    '| Q-5-1 | OPEN | |',
  ].join('\n');

  it('replaces placeholder with answer', () => {
    const updated = models.updateAnswerInContent(content, 'Q-5-1', 'My answer', 'ANSWERED');
    expect(updated).toContain('> My answer');
    expect(updated).not.toContain('fill in here');
  });

  it('updates status row', () => {
    const updated = models.updateAnswerInContent(content, 'Q-5-1', 'My answer', 'ANSWERED');
    expect(updated).toContain('| Q-5-1 | ANSWERED |');
  });
});

/* ── Decision parsing ──────────────────────────────────────────── */

describe('parseDecisions', () => {
  const decContent = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-OPEN-001 | HIGH | Tech | Should we use Redis? | | 2026-03-01 |',
    '',
    '---',
    '',
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-001 | MEDIUM | Infra | Use localhost only | Per DEC-R2-001 | 2026-03-01 |',
    '',
    '---',
    '',
    '## Deferred & Expired',
    '',
    '| ID | Status | Scope | Subject | Reason | Date |',
    '|-----|--------|-------|---------|--------|------|',
    '| DEC-DEF-001 | DEFERRED | UX | Color scheme | Pending brand | 2026-03-01 |',
  ].join('\n');

  it('parses open questions', () => {
    const { open } = models.parseDecisions(decContent);
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe('DEC-OPEN-001');
    expect(open[0].priority).toBe('HIGH');
  });

  it('parses operational decisions', () => {
    const { decided } = models.parseDecisions(decContent);
    expect(decided).toHaveLength(1);
    expect(decided[0].id).toBe('DEC-001');
    expect(decided[0].decision).toBe('Use localhost only');
  });

  it('parses deferred items', () => {
    const { deferred } = models.parseDecisions(decContent);
    expect(deferred).toHaveLength(1);
    expect(deferred[0].id).toBe('DEC-DEF-001');
    expect(deferred[0].status).toBe('DEFERRED');
  });

  it('returns empty arrays for empty content', () => {
    const r = models.parseDecisions('');
    expect(r).toEqual({ open: [], decided: [], deferred: [] });
  });
});

/* ── parseDecisions — data-driven indexSections (S7) ──────────── */

describe('parseDecisions — custom indexSections (S7)', () => {
  const customContent = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-OPEN-001 | HIGH | Tech | Should we use Redis? | | 2026-03-01 |',
    '',
    '---',
    '',
    '### Transformation Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-T-001 | HIGH | Arch | Migrate to monorepo | Approved | 2026-03-01 |',
    '',
    '### Reevaluation Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-R2-001 | MEDIUM | UX | Revisit nav | Pending | 2026-03-01 |',
    '',
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-001 | LOW | Infra | Use localhost only | note | 2026-03-01 |',
    '',
    '---',
  ].join('\n');

  it('parses default index sections (Transformation + Reevaluation)', () => {
    const { decided } = models.parseDecisions(customContent);
    expect(decided).toHaveLength(3);
    expect(decided.map((d) => d.id)).toEqual(['DEC-T-001', 'DEC-R2-001', 'DEC-001']);
  });

  it('accepts custom indexSections from template', () => {
    const customSections = [{ heading: 'Transformation Decisions', idPattern: 'DEC-T-[\\d]+' }];
    const { decided } = models.parseDecisions(customContent, { indexSections: customSections });
    // Only Transformation + Operational (default catch-all), NOT Reevaluation
    expect(decided).toHaveLength(2);
    expect(decided.map((d) => d.id)).toEqual(['DEC-T-001', 'DEC-001']);
  });

  it('accepts empty indexSections to skip named subsections', () => {
    const { decided } = models.parseDecisions(customContent, { indexSections: [] });
    // Only Operational decisions (default catch-all)
    expect(decided).toHaveLength(1);
    expect(decided[0].id).toBe('DEC-001');
  });

  it('exports DEFAULT_INDEX_SECTIONS', () => {
    expect(models.DEFAULT_INDEX_SECTIONS).toBeDefined();
    expect(Array.isArray(models.DEFAULT_INDEX_SECTIONS)).toBe(true);
    expect(models.DEFAULT_INDEX_SECTIONS.length).toBe(2);
    expect(models.DEFAULT_INDEX_SECTIONS[0].heading).toBe('Transformation Decisions');
    expect(models.DEFAULT_INDEX_SECTIONS[1].heading).toBe('Reevaluation Decisions');
  });
});

/* ── Decision mutation functions ───────────────────────────────── */

describe('nextDecisionId', () => {
  it('generates next sequential ID', () => {
    const content = '| DEC-001 | ... |\n| DEC-003 | ... |';
    expect(models.nextDecisionId(content, 'DEC-')).toBe('DEC-004');
  });

  it('starts at 001 when no IDs exist', () => {
    expect(models.nextDecisionId('no ids here', 'DEC-')).toBe('DEC-001');
  });
});

describe('addOpenQuestion', () => {
  const base = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| | | | *(No open questions)* | | |',
    '',
    '---',
  ].join('\n');

  it('replaces placeholder with new question', () => {
    const result = models.addOpenQuestion(base, {
      id: 'DEC-NEW-001',
      priority: 'HIGH',
      scope: 'Tech',
      question: 'New Q?',
      answer: '',
      date: '2026-03-07',
    });
    expect(result).toContain('DEC-NEW-001');
    expect(result).toContain('New Q?');
    expect(result).not.toContain('No open questions');
  });
});

describe('appendAuditTrail', () => {
  it('adds entry to existing Change Log', () => {
    const content = '## Change Log\n\n- old entry\n';
    const result = models.appendAuditTrail(content, 'ADD_OPEN', 'DEC-001');
    expect(result).toContain('`ADD_OPEN`');
    expect(result).toContain('`DEC-001`');
    expect(result).toContain('source: webapp');
  });

  it('creates Change Log section when missing', () => {
    const result = models.appendAuditTrail('some content', 'MOVE', 'DEC-002');
    expect(result).toContain('## Change Log');
    expect(result).toContain('`MOVE`');
  });
});

describe('parseSessionState', () => {
  it('parses valid JSON', () => {
    const r = models.parseSessionState('{"session_id":"s1"}');
    expect(r).toEqual({ session_id: 's1' });
  });

  it('returns null for invalid JSON', () => {
    expect(models.parseSessionState('{bad')).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(models.parseSessionState('')).toBeNull();
    expect(models.parseSessionState(null)).toBeNull();
  });
});

/* ── escPipe ──────────────────────────────────────────────────── */

describe('escPipe', () => {
  it('escapes pipe characters', () => {
    expect(models.escPipe('a|b|c')).toBe('a\\|b\\|c');
  });

  it('returns empty string for falsy input', () => {
    expect(models.escPipe('')).toBe('');
    expect(models.escPipe(null)).toBe('');
  });
});

/* ── literalReplace ───────────────────────────────────────────── */

describe('literalReplace', () => {
  it('replaces without expanding $-sequences', () => {
    const result = models.literalReplace('hello world', 'world', '$1 dollars');
    expect(result).toBe('hello $1 dollars');
  });

  it('replaces first occurrence only', () => {
    expect(models.literalReplace('ab ab', 'ab', 'cd')).toBe('cd ab');
  });
});

/* ── parseCategoryHeader ──────────────────────────────────────── */

describe('parseCategoryHeader', () => {
  it('parses an ACTIVE category header', () => {
    const content = [
      '# Decisions: Docker & Containers',
      '',
      '> Stack: docker | Status: ACTIVE | Applicable: YES',
    ].join('\n');

    const result = models.parseCategoryHeader(content);
    expect(result.name).toBe('Docker & Containers');
    expect(result.stack).toBe('docker');
    expect(result.status).toBe('ACTIVE');
    expect(result.applicable).toBe('YES');
    expect(result.reason).toBe('');
  });

  it('parses a DEFERRED category header with reason', () => {
    const content = [
      '# Decisions: NextJS Framework',
      '',
      '> Stack: nextjs | Status: DEFERRED | Applicable: NO',
      '> Deferred-Reason: Not applicable to current project',
    ].join('\n');

    const result = models.parseCategoryHeader(content);
    expect(result.name).toBe('NextJS Framework');
    expect(result.stack).toBe('nextjs');
    expect(result.status).toBe('DEFERRED');
    expect(result.applicable).toBe('NO');
    expect(result.reason).toBe('Not applicable to current project');
  });

  it('returns defaults for empty content', () => {
    const result = models.parseCategoryHeader('');
    expect(result.name).toBe('Unknown');
    expect(result.stack).toBe('unknown');
    expect(result.status).toBe('ACTIVE');
  });
});

/* ── parseCategoryDecisions ───────────────────────────────────── */

describe('parseCategoryDecisions', () => {
  it('parses decision rows from a category file', () => {
    const content = [
      '## Decided Items',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-100 | HIGH | Phase 2 | Use Docker Compose | Standard tooling | 2026-01-15 |',
      '| DEC-101 | MEDIUM | Phase 2 | Pin base images | Security req | 2026-01-16 |',
    ].join('\n');

    const rows = models.parseCategoryDecisions(content, 'docker');
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('DEC-100');
    expect(rows[0].priority).toBe('HIGH');
    expect(rows[0].decision).toBe('Use Docker Compose');
    expect(rows[0].category).toBe('docker');
    expect(rows[0].status).toBe('DECIDED');
    expect(rows[1].id).toBe('DEC-101');
  });

  it('marks rows in Deferred Decisions section as CAT_DEFERRED', () => {
    const content = [
      '## Decided Items',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-100 | HIGH | Phase 2 | Use Docker | Notes | 2026-01-15 |',
      '',
      '## Deferred Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-200 | LOW | Phase 3 | Evaluate K8s | Pending | 2026-01-20 |',
    ].join('\n');

    const rows = models.parseCategoryDecisions(content, 'docker');
    const deferred = rows.find((r) => r.id === 'DEC-200');
    expect(deferred).toBeDefined();
    expect(deferred.status).toBe('CAT_DEFERRED');
  });

  it('skips placeholder rows', () => {
    const content = [
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-100 | — | — | *(Add a decision here)* | | |',
    ].join('\n');

    const rows = models.parseCategoryDecisions(content, 'test');
    expect(rows).toHaveLength(0);
  });

  it('returns empty array when no rows match', () => {
    expect(models.parseCategoryDecisions('No table here', 'test')).toEqual([]);
  });
});

/* ── activateCategoryHeader ───────────────────────────────────── */

describe('activateCategoryHeader', () => {
  it('changes DEFERRED to ACTIVE and NO to YES', () => {
    const content = [
      '# Decisions: NextJS',
      '> Stack: nextjs | Status: DEFERRED | Applicable: NO',
      '> Deferred-Reason: Not needed yet',
    ].join('\n');

    const result = models.activateCategoryHeader(content);
    expect(result).toContain('Status: ACTIVE');
    expect(result).toContain('Applicable: YES');
    expect(result).not.toContain('Deferred-Reason');
  });

  it('is a no-op on already ACTIVE content', () => {
    const content = '> Stack: docker | Status: ACTIVE | Applicable: YES';
    expect(models.activateCategoryHeader(content)).toBe(content);
  });
});

/* ── answerOpenQuestion ───────────────────────────────────────── */

describe('answerOpenQuestion', () => {
  const openTable = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-Q-001 | HIGH | Tech | Which DB? | | |',
    '',
    '---',
  ].join('\n');

  it('fills in the answer and date for an open question', () => {
    const result = models.answerOpenQuestion(openTable, 'DEC-Q-001', 'PostgreSQL');
    expect(result).toContain('PostgreSQL');
    expect(result).not.toContain('| | |');
  });

  it('returns content unchanged if ID is not found', () => {
    expect(models.answerOpenQuestion(openTable, 'DEC-NOPE', 'x')).toBe(openTable);
  });
});

/* ── restoreOpenPlaceholderIfEmpty ─────────────────────────────── */

describe('restoreOpenPlaceholderIfEmpty', () => {
  it('inserts placeholder when open questions section is empty', () => {
    const content = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '',
      '---',
    ].join('\n');

    const result = models.restoreOpenPlaceholderIfEmpty(content);
    expect(result).toContain('No open questions');
  });

  it('does not add placeholder when questions exist', () => {
    const content = [
      '## Open Questions',
      '',
      '| ID | Priority | Scope | Question | Answer | Date |',
      '|-----|----------|-------|----------|--------|------|',
      '| DEC-Q-001 | HIGH | Tech | Which DB? | | |',
      '',
      '---',
    ].join('\n');

    const result = models.restoreOpenPlaceholderIfEmpty(content);
    expect(result).not.toContain('No open questions');
    expect(result).toBe(content);
  });

  it('returns content unchanged if no Open Questions section', () => {
    const content = 'just some text';
    expect(models.restoreOpenPlaceholderIfEmpty(content)).toBe(content);
  });
});

/* ── moveToDecided ────────────────────────────────────────────── */

describe('moveToDecided', () => {
  const fullDoc = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-Q-001 | HIGH | Tech | Which DB? | PostgreSQL | 2026-03-01 |',
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

  it('moves an open question to the decided table', () => {
    const result = models.moveToDecided(fullDoc, 'DEC-Q-001');
    expect(result).toContain('DEC-Q-001');
    expect(result).toContain('| DEC-Q-001 | HIGH | Tech | PostgreSQL |  |');
    expect(result).not.toContain('| DEC-Q-001 | HIGH | Tech | Which DB? | PostgreSQL |');
    // The original placeholder row should be removed and question moved to operational
    const lines = result.split('\n');
    const opIdx = lines.findIndex((l) => l.includes('Operational Decisions'));
    expect(opIdx).toBeGreaterThan(-1);
    // The question should no longer appear in the Open Questions section
    const openIdx = lines.findIndex((l) => l.includes('Open Questions'));
    const openSection = lines.slice(openIdx, opIdx).join('\n');
    expect(openSection).not.toContain('DEC-Q-001');
  });

  it('returns content unchanged if ID is not found', () => {
    expect(models.moveToDecided(fullDoc, 'DEC-NOPE')).toBe(fullDoc);
  });
});

/* ── deferOpenQuestion ────────────────────────────────────────── */

describe('deferOpenQuestion', () => {
  const doc = [
    '## Open Questions',
    '',
    '| ID | Priority | Scope | Question | Answer | Date |',
    '|-----|----------|-------|----------|--------|------|',
    '| DEC-Q-002 | MEDIUM | Ops | Deploy where? |  | |',
    '',
    '---',
    '',
    '## Deferred & Expired',
    '',
    '| ID | Status | Scope | Subject | Reason | Date |',
    '|-----|--------|-------|---------|--------|------|',
    '| | | | *(None)* | | |',
    '',
    '---',
  ].join('\n');

  it('moves question to deferred section', () => {
    const result = models.deferOpenQuestion(doc, 'DEC-Q-002', 'Not needed now');
    expect(result).toContain('DEC-Q-002');
    expect(result).toContain('DEFERRED');
    expect(result).toContain('Not needed now');
  });

  it('returns unchanged if ID not found', () => {
    expect(models.deferOpenQuestion(doc, 'DEC-NOPE')).toBe(doc);
  });
});

/* ── expireDecidedItem ────────────────────────────────────────── */

describe('expireDecidedItem', () => {
  const doc = [
    '### Operational Decisions',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-OP-001 | HIGH | Tech | Use Redis for cache | Fast | 2026-01-10 |',
    '',
    '---',
    '',
    '## Deferred & Expired',
    '',
    '| ID | Status | Scope | Subject | Reason | Date |',
    '|-----|--------|-------|---------|--------|------|',
    '| | | | *(None)* | | |',
    '',
    '---',
  ].join('\n');

  it('expires a decided item and moves to deferred section', () => {
    const result = models.expireDecidedItem(doc, 'DEC-OP-001', 'No longer valid');
    expect(result).toContain('EXPIRED');
    expect(result).toContain('DEC-OP-001');
  });

  it('returns unchanged if ID not found', () => {
    expect(models.expireDecidedItem(doc, 'DEC-NOPE')).toBe(doc);
  });
});

/* ── reopenItem ───────────────────────────────────────────────── */

describe('reopenItem', () => {
  it('reopens a deferred item back to open questions', () => {
    const doc = [
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
      '| DEC-Q-010 | DEFERRED | Tech | Evaluate Redis | Not enough info | 2026-02-01 |',
      '',
      '---',
    ].join('\n');

    const result = models.reopenItem(doc, 'DEC-Q-010');
    expect(result).toContain('DEC-Q-010');
    // Should appear in Open Questions area and be removed from Deferred
    expect(result.split('DEC-Q-010').length - 1).toBe(1);
  });

  it('returns unchanged if ID not found', () => {
    const doc = '## Open Questions\n\n---\n\n## Deferred & Expired\n\n---';
    expect(models.reopenItem(doc, 'DEC-NOPE')).toBe(doc);
  });
});

/* ── editDecidedRow ───────────────────────────────────────────── */

describe('editDecidedRow', () => {
  const doc = [
    '## Decided',
    '',
    '| ID | Priority | Scope | Decision | Notes | Date |',
    '|-----|----------|-------|----------|-------|------|',
    '| DEC-T-001 | HIGH | Tech | Use Node.js | Performance | 2026-01-15 |',
    '| DEC-T-002 | MEDIUM | UX | Dark theme | User request | 2026-01-20 |',
    '',
    '---',
  ].join('\n');

  it('edits an existing decided row with new text', () => {
    const result = models.editDecidedRow(doc, 'DEC-T-001', { text: 'Use Deno' });
    expect(result).toContain('Use Deno');
    expect(result).not.toContain('Use Node.js');
  });

  it('edits priority of an existing decided row', () => {
    const result = models.editDecidedRow(doc, 'DEC-T-002', { priority: 'LOW' });
    expect(result).toContain('LOW');
  });

  it('edits multiple fields at once', () => {
    const result = models.editDecidedRow(doc, 'DEC-T-001', {
      priority: 'LOW',
      scope: 'Infra',
      text: 'Use Bun',
      notes: 'Faster startup',
    });
    expect(result).toContain('LOW');
    expect(result).toContain('Infra');
    expect(result).toContain('Use Bun');
    expect(result).toContain('Faster startup');
  });

  it('returns unchanged if ID not found', () => {
    expect(models.editDecidedRow(doc, 'DEC-NOPE', { text: 'x' })).toBe(doc);
  });

  it('returns unchanged if invalid priority provided', () => {
    expect(models.editDecidedRow(doc, 'DEC-T-001', { priority: 'CRITICAL' })).toBe(doc);
  });
});

describe('migrateDecidedRowsToAnswerFormat', () => {
  it('rewrites decided rows that still store the question in the decision column', () => {
    const doc = [
      '### Operational Decisions',
      '',
      '| ID | Priority | Scope | Decision | Notes | Date |',
      '|-----|----------|-------|----------|-------|------|',
      '| DEC-T-001 | HIGH | Phase 2 | Which DB should we use? | PostgreSQL | 2026-03-01 |',
      '| DEC-T-002 | MEDIUM | Phase 3 | Use React | Team decision | 2026-03-02 |',
      '',
      '---',
    ].join('\n');

    const result = models.migrateDecidedRowsToAnswerFormat(doc);

    expect(result.changedRows).toBe(1);
    expect(result.content).toContain('| DEC-T-001 | HIGH | Phase 2 | PostgreSQL |  | 2026-03-01 |');
    expect(result.content).toContain(
      '| DEC-T-002 | MEDIUM | Phase 3 | Use React | Team decision | 2026-03-02 |'
    );
  });
});

/* ── insertDeferredRow ────────────────────────────────────────── */

describe('insertDeferredRow', () => {
  it('inserts a row replacing the empty placeholder', () => {
    const doc = [
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| | | | | | |',
      '',
      '---',
    ].join('\n');
    const result = models.insertDeferredRow(
      doc,
      'DEC-D-001',
      'DEFERRED',
      'Tech',
      'Redis eval',
      'Not enough info'
    );
    expect(result).toContain('DEC-D-001');
    expect(result).toContain('DEFERRED');
    expect(result).toContain('Redis eval');
  });

  it('inserts a row after existing data rows', () => {
    const doc = [
      '## Deferred & Expired',
      '',
      '| ID | Status | Scope | Subject | Reason | Date |',
      '|-----|--------|-------|---------|--------|------|',
      '| DEC-D-010 | DEFERRED | UX | Theme toggle | Low priority | 2026-02-01 |',
      '',
      '---',
    ].join('\n');
    const result = models.insertDeferredRow(
      doc,
      'DEC-D-011',
      'EXPIRED',
      'Tech',
      'Old API',
      'Deprecated'
    );
    expect(result).toContain('DEC-D-011');
    expect(result).toContain('EXPIRED');
    expect(result).toContain('DEC-D-010');
  });

  it('returns unchanged if Deferred section not found', () => {
    const doc = '## Decided\n\n---';
    expect(models.insertDeferredRow(doc, 'DEC-D-001', 'DEFERRED', 'Tech', 'X', 'Y')).toBe(doc);
  });
});

/* ── appendAuditTrail ─────────────────────────────────────────── */

describe('appendAuditTrail', () => {
  it('appends to existing Change Log section', () => {
    const doc = '## Change Log\n\n- old entry\n';
    const result = models.appendAuditTrail(doc, 'EDIT', 'DEC-T-001');
    expect(result).toContain('EDIT');
    expect(result).toContain('DEC-T-001');
    expect(result).toContain('source: webapp');
  });

  it('creates Change Log section before Examples', () => {
    const doc = '## Decided\n\nSome content\n\n## Examples\n\nExample text';
    const result = models.appendAuditTrail(doc, 'CREATE', 'DEC-Q-001');
    expect(result).toContain('## Change Log');
    expect(result).toContain('CREATE');
    expect(result.indexOf('## Change Log')).toBeLessThan(result.indexOf('## Examples'));
  });

  it('appends Change Log at end when no Examples section', () => {
    const doc = '## Decided\n\nSome content';
    const result = models.appendAuditTrail(doc, 'DEFER', 'DEC-Q-005');
    expect(result).toContain('## Change Log');
    expect(result).toContain('DEFER');
  });
});

/* ── parseSessionState ────────────────────────────────────────── */

describe('parseSessionState', () => {
  it('parses valid JSON session state', () => {
    const json = JSON.stringify({ session_id: 'S-1', status: 'ACTIVE' });
    const result = models.parseSessionState(json);
    expect(result.session_id).toBe('S-1');
  });

  it('returns null for empty content', () => {
    expect(models.parseSessionState('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(models.parseSessionState('not json{')).toBeNull();
  });
});
