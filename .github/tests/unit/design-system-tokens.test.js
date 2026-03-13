'use strict';

const fs = require('node:fs');
const path = require('node:path');

describe('Design system foundation tokens (FEAT-02-A)', () => {
  const cssPath = path.resolve(__dirname, '..', '..', '..', 'src', 'webapp', 'design-system.css');
  const jsonPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'brand', 'design-tokens.json');

  it('defines required typography scale tokens in :root', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    for (const token of [
      '--text-12',
      '--text-14',
      '--text-16',
      '--text-20',
      '--text-24',
      '--text-32',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('defines required spacing tokens based on 4px grid', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    for (const token of [
      '--space-1',
      '--space-2',
      '--space-3',
      '--space-4',
      '--space-6',
      '--space-8',
      '--space-12',
      '--space-16',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('defines elevation, radius, and motion tokens', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    for (const token of [
      '--shadow-1',
      '--shadow-2',
      '--shadow-3',
      '--shadow-4',
      '--radius-2',
      '--radius-4',
      '--radius-8',
      '--motion-fast',
      '--motion-normal',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('includes dark mode token overrides', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('--bg: #0f1f33;');
  });

  it('keeps JSON token versioning and semantic colors', () => {
    const tokens = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(tokens.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(tokens.colors.success).toBeTruthy();
    expect(tokens.colors.warning).toBeTruthy();
    expect(tokens.colors.error).toBeTruthy();
    expect(tokens.colors.info).toBeTruthy();
    expect(tokens.motion.fast).toBe('150ms ease');
    expect(tokens.motion.normal).toBe('250ms ease-in-out');
  });
});
