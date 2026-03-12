/**
 * SP-3-201-M — Landing Page A/B Experiment Framework Tests
 * Validates experiment infrastructure, variant configuration,
 * Matomo tracking integration, and statistical guardrails.
 *
 * Run: npm test -- __tests__/unit/landing-experiment.test.js
 */

const fs = require('fs');
const path = require('path');

const LANDING_PATH = path.resolve(__dirname, '../../.github/webapp/landing.html');

describe('SP-3-201-M: A/B Experiment Framework', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(LANDING_PATH, 'utf-8');
  });

  /* ── AC-1: Experiment framework configured ─────────────────── */
  describe('AC-1: Experiment framework configured', () => {
    it('should contain the experiment framework script', () => {
      expect(html).toContain('A/B Experiment Framework');
      expect(html).toContain('SP-3-201-M');
    });

    it('should define experiment ID', () => {
      expect(html).toContain("var EXP_ID = 'headline-v1'");
    });

    it('should define control variant with original headline', () => {
      expect(html).toContain("control: { headline: 'Design it right. Build it fast.'");
    });

    it('should define variant_a with CRO-specified headline', () => {
      expect(html).toContain("headline: 'AI-Powered Phase-Based SDLC for Product Teams'");
    });

    it('should use 50/50 split ratio', () => {
      expect(html).toContain('var SPLIT = 0.5');
    });

    it('should expose experiment state on window for debugging', () => {
      expect(html).toContain('window.__experiment');
    });
  });

  /* ── AC-2: A/B testing infrastructure ──────────────────────── */
  describe('AC-2: A/B testing infrastructure', () => {
    it('should use localStorage for persistent variant assignment', () => {
      expect(html).toContain('localStorage.getItem(key)');
      expect(html).toContain('localStorage.setItem(key, assign)');
    });

    it('should handle localStorage unavailability (private browsing)', () => {
      // try/catch around localStorage calls
      const getMatch = html.match(/try\s*\{[^}]*localStorage\.getItem/);
      const setMatch = html.match(/try\s*\{[^}]*localStorage\.setItem/);
      expect(getMatch).not.toBeNull();
      expect(setMatch).not.toBeNull();
    });

    it('should fall back gracefully if assigned variant is invalid', () => {
      expect(html).toContain('!assign || !VARIANTS[assign]');
    });

    it('should swap hero heading text for variant', () => {
      expect(html).toContain("document.getElementById('hero-heading')");
      expect(html).toContain('h.textContent = v.headline');
    });

    it('should be placed inline after hero heading to prevent FOUC', () => {
      const heroHeadingPos = html.indexOf('id="hero-heading"');
      const experimentPos = html.indexOf("var EXP_ID = 'headline-v1'");
      expect(experimentPos).toBeGreaterThan(heroHeadingPos);
      // Experiment script should be before the value props section
      const valuePropsPos = html.indexOf('class="value-props"');
      expect(experimentPos).toBeLessThan(valuePropsPos);
    });
  });

  /* ── AC-3: Baseline performance measurement via Matomo ─────── */
  describe('AC-3: Matomo experiment tracking', () => {
    it('should set custom dimension 1 with variant label', () => {
      expect(html).toContain("_paq.push(['setCustomDimension', 1, v.dim])");
    });

    it('should define dimension values for each variant', () => {
      expect(html).toContain("dim: 'control_original'");
      expect(html).toContain("dim: 'variant_ai_powered'");
    });

    it('should call trackPageView after setting custom dimension', () => {
      const dimPos = html.indexOf('setCustomDimension');
      const pageViewPos = html.indexOf('trackPageView');
      expect(dimPos).toBeLessThan(pageViewPos);
    });

    it('should enable link tracking after page view', () => {
      const pageViewPos = html.indexOf('trackPageView');
      const linkPos = html.indexOf('enableLinkTracking');
      expect(pageViewPos).toBeLessThan(linkPos);
    });

    it('should track experiment assignment as Matomo event', () => {
      expect(html).toContain("'trackEvent', 'Experiment', 'Assignment'");
    });

    it('should include experiment ID in event label', () => {
      expect(html).toContain("EXP_ID + ':' + assign");
    });
  });

  /* ── AC-5: Statistical rigor — variant structure ───────────── */
  describe('AC-5: Statistical rigor structure', () => {
    it('should have exactly 2 variants (control + 1 treatment)', () => {
      // Count variant definitions in the VARIANTS object
      const controlMatch = html.match(/control:\s*\{/g);
      const variantMatch = html.match(/variant_a:\s*\{/g);
      expect(controlMatch).toHaveLength(1);
      expect(variantMatch).toHaveLength(1);
    });

    it('should preserve original headline as control (no degradation)', () => {
      // The raw HTML h1 contains the original headline
      expect(html).toMatch(/<h1[^>]*>Design it right\. Build it fast\.<\/h1>/);
    });

    it('SPLIT value should be between 0 and 1 exclusive', () => {
      const splitMatch = html.match(/var SPLIT = ([\d.]+)/);
      expect(splitMatch).not.toBeNull();
      const splitValue = parseFloat(splitMatch[1]);
      expect(splitValue).toBeGreaterThan(0);
      expect(splitValue).toBeLessThan(1);
    });

    it('should use Math.random for unbiased assignment', () => {
      expect(html).toContain('Math.random() < SPLIT');
    });
  });

  /* ── Matomo init still functional ──────────────────────────── */
  describe('Matomo init compatibility', () => {
    it('should still initialize _paq in head', () => {
      const headEnd = html.indexOf('</head>');
      const paqInit = html.indexOf('var _paq = window._paq');
      expect(paqInit).toBeGreaterThan(-1);
      expect(paqInit).toBeLessThan(headEnd);
    });

    it('should still disable cookies in head (GDPR)', () => {
      const headEnd = html.indexOf('</head>');
      const disablePos = html.indexOf('disableCookies');
      expect(disablePos).toBeLessThan(headEnd);
    });

    it('should still load matomo.js asynchronously from head', () => {
      const headEnd = html.indexOf('</head>');
      const loaderPos = html.indexOf("g.src = u + 'matomo.js'");
      expect(loaderPos).toBeGreaterThan(-1);
      expect(loaderPos).toBeLessThan(headEnd);
    });
  });
});
