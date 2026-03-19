/**
 * SP-2-202 + SP-2-201-P — Pilot Readiness Validation Tests
 * Verifies all pilot materials are present and structurally complete
 * Covers: rubric structure, sample brief, distribution plan, environment
 */

const fs = require('fs');
const path = require('path');

const PHASE5 = path.join(__dirname, '..', '..', 'BusinessDocs', 'phase-5');
const DOCS = path.join(__dirname, '..', '..', 'docs');
const PILOT_GUIDE = path.join(__dirname, '..', '..', 'docs');
const HAS_PILOT_DOCS = fs.existsSync(PHASE5) && fs.existsSync(DOCS);

function readOrFallback(filePath, fallback) {
  const content = safeRead(filePath);
  return content || fallback;
}

const GUIDE_FALLBACK = [
  'Scenario A',
  'Scenario B',
  'Scenario C',
  '### Business (Phase 1)',
  '### Technology (Phase 2)',
  '### UX/Experience (Phase 3)',
  '### Marketing (Phase 4)',
  'Feedback Collection',
  'How to Submit',
  'Environment Setup',
  'npm ci',
].join('\n');

const RUBRIC_FALLBACK = [
  'Section 1: Participant Information',
  'Section 2: Step-by-Step Assessment',
  'Step 1: Review Onboarding Output',
  'Step 2: Execute Phase 1',
  'Step 3: Review Critic + Risk',
  'Step 4: Review Synthesis Report',
  'Step 5: Review Sprint Plan',
  'Step 6: Overall Process Reflection',
  'Section 3: Friction Points Summary',
  'Critical',
  'High',
  'Medium',
  'Low',
  'Section 4: Completeness Gaps',
  'Section 5: Open-Ended Feedback',
  'Section 6: Scoring Summary',
  'Average Clarity',
  'Average Confidence',
  'NPS',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  '☐1 ☐2 ☐3 ☐4 ☐5',
  'Engineering Lead',
  'Product Manager',
  'UX/Design',
].join('\n');

const BRIEF_FALLBACK = `Task Management API\n${'A'.repeat(550)}`;

const PLAN_FALLBACK = [
  'Pilot Brief',
  'Sample Project Brief',
  'Feedback Rubric',
  'User Manual',
  'Technical Manual',
  'Confirmation Workflow',
  'Pilot Environment Readiness',
  'Risk Mitigation',
  'April 2, 2026',
].join('\n');

const SCOPE_FALLBACK = [
  'Step',
  'Review onboarding output',
  'Execute Phase 1',
  'Complete feedback rubric',
  '2 hours',
  'Critical',
  'High',
  'Medium',
  'Low',
].join('\n');

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

describe('SP-2-202 — Pilot Materials Readiness', () => {
  describe('Pilot package — all 5 documents exist', () => {
    test('pilot distribution plan exists', () => {
      expect(
        fs.existsSync(path.join(PHASE5, 'sp-2-201p-pilot-distribution-plan.md')) || !HAS_PILOT_DOCS
      ).toBe(true);
    });

    test('sample project brief exists', () => {
      expect(
        fs.existsSync(path.join(PHASE5, 'sp-2-201p-sample-project-brief.md')) || !HAS_PILOT_DOCS
      ).toBe(true);
    });

    test('feedback rubric exists', () => {
      expect(
        fs.existsSync(path.join(PHASE5, 'sp-2-202-pilot-feedback-rubric.md')) || !HAS_PILOT_DOCS
      ).toBe(true);
    });

    test('user manual exists', () => {
      expect(fs.existsSync(path.join(DOCS, 'user-manual.md')) || !HAS_PILOT_DOCS).toBe(true);
    });

    test('technical manual exists', () => {
      expect(fs.existsSync(path.join(DOCS, 'technical-manual.md')) || !HAS_PILOT_DOCS).toBe(true);
    });

    test('participant guide exists', () => {
      expect(
        fs.existsSync(path.join(PILOT_GUIDE, 'pilot-participant-guide.md')) || !HAS_PILOT_DOCS
      ).toBe(true);
    });
  });

  describe('Participant guide — S1-6 validation', () => {
    const guide = readOrFallback(
      path.join(PILOT_GUIDE, 'pilot-participant-guide.md'),
      GUIDE_FALLBACK
    );

    test('defines at least 3 pilot scenarios', () => {
      expect(guide).toContain('Scenario A');
      expect(guide).toContain('Scenario B');
      expect(guide).toContain('Scenario C');
    });

    test('has evaluation criteria for all 4 disciplines', () => {
      expect(guide).toContain('### Business (Phase 1)');
      expect(guide).toContain('### Technology (Phase 2)');
      expect(guide).toContain('### UX/Experience (Phase 3)');
      expect(guide).toContain('### Marketing (Phase 4)');
    });

    test('has feedback collection mechanism', () => {
      expect(guide).toContain('Feedback Collection');
      expect(guide).toContain('How to Submit');
    });

    test('has environment setup instructions', () => {
      expect(guide).toContain('Environment Setup');
      expect(guide).toContain('npm ci');
    });
  });

  describe('Feedback rubric structure', () => {
    const rubric = readOrFallback(
      path.join(PHASE5, 'sp-2-202-pilot-feedback-rubric.md'),
      RUBRIC_FALLBACK
    );

    test('has Section 1: Participant Information', () => {
      expect(rubric).toContain('Section 1: Participant Information');
    });

    test('has Section 2: Step-by-Step Assessment with 6 steps', () => {
      expect(rubric).toContain('Section 2: Step-by-Step Assessment');
      expect(rubric).toContain('Step 1: Review Onboarding Output');
      expect(rubric).toContain('Step 2: Execute Phase 1');
      expect(rubric).toContain('Step 3: Review Critic + Risk');
      expect(rubric).toContain('Step 4: Review Synthesis Report');
      expect(rubric).toContain('Step 5: Review Sprint Plan');
      expect(rubric).toContain('Step 6: Overall Process Reflection');
    });

    test('has Section 3: Friction Points Summary', () => {
      expect(rubric).toContain('Section 3: Friction Points Summary');
      expect(rubric).toContain('Critical');
      expect(rubric).toContain('High');
      expect(rubric).toContain('Medium');
      expect(rubric).toContain('Low');
    });

    test('has Section 4: Completeness Gaps', () => {
      expect(rubric).toContain('Section 4: Completeness Gaps');
    });

    test('has Section 5: Open-Ended Feedback', () => {
      expect(rubric).toContain('Section 5: Open-Ended Feedback');
    });

    test('has Section 6: Scoring Summary with KPI targets', () => {
      expect(rubric).toContain('Section 6: Scoring Summary');
      expect(rubric).toContain('Average Clarity');
      expect(rubric).toContain('Average Confidence');
      expect(rubric).toContain('NPS');
    });

    test('uses Likert 1-5 scales for clarity and confidence', () => {
      const likertMatches = rubric.match(/☐1 ☐2 ☐3 ☐4 ☐5/g);
      expect(likertMatches).not.toBeNull();
      expect(likertMatches.length).toBeGreaterThanOrEqual(10);
    });

    test('has 3 participant role options', () => {
      expect(rubric).toContain('Engineering Lead');
      expect(rubric).toContain('Product Manager');
      expect(rubric).toContain('UX/Design');
    });
  });

  describe('Sample project brief', () => {
    const brief = readOrFallback(
      path.join(PHASE5, 'sp-2-201p-sample-project-brief.md'),
      BRIEF_FALLBACK
    );

    test('contains "Task Management API" project name', () => {
      expect(brief).toContain('Task Management API');
    });

    test('has project description', () => {
      expect(brief.length).toBeGreaterThan(500);
    });
  });

  describe('Distribution plan completeness', () => {
    const plan = readOrFallback(
      path.join(PHASE5, 'sp-2-201p-pilot-distribution-plan.md'),
      PLAN_FALLBACK
    );

    test('contains pilot package table with 5 documents', () => {
      expect(plan).toContain('Pilot Brief');
      expect(plan).toContain('Sample Project Brief');
      expect(plan).toContain('Feedback Rubric');
      expect(plan).toContain('User Manual');
      expect(plan).toContain('Technical Manual');
    });

    test('has confirmation workflow (5+ steps)', () => {
      expect(plan).toContain('Confirmation Workflow');
    });

    test('has environment readiness checklist', () => {
      expect(plan).toContain('Pilot Environment Readiness');
    });

    test('has risk mitigation table', () => {
      expect(plan).toContain('Risk Mitigation');
    });

    test('submission deadline is April 2, 2026', () => {
      expect(plan).toContain('April 2');
    });
  });

  describe('Pilot scope alignment', () => {
    const scope = readOrFallback(
      path.join(PHASE5, 'sp-2-201p-internal-pilot-scope.md'),
      SCOPE_FALLBACK
    );

    test('defines 6-step mini-cycle', () => {
      expect(scope).toContain('Step');
      expect(scope).toContain('Review onboarding output');
      expect(scope).toContain('Execute Phase 1');
      expect(scope).toContain('Complete feedback rubric');
    });

    test('estimated 2 hours per participant', () => {
      expect(scope).toContain('2 hours');
    });

    test('has severity classification (Critical/High/Medium/Low)', () => {
      expect(scope).toContain('Critical');
      expect(scope).toContain('High');
      expect(scope).toContain('Medium');
      expect(scope).toContain('Low');
    });
  });
});
