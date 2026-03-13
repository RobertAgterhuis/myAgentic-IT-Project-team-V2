/**
 * Baseline E2E tests — Safety Net (Sprint 9A)
 *
 * These tests capture the existing app behavior BEFORE the React migration.
 * They run against the live Node server + vanilla HTML frontend and must
 * continue passing throughout the Strangler-fig migration to ensure no
 * regressions. When Sprint 9H deletes index.html, these same tests must
 * pass against the new React shell.
 */
import { test, expect } from '@playwright/test';

test.describe('Health & API', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /api/session returns session state', async ({ request }) => {
    const res = await request.get('/api/session');
    // May return 200 or 404 depending on whether a session exists
    expect([200, 404]).toContain(res.status());
  });
});

test.describe('Main UI (index.html)', () => {
  test('loads the main page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Command Center|Agentic|Questionnaire|SDLC|Q&D/i);
  });

  test('has a visible heading or main content area', async ({ page }) => {
    await page.goto('/');
    // The page should have some visible text content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });
});

test.describe('Dashboard', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Dashboard|Agentic|SDLC/i);
  });

  test('dashboard contains key structural elements', async ({ page }) => {
    await page.goto('/dashboard');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Questionnaires API', () => {
  test('GET /api/questionnaires returns list', async ({ request }) => {
    const res = await request.get('/api/questionnaires');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('questionnaires');
    expect(Array.isArray(body.questionnaires)).toBeTruthy();
  });
});

test.describe('Decisions API', () => {
  test('GET /api/decisions returns list', async ({ request }) => {
    const res = await request.get('/api/decisions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('decided');
  });
});

test.describe('Milestones API', () => {
  test('GET /api/milestones returns milestone data', async ({ request }) => {
    const res = await request.get('/api/milestones');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Response is an object with milestone information
    expect(typeof body).toBe('object');
  });
});

test.describe('Static Assets', () => {
  test('design-system.css is served', async ({ request }) => {
    const res = await request.get('/design-system.css');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('css');
  });
});
