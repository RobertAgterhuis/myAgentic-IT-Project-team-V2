/**
 * SP-2-501 — Weblate Trial: Locale string validation + Docker config tests
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales', 'en-US');
const COMPOSE_FILE = path.join(__dirname, '..', '..', 'docker-compose.weblate.yml');
const ENV_EXAMPLE = path.join(__dirname, '..', '..', '.env.weblate.example');

// --- Locale string files ---

const LOCALE_FILES = ['ui-labels.json', 'validation-messages.json', 'doc-snippets.json'];

describe('SP-2-501: Locale pilot strings', () => {
  const localeData = {};

  beforeAll(() => {
    for (const file of LOCALE_FILES) {
      const filePath = path.join(LOCALES_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      localeData[file] = JSON.parse(raw);
    }
  });

  test('all locale JSON files are valid and non-empty', () => {
    for (const file of LOCALE_FILES) {
      expect(Object.keys(localeData[file]).length).toBeGreaterThan(0);
    }
  });

  test('pilot string inventory meets 100+ string minimum', () => {
    const total = Object.values(localeData).reduce(
      (sum, data) => sum + Object.keys(data).length,
      0
    );
    expect(total).toBeGreaterThanOrEqual(100);
  });

  test('all string keys use dot-notation namespace', () => {
    for (const [, data] of Object.entries(localeData)) {
      for (const key of Object.keys(data)) {
        expect(key).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/);
      }
    }
  });

  test('no duplicate keys across all locale files', () => {
    const allKeys = Object.values(localeData).flatMap((data) => Object.keys(data));
    const unique = new Set(allKeys);
    expect(unique.size).toBe(allKeys.length);
  });

  test('all values are non-empty strings', () => {
    for (const [, data] of Object.entries(localeData)) {
      for (const [, value] of Object.entries(data)) {
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('ui-labels.json contains expected navigation keys', () => {
    const keys = Object.keys(localeData['ui-labels.json']);
    const navKeys = keys.filter((k) => k.startsWith('nav.'));
    expect(navKeys.length).toBeGreaterThanOrEqual(5);
  });

  test('validation-messages.json contains error and success keys', () => {
    const keys = Object.keys(localeData['validation-messages.json']);
    const errorKeys = keys.filter((k) => k.startsWith('error.'));
    const successKeys = keys.filter((k) => k.startsWith('success.'));
    expect(errorKeys.length).toBeGreaterThanOrEqual(5);
    expect(successKeys.length).toBeGreaterThanOrEqual(3);
  });

  test('doc-snippets.json contains ICU plural forms', () => {
    const data = localeData['doc-snippets.json'];
    const pluralValues = Object.values(data).filter((v) => v.includes('{count, plural,'));
    expect(pluralValues.length).toBeGreaterThanOrEqual(3);
  });

  test('doc-snippets.json contains ICU format strings', () => {
    const data = localeData['doc-snippets.json'];
    const formatValues = Object.values(data).filter(
      (v) => v.includes('{date,') || v.includes('{value,') || v.includes('{time,')
    );
    expect(formatValues.length).toBeGreaterThanOrEqual(3);
  });
});

// --- Docker Compose + env validation ---

describe('SP-2-501: Weblate Docker configuration', () => {
  let composeContent;
  let envContent;

  beforeAll(() => {
    composeContent = fs.readFileSync(COMPOSE_FILE, 'utf8');
    envContent = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  });

  test('docker-compose.weblate.yml defines 3 required services', () => {
    expect(composeContent).toContain('weblate:');
    expect(composeContent).toContain('weblate-db:');
    expect(composeContent).toContain('weblate-cache:');
  });

  test('uses pinned image tags (no :latest)', () => {
    const imageLines = composeContent.match(/image:\s*.+/g) || [];
    for (const line of imageLines) {
      expect(line).not.toContain(':latest');
    }
  });

  test('all services have health checks', () => {
    const healthChecks = (composeContent.match(/healthcheck:/g) || []).length;
    expect(healthChecks).toBe(3);
  });

  test('uses environment variables for secrets (no hardcoded passwords)', () => {
    expect(composeContent).not.toMatch(/password:\s*["'][^$]/i);
    expect(composeContent).toContain('${WEBLATE_DB_PASSWORD}');
    expect(composeContent).toContain('${WEBLATE_ADMIN_PASSWORD}');
  });

  test('registration is disabled for trial security', () => {
    expect(composeContent).toContain('WEBLATE_REGISTRATION_OPEN');
    expect(composeContent).toMatch(/WEBLATE_REGISTRATION_OPEN.*"0"/);
  });

  test('.env.weblate.example contains all required variables', () => {
    expect(envContent).toContain('WEBLATE_ADMIN_PASSWORD');
    expect(envContent).toContain('WEBLATE_DB_PASSWORD');
    expect(envContent).toContain('WEBLATE_PORT');
  });

  test('weblate port does not conflict with webapp (8080)', () => {
    const portMatch = composeContent.match(/"?\$\{WEBLATE_PORT:-(\d+)\}/);
    expect(portMatch).not.toBeNull();
    const defaultPort = parseInt(portMatch[1], 10);
    expect(defaultPort).not.toBe(8080);
  });
});
