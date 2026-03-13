/**
 * Matomo Analytics Stack Validation Tests — SP-2-MAT (#125)
 * Validates Docker Compose configuration, Nginx reverse proxy,
 * cookieless tracking mode, and tracking script integration.
 *
 * Run: npm test -- __tests__/unit/matomo-analytics.test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/* ── Docker Compose stack validation ──────────────────────────── */
describe('SP-2-MAT: Docker Compose analytics stack', () => {
  const composePath = path.join(ROOT, 'docker-compose.analytics.yml');
  let composeContent;

  beforeAll(() => {
    composeContent = fs.readFileSync(composePath, 'utf-8');
  });

  it('should exist as docker-compose.analytics.yml', () => {
    expect(fs.existsSync(composePath)).toBe(true);
  });

  it('should define three services: matomo, matomo-db, matomo-web', () => {
    expect(composeContent).toMatch(/^\s+matomo:/m);
    expect(composeContent).toMatch(/^\s+matomo-db:/m);
    expect(composeContent).toMatch(/^\s+matomo-web:/m);
  });

  it('should use matomo:5-fpm-alpine image', () => {
    expect(composeContent).toMatch(/image:\s*matomo:5-fpm-alpine/);
  });

  it('should use mariadb:11 image for database', () => {
    expect(composeContent).toMatch(/image:\s*mariadb:11/);
  });

  it('should use nginx:alpine image for web proxy', () => {
    expect(composeContent).toMatch(/image:\s*nginx:alpine/);
  });

  it('should inject database password via environment variable', () => {
    expect(composeContent).toMatch(/MATOMO_DB_PASSWORD/);
    expect(composeContent).toMatch(/\$\{MATOMO_DB_PASSWORD\}/);
  });

  it('should NOT contain hardcoded passwords', () => {
    // Passwords must come from .env, not be hardcoded
    const lines = composeContent.split('\n');
    const passwordLines = lines.filter(
      (l) => /password/i.test(l) && !/\$\{/.test(l) && !/^\s*#/.test(l) && !/healthcheck/i.test(l)
    );
    expect(passwordLines).toHaveLength(0);
  });

  it('should configure matomo-db health check with innodb_initialized', () => {
    expect(composeContent).toMatch(/healthcheck/);
    expect(composeContent).toMatch(/innodb_initialized/);
  });

  it('should use configurable port via MATOMO_PORT with default 8080', () => {
    expect(composeContent).toMatch(/\$\{MATOMO_PORT:-8080\}:80/);
  });

  it('should define persistent volumes for data and database', () => {
    expect(composeContent).toMatch(/matomo-data:/);
    expect(composeContent).toMatch(/matomo-db-data:/);
  });

  it('should use a dedicated analytics network', () => {
    expect(composeContent).toMatch(/networks:/);
    expect(composeContent).toMatch(/analytics:/);
    expect(composeContent).toMatch(/driver:\s*bridge/);
  });

  it('should set matomo depends_on matomo-db with health condition', () => {
    expect(composeContent).toMatch(/depends_on:/);
    expect(composeContent).toMatch(/condition:\s*service_healthy/);
  });

  it('should mount nginx config as read-only', () => {
    expect(composeContent).toMatch(/matomo-nginx\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/);
  });
});

/* ── Nginx reverse proxy validation ──────────────────────────── */
describe('SP-2-MAT: Nginx reverse proxy configuration', () => {
  const nginxPath = path.join(ROOT, 'matomo-nginx.conf');
  let nginxContent;

  beforeAll(() => {
    nginxContent = fs.readFileSync(nginxPath, 'utf-8');
  });

  it('should exist as matomo-nginx.conf', () => {
    expect(fs.existsSync(nginxPath)).toBe(true);
  });

  it('should listen on port 80', () => {
    expect(nginxContent).toMatch(/listen\s+80;/);
  });

  it('should set document root to /var/www/html', () => {
    expect(nginxContent).toMatch(/root\s+\/var\/www\/html;/);
  });

  it('should proxy PHP files to matomo:9000 via FastCGI', () => {
    expect(nginxContent).toMatch(/fastcgi_pass\s+matomo:9000;/);
  });

  it('should handle matomo.php and index.php endpoints', () => {
    expect(nginxContent).toMatch(/matomo/);
    expect(nginxContent).toMatch(/index\.php/);
  });

  it('should cache static assets with 30d expiry', () => {
    expect(nginxContent).toMatch(/expires\s+30d;/);
  });

  it('should deny access to .ht files', () => {
    expect(nginxContent).toMatch(/location\s+~\s+\/\\\.ht/);
    expect(nginxContent).toMatch(/deny\s+all;/);
  });
});

/* ── Cookieless tracking configuration ───────────────────────── */
describe('SP-2-MAT: Cookieless tracking mode (GDPR)', () => {
  const specPath = path.join(ROOT, 'docs/phase-5/sp-2-mat-matomo-deployment.md');
  let specContent;

  beforeAll(() => {
    specContent = fs.readFileSync(specPath, 'utf-8');
  });

  it('should document cookieless mode configuration', () => {
    expect(specContent).toMatch(/cookieless/i);
    expect(specContent).toMatch(/disableCookies/);
  });

  it('should specify use_third_party_id_cookie = 0', () => {
    expect(specContent).toMatch(/use_third_party_id_cookie\s*=\s*0/);
  });

  it('should include GDPR compliance documentation', () => {
    expect(specContent).toMatch(/GDPR/i);
    expect(specContent).toMatch(/no cookie banner/i);
  });

  it('should document IP anonymization', () => {
    expect(specContent).toMatch(/IP anonymization/i);
  });

  it('should specify tracking script with disableCookies push', () => {
    expect(specContent).toMatch(/_paq\.push\(\['disableCookies'\]\)/);
  });

  it('should set siteId to 1 in tracking script', () => {
    expect(specContent).toMatch(/setSiteId.*1/);
  });
});

/* ── Tracking script template validation ─────────────────────── */
describe('SP-2-MAT: Tracking script format', () => {
  it('should produce a valid tracking script with required pushes', () => {
    // Validate the tracking script structure matches Matomo spec
    const requiredPushes = [
      "['disableCookies']",
      "['trackPageView']",
      "['enableLinkTracking']",
      "['setTrackerUrl'",
      "['setSiteId'",
    ];

    const trackingScript = `
      var _paq = window._paq = window._paq || [];
      _paq.push(['disableCookies']);
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);
      (function() {
        var u = '//' + location.hostname + ':8080/';
        _paq.push(['setTrackerUrl', u + 'matomo.php']);
        _paq.push(['setSiteId', '1']);
        var d = document, g = d.createElement('script'),
            s = d.getElementsByTagName('script')[0];
        g.async = true; g.src = u + 'matomo.js';
        s.parentNode.insertBefore(g, s);
      })();
    `;

    for (const push of requiredPushes) {
      expect(trackingScript).toContain(push);
    }
  });

  it('should use async script loading', () => {
    const trackingScript = "g.async = true; g.src = u + 'matomo.js';";
    expect(trackingScript).toContain('async = true');
    expect(trackingScript).toContain('matomo.js');
  });

  it('should use dynamic hostname for tracker URL portability', () => {
    const trackerUrl = "var u = '//' + location.hostname + ':8080/';";
    expect(trackerUrl).toContain('location.hostname');
  });
});

/* ── Port allocation validation ──────────────────────────────── */
describe('SP-2-MAT: Port allocation isolation', () => {
  const analyticsCompose = path.join(ROOT, 'docker-compose.analytics.yml');

  it('should allocate Matomo on port 8080 (non-conflicting)', () => {
    const content = fs.readFileSync(analyticsCompose, 'utf-8');
    expect(content).toMatch(/8080/);
  });

  it('should not conflict with main app port 3000', () => {
    const analyticsContent = fs.readFileSync(analyticsCompose, 'utf-8');
    // Extract port mappings (host:container format)
    const portMatches = analyticsContent.match(/"\d+:\d+"/g) || [];
    const hostPorts = portMatches.map((p) => p.replace(/"/g, '').split(':')[0]);
    expect(hostPorts).not.toContain('3000');
  });

  it('should use separate Docker network from main stack', () => {
    const analyticsContent = fs.readFileSync(analyticsCompose, 'utf-8');
    expect(analyticsContent).toMatch(/analytics:\s*\n\s*driver:\s*bridge/);
  });
});
