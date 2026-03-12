/**
 * Matomo CORS & Tracking Fix Validation — SP-3-MAT-FIX (#131)
 * Validates CORS headers in Nginx config, noscript fallback alignment,
 * and end-to-end tracking readiness.
 *
 * Run: npm test -- __tests__/unit/matomo-cors-fix.test.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const NGINX_PATH = path.join(ROOT, 'matomo-nginx.conf');
const LANDING_PATH = path.join(ROOT, '.github/webapp/landing.html');

/* ── CORS headers in Nginx config ────────────────────────────── */
describe('SP-3-MAT-FIX: Nginx CORS headers for cross-origin tracking', () => {
  let nginxContent;

  beforeAll(() => {
    nginxContent = fs.readFileSync(NGINX_PATH, 'utf-8');
  });

  it('should include Access-Control-Allow-Origin header for PHP endpoints', () => {
    // The PHP location block must have CORS headers
    const phpBlock = nginxContent.match(
      /location\s+~\s+\^\/\(index\|matomo\|piwik[\s\S]*?\{([\s\S]*?)\}/
    );
    expect(phpBlock).not.toBeNull();
    expect(phpBlock[1]).toContain('Access-Control-Allow-Origin');
  });

  it('should allow all origins for tracking requests', () => {
    expect(nginxContent).toMatch(/Access-Control-Allow-Origin\s+"?\*"?/);
  });

  it('should allow GET, POST, and OPTIONS methods', () => {
    expect(nginxContent).toMatch(/Access-Control-Allow-Methods/);
    expect(nginxContent).toMatch(/GET/);
    expect(nginxContent).toMatch(/POST/);
    expect(nginxContent).toMatch(/OPTIONS/);
  });

  it('should allow Content-Type header in CORS', () => {
    expect(nginxContent).toMatch(/Access-Control-Allow-Headers/);
    expect(nginxContent).toMatch(/Content-Type/);
  });

  it('should handle OPTIONS preflight requests with 204', () => {
    expect(nginxContent).toMatch(/\$request_method\s*=\s*OPTIONS/);
    expect(nginxContent).toMatch(/return\s+204/);
  });

  it('should include CORS headers on static assets (matomo.js)', () => {
    // The static assets block should also have CORS
    const staticBlock = nginxContent.match(
      /location\s+~\*\s+\\\.\(js\|css[\s\S]*?\{([\s\S]*?)\}/
    );
    expect(staticBlock).not.toBeNull();
    expect(staticBlock[1]).toContain('Access-Control-Allow-Origin');
  });

  it('should use "always" directive for CORS headers (works on error responses too)', () => {
    expect(nginxContent).toMatch(/Access-Control-Allow-Origin\s+"?\*"?\s+always/);
  });
});

/* ── Noscript fallback alignment ─────────────────────────────── */
describe('SP-3-MAT-FIX: Noscript fallback alignment', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(LANDING_PATH, 'utf-8');
  });

  it('should NOT hardcode localhost in noscript fallback', () => {
    const noscriptMatch = html.match(/<noscript>[\s\S]*?<\/noscript>/);
    expect(noscriptMatch).not.toBeNull();
    expect(noscriptMatch[0]).not.toContain('//localhost:');
  });

  it('should include matomo.php with idsite=1 in noscript fallback', () => {
    expect(html).toMatch(/<noscript>.*matomo\.php\?idsite=1.*<\/noscript>/s);
  });

  it('should include rec=1 parameter in noscript fallback', () => {
    expect(html).toMatch(/<noscript>.*rec=1.*<\/noscript>/s);
  });

  it('should use referrerpolicy no-referrer-when-downgrade', () => {
    expect(html).toMatch(/referrerpolicy="no-referrer-when-downgrade"/);
  });
});

/* ── Tracking script + CORS alignment ────────────────────────── */
describe('SP-3-MAT-FIX: Tracking script and CORS alignment', () => {
  let html;
  let nginxContent;

  beforeAll(() => {
    html = fs.readFileSync(LANDING_PATH, 'utf-8');
    nginxContent = fs.readFileSync(NGINX_PATH, 'utf-8');
  });

  it('should have tracking script targeting port 8080', () => {
    expect(html).toContain("':8080/'");
  });

  it('should have CORS headers in Nginx matching the tracking endpoint', () => {
    // Nginx must allow cross-origin for the matomo.php endpoint
    expect(nginxContent).toContain('Access-Control-Allow-Origin');
    expect(nginxContent).toContain('matomo');
  });

  it('should load matomo.js from same origin as tracker URL', () => {
    // Both matomo.js and matomo.php should use the same base URL
    expect(html).toContain("u + 'matomo.php'");
    expect(html).toContain("u + 'matomo.js'");
  });

  it('should have navigator.sendBeacon-compatible CORS (POST allowed)', () => {
    // sendBeacon sends POST requests — CORS must allow POST
    expect(nginxContent).toMatch(/POST/);
  });
});
