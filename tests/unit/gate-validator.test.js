'use strict';

/**
 * Gate Validator — Unit Tests (FEAT-05-C)
 *
 * Covers all 8 ACs:
 *   AC-1: Contract loading from contracts directory
 *   AC-2: Required section validation (not empty, not placeholder)
 *   AC-3: UNCERTAIN: and INSUFFICIENT_DATA: tag tracking
 *   AC-4: Guardrail rule loading and compliance checking
 *   AC-5: Handoff checklist verification (9 items)
 *   AC-6: APPROVED/FAILED verdict with violations list
 *   AC-7: SSE event emission on gate result (via engine integration)
 *   AC-8: QUESTIONNAIRE_REQUEST extraction
 */

const path = require('path');
const fs = require('fs');
const {
  extractSections,
  findPlaceholders,
  extractTaggedItems,
  parseHandoffChecklist,
  loadContractSections,
  loadGuardrailRules,
  validateDocument,
  runGate,
  CriticValidator,
  RiskValidator,
  CRITIC_TO_PHASE,
  PHASE_GUARDRAILS,
  _PHASE_CONTRACTS,
  HANDOFF_CHECKLIST_COUNT,
} = require('../../src/webapp/orchestrator/gate-validator');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

/** Build a fully compliant deliverable with all 9 handoff items checked */
function buildCompliantDeliverable(overrides = {}) {
  const sections = overrides.sections || [
    '# Analysis – Business – 2026-03-12',
    '## Metadata\nAgent: Business Analyst\nPhase: 1',
    '## Scope Change Impact\nNot applicable for this cycle.',
    '## Findings\nF-001: Revenue model is subscription-based. Source: requirements.md L12.',
    '## Risk Assessment\nNo critical risks identified.',
    '## Recommendations\nR-001: Implement tiered pricing. Impact: HIGH.',
  ];
  const handoff = overrides.handoff || [
    '## HANDOFF CHECKLIST',
    '- [x] All required sections are filled (not empty, not placeholder)',
    '- [x] All UNCERTAIN: items are documented and escalated',
    '- [x] All INSUFFICIENT_DATA: items are documented and escalated',
    '- [x] Output complies with the contract in /docs/contracts/',
    '- [x] Guardrails from /docs/guardrails/ have been checked',
    '- [x] Output is machine-readable and ready as input for the next agent',
    '- [x] No contradictory statements in this document',
    '- [x] All findings include a source reference',
    '- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL',
  ];
  return [...sections, '', ...handoff].join('\n');
}

/** Build a minimal contract file with MANDATORY SECTIONS */
function buildContractFile(sectionNames) {
  const lines = [
    '# Test Contract',
    '',
    '## MANDATORY SECTIONS',
    '',
    ...sectionNames.map((name, i) => `### ${i + 1}. ${name}`),
    '',
    'Content for each section.',
    '',
    '## VALIDATION CRITERIA',
    '',
    'Some criteria here.',
  ];
  return lines.join('\n');
}

/** Build a minimal guardrail file with rule IDs */
function buildGuardrailFile(ruleIds) {
  const lines = ['# Test Guardrails', ''];
  for (const id of ruleIds) {
    lines.push(`### ${id} – Test Rule`, '', '**Rule:** Some rule text.', '');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// extractSections
// ─────────────────────────────────────────────────────────────
describe('extractSections', () => {
  it('extracts headings with content', () => {
    const md = '# Title\nSome intro\n## Section A\nContent A\n## Section B\nContent B';
    const sections = extractSections(md);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({ level: 1, title: 'Title', content: 'Some intro' });
    expect(sections[1]).toEqual({ level: 2, title: 'Section A', content: 'Content A' });
    expect(sections[2]).toEqual({ level: 2, title: 'Section B', content: 'Content B' });
  });

  it('returns empty array for content without headings', () => {
    expect(extractSections('just plain text')).toEqual([]);
  });

  it('handles empty sections', () => {
    const md = '## Empty\n## Next\nHas content';
    const sections = extractSections(md);
    expect(sections[0].title).toBe('Empty');
    expect(sections[0].content).toBe('');
    expect(sections[1].content).toBe('Has content');
  });
});

// ─────────────────────────────────────────────────────────────
// findPlaceholders
// ─────────────────────────────────────────────────────────────
describe('findPlaceholders', () => {
  it('finds [TODO] patterns', () => {
    const result = findPlaceholders('Line 1\n[TODO] fill this in\nLine 3');
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
    expect(result[0].text).toBe('[TODO] fill this in');
  });

  it('finds multiple placeholder types', () => {
    const content = '[TBD]\n[FILL IN LATER]\n[PLACEHOLDER]\n[INSERT data]\n[SEE BELOW]';
    const result = findPlaceholders(content);
    expect(result).toHaveLength(5);
  });

  it('returns empty for clean content', () => {
    expect(findPlaceholders('Clean content\nNo placeholders here')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const result = findPlaceholders('[todo] something');
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// extractTaggedItems
// ─────────────────────────────────────────────────────────────
describe('extractTaggedItems', () => {
  it('extracts UNCERTAIN: tags', () => {
    const content = 'Normal line\nUNCERTAIN: revenue might be higher\nAnother line';
    const items = extractTaggedItems(content, 'UNCERTAIN:');
    expect(items).toHaveLength(1);
    expect(items[0].line).toBe(2);
    expect(items[0].text).toBe('revenue might be higher');
    expect(items[0].tag).toBe('UNCERTAIN:');
  });

  it('extracts INSUFFICIENT_DATA: tags', () => {
    const content =
      'INSUFFICIENT_DATA: no financial records available\nINSUFFICIENT_DATA: CRM data missing';
    const items = extractTaggedItems(content, 'INSUFFICIENT_DATA:');
    expect(items).toHaveLength(2);
  });

  it('extracts QUESTIONNAIRE_REQUEST tags', () => {
    const content = 'QUESTIONNAIRE_REQUEST What is the target market?\nNormal text';
    const items = extractTaggedItems(content, 'QUESTIONNAIRE_REQUEST');
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('What is the target market?');
  });

  it('returns empty array when no tags found', () => {
    expect(extractTaggedItems('clean text', 'UNCERTAIN:')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// parseHandoffChecklist
// ─────────────────────────────────────────────────────────────
describe('parseHandoffChecklist', () => {
  it('parses a complete checklist with all items checked', () => {
    const content = ['## HANDOFF CHECKLIST', '- [x] Item 1', '- [x] Item 2', '- [x] Item 3'].join(
      '\n'
    );
    const result = parseHandoffChecklist(content);
    expect(result.found).toBe(true);
    expect(result.checked).toBe(3);
    expect(result.unchecked).toBe(0);
    expect(result.total).toBe(3);
  });

  it('detects unchecked items', () => {
    const content = '## HANDOFF CHECKLIST\n- [x] Done\n- [ ] Not done\n- [x] Also done';
    const result = parseHandoffChecklist(content);
    expect(result.checked).toBe(2);
    expect(result.unchecked).toBe(1);
    expect(result.total).toBe(3);
  });

  it('returns found=false when no checklist', () => {
    const result = parseHandoffChecklist('# Regular document\nNo checklist here');
    expect(result.found).toBe(false);
  });

  it('handles uppercase X in checked items', () => {
    const content = '## HANDOFF CHECKLIST\n- [X] Uppercase check';
    const result = parseHandoffChecklist(content);
    expect(result.checked).toBe(1);
  });

  it('stops at next heading', () => {
    const content = '## HANDOFF CHECKLIST\n- [x] Item\n## Next Section\n- [ ] Not a checklist item';
    const result = parseHandoffChecklist(content);
    expect(result.total).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// loadContractSections
// ─────────────────────────────────────────────────────────────
describe('loadContractSections', () => {
  it('extracts section names from contract file', () => {
    const store = createMockStore({
      'contract.md': buildContractFile(['Metadata', 'Findings', 'Risk Assessment']),
    });
    const sections = loadContractSections(store, 'contract.md');
    expect(sections).toEqual(['Metadata', 'Findings', 'Risk Assessment']);
  });

  it('returns empty when file does not exist', () => {
    const store = createMockStore();
    expect(loadContractSections(store, 'missing.md')).toEqual([]);
  });

  it('returns empty when no MANDATORY SECTIONS heading', () => {
    const store = createMockStore({
      'contract.md': '# Contract\n## Other Section\nContent',
    });
    expect(loadContractSections(store, 'contract.md')).toEqual([]);
  });

  it('loads real critic contract sections', () => {
    const criticPath = path.join(
      __dirname,
      '..',
      '..',
      'docs',
      'contracts',
      'critic-output-contract.md'
    );
    if (!fs.existsSync(criticPath)) return; // skip in CI if not present
    const store = createMockStore({ [criticPath]: fs.readFileSync(criticPath, 'utf-8') });
    const sections = loadContractSections(store, criticPath);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections).toContain('Critic Validation Header');
  });
});

// ─────────────────────────────────────────────────────────────
// loadGuardrailRules
// ─────────────────────────────────────────────────────────────
describe('loadGuardrailRules', () => {
  it('extracts rule IDs from guardrail file (heading format)', () => {
    const store = createMockStore({
      'guard.md': buildGuardrailFile(['G-TEST-01', 'G-TEST-02', 'G-TEST-03']),
    });
    const rules = loadGuardrailRules(store, 'guard.md');
    expect(rules).toEqual(['G-TEST-01', 'G-TEST-02', 'G-TEST-03']);
  });

  it('extracts rule IDs from guardrail file (table format)', () => {
    const store = createMockStore({
      'guard.md': [
        '# Guardrails',
        '| Rule | Description |',
        '| ---- | ----------- |',
        '| G-BUS-01 | Some business rule |',
        '| G-BUS-02 | Another rule |',
      ].join('\n'),
    });
    const rules = loadGuardrailRules(store, 'guard.md');
    expect(rules).toContain('G-BUS-01');
    expect(rules).toContain('G-BUS-02');
  });

  it('returns empty for missing file', () => {
    expect(loadGuardrailRules(createMockStore(), 'missing.md')).toEqual([]);
  });

  it('loads real global guardrail rules', () => {
    const guardrailPath = path.join(
      __dirname,
      '..',
      '..',
      'docs',
      'guardrails',
      '00-global-guardrails.md'
    );
    if (!fs.existsSync(guardrailPath)) return;
    const store = createMockStore({ [guardrailPath]: fs.readFileSync(guardrailPath, 'utf-8') });
    const rules = loadGuardrailRules(store, guardrailPath);
    expect(rules.length).toBeGreaterThan(10);
    expect(rules).toContain('G-GLOB-01');
  });
});

// ─────────────────────────────────────────────────────────────
// validateDocument
// ─────────────────────────────────────────────────────────────
describe('validateDocument', () => {
  it('returns CRITICAL for empty content', () => {
    const result = validateDocument('');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('CRITICAL');
    expect(result.violations[0].rule).toBe('EMPTY_DELIVERABLE');
  });

  it('returns CRITICAL for whitespace-only content', () => {
    const result = validateDocument('   \n\n  ');
    expect(result.violations[0].rule).toBe('EMPTY_DELIVERABLE');
  });

  it('reports missing required sections', () => {
    const content =
      '# Doc\n## Metadata\nSome data\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content, {
      requiredSections: ['Metadata', 'Findings', 'Risk Assessment'],
    });
    const missing = result.violations.filter((v) => v.rule === 'MISSING_SECTION');
    expect(missing).toHaveLength(2); // Findings and Risk Assessment missing
  });

  it('reports placeholder text', () => {
    const content =
      '# Doc\n## Section\n[TODO] implement this\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content);
    const ph = result.violations.filter((v) => v.rule === 'PLACEHOLDER_TEXT');
    expect(ph).toHaveLength(1);
  });

  it('reports missing handoff checklist as CRITICAL', () => {
    const content = '# Analysis\n## Findings\nSome findings here.';
    const result = validateDocument(content);
    const missing = result.violations.filter((v) => v.rule === 'MISSING_HANDOFF_CHECKLIST');
    expect(missing).toHaveLength(1);
    expect(missing[0].severity).toBe('CRITICAL');
  });

  it('reports incomplete handoff checklist as CRITICAL', () => {
    const content =
      '# Doc\n## Section\nContent\n## HANDOFF CHECKLIST\n- [x] Done\n- [ ] Not done\n- [x] Also done\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content);
    const incomplete = result.violations.filter((v) => v.rule === 'INCOMPLETE_HANDOFF');
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].severity).toBe('CRITICAL');
  });

  it('reports insufficient handoff items', () => {
    const content =
      '# Doc\n## Section\nContent\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3';
    const result = validateDocument(content);
    const insufficient = result.violations.filter((v) => v.rule === 'INSUFFICIENT_HANDOFF_ITEMS');
    expect(insufficient).toHaveLength(1);
    expect(insufficient[0].description).toContain(String(HANDOFF_CHECKLIST_COUNT));
  });

  it('tracks UNCERTAIN: items in tags', () => {
    const content =
      '# Doc\n## Section\nUNCERTAIN: revenue outlook unclear\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content);
    expect(result.tags['UNCERTAIN:']).toHaveLength(1);
  });

  it('tracks INSUFFICIENT_DATA: items in tags', () => {
    const content =
      '# Doc\n## Section\nINSUFFICIENT_DATA: no CRM data\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content);
    expect(result.tags['INSUFFICIENT_DATA:']).toHaveLength(1);
  });

  it('reports GUARDRAIL_VIOLATION: tags as MAJOR violations', () => {
    const content =
      '# Doc\n## Section\nGUARDRAIL_VIOLATION: G-BUS-01\n## HANDOFF CHECKLIST\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3\n- [x] Item 4\n- [x] Item 5\n- [x] Item 6\n- [x] Item 7\n- [x] Item 8\n- [x] Item 9';
    const result = validateDocument(content);
    const gv = result.violations.filter((v) => v.rule === 'GUARDRAIL_VIOLATION');
    expect(gv).toHaveLength(1);
    expect(gv[0].severity).toBe('MAJOR');
  });

  it('passes a fully compliant deliverable', () => {
    const result = validateDocument(buildCompliantDeliverable());
    const criticals = result.violations.filter((v) => v.severity === 'CRITICAL');
    expect(criticals).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// runGate
// ─────────────────────────────────────────────────────────────
describe('runGate', () => {
  it('returns FAILED for unknown critic state', () => {
    const store = createMockStore();
    const result = runGate(store, { criticState: 'INVALID', deliverables: [] });
    expect(result.verdict).toBe('FAILED');
    expect(result.violations[0].rule).toBe('INVALID_CRITIC_STATE');
  });

  it('returns FAILED when no deliverables provided', () => {
    const store = createMockStore();
    const result = runGate(store, { criticState: 'CRITIC_1', deliverables: [] });
    expect(result.verdict).toBe('FAILED');
    expect(result.violations[0].rule).toBe('NO_DELIVERABLES');
  });

  it('returns FAILED for missing deliverable file', () => {
    const store = createMockStore();
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: ['nonexistent.md'],
    });
    expect(result.verdict).toBe('FAILED');
    expect(result.violations[0].rule).toBe('MISSING_DELIVERABLE');
  });

  it('returns APPROVED for compliant deliverable', () => {
    const compliant = buildCompliantDeliverable();
    const store = createMockStore({ 'deliverable.md': compliant });
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: ['deliverable.md'],
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(result.verdict).toBe('APPROVED');
    expect(result.summary.phase).toBe('PHASE_1');
  });

  it('returns FAILED for deliverable with missing handoff checklist', () => {
    const store = createMockStore({
      'bad.md': '# Analysis\n## Findings\nSome findings.',
    });
    const result = runGate(store, {
      criticState: 'CRITIC_2',
      deliverables: ['bad.md'],
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(result.verdict).toBe('FAILED');
    expect(result.summary.phase).toBe('PHASE_2');
  });

  it('collects QUESTIONNAIRE_REQUEST items (AC-8)', () => {
    const content = buildCompliantDeliverable({
      sections: [
        '# Analysis\n## Metadata\nAgent: Test',
        '## Findings\nQUESTIONNAIRE_REQUEST What is the pricing model?',
        '## Other\nINSUFFICIENT_DATA: market size unknown',
      ],
    });
    const store = createMockStore({ 'del.md': content });
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: ['del.md'],
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    // Should collect both QUESTIONNAIRE_REQUEST and INSUFFICIENT_DATA items
    expect(result.questionnaireRequests.length).toBeGreaterThanOrEqual(2);
    expect(result.summary.questionnaireRequestCount).toBeGreaterThanOrEqual(2);
  });

  it('maps CRITIC_1 to PHASE_1', () => {
    expect(CRITIC_TO_PHASE['CRITIC_1']).toBe('PHASE_1');
  });

  it('maps CRITIC_4 to PHASE_4', () => {
    expect(CRITIC_TO_PHASE['CRITIC_4']).toBe('PHASE_4');
  });

  it('includes per-deliverable results in summary', () => {
    const store = createMockStore({
      'good.md': buildCompliantDeliverable(),
      'bad.md': '# Empty-ish doc',
    });
    const result = runGate(store, {
      criticState: 'CRITIC_3',
      deliverables: ['good.md', 'bad.md'],
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(result.summary.perDeliverable).toHaveLength(2);
    expect(result.summary.perDeliverable[0].verdict).toBe('APPROVED');
    expect(result.summary.perDeliverable[1].verdict).toBe('FAILED');
  });

  it('loads real contracts when available (AC-1)', () => {
    const contractDir = path.join(__dirname, '..', '..', 'docs', 'contracts');
    const criticContract = path.join(contractDir, 'critic-output-contract.md');
    if (!fs.existsSync(criticContract)) return;

    // Use critic contract directly (it has ### N. Title headings)
    const sections = loadContractSections(
      createMockStore({ [criticContract]: fs.readFileSync(criticContract, 'utf-8') }),
      criticContract
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections).toContain('Critic Validation Header');
  });

  it('loads real guardrails when available (AC-4)', () => {
    const guardrailDir = path.join(__dirname, '..', '..', 'docs', 'guardrails');
    const globalGuardrails = path.join(guardrailDir, '00-global-guardrails.md');
    if (!fs.existsSync(globalGuardrails)) return;

    const files = {};
    files['deliverable.md'] = buildCompliantDeliverable();
    for (const g of PHASE_GUARDRAILS.PHASE_1) {
      const fp = path.join(guardrailDir, g);
      if (fs.existsSync(fp)) files[fp] = fs.readFileSync(fp, 'utf-8');
    }

    const store = createMockStore(files);
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: ['deliverable.md'],
      guardrailsDir: guardrailDir,
    });
    expect(result.summary.guardrailRulesLoaded).toBeGreaterThan(0);
  });

  it('severity breakdown matches violation counts', () => {
    const store = createMockStore({
      'doc.md': '# Doc\n## Section\n[TODO] placeholder\nGUARDRAIL_VIOLATION: G-BUS-01',
    });
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: ['doc.md'],
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    const sev = result.summary.bySeverity;
    expect(sev.CRITICAL + sev.MAJOR + sev.MINOR + sev.INFO).toBe(result.summary.totalViolations);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine integration — validateGate with SSE (AC-7)
// ─────────────────────────────────────────────────────────────
describe('engine validateGate integration', () => {
  const { createEngine } = require('../../src/webapp/orchestrator/engine');

  const FLOWS_PATH = path.join(
    __dirname,
    '..',
    '..',
    'src',
    'webapp',
    'orchestrator',
    'flows.yaml'
  );
  const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

  function engineStore(extraFiles = {}) {
    return createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
  }

  it('emits orchestrator:gate_passed SSE event on APPROVED', () => {
    const events = [];
    const store = engineStore({ 'del.md': buildCompliantDeliverable() });
    const engine = createEngine({
      store,
      sseNotify: (type, data) => events.push({ type, data }),
      flowsPath: FLOWS_PATH,
      sessionPath: '__nonexistent_session__',
    });

    // Advance to CRITIC_1: IDLE → ONBOARDING → PHASE_1 → CRITIC_1
    engine.advance();
    engine.advance();
    engine.advance();
    expect(engine.status().state).toBe('CRITIC_1');

    const result = engine.validateGate(['del.md'], {
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(result.verdict).toBe('APPROVED');

    const gateEvents = events.filter((e) => e.type === 'orchestrator:gate_passed');
    expect(gateEvents).toHaveLength(1);
    expect(gateEvents[0].data.criticState).toBe('CRITIC_1');
  });

  it('emits orchestrator:gate_failed SSE event on FAILED', () => {
    const events = [];
    const store = engineStore({ 'bad.md': '# Incomplete doc' });
    const engine = createEngine({
      store,
      sseNotify: (type, data) => events.push({ type, data }),
      flowsPath: FLOWS_PATH,
      sessionPath: '__nonexistent_session__',
    });

    engine.advance();
    engine.advance();
    engine.advance();

    const result = engine.validateGate(['bad.md'], {
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(result.verdict).toBe('FAILED');

    const gateEvents = events.filter((e) => e.type === 'orchestrator:gate_failed');
    expect(gateEvents).toHaveLength(1);
    expect(gateEvents[0].data.violationCount).toBeGreaterThan(0);
  });

  it('validateGate result can be passed to advance for gate transition', () => {
    const store = engineStore({ 'del.md': buildCompliantDeliverable() });
    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sessionPath: '__nonexistent_session__',
    });

    // Advance to CRITIC_1
    engine.advance();
    engine.advance();
    engine.advance();
    expect(engine.status().state).toBe('CRITIC_1');

    // Validate gate
    const gateResult = engine.validateGate(['del.md'], {
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(gateResult.verdict).toBe('APPROVED');

    // Advance through critic with gate result
    const transition = engine.advance(gateResult);
    expect(transition.from).toBe('CRITIC_1');
    expect(transition.to).toBe('PHASE_2');
  });

  it('blocks advance when gate validation fails', () => {
    const store = engineStore({ 'bad.md': '# Empty' });
    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sessionPath: '__nonexistent_session__',
    });

    // Advance to CRITIC_1
    engine.advance();
    engine.advance();
    engine.advance();

    const gateResult = engine.validateGate(['bad.md'], {
      contractsDir: 'contracts',
      guardrailsDir: 'guardrails',
    });
    expect(gateResult.verdict).toBe('FAILED');

    // Attempting to advance with failed gate should throw
    expect(() => engine.advance(gateResult)).toThrow(/Gate failed/);
    expect(engine.status().state).toBe('CRITIC_1');
  });
});

// ─────────────────────────────────────────────────────────────
// #172: CriticValidator class wrapper
// ─────────────────────────────────────────────────────────────
describe('CriticValidator', () => {
  it('throws without store', () => {
    expect(() => new CriticValidator()).toThrow(/requires a store/);
  });

  it('validates deliverables and returns verdict', () => {
    const store = createMockStore({
      'deliverable.md': buildCompliantDeliverable(),
    });
    const cv = new CriticValidator(store);
    const result = cv.validate('CRITIC_1', ['deliverable.md']);
    expect(result.verdict).toBe('APPROVED');
    expect(result.summary.criticState).toBe('CRITIC_1');
  });

  it('returns FAILED for missing deliverables', () => {
    const store = createMockStore();
    const cv = new CriticValidator(store);
    const result = cv.validate('CRITIC_2', ['missing.md']);
    expect(result.verdict).toBe('FAILED');
  });

  it('returns FAILED for unknown critic state', () => {
    const store = createMockStore();
    const cv = new CriticValidator(store);
    const result = cv.validate('CRITIC_99', []);
    expect(result.verdict).toBe('FAILED');
  });

  it('accepts custom contractsDir and guardrailsDir', () => {
    const store = createMockStore({
      'deliverable.md': buildCompliantDeliverable(),
    });
    const cv = new CriticValidator(store, {
      contractsDir: 'custom/contracts',
      guardrailsDir: 'custom/guardrails',
    });
    const result = cv.validate('CRITIC_1', ['deliverable.md']);
    expect(result.verdict).toBe('APPROVED');
  });
});

// ─────────────────────────────────────────────────────────────
// #172: RiskValidator class wrapper
// ─────────────────────────────────────────────────────────────
describe('RiskValidator', () => {
  it('throws without store', () => {
    expect(() => new RiskValidator()).toThrow(/requires a store/);
  });

  it('validates deliverables and returns risks array', () => {
    const content = buildCompliantDeliverable({
      sections: [
        '# Analysis',
        '## Findings',
        'SECURITY_FLAG: SQL injection risk in auth module',
        'UNCERTAIN: Revenue projections may be off',
      ],
    });
    const store = createMockStore({ 'del.md': content });
    const rv = new RiskValidator(store);
    const result = rv.validate('CRITIC_1', ['del.md']);
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.risks.some((r) => r.type === 'security')).toBe(true);
    expect(result.risks.some((r) => r.type === 'uncertainty')).toBe(true);
    expect(result.summary.riskItemCount).toBeGreaterThan(0);
  });

  it('returns empty risks for deliverable without risk tags in body', () => {
    // Build a deliverable specifically without UNCERTAIN/SECURITY_FLAG in body
    // (handoff checklist mentions UNCERTAIN: as instructions, but those are expected)
    const content = [
      '# Analysis',
      '## Findings',
      'Revenue model is subscription-based. Source: requirements.md L12.',
      '## HANDOFF CHECKLIST',
      '- [x] All required sections are filled',
      '- [x] All tagged items are documented',
      '- [x] All data items are documented',
      '- [x] Output complies with the contract',
      '- [x] Guardrails have been checked',
      '- [x] Output is machine-readable',
      '- [x] No contradictory statements',
      '- [x] All findings include a source reference',
      '- [x] Deliverable written to file per protocol',
    ].join('\n');
    const store = createMockStore({ 'clean.md': content });
    const rv = new RiskValidator(store);
    const result = rv.validate('CRITIC_1', ['clean.md']);
    expect(result.risks).toEqual([]);
    expect(result.summary.riskItemCount).toBe(0);
  });

  it('skips missing deliverable files for risk extraction', () => {
    const store = createMockStore();
    const rv = new RiskValidator(store);
    const result = rv.validate('CRITIC_1', ['missing.md']);
    expect(result.verdict).toBe('FAILED');
    expect(result.risks).toEqual([]);
  });
});
