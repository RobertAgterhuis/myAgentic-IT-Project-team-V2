import { createRequire } from 'node:module';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import { dirname as _dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = _fileURLToPath(import.meta.url);
const __dirname = _dirname(__filename);

/**
 * SP-2-SOC — Social media card SVG validation tests
 */

const fs = require('fs');
const path = require('path');

const CARDS_DIR = path.join(__dirname, '..', '..', 'src', 'webapp', 'social-cards');

const CARD_FILES = [
  'card-launch.svg',
  'card-risk-matrix.svg',
  'card-architecture.svg',
  'card-sprint-results.svg',
];

const BRAND_COLORS = {
  primary: '#0A3A66',
  secondary: '#1B6B5E',
  accent: '#E87722',
  background: '#F7FAFC',
  text: '#102A43',
};

describe('SP-2-SOC: Social media card SVGs', () => {
  const cardContents = {};

  beforeAll(() => {
    for (const file of CARD_FILES) {
      cardContents[file] = fs.readFileSync(path.join(CARDS_DIR, file), 'utf8');
    }
  });

  test('all 4 social card SVG files exist', () => {
    for (const file of CARD_FILES) {
      expect(fs.existsSync(path.join(CARDS_DIR, file))).toBe(true);
    }
  });

  test('all cards have correct LinkedIn dimensions (1200x627)', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content).toMatch(/viewBox="0 0 1200 627"/);
      expect(content).toMatch(/width="1200"/);
      expect(content).toMatch(/height="627"/);
    }
  });

  test('all cards are valid SVG (have svg root element)', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content).toMatch(/<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(content).toMatch(/<\/svg>\s*$/);
    }
  });

  test('all cards use brand primary color', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content.toLowerCase()).toContain(BRAND_COLORS.primary.toLowerCase());
    }
  });

  test('all cards use brand accent color', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content.toLowerCase()).toContain(BRAND_COLORS.accent.toLowerCase());
    }
  });

  test('all cards reference Sora heading font', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content).toContain('Sora');
    }
  });

  test('all cards reference Manrope body font', () => {
    for (const [, content] of Object.entries(cardContents)) {
      expect(content).toContain('Manrope');
    }
  });

  test('launch card contains all 4 phases', () => {
    const content = cardContents['card-launch.svg'];
    expect(content).toContain('PHASE 1');
    expect(content).toContain('PHASE 2');
    expect(content).toContain('PHASE 3');
    expect(content).toContain('PHASE 4');
  });

  test('risk matrix card shows 6 risk categories', () => {
    const content = cardContents['card-risk-matrix.svg'];
    expect(content).toContain('Security');
    expect(content).toContain('Performance');
    expect(content).toContain('Compliance');
    expect(content).toContain('Architecture');
    expect(content).toContain('Business');
    expect(content).toContain('Operations');
  });

  test('architecture card shows 8 CI/CD jobs', () => {
    const content = cardContents['card-architecture.svg'];
    for (let i = 1; i <= 8; i++) {
      expect(content).toContain(`JOB ${i}`);
    }
  });

  test('sprint results card shows key metrics', () => {
    const content = cardContents['card-sprint-results.svg'];
    expect(content).toContain('87%');
    expect(content).toContain('122');
    expect(content).toContain('80%');
    expect(content).toContain('12');
  });

  test('README.md exists with card documentation', () => {
    const readme = fs.readFileSync(path.join(CARDS_DIR, 'README.md'), 'utf8');
    expect(readme).toContain('card-launch.svg');
    expect(readme).toContain('card-risk-matrix.svg');
    expect(readme).toContain('card-architecture.svg');
    expect(readme).toContain('card-sprint-results.svg');
    expect(readme).toContain('1200');
    expect(readme).toContain('627');
  });
});
