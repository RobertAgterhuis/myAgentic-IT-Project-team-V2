import * as __req_0 from '../../platform/engine/deliverable-quality';
const { assessDeliverableQuality } = __req_0;

describe('assessDeliverableQuality', () => {
  it('returns an approve signal for a well-structured deliverable', () => {
    const assessment = assessDeliverableQuality(
      [
        '# Architecture Review',
        '',
        '## Findings',
        '- Source: docs/architecture/system.md',
        '- Source: docs/security/threat-model.md',
        '',
        '## HANDOFF CHECKLIST',
        '- [x] All required sections are filled',
        '- [x] All findings include a source reference',
        '',
        'This deliverable contains enough depth to exceed the minimum quality threshold.'.repeat(
          12
        ),
      ].join('\n'),
      { validationPassed: true, requiredSections: ['Findings', 'HANDOFF CHECKLIST'] }
    );

    expect(assessment.score).toBeGreaterThanOrEqual(85);
    expect(assessment.approvalSignal).toBe('approve');
  });

  it('returns a block signal when checklist and evidence are missing', () => {
    const assessment = assessDeliverableQuality('Short draft without evidence.', {
      validationPassed: false,
      findings: [{ rule: 'MISSING_CONTRACT_MARKER' }],
      requiredSections: ['Findings'],
    });

    expect(assessment.score).toBeLessThan(70);
    expect(assessment.approvalSignal).toBe('block');
  });

  describe('approval signal boundaries', () => {
    it('returns approve signal when computed score is 85 or higher', () => {
      const content = [
        '# Summary',
        '# Risk Analysis',
        '- [x] Contract reviewed',
        '- [x] Security sign-off completed',
        'questionnaire:[Q-001] questionnaire:[Q-002]',
        'docs/arch/system.md docs/infra/deploy.yml',
        Array(500).fill('word').join(' '),
      ].join('\n');
      const a = assessDeliverableQuality(content, {
        validationPassed: true,
        requiredSections: ['Summary', 'Risk Analysis'],
      });
      expect(a.approvalSignal).toBe('approve');
      expect(a.score).toBeGreaterThanOrEqual(85);
    });

    it('returns review signal when computed score is between 70 and 84', () => {
      // contract=100 (passed), sections=100 (2/2), checklist=50 (1/2 checked),
      // evidence=25 (1 questionnaire ref), depth≈44 (~219 total words) → weighted ≈ 73
      const content = [
        '# Summary',
        '# Risk Analysis',
        '- [x] Contract reviewed',
        '- [ ] Security sign-off pending',
        'See questionnaire:[Q-001] for details.',
        Array(200).fill('word').join(' '),
      ].join('\n');
      const a = assessDeliverableQuality(content, {
        validationPassed: true,
        requiredSections: ['Summary', 'Risk Analysis'],
      });
      expect(a.approvalSignal).toBe('review');
      expect(a.score).toBeGreaterThanOrEqual(70);
      expect(a.score).toBeLessThan(85);
    });

    it('returns block signal when computed score is below 70', () => {
      const a = assessDeliverableQuality('Too short.', {
        validationPassed: false,
        findings: [{ rule: 'r1' }, { rule: 'r2' }, { rule: 'r3' }, { rule: 'r4' }],
        requiredSections: ['Missing Section'],
      });
      expect(a.approvalSignal).toBe('block');
      expect(a.score).toBeLessThan(70);
    });
  });

  describe('contract metric', () => {
    function contractScore(a) {
      return a.metrics.find((m) => m.id === 'contract').score;
    }

    it('scores 100 when validationPassed is true', () => {
      expect(contractScore(assessDeliverableQuality('x', { validationPassed: true }))).toBe(100);
    });

    it('scores 100 when validationPassed is false with zero findings', () => {
      expect(
        contractScore(assessDeliverableQuality('x', { validationPassed: false, findings: [] }))
      ).toBe(100);
    });

    it('scores 75 when validationPassed is false with 1 finding', () => {
      expect(
        contractScore(
          assessDeliverableQuality('x', {
            validationPassed: false,
            findings: [{ rule: 'RULE_A' }],
          })
        )
      ).toBe(75);
    });

    it('scores 0 when validationPassed is false with 4 or more findings', () => {
      expect(
        contractScore(
          assessDeliverableQuality('x', {
            validationPassed: false,
            findings: [{ rule: 'a' }, { rule: 'b' }, { rule: 'c' }, { rule: 'd' }],
          })
        )
      ).toBe(0);
    });

    it('scores 50 when validationPassed is undefined', () => {
      expect(contractScore(assessDeliverableQuality('x', {}))).toBe(50);
    });
  });

  describe('section coverage metric', () => {
    function sectionScore(a) {
      return a.metrics.find((m) => m.id === 'sections').score;
    }

    it('scores 100 when all required sections are present in the content', () => {
      const content = '# Summary\n## Risk Analysis\n';
      expect(
        sectionScore(
          assessDeliverableQuality(content, { requiredSections: ['Summary', 'Risk Analysis'] })
        )
      ).toBe(100);
    });

    it('scores proportionally when only some required sections are present', () => {
      const content = '# Summary\n';
      expect(
        sectionScore(
          assessDeliverableQuality(content, { requiredSections: ['Summary', 'Risk Analysis'] })
        )
      ).toBe(50);
    });

    it('falls back to heading-count heuristic when no required sections are specified', () => {
      // 4 headings with no required sections → min(4/4, 1) = 1.0 → 100
      const content = '# A\n# B\n# C\n# D\n';
      expect(sectionScore(assessDeliverableQuality(content, {}))).toBe(100);
    });

    it('matches section headings case-insensitively and ignores extra whitespace', () => {
      const content = '# HANDOFF CHECKLIST  \n';
      expect(
        sectionScore(assessDeliverableQuality(content, { requiredSections: ['Handoff Checklist'] }))
      ).toBe(100);
    });
  });

  describe('checklist completion metric', () => {
    function checklistScore(a) {
      return a.metrics.find((m) => m.id === 'checklist').score;
    }

    it('scores 100 when all checklist items are checked', () => {
      const content = '- [x] item one\n- [x] item two\n';
      expect(checklistScore(assessDeliverableQuality(content))).toBe(100);
    });

    it('scores proportionally for a partially checked list', () => {
      const content = '- [x] item one\n- [ ] item two\n';
      expect(checklistScore(assessDeliverableQuality(content))).toBe(50);
    });

    it('scores 0 when no checklist items are present', () => {
      expect(checklistScore(assessDeliverableQuality('No checkboxes here.'))).toBe(0);
    });
  });

  describe('evidence references metric', () => {
    function evidenceScore(a) {
      return a.metrics.find((m) => m.id === 'evidence').score;
    }

    it('detects questionnaire:[Q-ID] references as evidence', () => {
      const content = 'As described in questionnaire:[Q-042].';
      expect(evidenceScore(assessDeliverableQuality(content))).toBeGreaterThanOrEqual(25);
    });

    it('detects file path references with supported extensions', () => {
      const content = 'Refer to docs/architecture/system.md for details.';
      expect(evidenceScore(assessDeliverableQuality(content))).toBeGreaterThanOrEqual(25);
    });

    it('detects lines containing the word source as evidence', () => {
      const content = '- Source: the project requirements specification';
      expect(evidenceScore(assessDeliverableQuality(content))).toBeGreaterThanOrEqual(25);
    });

    it('scores 100 when four or more distinct evidence references are present', () => {
      const content = [
        'questionnaire:[Q-001]',
        'questionnaire:[Q-002]',
        'questionnaire:[Q-003]',
        'questionnaire:[Q-004]',
      ].join('\n');
      expect(evidenceScore(assessDeliverableQuality(content))).toBe(100);
    });
  });

  describe('content depth metric', () => {
    function depthScore(a) {
      return a.metrics.find((m) => m.id === 'depth').score;
    }

    it('scores 100 for content with 500 or more words', () => {
      const content = Array(500).fill('word').join(' ');
      expect(depthScore(assessDeliverableQuality(content))).toBe(100);
    });

    it('scores proportionally for content with 250 words', () => {
      const content = Array(250).fill('word').join(' ');
      expect(depthScore(assessDeliverableQuality(content))).toBe(50);
    });

    it('scores 0 for an empty string', () => {
      expect(depthScore(assessDeliverableQuality(''))).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('does not throw and returns a block signal for empty string input', () => {
      expect(() => assessDeliverableQuality('')).not.toThrow();
      expect(assessDeliverableQuality('').approvalSignal).toBe('block');
    });

    it('produces a valid assessment when all options are omitted', () => {
      const a = assessDeliverableQuality('Some content here.');
      expect(a).toBeDefined();
      expect(a.score).toBeGreaterThanOrEqual(0);
      expect(a.score).toBeLessThanOrEqual(100);
      expect(['approve', 'review', 'block']).toContain(a.approvalSignal);
      expect(a.metrics).toHaveLength(5);
    });
  });

  describe('metrics array structure', () => {
    const EXPECTED_IDS = ['contract', 'sections', 'checklist', 'evidence', 'depth'];

    it('always returns exactly 5 metrics covering all scoring dimensions', () => {
      const a = assessDeliverableQuality('test content');
      expect(a.metrics).toHaveLength(5);
      const ids = a.metrics.map((m) => m.id);
      expect(ids.slice().sort()).toEqual(EXPECTED_IDS.slice().sort());
    });

    it('each metric has id, label, integer score 0-100, and non-empty detail', () => {
      const a = assessDeliverableQuality('test content');
      a.metrics.forEach((m) => {
        expect(EXPECTED_IDS).toContain(m.id);
        expect(typeof m.label).toBe('string');
        expect(m.label.length).toBeGreaterThan(0);
        expect(typeof m.score).toBe('number');
        expect(Number.isInteger(m.score)).toBe(true);
        expect(m.score).toBeGreaterThanOrEqual(0);
        expect(m.score).toBeLessThanOrEqual(100);
        expect(typeof m.detail).toBe('string');
        expect(m.detail.length).toBeGreaterThan(0);
      });
    });
  });

  describe('summary generation', () => {
    it('returns a positive summary when no metrics are below 60', () => {
      const content = [
        '# Summary',
        '# Risk Analysis',
        '- [x] item one',
        '- [x] item two',
        'questionnaire:[Q-001] questionnaire:[Q-002]',
        'docs/arch/system.md docs/infra/deploy.yml',
        Array(500).fill('word').join(' '),
      ].join('\n');
      const a = assessDeliverableQuality(content, {
        validationPassed: true,
        requiredSections: ['Summary', 'Risk Analysis'],
      });
      expect(a.summary).toContain('Strong');
    });

    it('names weak metric labels in the summary when metrics score below 60', () => {
      // empty content with no options: contract=50 (<60), all others=0 → all weak
      const a = assessDeliverableQuality('', {});
      expect(a.summary).toMatch(/manual review/i);
      expect(a.summary).toContain('contract compliance');
    });
  });
});
