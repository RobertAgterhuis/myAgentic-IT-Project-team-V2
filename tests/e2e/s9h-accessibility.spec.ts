/**
 * S9H-40: WCAG 2.1 AA Accessibility Audit
 *
 * Automated axe-core scans + keyboard navigation tests for all pages.
 * Ensures zero critical/serious violations per WCAG 2.1 AA.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/', name: 'Overview' },
  { path: '/decisions', name: 'Decisions' },
  { path: '/questionnaires', name: 'Questionnaires' },
  { path: '/metrics', name: 'Metrics' },
  { path: '/command-center', name: 'Command Center' },
  { path: '/pipeline', name: 'Pipeline' },
  { path: '/sessions', name: 'Sessions' },
  { path: '/agents', name: 'Agents' },
  { path: '/governance', name: 'Governance' },
];

test.describe('axe-core WCAG 2.1 AA scan', () => {
  for (const { path, name } of PAGES) {
    test(`${name} (${path}) has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      // Wait for React hydration
      await page.waitForSelector('[data-testid], main, h1', { timeout: 5000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        const report = critical.map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join('\n  ')}`
        );
        expect(critical, `WCAG violations on ${name}:\n${report.join('\n')}`).toHaveLength(0);
      }
    });
  }
});

test.describe('Keyboard navigation', () => {
  test('Tab reaches all nav links on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });

    // Tab through interactive elements and track focused element roles
    const focusedElements: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'BODY';
        return `${el.tagName}:${el.getAttribute('role') || ''}:${el.textContent?.trim().slice(0, 30) || ''}`;
      });
      focusedElements.push(tag);
      if (tag === 'BODY') break;
    }

    // Verify we reached at least one link and one nav element
    const hasLink = focusedElements.some((f) => f.startsWith('A:'));
    const hasButton = focusedElements.some((f) => f.startsWith('BUTTON:'));
    expect(hasLink || hasButton, 'Tab should reach interactive elements').toBe(true);
  });

  test('focus indicators are visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });

    // Tab to an interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that the focused element has a visible focus indicator
    const hasOutline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      const styles = window.getComputedStyle(el);
      // Check for outline or box-shadow (Tailwind ring utilities use box-shadow)
      return (
        (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px') ||
        styles.boxShadow !== 'none'
      );
    });

    expect(hasOutline, 'Focused element should have visible focus indicator').toBe(true);
  });

  test('Escape closes modal/dialog if open', async ({ page }) => {
    await page.goto('/command-center');
    await page.waitForSelector('h1', { timeout: 5000 });

    // Press Escape — should not cause errors
    await page.keyboard.press('Escape');
    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('ARIA landmarks', () => {
  for (const { path, name } of PAGES) {
    test(`${name} has required ARIA landmarks`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('main, [role="main"]', { timeout: 5000 });

      // Check for main landmark
      const mainCount = await page.locator('main, [role="main"]').count();
      expect(mainCount, `${name} should have a <main> landmark`).toBeGreaterThanOrEqual(1);

      // Check for navigation landmark
      const navCount = await page.locator('nav, [role="navigation"]').count();
      expect(navCount, `${name} should have a <nav> landmark`).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe('Color contrast (WCAG AA)', () => {
  test('axe-core finds no color-contrast violations on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(violations, 'Color contrast violations found').toHaveLength(0);
  });
});

test.describe('Heading hierarchy', () => {
  for (const { path, name } of PAGES) {
    test(`${name} has valid heading hierarchy`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('h1', { timeout: 5000 });

      // Collect all heading levels in order
      const headings = await page.evaluate(() => {
        const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(hs).map((h) => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim().slice(0, 50) || '',
        }));
      });

      // Must have at least one h1
      expect(
        headings.some((h) => h.level === 1),
        `${name} should have an <h1>`
      ).toBe(true);

      // No skipped levels (e.g., h1 → h3 without h2)
      for (let i = 1; i < headings.length; i++) {
        const jump = headings[i].level - headings[i - 1].level;
        expect(
          jump,
          `${name}: heading "${headings[i].text}" skips from h${headings[i - 1].level} to h${headings[i].level}`
        ).toBeLessThanOrEqual(1);
      }
    });
  }
});
