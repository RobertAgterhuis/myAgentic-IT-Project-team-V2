'use strict';
/**
 * Governance document structure validation tests.
 * Sprint 5 SP-5-KPI AC-3 + AC-4: Validate that governance artifacts
 * (ga-definition.md, data-inventory.md, security-design.md) maintain
 * their required structure and section completeness.
 *
 * Source: Sprint 4 Retro Action #4
 */

const fs = require('node:fs');
const path = require('node:path');

const DOCS_DIR = path.resolve(__dirname, '../../docs');
const BUSINESS_DOCS_DIR = path.resolve(__dirname, '../../BusinessDocs');

/**
 * Read a markdown file and return its content.
 * @param {string} filename - Name of the file in the docs directory
 * @returns {string} File content
 */
function readDoc(filename, baseDir = DOCS_DIR) {
  const filePath = path.join(baseDir, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Extract all level-2 headings from markdown content.
 * @param {string} content - Markdown content
 * @returns {string[]} Array of heading texts (without the `## ` prefix)
 */
function extractH2Headings(content) {
  const matches = content.match(/^## .+$/gm) || [];
  return matches.map((h) => h.replace(/^## /, ''));
}

// ─────────────────────────────────────────────────────────────
// ga-definition.md  (AC-3)
// ─────────────────────────────────────────────────────────────
describe('ga-definition.md — structure validation', () => {
  let content;
  let headings;

  beforeAll(() => {
    content = readDoc('phase-5/ga-definition.md', BUSINESS_DOCS_DIR);
    headings = extractH2Headings(content);
  });

  it('file exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it('has a level-1 title', () => {
    expect(content).toMatch(/^# .+/m);
  });

  const requiredSections = [
    '1. What "GA" Means for This Product',
    '2. Deployment Profile',
    '3. Go/No-Go Criteria',
    '4. Release Checklist',
    '5. Ownership Model',
    '6. Pilot Exit Criteria',
    '7. GA Scope vs Backlog',
    '8. Decision Record',
    '9. Cross-Reference to Audit Findings',
  ];

  it.each(requiredSections)('contains section "%s"', (section) => {
    const sectionNumber = section.split('.')[0];
    const matchingHeading = headings.find((h) => h.startsWith(`${sectionNumber}.`));
    expect(matchingHeading).toBeDefined();
  });

  it('has at least 9 level-2 sections', () => {
    expect(headings.length).toBeGreaterThanOrEqual(9);
  });

  it('contains Go/No-Go criteria table', () => {
    expect(content).toMatch(/\|.*Criterion.*\|/i);
  });

  it('contains Release Checklist items', () => {
    expect(content).toMatch(/- \[[ x]\]/);
  });
});

// ─────────────────────────────────────────────────────────────
// data-inventory.md  (AC-4)
// ─────────────────────────────────────────────────────────────
describe('data-inventory.md — structure validation', () => {
  let content;
  let headings;

  beforeAll(() => {
    content = readDoc('security/data-inventory.md');
    headings = extractH2Headings(content);
  });

  it('file exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it('has a level-1 title', () => {
    expect(content).toMatch(/^# .+/m);
  });

  const requiredSections = [
    '1. Data Categories',
    '2. Retention Policy',
    '3. DSAR Procedure',
    '4. ROPA Skeleton',
    '5. Data Flow Summary',
    '6. Cross-References',
  ];

  it.each(requiredSections)('contains section "%s"', (section) => {
    const sectionNumber = section.split('.')[0];
    const matchingHeading = headings.find((h) => h.startsWith(`${sectionNumber}.`));
    expect(matchingHeading).toBeDefined();
  });

  it('has at least 6 level-2 sections', () => {
    expect(headings.length).toBeGreaterThanOrEqual(6);
  });

  it('contains a data elements table', () => {
    expect(content).toMatch(/\|.*Data Element.*\|/i);
  });

  it('mentions GDPR or data protection', () => {
    expect(content).toMatch(/GDPR|data protection|privacy/i);
  });
});

// ─────────────────────────────────────────────────────────────
// security-design.md  (AC-4)
// ─────────────────────────────────────────────────────────────
describe('security-design.md — structure validation', () => {
  let content;
  let headings;

  beforeAll(() => {
    content = readDoc('security/security-design.md');
    headings = extractH2Headings(content);
  });

  it('file exists and is non-empty', () => {
    expect(content.length).toBeGreaterThan(0);
  });

  it('has a level-1 title', () => {
    expect(content).toMatch(/^# .+/m);
  });

  const requiredSections = [
    '1. Deployment Profiles',
    '2. STRIDE Threat Model',
    '3. Hardening Checklist',
    '4. Docker Security Notes',
    '5. Existing Security Controls',
    '6. Cross-References',
  ];

  it.each(requiredSections)('contains section "%s"', (section) => {
    const sectionNumber = section.split('.')[0];
    const matchingHeading = headings.find((h) => h.startsWith(`${sectionNumber}.`));
    expect(matchingHeading).toBeDefined();
  });

  it('has at least 6 level-2 sections', () => {
    expect(headings.length).toBeGreaterThanOrEqual(6);
  });

  it('contains STRIDE threat categories', () => {
    expect(content).toMatch(
      /Spoofing|Tampering|Repudiation|Information Disclosure|Denial of Service|Elevation of Privilege/i
    );
  });

  it('contains hardening checklist items', () => {
    expect(content).toMatch(/- \[[ x]\]|hardening|security control/i);
  });
});
