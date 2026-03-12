/**
 * SP-2-LND — Landing Page Final QA Validation
 * Validates all 8 acceptance criteria from sp-2-lnd-landing-page-scope.md
 * Covers: hero, value props, how-it-works, social proof, email signup,
 *         responsive meta, WCAG AA, performance markers
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', '..', '.github', 'webapp', 'landing.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

describe('SP-2-LND — Landing Page Final QA', () => {
  /* ── AC-1: Hero section with approved tagline and CTAs ───────── */
  describe('AC-1: Hero section', () => {
    test('contains approved tagline "Design it right. Build it fast."', () => {
      expect(html).toContain('Design it right. Build it fast.');
    });

    test('contains primary value proposition subtitle', () => {
      expect(html).toContain(
        'end-to-end platform that combines multi-discipline strategic analysis'
      );
    });

    test('has primary CTA "Explore the Documentation"', () => {
      expect(html).toContain('Explore the Documentation');
    });

    test('has secondary CTA "View on GitHub"', () => {
      expect(html).toContain('View on GitHub');
    });

    test('hero heading has proper id for ARIA', () => {
      expect(html).toMatch(/id="hero-heading"/);
      expect(html).toMatch(/aria-labelledby="hero-heading"/);
    });
  });

  /* ── AC-2: 4 value proposition pillars ───────────────────────── */
  describe('AC-2: Value proposition pillars', () => {
    test('displays "End-to-End Rigor" pillar', () => {
      expect(html).toContain('End-to-End Rigor');
      expect(html).toContain('Zero gaps from strategy to sprint');
    });

    test('displays "Multi-Discipline" pillar', () => {
      expect(html).toContain('Multi-Discipline');
      expect(html).toContain('30+ specialized agents');
    });

    test('displays "Built-In Governance" pillar', () => {
      expect(html).toContain('Built-In Governance');
      expect(html).toContain('GDPR, WCAG AA, secret scanning');
    });

    test('displays "Execution Speed" pillar', () => {
      expect(html).toContain('Execution Speed');
      expect(html).toContain('CI/CD pipeline');
    });

    test('value-props section has aria-label', () => {
      expect(html).toMatch(/class="value-props"[^>]*aria-label/);
    });
  });

  /* ── AC-3: How It Works phase flow ───────────────────────────── */
  describe('AC-3: How It Works flow', () => {
    test('contains 5 phase steps', () => {
      const phases = html.match(/class="phase-step"/g);
      expect(phases).toHaveLength(5);
    });

    test('phases are labeled correctly', () => {
      expect(html).toContain('Requirements &amp; Strategy');
      expect(html).toContain('Architecture &amp; Design');
      expect(html).toContain('Experience Design');
      expect(html).toContain('Brand &amp; Growth');
      expect(html).toContain('Sprint Execution');
    });

    test('phase arrows use aria-hidden', () => {
      const arrows = html.match(/class="phase-arrow"[^>]*aria-hidden="true"/g);
      expect(arrows).not.toBeNull();
      expect(arrows.length).toBeGreaterThanOrEqual(4);
    });

    test('phases container has role="list"', () => {
      expect(html).toMatch(/class="phases"[^>]*role="list"/);
    });
  });

  /* ── AC-4: Social proof metrics ──────────────────────────────── */
  describe('AC-4: Social proof (Sprint 1 metrics)', () => {
    test('displays "15" sprint items', () => {
      expect(html).toContain('<div class="stat-value">15</div>');
    });

    test('displays "1172" automated tests', () => {
      expect(html).toContain('<div class="stat-value">1172</div>');
    });

    test('displays "8" CI/CD pipeline jobs', () => {
      expect(html).toContain('<div class="stat-value">8</div>');
    });

    test('displays "91%" accessibility score', () => {
      expect(html).toContain('<div class="stat-value">91%</div>');
    });
  });

  /* ── AC-5: Email signup with Buttondown integration ──────────── */
  describe('AC-5: Email signup form', () => {
    test('has email input with proper type and autocomplete', () => {
      expect(html).toMatch(/type="email"[^>]*autocomplete="email"/);
    });

    test('has segment selector with 4 options', () => {
      const options = html.match(/<option value="/g);
      expect(options).toHaveLength(4);
    });

    test('form POSTs to /api/subscribe', () => {
      expect(html).toContain("'/api/subscribe'");
    });

    test('sends JSON with email and metadata', () => {
      expect(html).toContain('JSON.stringify({ email: email, metadata:');
    });

    test('has subscribe message area with aria-live', () => {
      expect(html).toMatch(/id="subscribeMsg"[^>]*aria-live="polite"/);
    });

    test('has privacy note about cookieless analytics', () => {
      expect(html).toContain('Cookieless analytics');
    });
  });

  /* ── AC-6: Responsive meta viewport ──────────────────────────── */
  describe('AC-6: Responsive design markers', () => {
    test('has viewport meta tag', () => {
      expect(html).toContain('name="viewport"');
      expect(html).toContain('width=device-width');
    });

    test('uses clamp() for responsive typography', () => {
      expect(html).toMatch(/font-size:\s*clamp\(/);
    });

    test('uses grid auto-fit for value props', () => {
      expect(html).toContain('grid-template-columns: repeat(auto-fit');
    });

    test('has 768px mobile breakpoint for phase arrows', () => {
      expect(html).toContain('@media (max-width: 768px)');
    });
  });

  /* ── AC-7: WCAG 2.1 AA compliance markers ────────────────────── */
  describe('AC-7: WCAG 2.1 AA compliance', () => {
    test('has skip-to-main-content link', () => {
      expect(html).toMatch(/class="skip-link"[^>]*>Skip to main content/);
    });

    test('HTML lang attribute is set', () => {
      expect(html).toMatch(/<html[^>]*lang="en"/);
    });

    test('all form inputs have labels or aria-label', () => {
      // Email input
      expect(html).toMatch(/id="subscribe-email"[^>]*aria-label/);
      // Segment select
      expect(html).toMatch(/id="subscribe-segment"[^>]*aria-label/);
    });

    test('focus-visible outline is defined', () => {
      expect(html).toContain('a:focus-visible');
      expect(html).toContain('outline: 2px solid');
    });

    test('form has aria-label for screen readers', () => {
      expect(html).toMatch(/class="subscribe-form"[^>]*aria-label/);
    });

    test('images have alt attributes', () => {
      // noscript Matomo img
      const imgs = html.match(/<img[^>]*>/g) || [];
      imgs.forEach((img) => {
        expect(img).toMatch(/alt="/);
      });
    });
  });

  /* ── AC-8: Performance markers (Lighthouse readiness) ────────── */
  describe('AC-8: Performance / Lighthouse markers', () => {
    test('Matomo script loads async', () => {
      expect(html).toContain('g.async = true');
    });

    test('no render-blocking external scripts in head', () => {
      // Only inline script (Matomo) in head, no external blocking scripts
      const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
      expect(headMatch).not.toBeNull();
      const head = headMatch[1];
      // Should NOT have <script src="..."> without async/defer
      const blockingScripts = head.match(/<script\s+src="[^"]*"(?![^>]*(?:async|defer))[^>]*>/g);
      expect(blockingScripts).toBeNull();
    });

    test('uses CSS custom properties (no large framework)', () => {
      expect(html).toContain('var(--primary');
      expect(html).toContain('var(--font-sans');
    });

    test('meta description present for SEO', () => {
      expect(html).toMatch(/<meta\s+name="description"/);
    });

    test('Open Graph meta tags present', () => {
      expect(html).toMatch(/<meta\s+property="og:title"/);
      expect(html).toMatch(/<meta\s+property="og:description"/);
    });

    test('external links have rel="noopener noreferrer"', () => {
      expect(html).toMatch(/rel="noopener noreferrer"[^>]*target="_blank"/);
    });
  });

  /* ── Matomo integration (cross-ref SP-2-MAT) ────────────────── */
  describe('SP-2-MAT integration', () => {
    test('Matomo script present in head', () => {
      expect(html).toContain('var _paq = window._paq');
    });

    test('cookieless mode enabled', () => {
      expect(html).toContain("_paq.push(['disableCookies'])");
    });

    test('noscript fallback present', () => {
      expect(html).toContain('<noscript>');
      expect(html).toContain('matomo.php?idsite=1');
    });
  });
});
