/**
 * SP-2-501 — Weblate Translation Validation Tests
 * Validates FR-FR and DE-DE translations against EN-US source
 * Covers: key parity, placeholder preservation, ICU patterns, QA checks
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'src', 'webapp', 'locales');
const FILES = ['ui-labels', 'validation-messages', 'doc-snippets'];
const TARGET_LOCALES = ['fr-FR', 'de-DE'];

/** Load a locale file and return parsed JSON */
function loadLocale(locale, file) {
  const filePath = path.join(LOCALES_DIR, locale, `${file}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** Extract {placeholder} tokens from a string */
function extractPlaceholders(str) {
  const matches = str.match(/\{[^}]+\}/g);
  return matches ? matches.sort() : [];
}

describe('SP-2-501 — Translation Validation (FR + DE)', () => {
  // Cache all locale data
  const data = {};
  beforeAll(() => {
    ['en-US', ...TARGET_LOCALES].forEach((locale) => {
      data[locale] = {};
      FILES.forEach((file) => {
        data[locale][file] = loadLocale(locale, file);
      });
    });
  });

  describe('Locale directory structure', () => {
    test('fr-FR directory exists with 3 JSON files', () => {
      const dir = path.join(LOCALES_DIR, 'fr-FR');
      expect(fs.existsSync(dir)).toBe(true);
      FILES.forEach((f) => {
        expect(fs.existsSync(path.join(dir, `${f}.json`))).toBe(true);
      });
    });

    test('de-DE directory exists with 3 JSON files', () => {
      const dir = path.join(LOCALES_DIR, 'de-DE');
      expect(fs.existsSync(dir)).toBe(true);
      FILES.forEach((f) => {
        expect(fs.existsSync(path.join(dir, `${f}.json`))).toBe(true);
      });
    });
  });

  describe('Key parity — every EN key exists in target locales', () => {
    TARGET_LOCALES.forEach((locale) => {
      FILES.forEach((file) => {
        test(`${locale}/${file}.json has all EN-US keys`, () => {
          const enKeys = Object.keys(data['en-US'][file]);
          const targetKeys = Object.keys(data[locale][file]);
          const missing = enKeys.filter((k) => !targetKeys.includes(k));
          expect(missing).toEqual([]);
        });

        test(`${locale}/${file}.json has no extra keys`, () => {
          const enKeys = Object.keys(data['en-US'][file]);
          const targetKeys = Object.keys(data[locale][file]);
          const extra = targetKeys.filter((k) => !enKeys.includes(k));
          expect(extra).toEqual([]);
        });
      });
    });
  });

  describe('Key count matches', () => {
    test('en-US has 127 total keys', () => {
      const total = FILES.reduce((sum, f) => sum + Object.keys(data['en-US'][f]).length, 0);
      expect(total).toBe(127);
    });

    TARGET_LOCALES.forEach((locale) => {
      test(`${locale} has 127 total keys`, () => {
        const total = FILES.reduce((sum, f) => sum + Object.keys(data[locale][f]).length, 0);
        expect(total).toBe(127);
      });
    });
  });

  describe('Placeholder preservation', () => {
    TARGET_LOCALES.forEach((locale) => {
      test(`${locale}/validation-messages preserves {maxSize}, {seconds}, {allowedTypes}`, () => {
        const en = data['en-US']['validation-messages'];
        const tr = data[locale]['validation-messages'];
        Object.keys(en).forEach((key) => {
          const enPlaceholders = extractPlaceholders(en[key]);
          const trPlaceholders = extractPlaceholders(tr[key]);
          if (enPlaceholders.length > 0) {
            expect(trPlaceholders).toEqual(enPlaceholders);
          }
        });
      });
    });
  });

  describe('ICU MessageFormat preservation', () => {
    TARGET_LOCALES.forEach((locale) => {
      test(`${locale}/doc-snippets preserves plural patterns`, () => {
        const en = data['en-US']['doc-snippets'];
        const tr = data[locale]['doc-snippets'];
        const pluralKeys = Object.keys(en).filter((k) => en[k].includes(', plural,'));
        expect(pluralKeys.length).toBeGreaterThan(0);
        pluralKeys.forEach((key) => {
          expect(tr[key]).toContain(', plural,');
          expect(tr[key]).toContain('one {');
          expect(tr[key]).toContain('other {');
        });
      });

      test(`${locale}/doc-snippets preserves format patterns (date, number, etc.)`, () => {
        const en = data['en-US']['doc-snippets'];
        const tr = data[locale]['doc-snippets'];
        const formatKeys = Object.keys(en).filter(
          (k) =>
            k.startsWith('format.') &&
            (en[k].includes(', date,') ||
              en[k].includes(', number,') ||
              en[k].includes(', time,') ||
              en[k].includes(', relative,'))
        );
        expect(formatKeys.length).toBeGreaterThan(0);
        formatKeys.forEach((key) => {
          // ICU format tokens must be identical (not translated)
          expect(tr[key]).toBe(en[key]);
        });
      });
    });
  });

  describe('Translation quality — no untranslated values', () => {
    TARGET_LOCALES.forEach((locale) => {
      test(`${locale}/ui-labels has translated values (not identical to EN)`, () => {
        const en = data['en-US']['ui-labels'];
        const tr = data[locale]['ui-labels'];
        // Allow app.name (brand) + format-only keys to be identical
        const brandKeys = ['app.name'];
        const translatedKeys = Object.keys(en).filter((k) => !brandKeys.includes(k));
        const identical = translatedKeys.filter((k) => en[k] === tr[k]);
        // Allow some to be identical (e.g., "Sprint", "Dashboard" in DE)
        // but majority should differ
        const identicalRate = identical.length / translatedKeys.length;
        expect(identicalRate).toBeLessThan(0.3);
      });

      test(`${locale}/validation-messages — no empty values`, () => {
        const tr = data[locale]['validation-messages'];
        Object.entries(tr).forEach(([, value]) => {
          expect(value.trim().length).toBeGreaterThan(0);
        });
      });

      test(`${locale}/doc-snippets — no empty values`, () => {
        const tr = data[locale]['doc-snippets'];
        Object.entries(tr).forEach(([, value]) => {
          expect(value.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('JSON validity', () => {
    TARGET_LOCALES.forEach((locale) => {
      FILES.forEach((file) => {
        test(`${locale}/${file}.json is valid JSON`, () => {
          const filePath = path.join(LOCALES_DIR, locale, `${file}.json`);
          const raw = fs.readFileSync(filePath, 'utf8');
          expect(() => JSON.parse(raw)).not.toThrow();
        });
      });
    });
  });

  describe('Brand term consistency', () => {
    TARGET_LOCALES.forEach((locale) => {
      test(`${locale} preserves "Agentic SDLC Platform" brand name`, () => {
        const tr = data[locale]['doc-snippets'];
        const brandKeys = Object.keys(tr).filter(
          (k) =>
            data['en-US']['doc-snippets'][k] &&
            data['en-US']['doc-snippets'][k].includes('Agentic SDLC Platform')
        );
        brandKeys.forEach((key) => {
          expect(tr[key]).toContain('Agentic SDLC Platform');
        });
      });
    });
  });
});
