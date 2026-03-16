/**
 * Weblate Sync Script Unit Tests
 * Tests for scripts/weblate-sync.js — validate, readLocaleFile, writeLocaleFile
 */

const fs = require('fs');
const path = require('path');

const {
  readLocaleFile,
  writeLocaleFile,
  validate,
  LOCALES_DIR,
  SOURCE_LANG,
  TARGET_LANGS,
  COMPONENTS,
} = require('../../scripts/weblate-sync');

describe('weblate-sync — constants', () => {
  test('SOURCE_LANG is en-US', () => {
    expect(SOURCE_LANG).toBe('en-US');
  });

  test('TARGET_LANGS contains fr-FR and de-DE', () => {
    expect(TARGET_LANGS).toEqual(['fr-FR', 'de-DE']);
  });

  test('COMPONENTS contains expected files', () => {
    expect(COMPONENTS).toEqual(['ui-labels', 'validation-messages', 'doc-snippets']);
  });

  test('LOCALES_DIR points to locales/', () => {
    expect(LOCALES_DIR).toMatch(/locales$/);
    expect(fs.existsSync(LOCALES_DIR)).toBe(true);
  });
});

describe('weblate-sync — readLocaleFile', () => {
  test('reads en-US/ui-labels.json and returns parsed object', () => {
    const data = readLocaleFile('en-US', 'ui-labels');
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  test('reads all component files for all locales', () => {
    const allLangs = [SOURCE_LANG, ...TARGET_LANGS];
    for (const lang of allLangs) {
      for (const component of COMPONENTS) {
        const data = readLocaleFile(lang, component);
        expect(typeof data).toBe('object');
        expect(Object.keys(data).length).toBeGreaterThan(0);
      }
    }
  });

  test('throws for non-existent locale', () => {
    expect(() => readLocaleFile('xx-XX', 'ui-labels')).toThrow();
  });
});

describe('weblate-sync — writeLocaleFile', () => {
  const tmpLang = '__test-tmp__';
  const tmpDir = path.join(LOCALES_DIR, tmpLang);

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(tmpDir)) {
      fs.readdirSync(tmpDir).forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));
      fs.rmdirSync(tmpDir);
    }
  });

  test('writes a JSON file and creates directory if missing', () => {
    const testData = { hello: 'world', count: '{n} items' };
    writeLocaleFile(tmpLang, 'test-component', testData);

    const filePath = path.join(tmpDir, 'test-component.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const written = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(written).toEqual(testData);
  });
});

describe('weblate-sync — validate', () => {
  test('validate() completes without throwing for consistent locales', () => {
    // The real locale files in the repo should be consistent
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    validate();

    // If locales are consistent, process.exit should NOT be called
    expect(exitSpy).not.toHaveBeenCalled();

    spy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
