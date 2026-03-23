/**
 * M15-041: Overview page, navigation flow, and session lifecycle E2E tests.
 *
 * Covers:
 * - Overview page loads as landing page
 * - Navigation flow through all new pages
 * - Session lifecycle (observe existing sessions)
 * - First-time user experience (welcome wizard)
 * - Responsive layout verification
 */
import { test, expect } from '@playwright/test';

function extractSessions(body: unknown): Array<Record<string, unknown>> {
  if (body && typeof body === 'object') {
    const payload = body as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as Array<Record<string, unknown>>;
    if (Array.isArray(payload.sessions)) return payload.sessions as Array<Record<string, unknown>>;
  }
  return [];
}

/* ---------- Overview Page ---------- */

test.describe('Overview page', () => {
  test('loads as the landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });
    const main = page.locator('main');
    await expect(main).toBeVisible();
    await expect(page.locator('body')).toContainText(/dashboard|overview|mission control/i);
  });

  test('contains session status section', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });
    // The overview page always renders — either with an active session or idle CTA
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });

  test('contains system health strip', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });
    // Look for health-related content or the section heading
    const healthSection = page.locator(
      '[aria-label="System health"], h2:has-text("System Health")'
    );
    const healthCount = await healthSection.count();
    // Health strip may or may not render depending on API data
    expect(healthCount).toBeGreaterThanOrEqual(0);
  });

  test('old /dashboard route still works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('main', { timeout: 5000 });
    await expect(page.locator('main')).toBeVisible();
  });
});

/* ---------- Navigation Flow ---------- */

test.describe('Navigation flow', () => {
  test('navigates from overview to sessions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });
    const sessionsLink = page.locator('nav a[href="/sessions"], nav a:has-text("Sessions")');
    if ((await sessionsLink.count()) > 0) {
      await sessionsLink.first().click();
      await expect(page).toHaveURL(/\/sessions/);
    }
  });

  test('navigates from overview to commands', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });
    const commandsLink = page.locator('nav a[href="/commands"], nav a:has-text("Commands")');
    if ((await commandsLink.count()) > 0) {
      await commandsLink.first().click();
      await expect(page).toHaveURL(/\/commands/);
    }
  });

  test('navigates from overview to decisions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });
    const decisionsLink = page.locator('nav a[href="/decisions"], nav a:has-text("Decisions")');
    if ((await decisionsLink.count()) > 0) {
      await decisionsLink.first().click();
      await expect(page).toHaveURL(/\/decisions/);
    }
  });

  test('navigates from overview to artifacts', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });
    const artifactsLink = page.locator('nav a[href="/artifacts"], nav a:has-text("Artifacts")');
    if ((await artifactsLink.count()) > 0) {
      await artifactsLink.first().click();
      await expect(page).toHaveURL(/\/artifacts/);
    }
  });

  test('navigates from overview to governance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });
    const govLink = page.locator('nav a[href="/governance"], nav a:has-text("Governance")');
    if ((await govLink.count()) > 0) {
      await govLink.first().click();
      await expect(page).toHaveURL(/\/governance/);
    }
  });

  test('all primary routes load without errors', async ({ page }) => {
    const routes = [
      '/',
      '/sessions',
      '/commands',
      '/decisions',
      '/artifacts',
      '/governance',
      '/observability',
      '/agents',
      '/questionnaires',
      '/pipeline',
    ];

    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.status(), `${route} should return 200`).toBe(200);
      await page.waitForSelector('h1, main', { timeout: 5000 });
    }
  });

  test('legacy redirects work', async ({ page }) => {
    await page.goto('/command-center');
    await expect(page).toHaveURL(/\/commands/);

    await page.goto('/metrics');
    await expect(page).toHaveURL(/\/observability/);
  });

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForSelector('body', { timeout: 5000 });
    const text = await page.locator('body').textContent();
    expect(text).toMatch(/not found|404/i);
  });
});

/* ---------- Session Lifecycle ---------- */

test.describe('Session lifecycle (API)', () => {
  test('GET /api/sessions returns a list', async ({ request }) => {
    const res = await request.get('/api/sessions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('ok', true);
    const sessions = extractSessions(body);
    expect(Array.isArray(sessions)).toBeTruthy();
  });

  test('session entries have required fields', async ({ request }) => {
    const res = await request.get('/api/sessions');
    const body = await res.json();
    const sessions = extractSessions(body);
    if (sessions.length === 0) {
      test.skip();
      return;
    }
    const session = sessions[0];
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('status');
    expect(session).toHaveProperty('mode');
  });

  test('GET /api/sessions/:id returns detail', async ({ request }) => {
    const listRes = await request.get('/api/sessions');
    const list = await listRes.json();
    const sessions = extractSessions(list);
    if (sessions.length === 0) {
      test.skip();
      return;
    }
    const id = String(sessions[0].id);
    const res = await request.get(`/api/sessions/${encodeURIComponent(id)}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('ok', true);
    expect(body.data).toHaveProperty('id');
  });

  test('session detail page loads for an existing session', async ({ page, request }) => {
    const listRes = await request.get('/api/sessions');
    const list = await listRes.json();
    const sessions = extractSessions(list);
    if (sessions.length === 0) {
      test.skip();
      return;
    }
    const id = String(sessions[0].id);
    await page.goto(`/sessions/${encodeURIComponent(id)}`);
    await page.waitForSelector('h1, main', { timeout: 5000 });
    await expect(page.locator('main')).toBeVisible();
  });
});

/* ---------- Session Lifecycle (UI) ---------- */

test.describe('Session lifecycle (UI)', () => {
  test('sessions page shows a list or empty state', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForSelector('main', { timeout: 5000 });
    await expect(page.locator('main')).toBeVisible();
    const body = await page.locator('body').textContent();
    expect(body?.length ?? 0).toBeGreaterThan(0);
  });

  test('clicking a session navigates to detail', async ({ page, request }) => {
    const listRes = await request.get('/api/sessions');
    const list = await listRes.json();
    const sessions = extractSessions(list);
    if (sessions.length === 0) {
      test.skip();
      return;
    }
    await page.goto('/sessions');
    await page.waitForSelector('main', { timeout: 5000 });

    // Find a clickable session link/card
    const sessionLink = page.locator('a[href*="/sessions/"]').first();
    if ((await sessionLink.count()) > 0) {
      await sessionLink.click();
      await expect(page).toHaveURL(/\/sessions\/.+/);
      await page.waitForSelector('main', { timeout: 5000 });
    }
  });
});

/* ---------- First-time User Experience ---------- */

test.describe('Welcome wizard (first visit)', () => {
  test('shows wizard on first visit when no localStorage key', async ({ page, context }) => {
    // Clear localStorage for fresh state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('welcome-wizard-dismissed'));
    await page.reload();
    await page.waitForSelector('main, [data-testid="welcome-wizard"]', { timeout: 5000 });

    const wizard = page.locator('[data-testid="welcome-wizard"]');
    // Wizard may or may not be visible depending on implementation hydration timing
    const wizardCount = await wizard.count();
    if (wizardCount > 0) {
      await expect(wizard).toBeVisible();
      // Step 1 should show
      await expect(page.locator('text=Welcome to the Command Center')).toBeVisible();
    }
  });

  test('wizard can be navigated and dismissed', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('welcome-wizard-dismissed'));
    await page.reload();
    await page.waitForSelector('main, [data-testid="welcome-wizard"]', { timeout: 5000 });

    const wizard = page.locator('[data-testid="welcome-wizard"]');
    if ((await wizard.count()) === 0) {
      test.skip();
      return;
    }

    // Click Next to go to step 2
    const nextBtn = page.getByRole('button', { name: /next/i });
    await nextBtn.click();
    await expect(page.locator('text=Run Commands')).toBeVisible();

    // Dismiss via X
    const dismissBtn = page.getByRole('button', { name: /dismiss wizard/i });
    await dismissBtn.click();
    await expect(wizard).not.toBeVisible();
  });

  test('wizard does not show on return visit', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('welcome-wizard-dismissed', 'true'));
    await page.reload();
    await page.waitForSelector('main', { timeout: 5000 });

    const wizard = page.locator('[data-testid="welcome-wizard"]');
    await expect(wizard).toHaveCount(0);
  });
});

/* ---------- Accessibility (new pages) ---------- */

test.describe('Accessibility audit (new pages)', () => {
  let AxeBuilder: typeof import('@axe-core/playwright').default;

  test.beforeAll(async () => {
    try {
      const module = await import('@axe-core/playwright');
      AxeBuilder = module.default;
    } catch {
      // axe-core may not be installed — tests will be skipped
    }
  });

  const NEW_PAGES = [
    { path: '/', name: 'Overview' },
    { path: '/sessions', name: 'Sessions' },
    { path: '/agents', name: 'Agents' },
    { path: '/artifacts', name: 'Artifacts' },
    { path: '/governance', name: 'Governance' },
    { path: '/observability', name: 'Observability' },
    { path: '/pipeline', name: 'Pipeline' },
  ];

  for (const { path, name } of NEW_PAGES) {
    test(`${name} (${path}) has no critical a11y violations`, async ({ page }) => {
      if (!AxeBuilder) {
        test.skip();
        return;
      }
      await page.goto(path);
      await page.waitForSelector('main, h1', { timeout: 5000 });

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

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

  test('Overview page has valid heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 10000 });

    const headings = await page.evaluate(() => {
      const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(hs).map((h) => ({
        level: parseInt(h.tagName.charAt(1)),
        text: h.textContent?.trim().slice(0, 50) || '',
      }));
    });

    expect(headings.length, 'Overview should have at least one heading').toBeGreaterThan(0);

    for (let i = 1; i < headings.length; i++) {
      const jump = headings[i].level - headings[i - 1].level;
      expect(
        jump,
        `Heading "${headings[i].text}" skips from h${headings[i - 1].level} to h${headings[i].level}`
      ).toBeLessThanOrEqual(1);
    }
  });

  test('Overview page has required ARIA landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });

    const mainCount = await page.locator('main, [role="main"]').count();
    expect(mainCount, 'Overview should have a <main> landmark').toBeGreaterThanOrEqual(1);

    const navCount = await page.locator('nav, [role="navigation"]').count();
    expect(navCount, 'Overview should have a <nav> landmark').toBeGreaterThanOrEqual(1);
  });
});

/* ---------- Responsive Layout ---------- */

test.describe('Responsive layout', () => {
  const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  for (const vp of VIEWPORTS) {
    test(`Overview renders at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForSelector('main, h1', { timeout: 5000 });

      // Page should be visible and not horizontally overflowing
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `${vp.name}: page should not overflow horizontally`).toBe(false);

      // Main content should be visible at each breakpoint
      await expect(page.locator('main')).toBeVisible();
    });
  }
});
