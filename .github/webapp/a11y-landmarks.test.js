// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';
/* global describe, it, expect */
const fs = require('fs');
const path = require('path');

/**
 * Accessibility Tests — SP-5 (UX-01, UX-02, UX-03, MKT-01)
 *
 * UX-01: ARIA landmark roles (banner, main, navigation, contentinfo)
 * UX-02: Skip-to-content navigation
 * UX-03: Visible focus indicators (no outline:none without replacement)
 * MKT-01: Canonical product name (DEC-R4-003)
 */

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

/* ── UX-01: ARIA Landmark Roles ────────────────────────── */

describe('UX-01: ARIA landmark roles', () => {
  it('has a header with role="banner"', () => {
    expect(html).toMatch(/<header[^>]*role="banner"/);
  });

  it('has a content wrapper with role="main"', () => {
    expect(html).toMatch(/role="main"/);
  });

  it('has a footer with role="contentinfo"', () => {
    expect(html).toMatch(/<footer[^>]*role="contentinfo"/);
  });

  it('has navigation landmarks', () => {
    // Sidebar nav, command nav, and tablist
    const navMatches = html.match(/aria-label="[^"]*navigation[^"]*"/gi) || [];
    expect(navMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('tablist has aria-label', () => {
    expect(html).toMatch(/role="tablist"[^>]*aria-label="/);
  });

  it('does not have multiple <main> elements', () => {
    const mainElements = html.match(/<main[\s>]/g) || [];
    expect(mainElements.length).toBe(0); // All <main> replaced with <div>
  });

  it('all tabpanels have aria-labelledby', () => {
    const panels = html.match(/role="tabpanel"/g) || [];
    const labeled = html.match(/role="tabpanel"[^>]*aria-labelledby="/g) || [];
    expect(panels.length).toBeGreaterThan(0);
    expect(labeled.length).toBe(panels.length);
  });

  it('all tabs have aria-selected and aria-controls', () => {
    const tabs = html.match(/role="tab"/g) || [];
    const withSelected = html.match(/role="tab"[^>]*aria-selected="/g) || [];
    const withControls = html.match(/role="tab"[^>]*aria-controls="/g) || [];
    expect(tabs.length).toBeGreaterThan(0);
    expect(withSelected.length).toBe(tabs.length);
    expect(withControls.length).toBe(tabs.length);
  });

  it('all dialogs have aria-modal and aria-labelledby or aria-label', () => {
    const dialogs = html.match(/role="dialog"/g) || [];
    const withModal = html.match(/role="dialog"[^>]*aria-modal="true"/g) || [];
    const withLabel = (html.match(/role="dialog"[^>]*aria-labelledby="/g) || [])
      .concat(html.match(/role="dialog"[^>]*aria-label="/g) || []);
    expect(dialogs.length).toBeGreaterThan(0);
    expect(withModal.length).toBe(dialogs.length);
    expect(withLabel.length).toBe(dialogs.length);
  });
});

/* ── UX-02: Skip-to-content navigation ────────────────── */

describe('UX-02: Skip-to-content navigation', () => {
  it('has a skip-nav link as first focusable element', () => {
    const bodyStart = html.indexOf('<body>');
    const firstLink = html.indexOf('<a ', bodyStart);
    const skipNav = html.indexOf('class="skip-nav"', bodyStart);
    expect(skipNav).toBeGreaterThan(bodyStart);
    expect(firstLink).toBeLessThan(skipNav + 30);
  });

  it('skip link targets the main content area', () => {
    expect(html).toMatch(/<a[^>]*href="#content"[^>]*class="skip-nav"/);
  });

  it('skip link target element exists', () => {
    expect(html).toMatch(/id="content"/);
  });

  it('skip-nav has visible-on-focus CSS', () => {
    expect(html).toMatch(/\.skip-nav:focus\s*\{[^}]*left:\s*8px/);
  });

  it('skip-nav text is descriptive', () => {
    expect(html).toMatch(/class="skip-nav"[^>]*>Skip to main content</);
  });
});

/* ── UX-03: Visible focus indicators ──────────────────── */

describe('UX-03: Visible focus indicators', () => {
  it('has global focus-visible rule for interactive elements', () => {
    expect(html).toMatch(/button:focus-visible.*\{[^}]*outline:\s*2px\s+solid/);
  });

  it('has focus-visible rule for tabs', () => {
    expect(html).toMatch(/\.tab:focus-visible/);
  });

  it('has focus-visible rule for links', () => {
    expect(html).toMatch(/a:focus-visible/);
  });

  it('has focus-visible rule for inputs, selects, textareas', () => {
    expect(html).toMatch(/input:focus-visible/);
    expect(html).toMatch(/select:focus-visible/);
    expect(html).toMatch(/textarea:focus-visible/);
  });

  it('has focus-visible for cmd-btn', () => {
    expect(html).toMatch(/\.cmd-btn:focus-visible\s*\{[^}]*outline/);
  });

  it('has focus-visible for theme toggle', () => {
    expect(html).toMatch(/\.theme-toggle:focus-visible\s*\{[^}]*outline/);
  });

  it('form control :focus rules include outline (not outline:none)', () => {
    // Check that form-group focus rules have outline declarations
    const formFocusRules = html.match(/\.form-group[^{]*:focus\s*\{[^}]+\}/g) || [];
    for (const rule of formFocusRules) {
      expect(rule).toMatch(/outline:\s*2px/);
      expect(rule).not.toMatch(/outline:\s*none/);
    }
  });

  it('no outline:none without replacement on interactive elements', () => {
    // Find all :focus rules in CSS (inside <style>)
    const styleStart = html.indexOf('<style>');
    const styleEnd = html.indexOf('</style>');
    const css = html.slice(styleStart, styleEnd);

    // Extract all :focus blocks
    const focusBlocks = css.match(/[^{]*:focus\s*\{[^}]+\}/g) || [];
    for (const block of focusBlocks) {
      if (block.includes('outline: none') || block.includes('outline:none')) {
        // If outline:none is present, there should be an alternative visible indicator:
        // either box-shadow, border-color change, or a separate outline declaration
        const hasAlternative = block.includes('box-shadow') ||
                              block.includes('border-color') ||
                              block.includes('outline: 2px');
        expect(hasAlternative).toBe(true);
      }
    }
  });

  it('forced-colors media query provides outline for focus', () => {
    expect(html).toMatch(/forced-colors:\s*active\)[\s\S]*?\*:focus-visible\s*\{[^}]*outline/);
  });

  it('prefers-reduced-motion is respected', () => {
    expect(html).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

/* ── MKT-01: Canonical product name ───────────────────── */

describe('MKT-01: Canonical product name (DEC-R4-003)', () => {
  it('HTML title uses canonical name', () => {
    expect(html).toMatch(/<title>myAgentic-IT-Project-team/);
  });

  it('header h1 uses canonical name', () => {
    expect(html).toMatch(/<h1[^>]*>myAgentic-IT-Project-team/);
  });

  it('does not contain old "Agentic System" in user-facing HTML elements', () => {
    // Extract only HTML content and remove script blocks before scanning visible text.
    const bodyStart = html.indexOf('<body>');
    const bodyHtml = bodyStart >= 0 ? html.slice(bodyStart) : html;
    const htmlContent = bodyHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // Allow in comments, don't allow in visible elements
    const lines = htmlContent.split(/\r?\n/);
    const violations = lines.filter(l =>
      !l.trim().startsWith('<!--') && l.includes('Agentic System')
    );
    expect(violations).toEqual([]);
  });
});
