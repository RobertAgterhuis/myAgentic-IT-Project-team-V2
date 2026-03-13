/**
 * Landing Page Matomo Integration Tests — SP-2-LND (#128)
 * Validates Matomo tracking script integration on the landing page.
 * Tests cookieless mode, tracking script structure, and noscript fallback.
 *
 * Run: npm test -- tests/unit/landing-matomo.test.js
 */

const fs = require('fs');
const path = require('path');

const LANDING_PATH = path.resolve(__dirname, '../../src/webapp/landing.html');

describe('SP-2-LND: Matomo tracking integration on landing page', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(LANDING_PATH, 'utf-8');
  });

  it('should contain the Matomo tracking script', () => {
    expect(html).toContain('_paq');
    expect(html).toContain('matomo.php');
  });

  it('should disable cookies for GDPR compliance', () => {
    expect(html).toContain("_paq.push(['disableCookies'])");
  });

  it('should track page views', () => {
    expect(html).toContain("_paq.push(['trackPageView'])");
  });

  it('should enable link tracking', () => {
    expect(html).toContain("_paq.push(['enableLinkTracking'])");
  });

  it('should set tracker URL to matomo.php on port 8080', () => {
    expect(html).toContain("':8080/'");
    expect(html).toContain("'matomo.php'");
  });

  it('should set siteId to 1', () => {
    expect(html).toContain("['setSiteId', '1']");
  });

  it('should load matomo.js asynchronously', () => {
    expect(html).toContain('g.async = true');
    expect(html).toContain("'matomo.js'");
  });

  it('should use dynamic hostname for portability', () => {
    expect(html).toContain('location.hostname');
  });

  it('should include noscript fallback tracking pixel', () => {
    expect(html).toMatch(/<noscript>.*matomo\.php\?idsite=1.*<\/noscript>/s);
  });

  it('should place tracking script in <head> before page load', () => {
    const headEnd = html.indexOf('</head>');
    const scriptPos = html.indexOf('var _paq = window._paq');
    expect(scriptPos).toBeGreaterThan(-1);
    expect(scriptPos).toBeLessThan(headEnd);
  });

  it('should include SP-2-MAT reference comment', () => {
    expect(html).toMatch(/SP-2-MAT/);
  });

  it('should NOT set any cookies or use consent mode', () => {
    // disableCookies must appear BEFORE trackPageView push call
    const disablePos = html.indexOf("_paq.push(['disableCookies'])");
    const trackPos = html.indexOf("_paq.push(['trackPageView'])");
    expect(disablePos).toBeLessThan(trackPos);
  });

  it('should defer trackPageView to A/B experiment framework (SP-3-201-M)', () => {
    // trackPageView is now in the experiment script, not the head Matomo init
    const headEnd = html.indexOf('</head>');
    // The head comment references the deferral
    expect(html).toContain('Page view tracking deferred to A/B experiment script');
    // trackPageView push call is after experiment assignment in body
    const trackPos = html.indexOf("_paq.push(['trackPageView'])");
    expect(trackPos).toBeGreaterThan(headEnd);
  });
});
