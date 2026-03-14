/**
 * Weblate Docker Stack Validation Tests — SP-2-501 (#117)
 * Validates Docker Compose configuration, environment setup,
 * service health checks, and locale file integration readiness.
 *
 * Run: npm test -- tests/unit/weblate-docker.test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/* ── Docker Compose stack validation ──────────────────────────── */
describe('SP-2-501: Weblate Docker Compose stack', () => {
  const composePath = path.join(ROOT, 'infra', 'docker-compose.weblate.yml');
  let content;

  beforeAll(() => {
    content = fs.readFileSync(composePath, 'utf-8');
  });

  it('should exist as docker-compose.weblate.yml', () => {
    expect(fs.existsSync(composePath)).toBe(true);
  });

  it('should define three services: weblate, weblate-db, weblate-cache', () => {
    expect(content).toMatch(/^\s+weblate:/m);
    expect(content).toMatch(/^\s+weblate-db:/m);
    expect(content).toMatch(/^\s+weblate-cache:/m);
  });

  it('should use weblate/weblate:5.4 image', () => {
    expect(content).toMatch(/image:\s*weblate\/weblate:5\.4/);
  });

  it('should use postgres:16-alpine for database', () => {
    expect(content).toMatch(/image:\s*postgres:16-alpine/);
  });

  it('should use redis:7-alpine for cache', () => {
    expect(content).toMatch(/image:\s*redis:7-alpine/);
  });

  it('should use configurable port via WEBLATE_PORT with default 8081', () => {
    expect(content).toMatch(/\$\{WEBLATE_PORT:-8081\}/);
  });

  it('should inject passwords via environment variables (not hardcoded)', () => {
    expect(content).toMatch(/\$\{WEBLATE_ADMIN_PASSWORD\}/);
    expect(content).toMatch(/\$\{WEBLATE_DB_PASSWORD\}/);
    // No plaintext passwords
    const lines = content.split('\n');
    const passLines = lines.filter(
      (l) =>
        /PASSWORD/i.test(l) &&
        !/\$\{/.test(l) &&
        !/^\s*#/.test(l) &&
        !/healthcheck/i.test(l) &&
        !/test:/i.test(l)
    );
    expect(passLines).toHaveLength(0);
  });

  it('should disable public registration', () => {
    expect(content).toMatch(/WEBLATE_REGISTRATION_OPEN.*"0"/);
  });

  it('should require login', () => {
    expect(content).toMatch(/WEBLATE_REQUIRE_LOGIN.*"1"/);
  });

  it('should configure PostgreSQL healthcheck with pg_isready', () => {
    expect(content).toMatch(/pg_isready/);
  });

  it('should configure Weblate healthcheck on /healthz/', () => {
    expect(content).toMatch(/\/healthz\//);
  });

  it('should define persistent volumes for data, database, and cache', () => {
    expect(content).toMatch(/weblate-data:/);
    expect(content).toMatch(/weblate-db-data:/);
    expect(content).toMatch(/weblate-cache-data:/);
  });

  it('should use a dedicated weblate-net network', () => {
    expect(content).toMatch(/weblate-net:/);
  });

  it('should set Redis memory limit to 64mb with LRU policy', () => {
    expect(content).toMatch(/--maxmemory.*64mb/);
    expect(content).toMatch(/--maxmemory-policy.*allkeys-lru/);
  });
});

/* ── Environment template validation ─────────────────────────── */
describe('SP-2-501: Weblate environment template', () => {
  const envPath = path.join(ROOT, '.env.weblate.example');
  let envContent;

  beforeAll(() => {
    envContent = fs.readFileSync(envPath, 'utf-8');
  });

  it('should exist as .env.weblate.example', () => {
    expect(fs.existsSync(envPath)).toBe(true);
  });

  it('should contain WEBLATE_ADMIN_PASSWORD placeholder', () => {
    expect(envContent).toMatch(/WEBLATE_ADMIN_PASSWORD/);
  });

  it('should contain WEBLATE_DB_PASSWORD placeholder', () => {
    expect(envContent).toMatch(/WEBLATE_DB_PASSWORD/);
  });

  it('should contain WEBLATE_PORT configuration', () => {
    expect(envContent).toMatch(/WEBLATE_PORT/);
  });
});

/* ── Locale file readiness validation ────────────────────────── */
describe('SP-2-501: Locale file readiness for Weblate import', () => {
  const localeDir = path.join(ROOT, 'src/webapp/locales/en-US');

  it('should have en-US locale directory', () => {
    expect(fs.existsSync(localeDir)).toBe(true);
  });

  it('should have ui-labels.json with 49 keys', () => {
    const filePath = path.join(localeDir, 'ui-labels.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Object.keys(data).length).toBe(49);
  });

  it('should have validation-messages.json with 30 keys', () => {
    const filePath = path.join(localeDir, 'validation-messages.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Object.keys(data).length).toBe(30);
  });

  it('should have doc-snippets.json with 48 keys', () => {
    const filePath = path.join(localeDir, 'doc-snippets.json');
    expect(fs.existsSync(filePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Object.keys(data).length).toBe(48);
  });

  it('should have total of 127 translation keys', () => {
    const files = ['ui-labels.json', 'validation-messages.json', 'doc-snippets.json'];
    let total = 0;
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(localeDir, f), 'utf-8'));
      total += Object.keys(data).length;
    }
    expect(total).toBe(127);
  });

  it('should contain valid JSON in all locale files', () => {
    const files = ['ui-labels.json', 'validation-messages.json', 'doc-snippets.json'];
    for (const f of files) {
      expect(() => {
        JSON.parse(fs.readFileSync(path.join(localeDir, f), 'utf-8'));
      }).not.toThrow();
    }
  });
});

/* ── Port isolation validation ───────────────────────────────── */
describe('SP-2-501: Port isolation', () => {
  it('should not conflict with main app (3000) or Matomo (8080)', () => {
    const content = fs.readFileSync(
      path.join(ROOT, 'infra', 'docker-compose.weblate.yml'),
      'utf-8'
    );
    // Default port is 8081, should not be 3000 or 8080
    expect(content).toContain('8081');
    expect(content).not.toMatch(/"\$\{WEBLATE_PORT:-3000\}/);
    expect(content).not.toMatch(/"\$\{WEBLATE_PORT:-8080\}/);
  });
});
